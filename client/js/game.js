/* Trống Hội & Cầu Khỉ — client.
 * Three.js qua CDN, không cần build step. Chế độ chơi đơn chạy hoàn toàn ở client,
 * chế độ multiplayer lấy nhịp trống/chiêng, loại, chia team, ván yếu, lượt cầu
 * và chat từ server qua WebSocket. Không dùng tài sản Squid Game hay Minecraft.
 */
(function () {
  'use strict';
  var START_Z = 35, FINISH_Z = -35;
  var TEAM_COLORS = ['#e53935', '#f9a825', '#43a047'];
  var TEAM_NAMES = ['Đỏ', 'Vàng', 'Xanh lá'];
  var VILLAGES = ['Hải Hậu', 'Hải Lý', 'Hải Tiến', 'Hải Châu', 'Hải Anh', 'Hải Quang', 'Hải Đông', 'Hải Tây'];

  // ---- Dữ liệu đảo du lịch: mỗi đảo một hình dáng, cây, thú và câu chuyện riêng.
  var TOUR_ISLANDS = [
    { id: 'hoi-lang', name: 'Đảo Hội Làng', label: 'Chuyện trong game', x: 0, z: 0, size: 34,
      story: 'Đảo chính của hội làng: sân đình, ao sen, hồ cá và lũy tre. Mỗi mùa hội, trống đánh từ sân đình vọng ra khắp vịnh, gọi người xa quê trở về.',
      shape: 'main', trees: 12, beach: true, pier: true },
    { id: 'trong-mai', name: 'Hòn Trống Mái', label: 'Truyền thuyết dân gian', x: -150, z: -140, size: 22,
      story: 'Truyền thuyết kể về chàng Ngư Phủ và nàng tiên vốn là cò trắng. Khi bị chia cắt, đôi chim hóa đá thành hai khối đá nghiêng vào nhau như đôi gà chọi, thành biểu tượng của tình thủy chung. Có nhiều dị bản khác nhau của tích này.',
      shape: 'leaningPair', trees: 4, beach: false, pier: false },
    { id: 'ti-top', name: 'Đảo Ti Tốp', label: 'Chuyện lịch sử thật', x: 160, z: -110, size: 26,
      story: 'Đảo vốn có tên cũ là Cát Nàng. Năm 1962, đảo được đặt tên theo nhà du hành vũ trụ Gherman Titov trong chuyến thăm vịnh cùng Hồ Chí Minh. Đảo có sườn dốc phủ cây và bãi cát trắng hình vầng trăng ở chân đảo.',
      shape: 'cone', trees: 10, beach: true, pier: true },
    { id: 'dinh-huong', name: 'Hòn Đỉnh Hương', label: 'Chuyện trong game', x: -190, z: 90, size: 18,
      story: 'Trong thế giới game, hòn đá này có dáng như chiếc lư hương đặt giữa biển. Ngư dân kể rằng mỗi sớm sương, khói hương tưởng tượng từ đỉnh đá bay theo gió, báo một ngày biển lặng.',
      shape: 'incense', trees: 3, beach: false, pier: false },
    { id: 'con-coc', name: 'Hòn Con Cóc', label: 'Chuyện trong game', x: 190, z: 110, size: 18,
      story: 'Trong thế giới game, khối đá phục sát mặt nước như một con cóc đang ngóng trời. Tích trong game gắn với chuyện cóc kiện trời xin mưa, nên đảo này luôn được vẽ kèm mây và chim bay quanh.',
      shape: 'toad', trees: 3, beach: false, pier: false },
    { id: 'soi-sim', name: 'Đảo Soi Sim', label: 'Chuyện trong game', x: -90, z: 190, size: 24,
      story: 'Trong thế giới game, hai đồi của đảo phủ đầy sim tím vào mùa hoa. Người trong game kể rằng ai hái được quả sim đầu mùa trên đồi cao sẽ gặp may cả năm đi biển.',
      shape: 'simHills', trees: 9, beach: true, pier: false },
    { id: 'dao-khi', name: 'Đảo Khỉ', label: 'Chuyện trong game', x: 110, z: 190, size: 24,
      story: 'Trong thế giới game, đây là đảo của bầy khỉ voxel: có con vẫy tay chào thuyền qua, có con ngồi gãi đầu trên mỏm đá, có con nhảy qua lại giữa hai mỏm đá. Đừng cho khỉ ăn đồ của du khách trong game.',
      shape: 'monkey', trees: 8, beach: true, pier: true },
  ];

  var scene, camera, renderer, raycaster, pointer;
  var player, playerGroup, bots = [], remotePlayers = {};
  var birds = [], butterflies = [], fishes = [], crabs = [], monkeys = [];
  var tourGroups = {}, detailedIsland = null;
  var mode = null, ws = null, myId = null, isHost = false, roomCode = null;
  var phase = 'menu'; // menu | countdown | round1 | team | round2 | finished | tourism
  var drumState = 'drum', drumTimer = 0, matchTime = 0, matchStartAt = 0;
  var aliveCount = 0, aliveBefore = 0;
  // ---- Luồng 6 vòng ----
  var ROUND_NAMES = { 1: 'Trống Hội', 2: 'Cầu Khỉ Sương Mù', 3: 'Kéo Co Nhịp', 4: 'Nặn Tò He', 5: 'Bịt Mắt Bắt Dê', 6: 'Rồng Rắn Cướp Cờ' };
  var ROUND_GAMES = { 1: 'trong-hoi', 2: 'cau-khi', 3: 'keo-co', 4: 'to-he', 5: 'bit-mat', 6: 'rong-ran' };
  var ROUND_TIME_LIMITS = { 'keo-co': 60, 'to-he': 60, 'bit-mat': 60, 'o-an-quan': 90, 'nhay-bao-bo': 60, 'rong-ran': 120 };
  var TOTAL_ROUNDS = 6;
  var currentRound = 0, roundTimeLimit = 0, roundEndsAt = 0, roundStartAlive = [];
  var lastInputSentAt = 0, jumpQueued = false, interstitialTimer = null;
  var keys = {}, typing = false, joy = { x: 0, y: 0, active: false };
  var camAngle = 0.6, camDist = 14, camHeight = 7, camTarget = new THREE.Vector3();
  var flyTo = null, focusedIsland = null, tourismMode = false;
  var spectatorView = 'follow', watchedId = null, spectatorList = [];
  var myTeam = null, myBridgeStep = 0, myBridge = null, teamQueue = [], teamLeader = null;
  var localBridges = {}, localRanking = [];
  var lastChatAt = 0, hideBubbles = false;
  var labelsEl = document.getElementById('labels');
  var tagEls = {};

  function $(id) { return document.getElementById(id); }
  function toast(msg) {
    var t = $('toast'); t.textContent = msg; t.style.display = 'block';
    clearTimeout(t._h); t._h = setTimeout(function () { t.style.display = 'none'; }, 3000);
  }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function randInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function fmtTime(sec) {
    sec = Math.max(0, Math.floor(sec));
    return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
  }
  function teamColorHex(team) { return team === null || team === undefined ? '#2196f3' : TEAM_COLORS[team]; }

  function box(w, h, d, color, x, y, z, parent) {
    var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
      new THREE.MeshLambertMaterial({ color: color }));
    m.position.set(x, y, z);
    (parent || scene).add(m);
    return m;
  }
  function makeTree(scale, parent, x, z) {
    var g = new THREE.Group();
    box(0.5 * scale, 2.2 * scale, 0.5 * scale, 0x6d4c41, 0, 1.1 * scale, 0, g);
    var greens = [0x2e7d32, 0x388e3c, 0x43a047];
    box(2.4 * scale, 1.2 * scale, 2.4 * scale, greens[randInt(0, 2)], 0, 2.8 * scale, 0, g);
    box(1.6 * scale, 1 * scale, 1.6 * scale, greens[randInt(0, 2)], 0.3 * scale, 3.6 * scale, 0, g);
    g.position.set(x, 0, z); parent.add(g); return g;
  }
  function makeBamboo(parent, x, z, n) {
    for (var i = 0; i < n; i++) {
      box(0.3, rand(3, 5), 0.3, 0x558b2f, x + rand(-1, 1), 2, z + rand(-1, 1), parent);
    }
  }
  function makeAvatar(shirtColor) {
    var g = new THREE.Group();
    box(1, 1.2, 0.6, shirtColor, 0, 1.6, 0, g); // thân áo
    box(0.7, 0.7, 0.7, 0xffcc99, 0, 2.55, 0, g); // đầu
    box(0.9, 0.25, 0.9, 0xd7a13b, 0, 3.0, 0, g); // nón lá (khối)
    box(0.35, 1, 0.35, 0x37474f, -0.3, 0.5, 0, g);
    box(0.35, 1, 0.35, 0x37474f, 0.3, 0.5, 0, g);
    return g;
  }
  function setTag(id, text, color, isBubble) {
    if (hideBubbles && isBubble) return;
    var el = tagEls[id];
    if (!el) {
      el = document.createElement('div');
      el.className = isBubble ? 'bubble' : 'name-tag';
      labelsEl.appendChild(el); tagEls[id] = el;
    }
    el.className = isBubble ? 'bubble' : 'name-tag';
    el.textContent = text;
    if (!isBubble && color) el.style.borderColor = color;
    el._until = isBubble ? Date.now() + 5000 : 0;
    el._isBubble = isBubble;
  }
  function clearTag(id) { if (tagEls[id]) { tagEls[id].remove(); delete tagEls[id]; } }

  // ---- Thế giới ----
  function buildWorld() {
    scene = new THREE.Scene();
    // Sương xanh xám, KHÔNG trắng xóa.
    scene.background = new THREE.Color(0x8fb6cc);
    scene.fog = new THREE.Fog(0x9db8c6, 90, 420);
    camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ canvas: $('scene'), antialias: true });
    renderer.setSize(innerWidth, innerHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    var sun = new THREE.DirectionalLight(0xfff2cc, 0.9);
    sun.position.set(50, 80, 30); scene.add(sun);

    // Biển (khối trong suốt) và đảo chính nhiều bậc.
    var sea = box(900, 1, 900, 0x2e86ab, 0, -0.6, 0);
    sea.material.transparent = true; sea.material.opacity = 0.92;
    box(70, 4, 70, 0x8d6e63, 0, -1, 0); // vách đá
    box(66, 3, 66, 0x9ccc65, 0, 1.5, 0); // bậc đất
    box(60, 2, 60, 0x66bb6a, 0, 3, 0); // mặt cỏ
    // Vành bãi cát quanh đảo.
    box(64, 0.6, 4, 0xffe0a3, 0, 3.2, 32); box(64, 0.6, 4, 0xffe0a3, 0, 3.2, -32);
    box(4, 0.6, 64, 0xffe0a3, 32, 3.2, 0); box(4, 0.6, 64, 0xffe0a3, -32, 3.2, 0);
    // Đường chạy, vạch xuất phát và đích.
    box(14, 0.3, 74, 0xd7ccc8, 0, 4.1, 0);
    box(14, 0.4, 1.2, 0xe53935, 0, 4.3, START_Z);
    box(14, 0.4, 1.2, 0x2e7d32, 0, 4.3, FINISH_Z);
    // Sân đình, trống hội.
    box(10, 4, 8, 0xa1887f, 0, 6, -44);
    box(12, 1, 10, 0x8d6e63, 0, 8.5, -44);
    var drum = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 1.2, 8),
      new THREE.MeshLambertMaterial({ color: 0xb71c1c }));
    drum.position.set(6, 5, -38); drum.rotation.z = Math.PI / 2; scene.add(drum);
    // Nhà mái ngói, ao sen, hồ cá, thuyền.
    for (var h = 0; h < 6; h++) {
      var hx = -22 + h * 9, hz = 18 + (h % 2) * 8;
      box(6, 3, 5, 0xfff8e1, hx, 5.5, hz);
      box(7, 1.5, 6, 0xb71c1c, hx, 7.8, hz);
    }
    box(14, 0.5, 10, 0x4fc3f7, -20, 4.1, -12); // ao sen
    for (var l = 0; l < 8; l++) box(1.2, 0.3, 1.2, 0x43a047, -25 + rand(-4, 4), 4.4, -12 + rand(-3, 3));
    box(1, 0.5, 1, 0xe91e63, -21, 4.6, -13); box(1, 0.5, 1, 0xe91e63, -18, 4.6, -10);
    box(12, 0.5, 8, 0x29b6f6, 20, 4.1, -12); // hồ cá
    for (var b = 0; b < 5; b++) box(5, 1, 2, 0x6d4c41, -28 + b * 6, 3.6, 34);
    // Cây, tre quanh đảo chính.
    for (var t = 0; t < 12; t++) makeTree(rand(0.9, 1.4), scene, rand(-28, 28), rand(-28, 28));
    makeBamboo(scene, -26, 0, 10); makeBamboo(scene, 26, -5, 10);

    buildTourIslands();
    buildDistantSilhouettes();
    buildAnimals();
  }

  function islandBase(island) {
    var g = new THREE.Group();
    var s = island.size;
    if (island.shape === 'leaningPair') {
      var a = box(s * 0.45, s * 0.9, s * 0.45, 0x78909c, -s * 0.28, s * 0.45, 0, g);
      a.rotation.z = 0.18;
      var b2 = box(s * 0.32, s * 0.75, s * 0.32, 0x78909c, s * 0.28, s * 0.38, 0, g);
      b2.rotation.z = -0.22;
      box(s * 0.8, s * 0.15, s * 0.5, 0x2e7d32, -s * 0.2, s * 0.95, 0, g);
    } else if (island.shape === 'cone') {
      box(s * 0.7, s * 0.9, s * 0.7, 0x78909c, 0, s * 0.45, 0, g);
      box(s * 0.55, s * 0.5, s * 0.55, 0x2e7d32, 0, s * 0.95, 0, g);
    } else if (island.shape === 'incense') {
      box(s * 0.5, s * 0.3, s * 0.5, 0x78909c, 0, s * 0.15, 0, g);
      box(s * 0.28, s * 0.7, s * 0.28, 0x90a4ae, 0, s * 0.6, 0, g);
      box(s * 0.4, s * 0.15, s * 0.4, 0x2e7d32, 0, s * 0.98, 0, g);
    } else if (island.shape === 'toad') {
      box(s * 0.8, s * 0.35, s * 0.6, 0x78909c, 0, s * 0.18, 0, g);
      box(s * 0.3, s * 0.3, s * 0.3, 0x546e7a, s * 0.25, s * 0.45, 0, g);
    } else if (island.shape === 'simHills') {
      box(s * 0.4, s * 0.6, s * 0.4, 0x78909c, -s * 0.25, s * 0.3, 0, g);
      box(s * 0.4, s * 0.7, s * 0.4, 0x78909c, s * 0.25, s * 0.35, 0, g);
      box(s * 0.9, s * 0.15, s * 0.5, 0x7e57c2, 0, s * 0.7, 0, g);
    } else if (island.shape === 'monkey') {
      box(s * 0.7, s * 0.6, s * 0.7, 0x78909c, 0, s * 0.3, 0, g);
      box(s * 0.3, s * 0.4, s * 0.3, 0x78909c, s * 0.4, s * 0.2, 0, g);
      box(s * 0.3, s * 0.4, s * 0.3, 0x78909c, -s * 0.4, s * 0.2, 0, g);
    } else {
      // Đảo chính đã dựng ở trên; nhóm này chỉ là điểm neo cho du lịch.
      box(s * 0.5, s * 0.2, s * 0.5, 0x66bb6a, 0, s * 0.1, 0, g);
    }
    // Chân đá sẫm ngấn nước + bãi cát / cầu tàu nếu phù hợp.
    box(s * 0.9, s * 0.12, s * 0.6, 0x37474f, 0, s * 0.02, 0, g);
    if (island.beach) box(s * 0.9, 0.3, s * 0.25, 0xffe0a3, 0, 0.4, s * 0.4, g);
    if (island.pier) box(s * 0.15, 0.3, s * 0.5, 0x6d4c41, s * 0.4, 0.4, s * 0.5, g);
    // Cây theo mật độ riêng từng đảo.
    for (var i = 0; i < island.trees; i++) {
      makeTree(rand(0.6, 1.1), g, rand(-s * 0.3, s * 0.3), rand(-s * 0.3, s * 0.3));
    }
    if (island.shape === 'main') g.visible = false; // đảo chính đã có ở gốc tọa độ
    g.position.set(island.x, 0, island.z);
    g.traverse(function (m) { if (m.isMesh) { m.userData.tourIdx = TOUR_ISLANDS.indexOf(island); } });
    scene.add(g);
    return g;
  }
  function buildTourIslands() {
    TOUR_ISLANDS.forEach(function (island) { tourGroups[island.id] = islandBase(island); });
    var list = $('tour-list');
    TOUR_ISLANDS.forEach(function (island, idx) {
      var b = document.createElement('button');
      b.className = 'btn small'; b.textContent = island.name + ' — ' + island.label;
      b.onclick = function () { focusIsland(idx, true); };
      list.appendChild(b);
    });
  }
  function buildDistantSilhouettes() {
    // Hàng trăm silhouette đảo xa: đá xám + chỏm cây xanh, sương xanh xám.
    // Đây là silhouette, không phải 1.969 đảo dựng chi tiết.
    for (var i = 0; i < 260; i++) {
      var ang = rand(0, Math.PI * 2), dist = rand(260, 420);
      var x = Math.cos(ang) * dist, z = Math.sin(ang) * dist;
      var w = rand(8, 30), h = rand(8, 35);
      box(w, h, w * 0.7, 0x607d8b, x, h / 2 - 1, z);
      box(w * 0.6, h * 0.25, w * 0.5, 0x2e7d32, x, h + 1, z);
    }
  }
  function buildAnimals() {
    for (var i = 0; i < 18; i++) {
      var bird = new THREE.Group();
      var wl = box(0.9, 0.15, 0.3, 0x37474f, -0.5, 0, 0, bird);
      var wr = box(0.9, 0.15, 0.3, 0x37474f, 0.5, 0, 0, bird);
      bird.userData = { wl: wl, wr: wr, cx: rand(-180, 180), cz: rand(-180, 180), r: rand(15, 40), a: rand(0, 6), h: rand(15, 35), sp: rand(0.3, 0.7) };
      scene.add(bird); birds.push(bird);
    }
    for (var i2 = 0; i2 < 10; i2++) {
      var bf = box(0.5, 0.3, 0.1, [0xff80ab, 0xffd54f, 0x81d4fa][i2 % 3], rand(-25, 25), 5, rand(-20, 20));
      butterflies.push(bf);
    }
    for (var i3 = 0; i3 < 8; i3++) {
      var f = box(0.8, 0.4, 0.4, 0xff7043, 16 + rand(-4, 4), 4.5, -12 + rand(-3, 3));
      fishes.push(f);
    }
    for (var i4 = 0; i4 < 6; i4++) {
      var c = box(0.7, 0.4, 0.7, 0xef5350, rand(-30, 30), 3.6, 33);
      crabs.push(c);
    }
    // Khỉ trên Đảo Khỉ: nhảy qua lại giữa hai mỏm đá, một con vẫy tay.
    var khi = TOUR_ISLANDS.find(function (x) { return x.id === 'dao-khi'; });
    for (var m = 0; m < 4; m++) {
      var mk = new THREE.Group();
      box(0.8, 0.9, 0.6, 0x8d6e63, 0, 0.9, 0, mk);
      box(0.6, 0.6, 0.6, 0xa1887f, 0, 1.7, 0, mk);
      var arm = box(0.25, 0.9, 0.25, 0x8d6e63, 0.55, 1.2, 0, mk);
      mk.position.set(khi.x + (m - 1.5) * 3, 2, khi.z);
      mk.userData = { arm: arm, phase: m, baseY: 2, wave: m === 0 };
      scene.add(mk); monkeys.push(mk);
    }
  }

  // ---- Người chơi / bot ----
  function createPerson(name, shirtColor, isBot, x, z) {
    var g = makeAvatar(shirtColor);
    g.position.set(x, 4, z);
    scene.add(g);
    return { id: null, name: name, group: g, x: x, z: z, vy: 0, grounded: true,
      alive: true, finished: false, finishTime: null, isBot: !!isBot, team: null,
      bridgeStep: 0, jumped: false, color: shirtColor };
  }
  function spawnBots() {
    bots = [];
    for (var i = 0; i < 60; i++) {
      var b = createPerson('Số ' + (i + 1) + ' · ' + VILLAGES[i % VILLAGES.length] + ' · BOT',
        ['#e53935', '#f9a825', '#43a047', '#2196f3', '#ab47bc', '#ff7043'][i % 6],
        true, rand(-6, 6), START_Z + rand(0, 4));
      b.id = 'bot-' + i; bots.push(b);
    }
  }
  function allPersons() {
    var list = [];
    if (player) list.push(player);
    list = list.concat(bots);
    Object.keys(remotePlayers).forEach(function (k) { list.push(remotePlayers[k]); });
    return list;
  }
  function updateAliveHUD() {
    var alive = allPersons().filter(function (p) { return p.alive; }).length;
    $('hud-alive').textContent = alive;
    if (player && player.alive) {
      var prog = Math.min(1, Math.max(0, (START_Z - player.z) / (START_Z - FINISH_Z)));
      $('progress-fill').style.width = Math.round(prog * 100) + '%';
    }
  }
  function eliminate(person, reason) {
    if (!person.alive) return;
    person.alive = false; person.spectator = true;
    if (person === player) {
      phase = 'spectator';
      $('spectator').classList.remove('hidden');
      buildSpectatorList();
      toast('Bạn bị loại: ' + reason);
    }
    updateAliveHUD();
  }
  function buildSpectatorList() {
    spectatorList = allPersons().filter(function (p) { return p.alive; });
    if (!spectatorList.length) spectatorList = allPersons();
    if (spectatorList.length) watchedId = spectatorList[0].id;
    updateWatchedName();
  }
  function watchedPerson() {
    return allPersons().find(function (p) { return p.id === watchedId; }) || spectatorList[0];
  }
  function updateWatchedName() {
    var w = watchedPerson();
    $('watched-name').textContent = w ? ('Đang xem: ' + w.name) : 'Đang xem: —';
  }

  // ---- Chế độ chơi ----
  function showHUD(show) {
    $('hud').classList.toggle('hidden', !show);
    $('minimap-box').classList.toggle('hidden', !show);
    $('btn-chat-open').style.display = show ? 'block' : 'none';
    if (window.innerWidth < 760 || 'ontouchstart' in window) {
      $('joystick').classList.toggle('hidden', !show);
      $('btn-jump').classList.toggle('hidden', !show);
    }
  }
  function startSingle() {
    mode = 'single'; phase = 'countdown'; matchStartAt = Date.now();
    $('menu').classList.add('hidden');
    player = createPerson(($('player-name').value || 'Người chơi').trim(), '#2196f3', false, 0, START_Z);
    player.id = 'me';
    spawnBots();
    myTeam = null; myBridgeStep = 0; localBridges = {}; localRanking = [];
    drumState = 'drum'; drumTimer = 2.5;
    showHUD(true); updateAliveHUD();
    toast('Đếm ngược… Trống sắp đánh!');
    updateSingle._teamTimer = 0; updateSingle._r1TimeoutDone = false;
    setTimeout(function () { if (mode === 'single') startRoundCommon(1, 'trong-hoi', 'Trống Hội', 120); }, 3200);
  }
  function connectWS() {
    if (ws && ws.readyState === WebSocket.OPEN) return ws;
    ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host);
    ws.onmessage = function (ev) { onServerMessage(JSON.parse(ev.data)); };
    ws.onopen = function () { sendWS({ type: 'list' }); };
    return ws;
  }
  function sendWS(obj) { if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj)); }
  function startMultiUI() {
    $('multi-box').classList.remove('hidden');
    connectWS();
  }
  function onServerMessage(msg) {
    // Tin nhắn riêng của các vòng 3-6 do rounds.js xử lý trước.
    if (window.Rounds && window.Rounds.onServerMessage && window.Rounds.onServerMessage(msg)) return;
    if (msg.type === 'welcome') { myId = msg.id; return; }
    if (msg.type === 'roundStart') { startRoundCommon(msg.round, msg.game, msg.name, msg.timeLimit, msg.seed); return; }
    if (msg.type === 'economy' && window.HoiShop && window.HoiShop.onMessage) { window.HoiShop.onMessage(msg); return; }
    if (msg.type === 'roundEnd') { onRoundEnd(msg); return; }
    if (msg.type === 'tick') { onTick(msg); return; }
    if (msg.type === 'rooms') {
      $('room-list').innerHTML = msg.rooms.map(function (r) {
        return '<button class="btn small" onclick="window.__joinRoom(\'' + r.code + '\')">' + r.code + ' — ' + r.count + ' người</button>';
      }).join('') || '<div class="note">Chưa có phòng nào đang mở.</div>';
      return;
    }
    if (msg.type === 'joined') {
      roomCode = msg.code; isHost = !!msg.isHost; mode = 'multi';
      $('menu').classList.add('hidden'); showHUD(true);
      $('lobby-info').textContent = 'Phòng ' + msg.code + (msg.spectator ? ' — bạn vào làm khán giả.' : '');
      if (!player) {
        player = createPerson(($('player-name').value || 'Người chơi').trim(), '#2196f3', false, 0, START_Z);
        player.id = 'me';
      }
      if (msg.spectator) { player.alive = false; player.spectator = true; $('spectator').classList.remove('hidden'); buildSpectatorList(); }
      syncRemotePlayers(msg.players || []);
      $('btn-start').classList.toggle('hidden', !isHost);
      return;
    }
    if (msg.type === 'players') { syncRemotePlayers(msg.players); updateAliveHUD(); return; }
    if (msg.type === 'playerPos') {
      var rp = remotePlayers[msg.id];
      if (rp) { rp.x = msg.x; rp.z = msg.z; rp.group.position.set(msg.x, 4, msg.z); rp.alive = msg.alive; rp.team = msg.team; }
      return;
    }
    if (msg.type === 'phase') {
      phase = msg.phase;
      if (msg.phase === 'round1') { startRoundCommon(1, 'trong-hoi', 'Trống Hội', 120); matchStartAt = Date.now(); }
      if (msg.phase === 'team') {
        $('team-screen').classList.remove('hidden');
        $('team-list').innerHTML = (msg.teams || []).map(function (t) {
          return '<div style="color:' + TEAM_COLORS[t.team] + '">Team ' + TEAM_NAMES[t.team] + ': ' + t.name + '</div>';
        }).join('');
        var me = (msg.teams || []).find(function (t) { return t.id === myId; });
        if (me) { myTeam = me.team; if (player) player.team = me.team; }
      }
      if (msg.phase === 'round2') {
        $('team-screen').classList.add('hidden');
        startRoundCommon(2, 'cau-khi', 'Cầu Khỉ Sương Mù', 0);
        buildBridges();
        teleportToBridge();
      }
      if (msg.phase === 'round3' || msg.phase === 'round4' || msg.phase === 'round5' || msg.phase === 'round6') {
        var rn = Number(msg.phase.slice(5));
        $('team-screen').classList.add('hidden');
        startRoundCommon(rn, ROUND_GAMES[rn], ROUND_NAMES[rn], ROUND_TIME_LIMITS[ROUND_GAMES[rn]] || 90);
      }
      if (msg.phase === 'finished') {
        showRanking(msg.ranking || []);
      }
      if (msg.players) syncRemotePlayers(msg.players);
      updateAliveHUD();
      return;
    }
    if (msg.type === 'drum') {
      drumState = msg.drum;
      $('hud-drum').textContent = drumState === 'drum' ? 'TRỐNG ĐÁNH — Chạy đi!' : 'CHIÊNG VANG — Đứng yên!';
      return;
    }
    if (msg.type === 'turn') {
      teamLeader = msg.leaderId;
      if (msg.team === myTeam) {
        $('hud-drum').textContent = teamLeader === myId ? 'TỚI LƯỢT BẠN — chọn ván!' : 'Chờ tới lượt của bạn…';
      }
      return;
    }
    if (msg.type === 'bridgeUpdate') {
      // Ván vỡ / bước đi được server xác nhận thì client mới vẽ lại cầu.
      if (msg.broken) toast('Ván yếu đã vỡ ở bước ' + (msg.step + 1));
      return;
    }
    if (msg.type === 'eliminated') {
      var p = remotePlayers[msg.id];
      if (p) { p.alive = false; }
      if (msg.id === myId) eliminate(player, msg.reason || 'Bị loại');
      updateAliveHUD();
      return;
    }
    if (msg.type === 'ranking') { showRanking(msg.ranking); return; }
    if (msg.type === 'chat') {
      addChat(msg.name, msg.text, msg.time, teamColorHex(msg.team), msg.senderId === myId);
      setTag('bubble-' + msg.senderId, msg.text, null, true);
      return;
    }
    if (msg.type === 'error') { toast(msg.message); return; }
  }
  function syncRemotePlayers(list) {
    list.forEach(function (info) {
      if (info.id === myId) return;
      if (!remotePlayers[info.id]) {
        var rp = createPerson(info.name, teamColorHex(info.team), false, info.x || 0, info.z || START_Z);
        rp.id = info.id; remotePlayers[info.id] = rp;
      }
      var p = remotePlayers[info.id];
      p.alive = info.alive; p.team = info.team; p.finished = info.finished;
      p.group.position.set(info.x || 0, 4, info.z || START_Z);
    });
  }
  window.__joinRoom = function (code) {
    $('room-code').value = code;
    connectWS();
    setTimeout(function () { sendWS({ type: 'join', code: code, name: $('player-name').value || 'Người chơi' }); }, 300);
  };
  function showRanking(ranking) {
    phase = 'finished';
    var html = '<h2>BẢNG XẾP HẠNG — theo thời gian cá nhân</h2>' +
      (ranking.length ? ranking.map(function (r, i) {
        return '<div>' + (i + 1) + '. ' + r.name + ' — ' + (r.time / 1000).toFixed(1) + 's</div>';
      }).join('') : '<div>Chưa có ai về đích.</div>') +
      '<p class="note">Không có xếp hạng team. Chia team chỉ để chia lượt.</p>';
    $('team-screen').classList.remove('hidden');
    $('team-list').innerHTML = html;
    $('btn-to-bridge').textContent = 'Chơi lại từ vòng 1';
  }

  // ---- Cầu Khỉ ----
  var bridgeMeshes = [];
  function bridgeX(team) { return (team - 1) * 26; }
  function buildBridges() {
    bridgeMeshes.forEach(function (m) { scene.remove(m); });
    bridgeMeshes = [];
    for (var team = 0; team < 3; team++) {
      var bx = bridgeX(team);
      for (var step = 0; step < 9; step++) {
        var z = -52 - step * 5;
        [-1.6, 1.6].forEach(function (dx) {
          var plank = box(2.4, 0.4, 3.2, 0x8d6e63, bx + dx, 3.5, z);
          plank.userData = { bridge: true, team: team, step: step, plank: dx < 0 ? 0 : 1 };
          bridgeMeshes.push(plank);
        });
        box(0.3, 2, 3.2, TEAM_COLORS[team], bx - 3.2, 4.5, z, scene);
        bridgeMeshes.push(box(0.3, 2, 3.2, TEAM_COLORS[team], bx + 3.2, 4.5, z, scene));
      }
      box(10, 1, 6, 0xffe0a3, bx, 3.2, -100); // đảo cuối
    }
  }
  function teleportToBridge() {
    if (player && player.alive && myTeam !== null) {
      player.z = -48; player.x = bridgeX(myTeam);
      player.group.position.set(player.x, 4, player.z);
      myBridgeStep = 0;
    }
  }
  function localStartRound2() {
    // Chế độ chơi đơn: chia team và random ván yếu tại client (không có server).
    var survivors = allPersons().filter(function (p) { return p.alive; })
      .sort(function (a, b) { return (a.finishTime || 0) - (b.finishTime || 0); });
    var teamCount = Math.min(3, Math.max(1, survivors.length));
    localBridges = {};
    survivors.forEach(function (p, i) {
      p.team = i % teamCount; p.bridgeStep = 0;
      if (!localBridges[p.team]) {
        localBridges[p.team] = { weak: Array.from({ length: 9 }, function () { return randInt(0, 1); }), broken: Array(9).fill(false), queue: [] };
      }
      localBridges[p.team].queue.push(p);
    });
    if (player && player.alive) {
      myTeam = player.team; myBridgeStep = 0;
      $('team-panel').innerHTML = 'Team của bạn: <b style="color:' + TEAM_COLORS[myTeam] + '">' + TEAM_NAMES[myTeam] + '</b>';
      $('team-panel').classList.remove('hidden');
    }
    buildBridges();
    // Bot và người chơi về cầu của team mình.
    allPersons().forEach(function (p) {
      if (p.alive && p.team !== null) { p.z = -48; p.x = bridgeX(p.team); p.group.position.set(p.x, 4, p.z); }
    });
    phase = 'round2'; currentRound = 2; roundTimeLimit = 0; roundEndsAt = 0;
    roundStartAlive = allPersons().filter(function (p) { return p.alive; }).map(function (p) { return p.name; });
    $('hud-round').textContent = 'VÒNG 2/6 — Cầu Khỉ Sương Mù';
  }
  function showTeamScreenSingle() {
    phase = 'team';
    var survivors = allPersons().filter(function (p) { return p.alive; });
    var teamCount = Math.min(3, Math.max(1, survivors.length));
    var html = survivors.map(function (p, i) {
      var t = i % teamCount;
      return '<div style="color:' + TEAM_COLORS[t] + '">Team ' + TEAM_NAMES[t] + ': ' + p.name + '</div>';
    }).join('');
    $('team-list').innerHTML = html;
    $('team-screen').classList.remove('hidden');
  }
  function isMyTurnSingle() {
    if (!player || !player.alive) return false;
    var q = (localBridges[myTeam] || { queue: [] }).queue.filter(function (p) { return p.alive && p.bridgeStep < 9; });
    return q.length && q[0] === player;
  }
  function stepOnBridge(plank) {
    if (mode === 'multi') { sendWS({ type: 'bridge', action: 'step', plank: plank }); return; }
    if (!isMyTurnSingle()) { toast('Chưa tới lượt của bạn.'); return; }
    var b = localBridges[myTeam];
    var step = myBridgeStep;
    if (b.broken[step]) { toast('Ván đã vỡ — nhảy qua bằng Space!'); return; }
    if (b.weak[step] === plank) {
      b.broken[step] = true;
      toast('Ván yếu vỡ rồi!');
      eliminate(player, 'Bước vào ván yếu, rơi khỏi cầu');
    } else {
      myBridgeStep++; player.bridgeStep = myBridgeStep;
      if (myBridgeStep >= 9) {
        localRanking.push({ name: player.name, time: (Date.now() - matchStartAt) });
        showRanking(localRanking);
      } else {
        player.z = -52 - myBridgeStep * 5; player.group.position.set(player.x, 4, player.z);
      }
    }
  }

  // ---- Chat ----
  function addChat(name, text, time, color, isMe) {
    var log = $('chat-log');
    var div = document.createElement('div');
    div.innerHTML = '<b style="color:' + (color || '#111') + '">' + escapeHtml(name) + '</b> <span style="color:#78909c">' + (time || '') + '</span>: ' + escapeHtml(text);
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
  }
  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function sendChat(text) {
    text = (text || '').trim();
    if (!text) return;
    if (text.length > 120) { toast('Tin nhắn tối đa 120 ký tự.'); return; }
    var now = Date.now();
    if (now - lastChatAt < 2000) { toast('Gửi chậm lại một chút (2 giây/tin).'); return; }
    lastChatAt = now;
    var time = new Date(now).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    var myName = player ? player.name : ($('player-name').value || 'Người chơi');
    if (mode === 'multi') {
      sendWS({ type: 'chat', text: text });
    } else {
      addChat(myName, text, time, teamColorHex(myTeam), true);
      setTag('bubble-me', text, null, true);
      // Bot trả lời mẫu, luôn ghi rõ là bot.
      setTimeout(function () {
        var bot = bots[Math.floor(Math.random() * bots.length)];
        if (bot) addChat(bot.name, 'Cố lên, đích ở sân đình kìa!', time, bot.color, false);
      }, 1200);
    }
  }
  function openChat() {
    $('chat-panel').classList.remove('hidden');
    $('chat-input').focus();
  }
  function closeChat() {
    $('chat-panel').classList.add('hidden');
    $('chat-input').blur();
  }

  // ---- Du lịch ----
  function focusIsland(idx, fromList) {
    var island = TOUR_ISLANDS[idx];
    if (!island) return;
    focusedIsland = island;
    // Chỉ đảo đang xem mới dựng chi tiết đầy đủ: ở đây nhóm đảo đã có cây/thú,
    // khi camera tới gần, chi tiết đó hiện rõ; các đảo khác giữ silhouette.
    if (detailedIsland && detailedIsland !== island.id) {
      // Không xóa đảo cũ, chỉ ngừng xem nó — giữ nhẹ máy.
    }
    detailedIsland = island.id;
    var target = island.id === 'hoi-lang' ? new THREE.Vector3(0, 6, 0) : new THREE.Vector3(island.x, 4, island.z);
    var dist = Math.max(18, island.size * 1.6);
    flyTo = { pos: new THREE.Vector3(target.x + dist, target.y + dist * 0.7, target.z + dist), target: target };
    $('tourism').classList.remove('hidden');
    $('tour-detail').innerHTML =
      '<span class="story-label">' + island.label + '</span>' +
      '<h3>' + island.name + '</h3><p>' + island.story + '</p>' +
      '<p class="note">Bấm đảo khác trong danh sách, chấm đảo trên minimap, hoặc bấm trực tiếp đảo trong 3D để bay tới đảo đó. Chỉ đảo đang xem mới hiển thị chi tiết đầy đủ.</p>';
  }
  function backToPanorama() {
    flyTo = { pos: new THREE.Vector3(0, 55, 110), target: new THREE.Vector3(0, 4, 0) };
    focusedIsland = null;
  }
  function backToMatch() {
    $('tourism').classList.add('hidden');
    tourismMode = false;
    if (player && player.alive) { phase = phase === 'tourism' ? 'round1' : phase; }
    else if (player) { phase = 'spectator'; $('spectator').classList.remove('hidden'); }
  }

  // ---- Minimap ----
  function drawMinimap() {
    var c = $('minimap'), ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = '#7fb3d5'; ctx.fillRect(0, 0, c.width, c.height);
    function map(x, z) { return [95 + x * 0.38, 95 + z * 0.38]; }
    // Đảo chính + đảo du lịch.
    TOUR_ISLANDS.forEach(function (island) {
      var p = map(island.x, island.z);
      ctx.fillStyle = island.id === 'hoi-lang' ? '#66bb6a' : '#607d8b';
      ctx.beginPath(); ctx.arc(p[0], p[1], island.id === 'hoi-lang' ? 12 : 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2e7d32';
      ctx.beginPath(); ctx.arc(p[0], p[1], 3, 0, Math.PI * 2); ctx.fill();
    });
    allPersons().forEach(function (p) {
      var pt = map(p.x, p.z);
      ctx.fillStyle = p === player ? '#ffd600' : (p.isBot ? '#ffffff' : teamColorHex(p.team));
      ctx.beginPath(); ctx.arc(pt[0], pt[1], p === player ? 4 : 2.5, 0, Math.PI * 2); ctx.fill();
    });
    var w = watchedPerson();
    if (w) {
      var wp = map(w.x, w.z);
      ctx.strokeStyle = '#00bfa5'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(wp[0], wp[1], 8, 0, Math.PI * 2); ctx.stroke();
    }
  }
  $('minimap').addEventListener('click', function (ev) {
    var rect = $('minimap').getBoundingClientRect();
    var mx = (ev.clientX - rect.left) / rect.width * 190;
    var my = (ev.clientY - rect.top) / rect.height * 190;
    var best = null, bestD = 1e9;
    TOUR_ISLANDS.forEach(function (island, idx) {
      var px = 95 + island.x * 0.38, py = 95 + island.z * 0.38;
      var d = Math.hypot(px - mx, py - my);
      if (d < bestD) { bestD = d; best = idx; }
    });
    if (best !== null && bestD < 22) focusIsland(best, true);
  });

  // ---- Input ----
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter' && document.activeElement !== $('chat-input')) {
      ev.preventDefault(); openChat(); return;
    }
    if (ev.key === 'Escape') { closeChat(); return; }
    if (document.activeElement === $('chat-input')) return;
    if (ev.key === ' ' && window.Rounds && window.Rounds.onSpace && window.Rounds.onSpace()) {
      ev.preventDefault(); return; // Vòng kéo co / nhảy bao bố dùng Space làm nút hành động.
    }
    keys[ev.key.toLowerCase()] = true;
    if (ev.key === ' ') {
      ev.preventDefault();
      jumpQueued = true;
      if (player && player.grounded) { player.vy = 9; player.grounded = false; player.jumped = true;
        if (mode === 'multi') sendWS({ type: 'pos', x: player.x, z: player.z, jumped: true });
      }
      // Nhảy qua khoảng trống do ván vỡ (chế độ chơi đơn).
      if (mode === 'single' && phase === 'round2' && player && player.alive && isMyTurnSingle()) {
        var b = localBridges[myTeam];
        if (b && b.broken[myBridgeStep]) {
          myBridgeStep++; player.bridgeStep = myBridgeStep;
          player.z = -52 - myBridgeStep * 5; player.group.position.set(player.x, 4, player.z);
          if (myBridgeStep >= 9) { localRanking.push({ name: player.name, time: (Date.now() - matchStartAt) }); showRanking(localRanking); }
        }
      }
    }
    if (ev.key >= '1' && ev.key <= '4') {
      spectatorView = ['panorama', 'follow', 'shoulder', 'free'][Number(ev.key) - 1];
    }
    if (ev.key.toLowerCase() === 'c') spectatorView = spectatorView === 'follow' ? 'panorama' : 'follow';
    if (ev.key === 'Tab') {
      ev.preventDefault();
      if (spectatorList.length) {
        var i = spectatorList.findIndex(function (p) { return p.id === watchedId; });
        watchedId = spectatorList[(i + 1) % spectatorList.length].id; updateWatchedName();
      }
    }
  });
  document.addEventListener('keyup', function (ev) { keys[ev.key.toLowerCase()] = false; });

  var dragging = false, lastMouse = null, downPos = null, downTime = 0;
  $('scene').addEventListener('pointerdown', function (ev) {
    dragging = true; lastMouse = { x: ev.clientX, y: ev.clientY };
    downPos = { x: ev.clientX, y: ev.clientY }; downTime = Date.now();
  });
  window.addEventListener('pointermove', function (ev) {
    if (!dragging || !lastMouse) return;
    camAngle -= (ev.clientX - lastMouse.x) * 0.005;
    camHeight = Math.max(3, Math.min(30, camHeight + (ev.clientY - lastMouse.y) * 0.05));
    lastMouse = { x: ev.clientX, y: ev.clientY };
  });
  window.addEventListener('pointerup', function (ev) {
    dragging = false;
    // Click (không kéo) vào đảo trong 3D để bay tới xem chi tiết.
    if (downPos && Math.hypot(ev.clientX - downPos.x, ev.clientY - downPos.y) < 6 && Date.now() - downTime < 400) {
      pointer = pointer || new THREE.Vector2();
      pointer.x = (ev.clientX / innerWidth) * 2 - 1;
      pointer.y = -(ev.clientY / innerHeight) * 2 + 1;
      raycaster = raycaster || new THREE.Raycaster();
      raycaster.setFromCamera(pointer, camera);
      var hits = raycaster.intersectObjects(scene.children, true);
      for (var i = 0; i < hits.length; i++) {
        var idx = hits[i].object.userData.tourIdx;
        if (idx !== undefined && TOUR_ISLANDS[idx].id !== 'hoi-lang') { focusIsland(idx, true); break; }
        if (hits[i].object.userData.bridge) {
          var bd = hits[i].object.userData;
          if (phase === 'round2' && player && player.alive) {
            if (mode === 'multi') { /* lượt và ván do server quyết, click chỉ là gợi ý */ }
            else if (bd.team === myTeam && bd.step === myBridgeStep) stepOnBridge(bd.plank);
          }
          break;
        }
      }
    }
    downPos = null;
  });
  $('scene').addEventListener('wheel', function (ev) {
    ev.preventDefault();
    camDist = Math.max(6, Math.min(60, camDist + (ev.deltaY > 0 ? 2 : -2)));
  }, { passive: false });
  $('scene').addEventListener('dblclick', function () { camDist = Math.max(6, camDist - 8); });

  // Joystick mobile.
  var joyEl = $('joystick'), knob = $('joy-knob');
  joyEl.addEventListener('touchstart', function (ev) { joy.active = true; }, { passive: true });
  joyEl.addEventListener('touchmove', function (ev) {
    var t = ev.touches[0], r = joyEl.getBoundingClientRect();
    joy.x = Math.max(-1, Math.min(1, (t.clientX - (r.left + r.width / 2)) / 40));
    joy.y = Math.max(-1, Math.min(1, (t.clientY - (r.top + r.height / 2)) / 40));
    knob.style.left = (35 + joy.x * 25) + 'px'; knob.style.top = (35 + joy.y * 25) + 'px';
  }, { passive: true });
  joyEl.addEventListener('touchend', function () { joy.active = false; joy.x = 0; joy.y = 0; knob.style.left = '35px'; knob.style.top = '35px'; });
  $('btn-jump').addEventListener('click', function () {
    if (window.Rounds && window.Rounds.onSpace && window.Rounds.onSpace()) return;
    jumpQueued = true;
    if (player && player.grounded) { player.vy = 9; player.grounded = false; }
  });

  // ---- Nút bấm ----
  $('btn-single').onclick = function () { if (!window.THREE) { toast('Chưa tải được Three.js, kiểm tra mạng rồi tải lại trang.'); return; } startSingle(); };
  $('btn-multi').onclick = startMultiUI;
  $('btn-create').onclick = function () { connectWS(); setTimeout(function () { sendWS({ type: 'create', name: $('player-name').value || 'Người chơi' }); }, 300); };
  $('btn-join').onclick = function () {
    var code = $('room-code').value.trim().toUpperCase();
    if (!code) { toast('Nhập mã phòng trước.'); return; }
    connectWS(); setTimeout(function () { sendWS({ type: 'join', code: code, name: $('player-name').value || 'Người chơi' }); }, 300);
  };
  $('btn-list').onclick = function () { connectWS(); setTimeout(function () { sendWS({ type: 'list' }); }, 300); };
  $('btn-start').onclick = function () { sendWS({ type: 'start' }); };
  $('btn-tour-lobby').onclick = function () { tourismMode = true; focusIsland(1, true); };
  $('btn-tour').onclick = function () { tourismMode = true; $('spectator').classList.add('hidden'); focusIsland(1, true); };
  $('btn-close-tour').onclick = backToMatch;
  $('btn-panorama').onclick = backToPanorama;
  $('btn-back-match').onclick = backToMatch;
  $('btn-replay').onclick = function () {
    if (window.Rounds) window.Rounds.endRound();
    hideInterstitial();
    if (mode === 'multi') sendWS({ type: 'replay' });
    $('spectator').classList.add('hidden'); $('team-screen').classList.add('hidden');
    $('menu').classList.remove('hidden'); showHUD(false);
    if (player) { scene.remove(player.group); player = null; }
    bots.forEach(function (b) { scene.remove(b.group); }); bots = [];
    phase = 'menu';
  };
  $('btn-to-bridge').onclick = function () {
    $('team-screen').classList.add('hidden');
    if (mode === 'single' && phase === 'team') localStartRound2();
  };
  document.querySelectorAll('.spec-view').forEach(function (b) {
    b.onclick = function () { spectatorView = b.dataset.view; };
  });
  $('btn-prev-person').onclick = function () {
    if (!spectatorList.length) return;
    var i = spectatorList.findIndex(function (p) { return p.id === watchedId; });
    watchedId = spectatorList[(i - 1 + spectatorList.length) % spectatorList.length].id; updateWatchedName();
  };
  $('btn-next-person').onclick = function () {
    if (!spectatorList.length) return;
    var i = spectatorList.findIndex(function (p) { return p.id === watchedId; });
    watchedId = spectatorList[(i + 1) % spectatorList.length].id; updateWatchedName();
  };
  $('btn-zoom-out').onclick = function () { camDist = Math.min(60, camDist + 4); };
  $('btn-zoom-in').onclick = function () { camDist = Math.max(6, camDist - 4); };
  $('btn-chat-open').onclick = openChat;
  $('btn-close-chat').onclick = closeChat;
  $('btn-hide-bubbles').onclick = function () {
    hideBubbles = !hideBubbles;
    $('btn-hide-bubbles').textContent = hideBubbles ? 'HIỆN BONG BÓNG' : 'ẨN BONG BÓNG';
    if (hideBubbles) Object.keys(tagEls).forEach(function (k) { if (tagEls[k]._isBubble) clearTag(k); });
  };
  $('btn-send-chat').onclick = function () { sendChat($('chat-input').value); $('chat-input').value = ''; };
  $('chat-input').addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter') { ev.stopPropagation(); sendChat($('chat-input').value); $('chat-input').value = ''; }
    if (ev.key === 'Escape') { closeChat(); }
  });
  document.querySelectorAll('.quick').forEach(function (b) {
    b.onclick = function () { sendChat(b.dataset.text); };
  });

  // ---- Cửa hàng / Hội Xu (shop.js do workstream khác tạo; chưa có thì báo nhẹ) ----
  // Mở panel kinh tế do shop.js vẽ; chưa có shop.js thì báo nhẹ.
  [['btn-shop', 'shop-panel'], ['btn-pass', 'pass-panel'], ['btn-tournament', 'tournament-panel']].forEach(function (pair) {
    var b = $(pair[0]); if (!b) return;
    b.onclick = function () {
      if (!window.HoiShop) { toast('Cửa hàng chưa sẵn sàng.'); return; }
      if (typeof window.HoiShop.render === 'function') window.HoiShop.render();
      ['shop-panel', 'pass-panel', 'tournament-panel', 'gift-panel'].forEach(function (pid) {
        var pp = $(pid); if (pp) pp.classList.add('hidden');
      });
      var target = $(pair[1]);
      if (target) target.classList.remove('hidden');
    };
  });
  // Fallback để shop.js (khi có) cập nhật số dư qua window.HoiWallet.set(balance).
  if (!window.HoiWallet) {
    window.HoiWallet = { set: function (balance) { var el = $('wallet-hud'); if (el) el.textContent = 'Hội Xu: ' + balance; } };
  }

  // ---- Vòng lặp game ----
  var lastTime = performance.now(), minimapTimer = 0;
  function updateSingle(dt) {
    if (phase === 'round1') {
      // Hết giờ vòng 1 (giới hạn 120s, server cũng áp cùng giới hạn): ai chưa về đích bị loại.
      if (roundEndsAt && Date.now() >= roundEndsAt && !updateSingle._r1TimeoutDone) {
        updateSingle._r1TimeoutDone = true;
        allPersons().filter(function (p) { return p.alive && !p.finished; })
          .forEach(function (p) { eliminate(p, 'Hết giờ — người chưa về đích bị loại'); });
        toast('Hết giờ — người chưa về đích bị loại');
      }
      drumTimer -= dt;
      if (drumTimer <= 0) {
        drumState = drumState === 'drum' ? 'gong' : 'drum';
        drumTimer = drumState === 'drum' ? rand(2.5, 5) : rand(2, 4);
        $('hud-drum').textContent = drumState === 'drum' ? 'TRỐNG ĐÁNH — Chạy đi!' : 'CHIÊNG VANG — Đứng yên!';
      }
      bots.forEach(function (b) {
        if (!b.alive || b.finished) return;
        if (drumState === 'drum') {
          b.z -= rand(6, 10) * dt; b.x += rand(-1, 1) * dt;
          b.group.position.set(b.x, 4, b.z);
        } else if (Math.random() < 0.002) {
          // Một vài bot "phạm luật" trong lúc chiêng và bị loại.
          b.alive = false;
        }
        if (b.z <= FINISH_Z && !b.finished) { b.finished = true; b.finishTime = (Date.now() - matchStartAt) / 1000; }
      });
      if (player && player.alive && !player.finished && player.z <= FINISH_Z) {
        player.finished = true; player.finishTime = (Date.now() - matchStartAt) / 1000;
      }
      var active = allPersons().filter(function (p) { return p.alive && !p.finished; });
      if (active.length === 0 && (player || bots.length)) {
        // Chờ 1 nhịp rồi sang CHIA TEAM.
        if (!updateSingle._teamTimer) updateSingle._teamTimer = 1;
        updateSingle._teamTimer -= dt;
        if (updateSingle._teamTimer <= 0) { updateSingle._teamTimer = 0; var st1 = roundEndStats(); localRoundEnd(1, st1.survivors, st1.eliminated); }
      }
    }
    if (phase === 'round2') {
      // Bot đi cầu theo lượt của team mình, ván yếu random tại client (chơi đơn).
      Object.keys(localBridges).forEach(function (tk) {
        var b = localBridges[tk];
        var q = b.queue.filter(function (p) { return p.alive && p.bridgeStep < 9; });
        if (!q.length) return;
        var leader = q[0];
        if (leader.isBot && Math.random() < dt * 0.5) {
          var step = leader.bridgeStep;
          if (b.broken[step]) { leader.bridgeStep++; leader.z = -52 - leader.bridgeStep * 5; leader.group.position.set(leader.x, 4, leader.z); }
          else if (b.weak[step] === 0 || b.weak[step] === 1) {
            // Bot chọn ngẫu nhiên 1 trong 2 ván.
            var plank = randInt(0, 1);
            if (b.weak[step] === plank) { b.broken[step] = true; leader.alive = false; }
            else { leader.bridgeStep++; leader.z = -52 - leader.bridgeStep * 5; leader.group.position.set(leader.x, 4, leader.z); }
            if (leader.bridgeStep >= 9) localRanking.push({ name: leader.name, time: (Date.now() - matchStartAt) });
          }
        }
      });
      var left = allPersons().filter(function (p) { return p.alive && p.bridgeStep < 9; });
      if (!left.length && phase === 'round2') {
        var st2 = roundEndStats();
        localRoundEnd(2, st2.survivors, st2.eliminated);
      }
    }
    if (player && player.finished && phase === 'round1') {
      // Người về đích sớm chờ các bot khác, không cần làm gì thêm.
    }
  }
  function updatePlayerMovement(dt) {
    if (!player || !player.alive || phase === 'tourism') return;
    if (document.activeElement === $('chat-input')) return;
    // Vòng vẽ / ô ăn quan dùng overlay, không di chuyển nhân vật.
    if (window.Rounds && window.Rounds.blocksMovement && window.Rounds.blocksMovement()) return;
    var speed = 9;
    var mx = 0, mz = 0;
    if (keys['w'] || keys['arrowup']) mz -= 1;
    if (keys['s'] || keys['arrowdown']) mz += 1;
    if (keys['a'] || keys['arrowleft']) mx -= 1;
    if (keys['d'] || keys['arrowright']) mx += 1;
    if (joy.active) { mx += joy.x; mz += joy.y; }
    if (mx || mz) {
      var len = Math.hypot(mx, mz); mx /= len; mz /= len;
      var oldX = player.x, oldZ = player.z;
      player.x += mx * speed * dt; player.z += mz * speed * dt;
      // Giới hạn trong đảo chính ở vòng 1.
      if (phase === 'round1' || phase === 'round3' || phase === 'round5' || phase === 'round6') { player.x = Math.max(-28, Math.min(28, player.x)); player.z = Math.max(-48, Math.min(38, player.z)); }
      if (phase === 'round2') {
        // Trên cầu chỉ đi theo lượt và theo bước; di chuyển tự do bị chặn lại.
        if (mode === 'single' && !isMyTurnSingle()) { player.x = oldX; player.z = oldZ; }
        else { player.x = Math.max(bridgeX(myTeam) - 4, Math.min(bridgeX(myTeam) + 4, player.x)); }
      }
      player.group.position.set(player.x, 4 + (player.grounded ? 0 : 0), player.z);
      if (mode === 'multi' && (Math.abs(player.x - oldX) > 0.01 || Math.abs(player.z - oldZ) > 0.01)) {
        sendWS({ type: 'pos', x: player.x, z: player.z, jumped: false });
      }
      if (mode === 'single' && phase === 'round1' && drumState === 'gong') {
        eliminate(player, 'Di chuyển trong lúc chiêng');
      }
    }
    // Gửi input đã throttle tối đa 15Hz; giữ lại pos cho tương thích vòng 1/2.
    if (mode === 'multi' && (mx || mz || jumpQueued) && Date.now() - lastInputSentAt >= 66) {
      lastInputSentAt = Date.now();
      var ilen = Math.hypot(mx, mz) || 1;
      sendWS({ type: 'input', dx: mx / ilen, dz: mz / ilen, jump: jumpQueued });
      jumpQueued = false;
    }
    // Nhảy / trọng lực đơn giản.
    if (!player.grounded) {
      player.vy -= 22 * dt;
      var y = player.group.position.y + player.vy * dt;
      if (y <= 4) { y = 4; player.grounded = true; player.vy = 0; player.jumped = false; }
      player.group.position.y = y;
      if (mode === 'single' && phase === 'round1' && drumState === 'gong' && player.jumped) {
        eliminate(player, 'Nhảy trong lúc chiêng');
      }
    }
    if (mode === 'single' && phase === 'round1' && player.alive && !player.finished && player.z <= FINISH_Z) {
      player.finished = true; player.finishTime = (Date.now() - matchStartAt) / 1000;
    }
  }
  function updateCamera(dt) {
    var target;
    if (flyTo) {
      camera.position.lerp(flyTo.pos, 1 - Math.pow(0.001, dt));
      camTarget.lerp(flyTo.target, 1 - Math.pow(0.001, dt));
      if (camera.position.distanceTo(flyTo.pos) < 0.5) flyTo = null;
      camera.lookAt(camTarget);
      return;
    }
    if (phase === 'spectator' || (player && !player.alive)) {
      var w = watchedPerson();
      if (!w) return;
      if (spectatorView === 'panorama') {
        camTarget.lerp(new THREE.Vector3(w.group.position.x, 4, w.group.position.z), 0.08);
        camera.position.set(camTarget.x + 30, 25, camTarget.z + 30);
      } else if (spectatorView === 'follow') {
        camTarget.lerp(w.group.position, 0.12);
        camera.position.set(w.group.position.x + Math.sin(camAngle) * camDist, camHeight + 4, w.group.position.z + Math.cos(camAngle) * camDist);
      } else if (spectatorView === 'shoulder') {
        camTarget.lerp(new THREE.Vector3(w.group.position.x, 6, w.group.position.z), 0.15);
        camera.position.set(w.group.position.x + Math.sin(camAngle) * 5, 7, w.group.position.z + Math.cos(camAngle) * 5);
      } else {
        camTarget.lerp(new THREE.Vector3(0, 4, 0), 0.05);
        camera.position.set(Math.sin(camAngle) * camDist, camHeight, Math.cos(camAngle) * camDist);
      }
      camera.lookAt(camTarget);
      return;
    }
    if (player) {
      camTarget.lerp(player.group.position, 0.15);
      camera.position.set(
        player.group.position.x + Math.sin(camAngle) * camDist,
        player.group.position.y + camHeight,
        player.group.position.z + Math.cos(camAngle) * camDist);
      camera.lookAt(camTarget);
    } else {
      camera.position.set(0, 45, 90);
      camera.lookAt(0, 4, 0);
    }
  }
  function updateTags() {
    var now = Date.now();
    Object.keys(tagEls).forEach(function (k) {
      var el = tagEls[k];
      if (el._isBubble && el._until && now > el._until) { clearTag(k); }
    });
    function place(person, tagId, bubbleText) {
      if (!person) return;
      var v = new THREE.Vector3(person.group.position.x, person.group.position.y + 3.6, person.group.position.z);
      v.project(camera);
      if (v.z > 1) return;
      var x = (v.x * 0.5 + 0.5) * innerWidth, y = (-v.y * 0.5 + 0.5) * innerHeight;
      var nameEl = tagEls[tagId];
      if (!nameEl) { setTag(tagId, person.name, teamColorHex(person.team), false); nameEl = tagEls[tagId]; }
      if (nameEl) { nameEl.style.left = x + 'px'; nameEl.style.top = y + 'px'; }
    }
    if (player) place(player, 'tag-me');
    Object.keys(remotePlayers).forEach(function (k) { place(remotePlayers[k], 'tag-' + k); });
    bots.slice(0, 20).forEach(function (b) { place(b, 'tag-' + b.id); });
  }
  function animate(now) {
    requestAnimationFrame(animate);
    var dt = Math.min(0.05, (now - lastTime) / 1000); lastTime = now;
    var t = now / 1000;
    if (phase.indexOf('round') === 0) {
      matchTime = (Date.now() - matchStartAt) / 1000;
      $('hud-time').textContent = fmtTime(matchTime);
    }
    updateRoundTimer();
    if (window.Rounds) window.Rounds.update(dt);
    if (mode === 'single') updateSingle(dt);
    updatePlayerMovement(dt);
    updateCamera(dt);
    // Động vật: chim bay vòng, vỗ cánh; bướm, cá, cua, khỉ chuyển động.
    birds.forEach(function (b, i) {
      var u = b.userData;
      u.a += dt * u.sp;
      b.position.set(u.cx + Math.cos(u.a) * u.r, u.h, u.cz + Math.sin(u.a) * u.r);
      b.rotation.y = -u.a;
      var flap = Math.sin(t * 10 + i) * 0.6;
      u.wl.rotation.z = flap; u.wr.rotation.z = -flap;
    });
    butterflies.forEach(function (b, i) {
      b.position.y = 5 + Math.sin(t * 3 + i) * 0.8;
      b.position.x += Math.sin(t + i) * 0.01;
    });
    fishes.forEach(function (f, i) {
      f.position.y = 4.5 + Math.max(0, Math.sin(t * 2 + i * 1.7)) * 1.2;
    });
    crabs.forEach(function (c, i) {
      c.position.x += Math.sin(t * 0.8 + i) * 0.02;
    });
    monkeys.forEach(function (m, i) {
      var u = m.userData;
      m.position.y = u.baseY + Math.max(0, Math.sin(t * 2 + u.phase)) * 1.5;
      if (u.wave) u.arm.rotation.z = Math.sin(t * 6) * 0.8;
    });
    minimapTimer += dt;
    if (minimapTimer > 0.12) { minimapTimer = 0; drawMinimap(); updateAliveHUD(); }
    updateTags();
    renderer.render(scene, camera);
  }
  window.addEventListener('resize', function () {
    if (!camera || !renderer) return;
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  // ---- Luồng 6 vòng (mở rộng) ----
  function roundEndStats() {
    var alive = allPersons().filter(function (p) { return p.alive; });
    var elim = roundStartAlive.filter(function (n) {
      return !alive.some(function (p) { return p.name === n; });
    });
    return { survivors: alive.length, eliminated: elim };
  }
  function startRoundCommon(round, game, name, timeLimit, seed) {
    currentRound = round;
    roundTimeLimit = timeLimit || 0;
    roundEndsAt = roundTimeLimit ? Date.now() + roundTimeLimit * 1000 : 0;
    roundStartAlive = allPersons().filter(function (p) { return p.alive; }).map(function (p) { return p.name; });
    updateSingle._r1TimeoutDone = false;
    phase = 'round' + round;
    $('hud-round').textContent = 'VÒNG ' + round + '/' + TOTAL_ROUNDS + ' — ' + (name || ROUND_NAMES[round] || '');
    $('hud-drum').textContent = name || ROUND_NAMES[round] || '';
    hideInterstitial();
    if (round >= 3 && window.Rounds) window.Rounds.startRound(round, game, { timeLimit: roundTimeLimit, local: mode === 'single', seed: seed });
  }
  function onRoundEnd(msg) {
    var st = roundEndStats();
    var survivors = (msg.survivors !== undefined && msg.survivors !== null) ? msg.survivors : st.survivors;
    // Server gửi eliminated là [id]; đổi sang tên để hiển thị.
    var elimNames = (msg.eliminated || []).map(function (id) {
      var pp = allPersons().find(function (x) { return x.id === id; });
      return pp ? pp.name : id;
    });
    showInterstitial(msg.round, survivors, elimNames.length ? elimNames : st.eliminated,
      msg.round < TOTAL_ROUNDS ? ROUND_NAMES[msg.round + 1] : null);
    if (window.Rounds) window.Rounds.endRound();
    phase = 'interstitial';
    clearTimeout(interstitialTimer);
    interstitialTimer = setTimeout(hideInterstitial, 3000);
  }
  function onTick(msg) {
    (msg.players || []).forEach(function (info) {
      if (info.id === myId) return;
      var rp = remotePlayers[info.id];
      if (rp) {
        rp.x = info.x; rp.z = info.z; rp.alive = info.alive;
        rp.group.position.set(info.x, 4, info.z);
      } else {
        syncRemotePlayers([info]);
      }
    });
    updateAliveHUD();
  }
  function showInterstitial(round, survivors, eliminated, nextName) {
    var el = $('interstitial');
    el.innerHTML = '<h2>HẾT VÒNG ' + round + '/' + TOTAL_ROUNDS + ' — ' + (ROUND_NAMES[round] || '') + '</h2>' +
      '<p>Còn sống: <b>' + survivors + '</b> người</p>' +
      (eliminated && eliminated.length
        ? '<p>Bị loại: ' + eliminated.map(function (n) { return escapeHtml(n); }).join(', ') + '</p>'
        : '<p>Không ai bị loại ở vòng này.</p>') +
      (nextName ? '<p>Vòng tiếp theo: <b>' + escapeHtml(nextName) + '</b></p>'
        : '<p>Trận đấu kết thúc — xem bảng xếp hạng.</p>');
    el.classList.remove('hidden');
  }
  function hideInterstitial() { var el = $('interstitial'); if (el) el.classList.add('hidden'); }
  // Kết thúc một vòng ở chế độ chơi đơn: hiện interstitial 3s rồi sang vòng sau.
  function localRoundEnd(round, survivors, eliminated) {
    if (window.Rounds) window.Rounds.endRound();
    showInterstitial(round, survivors, eliminated, round < TOTAL_ROUNDS ? ROUND_NAMES[round + 1] : null);
    phase = 'interstitial';
    clearTimeout(interstitialTimer);
    interstitialTimer = setTimeout(function () {
      hideInterstitial();
      if (!player || !player.alive) {
        // Người chơi đã bị loại: dừng ở bảng xếp hạng những người còn sống.
        showRanking(allPersons().filter(function (p) { return p.alive; })
          .map(function (p) { return { name: p.name, time: Date.now() - matchStartAt }; }));
        return;
      }
      if (round === 1) { showTeamScreenSingle(); return; }
      if (round < TOTAL_ROUNDS) { startRoundLocal(round + 1); return; }
      showRanking(allPersons().filter(function (p) { return p.alive; })
        .map(function (p) { return { name: p.name, time: Date.now() - matchStartAt }; }));
    }, 3000);
  }
  function startRoundLocal(round) {
    var game = ROUND_GAMES[round], name = ROUND_NAMES[round];
    currentRound = round; roundTimeLimit = ROUND_TIME_LIMITS[game] || 90; roundEndsAt = Date.now() + roundTimeLimit * 1000;
    roundStartAlive = allPersons().filter(function (p) { return p.alive; }).map(function (p) { return p.name; });
    phase = 'round' + round;
    $('hud-round').textContent = 'VÒNG ' + round + '/' + TOTAL_ROUNDS + ' — ' + name;
    $('hud-drum').textContent = name;
    hideInterstitial();
    if (window.Rounds) window.Rounds.startRound(round, game, { timeLimit: roundTimeLimit, local: true, seed: Date.now() });
  }
  function updateRoundTimer() {
    var wrap = $('round-timer-wrap'), fill = $('round-timer-fill'), txt = $('hud-round-time');
    if (!wrap || !fill || !txt) return;
    if (roundEndsAt && phase.indexOf('round') === 0) {
      var remain = Math.max(0, (roundEndsAt - Date.now()) / 1000);
      wrap.classList.remove('hidden'); txt.classList.remove('hidden');
      txt.textContent = 'Còn ' + fmtTime(remain) + (currentRound === 1 ? ' — về đích trước khi hết giờ!' : ' — ' + (ROUND_NAMES[currentRound] || ''));
      fill.style.width = (roundTimeLimit ? Math.round(remain / roundTimeLimit * 100) : 0) + '%';
      txt.classList.toggle('urgent', remain <= 30);
      fill.classList.toggle('urgent', remain <= 30);
    } else {
      wrap.classList.add('hidden'); txt.classList.add('hidden');
    }
  }

  // Cầu nối cho rounds.js (và shop.js): chỉ đọc/gọi qua đây, không chạm biến trong IIFE.
  window.__game = {
    get mode() { return mode; },
    get phase() { return phase; },
    set phase(v) { phase = v; },
    get myId() { return myId; },
    get myTeam() { return myTeam; },
    get player() { return player; },
    get bots() { return bots; },
    get scene() { return scene; },
    get matchStartAt() { return matchStartAt; },
    allPersons: allPersons, eliminate: eliminate, sendWS: sendWS, toast: toast,
    setTag: setTag, clearTag: clearTag, updateAliveHUD: updateAliveHUD,
    teamColorHex: teamColorHex, TEAM_COLORS: TEAM_COLORS, TEAM_NAMES: TEAM_NAMES,
    localRoundEnd: localRoundEnd, showInterstitial: showInterstitial, hideInterstitial: hideInterstitial,
    setHudDrum: function (t) { $('hud-drum').textContent = t; },
    project: function (x, y, z) {
      var v = new THREE.Vector3(x, y, z); v.project(camera);
      return { x: (v.x * 0.5 + 0.5) * innerWidth, y: (-v.y * 0.5 + 0.5) * innerHeight, behind: v.z > 1 };
    }
  };

  // shop.js dùng lại kết nối WebSocket của game qua window.__sendWS (không mở mới).
  window.__sendWS = sendWS;
  if (window.__hoiShopQueue && window.__hoiShopQueue.length) {
    window.__hoiShopQueue.forEach(function (m) { sendWS(m); });
    window.__hoiShopQueue = [];
  }

  if (window.THREE) { buildWorld(); animate(performance.now()); }
  else { document.addEventListener('DOMContentLoaded', function () { if (window.THREE) { buildWorld(); animate(performance.now()); } }); }
})();
