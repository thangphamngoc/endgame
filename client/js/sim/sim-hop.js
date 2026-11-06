/* NHẢY BAO BỐ — mô phỏng 3D trong thế giới (vòng dự phòng, rounds.js gọi qua
 * window.RoundSims['nhay-bao-bo']).
 *
 * Chỉ vẽ + chạy hiệu ứng, KHÔNG chấm điểm, KHÔNG gửi tin hop: nhịp, điểm và
 * loại vẫn do rounds.js (chơi đơn) / server (multiplayer) quyết định.
 *
 * Cách nối với game.js (đã kiểm tra trong code, coordinator nên xác nhận lại):
 * - Người chơi: game.js updatePlayerMovement() chạy mỗi khung hình ở các vòng
 *   3–6 và ghi đè group.position.y bằng player.y, nên cú nhảy của người chơi
 *   đi qua player.vy/player.y (trọng lực của game tự kéo xuống) thay vì gán
 *   trực tiếp group.position.y. Space ở vòng này đã bị rounds.js onSpace chặn
 *   (không đặt jumpQueued) nên đặt vy ở đây không xung đột.
 * - Bot chơi đơn: game.js không chạm vào group của bot ở các vòng 3–6, nên
 *   sim được di chuyển group của bot dọc đường đua theo st.state.botProg.
 *   Vị trí logic (bot.x/bot.z) không đổi — chỉ là hình ảnh.
 * - Multiplayer: server chỉ broadcast hopState khi có người về đích, nên sim
 *   không có tiến độ từng người theo thời gian thực. Cú nhảy của người chơi
 *   lấy từ phím Space / nút NHẢY (sự kiện bấm, không phải điểm số); người
 *   chơi khác nhảy theo chuyển động x/z thật của họ.
 * - Đường đua đặt ở vạch xuất phát chuẩn của sân (z = 33 → -27, START_Z của
 *   game.js). Sau vòng 2 người chơi đứng ở cuối cầu (z ≈ -131), nên dải HUD
 *   hiện khoảng cách về vạch xuất phát cho tới khi họ chạy về tới sân.
 */
