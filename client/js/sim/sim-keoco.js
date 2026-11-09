/* Kéo Co Nhịp — mô phỏng 3D (vòng 3) — client.
 * Chỉ hiển thị: đọc st.state (a/b/threshold/beatOn) và api.allPersons(),
 * không chạm điểm số, không gửi tin tug (rounds.js đã lo).
 * Không di chuyển hay xoay nhân vật (chỉ dùng vị trí thật của họ để đặt dây);
 * mọi mesh/DOM đều do module này tạo và dọn trong teardown().
 * Voxel thuần: BoxGeometry + MeshLambertMaterial, không tài sản ngoài.
 * Chạy sau game.js/rounds.js; coordinator gọi RoundSims['keo-co'].
 */
(function () {
  'use strict';

  var YARD = { xMin: -28, xMax: 28, zMin: 0, zMax: 20 };
  var CANON_A = { x: -9, z: 10 };   // neo mặc định Đội A trong sân làng
  var CANON_B = { x: 9, z: 10 };    // neo mặc định Đội B trong sân làng
  var ROPE_HALF = 14;               // nửa chiều dài dây (chưa co giãn)
  var ROPE_Y = 1.15;                // dây ngang tầm ngực người kéo
  var MAX_SLIDE = 4.5;              // dây trượt tối đa mỗi phía khi thắng thế
  var ROPE_SEGS = 12;
  var POOL_N = 64;                  // bụi + giấy mừng dùng chung một pool
  var COL = {
    paper: 0xfffdf4, edge: 0x1f2937, red: 0xc62828, redDark: 0xb5451b,
    teal: 0x0f766e, gold: 0xffedb8, goldDark: 0xd4a017,
    rope: 0xb98a44, ropeDark: 0x8a6b2f, wood: 0x6d4c41,
    groundA: 0xc62828, groundB: 0x0f766e, trench: 0x4a3728
  };

  var S = null; // phiên làm việc đang chạy (build -> update -> teardown)

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function lam(color, opts) {
    var o = { color: color };
    if (opts) for (var k in opts) o[k] = opts[k];
    return new THREE.MeshLambertMaterial(o);
  }
  function bx(w, h, d, material, x, y, z, parent) {
    var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    m.position.set(x || 0, y || 0, z || 0);
    m.castShadow = false; m.receiveShadow = false;
    (parent || S.root).add(m);
    return m;
  }
  // Bảng hiệu chữ Việt trên hộp mỏng (mặt trước là CanvasTexture, các mặt
  // còn lại là gỗ/vải trơn) — cùng cách làm signBoard() của game.js.
  function textBoard(text, w, h, bg, fg) {
    var cv = document.createElement('canvas');
    cv.width = 512; cv.height = Math.max(64, Math.round(512 * h / w));
    var cx = cv.getContext('2d');
    cx.fillStyle = bg; cx.fillRect(0, 0, cv.width, cv.height);
    cx.strokeStyle = fg; cx.lineWidth = 8; cx.strokeRect(10, 10, cv.width - 20, cv.height - 20);
    cx.fillStyle = fg; cx.textAlign = 'center'; cx.textBaseline = 'middle';
    cx.font = '900 ' + Math.round(cv.height * 0.52) + 'px "Be Vietnam Pro", Arial, sans-serif';
    cx.fillText(text, cv.width / 2, cv.height / 2 + 2);
    var tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    var side = lam(0x5d3a1a);
    var face = new THREE.MeshLambertMaterial({ map: tex });
    var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.16), [side, side, side, side, face, side]);
    return m;
  }

  // ---- Vị trí neo dây: trọng tâm thật của mỗi đội nếu họ đang đứng trong
  // sân làng và tách nhau đủ xa; ngược lại dùng neo mặc định trong sân.
  // Không bao giờ di chuyển nhân vật — chỉ đặt dây theo họ.
  function teamCentroid(members) {
    var n = 0, sx = 0, sz = 0, i, p;
    var list = [];
    for (i = 0; i < members.length; i++) {
      p = members[i];
      if (p && p.alive) { list.push(p); sx += p.x; sz += p.z; n++; }
    }
    if (!n) return null;
    var c = { x: sx / n, z: sz / n, n: n, spread: 0 };
    for (i = 0; i < list.length; i++) {
      c.spread = Math.max(c.spread, Math.hypot(list[i].x - c.x, list[i].z - c.z));
    }
    return c;
  }
  function computeAnchors(st, api) {
    var teamA = (st.state && st.state.teamA) || [];
    var teamB = (st.state && st.state.teamB) || [];
    if ((!teamA.length || !teamB.length) && api && api.allPersons) {
      // Dự phòng khi state chưa có teamA/teamB: chia xen kẽ như rounds.js.
      var alive = api.allPersons().filter(function (p) { return p.alive; });
      teamA = []; teamB = [];
      alive.forEach(function (p, i) { (i % 2 === 0 ? teamA : teamB).push(p); });
    }
    var ca = teamCentroid(teamA), cb = teamCentroid(teamB);
    if (ca && cb) {
      var inYard = function (c) {
        return c.x >= YARD.xMin && c.x <= YARD.xMax && c.z >= YARD.zMin && c.z <= YARD.zMax;
      };
      var dist = Math.hypot(cb.x - ca.x, cb.z - ca.z);
      if (inYard(ca) && inYard(cb) && dist >= 4) {
        return {
          a: { x: clamp(ca.x, YARD.xMin, YARD.xMax), z: clamp(ca.z, YARD.zMin, YARD.zMax) },
          b: { x: clamp(cb.x, YARD.xMin, YARD.xMax), z: clamp(cb.z, YARD.zMin, YARD.zMax) }
        };
      }
    }
    return { a: { x: CANON_A.x, z: CANON_A.z }, b: { x: CANON_B.x, z: CANON_B.z } };
  }

  // ---- HUD strip (div riêng, 2 dòng, không chạm #round-overlay) ----
  var CSS =
    '.sim-keoco-strip{position:fixed;top:166px;left:50%;transform:translateX(-50%);' +
    'width:min(560px,92vw);z-index:25;pointer-events:none;font-family:"Be Vietnam Pro",Arial,sans-serif;}' +
    // #32 (cycle 48): dải từng ở top 118px, đè lên dải gợi ý phím #roundHint
    // (top 122px, đáy ~160px) trong 12s đầu vòng — cùng họ lỗi với Bịt Mắt /
    // Rồng Rắn / Ô Ăn Quan. Dời xuống dưới gợi ý (166px; tablet 184px vì gợi ý xuống 2 dòng ở 621px, đáy ~177px) + chừa cột minimap
    // như #roundHint (tablet right:190px, mobile top 236px (gợi ý mobile đáy tối đa ~229px) + right:160px (chừa cả minimap lẫn cột econBar mobile, bắt đầu x=204px)).
    '@media (min-width:621px) and (max-width:900px){.sim-keoco-strip{top:184px;left:6px;right:190px;transform:none;width:auto;max-width:none}}' +
    '@media (max-width:620px){.sim-keoco-strip{top:236px;left:6px;right:160px;transform:none;width:auto;max-width:none}}' +
    '.sim-keoco-row{display:flex;align-items:center;gap:6px;background:rgba(31,41,55,.82);' +
    'border:2px solid #ffedb8;border-radius:10px;padding:6px 8px;}' +
    '.sim-keoco-team{font-weight:900;font-size:13px;color:#fffdf4;white-space:nowrap;}' +
    '.sim-keoco-team.sim-keoco-a{color:#ff8a80;}.sim-keoco-team.sim-keoco-b{color:#80cbc4;}' +
    '.sim-keoco-team b{color:#fffdf4;}' +
    '.sim-keoco-bar{flex:1;height:12px;background:#374151;border-radius:6px;overflow:hidden;}' +
    '.sim-keoco-fill-a,.sim-keoco-fill-b{height:100%;width:0%;transition:width .12s linear;}' +
    '.sim-keoco-fill-a{background:#c62828;}.sim-keoco-fill-b{background:#0f766e;}' +
    '.sim-keoco-track{position:relative;flex:0 0 64px;height:12px;background:#4b5563;border-radius:6px;}' +
    '.sim-keoco-marker{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);' +
    'color:#ffedb8;font-size:15px;line-height:1;text-shadow:0 0 4px #000;}' +
    '.sim-keoco-beat{margin-top:4px;text-align:center;font-weight:900;font-size:15px;color:#e5e7eb;' +
    'background:rgba(31,41,55,.72);border-radius:8px;padding:3px 8px;}' +
    '.sim-keoco-beat.on{color:#1f2937;background:#ffedb8;animation:sim-keoco-pulse .18s ease-in-out infinite alternate;}' +
    '@keyframes sim-keoco-pulse{from{transform:scale(1);}to{transform:scale(1.04);}}';

  function buildStrip() {
    var style = document.createElement('style');
    style.id = 'sim-keoco-style';
    style.textContent = CSS;
    document.head.appendChild(style);
    var d = document.createElement('div');
    d.className = 'sim-keoco-strip';
    d.innerHTML =
      '<div class="sim-keoco-row">' +
      '<span class="sim-keoco-team sim-keoco-a">ĐỘI A <b class="sim-keoco-num-a">0</b></span>' +
      '<div class="sim-keoco-bar"><div class="sim-keoco-fill-a"></div></div>' +
      '<div class="sim-keoco-track"><div class="sim-keoco-marker">◆</div></div>' +
      '<div class="sim-keoco-bar"><div class="sim-keoco-fill-b"></div></div>' +
      '<span class="sim-keoco-team sim-keoco-b">ĐỘI B <b class="sim-keoco-num-b">0</b></span>' +
      '</div>' +
      '<div class="sim-keoco-beat">Chờ nhịp…</div>';
    document.body.appendChild(d);
    return {
      el: d,
      fillA: d.querySelector('.sim-keoco-fill-a'),
      fillB: d.querySelector('.sim-keoco-fill-b'),
      numA: d.querySelector('.sim-keoco-num-a'),
      numB: d.querySelector('.sim-keoco-num-b'),
      marker: d.querySelector('.sim-keoco-marker'),
      beat: d.querySelector('.sim-keoco-beat')
    };
  }

  // ---- Hạt bụi / giấy mừng (pool hộp nhỏ tái dùng) ----
  function makePool(parent) {
    var pool = [];
    for (var i = 0; i < POOL_N; i++) {
      var m = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.28, 0.28),
        new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0 })
      );
      m.visible = false;
      parent.add(m);
      pool.push({ mesh: m, life: 0, maxLife: 1, vx: 0, vy: 0, vz: 0, grav: 0, base: 1 });
    }
    return pool;
  }
  function spawnParticle(pool, x, y, z, color, life, vx, vy, vz, grav, size) {
    for (var i = 0; i < pool.length; i++) {
      var p = pool[i];
      if (p.life > 0) continue;
      p.life = life; p.maxLife = life;
      p.vx = vx; p.vy = vy; p.vz = vz; p.grav = grav; p.base = size || 1;
      p.mesh.visible = true;
      p.mesh.position.set(x, y, z);
      p.mesh.material.color.setHex(color);
      p.mesh.material.opacity = 1;
      p.mesh.scale.setScalar(p.base);
      return;
    }
  }
  function spawnDust(pool, anchor, color, n) {
    for (var i = 0; i < n; i++) {
      spawnParticle(pool,
        anchor.x + (Math.random() - 0.5) * 5,
        0.25 + Math.random() * 0.3,
        anchor.z + (Math.random() - 0.5) * 3,
        color, 0.5 + Math.random() * 0.35,
        (Math.random() - 0.5) * 1.2, 1.1 + Math.random() * 1.2, (Math.random() - 0.5) * 1.2,
        -0.6, 0.7 + Math.random() * 0.6);
    }
  }
  function spawnCheer(pool, anchor) {
    var cols = [0xffedb8, 0xd4a017, 0xc62828, 0x0f766e, 0xfffdf4];
    for (var i = 0; i < 46; i++) {
      var a = Math.random() * Math.PI * 2, r = Math.random() * 4;
      spawnParticle(pool,
        anchor.x + Math.cos(a) * r, 1.5 + Math.random() * 2.5, anchor.z + Math.sin(a) * r,
        cols[i % cols.length], 1.0 + Math.random() * 0.5,
        (Math.random() - 0.5) * 3, 3.5 + Math.random() * 3.5, (Math.random() - 0.5) * 3,
        6, 0.8 + Math.random() * 0.9);
    }
  }
  function updatePool(pool, dt) {
    for (var i = 0; i < pool.length; i++) {
      var p = pool[i];
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) { p.mesh.visible = false; p.mesh.material.opacity = 0; continue; }
      p.vy -= p.grav * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      if (p.mesh.position.y < 0.15) { p.mesh.position.y = 0.15; p.vy = 0; }
      var k = p.life / p.maxLife;
      p.mesh.material.opacity = k;
      p.mesh.scale.setScalar(Math.max(0.05, p.base * (0.4 + 0.6 * k)));
      p.mesh.rotation.x += dt * 3; p.mesh.rotation.y += dt * 2;
    }
  }

  // ================= build =================
  function build(st, api) {
    teardown(st, api);
    var THREE_OK = typeof window.THREE !== 'undefined' && api && api.scene;
    var s = {
      api: api, root: null, pool: [], strip: null,
      slide: 0, midX: 0, midZ: 10, anchorA: { x: CANON_A.x, z: CANON_A.z },
      anchorB: { x: CANON_B.x, z: CANON_B.z },
      prevA: 0, prevB: 0, prevBeat: false, won: null,
      lastBeatText: '', lastNumA: '', lastNumB: '',
      ropeGroup: null, knot: null, drum: null, drumMat: null,
      stickL: null, stickR: null,
      bannerA: null, bannerB: null, zoneA: null, zoneB: null,
      trench: null, groundMark: null, anchorT: 0
    };
    S = s;
    var state = (st && st.state) || {};
    s.prevA = +state.a || 0;
    s.prevB = +state.b || 0;
    s.strip = buildStrip();

    if (!THREE_OK) return; // vẫn có HUD strip; 3D cần THREE + scene của game
    var root = new THREE.Group();
    s.root = root;
    api.scene.add(root);

    var anchors = computeAnchors(st, api);
    s.anchorA = anchors.a; s.anchorB = anchors.b;
    s.midX = (anchors.a.x + anchors.b.x) / 2;
    s.midZ = (anchors.a.z + anchors.b.z) / 2;

    // --- Vùng đứng + vạch giữa sân ---
    s.zoneA = bx(12, 0.08, 6, lam(COL.groundA, { transparent: true, opacity: 0.28 }), 0, 0.04, 0, root);
    s.zoneB = bx(12, 0.08, 6, lam(COL.groundB, { transparent: true, opacity: 0.28 }), 0, 0.04, 0, root);
    // Rãnh vạch giữa (vuông góc với dây, chạy dọc z) + mốc vàng trên mặt đất.
    s.trench = new THREE.Group(); root.add(s.trench);
    bx(0.9, 0.16, 8, lam(COL.trench), 0, 0.08, 0, s.trench);
    var i;
    for (i = 0; i < 5; i++) {
      bx(1.3, 0.2, 0.7, lam(i % 2 ? COL.paper : COL.red), 0, 0.1, -3.2 + i * 1.6, s.trench);
    }
    s.groundMark = bx(1.1, 0.22, 1.1, lam(COL.goldDark), 0, 0.11, 0, root);

    // --- Dây kéo: 12 đoạn hộp xen kẽ màu + nút vàng ở giữa + tay nắm 2 đầu ---
    var rope = new THREE.Group();
    s.ropeGroup = rope;
    root.add(rope);
    var segLen = (ROPE_HALF * 2) / ROPE_SEGS;
    for (i = 0; i < ROPE_SEGS; i++) {
      bx(segLen * 0.96, 0.34, 0.34, lam(i % 2 ? COL.rope : COL.ropeDark),
        -ROPE_HALF + segLen * (i + 0.5), 0, 0, rope);
      // nút thắt nhỏ giữa các đoạn cho dây đọc rõ là dây thừng voxel
      bx(0.22, 0.5, 0.5, lam(COL.ropeDark), -ROPE_HALF + segLen * i, 0, 0, rope);
    }
    // Nút vàng ở giữa dây — mốc thắng/thua di chuyển theo dây.
    s.knot = bx(1.0, 1.0, 1.0, lam(COL.goldDark), 0, 0, 0, rope);
    bx(1.24, 0.3, 0.3, lam(COL.red), 0, 0, 0, rope);
    bx(0.3, 1.24, 0.3, lam(COL.red), 0, 0, 0, rope);
    // Tay nắm hai đầu dây.
    bx(0.5, 0.6, 0.6, lam(COL.wood), -ROPE_HALF - 0.2, 0, 0, rope);
    bx(0.5, 0.6, 0.6, lam(COL.wood), ROPE_HALF + 0.2, 0, 0, rope);

    // --- Bảng tên hai đội ở hai đầu dây ---
    s.bannerA = textBoard('ĐỘI A', 3.6, 0.95, '#c62828', '#fffdf4');
    s.bannerB = textBoard('ĐỘI B', 3.6, 0.95, '#0f766e', '#fffdf4');
    root.add(s.bannerA); root.add(s.bannerB);

    // --- Trống nhịp lớn phía nam sân (z lớn hơn), mặt trống hướng về sân ---
    var drum = new THREE.Group();
    s.drum = drum;
    root.add(drum);
    s.drumMat = lam(COL.redDark, { emissive: 0x000000 });
    bx(2.6, 2.2, 2.6, s.drumMat, 0, 1.1, 0, drum);
    bx(2.9, 0.28, 2.9, lam(COL.goldDark), 0, 2.3, 0, drum);
    bx(2.9, 0.28, 2.9, lam(COL.goldDark), 0, 0.14, 0, drum);
    bx(2.0, 0.18, 2.0, lam(COL.paper), 0, 2.48, 0, drum); // mặt trống
    bx(0.5, 0.5, 0.5, lam(COL.red), 0, 1.1, 1.32, drum); // núm giữa mặt trống
    // Chân trống + dùi trống gác chéo trên mặt.
    bx(0.3, 1.0, 0.3, lam(COL.wood), -1.0, 0.5, -1.0, drum);
    bx(0.3, 1.0, 0.3, lam(COL.wood), 1.0, 0.5, -1.0, drum);
    bx(0.3, 1.0, 0.3, lam(COL.wood), -1.0, 0.5, 1.0, drum);
    bx(0.3, 1.0, 0.3, lam(COL.wood), 1.0, 0.5, 1.0, drum);
    s.stickL = bx(0.22, 1.6, 0.22, lam(COL.wood), -0.5, 3.0, 0.4, drum);
    s.stickR = bx(0.22, 1.6, 0.22, lam(COL.wood), 0.5, 3.0, 0.4, drum);
    s.stickL.rotation.z = 0.7; s.stickR.rotation.z = -0.7;
    var drumSign = textBoard('TRỐNG NHỊP', 4.4, 1.0, '#7a4a24', '#ffedb8');
    drumSign.position.set(0, 4.1, 0);
    drum.add(drumSign);

    s.pool = makePool(root);
    layout(s);
  }

  // Đặt lại vị trí các cụm theo neo hiện tại (gọi ở build + khi neo đổi).
  function layout(s) {
    var midX = s.midX, midZ = s.midZ;
    var ax = s.anchorA, bx2 = s.anchorB;
    if (s.zoneA) { s.zoneA.position.set(ax.x, 0.04, ax.z); }
    if (s.zoneB) { s.zoneB.position.set(bx2.x, 0.04, bx2.z); }
    if (s.trench) s.trench.position.set(midX, 0, midZ);
    if (s.groundMark) s.groundMark.position.set(midX, 0.11, midZ);
    if (s.ropeGroup) {
      s.ropeGroup.position.set(midX + s.slide, ROPE_Y, midZ);
      var dist = Math.hypot(bx2.x - ax.x, bx2.z - ax.z);
      s.ropeGroup.scale.x = clamp(dist / (ROPE_HALF * 2), 0.6, 1.1);
    }
    if (s.bannerA) s.bannerA.position.set(ax.x, 3.6, ax.z);
    if (s.bannerB) s.bannerB.position.set(bx2.x, 3.6, bx2.z);
    if (s.drum) s.drum.position.set(midX, 0, clamp(midZ + 6.5, YARD.zMin, YARD.zMax));
  }

  // ================= update =================
  function update(dt, st, api) {
    if (!S) return;
    var s = S;
    var state = (st && st.state) || {};
    var a = +state.a || 0, b = +state.b || 0;
    var threshold = +state.threshold || 20;
    var beatOn = !!state.beatOn;
    dt = Math.min(0.05, dt || 0.016);

    // Neo dây bám theo trọng tâm đội (mượt, 2 lần/giây tính lại).
    s.anchorT += dt;
    if (s.anchorT >= 0.5) {
      s.anchorT = 0;
      var anchors = computeAnchors(st, api);
      s.anchorA = anchors.a; s.anchorB = anchors.b;
    }
    var tMidX = (s.anchorA.x + s.anchorB.x) / 2;
    var tMidZ = (s.anchorA.z + s.anchorB.z) / 2;
    var k = Math.min(1, dt * 3);
    s.midX = lerp(s.midX, clamp(tMidX, -14, 14), k);
    s.midZ = lerp(s.midZ, clamp(tMidZ, 2, 18), k);

    // Dây trượt về phía đội đang thắng thế (mượt, không nhảy).
    var diff = a - b;
    var target = clamp(diff / threshold, -1, 1) * MAX_SLIDE;
    s.slide = lerp(s.slide, target, Math.min(1, dt * 6));

    // Bụi ở chân đội kéo mỗi khi sức kéo tăng.
    var dA = a - s.prevA, dB = b - s.prevB;
    if (dA > 0.01) spawnDust(s.pool, s.anchorA, 0xc9a06a, clamp(Math.round(dA * 2), 1, 4));
    if (dB > 0.01) spawnDust(s.pool, s.anchorB, 0xc9a06a, clamp(Math.round(dB * 2), 1, 4));
    s.prevA = a; s.prevB = b;
    // Thêm một nhúm bụi mỗi nhịp trống khi hai đội đang giằng co.
    if (beatOn && !s.prevBeat) {
      if (a > 0) spawnDust(s.pool, s.anchorA, 0xd8bd85, 1);
      if (b > 0) spawnDust(s.pool, s.anchorB, 0xd8bd85, 1);
    }
    s.prevBeat = beatOn;

    // Mừng thắng: ngưỡng vừa chạm thì nổ một đợt giấy mừng phía đội thắng.
    if (Math.abs(diff) >= threshold && !s.won) {
      s.won = diff > 0 ? 'a' : 'b';
      spawnCheer(s.pool, s.won === 'a' ? s.anchorA : s.anchorB);
    } else if (Math.abs(diff) < threshold * 0.5) {
      s.won = null;
    }

    // Trống nhịp: phồng to + sáng lên trong cửa sổ beatOn, dùi gõ xuống.
    if (s.drum && s.drumMat) {
      var pulse = beatOn ? 1.12 : 1;
      var sc = lerp(s.drum.scale.x, pulse, Math.min(1, dt * 14));
      s.drum.scale.set(sc, lerp(s.drum.scale.y, beatOn ? 1.06 : 1, Math.min(1, dt * 14)), sc);
      s.drumMat.emissive.setHex(beatOn ? 0x7a2d00 : 0x000000);
      if (s.stickL && s.stickR) {
        s.stickL.rotation.x = beatOn ? -0.9 : -0.25;
        s.stickR.rotation.x = beatOn ? -0.9 : -0.25;
      }
    }
    if (s.ropeGroup) {
      // Dây căng rung nhẹ theo nhịp trống.
      s.ropeGroup.position.y = ROPE_Y + (beatOn ? 0.06 : 0);
    }
    layout(s);
    updatePool(s.pool, dt);

    // ---- HUD strip ----
    var strip = s.strip;
    if (strip) {
      var max = Math.max(threshold, a, b);
      strip.fillA.style.width = (max > 0 ? Math.min(100, a / max * 100) : 0) + '%';
      strip.fillB.style.width = (max > 0 ? Math.min(100, b / max * 100) : 0) + '%';
      strip.marker.style.left = clamp(50 + diff / (threshold * 2) * 50, 2, 98) + '%';
      var nA = String(Math.round(a)), nB = String(Math.round(b));
      if (nA !== s.lastNumA) { strip.numA.textContent = nA; s.lastNumA = nA; }
      if (nB !== s.lastNumB) { strip.numB.textContent = nB; s.lastNumB = nB; }
      var beatText = beatOn ? '🥁 ĐÚNG NHỊP — KÉO!' : 'Chờ nhịp…';
      if (beatText !== s.lastBeatText) {
        strip.beat.textContent = beatText;
        strip.beat.classList.toggle('on', beatOn);
        s.lastBeatText = beatText;
      }
    }
  }

  // ================= teardown =================
  function teardown(st, api) {
    if (!S) return;
    var s = S; S = null;
    try {
      if (s.root && s.api && s.api.scene) s.api.scene.remove(s.root);
      if (s.root) {
        s.root.traverse(function (o) {
          if (o.geometry) o.geometry.dispose();
          var mats = o.material;
          if (mats) {
            (Array.isArray(mats) ? mats : [mats]).forEach(function (m) {
              if (m.map) m.map.dispose();
              m.dispose();
            });
          }
        });
      }
    } catch (e) { /* dọn dẹp không được làm vỡ game */ }
    try {
      if (s.strip && s.strip.el && s.strip.el.parentNode) s.strip.el.parentNode.removeChild(s.strip.el);
      var style = document.getElementById('sim-keoco-style');
      if (style && style.parentNode) style.parentNode.removeChild(style);
    } catch (e2) { /* bỏ qua */ }
  }

  window.RoundSims = window.RoundSims || {};
  window.RoundSims['keo-co'] = { build: build, update: update, teardown: teardown };
})();
