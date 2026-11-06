/* Các vòng từ 3 trở đi (số vòng KHÔNG giới hạn — Sudo 2026-11-06) — client.
 * Chạy sau game.js, chỉ giao tiếp với game qua cầu nối window.__game.
 * Multiplayer: server quyết nhịp, điểm và loại; client chỉ hiển thị + gửi hành động.
 * Chơi đơn: bot mô phỏng tại client, loại theo đúng đường cong loại của server
 * (tỉ lệ giữ lại áp theo chu kỳ 0.614, 0.536, 0.467, 0.343, 0.25, 0.167;
 * vòng chung kết Rồng Rắn chỉ giữ 1 người thắng; server là nguồn chuẩn
 * ở multiplayer). Mỗi vòng còn > 1 người đều loại ít nhất 1 người.
 * Chỉ dùng bản sắc dân gian Việt Nam, không dùng tài sản Squid Game hay Minecraft.
 */
(function () {
  'use strict';
  var ELIM_FRAC = 0.30; // dự phòng khi vòng không nằm trong đường cong chuẩn
  // Đường cong loại của server (CURVE_RATIOS), áp THEO CHU KỲ theo số vòng:
  // vòng r giữ tỉ lệ CURVE_RATIOS[(r-1) % 6] (vòng 3 giữ 46.7%, vòng 4 giữ
  // 34.3%, vòng 5 giữ 25%, vòng 6 giữ 16.7%, vòng 7 lại giữ 61.4%, ...).
  // Vòng chung kết (Rồng Rắn) luôn chỉ giữ 1 người, không theo tỉ lệ này.
  var CURVE_RATIOS = [0.614, 0.536, 0.467, 0.343, 0.25, 0.167];
  function keepRatioForRound(round) { return CURVE_RATIOS[(round - 1) % CURVE_RATIOS.length]; }
  var overlay = null, blindEl = null, flagMarker = null, goatMarker = null;
  var active = null;
  // blind/cue có thể tới trước roundStart (server gửi trong lúc chuẩn bị vòng):
  // giữ lại để áp khi vòng Bịt Mắt bắt đầu.
  var pendingBlind = null, pendingCue = null, pendingBlindGoatId = null;

  function B() { return window.__game; }
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function randInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function alivePersons() { var b = B(); return b ? b.allPersons().filter(function (p) { return p.alive; }) : []; }
  // Gắn dê của nhóm mình từ goatId server gửi trong tin blind. Trả person
  // của dê hoặc null (dê chưa có trong allPersons — ví dụ mới join).
  function resolveGoat(st, goatId) {
    if (!st || goatId === undefined || goatId === null) return null;
    var b = B();
    var list = b ? b.allPersons() : [];
    var goat = null;
    for (var i = 0; i < list.length; i++) {
      if (list[i] && list[i].id === goatId) { goat = list[i]; break; }
    }
    st.state.goatId = goatId;
    if (goat) st.state.goat = goat;
    return goat;
  }
  // Góc yaw của camera theo cùng quy ước atan2(dx,-dz) mà mũi tên/la bàn
  // dùng (0° = bắc = -Z). Trả null khi không có camera (test/mock).
  function cameraYawDeg() {
    var b = B();
    var cam = b && b.camera;
    if (!cam || !cam.getWorldDirection || typeof window === 'undefined' || !window.THREE) return null;
    try {
      var v = new window.THREE.Vector3();
      cam.getWorldDirection(v);
      return Math.atan2(v.x, -v.z) * 180 / Math.PI;
    } catch (e) { return null; }
  }
  // Đổi hướng tuyệt đối (theo thế giới) sang hướng tương đối theo tầm nhìn:
  // mũi tên/la bàn chỉ đúng hướng trên màn hình dù camera xoay. Chuẩn hoá
  // về (-180, 180].
  function relDeg(worldDeg) {
    if (worldDeg === undefined || worldDeg === null || isNaN(worldDeg)) return worldDeg;
    var yaw = cameraYawDeg();
    if (yaw === null || yaw === undefined || isNaN(yaw)) return worldDeg;
    var r = worldDeg - yaw;
    while (r > 180) r -= 360;
    while (r <= -180) r += 360;
    return r;
  }
  function toast(m) { var b = B(); if (b) b.toast(m); }
  function send(o) { var b = B(); if (b) b.sendWS(o); }

  function showOverlay(html) {
    overlay = overlay || $('round-overlay');
    overlay.innerHTML = html;
    overlay.classList.remove('hidden');
  }
  function hideOverlay() { if (overlay) { overlay.classList.add('hidden'); overlay.innerHTML = ''; } }
  function showBlind(on, html) {
    blindEl = blindEl || $('blind-overlay');
    if (html !== undefined) blindEl.innerHTML = html;
    blindEl.classList.toggle('hidden', !on);
  }
  function hideBlind() { if (blindEl) { blindEl.classList.add('hidden'); blindEl.innerHTML = ''; } }
  function showGoatMarker() {
    if (!goatMarker) {
      goatMarker = document.createElement('div');
      goatMarker.id = 'goat-marker';
      goatMarker.textContent = '🐐 DÊ (chỉ bạn thấy)';
      $('labels').appendChild(goatMarker);
    }
  }
  function removeMarker(el) { if (el && el.parentNode) el.parentNode.removeChild(el); return null; }

  // Loại nhóm yếu nhất trong `scored` (đã xếp theo điểm giảm dần), trả về tên bị loại.
  function eliminateBottom(scored, reason, round, isFinal) {
    var b = B();
    var n = scored.length;
    if (n <= 1) return [];
    var keep;
    if (isFinal) keep = 1;
    else keep = Math.max(1, Math.round(n * keepRatioForRound(round)));
    if (keep >= n) keep = n - 1; // dự phòng: tỉ lệ lớn vẫn loại ít nhất 1
    if (n > 2) keep = Math.min(keep, n - 1); // còn >2 người thì mỗi vòng loại ít nhất 1
    var elim = scored.slice(keep);
    var names = [];
    elim.forEach(function (s) {
      if (s.p === b.player) b.eliminate(s.p, reason);
      else s.p.alive = false;
      names.push(s.p.name);
    });
    if (b) b.updateAliveHUD();
    return names;
  }
  function finishLocal(st, eliminated) {
    if (!st || st !== active) return;
    var round = st.round;
    var survivors = alivePersons().length;
    endRound();
    var b = B();
    if (b) b.localRoundEnd(round, survivors, eliminated || []);
  }

  // ================= KÉO CO NHỊP (vòng 3) =================
  function renderTug(st) {
    var max = Math.max(st.state.threshold, st.state.a, st.state.b);
    var a = $('power-a'), bb = $('power-b');
    if (a) a.style.width = Math.min(100, st.state.a / max * 100) + '%';
    if (bb) bb.style.width = Math.min(100, st.state.b / max * 100) + '%';
    var na = $('power-a-num'), nb = $('power-b-num');
    if (na) na.textContent = 'Đội A: ' + Math.round(st.state.a) + ' sức kéo';
    if (nb) nb.textContent = 'Đội B: ' + Math.round(st.state.b) + ' sức kéo';
    var m = $('rope-marker');
    if (m) m.style.left = clamp(50 + (st.state.a - st.state.b) / (st.state.threshold * 2) * 50, 2, 98) + '%';
  }
  function addPower(st, team, v) {
    if (team === 'a') st.state.a += v; else st.state.b += v;
    renderTug(st);
  }
  function tugTap(st) {
    var b = B();
    if (!b || !b.player || !b.player.alive) return false;
    if (!st.local) { send({ type: 'tug', power: 1 }); return true; } // server tự tính nhịp + thưởng, client không chặn
    if (st.state.beatOn) {
      st.state.myPower += 1.2;
      addPower(st, st.state.myTeam, 1.2);
      send({ type: 'tug', power: 1 });
      var s = $('tug-status');
      if (s) s.textContent = 'Đúng nhịp! Bạn kéo mạnh (+1). Đội của bạn: ' + (st.state.myTeam === 'a' ? 'Đội A' : 'Đội B') + '.';
    } else {
      toast('Lệch nhịp — chờ vòng tròn sáng lên rồi bấm!');
    }
    return true;
  }
  function endTug(st, winner) {
    var loserTeam = winner === 'a' ? st.state.teamB : st.state.teamA;
    // Đội thua chỉ còn 1 người: người đó vẫn bị loại (nếu không, vòng này
    // không loại ai và trận có thể không bao giờ kết thúc).
    if (loserTeam.length === 1) {
      var sole = loserTeam[0];
      var elimSole = [];
      if (sole === B().player) B().eliminate(sole, 'Đội thua kéo co — bị loại');
      else sole.alive = false;
      elimSole.push(sole.name);
      if (B()) B().updateAliveHUD();
      toast(winner === st.state.myTeam ? 'Đội bạn thắng kéo co!' : 'Đội bạn thua kéo co.');
      finishLocal(st, elimSole);
      return;
    }
    var scored = loserTeam.map(function (p) {
      var score = p === B().player ? st.state.myPower : rand(1, 10);
      return { p: p, score: score };
    }).sort(function (x, y) { return y.score - x.score; });
    var elim = eliminateBottom(scored, 'Đội thua kéo co — bị loại', st.round, st.isFinal);
    toast(winner === st.state.myTeam ? 'Đội bạn thắng kéo co!' : 'Đội bạn thua kéo co.');
    finishLocal(st, elim);
  }

  // ================= NẶN TÒ HE (vòng 4) =================
  // Mẫu nặn tò he: cùng 6 hình và cùng hệ tọa độ 0..100 như server (games.js).
  var TRACE_SHAPES = {
    star: { name: 'Ngôi sao', points: [[50, 5], [61, 38], [95, 38], [68, 59], [79, 92], [50, 71], [21, 92], [32, 59], [5, 38], [39, 38]] },
    flower: { name: 'Bông hoa', points: [[50, 10], [62, 30], [85, 25], [70, 45], [88, 62], [60, 58], [50, 90], [40, 58], [12, 62], [30, 45], [15, 25], [38, 30]] },
    fish: { name: 'Con cá', points: [[10, 50], [30, 30], [60, 25], [85, 50], [60, 75], [30, 70], [15, 60], [25, 50]] },
    bird: { name: 'Con chim', points: [[15, 60], [35, 35], [55, 30], [75, 45], [90, 30], [70, 55], [55, 75], [35, 70], [20, 75]] },
    lotus: { name: 'Hoa sen', points: [[50, 5], [65, 30], [90, 20], [75, 50], [95, 70], [60, 65], [50, 95], [40, 65], [5, 70], [25, 50], [10, 20], [35, 30]] },
    drum: { name: 'Trống hội', points: [[30, 20], [70, 20], [78, 35], [78, 65], [70, 80], [30, 80], [22, 65], [22, 35]] }
  };
  function hashCode(str) {
    var h = 0;
    str = String(str);
    for (var i = 0; i < str.length; i++) { h = (Math.imul(h, 31) + str.charCodeAt(i)) | 0; }
    return Math.abs(h);
  }
  // Nối các đỉnh đa giác (hệ 0..100) thành đường viền dày, đổi sang canvas 320x320.
  function shapePoints(shape, rawPoints) {
    var v = rawPoints || (TRACE_SHAPES[shape] || TRACE_SHAPES.star).points;
    var pts = [];
    for (var i = 0; i < v.length; i++) {
      var a = v[i], b = v[(i + 1) % v.length];
      var seg = Math.max(4, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 3));
      for (var k = 0; k < seg; k++) {
        pts.push([(a[0] + (b[0] - a[0]) * k / seg) * 3.2, (a[1] + (b[1] - a[1]) * k / seg) * 3.2]);
      }
    }
    return pts;
  }
  function nearPoint(p, arr, d) {
    var d2 = d * d;
    for (var i = 0; i < arr.length; i++) {
      var dx = p[0] - arr[i][0], dy = p[1] - arr[i][1];
      if (dx * dx + dy * dy <= d2) return true;
    }
    return false;
  }
  function traceScore(target, drawn) {
    if (!drawn.length) return 0;
    var cov = 0;
    for (var i = 0; i < target.length; i++) if (nearPoint(target[i], drawn, 18)) cov++;
    var coverage = cov / target.length;
    var prec = 0, n = 0, step = Math.max(1, Math.floor(drawn.length / 120));
    for (var j = 0; j < drawn.length; j += step) { if (nearPoint(drawn[j], target, 18)) prec++; n++; }
    var precision = n ? prec / n : 0;
    return Math.round(100 * (0.55 * coverage + 0.45 * precision));
  }
  function drawTarget(st) {
    var cv = $('trace-canvas'); if (!cv) return;
    var ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, 320, 320);
    ctx.save();
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = '#90a4ae'; ctx.lineWidth = 3;
    ctx.beginPath();
    st.state.target.forEach(function (p, i) { if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]); });
    ctx.closePath(); ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = '#b71c1c'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    var d = st.state.drawn;
    for (var i = 1; i < d.length; i++) {
      if (d[i].pen === 0) continue;
      ctx.beginPath(); ctx.moveTo(d[i - 1][0], d[i - 1][1]); ctx.lineTo(d[i][0], d[i][1]); ctx.stroke();
    }
  }
  function submitTrace(st) {
    var score = traceScore(st.state.target, st.state.drawn.filter(function (p) { return p.pen === 1; }));
    st.state.myScore = score;
    var sc = $('trace-score');
    if (sc) sc.textContent = 'Điểm của bạn: ' + score + '/100 — đã nộp bài.';
    // Gửi điểm vẽ về hệ 0..100 như server chấm (lấy mẫu, tối đa 300 điểm).
    var pts = st.state.drawn.filter(function (p) { return p.pen === 1; })
      .filter(function (p, i) { return i % 2 === 0; }).slice(0, 300)
      .map(function (p) { return [Math.round(p[0] / 3.2 * 10) / 10, Math.round(p[1] / 3.2 * 10) / 10]; });
    send({ type: 'trace', score: score, points: pts });
    if (!st.local) return;
    var scored = alivePersons().map(function (p) {
      return { p: p, score: p === B().player ? score : randInt(35, 95) };
    }).sort(function (x, y) { return y.score - x.score; });
    var rank = scored.findIndex(function (s) { return s.p === B().player; }) + 1;
    var rk = $('trace-rank');
    if (rk) rk.innerHTML = '<b>Xếp hạng nặn tò he:</b><br>' + scored.slice(0, 8).map(function (s, i) {
      return (i + 1) + '. ' + esc(s.p.name) + ' — ' + s.score + ' điểm' + (s.p === B().player ? ' (bạn)' : '');
    }).join('<br>') + '<br>Bạn đứng hạng ' + rank + '/' + scored.length + '.';
    var elim = eliminateBottom(scored, 'Nặn tò he điểm thấp — bị loại', st.round, st.isFinal);
    setTimeout(function () { finishLocal(st, elim); }, 1500);
  }

  // ================= BỊT MẮT BẮT DÊ (vòng 5) =================
  function cueLabel(dist) {
    if (dist === null || dist === undefined) return 'Đang nghe…';
    if (dist < 6) return 'Rất gần! Dê ở ngay đây.';
    if (dist < 15) return 'Gần rồi — tiếng dê rõ lắm.';
    if (dist < 30) return 'Còn xa — tiếng dê vọng lại.';
    return 'Rất xa — chỉ nghe tiếng thoang thoảng.';
  }
  // ---- Mô phỏng 3D từng vòng (client/js/sim/sim-*.js) ----
  // rounds.js giữ máy trạng thái + luật server; các sim chỉ vẽ thế giới 3D
  // và strip HUD gọn. Sim được gọi ở startRound (build), update (mỗi khung)
  // và endRound (teardown). Sim không chấm điểm, không tự gửi tin ngoài
  // những gì rounds.js đã có.
  var activeSim = null, activeSimGame = null;
  function simFor(game) { return (window.RoundSims || {})[game] || null; }
  function simBuild(st) {
    var s = simFor(st.game);
    activeSim = null; activeSimGame = null;
    if (s && s.build) {
      try { s.build(st, B()); activeSim = s; activeSimGame = st.game; } catch (e) { if (typeof console !== 'undefined' && console.error) console.error('[sim] build failed: ' + st.game, e); }
    }
    var ov = $('round-overlay');
    if (ov) ov.classList.toggle('sim-mode', !!activeSim);
  }
  function simUpdate(dt, st) {
    if (activeSim && activeSim.update) {
      try { activeSim.update(dt, st, B()); } catch (e) { if (typeof console !== 'undefined' && console.error) console.error('[sim] update failed: ' + activeSimGame, e); /* giữ sim để teardown còn dọn được; khung sau có thể hồi phục */ }
    }
  }
  function simTeardown(st) {
    if (activeSim && activeSim.teardown) {
      try { activeSim.teardown(st, B()); } catch (e) { if (typeof console !== 'undefined' && console.error) console.error('[sim] teardown failed: ' + activeSimGame, e); }
    }
    activeSim = null; activeSimGame = null;
    var ov = $('round-overlay');
    if (ov) ov.classList.remove('sim-mode');
  }
  function updateCue(st, dir, dist) {
    var arrow = $('cue-arrow'), txt = $('cue-text');
    // Server gửi hướng dạng chữ (east/west/south/north); chế độ chơi đơn
    // tính bằng độ. Đổi chữ sang độ theo cùng quy ước atan2(dx,-dz),
    // rồi xoay theo hướng camera (tương đối) thay vì hướng thế giới.
    var deg = dir;
    if (typeof dir === 'string') {
      deg = { north: 0, east: 90, south: 180, west: 270 }[dir];
      if (deg === undefined) deg = null;
    }
    if (arrow && deg !== undefined && deg !== null) arrow.style.transform = 'rotate(' + relDeg(deg) + 'deg)';
    if (txt) txt.textContent = cueLabel(dist) + (dist !== undefined && dist !== null ? ' (khoảng ' + Math.round(dist) + ' bước)' : '');
  }
  function blindHtml(st) {
    return '<div class="blind-box">' +
      '<h2>BỊT MẮT BẮT DÊ — VÒNG ' + st.round + '</h2>' +
      '<p class="note"><b>Luật chơi:</b> người bịt mắt nghe tiếng dê để bắt. Mũi tên chỉ hướng tiếng kêu, dòng chữ cho biết xa hay gần. Dê chạy trốn; ai bắt được dê thì dê bị loại. Hết giờ mà dê chưa bị bắt thì 2 người tìm kém nhất bị loại.</p>' +
      '<div id="cue-arrow">▲</div>' +
      '<p id="cue-text">Đang nghe…</p>' +
      '<p id="goat-note">' + (st.state.goatIsMe
        ? '<b>BẠN LÀ DÊ</b> — chạy trốn, đừng để bị bắt! Dấu 🐐 chỉ mình bạn thấy.'
        : 'Bạn là người đi bắt dê — chạy theo mũi tên.') + '</p>' +
      '<p class="note">Màn hình tối lại vì bạn đang bịt mắt. Di chuyển bằng WASD / phím mũi tên / joystick như thường.</p>' +
      '</div>';
  }
  function goatPanelHtml(st) {
    return '<h2>BỊT MẮT BẮT DÊ — VÒNG ' + st.round + '</h2>' +
      '<p class="note"><b>Luật chơi:</b> bạn là <b>DÊ</b> — chạy trốn, đừng để bị bắt! Dấu 🐐 chỉ mình bạn thấy. Người tìm nghe tiếng dê để bắt bạn; hết giờ mà bạn chưa bị bắt thì người tìm bị loại.</p>' +
      '<p class="note">Màn hình của bạn không tối vì dê không bị bịt mắt. Di chuyển bằng WASD / phím mũi tên / joystick như thường.</p>';
  }
  function seekerPanelHtml(st) {
    return '<h2>BỊT MẮT BẮT DÊ — VÒNG ' + st.round + '</h2>' +
      '<p class="note"><b>Luật chơi:</b> bạn là người đi bắt dê. Màn hình sẽ tối lại khi bịt mắt; nghe tiếng dê (mũi tên chỉ hướng, chữ cho biết xa/gần) để tìm dê. Dê bị bắt thì bị loại; hết giờ mà dê chưa bị bắt thì người tìm bị loại.</p>' +
      '<p class="note">Đang chờ server bịt mắt…</p>';
  }

  // ================= Ô ĂN QUAN (dự phòng) =================
  // Cùng mô hình 12 ô như server: ô 0 và ô 6 là ô quan (10 quân), còn lại là ô dân.
  // Rải: đi vòng (idx+1)%12, không bỏ qua ô nào. Ăn: quân cuối rơi vào ô đang có đúng
  // 1 quân thì ăn toàn bộ quân ở ô kế tiếp (trừ 2 ô quan). Mỗi người đi 3 lượt.
  // LUẬT Ô CỦA MÌNH (ĐÃ QUYẾT, cycle 3, 2026-11-06): chỉ được rải ô dân bên
  // mình — bên 0: ô 1-5, bên 1: ô 7-11; ô quan 0/6 không ai được rải. Server
  // chặn nước sai (tin lỗi), overlay khóa nút ô không phải của mình (viền
  // vàng = hàng của bạn, theo đúng bên của bạn — không còn là gợi ý).
  var OQ_PITS = { 0: [1, 2, 3, 4, 5], 1: [7, 8, 9, 10, 11] };
  function oqMyPits(st) {
    var side = (st.state && st.state.mySide != null) ? st.state.mySide : 0;
    return OQ_PITS[side];
  }
  function oqRender(st) {
    var board = st.state.board;
    var myPits = oqMyPits(st);
    function pit(i, clickable) {
      var isQuan = (i === 0 || i === 6);
      var mine = myPits.indexOf(i) >= 0;
      return '<button class="btn small oq-pit' + (isQuan ? ' oq-quan-pit' : '') + (mine ? ' oq-mine' : ' oq-foe') + '" data-pit="' + i + '" ' +
        ((!clickable || !board[i] || st.state.over || !mine) ? 'disabled' : '') + '>' +
        (isQuan ? 'QUAN<br>' : '') + board[i] + '</button>';
    }
    var myTurn = st.state.turn === 'me';
    var top = [6, 7, 8, 9, 10, 11].map(function (i) { return pit(i, myTurn); }).join('');
    var bot = [0, 1, 2, 3, 4, 5].map(function (i) { return pit(i, myTurn); }).join('');
    var turnText = st.state.over ? '' : (myTurn ? 'Tới lượt bạn — bấm một ô bên mình còn quân (ô ' + myPits[0] + '–' + myPits[myPits.length - 1] + ').' : 'Đang chờ lượt…');
    var scoreText = 'Điểm của bạn: ' + (st.state.scores.me || 0) + ' quân — Đối thủ: ' + (st.state.scores.bot || 0) + ' quân.';
    showOverlay(
      '<h2>Ô ĂN QUAN — VÒNG ' + st.round + '</h2>' +
      '<p class="note"><b>Luật chơi:</b> chỉ được bấm ô bên mình (viền vàng, ô ' + myPits[0] + '–' + myPits[myPits.length - 1] + ') để rải theo vòng; ô quan không được rải. Quân cuối rơi vào ô đang có đúng 1 quân thì ăn toàn bộ quân ở ô kế tiếp (không ăn ô quan). Mỗi người đi 3 lượt rồi đếm điểm ăn được; điểm thấp bị loại theo đường cong loại.</p>' +
      '<div class="oq-board"><div class="oq-rows"><div class="oq-row">' + top + '</div><div class="oq-row">' + bot + '</div></div></div>' +
      '<p class="note">' + scoreText + '</p>' +
      '<p id="oq-info" class="note">' + turnText + '</p>');
    var els = overlay.querySelectorAll('.oq-pit');
    Array.prototype.forEach.call(els, function (el) {
      el.onclick = function () {
        var pitIdx = Number(el.getAttribute('data-pit'));
        if (oqMyPits(st).indexOf(pitIdx) < 0) return; // phòng thủ: nút đã khóa, nhưng sim có thể .click() lại
        send({ type: 'oanquan', pit: pitIdx });
        if (!st.local) return;
        if (st.state.turn !== 'me' || st.state.over) return;
        oqSow(st, pitIdx, false);
        oqRender(st);
        if (!st.state.over && st.state.turn === 'bot') {
          setTimeout(function () {
            if (!active || active !== st || st.state.over) return;
            var opts = [];
            for (var i = 7; i <= 11; i++) if (st.state.board[i] > 0) opts.push(i); // bot là bên 1: chỉ ô 7-11
            if (!opts.length) return;
            oqSow(st, opts[randInt(0, opts.length - 1)], true);
            oqRender(st);
          }, 700);
        }
      };
    });
  }
  function oqSow(st, pit, isBot) {
    var board = st.state.board;
    // Chặn rải sai bên ở chơi đơn (multi đã có server chặn; overlay khóa nút).
    var legal = isBot ? (pit >= 7 && pit <= 11) : (pit >= 1 && pit <= 5);
    if (!legal) return false;
    var stones = board[pit]; if (!stones) return false;
    board[pit] = 0;
    var idx = pit;
    while (stones > 0) { idx = (idx + 1) % 12; board[idx]++; stones--; }
    if (board[idx] === 1) {
      var cap = (idx + 1) % 12;
      if (cap !== 0 && cap !== 6 && board[cap] > 0) {
        var gained = board[cap];
        board[cap] = 0;
        if (isBot) st.state.scores.bot += gained; else st.state.scores.me += gained;
      }
    }
    if (isBot) st.state.turnsTaken.bot++; else st.state.turnsTaken.me++;
    var sum = board.reduce(function (a, b) { return a + b; }, 0);
    if ((st.state.turnsTaken.me >= 3 && st.state.turnsTaken.bot >= 3) || sum <= 2) {
      oqResolve(st);
      return true;
    }
    st.state.turn = isBot ? 'me' : 'bot';
    return true;
  }
  function oqResolve(st) {
    st.state.over = true;
    var me = st.state.scores.me, bot = st.state.scores.bot;
    if (!st.local) { oqRender(st); return; }
    var elim = [];
    if (me < bot) {
      var b = B();
      if (b.player.alive) { b.eliminate(b.player, 'Ô ăn quan thua điểm — bị loại'); elim.push(b.player.name); }
    } else {
      var bots = alivePersons().filter(function (p) { return p.isBot; });
      if (bots.length === 1) {
        // Chỉ còn 1 đối thủ mà bạn thắng điểm: đối thủ bị loại (nếu không,
        // vòng này không loại ai).
        bots[0].alive = false;
        elim = [bots[0].name];
        if (B()) B().updateAliveHUD();
      } else {
        var scored = bots.map(function (p) { return { p: p, score: rand(1, 10) }; })
          .sort(function (x, y) { return y.score - x.score; });
        elim = eliminateBottom(scored, 'Ô ăn quan — bị loại', st.round, st.isFinal);
      }
    }
    oqRender(st);
    var info = $('oq-info');
    if (info) info.textContent = 'Hết ván: bạn ' + me + ' quân — đối thủ ' + bot + ' quân. ' + (me > bot ? 'Bạn thắng!' : me < bot ? 'Bạn thua.' : 'Hòa!');
    setTimeout(function () { finishLocal(st, elim); }, 1500);
  }

  // ================= NHẢY BAO BỐ (dự phòng) =================
  function hopTap(st) {
    var b = B();
    if (!b || !b.player || !b.player.alive) return false;
    if (!st.local) { send({ type: 'hop' }); return true; } // server chấm nhịp + trừ điểm khi lệch
    if (st.state.lockout > 0) return true;
    var m = st.state.marker;
    // Chơi đơn: vạch chạy qua lại, đúng nhịp là lúc vạch ở giữa. Multiplayer: nhịp
    // theo server (beatPhase 0..1000ms), đúng nhịp là lúc vạch gần 0 (vừa qua nhịp).
    var onBeat = st.local ? (m >= 0.42 && m <= 0.58) : (m <= 0.2 || m >= 0.8);
    if (onBeat) {
      st.state.progress++;
      send({ type: 'hop' });
      var bar = $('hop-fill');
      if (bar) bar.style.width = Math.min(100, st.state.progress / st.state.target * 100) + '%';
      var info = $('hop-info');
      if (info) info.textContent = 'Nhảy chuẩn! Đã nhảy ' + st.state.progress + '/' + st.state.target + ' nhịp.';
      if (st.state.progress >= st.state.target && st.local) hopFinish(st);
    } else if (st.local) {
      st.state.lockout = 0.6;
      var btn = $('btn-hop');
      if (btn) { btn.classList.add('stumble'); setTimeout(function () { btn.classList.remove('stumble'); }, 500); }
      toast('Vấp rồi! Nhảy đúng lúc vạch sáng (giữa vạch).');
    }
    return true;
  }
  function hopFinish(st) {
    var scored = alivePersons().map(function (p) {
      var prog = p === B().player ? st.state.progress : (st.state.botProg[p.id] || 0);
      return { p: p, score: prog };
    }).sort(function (x, y) { return y.score - x.score; });
    var elim = eliminateBottom(scored, 'Nhảy bao bố chậm nhất — bị loại', st.round, st.isFinal);
    finishLocal(st, elim);
  }

  // ================= RỒNG RẮN CƯỚP CỜ (vòng 6, chung kết) =================
  function flagPolePos() { return { x: 0, z: 0 }; }
  function flagEnd(st, winner) {
    var scored = alivePersons().map(function (p) {
      var s = st.state.botState[p.id];
      var score = 0;
      if (p === winner) score = 100;
      else if (p === B().player) score = st.state.iTouched ? 60 - Math.abs(p.z - 35) : 20 - Math.hypot(p.x, p.z);
      else if (s) score = s.touched ? 60 - Math.abs(p.z - 35) : 20 - Math.hypot(p.x, p.z);
      return { p: p, score: score };
    }).sort(function (x, y) { return y.score - x.score; });
    var elim = eliminateBottom(scored, 'Chung kết cướp cờ — bị loại', st.round, true);
    toast(winner === B().player ? 'Bạn cướp cờ về đích — thắng vòng chung kết!' : esc(winner ? winner.name : 'Không ai') + ' cướp cờ về đích trước.');
    finishLocal(st, elim);
  }

  // ================= Định nghĩa từng vòng =================
  var GAMES = {
    'keo-co': {
      name: 'Kéo Co Nhịp', time: 60, ruleShort: 'Nghe trống, bấm KÉO đúng nhịp!',
      start: function (st) {
        var alive = alivePersons();
        st.state.teamA = []; st.state.teamB = [];
        alive.forEach(function (p, i) { (i % 2 === 0 ? st.state.teamA : st.state.teamB).push(p); });
        var b = B();
        st.state.myTeam = st.state.teamA.indexOf(b.player) >= 0 ? 'a' : 'b';
        st.state.a = 0; st.state.b = 0; st.state.threshold = 20;
        st.state.beatT = 0; st.state.beatOn = false; st.state.myPower = 0;
        st.state.bots = alive.filter(function (p) { return p.isBot; }).map(function (p) {
          return { p: p, acc: rand(0.45, 0.9), team: st.state.teamA.indexOf(p) >= 0 ? 'a' : 'b' };
        });
        showOverlay(
          '<h2>KÉO CO NHỊP — VÒNG ' + st.round + '</h2>' +
          '<p class="note"><b>Luật chơi:</b> hai đội kéo một sợi dây. Nghe nhịp trống, bấm nút KÉO (hoặc phím Space) đúng lúc vòng tròn sáng lên để kéo mạnh. Đội nào kéo được mốc giữa về phía mình trước sẽ thắng; đội thua bị loại theo đường cong loại (giữ lại theo tỉ lệ của vòng).</p>' +
          '<div id="beat-ind" class="beat-ind">● NHỊP TRỐNG ●</div>' +
          '<div class="power-row"><div class="power-bar"><div id="power-a" class="power-fill a"></div></div><b id="power-a-num">Đội A: 0 sức kéo</b></div>' +
          '<div class="power-row"><div class="power-bar"><div id="power-b" class="power-fill b"></div></div><b id="power-b-num">Đội B: 0 sức kéo</b></div>' +
          '<div id="rope-track" class="rope-track"><div id="rope-marker" class="rope-marker">◆</div></div>' +
          '<p id="tug-status" class="note">Đội của bạn: <b>' + (st.state.myTeam === 'a' ? 'Đội A' : 'Đội B') + '</b> — bấm đúng nhịp để kéo!</p>' +
          '<button id="btn-tug" class="btn primary round-action">KÉO! (Space)</button>');
        var btn = $('btn-tug');
        if (btn) btn.onclick = function () { tugTap(st); };
      },
      update: function (dt, st) {
        st.state.beatT += dt;
        if (st.state.beatT >= 0.8) {
          st.state.beatT = 0;
          st.state.beatOn = true;
          var ind = $('beat-ind');
          if (ind) ind.classList.add('on');
          if (st.local) st.state.bots.forEach(function (bt) {
            if (bt.p.alive && Math.random() < bt.acc) addPower(st, bt.team, 0.15);
          });
          setTimeout(function () {
            st.state.beatOn = false;
            var i2 = $('beat-ind'); if (i2) i2.classList.remove('on');
          }, 180);
        }
        if (st.local) {
          var diff = st.state.a - st.state.b;
          if (Math.abs(diff) >= st.state.threshold) endTug(st, diff > 0 ? 'a' : 'b');
        }
      },
      timeout: function (st) { endTug(st, st.state.a >= st.state.b ? 'a' : 'b'); },
      onMessage: function (msg, st) {
        if (msg.type === 'tugState') {
          if (Array.isArray(msg.sidePower)) { st.state.a = msg.sidePower[0] || 0; st.state.b = msg.sidePower[1] || 0; }
          else { st.state.a = msg.a || 0; st.state.b = msg.b || 0; }
          if (msg.threshold) st.state.threshold = msg.threshold;
          renderTug(st);
          return true;
        }
        return false;
      },
      onSpace: function (st) { return tugTap(st); },
      end: function () { }
    },

    'to-he': {
      name: 'Nặn Tò He', time: 60, ruleShort: 'Vẽ theo mẫu, càng giống càng cao điểm!',
      start: function (st) {
        var keys = Object.keys(TRACE_SHAPES);
        var shapeId = (st.opts && st.opts.shape) || keys[hashCode(st.seed || Date.now()) % keys.length];
        var shape = TRACE_SHAPES[shapeId] || TRACE_SHAPES.star;
        st.state.shape = { id: shapeId, name: shape.name };
        st.state.target = shapePoints(shapeId);
        st.state.drawn = [];
        st.state.myScore = null;
        showOverlay(
          '<h2>NẶN TÒ HE — VÒNG ' + st.round + '</h2>' +
          '<p class="note"><b>Luật chơi:</b> vẽ lại hình mẫu bằng chuột hoặc ngón tay, đi theo đường nét đứt. Bấm NỘP BÀI để chấm điểm giống mẫu (tối đa 100). những người điểm thấp nhất bị loại theo đường cong loại.</p>' +
          '<p>Mẫu cần vẽ: <b>' + esc(shape.name) + '</b></p>' +
          '<canvas id="trace-canvas" width="320" height="320"></canvas>' +
          '<p id="trace-score" class="note">Chưa có nét vẽ — điểm tạm: 0/100.</p>' +
          '<div class="btn-row">' +
          '<button id="btn-trace-submit" class="btn primary round-action">NỘP BÀI</button>' +
          '<button id="btn-trace-clear" class="btn round-action">VẼ LẠI</button>' +
          '</div>' +
          '<div id="trace-rank"></div>');
        drawTarget(st);
        var cv = $('trace-canvas');
        if (cv) {
          var drawing = false;
          var pos = function (ev) {
            var r = cv.getBoundingClientRect();
            return [(ev.clientX - r.left) * 320 / r.width, (ev.clientY - r.top) * 320 / r.height];
          };
          cv.addEventListener('pointerdown', function (ev) {
            ev.preventDefault(); drawing = true;
            var p = pos(ev); p.pen = 1; st.state.drawn.push(p);
            cv.setPointerCapture(ev.pointerId);
          });
          cv.addEventListener('pointermove', function (ev) {
            if (!drawing) return;
            var p = pos(ev); p.pen = 1; st.state.drawn.push(p); drawTarget(st);
          });
          cv.addEventListener('pointerup', function () {
            drawing = false;
            var sc = traceScore(st.state.target, st.state.drawn.filter(function (p) { return p.pen === 1; }));
            var el = $('trace-score');
            if (el) el.textContent = 'Điểm tạm: ' + sc + '/100 — bấm NỘP BÀI khi xong.';
          });
        }
        var sub = $('btn-trace-submit');
        if (sub) sub.onclick = function () { submitTrace(st); };
        var clr = $('btn-trace-clear');
        if (clr) clr.onclick = function () { st.state.drawn = []; drawTarget(st); };
      },
      update: function () { },
      timeout: function (st) { if (st.state.myScore === null) submitTrace(st); },
      onMessage: function (msg, st) {
        if (msg.type === 'traceTarget') {
          // Mẫu do server gửi (seeded): dùng đúng điểm của server.
          var nm = (TRACE_SHAPES[msg.shape] || {}).name || msg.shape || 'hình mẫu';
          st.state.shape = { id: msg.shape, name: nm };
          st.state.target = shapePoints(msg.shape, msg.points);
          st.state.drawn = [];
          drawTarget(st);
          var t = $('trace-score');
          if (t) t.textContent = 'Mẫu cần vẽ: ' + nm + ' — vẽ theo đường nét đứt.';
          return true;
        }
        if (msg.type === 'traceResult' && msg.scores) {
          var rk = $('trace-rank');
          if (rk) rk.innerHTML = '<b>Kết quả nặn tò he:</b><br>' + msg.scores.map(function (s, i) {
            return (i + 1) + '. ' + esc(s.name) + ' — ' + s.score + ' điểm';
          }).join('<br>');
          return true;
        }
        return false;
      },
      blocksMovement: true,
      end: function () { }
    },

    'bit-mat': {
      name: 'Bịt Mắt Bắt Dê', time: 60, ruleShort: 'Nghe tiếng dê, chạy theo mũi tên!',
      start: function (st) {
        var b = B();
        var alive = alivePersons();
        var goat = null;
        if (st.local) {
          if (st.opts && st.opts.goatId) {
            goat = alive.find(function (p) { return p.id === st.opts.goatId; }) || alive[randInt(0, alive.length - 1)];
          } else {
            var botsAlive = alive.filter(function (p) { return p.isBot; });
            goat = Math.random() < 0.25 ? b.player : (botsAlive[randInt(0, Math.max(0, botsAlive.length - 1))] || alive[0]);
          }
        }
        // Multiplayer: dê do server chỉ định qua tin blind (blind:false = bạn
        // là dê, blind:true + goatId = dê của nhóm mình để vẽ ánh/la bàn).
        st.state.goat = goat;
        st.state.goatId = goat ? goat.id : null;
        st.state.goatIsMe = goat === b.player;
        st.state.cueT = 0;
        st.state.startedAt = Date.now();
        // Dê KHÔNG bị bịt mắt (server cũng gửi blind:false cho dê); chỉ người tìm mới tối màn hình.
        if (st.local) {
          if (st.state.goatIsMe) showOverlay(goatPanelHtml(st));
          else showBlind(true, blindHtml(st));
        } else {
          showOverlay(seekerPanelHtml(st)); // chờ server gửi blind:true thì mới tối màn hình
        }
        if (st.state.goatIsMe) showGoatMarker();
        if (b.setHudDrum) b.setHudDrum('Bịt Mắt Bắt Dê — nghe tiếng, tìm dê!');
      },
      update: function (dt, st) {
        var b = B();
        var goat = st.state.goat;
        if (!goat || !goat.alive) return;
        // Cập nhật mũi tên chỉ hướng + khoảng cách cho người chơi (nếu không phải dê).
        // Chơi đơn: vị trí dê tính tại client nên luôn tươi. Nhiều người: chỉ
        // tin vị trí dê khi tươi (<1,5s — tick 15Hz trong AOI 40); vị trí cũ
        // (dê đã ra ngoài AOI) thì để nguyên mũi tên theo cue 2s của server.
        st.state.cueT += dt;
        if (st.state.cueT >= 0.3 && b.player && b.player.alive && !st.state.goatIsMe) {
          var liveOk = st.local || (goat._posAt && Date.now() - goat._posAt < 1500);
          st.state.cueT = 0;
          if (liveOk) {
            var dx = goat.x - b.player.x, dz = goat.z - b.player.z;
            var dir = Math.atan2(dx, -dz) * 180 / Math.PI;
            var dist = Math.hypot(dx, dz);
            updateCue(st, dir, dist);
          }
        }
        // Dấu dê chỉ mình dê thấy, bám theo vị trí người chơi.
        if (st.state.goatIsMe && goatMarker && b.player) {
          var pr = b.project(b.player.x, b.player.group.position.y + 4.2, b.player.z);
          goatMarker.style.display = pr.behind ? 'none' : 'block';
          goatMarker.style.left = pr.x + 'px';
          goatMarker.style.top = pr.y + 'px';
        }
        if (!st.local) return;
        // Bot dê chạy trốn khỏi người tìm gần nhất.
        if (goat.isBot) {
          var seekers = alivePersons().filter(function (p) { return p !== goat; });
          var nearest = null, nd = 1e9;
          seekers.forEach(function (p) {
            var d = Math.hypot(p.x - goat.x, p.z - goat.z);
            if (d < nd) { nd = d; nearest = p; }
          });
          if (nearest && nd < 18) {
            var fx = (goat.x - nearest.x) / (nd || 1), fz = (goat.z - nearest.z) / (nd || 1);
            goat.x = clamp(goat.x + fx * 6.5 * dt, -28, 28);
            goat.z = clamp(goat.z + fz * 6.5 * dt, -48, 38);
            goat.group.position.set(goat.x, 0, goat.z);
          }
        }
        // Bot tìm dê: chạy về phía dê, có nhiễu.
        alivePersons().filter(function (p) { return p !== goat; }).forEach(function (p) {
          if (!p.isBot) return;
          var ddx = goat.x - p.x, ddz = goat.z - p.z;
          var dd = Math.hypot(ddx, ddz) || 1;
          p.x = clamp(p.x + (ddx / dd + rand(-0.3, 0.3)) * 7 * dt, -28, 28);
          p.z = clamp(p.z + (ddz / dd + rand(-0.3, 0.3)) * 7 * dt, -48, 38);
          p.group.position.set(p.x, 0, p.z);
          if (dd < 2.5 && Date.now() - (st.state.startedAt || 0) > 2000) {
            // Bắt được dê! (2 giây đầu không bắt được để mọi người kịp tản ra)
            var elim = [];
            if (goat === b.player) { b.eliminate(goat, 'Bị bắt khi làm dê'); elim.push(goat.name); }
            else { goat.alive = false; elim.push(goat.name); }
            if (b) b.updateAliveHUD();
            toast('Dê đã bị bắt!');
            finishLocal(st, elim);
          }
        });
      },
      timeout: function (st) {
        // Hết giờ, dê chưa bị bắt: loại người tìm theo đường cong loại của vòng.
        var seekers = alivePersons().filter(function (p) { return p !== st.state.goat; });
        if (seekers.length === 1) {
          // Chỉ còn 1 người tìm: người đó bị loại (nếu không vòng không loại ai).
          var soleSeeker = seekers[0];
          if (soleSeeker === B().player) B().eliminate(soleSeeker, 'Tìm dê kém nhất — bị loại');
          else soleSeeker.alive = false;
          if (B()) B().updateAliveHUD();
          toast('Hết giờ — dê chạy thoát!');
          finishLocal(st, [soleSeeker.name]);
          return;
        }
        var scored = seekers.map(function (p) { return { p: p, score: rand(1, 10) }; })
          .sort(function (x, y) { return y.score - x.score; });
        var elim = eliminateBottom(scored, 'Tìm dê kém nhất — bị loại', st.round, st.isFinal);
        toast('Hết giờ — dê chạy thoát!');
        finishLocal(st, elim);
      },
      onMessage: function (msg, st) {
        if (msg.type === 'blind') {
          if (msg.goatId !== undefined && msg.goatId !== null) resolveGoat(st, msg.goatId);
          if (msg.blind) {
            st.state.goatIsMe = false;
            hideOverlay(); showBlind(true, blindHtml(st));
          }
          else {
            hideBlind();
            st.state.goatIsMe = true;
            st.state.goat = B().player;
            showOverlay(goatPanelHtml(st));
            showGoatMarker();
          }
          return true;
        }
        if (msg.type === 'cue') { updateCue(st, msg.dir, msg.dist); return true; }
        if (msg.type === 'caught') { hideBlind(); toast('Dê đã bị bắt!'); return true; }
        return false;
      },
      end: function () {
        hideBlind();
        goatMarker = removeMarker(goatMarker);
      }
    },

    'o-an-quan': {
      name: 'Ô Ăn Quan', time: 90, ruleShort: 'Bấm ô bên mình để rải quân!',
      start: function (st) {
        st.state.board = (st.opts && st.opts.board) ? st.opts.board.slice() : [10, 5, 5, 5, 5, 5, 10, 5, 5, 5, 5, 5];
        st.state.turn = 'me';
        st.state.mySide = 0; // chơi đơn: bạn là bên 0 (ô 1-5); multi: server gửi sides trong oanquanState
        st.state.over = false;
        st.state.turnsTaken = { me: 0, bot: 0 };
        st.state.scores = { me: 0, bot: 0 };
        oqRender(st);
        if (B().setHudDrum) B().setHudDrum('Ô Ăn Quan — tới lượt bạn rải quân.');
      },
      update: function () { },
      timeout: function (st) { if (!st.state.over) oqResolve(st); },
      onMessage: function (msg, st) {
        if (msg.type === 'oanquanState' && msg.board) {
          st.state.board = msg.board.slice();
          var b = B();
          if (msg.sides && b && msg.sides[b.myId] != null) st.state.mySide = msg.sides[b.myId];
          st.state.turn = (msg.turnId && b && msg.turnId === b.myId) ? 'me' : 'bot';
          if (msg.scores) {
            var mine = msg.scores[b.myId] || 0;
            var others = 0;
            Object.keys(msg.scores).forEach(function (k) { if (k !== b.myId) others = Math.max(others, msg.scores[k] || 0); });
            st.state.scores = { me: mine, bot: others };
          }
          oqRender(st);
          return true;
        }
        return false;
      },
      blocksMovement: true,
      end: function () { }
    },

    'nhay-bao-bo': {
      name: 'Nhảy Bao Bố', time: 60, ruleShort: 'Nhảy đúng lúc vạch sáng!',
      start: function (st) {
        st.state.progress = 0;
        st.state.target = 20; // finishLine của server
        st.state.marker = 0;
        st.state.mdir = 1;
        st.state.lockout = 0;
        st.state.botProg = {};
        st.state.botAcc = {};
        alivePersons().filter(function (p) { return p.isBot; }).forEach(function (p) {
          st.state.botProg[p.id] = 0;
          st.state.botAcc[p.id] = rand(0.4, 0.9);
        });
        showOverlay(
          '<h2>NHẢY BAO BỐ — VÒNG ' + st.round + '</h2>' +
          '<p class="note"><b>Luật chơi:</b> nhảy trong bao bố về đích. Vạch sáng chạy qua lại trên thanh nhịp — bấm NHẢY (hoặc phím Space) đúng lúc vạch nằm trong ô sáng giữa thanh. Nhảy lệch nhịp sẽ vấp và chậm lại. Nhảy đủ ' + st.state.target + ' nhịp thì về đích; những người chậm nhất bị loại theo đường cong loại.</p>' +
          '<div class="hop-track"><div class="hop-zone"></div><div id="hop-marker" class="hop-marker"></div></div>' +
          '<div class="power-bar"><div id="hop-fill" class="power-fill a"></div></div>' +
          '<p id="hop-info" class="note">Đã nhảy 0/' + st.state.target + ' nhịp.</p>' +
          '<button id="btn-hop" class="btn primary round-action">NHẢY! (Space)</button>');
        var btn = $('btn-hop');
        if (btn) btn.onclick = function () { hopTap(st); };
      },
      update: function (dt, st) {
        if (st.state.lockout > 0) st.state.lockout -= dt;
        if (!st.local) return; // multiplayer: vạch nhịp theo beatPhase của server
        st.state.marker += st.state.mdir * dt * 1.1;
        if (st.state.marker >= 1) { st.state.marker = 1; st.state.mdir = -1; }
        if (st.state.marker <= 0) { st.state.marker = 0; st.state.mdir = 1; }
        var mk = $('hop-marker');
        if (mk) mk.style.left = (st.state.marker * 100) + '%';
        var done = false;
        Object.keys(st.state.botProg).forEach(function (id) {
          var p = alivePersons().find(function (x) { return x.id === id; });
          if (!p || !p.alive) return;
          st.state.botProg[id] += st.state.botAcc[id] * dt * 0.9;
          if (st.state.botProg[id] >= st.state.target) done = true;
        });
        if (done && st.state.progress < st.state.target) {
          // Có bot về đích trước — vòng vẫn tiếp tục tới khi người chơi xong hoặc hết giờ.
        }
      },
      timeout: function (st) { hopFinish(st); },
      onMessage: function (msg, st) {
        if (msg.type === 'hopState') {
          if (msg.beatPhase !== undefined && msg.beatPhase !== null) {
            st.state.marker = (msg.beatPhase % 1000) / 1000;
            var mk = $('hop-marker');
            if (mk) mk.style.left = (st.state.marker * 100) + '%';
          }
          if (msg.progress) {
            var info = $('hop-info');
            if (info) {
              var mine = msg.progress[B().myId];
              info.textContent = 'Bạn đã nhảy ' + (mine || 0) + '/' + st.state.target + ' nhịp.';
            }
          }
          return true;
        }
        return false;
      },
      onSpace: function (st) { return hopTap(st); },
      end: function () { }
    },

    'rong-ran': {
      name: 'Rồng Rắn Cướp Cờ', time: 120, ruleShort: 'Chạm cờ rồi chạy về vạch xuất phát!',
      start: function (st) {
        var b = B();
        st.state.holderId = (st.opts && st.opts.holderId) || null;
        st.state.iTouched = false;
        st.state.botState = {};
        alivePersons().filter(function (p) { return p.isBot; }).forEach(function (p) {
          st.state.botState[p.id] = { touched: false, hasFlag: false };
        });
        // Cột cờ ở giữa sân (voxel, không dùng tài sản ngoài).
        if (window.THREE && b.scene) {
          var g = new THREE.Group();
          var pole = new THREE.Mesh(new THREE.BoxGeometry(0.5, 9, 0.5), new THREE.MeshLambertMaterial({ color: 0x6d4c41 }));
          pole.position.y = 4.5; g.add(pole);
          var flag = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.4, 0.15), new THREE.MeshLambertMaterial({ color: 0xe53935 }));
          flag.position.set(1.4, 8, 0); g.add(flag);
          var base = new THREE.Mesh(new THREE.BoxGeometry(3, 0.6, 3), new THREE.MeshLambertMaterial({ color: 0xffe0a3 }));
          base.position.y = 0.3; g.add(base);
          g.position.set(0, 0, 0);
          b.scene.add(g);
          st.state.mesh = g;
        }
        showOverlay(
          '<h2>RỒNG RẮN CƯỚP CỜ — VÒNG ' + st.round + ' (CHUNG KẾT)</h2>' +
          '<p class="note"><b>Luật chơi:</b> cờ ở giữa sân. Chạm vào cờ rồi chạy về vạch xuất phát (phía sau lưng bạn) thì thắng vòng. Ai chạm cờ sẽ có dấu 🚩 trên đầu. Chung kết chỉ giữ 1 người thắng.</p>' +
          '<p id="flag-status" class="note">Chưa ai cầm cờ — chạy ra giữa sân!</p>');
        flagMarker = document.createElement('div');
        flagMarker.id = 'flag-marker';
        flagMarker.textContent = '🚩 CẦM CỜ';
        flagMarker.style.display = 'none';
        $('labels').appendChild(flagMarker);
        if (b.setHudDrum) b.setHudDrum('Rồng Rắn Cướp Cờ — chạm cờ rồi về vạch xuất phát!');
      },
      update: function (dt, st) {
        var b = B();
        var pole = flagPolePos();
        var holder = null;
        if (st.state.holderId) {
          holder = alivePersons().find(function (p) { return p.id === st.state.holderId; }) ||
            (b.player && b.player.id === st.state.holderId ? b.player : null);
        }
        // Người chơi chạm cờ?
        if (!holder && b.player && b.player.alive) {
          var dp = Math.hypot(b.player.x - pole.x, b.player.z - pole.z);
          if (dp < 2.5) {
            st.state.holderId = b.player.id;
            st.state.iTouched = true;
            holder = b.player;
            send({ type: 'flag', action: 'take' });
            toast('Bạn cầm cờ rồi — chạy về vạch xuất phát ngay!');
          }
        }
        // Bot chạm cờ / chạy về đích (chơi đơn).
        if (st.local && !holder) {
          var bots = alivePersons().filter(function (p) { return p.isBot; });
          bots.forEach(function (p) {
            var s = st.state.botState[p.id];
            if (!s) return;
            var ddx = pole.x - p.x, ddz = pole.z - p.z;
            var dd = Math.hypot(ddx, ddz) || 1;
            p.x = clamp(p.x + ddx / dd * 8 * dt, -28, 28);
            p.z = clamp(p.z + ddz / dd * 8 * dt, -48, 38);
            p.group.position.set(p.x, 0, p.z);
            if (dd < 2.5) {
              s.touched = true; s.hasFlag = true;
              st.state.holderId = p.id;
              holder = p;
              toast(esc(p.name) + ' đã cướp cờ!');
            }
          });
        }
        // Người cầm cờ chạy về vạch xuất phát (z >= 33).
        if (holder) {
          if (st.local && holder.isBot) {
            holder.z = clamp(holder.z + 8 * dt, -48, 38);
            holder.group.position.set(holder.x, 0, holder.z);
          }
          var fs = $('flag-status');
          if (fs) fs.textContent = 'Người cầm cờ: ' + holder.name + (holder === b.player ? ' (bạn)' : '') + ' — chạy về vạch xuất phát!';
          if (flagMarker) {
            var pr = b.project(holder.x, holder.group.position.y + 4.2, holder.z);
            flagMarker.style.display = pr.behind ? 'none' : 'block';
            flagMarker.style.left = pr.x + 'px';
            flagMarker.style.top = pr.y + 'px';
          }
          if (holder.z >= 33) flagEnd(st, holder);
        } else {
          var fs2 = $('flag-status');
          if (fs2) fs2.textContent = 'Chưa ai cầm cờ — chạy ra giữa sân!';
          if (flagMarker) flagMarker.style.display = 'none';
        }
      },
      timeout: function (st) {
        var holder = null;
        if (st.state.holderId) holder = alivePersons().find(function (p) { return p.id === st.state.holderId; });
        flagEnd(st, holder);
      },
      onMessage: function (msg, st) {
        if (msg.type === 'flag' && msg.holderId !== undefined) {
          st.state.holderId = msg.holderId;
          var holder = alivePersons().find(function (p) { return p.id === msg.holderId; });
          var fs = $('flag-status');
          if (fs) fs.textContent = holder ? 'Người cầm cờ: ' + holder.name : 'Chưa ai cầm cờ — chạy ra giữa sân!';
          return true;
        }
        return false;
      },
      end: function (st) {
        if (st && st.state.mesh && B().scene) B().scene.remove(st.state.mesh);
        flagMarker = removeMarker(flagMarker);
      }
    }
  };

  // ================= API công khai =================
  function startRound(round, game, opts) {
    endRound();
    var b = B();
    if (!b) return;
    var meta = GAMES[game];
    if (!meta) { toast('Vòng chưa hỗ trợ ở client: ' + game); return; }
    var alive = alivePersons();
    active = {
      round: round, game: game, name: meta.name, isFinal: !!(opts && opts.isFinal),
      timeLimit: (opts && opts.timeLimit) || meta.time || 90,
      endsAt: Date.now() + (((opts && opts.timeLimit) || meta.time || 90) * 1000),
      local: !!(opts && opts.local),
      seed: (opts && opts.seed) || Date.now(),
      startAlive: alive.map(function (p) { return p.name; }),
      state: {}, opts: opts || {}
    };
    if (b.setHudDrum) b.setHudDrum(meta.name + ' — ' + meta.ruleShort);
    meta.start(active);
    simBuild(active);
    if (game === 'bit-mat' && !active.local) {
      if (pendingBlind === true) { hideOverlay(); showBlind(true, blindHtml(active)); }
      else if (pendingBlind === false) {
        active.state.goatIsMe = true;
        active.state.goat = b.player;
        hideBlind();
        showOverlay(goatPanelHtml(active));
        showGoatMarker();
      }
      if (pendingBlindGoatId !== null && pendingBlindGoatId !== undefined) {
        resolveGoat(active, pendingBlindGoatId);
      }
      if (pendingCue) updateCue(active, pendingCue.dir, pendingCue.dist);
      pendingBlind = null; pendingCue = null; pendingBlindGoatId = null;
    }
  }
  function endRound() {
    if (active) {
      var g = GAMES[active.game];
      try { if (g && g.end) g.end(active); } catch (e) { /* dọn dẹp không được làm vỡ game */ }
      simTeardown(active);
      active = null;
    }
    hideOverlay();
    hideBlind();
    goatMarker = removeMarker(goatMarker);
    flagMarker = removeMarker(flagMarker);
  }
  function update(dt) {
    if (!active) return;
    var g = GAMES[active.game];
    if (g && g.update) g.update(dt, active);
    if (!active) return; // vòng có thể kết thúc trong update
    simUpdate(dt, active);
    if (!active) return;
    if (active.local && Date.now() >= active.endsAt && g && g.timeout) g.timeout(active);
  }
  function onServerMessage(msg) {
    if (msg.type === 'blind' || msg.type === 'cue' || msg.type === 'caught') {
      if (active && active.game === 'bit-mat') {
        var g0 = GAMES['bit-mat'];
        if (g0 && g0.onMessage) return !!g0.onMessage(msg, active);
        return false;
      }
      // roundStart chưa tới: giữ lại để áp khi vòng Bịt Mắt bắt đầu.
      if (msg.type === 'blind') {
        pendingBlind = !!msg.blind;
        if (msg.goatId !== undefined && msg.goatId !== null) pendingBlindGoatId = msg.goatId;
      }
      else if (msg.type === 'cue') pendingCue = msg;
      else if (msg.type === 'caught') { hideBlind(); toast('Dê đã bị bắt!'); }
      return true;
    }
    if (!active) return false;
    var g = GAMES[active.game];
    if (g && g.onMessage) return !!g.onMessage(msg, active);
    return false;
  }
  function onSpace() {
    if (!active) return false;
    var b = B();
    if (!b || !b.player || !b.player.alive) return false;
    var g = GAMES[active.game];
    if (g && g.onSpace) return !!g.onSpace(active);
    return false;
  }
  function blocksMovement() {
    if (!active) return false;
    var g = GAMES[active.game];
    return !!(g && g.blocksMovement);
  }

  window.Rounds = {
    startRound: startRound, endRound: endRound, update: update,
    onServerMessage: onServerMessage, onSpace: onSpace, blocksMovement: blocksMovement,
    activeGame: function () { return active ? active.game : null; },
    currentRound: function () { return active ? active.round : 0; }
  };
})();
