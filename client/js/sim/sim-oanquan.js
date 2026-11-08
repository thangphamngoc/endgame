/* Ô Ăn Quan — mô phỏng 3D (vòng dự phòng) — client.
 * Chỉ hiển thị: đọc st.state.board / turn / scores / turnsTaken / over và
 * gửi nước đi {type:'oanquan', pit} (qua nút ô của rounds.js khi có thể,
 * để luật rải/ăn và lượt bot ở chơi đơn chạy đúng code gốc). Không tự tính
 * điểm, không tự rải lại bàn cờ — mọi thay đổi bàn cờ đều lấy từ state.
 * Bàn gỗ dài đặt trong sân làng trước mặt người chơi: 12 ô (ô 0 và ô 6 là
 * ô quan to ở hai đầu), quân là khối voxel, số quân hiện bằng nhãn HTML
 * chiếu theo api.project. Bấm ô 3D (chọn theo vị trí trên màn hình qua
 * api.project — cầu nối không lộ camera nên không raycast được) để đi.
 * Voxel thuần: BoxGeometry + MeshLambertMaterial, không tài sản ngoài.
 * Chạy sau game.js/rounds.js; coordinator gọi RoundSims['o-an-quan'].
 *
 * GHI CHÚ CHO COORDINATOR (kiểm tra khi nối dây):
 * 1. Hàng đối thủ trong 3D đọc ngược với hàng trên của overlay: để đường
 *    rải (idx+1)%12 đi thành một vòng khép kín quanh bàn, ô 7 ở phía xa-bên
 *    phải và ô 11 ở phía xa-bên trái (xem PIT_POS). Overlay vẫn giữ thứ tự
 *    6..11 từ trái sang phải — đó chỉ là sơ đồ, không phải vị trí thật.
 * 2. LUẬT Ô CỦA MÌNH (ĐÃ QUYẾT, cycle 3, 2026-11-06): chỉ được bấm ô dân
 *    bên mình — bên 0: ô 1-5, bên 1: ô 7-11; ô quan 0/6 không ai được rải.
 *    Server chặn nước sai, overlay khóa nút; sim cũng kiểm tra trước khi
 *    chuyển tiếp (KHÔNG gửi thẳng WS khi ô không phải của mình — đường
 *    fallback cũ sẽ vòng qua luật của overlay). Viền vàng = hàng của bạn
 *    theo đúng bên của bạn (mySide từ oanquanState, mặc định 0 ở chơi đơn).
 * 3. Click 3D chuyển tiếp bằng .click() lên nút .oq-pit[data-pit] của
 *    #round-overlay để tái dùng đúng handler của rounds.js (chơi đơn: rải
 *    tại chỗ + bot đi sau 700ms; nhiều người: gửi WS). Nếu nút không có
 *    hoặc bị disabled thì gửi thẳng api.sendWS({type:'oanquan', pit}) —
 *    CHỈ khi ô đó là ô bên mình (handlePitClick kiểm tra trước).
 * 4. Ở nhiều người, server không gửi turnsTaken nên strip ẩn "lượt đã đi".
 * 5. Hàng của bạn trong 3D: viền vàng + thẻ "HÀNG CỦA BẠN" đi theo bên của
 *    bạn (mySide), không cố định ở ô 0-5 — người chơi bên 1 thấy hàng mình
 *    (ô 7-11) ở phía xa, thẻ và viền đổi theo.
 */
