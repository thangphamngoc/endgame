/* Nặn Tò He — mô phỏng vòng 4 (client/js/sim/sim-tohe.js).
 *
 * Hợp đồng: window.RoundSims['to-he'] = { build(st, api), update(dt, st, api),
 * teardown(st, api) }. Coordinator tự nối vào rounds.js / game.js.
 *
 * Gồm 3 phần, KHÔNG chạm vào logic chấm điểm / gửi bài của rounds.js:
 *  1. Bàn nặn bột 3D (voxel: chỉ BoxGeometry + MeshLambertMaterial) đặt trước
 *     mặt người chơi trong sân làng: bàn gỗ, khối bột đang nặn, hình mẫu bằng
 *     bột trên mâm gỗ, khay bột đủ màu, cây lăn bột, dân làng đứng xem.
 *  2. Làm đẹp canvas #trace-canvas: mẫu vẽ nét đứt vàng, nét vẽ màu bột dày
 *     bo tròn, viên ghi điểm tạm trong góc canvas. Chỉ vẽ LẠI trên cùng canvas
 *     sau khi rounds.js đã vẽ — không thay handler pointer nào của rounds.js.
 *  3. Dải HUD gọn (tối đa 2 dòng) dưới HUD chính: tên hình, điểm tạm, giờ còn.
 *
 * Điểm tạm tính đúng công thức của rounds.js traceScore (phủ 55% + chính xác
 * 45%, ngưỡng gần 18px, mẫu 120 điểm) — traceScore nằm trong IIFE của
 * rounds.js nên không gọi được, phải nhân bản công thức tại đây.
 * Chỉ dùng bản sắc dân gian Việt Nam, không dùng tài sản Squid Game/Minecraft.
 */