(function () {
  'use strict';

  var START_Z = 33, FINISH_Z = -27;
  var TRACK_LEN = START_Z - FINISH_Z; // 60 đơn vị = 20 nhịp x 3 đơn vị/nhịp
  var TRACK_W = 12;
  var LANE_X = [-5, -3, -1, 1, 3, 5];
  var HOP_DUR = 0.38; // thời gian một cú nhảy (giây)
  var HOP_HEIGHT = 0.8;
  var COL = {
    paper: 0xfffdf4, edge: 0x1f2937, red: 0xc62828, redDeep: 0xb5451b,
    teal: 0x0f766e, gold: 0xffedb8, sand: 0xe3c98d, burlap: 0xc9a86a,
    burlapDark: 0xa8824f, white: 0xffffff, black: 0x1f2937
  };

  var S = null; // trạng thái của lần build đang chạy (null khi không chạy)

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  // ---------- vật liệu / mesh voxel ----------
  function lam(color) { return new THREE.MeshLambertMaterial({ color: color }); }
  function bx(w, h, d, material, x, y, z, parent) {
    var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    m.position.set(x || 0, y || 0, z || 0);
    (parent || S.group).add(m);
    return m;
  }
  function textTexture(text, bg, fg, w, h) {
    var cv = document.createElement('canvas');
    cv.width = w || 512; cv.height = h || 128;
    var c = cv.getContext('2d');
    c.fillStyle = bg; c.fillRect(0, 0, cv.width, cv.height);
    c.strokeStyle = fg; c.lineWidth = 6;
    c.strokeRect(8, 8, cv.width - 16, cv.height - 16);
    c.fillStyle = fg; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = '900 ' + Math.round(cv.height * 0.55) + 'px "Be Vietnam Pro", Arial, sans-serif';
    c.fillText(text, cv.width / 2, cv.height / 2 + 2);
    var tx = new THREE.CanvasTexture(cv);
    tx.colorSpace = THREE.SRGBColorSpace;
    if (S) S.textures.push(tx);
    return tx;
  }
  // Bảng chữ hai mặt (nhìn được từ cả hai hướng chạy).
  function signBoard(text, bw, bh, bg, fg) {
    var tex = textTexture(text, bg, fg, 512, Math.max(64, Math.round(512 * bh / bw)));
    var side = lam(0x5d3a1a);
    var face = new THREE.MeshLambertMaterial({ map: tex });
    return new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 0.18), [side, side, side, side, face, face]);
  }

  // ---------- bao bố ----------
  function makeSack(person) {
    var g = new THREE.Group();
    // Thân bao ôm từ chân lên tới thắt lưng (nhân vật cao ~2,3; chân 0–0,92).
    bx(0.62, 1.05, 0.42, lam(COL.burlap), 0, 0.55, 0, g);
    // Miệng bao + dây rút.
    bx(0.66, 0.14, 0.46, lam(COL.burlapDark), 0, 1.08, 0, g);
    bx(0.68, 0.07, 0.48, lam(COL.redDeep), 0, 0.98, 0, g);
    // Miếng vá đỏ trước bao cho có sắc dân gian.
    bx(0.3, 0.3, 0.05, lam(COL.red), 0, 0.6, 0.22, g);
    person.group.add(g);
    var rec = { person: person, g: g };
    S.sacks.push(rec);
    return rec;
  }
  function removeSack(rec) {
    if (!rec) return;
    if (rec.person && rec.person.group) rec.person.group.remove(rec.g);
    var i = S.sacks.indexOf(rec);
    if (i >= 0) S.sacks.splice(i, 1);
  }
  function sackOf(person) {
    for (var i = 0; i < S.sacks.length; i++) if (S.sacks[i].person === person) return S.sacks[i];
    return null;
  }
  function ensureSacks(api) {
    var persons = api.allPersons ? api.allPersons() : [];
    persons.forEach(function (p) {
      if (!p || !p.alive || !p.group) return;
      if (!sackOf(p)) makeSack(p);
    });
    // Người vừa bị loại thì cởi bao (game.js tự làm hiệu ứng ngã).
    S.sacks.slice().forEach(function (rec) {
      if (!rec.person.alive) removeSack(rec);
    });
  }

  // ---------- bụi đất ----------
  function spawnDust(x, z, n) {
    var made = 0;
    for (var i = 0; i < S.puffs.length && made < n; i++) {
      var pf = S.puffs[i];
      if (pf.life < 0.55) continue;
      pf.life = 0;
      pf.mesh.visible = true;
      pf.mesh.position.set(x + rand(-0.4, 0.4), 0.15, z + rand(-0.4, 0.4));
      pf.mesh.scale.setScalar(0.7);
      pf.mesh.material.opacity = 0.85;
      made++;
    }
  }
  function updatePuffs(dt) {
    S.puffs.forEach(function (pf) {
      if (pf.life >= 0.55) { pf.mesh.visible = false; return; }
      pf.life += dt;
      var k = pf.life / 0.55;
      pf.mesh.position.y = 0.15 + pf.life * 1.1;
      pf.mesh.scale.setScalar(0.7 + k * 2.2);
      pf.mesh.material.opacity = 0.85 * (1 - k);
      if (pf.life >= 0.55) pf.mesh.visible = false;
    });
  }

  // ---------- đường đua ----------
  function buildTrack(api) {
    var g = new THREE.Group();
    S.group = g;
    api.scene.add(g);

    // Dải cát.
    bx(TRACK_W, 0.1, TRACK_LEN, lam(COL.sand), 0, 0.05, (START_Z + FINISH_Z) / 2, g);
    // Vạch biên + vạch chia làn (6 làn, mỗi làn 2 đơn vị).
    var i, x;
    for (i = 0; i < LANE_X.length - 1; i++) {
      x = (LANE_X[i] + LANE_X[i + 1]) / 2;
      bx(0.14, 0.04, TRACK_LEN, lam(COL.white), x, 0.11, (START_Z + FINISH_Z) / 2, g);
    }
    bx(0.18, 0.04, TRACK_LEN, lam(COL.white), -TRACK_W / 2, 0.11, (START_Z + FINISH_Z) / 2, g);
    bx(0.18, 0.04, TRACK_LEN, lam(COL.white), TRACK_W / 2, 0.11, (START_Z + FINISH_Z) / 2, g);
    // Vạch xuất phát.
    bx(TRACK_W + 0.4, 0.06, 0.7, lam(COL.white), 0, 0.11, START_Z, g);
    // Vạch đích caro.
    for (i = 0; i < 12; i++) {
      bx(1, 0.06, 0.7, lam(i % 2 ? COL.black : COL.white), -5.5 + i, 0.11, FINISH_Z, g);
    }

    // Bảng XUẤT PHÁT bên đường (đứng dọc, nhìn được từ đường đua).
    var startBoard = signBoard('XUẤT PHÁT', 5.2, 1.3, '#7a4a24', '#ffedb8');
    startBoard.position.set(-7.6, 2.3, START_Z);
    startBoard.rotation.y = Math.PI / 2;
    g.add(startBoard);
    bx(0.25, 2.6, 0.25, lam(0x6e4a26), -7.6, 1.0, START_Z - 1.6, g);
    bx(0.25, 2.6, 0.25, lam(0x6e4a26), -7.6, 1.0, START_Z + 1.6, g);

    // Cổng đích: hai cột sọc đỏ/trắng + bảng ĐÍCH.
    [-6.4, 6.4].forEach(function (px) {
      for (var s = 0; s < 5; s++) {
        bx(0.7, 1, 0.7, lam(s % 2 ? COL.white : COL.red), px, 0.5 + s, FINISH_Z, g);
      }
      bx(0.9, 0.25, 0.9, lam(COL.gold), px, 5.1, FINISH_Z, g);
    });
    var banner = signBoard('ĐÍCH', 13.6, 1.7, '#b5451b', '#ffedb8');
    banner.position.set(0, 5.6, FINISH_Z);
    g.add(banner);

    // Cờ nhỏ hai bên đường, xen kẽ đỏ / teal / vàng.
    var flagCols = [COL.red, COL.teal, 0xf2b01e];
    var fi = 0;
    for (var z = 30; z >= -24; z -= 7.5) {
      [-6.9, 6.9].forEach(function (fx) {
        bx(0.12, 1.7, 0.12, lam(0x6e4a26), fx, 0.85, z, g);
        var fl = bx(0.75, 0.5, 0.06, lam(flagCols[fi % 3]), fx + (fx < 0 ? 0.42 : -0.42), 1.45, z, g);
        S.flags.push(fl);
        fi++;
      });
    }

    // Bó rơm trang trí ngoài đường đua.
    bx(1.3, 0.85, 0.85, lam(0xd9a441), -7.8, 0.42, 26, g);
    bx(1.3, 0.85, 0.85, lam(0xd9a441), 7.8, 0.42, 22, g);
    bx(1.3, 0.85, 0.85, lam(0xd9a441), 7.8, 1.27, 22, g);
    bx(1.3, 0.85, 0.85, lam(0xd9a441), -7.8, 0.42, -20, g);
  }

  // ---------- HUD: dải nhịp + tiến độ ----------
  function buildHud() {
    var css = [
      '.sim-hop-strip{position:fixed;left:50%;transform:translateX(-50%);',
      'top:calc(118px + env(safe-area-inset-top));z-index:6;width:min(480px,60vw);',
      'pointer-events:none;background:rgba(30,18,10,.78);border:2px solid #1f2937;border-radius:3px;',
      'box-shadow:inset 0 0 0 2px rgba(255,205,120,.18),0 3px 0 rgba(0,0,0,.25);',
      'padding:5px 10px 6px;color:#fff7ea;font-weight:700;font-size:12.5px;line-height:1.35}',
      '.sim-hop-meter{position:relative;height:12px;background:#e8f5e9;border:2px solid #1f2937;',
      'border-radius:2px;overflow:hidden;margin-bottom:3px}',
      '.sim-hop-zone{position:absolute;left:42%;width:16%;top:0;bottom:0;background:#ffd34d;',
      'border-left:2px solid #1f2937;border-right:2px solid #1f2937}',
      '.sim-hop-meter.on .sim-hop-zone{background:#7ed957;box-shadow:0 0 8px 2px rgba(126,217,87,.9)}',
      '.sim-hop-marker{position:absolute;left:0;top:-2px;width:5px;height:16px;background:#c62828;transform:translateX(-50%)}',
      '.sim-hop-text{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:center}',
      '.sim-hop-text .bad{color:#ff9d8a}',
      '@media (max-width:700px){.sim-hop-strip{left:8px;transform:none;width:calc(100vw - 170px)}}'
    ].join('\n');
    var style = document.createElement('style');
    style.id = 'sim-hop-style';
    style.textContent = css;
    document.head.appendChild(style);
    S.styleEl = style;

    var strip = document.createElement('div');
    strip.className = 'sim-hop-strip';
    strip.innerHTML =
      '<div class="sim-hop-meter"><div class="sim-hop-zone"></div>' +
      '<div class="sim-hop-marker"></div></div>' +
      '<div class="sim-hop-text">Nhảy Bao Bố — bấm NHẢY đúng lúc vạch vào ô vàng!</div>';
    document.body.appendChild(strip);
    S.stripEl = strip;
    S.meterEl = strip.querySelector('.sim-hop-meter');
    S.markerEl = strip.querySelector('.sim-hop-marker');
    S.textEl = strip.querySelector('.sim-hop-text');
  }

  // ---------- cú nhảy của người chơi (qua vật lý của game.js) ----------
  function triggerPlayerHop(api) {
    var p = api.player;
    if (!p || !p.alive) return;
    p.vy = 5.2;
    if (p.y !== undefined && p.y < 0.05) p.y = 0.05;
    S.playerWasAir = true;
  }
  function onKeyDown(ev) {
    if (!S || !S.api) return;
    if (ev.repeat) return;
    var code = ev.code || ev.key;
    if (code !== 'Space' && code !== ' ') return;
    var ae = document.activeElement;
    if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA')) return;
    var p = S.api.player;
    if (!p || !p.alive) return;
    S.tapCount++;
    triggerPlayerHop(S.api);
  }
  function onDocClick(ev) {
    if (!S || !S.api) return;
    var t = ev.target;
    while (t && t !== document) {
      if (t.id === 'btn-hop') { S.tapCount++; triggerPlayerHop(S.api); return; }
      t = t.parentNode;
    }
  }

  // ---------- xếp bot chơi đơn vào làn xuất phát ----------
  function placeBotsSingle(api) {
    var bots = api.allPersons().filter(function (p) { return p.isBot && p.alive; });
    bots.forEach(function (b, i) {
      var a = S.anims[b.id] || (S.anims[b.id] = {});
      a.laneX = LANE_X[i % LANE_X.length];
      // Giữ lại vị trí gốc để teardown trả bot về chỗ cũ.
      if (a.ox === undefined) {
        a.ox = b.group.position.x; a.oz = b.group.position.z;
        a.orot = b.group.rotation.y;
      }
      b.group.position.set(a.laneX, 0, START_Z - 1.5 - (i % 3) * 0.7);
      b.group.rotation.set(0, Math.PI, 0); // quay mặt về đích (-z)
      a.lastProg = 0; a.lastFloor = 0; a.hopT = 1; a.side = (i % 2 ? 1 : -1);
    });
  }

  // ---------- build / update / teardown ----------
  function build(st, api) {
    if (S) teardown(S.st, S.api);
    if (!window.THREE || !api || !api.scene) return;
    S = {
      st: st, api: api, group: null, sacks: [], anims: {}, puffs: [],
      flags: [], textures: [], styleEl: null, stripEl: null, meterEl: null,
      markerEl: null, textEl: null, lastPlayerProg: 0, lastLockout: 0,
      lastMarkerPct: -1, lastText: '', tapCount: 0, playerWasAir: false,
      stumbleT: 0, t: 0, fogSaved: null
    };
    if (st && st.state) {
      S.lastPlayerProg = st.state.progress || 0;
      S.lastLockout = st.state.lockout || 0;
    }
    buildTrack(api);
    buildHud();
    // Bụi đất: 14 cục tái chế.
    for (var i = 0; i < 14; i++) {
      var m = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.22, 0.22),
        new THREE.MeshLambertMaterial({ color: 0xe8dcc0, transparent: true, opacity: 0 })
      );
      m.visible = false;
      S.group.add(m);
      S.puffs.push({ mesh: m, life: 0.55 });
    }
    ensureSacks(api);
    if (st && st.local) placeBotsSingle(api);
    // Sương vòng 2 (near 16 / far 130) che mất đường đua khi nhìn từ xa:
    // nới ra trong lúc vòng này chạy, teardown trả lại như cũ.
    if (api.scene.fog) {
      S.fogSaved = { near: api.scene.fog.near, far: api.scene.fog.far };
      api.scene.fog.near = 60;
      api.scene.fog.far = 420;
    }
    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('click', onDocClick);
  }

  function progOf(st, api, p) {
    if (p === api.player) return (st.state.progress || 0);
    if (st.state.botProg) return st.state.botProg[p.id] || 0;
    return 0;
  }

  function updateHud(dt, st, api) {
    var target = (st.state.target || 20);
    var marker = clamp(st.state.marker || 0, 0, 1);
    var pct = Math.round(marker * 1000) / 10;
    if (Math.abs(pct - S.lastMarkerPct) >= 0.5) {
      S.markerEl.style.left = pct + '%';
      S.lastMarkerPct = pct;
    }
    var onBeat = st.local
      ? (marker >= 0.42 && marker <= 0.58)
      : (marker <= 0.2 || marker >= 0.8);
    S.meterEl.classList.toggle('on', !!onBeat);

    var p = api.player;
    var txt;
    if (st.local) {
      var prog = st.state.progress || 0;
      var alive = api.allPersons().filter(function (x) { return x.alive; });
      var scored = alive.map(function (x) { return { p: x, s: progOf(st, api, x) }; })
        .sort(function (a, b) { return b.s - a.s; });
      var rank = 1;
      for (var i = 0; i < scored.length; i++) if (scored[i].p === p) { rank = i + 1; break; }
      txt = 'Đã nhảy ' + prog + '/' + target + ' nhịp · Hạng ' + rank + '/' + scored.length;
      if (st.state.lockout > 0) txt += ' · <span class="bad">VẤP! Chờ nhịp…</span>';
    } else {
      txt = 'Đã bấm ' + S.tapCount + ' nhịp · chờ server chấm điểm';
    }
    if (p && p.alive) {
      var d = Math.hypot(p.x || 0, (p.z || 0) - START_Z);
      if (d > 25) txt += ' · Cách vạch xuất phát ~' + Math.round(d) + 'm';
    }
    if (txt !== S.lastText) { S.textEl.innerHTML = txt; S.lastText = txt; }
  }

  function update(dt, st, api) {
    if (!S) return;
    dt = Math.min(0.05, dt || 0);
    S.t += dt;
    S.st = st; S.api = api;
    ensureSacks(api);
    var target = (st.state.target || 20);
    var p = api.player;

    // --- người chơi: điểm tăng -> nhảy; vấp -> nghiêng + bụi ---
    if (p && p.group) {
      var prog = st.state.progress || 0;
      if (prog > S.lastPlayerProg) triggerPlayerHop(api);
      S.lastPlayerProg = prog;
      var lock = st.state.lockout || 0;
      if (lock > 0 && S.lastLockout <= 0) {
        S.stumbleT = 1;
        spawnDust(p.group.position.x, p.group.position.z, 5);
      }
      S.lastLockout = lock;
      // Lắc lư sang hai bên khi đang nhảy trong bao; nghiêng hẳn khi vấp.
      var waddle = 0;
      if (p.y > 0.05) waddle = Math.sin(S.t * 22) * 0.07;
      var tilt = S.stumbleT > 0 ? 0.32 * S.stumbleT : 0;
      p.group.rotation.z += ((waddle + tilt) - p.group.rotation.z) * Math.min(1, dt * 10);
      if (S.stumbleT > 0) S.stumbleT = Math.max(0, S.stumbleT - dt * 1.4);
      // Chạm đất sau cú nhảy -> bụi.
      if (S.playerWasAir && p.y <= 0.02) {
        spawnDust(p.group.position.x, p.group.position.z, 3);
        S.playerWasAir = false;
      }
      if (p.y > 0.25) S.playerWasAir = true;
    }

    // --- bot / người chơi khác ---
    api.allPersons().forEach(function (person) {
      if (!person || person === p || !person.alive || !person.group) return;
      var a = S.anims[person.id] || (S.anims[person.id] = {});
      if (st.local && person.isBot) {
        // Chơi đơn: tiến độ bot có sẵn -> z chạy dọc đường đua, nhảy theo nhịp.
        var bp = (st.state.botProg && st.state.botProg[person.id]) || 0;
        var laneX = (a.laneX !== undefined) ? a.laneX : person.group.position.x;
        var z = clamp(START_Z - 1.5 - (bp / target) * TRACK_LEN, FINISH_Z, START_Z);
        person.group.position.x = laneX;
        person.group.position.z = z;
        person.group.rotation.y = Math.PI;
        var fl = Math.floor(bp);
        if (fl > (a.lastFloor || 0) && bp < target) { a.hopT = 0; a.side = -(a.side || 1); }
        a.lastFloor = fl;
        if (bp >= target) {
          // Về đích: đứng ở vạch đích, giơ tay ăn mừng.
          person.group.position.y = 0;
          person.group.rotation.z = 0;
          if (person.group.userData) {
            person.group.userData.armL.rotation.x = -2.6;
            person.group.userData.armR.rotation.x = -2.6;
          }
        } else if (a.hopT < 1) {
          a.hopT = Math.min(1, a.hopT + dt / HOP_DUR);
          var k = Math.sin(Math.PI * a.hopT);
          person.group.position.y = k * HOP_HEIGHT;
          person.group.rotation.z = k * 0.1 * (a.side || 1);
          person.group.rotation.x = -k * 0.1;
          if (a.hopT >= 1) {
            person.group.position.y = 0;
            person.group.rotation.z = 0;
            person.group.rotation.x = 0;
            spawnDust(person.group.position.x, person.group.position.z, 2);
          }
        }
      } else {
        // Multiplayer: không có tiến độ từng người -> nhảy theo chuyển động thật.
        var dx = person.group.position.x - (a.px !== undefined ? a.px : person.group.position.x);
        var dz = person.group.position.z - (a.pz !== undefined ? a.pz : person.group.position.z);
        a.px = person.group.position.x; a.pz = person.group.position.z;
        var moved = Math.abs(dx) + Math.abs(dz);
        if (moved > 0.02) {
          a.ph = (a.ph || 0) + dt * 9;
          person.group.position.y = Math.abs(Math.sin(a.ph)) * 0.3;
          person.group.rotation.z = Math.sin(a.ph) * 0.06;
        } else {
          person.group.position.y += (0 - person.group.position.y) * Math.min(1, dt * 8);
          person.group.rotation.z += (0 - person.group.rotation.z) * Math.min(1, dt * 8);
        }
      }
    });

    // Cờ bay + bụi.
    S.flags.forEach(function (f, i) {
      f.rotation.y = Math.sin(S.t * 2.6 + i * 1.3) * 0.28;
    });
    updatePuffs(dt);
    updateHud(dt, st, api);
  }

  function teardown(st, api) {
    if (!S) return;
    window.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('click', onDocClick);
    var a = api || S.api;
    // Trả bot chơi đơn về vị trí logic cũ, hạ tay ăn mừng (nếu có).
    if (a && a.allPersons) {
      a.allPersons().forEach(function (person) {
        if (!person || !person.group) return;
        var an = S.anims[person.id];
        if (an && an.ox !== undefined) {
          person.group.position.set(an.ox, 0, an.oz);
          person.group.rotation.set(0, an.orot || Math.PI, 0);
        } else {
          person.group.rotation.x = 0;
          person.group.rotation.z = 0;
        }
        if (person.group.userData) {
          person.group.userData.armL.rotation.x = 0;
          person.group.userData.armR.rotation.x = 0;
        }
      });
    }
    // Cởi bao khỏi mọi người.
    S.sacks.slice().forEach(function (rec) { removeSack(rec); });
    // Gỡ đường đua + bụi.
    if (S.group) {
      if (a && a.scene) a.scene.remove(S.group);
      S.group.traverse(function (o) {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) {
            if (m.map) m.map.dispose();
            m.dispose();
          });
        }
      });
    }
    S.textures.forEach(function (tx) { tx.dispose(); });
    if (S.fogSaved && a && a.scene && a.scene.fog) {
      a.scene.fog.near = S.fogSaved.near;
      a.scene.fog.far = S.fogSaved.far;
    }
    if (S.stripEl && S.stripEl.parentNode) S.stripEl.parentNode.removeChild(S.stripEl);
    if (S.styleEl && S.styleEl.parentNode) S.styleEl.parentNode.removeChild(S.styleEl);
    // Người chơi: trả lại tư thế đứng thẳng (y/vy để game.js tự xử lý).
    if (a && a.player && a.player.group) {
      a.player.group.rotation.x = 0;
      a.player.group.rotation.z = 0;
    }
    S = null;
  }

  window.RoundSims = window.RoundSims || {};
  window.RoundSims['nhay-bao-bo'] = { build: build, update: update, teardown: teardown };
})();