(function () {
  'use strict';

  var DEFAULT_BOARD = [10, 5, 5, 5, 5, 5, 10, 5, 5, 5, 5, 5];
  // Vị trí ô trên mặt bàn (gốc = tâm bàn, +x sang phải, +z về phía người
  // chơi/camera). Hàng gần (ô 1–5) là hàng của bạn; hàng xa (ô 7–11) đọc
  // ngược chiều để đường rải 0→1→…→5→6→7→…→11→0 thành một vòng khép kín.
  var PIT_POS = [
    { x: -4.9, z: 0, quan: true },    // 0 — QUAN (đầu trái)
    { x: -3.3, z: 0.95 },             // 1
    { x: -1.65, z: 0.95 },            // 2
    { x: 0, z: 0.95 },                // 3
    { x: 1.65, z: 0.95 },             // 4
    { x: 3.3, z: 0.95 },              // 5
    { x: 4.9, z: 0, quan: true },     // 6 — QUAN (đầu phải)
    { x: 3.3, z: -0.95 },             // 7
    { x: 1.65, z: -0.95 },            // 8
    { x: 0, z: -0.95 },               // 9
    { x: -1.65, z: -0.95 },           // 10
    { x: -3.3, z: -0.95 }             // 11
  ];
  var STONE_COLORS = [0xf9a825, 0xc62828, 0x0f766e, 0xfff3d6, 0x8d5a2b];
  var MAX_SHOW = 16;   // số quân vẽ tối đa mỗi ô dân (vượt thì nhãn vẫn đếm đủ)
  var MAX_SHOW_QUAN = 12;
  var PICK_RADIUS_PX = 42; // bấm trong vòng này (px màn hình) tính từ tâm ô
  var SOW_SEG = 0.13;      // thời gian mỗi nhịp nhảy của một quân đang rải
  var SOW_STAGGER = 0.08;  // quân sau xuất phát trễ hơn quân trước
  var CAP_STAGGER = 0.06;

  var S = null; // phiên làm việc đang chạy (build -> update -> teardown)

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function boardOf(st) {
    var b = st && st.state && st.state.board;
    return (b && b.length === 12) ? b : DEFAULT_BOARD;
  }
  function scoresOf(st) {
    var s = st && st.state && st.state.scores;
    return { me: (s && +s.me) || 0, bot: (s && +s.bot) || 0 };
  }
  // Bên của bạn: server gửi qua oanquanState -> rounds.js ghi st.state.mySide
  // (mặc định 0 ở chơi đơn). Ô dân bên mình: bên 0 = 1-5, bên 1 = 7-11.
  function mySideOf(st) {
    var s = st && st.state && st.state.mySide;
    return (s === 1) ? 1 : 0;
  }
  function isMyPit(st, pit) {
    if (mySideOf(st) === 0) return pit >= 1 && pit <= 5;
    return pit >= 7 && pit <= 11;
  }
  function arraysEqual(a, b) {
    if (!a || !b || a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }
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
  // Bảng hiệu chữ Việt trên hộp mỏng — cùng cách làm signBoard() của game.js.
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
    return new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.16), [side, side, side, side, face, side]);
  }

  // ---- HUD strip + nhãn số quân (div riêng, không chạm #round-overlay) ----
  var CSS =
    '.sim-oanquan-strip{position:fixed;top:166px;left:50%;transform:translateX(-50%);' +
    'width:min(560px,92vw);z-index:25;pointer-events:none;font-family:"Be Vietnam Pro",Arial,sans-serif;}' +
    // #32 (cycle 48): dải từng ở top 118px, đè lên dải gợi ý phím #roundHint
    // (top 122px, đáy ~160px) trong 12s đầu vòng. Dời xuống dưới gợi ý
    // (166px) + chừa cột minimap như #roundHint (tablet right:190px,
    // mobile top 236px (gợi ý mobile ở 162px, cao tối đa ~67px cho 3 dòng → đáy ~229px) + right:160px (chừa cả minimap lẫn cột econBar mobile, bắt đầu x=204px)).
    '@media (min-width:621px) and (max-width:900px){.sim-oanquan-strip{top:184px;left:6px;right:190px;transform:none;width:auto;max-width:none}}' +
    '@media (max-width:620px){.sim-oanquan-strip{top:236px;left:6px;right:160px;transform:none;width:auto;max-width:none}}' +
    '.sim-oanquan-line{margin-top:4px;text-align:center;font-weight:800;font-size:13px;color:#fffdf4;' +
    'background:rgba(31,41,55,.82);border:2px solid #ffedb8;border-radius:10px;padding:5px 10px;}' +
    // #32 (cycle 48): mobile dải 2 dòng, mỗi dòng xuống 2 dòng ở 194px rộng
    // nên dải cao ~128px, đáy chạm tới tấm overlay bottom-sheet (đỉnh ~346px
    // ở màn 640px). Thu chữ + đệm trên mobile cho dải gọn lại (~108px).
    '@media (max-width:620px){.sim-oanquan-line{font-size:12px;padding:3px 8px}}' +
    '.sim-oanquan-line:first-child{margin-top:0;}' +
    '.sim-oanquan-line b{color:#ffd34d;}' +
    '.sim-oanquan-line.sim-oanquan-myturn{color:#1f2937;background:#ffedb8;border-color:#1f2937;}' +
    '.sim-oanquan-line.sim-oanquan-myturn b{color:#b5451b;}' +
    '.sim-oanquan-labels{position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:7;' +
    'font-family:"Be Vietnam Pro",Arial,sans-serif;}' +
    '.sim-oanquan-label{position:absolute;transform:translate(-50%,-100%);white-space:nowrap;' +
    'background:rgba(30,18,10,.88);color:#fffdf4;border:2px solid #1f2937;border-radius:2px;' +
    'font-size:12px;font-weight:800;padding:1px 6px;}' +
    '.sim-oanquan-label.sim-oanquan-quan{color:#ffd34d;border-color:#b45309;background:rgba(122,45,22,.94);}' +
    '.sim-oanquan-label.sim-oanquan-pick{color:#1f2937;background:#ffedb8;border-color:#1f2937;}' +
    '.sim-oanquan-rowtag{position:absolute;transform:translate(-50%,-100%);white-space:nowrap;' +
    'font-size:11px;font-weight:900;padding:2px 8px;border:2px solid #1f2937;border-radius:2px;}' +
    '.sim-oanquan-rowtag.sim-oanquan-me{background:rgba(180,83,9,.94);color:#ffedb8;}' +
    '.sim-oanquan-rowtag.sim-oanquan-foe{background:rgba(15,118,110,.92);color:#fffdf4;}';

  function buildDom() {
    var style = document.createElement('style');
    style.id = 'sim-oanquan-style';
    style.textContent = CSS;
    document.head.appendChild(style);
    var strip = document.createElement('div');
    strip.className = 'sim-oanquan-strip';
    strip.innerHTML =
      '<div class="sim-oanquan-line sim-oanquan-score">Ô ĂN QUAN · Bạn <b>0</b> quân — Đối thủ <b>0</b> quân</div>' +
      '<div class="sim-oanquan-line sim-oanquan-turn">Đang chờ lượt…</div>';
    document.body.appendChild(strip);
    var labels = document.createElement('div');
    labels.className = 'sim-oanquan-labels';
    document.body.appendChild(labels);
    return {
      el: strip,
      score: strip.querySelector('.sim-oanquan-score'),
      turn: strip.querySelector('.sim-oanquan-turn'),
      labelsWrap: labels
    };
  }

  // Đồng bộ dải strip (điểm + lượt) với lượt thật — gọi ở 3 chỗ:
  // (a) cuối build() để strip bắt đầu đúng lượt thay vì chữ mặc định
  // "Đang chờ lượt…"; (b) mỗi khung update() như trước; (c) qua
  // RoundSims sync() mà oqRender() (rounds.js) gọi mỗi lần lượt/điểm đổi
  // — vì strip chỉ cập nhật theo khung animate, mà animate không chạy
  // khi WebGL lỗi (startApp không gọi animate khi buildWorld false, #24)
  // nên strip kẹt ở chữ mặc định trong khi overlay đã ghi "Tới lượt bạn"
  // (ảnh 06-round4-sim.png, backlog #26, cycle 44).
  function syncStrip(s) {
    if (!s || !s.strip) return;
    var state = (s.st && s.st.state) || {};
    var scores = scoresOf(s.st);
    var turn = state.turn || null, over = !!state.over;
    var turns = state.turnsTaken;
    var turnsText = '';
    if (s.st && s.st.local && turns) {
      turnsText = ' · Lượt đã đi: bạn ' + ((+turns.me) || 0) + '/3 — đối thủ ' + ((+turns.bot) || 0) + '/3';
    }
    var turnText;
    if (over) {
      turnText = 'Hết ván: bạn ' + scores.me + ' — đối thủ ' + scores.bot + '. ' +
        (scores.me > scores.bot ? 'Bạn thắng!' : scores.me < scores.bot ? 'Bạn thua.' : 'Hòa!');
    } else if (turn === 'me') {
      turnText = 'Tới lượt bạn — bấm một ô bên mình còn quân.' + turnsText;
    } else {
      turnText = 'Đối thủ đang đi…' + turnsText;
    }
    var key = scores.me + '|' + scores.bot + '|' + turnText + '|' + over;
    if (key === s.lastStripKey) return;
    s.lastStripKey = key;
    s.strip.score.innerHTML = 'Ô ĂN QUAN · Bạn <b>' + scores.me + '</b> quân — Đối thủ <b>' + scores.bot + '</b> quân';
    s.strip.turn.textContent = turnText;
    s.strip.turn.classList.toggle('sim-oanquan-myturn', turn === 'me' && !over);
  }

  // ================= build =================
  function build(st, api) {
    if (S) teardown(S.st, S.api);
    var s = S = {
      st: st, api: api, root: null, pits: [], labels: [], rowTags: [],
      strip: null, canvas: null, time: 0,
      prevBoard: boardOf(st).slice(), displayBoard: boardOf(st).slice(),
      prevScores: scoresOf(st), prevTurn: st && st.state ? st.state.turn : null,
      prevOver: !!(st && st.state && st.state.over),
      flying: [], flashes: [], animating: false, synced: false,
      hoverPit: -1, pointer: null, downPos: null, downAt: 0,
      lastStripKey: '', lastLabelKey: '', lastSide: -1,
      stoneGeo: null, stoneGeoQuan: null, stoneMats: [],
      onDown: null, onUp: null, onMove: null
    };
    s.strip = buildDom();
    syncStrip(s); // #26: strip hiện lượt thật ngay từ lúc dựng, không chờ khung animate

    // Nhãn số quân + thẻ hàng (tạo trước, đặt vị trí mỗi frame trong update).
    var i;
    for (i = 0; i < 12; i++) {
      var lb = document.createElement('div');
      lb.className = 'sim-oanquan-label' + (PIT_POS[i].quan ? ' sim-oanquan-quan' : '');
      lb.style.display = 'none';
      s.strip.labelsWrap.appendChild(lb);
      s.labels.push(lb);
    }
    var tagMe = document.createElement('div');
    tagMe.className = 'sim-oanquan-rowtag sim-oanquan-me';
    tagMe.textContent = '◀ HÀNG CỦA BẠN';
    tagMe.style.display = 'none';
    s.strip.labelsWrap.appendChild(tagMe);
    var tagFoe = document.createElement('div');
    tagFoe.className = 'sim-oanquan-rowtag sim-oanquan-foe';
    tagFoe.textContent = 'ĐỐI THỦ ▶';
    tagFoe.style.display = 'none';
    s.strip.labelsWrap.appendChild(tagFoe);
    s.rowTags = [tagMe, tagFoe];

    if (!window.THREE || !api || !api.scene) return; // chỉ còn strip + nhãn

    // Bàn đặt trong sân làng, ngay trước mặt người chơi (hướng -z là hướng
    // về đình; camera mặc định đứng sau lưng người chơi nhìn theo hướng đó).
    var px = 0, pz = -6;
    if (api.player) { px = api.player.x || 0; pz = api.player.z || 0; }
    var cx = clamp(px, -14, 14), cz = clamp(pz - 6, -46, 30);

    s.root = new THREE.Group();
    s.root.position.set(cx, 0, cz);
    api.scene.add(s.root);

    var wood = lam(0x8a5a2b), woodDark = lam(0x6d4c41), matStraw = lam(0xc9a86a),
      matBorder = lam(0x8a6b35), pitDark = lam(0x2b1a10);
    // Chiếu cói + viền dưới bàn, chân bàn thấp, mặt bàn gỗ dài.
    bx(13.4, 0.05, 5.4, matBorder, 0, 0.025, 0, s.root);
    bx(13.0, 0.08, 5.0, matStraw, 0, 0.06, 0, s.root);
    [[-5.2, -1.3], [5.2, -1.3], [-5.2, 1.3], [5.2, 1.3]].forEach(function (p) {
      bx(0.5, 0.3, 0.5, woodDark, p[0], 0.15, p[1], s.root);
    });
    bx(11.6, 0.55, 3.6, wood, 0, 0.575, 0, s.root);
    // Viền vàng quanh mặt bàn.
    bx(11.7, 0.08, 0.18, lam(0xd4a017), 0, 0.86, 1.82, s.root);
    bx(11.7, 0.08, 0.18, lam(0xd4a017), 0, 0.86, -1.82, s.root);
    bx(0.18, 0.08, 3.7, lam(0xd4a017), -5.82, 0.86, 0, s.root);
    bx(0.18, 0.08, 3.7, lam(0xd4a017), 5.82, 0.86, 0, s.root);

    // Quân dùng chung hình/màu cho cả bàn (teardown dọn theo traverse).
    s.stoneGeo = new THREE.BoxGeometry(0.34, 0.34, 0.34);
    s.stoneGeoQuan = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    for (i = 0; i < STONE_COLORS.length; i++) s.stoneMats.push(lam(STONE_COLORS[i]));

    // 12 ô: nền lõm tối + viền (mặc định ô 0–5 viền vàng, ô 6–11 viền teal;
    // update() tô lại theo bên của bạn — ô bên mình vàng, ô đối thủ teal;
    // ô quan to hơn, viền dày hơn).
    for (i = 0; i < 12; i++) {
      var pos = PIT_POS[i], quan = !!pos.quan;
      var half = quan ? 1.15 : 0.85, wallH = quan ? 0.26 : 0.24, wallY = 0.97;
      var rimColor = i < 6 ? 0xd97706 : 0x0f766e;
      var rimMat = lam(rimColor, { emissive: rimColor, emissiveIntensity: 0.08 });
      var floor = bx(half * 2, 0.06, half * 2, pitDark, pos.x, 0.86, pos.z, s.root);
      floor.receiveShadow = false;
      var t = quan ? 0.18 : 0.16;
      bx(half * 2 + t, wallH, t, rimMat, pos.x, wallY, pos.z + half + t / 2, s.root);
      bx(half * 2 + t, wallH, t, rimMat, pos.x, wallY, pos.z - half - t / 2, s.root);
      bx(t, wallH, half * 2 + t, rimMat, pos.x - half - t / 2, wallY, pos.z, s.root);
      bx(t, wallH, half * 2 + t, rimMat, pos.x + half + t / 2, wallY, pos.z, s.root);
      var stoneGroup = new THREE.Group();
      s.root.add(stoneGroup);
      s.pits.push({
        index: i, quan: quan, x: pos.x, z: pos.z, rimMat: rimMat,
        world: new THREE.Vector3(cx + pos.x, 0, cz + pos.z),
        stoneGroup: stoneGroup
      });
    }
    // Biển tên ở mép xa của bàn, quay mặt về phía người chơi.
    var sign = textBoard('Ô ĂN QUAN', 4.6, 1.1, '#7a2d16', '#ffedb8');
    sign.position.set(0, 1.55, -2.9);
    s.root.add(sign);
    bx(0.22, 1.1, 0.22, woodDark, -1.9, 0.55, -2.9, s.root);
    bx(0.22, 1.1, 0.22, woodDark, 1.9, 0.55, -2.9, s.root);

    rebuildAllStones(s);

    // Bấm ô: chỉ nhận "bấm" thật (pointerup gần chỗ pointerdown), không
    // chặn kéo xoay camera; ô nào không trúng thì để game xử lý như thường
    // (bấm đảo xa để du lịch vẫn chạy).
    s.canvas = document.getElementById('scene');
    if (s.canvas) {
      s.onDown = function (ev) {
        s.downPos = { x: ev.clientX, y: ev.clientY };
        s.downAt = Date.now();
      };
      s.onUp = function (ev) {
        if (!s.downPos) return;
        var dx = ev.clientX - s.downPos.x, dy = ev.clientY - s.downPos.y;
        var moved = Math.sqrt(dx * dx + dy * dy);
        var held = Date.now() - s.downAt;
        s.downPos = null;
        if (moved > 8 || held > 600) return;
        var pit = pickPit(s, ev.clientX, ev.clientY);
        if (pit >= 0) handlePitClick(s, pit);
      };
      s.onMove = function (ev) {
        s.pointer = { x: ev.clientX, y: ev.clientY };
      };
      s.canvas.addEventListener('pointerdown', s.onDown);
      s.canvas.addEventListener('pointerup', s.onUp);
      s.canvas.addEventListener('pointermove', s.onMove);
    }
  }

  // ---- Quân trong ô ----
  function stoneLocalPos(i, k) {
    var quan = PIT_POS[i].quan;
    var cols = quan ? 3 : 4, sp = quan ? 0.5 : 0.32;
    var perLayer = cols * 2;
    var layer = Math.floor(k / perLayer);
    var within = k % perLayer;
    var row = Math.floor(within / cols), col = within % cols;
    return {
      x: PIT_POS[i].x + (col - (cols - 1) / 2) * sp,
      y: (quan ? 1.14 : 1.06) + layer * (quan ? 0.52 : 0.35),
      z: PIT_POS[i].z + (row - 0.5) * sp,
      rot: ((k * 0.7) % 0.6) - 0.3
    };
  }
  function rebuildPit(s, i) {
    var pit = s.pits[i];
    if (!pit) return;
    while (pit.stoneGroup.children.length) pit.stoneGroup.remove(pit.stoneGroup.children[0]);
    var n = Math.min(s.displayBoard[i] || 0, pit.quan ? MAX_SHOW_QUAN : MAX_SHOW);
    for (var k = 0; k < n; k++) {
      var p = stoneLocalPos(i, k);
      var m = new THREE.Mesh(pit.quan ? s.stoneGeoQuan : s.stoneGeo, s.stoneMats[k % s.stoneMats.length]);
      m.position.set(p.x, p.y, p.z);
      m.rotation.y = p.rot;
      pit.stoneGroup.add(m);
    }
  }
  function rebuildAllStones(s) {
    for (var i = 0; i < 12; i++) rebuildPit(s, i);
  }

  // ---- Chọn ô theo vị trí trên màn hình (cầu nối không lộ camera) ----
  function projectPit(s, i, y) {
    if (!s.api || !s.api.project) return null;
    var w = s.pits[i].world;
    return s.api.project(w.x, y, w.z);
  }
  function pickPit(s, clientX, clientY) {
    if (!s.api || !s.api.project || !s.pits.length) return -1;
    var best = -1, bestD = PICK_RADIUS_PX;
    for (var i = 0; i < 12; i++) {
      var pr = projectPit(s, i, 1.1);
      if (!pr || pr.behind) continue;
      var d = Math.hypot(pr.x - clientX, pr.y - clientY);
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  }
  function handlePitClick(s, pit) {
    var st = s.st, api = s.api;
    if (!st || !st.state || !api) return;
    if (api.player && !api.player.alive) return;
    if (st.state.over) { if (api.toast) api.toast('Ván đã hết.'); return; }
    if (st.state.turn !== 'me') { if (api.toast) api.toast('Chưa tới lượt bạn.'); return; }
    // Luật ô của mình: không chuyển tiếp ô đối thủ / ô quan đi đâu cả
    // (kể cả đường fallback gửi thẳng WS — server cũng chặn, nhưng sim
    // không được vòng qua overlay).
    if (!isMyPit(st, pit)) { if (api.toast) api.toast('Chỉ được bấm ô bên mình.'); return; }
    var board = boardOf(st);
    if (!board[pit]) { if (api.toast) api.toast('Ô trống, chọn ô khác.'); return; }
    // Chuyển tiếp qua nút ô của rounds.js để tái dùng đúng luật + lượt bot.
    var btn = document.querySelector('#round-overlay .oq-pit[data-pit="' + pit + '"]');
    if (btn && !btn.disabled) { btn.click(); return; }
    if (api.sendWS) api.sendWS({ type: 'oanquan', pit: pit });
  }

  // ---- Hoạt ảnh rải / ăn quân ----
  function spawnFlyStone(s, from, to, delay, segDur, size, colorIdx, onArrive) {
    var m = new THREE.Mesh(size === 'quan' ? s.stoneGeoQuan : s.stoneGeo,
      s.stoneMats[colorIdx % s.stoneMats.length]);
    m.position.copy(from);
    s.api.scene.add(m);
    s.flying.push({
      mesh: m, waypoints: [from, to], seg: 0, segT: -delay, segDur: segDur,
      onArrive: onArrive
    });
  }
  function spawnSowStone(s, waypoints, delay, colorIdx, dest, onArrive) {
    var m = new THREE.Mesh(s.stoneGeo, s.stoneMats[colorIdx % s.stoneMats.length]);
    m.position.copy(waypoints[0]);
    s.api.scene.add(m);
    s.flying.push({
      mesh: m, waypoints: waypoints, seg: 0, segT: -delay, segDur: SOW_SEG,
      onArrive: onArrive
    });
  }
  function pitTopWorld(s, i) {
    var w = s.pits[i].world;
    return new THREE.Vector3(w.x, PIT_POS[i].quan ? 1.2 : 1.1, w.z);
  }
  function syncDisplayToBoard(s) {
    var b = boardOf(s.st);
    s.displayBoard = b.slice();
    rebuildAllStones(s);
  }
  function cancelAnims(s) {
    s.flying.forEach(function (f) { if (f.mesh.parent) f.mesh.parent.remove(f.mesh); });
    s.flying = [];
    s.flashes.forEach(function (f) { if (f.mesh.parent) f.mesh.parent.remove(f.mesh); });
    s.flashes = [];
    s.animating = false;
  }
  function flashStore(s, side) {
    var pitIdx = side === 'me' ? 0 : 6;
    var w = s.pits[pitIdx].world;
    var m = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 0.1, 2.6),
      new THREE.MeshLambertMaterial({ color: 0xffd34d, emissive: 0xffb300, transparent: true, opacity: 0.85 })
    );
    m.position.set(w.x, 1.0, w.z);
    s.api.scene.add(m);
    s.flashes.push({ mesh: m, t: 0, dur: 0.7 });
  }
  function handleBoardChange(s, prev, next) {
    var st = s.st;
    // Lần đồng bộ đầu sau build: vẽ thẳng, không hoạt ảnh.
    if (!s.synced) {
      s.synced = true;
      s.displayBoard = next.slice();
      rebuildAllStones(s);
      return;
    }
    // Tìm ô đã rải: ô giảm nhiều nhất và về 0 (ô ăn — nếu có — cũng về 0).
    var source = -1, sourceDrop = 0;
    for (var i = 0; i < 12; i++) {
      var drop = prev[i] - next[i];
      if (drop > sourceDrop && next[i] === 0) { sourceDrop = drop; source = i; }
    }
    if (source < 0 || sourceDrop <= 0 || !s.pits.length) {
      s.displayBoard = next.slice();
      rebuildAllStones(s);
      return;
    }
    cancelAnims(s);
    s.animating = true;
    var n = prev[source];
    var path = [];
    for (var k = 0; k < n; k++) path.push((source + 1 + k) % 12);
    var landing = path[path.length - 1];
    // Quân bị ăn (nếu có): ô kế sau ô đáp về 0 trong khi trước đó còn quân.
    var cap = (landing + 1) % 12, captured = 0;
    if (cap !== source && cap !== 0 && cap !== 6 && next[cap] === 0 && prev[cap] > 0) {
      captured = prev[cap];
      for (var j = 0; j < path.length; j++) if (path[j] === cap) captured++;
    }
    var newScores = scoresOf(st);
    var mover = null;
    if (newScores.me > s.prevScores.me) mover = 'me';
    else if (newScores.bot > s.prevScores.bot) mover = 'bot';

    // Quân rời khỏi ô nguồn ngay khi bắt đầu rải.
    s.displayBoard[source] = 0;
    rebuildPit(s, source);
    var arrived = 0, total = n;
    var srcTop = pitTopWorld(s, source);
    for (var k2 = 0; k2 < n; k2++) {
      (function (kk) {
        var dest = path[kk];
        var wps = [srcTop.clone()];
        for (var q = 0; q <= kk; q++) wps.push(pitTopWorld(s, path[q]));
        spawnSowStone(s, wps, kk * SOW_STAGGER, kk, dest, function () {
          s.displayBoard[dest]++;
          rebuildPit(s, dest);
          arrived++;
          if (arrived >= total) finishSow();
        });
      })(k2);
    }
    function finishSow() {
      if (!captured || !mover) {
        s.animating = false;
        syncDisplayToBoard(s);
        return;
      }
      // Quân bị ăn bay từ ô bị ăn về ô quan của bên ăn + chớp vàng.
      s.displayBoard[cap] = 0;
      rebuildPit(s, cap);
      var storePit = mover === 'me' ? 0 : 6;
      var capTop = pitTopWorld(s, cap), storeTop = pitTopWorld(s, storePit);
      var m = Math.min(captured, 8), done = 0;
      flashStore(s, mover);
      if (s.api.toast) {
        s.api.toast(mover === 'me'
          ? 'Bạn ăn ' + captured + ' quân!'
          : 'Đối thủ ăn ' + captured + ' quân.');
      }
      for (var c = 0; c < m; c++) {
        spawnFlyStone(s, capTop.clone(), storeTop.clone(), c * CAP_STAGGER, 0.45, 'dan', c + 2, function () {
          done++;
          if (done >= m) { s.animating = false; syncDisplayToBoard(s); }
        });
      }
      if (m === 0) { s.animating = false; syncDisplayToBoard(s); }
    }
  }

  // ================= update =================
  function update(dt, st, api) {
    if (!S) return;
    var s = S;
    s.st = st || s.st; s.api = api || s.api;
    dt = Math.min(0.05, dt || 0.016);
    s.time += dt;
    var state = (s.st && s.st.state) || {};
    var board = boardOf(s.st), scores = scoresOf(s.st);
    var turn = state.turn || null, over = !!state.over;

    // Bàn cờ thay đổi -> hoạt ảnh rải / ăn (so theo giá trị, vì rounds.js
    // đổi tại chỗ cùng một mảng ở chơi đơn).
    if (!arraysEqual(board, s.prevBoard)) {
      handleBoardChange(s, s.prevBoard, board);
      s.prevBoard = board.slice();
    }
    // Điểm đổi mà không bắt được nước ăn (vd. đồng bộ lại từ server):
    // chỉ chớp vàng ở ô quan của bên vừa ghi điểm.
    if (s.pits.length && (scores.me !== s.prevScores.me || scores.bot !== s.prevScores.bot)) {
      if (!s.animating) {
        if (scores.me > s.prevScores.me) flashStore(s, 'me');
        else if (scores.bot > s.prevScores.bot) flashStore(s, 'bot');
      }
      s.prevScores = scores;
    }
    if (turn !== s.prevTurn || over !== s.prevOver) {
      s.prevTurn = turn; s.prevOver = over;
    }

    // Hoạt ảnh quân đang bay: nhảy từng chặng, vồng lên giữa chặng.
    for (var f = s.flying.length - 1; f >= 0; f--) {
      var fl = s.flying[f];
      fl.segT += dt;
      if (fl.segT < 0) continue;
      var wps = fl.waypoints;
      if (fl.seg >= wps.length - 1) {
        if (fl.mesh.parent) fl.mesh.parent.remove(fl.mesh);
        s.flying.splice(f, 1);
        if (fl.onArrive) fl.onArrive();
        continue;
      }
      var k = Math.min(1, fl.segT / fl.segDur);
      var a = wps[fl.seg], b = wps[fl.seg + 1];
      fl.mesh.position.set(
        lerp(a.x, b.x, k),
        lerp(a.y, b.y, k) + Math.sin(k * Math.PI) * 0.55,
        lerp(a.z, b.z, k)
      );
      fl.mesh.rotation.y += dt * 6;
      if (k >= 1) { fl.seg++; fl.segT = 0; }
    }
    // Chớp vàng ở ô quan: nở ra rồi mờ dần.
    for (var g = s.flashes.length - 1; g >= 0; g--) {
      var fh = s.flashes[g];
      fh.t += dt;
      var p = Math.min(1, fh.t / fh.dur);
      fh.mesh.scale.set(1 + p * 0.6, 1, 1 + p * 0.6);
      fh.mesh.material.opacity = 0.85 * (1 - p);
      if (p >= 1) {
        if (fh.mesh.parent) fh.mesh.parent.remove(fh.mesh);
        s.flashes.splice(g, 1);
      }
    }

    // Hover: ô nào đang trỏ tới thì sáng viền + con trỏ tay.
    var hover = -1;
    if (s.pointer && s.pits.length) {
      hover = pickPit(s, s.pointer.x, s.pointer.y);
      if (hover >= 0 && !(turn === 'me' && !over && board[hover] > 0 && isMyPit(s.st, hover))) hover = -1;
    }
    if (hover !== s.hoverPit) {
      s.hoverPit = hover;
      if (s.canvas) s.canvas.style.cursor = hover >= 0 ? 'pointer' : '';
    }
    // Viền ô: tới lượt bạn thì hàng của bạn nhấp nháy vàng, lượt đối thủ
    // thì mờ đi; ô đang trỏ tới luôn sáng nhất. Màu viền đi theo bên của
    // bạn (mySide): ô bên mình vàng, ô đối thủ teal.
    var myTurn = turn === 'me' && !over;
    var mySide = mySideOf(s.st);
    if (mySide !== s.lastSide) {
      s.lastSide = mySide;
      for (var ri = 0; ri < s.pits.length; ri++) {
        var col = isMyPit(s.st, ri) ? 0xd97706 : 0x0f766e;
        s.pits[ri].rimMat.color.setHex(col);
        s.pits[ri].rimMat.emissive.setHex(col);
      }
    }
    for (var i = 0; i < s.pits.length; i++) {
      var rim = s.pits[i].rimMat;
      var target = 0.05;
      if (i === s.hoverPit) target = 0.9;
      else if (myTurn && isMyPit(s.st, i)) target = 0.32 + 0.24 * Math.sin(s.time * 4.5);
      else if (myTurn) target = 0.08;
      rim.emissiveIntensity += (target - rim.emissiveIntensity) * Math.min(1, dt * 10);
    }

    // Nhãn số quân: bám theo ô qua api.project, đồng bộ với displayBoard
    // (đếm tăng dần theo từng quân đáp xuống trong lúc rải).
    if (s.api && s.api.project && s.pits.length) {
      var labelKey = s.displayBoard.join(',');
      for (var li = 0; li < 12; li++) {
        var lb = s.labels[li];
        var pr = projectPit(s, li, PIT_POS[li].quan ? 2.7 : 2.35);
        if (!pr || pr.behind) { lb.style.display = 'none'; continue; }
        lb.style.display = 'block';
        lb.style.left = pr.x + 'px';
        lb.style.top = pr.y + 'px';
        if (labelKey !== s.lastLabelKey) {
          lb.textContent = PIT_POS[li].quan
            ? 'QUAN · ' + (s.displayBoard[li] || 0)
            : String(s.displayBoard[li] || 0);
        }
        lb.classList.toggle('sim-oanquan-pick', li === s.hoverPit);
      }
      s.lastLabelKey = labelKey;
      // Thẻ tên hàng: gần mép bàn, phía người chơi / phía đối thủ.
      // Hàng của bạn ở mép gần khi bên 0, ở mép xa khi bên 1.
      var tagY = 1.7;
      var pm = s.api.project(s.root.position.x, tagY, s.root.position.z + 2.1);
      var pf = s.api.project(s.root.position.x, tagY, s.root.position.z - 2.1);
      var meNear = mySideOf(s.st) === 0;
      placeTag(s.rowTags[0], meNear ? pm : pf);
      placeTag(s.rowTags[1], meNear ? pf : pm);
    }
    function placeTag(el, pr) {
      if (!pr || pr.behind) { el.style.display = 'none'; return; }
      el.style.display = 'block';
      el.style.left = pr.x + 'px';
      el.style.top = pr.y + 'px';
    }

    // HUD strip (tối đa 2 dòng): điểm, lượt, lượt đã đi (chỉ chơi đơn).
    // Đồng bộ qua syncStrip() — cùng hàm oqRender gọi trực tiếp mỗi lần
    // lượt đổi (#26), nên strip đúng cả khi vòng lặp animate chết (#24).
    syncStrip(s);
  }

  // ================= teardown =================
  function teardown(st, api) {
    if (!S) return;
    var s = S; S = null;
    try {
      if (s.canvas) {
        if (s.onDown) s.canvas.removeEventListener('pointerdown', s.onDown);
        if (s.onUp) s.canvas.removeEventListener('pointerup', s.onUp);
        if (s.onMove) s.canvas.removeEventListener('pointermove', s.onMove);
        s.canvas.style.cursor = '';
      }
    } catch (e) { /* dọn dẹp không được làm vỡ game */ }
    try {
      s.flying.forEach(function (f) { if (f.mesh.parent) f.mesh.parent.remove(f.mesh); });
      s.flashes.forEach(function (f) { if (f.mesh.parent) f.mesh.parent.remove(f.mesh); });
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
    } catch (e2) { /* bỏ qua */ }
    try {
      if (s.strip) {
        if (s.strip.el && s.strip.el.parentNode) s.strip.el.parentNode.removeChild(s.strip.el);
        if (s.strip.labelsWrap && s.strip.labelsWrap.parentNode) s.strip.labelsWrap.parentNode.removeChild(s.strip.labelsWrap);
      }
      var style = document.getElementById('sim-oanquan-style');
      if (style && style.parentNode) style.parentNode.removeChild(style);
    } catch (e3) { /* bỏ qua */ }
  }

  window.RoundSims = window.RoundSims || {};
  // sync(st): oqRender() gọi mỗi lần lượt/điểm đổi để dải strip hiện đúng
  // ngay, không chờ khung animate (#26 — animate chết khi WebGL lỗi, #24).
  window.RoundSims['o-an-quan'] = {
    build: build, update: update, teardown: teardown,
    sync: function (st) { if (S) { if (st) S.st = st; syncStrip(S); } }
  };
})();