(function () {
  'use strict';

  var PAPER = '#fffdf4', EDGE = '#1f2937', RED = '#b5451b', RED2 = '#c62828';
  var TEAL = '#0f766e', GOLD = '#ffedb8';
  var DOUGH_OUTLINE = [0xc62828, 0x0f766e, 0xb45309, 0x15803d];
  var SHIRTS = [0xc62828, 0x0f766e, 0xf9a825, 0x43a047];

  var cur = null; // phiên build đang chạy (chỉ 1 vòng tại 1 thời điểm)

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function fmtTime(ms) {
    if (!isFinite(ms) || ms < 0) ms = 0;
    var s = Math.ceil(ms / 1000);
    return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2);
  }

  // ---------- Điểm tạm: nhân bản đúng công thức traceScore của rounds.js ----------
  function nearPoint(p, arr, d) {
    var d2 = d * d;
    for (var i = 0; i < arr.length; i++) {
      var dx = p[0] - arr[i][0], dy = p[1] - arr[i][1];
      if (dx * dx + dy * dy <= d2) return true;
    }
    return false;
  }
  function liveScore(target, drawn) {
    if (!target || !target.length || !drawn || !drawn.length) return 0;
    var cov = 0, i;
    for (i = 0; i < target.length; i++) if (nearPoint(target[i], drawn, 18)) cov++;
    var coverage = cov / target.length;
    var prec = 0, n = 0, step = Math.max(1, Math.floor(drawn.length / 120));
    for (var j = 0; j < drawn.length; j += step) { if (nearPoint(drawn[j], target, 18)) prec++; n++; }
    var precision = n ? prec / n : 0;
    return Math.round(100 * (0.55 * coverage + 0.45 * precision));
  }
  function penPoints(st) {
    var d = (st.state && st.state.drawn) || [];
    var out = [];
    for (var i = 0; i < d.length; i++) if (d[i] && d[i].pen === 1) out.push(d[i]);
    return out;
  }

  // ---------- Voxel helpers (chỉ BoxGeometry + MeshLambertMaterial) ----------
  function lam(color) { return new THREE.MeshLambertMaterial({ color: color }); }
  function box(parent, w, h, d, color, x, y, z) {
    var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lam(color));
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  }

  // Dân làng đứng xem: chân, áo, tay, đầu, nón lá xếp tầng bằng hộp vuông.
  function makeVillager(shirt) {
    var g = new THREE.Group();
    box(g, 0.22, 0.5, 0.22, 0x374151, -0.14, 0.25, 0);
    box(g, 0.22, 0.5, 0.22, 0x374151, 0.14, 0.25, 0);
    box(g, 0.72, 0.78, 0.42, shirt, 0, 0.9, 0);
    var armL = box(g, 0.18, 0.62, 0.18, shirt, -0.46, 0.9, 0);
    armL.rotation.z = 0.18;
    var armR = box(g, 0.18, 0.62, 0.18, shirt, 0.46, 0.9, 0);
    armR.rotation.z = -0.18;
    box(g, 0.44, 0.44, 0.42, 0xf2c89b, 0, 1.52, 0); // đầu
    box(g, 0.88, 0.06, 0.88, 0xe9d193, 0, 1.78, 0); // vành nón
    box(g, 0.62, 0.06, 0.62, 0xe9d193, 0, 1.84, 0);
    box(g, 0.36, 0.08, 0.36, 0xe9d193, 0, 1.91, 0); // chóp nón
    box(g, 0.9, 0.05, 0.9, RED2, 0, 1.75, 0); // viền nón đỏ
    return g;
  }

  // Hình mẫu bằng bột: nối các điểm target (canvas 320x320) thành khối bột nhỏ
  // đặt trên mâm gỗ. Dùng đúng target của vòng nên đổi hình là đổi tượng bột.
  function buildDoughFigure(group, target) {
    while (group.children.length) {
      var c = group.children.pop();
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    }
    if (!target || !target.length) return;
    var scale = 0.0045, step = 3;
    for (var i = 0; i < target.length; i += step) {
      var p = target[i];
      var m = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.16, 0.16),
        lam(DOUGH_OUTLINE[(i / step | 0) % DOUGH_OUTLINE.length])
      );
      m.position.set((p[0] - 160) * scale, 0.08, (p[1] - 160) * scale);
      group.add(m);
    }
    // Vài viên bột ở giữa cho tượng trông "đầy đặn" như tò he thật.
    box(group, 0.34, 0.2, 0.34, 0xf2b25c, 0, 0.1, 0);
    box(group, 0.22, 0.16, 0.22, 0xe79b34, 0.18, 0.22, 0.1);
  }

  function buildTable(api, st) {
    var THREE_ = window.THREE;
    if (!THREE_ || !api.scene) return null;
    var p = api.player || {};
    var px = (typeof p.x === 'number') ? p.x : 0;
    var pz = (typeof p.z === 'number') ? p.z : 35; // START_Z của game.js
    var root = new THREE_.Group();
    // Bàn đặt ngay trước mặt người chơi (camera ở sau lưng, nhìn về -z).
    root.position.set(px, 0, pz - 3.6);

    // Chiếu cói dưới bàn.
    box(root, 5.6, 0.08, 4.2, 0xe9d193, 0, 0.04, 0);
    // Bàn gỗ: mặt bàn, viền, 4 chân, thanh giằng.
    box(root, 3.6, 0.22, 2.2, 0xa06a35, 0, 1.0, 0);
    box(root, 3.7, 0.08, 2.3, 0x7a4a21, 0, 0.9, 0);
    box(root, 0.22, 1.0, 0.22, 0x6d4c41, -1.6, 0.5, -0.9);
    box(root, 0.22, 1.0, 0.22, 0x6d4c41, 1.6, 0.5, -0.9);
    box(root, 0.22, 1.0, 0.22, 0x6d4c41, -1.6, 0.5, 0.9);
    box(root, 0.22, 1.0, 0.22, 0x6d4c41, 1.6, 0.5, 0.9);
    box(root, 3.0, 0.14, 0.14, 0x6d4c41, 0, 0.32, -0.9);
    box(root, 3.0, 0.14, 0.14, 0x6d4c41, 0, 0.32, 0.9);

    // Mâm gỗ bên trái bàn: tượng bột hình mẫu xoay chậm trên mâm.
    box(root, 1.7, 0.08, 1.7, 0xd9b380, -0.85, 1.15, 0);
    var figure = new THREE_.Group();
    figure.position.set(-0.85, 1.2, 0);
    root.add(figure);

    // Khối bột đang nặn bên phải bàn (phồng nhẹ theo nhịp thở trong update).
    var blob = new THREE_.Group();
    blob.position.set(0.95, 1.11, -0.4);
    box(blob, 1.1, 0.45, 0.8, 0xffe0a3, 0, 0.22, 0);
    box(blob, 0.7, 0.35, 0.55, 0xf5c86e, 0, 0.55, 0);
    box(blob, 0.4, 0.22, 0.35, 0xffe0a3, 0.15, 0.8, 0.05);
    box(blob, 0.22, 0.14, 0.22, 0xe79b34, -0.3, 0.85, -0.1);
    root.add(blob);

    // Khay bột đủ màu.
    box(root, 1.3, 0.08, 0.8, 0x8a5a2b, 0.95, 1.15, 0.6);
    var trayCols = [0xc62828, 0x0f766e, 0x43a047, 0xf9a825];
    for (var t = 0; t < 4; t++) {
      var bx = 0.55 + (t % 2) * 0.55, bz = 0.4 + Math.floor(t / 2) * 0.42;
      box(root, 0.3, 0.18, 0.3, trayCols[t], bx, 1.28, bz);
      box(root, 0.18, 0.14, 0.18, trayCols[t], bx + 0.08, 1.42, bz);
    }
    // Cây lăn bột + bay nặn.
    var pin = box(root, 1.5, 0.16, 0.16, 0xd9b380, -0.15, 1.19, 0.78);
    pin.rotation.y = 0.5;
    box(root, 0.5, 0.04, 0.18, RED2, -1.35, 1.14, 0.72).rotation.y = -0.3;
    box(root, 0.35, 0.06, 0.1, 0x6d4c41, -1.35, 1.14, 0.95).rotation.y = -0.3;
    // Bát bột nhỏ màu chàm.
    box(root, 0.5, 0.06, 0.5, TEAL, -1.35, 1.14, -0.62);
    box(root, 0.5, 0.22, 0.06, TEAL, -1.35, 1.26, -0.87);
    box(root, 0.5, 0.22, 0.06, TEAL, -1.35, 1.26, -0.37);
    box(root, 0.06, 0.22, 0.5, TEAL, -1.6, 1.26, -0.62);
    box(root, 0.06, 0.22, 0.5, TEAL, -1.1, 1.26, -0.62);
    box(root, 0.3, 0.14, 0.3, 0xffe0a3, -1.35, 1.24, -0.62);

    // Cờ đuôi nheo trên 2 cột tre sau bàn.
    box(root, 0.12, 2.6, 0.12, 0x6d4c41, -2.6, 1.3, -1.4);
    box(root, 0.12, 2.6, 0.12, 0x6d4c41, 2.6, 1.3, -1.4);
    box(root, 5.2, 0.05, 0.05, 0x8a6a45, 0, 2.5, -1.4);
    var flags = [];
    var flagCols = [0xc62828, 0x0f766e, 0xf9a825, 0xc62828, 0x0f766e, 0xf9a825, 0xc62828];
    for (var f = 0; f < 7; f++) {
      var fl = box(root, 0.3, 0.36, 0.04, flagCols[f], -2.25 + f * 0.75, 2.3, -1.4);
      flags.push(fl);
    }

    // 2 ghế đẩu phía người chơi.
    [[-1.15, 1.9], [1.15, 1.9]].forEach(function (pos) {
      box(root, 0.62, 0.12, 0.62, 0x8a5a2b, pos[0], 0.55, pos[1]);
      box(root, 0.1, 0.55, 0.1, 0x6d4c41, pos[0] - 0.22, 0.27, pos[1] - 0.22);
      box(root, 0.1, 0.55, 0.1, 0x6d4c41, pos[0] + 0.22, 0.27, pos[1] - 0.22);
      box(root, 0.1, 0.55, 0.1, 0x6d4c41, pos[0] - 0.22, 0.27, pos[1] + 0.22);
      box(root, 0.1, 0.55, 0.1, 0x6d4c41, pos[0] + 0.22, 0.27, pos[1] + 0.22);
    });

    // Dân làng đứng xem quanh bàn, mặt hướng vào bàn.
    var watchers = [];
    var spots = [
      [-2.9, -0.7], [2.9, -0.7], [-2.5, 1.5], [2.6, 1.5]
    ];
    spots.forEach(function (sp, i) {
      var v = makeVillager(SHIRTS[i % SHIRTS.length]);
      v.position.set(sp[0], 0, sp[1]);
      v.rotation.y = Math.atan2(-sp[0], -sp[1]); // quay mặt về tâm bàn
      root.add(v);
      watchers.push({ g: v, phase: i * 1.3 });
    });

    api.scene.add(root);
    return { root: root, figure: figure, blob: blob, flags: flags, watchers: watchers };
  }

  // ---------- Làm đẹp canvas (vẽ LẠI sau rounds.js, không thay handler) ----------
  function repaintCanvas(c) {
    var cv = c.canvas;
    if (!cv) return;
    var st = c.st;
    var target = (st.state && st.state.target) || [];
    var drawn = (st.state && st.state.drawn) || [];
    var ctx = cv.getContext('2d');
    if (!ctx) return;
    // Nền giấy ấm + lưới chấm mờ như giấy nặn bột.
    ctx.clearRect(0, 0, 320, 320);
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, 320, 320);
    ctx.fillStyle = 'rgba(150,90,20,0.10)';
    for (var gy = 16; gy < 320; gy += 32) {
      for (var gx = 16; gx < 320; gx += 32) ctx.fillRect(gx, gy, 2, 2);
    }
    // Mẫu: nét đứt vàng, tô nhạt bên trong để mắt dễ bám theo.
    if (target.length) {
      ctx.save();
      ctx.beginPath();
      target.forEach(function (p, i) { if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]); });
      ctx.closePath();
      ctx.fillStyle = 'rgba(255,237,184,0.45)';
      ctx.fill();
      ctx.setLineDash([8, 6]);
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
      // Chấm tròn ở các đỉnh mẫu để thấy rõ hình (ngôi sao, hoa sen...).
      ctx.fillStyle = '#b45309';
      var step = Math.max(1, Math.floor(target.length / 24));
      for (var vi = 0; vi < target.length; vi += step) {
        ctx.beginPath();
        ctx.arc(target[vi][0], target[vi][1], 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Nét vẽ của người chơi: viền đỏ sậm + thân màu bột dày, bo tròn.
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    var passes = [
      { color: RED2, width: 11 },
      { color: '#e79b34', width: 8 },
      { color: '#ffe0a3', width: 3 }
    ];
    passes.forEach(function (ps) {
      ctx.strokeStyle = ps.color;
      ctx.lineWidth = ps.width;
      for (var i = 1; i < drawn.length; i++) {
        if (!drawn[i] || drawn[i].pen === 0) continue;
        ctx.beginPath();
        ctx.moveTo(drawn[i - 1][0], drawn[i - 1][1]);
        ctx.lineTo(drawn[i][0], drawn[i][1]);
        ctx.stroke();
      }
    });
    // Viên ghi điểm tạm góc trên-trái (vùng trống của mọi mẫu: y < 16px).
    var label = drawn.length
      ? 'Điểm tạm: ' + c.score + '/100'
      : 'Vẽ theo nét đứt vàng nhé!';
    ctx.font = 'bold 13px "Be Vietnam Pro", system-ui, sans-serif';
    var w = ctx.measureText(label).width + 18;
    ctx.fillStyle = '#fffdf4';
    ctx.strokeStyle = EDGE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(8, 8, w, 24);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = RED;
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 17, 21);
  }

  // ---------- Dải HUD ----------
  function injectStyle() {
    if ($('sim-tohe-style')) return;
    var s = document.createElement('style');
    s.id = 'sim-tohe-style';
    s.textContent =
      '.sim-tohe-strip{position:fixed;left:50%;top:166px;transform:translateX(-50%);' +
      'z-index:6;width:min(520px,92vw);pointer-events:none;text-align:center;' +
      'font-family:"Be Vietnam Pro",system-ui,sans-serif;color:#fff7ea;}' +
      // #32 (cycle 48): dải từng ở top 118px, nằm dưới dải gợi ý phím
      // #roundHint (z-index 7 > 6) nên bị gợi ý che trong 12s đầu vòng —
      // cùng họ lỗi với Bịt Mắt / Rồng Rắn / Ô Ăn Quan (chỉ khác chiều đè).
      // Dời xuống dưới gợi ý (166px; tablet 184px vì gợi ý xuống 2 dòng ở 621px, đáy ~177px) + chừa cột minimap như #roundHint
      // (tablet right:190px, mobile top 236px (gợi ý mobile đáy tối đa ~229px) + right:160px (chừa cả minimap lẫn cột econBar mobile, bắt đầu x=204px)).
      '@media (min-width:621px) and (max-width:900px){.sim-tohe-strip{top:184px;left:6px;right:190px;transform:none;width:auto;max-width:none}}' +
      '@media (max-width:620px){.sim-tohe-strip{top:236px;left:6px;right:160px;transform:none;width:auto;max-width:none}}' +
      '.sim-tohe-line1{display:flex;gap:6px;justify-content:center;align-items:center;' +
      'flex-wrap:wrap;background:rgba(30,18,10,.88);border:3px solid #1d0f06;border-radius:3px;' +
      'padding:5px 10px;box-shadow:inset 0 0 0 2px rgba(255,205,120,.22),0 4px 0 rgba(0,0,0,.25);}' +
      // #32 (cycle 48): mobile dòng 1 xuống 2 hàng ở 194px rộng nên dải cao
      // ~119px, đáy chạm tới tấm overlay bottom-sheet (đỉnh ~346px ở màn
      // 640px). Thu chữ + đệm trên mobile cho dải gọn lại.
      '@media (max-width:620px){.sim-tohe-line1{padding:4px 8px}.sim-tohe-shape{font-size:13px}.sim-tohe-line2{font-size:11px}}' +
      '.sim-tohe-badge{background:#b5451b;color:#fffdf4;font-weight:900;font-size:12px;' +
      'letter-spacing:.5px;padding:2px 7px;border-radius:2px;white-space:nowrap;}' +
      '.sim-tohe-shape{font-weight:900;font-size:14px;white-space:nowrap;}' +
      '.sim-tohe-score{font-weight:900;font-size:13px;background:#ffedb8;color:#1f2937;' +
      'padding:2px 8px;border-radius:2px;white-space:nowrap;font-variant-numeric:tabular-nums;}' +
      '.sim-tohe-score.good{background:#43a047;color:#fff;}' +
      '.sim-tohe-score.mid{background:#0f766e;color:#fff;}' +
      '.sim-tohe-line2{margin-top:4px;font-size:12px;font-weight:700;' +
      'text-shadow:0 1px 3px rgba(0,0,0,.7);font-variant-numeric:tabular-nums;}' +
      '#trace-canvas.sim-tohe-canvas{border-color:#b5451b !important;' +
      'box-shadow:0 6px 0 rgba(60,20,5,.35),0 0 0 3px #ffedb8 !important;' +
      'background:#fffdf4;border-radius:4px;}';
    document.head.appendChild(s);
  }

  function buildStrip(st) {
    var d = document.createElement('div');
    d.className = 'sim-tohe-strip';
    d.innerHTML =
      '<div class="sim-tohe-line1">' +
      '<span class="sim-tohe-badge">🎨 NẶN TÒ HE</span>' +
      '<span class="sim-tohe-shape"></span>' +
      '<span class="sim-tohe-score">Điểm tạm: 0/100</span>' +
      '</div>' +
      '<div class="sim-tohe-line2"></div>';
    document.body.appendChild(d);
    return d;
  }

  function updateStrip(c) {
    if (!c.strip) return;
    var st = c.st;
    var shapeName = (st.state && st.state.shape && st.state.shape.name) || 'hình mẫu';
    var submitted = st.state && st.state.myScore !== null && st.state.myScore !== undefined;
    var score = submitted ? st.state.myScore : c.score;
    var scoreTxt = submitted ? ('Đã nộp: ' + score + '/100') : ('Điểm tạm: ' + score + '/100');
    var remain = (st.endsAt ? st.endsAt - Date.now() : (st.timeLimit || 60) * 1000);
    var line2 = 'Vẽ theo nét đứt vàng · Còn ' + fmtTime(remain) +
      (submitted ? ' · Chờ chấm bài…' : ' · Bấm NỘP BÀI khi xong');
    var txt = shapeName + '|' + scoreTxt + '|' + line2;
    if (txt === c.lastStripTxt) return;
    c.lastStripTxt = txt;
    var shapeEl = c.strip.querySelector('.sim-tohe-shape');
    var scoreEl = c.strip.querySelector('.sim-tohe-score');
    var line2El = c.strip.querySelector('.sim-tohe-line2');
    if (shapeEl) shapeEl.textContent = 'Mẫu: ' + shapeName;
    if (scoreEl) {
      scoreEl.textContent = scoreTxt;
      scoreEl.classList.toggle('good', score >= 80);
      scoreEl.classList.toggle('mid', score >= 50 && score < 80);
    }
    if (line2El) line2El.textContent = line2;
  }

  // ---------- Vòng đời ----------
  function ensureCanvas(c) {
    var cv = $('trace-canvas');
    if (!cv) { c.canvas = null; return; }
    if (c.canvas === cv) return;
    detachCanvas(c);
    c.canvas = cv;
    cv.classList.add('sim-tohe-canvas');
    // Listener PHỤ, chạy sau handler của rounds.js (đăng ký sau): chỉ vẽ lại
    // cho đẹp, không ngăn / không thay hành vi gốc. pointerup của rounds.js
    // đã cập nhật #trace-score trước khi listener này chạy.
    c.onPointer = function () { c.needRepaint = true; };
    cv.addEventListener('pointermove', c.onPointer);
    cv.addEventListener('pointerdown', c.onPointer);
    cv.addEventListener('pointerup', c.onPointer);
    c.needRepaint = true;
  }
  function detachCanvas(c) {
    if (c.canvas && c.onPointer) {
      c.canvas.removeEventListener('pointermove', c.onPointer);
      c.canvas.removeEventListener('pointerdown', c.onPointer);
      c.canvas.removeEventListener('pointerup', c.onPointer);
      c.canvas.classList.remove('sim-tohe-canvas');
    }
    c.canvas = null;
    c.onPointer = null;
  }

  function build(st, api) {
    if (cur) teardown(cur.st, cur.api);
    api = api || window.__game || {};
    var table = null;
    try { table = buildTable(api, st); } catch (e) { table = null; }
    injectStyle();
    var c = {
      st: st, api: api, table: table, t: 0,
      score: 0, lastScoreAt: 0,
      canvas: null, onPointer: null, needRepaint: false,
      lastDrawnLen: -1, lastTargetLen: -1, lastShapeId: null,
      strip: buildStrip(st), lastStripTxt: null
    };
    cur = c;
    ensureCanvas(c);
    repaintCanvas(c);
    updateStrip(c);
    return c;
  }

  function update(dt, st, api) {
    if (!cur || (st && st !== cur.st)) return;
    var c = cur;
    c.t += dt || 0;
    var now = Date.now();

    // Mẫu có thể đổi giữa vòng (server gửi traceTarget): đổi tượng bột theo.
    var shapeId = (st.state && st.state.shape && st.state.shape.id) || null;
    var target = (st.state && st.state.target) || [];
    if (shapeId !== c.lastShapeId || target.length !== c.lastTargetLen) {
      c.lastShapeId = shapeId;
      c.lastTargetLen = target.length;
      if (c.table && c.table.figure) buildDoughFigure(c.table.figure, target);
      c.needRepaint = true;
    }
    // Điểm tạm: tính lại tối đa mỗi 150ms khi đang vẽ (đắt nếu tính mỗi frame).
    var drawnLen = ((st.state && st.state.drawn) || []).length;
    if (drawnLen !== c.lastDrawnLen) { c.lastDrawnLen = drawnLen; c.needRepaint = true; }
    if (drawnLen > 0 && now - c.lastScoreAt >= 150) {
      c.lastScoreAt = now;
      c.score = liveScore(target, penPoints(st));
      // Đồng bộ dòng điểm tạm của rounds.js trong lúc vẽ (không chạm khi đã nộp).
      if (!st.state || st.state.myScore === null || st.state.myScore === undefined) {
        var sc = $('trace-score');
        if (sc) sc.textContent = 'Điểm tạm: ' + c.score + '/100 — bấm NỘP BÀI khi xong.';
      }
    }
    if (drawnLen === 0) c.score = 0;

    ensureCanvas(c);
    if (c.needRepaint && c.canvas) { repaintCanvas(c); c.needRepaint = false; }
    updateStrip(c);

    // Hoạt ảnh 3D: tượng bột xoay, khối bột "thở", dân làng đung đưa, cờ phấp phới.
    if (c.table) {
      var t = c.t;
      if (c.table.figure) c.table.figure.rotation.y += (dt || 0) * 0.4;
      if (c.table.blob) {
        var s = 1 + Math.sin(t * 1.6) * 0.03;
        c.table.blob.scale.set(s, 1 + Math.sin(t * 1.6) * 0.05, s);
      }
      c.table.watchers.forEach(function (w) {
        w.g.rotation.z = Math.sin(t * 1.2 + w.phase) * 0.04;
        w.g.position.y = Math.abs(Math.sin(t * 1.2 + w.phase)) * 0.03;
      });
      c.table.flags.forEach(function (fl, i) {
        fl.rotation.x = Math.sin(t * 2.2 + i * 0.9) * 0.18;
      });
    }
  }

  function teardown(st, api) {
    if (!cur) return;
    var c = cur;
    cur = null;
    detachCanvas(c);
    if (c.strip && c.strip.parentNode) c.strip.parentNode.removeChild(c.strip);
    var style = $('sim-tohe-style');
    if (style && style.parentNode) style.parentNode.removeChild(style);
    if (c.table && c.table.root) {
      if (c.api && c.api.scene) c.api.scene.remove(c.table.root);
      c.table.root.traverse(function (o) {
        if (o.geometry) o.geometry.dispose();
        if (o.material) o.material.dispose();
      });
    }
  }

  window.RoundSims = window.RoundSims || {};
  window.RoundSims['to-he'] = { build: build, update: update, teardown: teardown };
})();
