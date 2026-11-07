/* Trống Hội & Cầu Khỉ — client.
 * Three.js qua CDN, không cần build step. Chế độ chơi đơn chạy hoàn toàn ở client,
 * chế độ multiplayer lấy nhịp trống/chiêng, loại, chia team, ván yếu, lượt cầu
 * và chat từ server qua WebSocket. Không dùng tài sản Squid Game hay Minecraft.
 *
 * Cảnh / camera / minimap / du lịch / chat: port từ bản prototype 3D 1 vòng
 * (artifact prototype-game-3d-1-vong), điều chỉnh theo trạng thái của repo:
 * START_Z/FINISH_Z của server (35/-35), luồng số vòng KHÔNG giới hạn,
 * protocol WebSocket,
 * CHIA TEAM (không thắng/thua theo team) và economy hooks (shop.js) giữ nguyên.
 */
(function () {
  'use strict';
  var START_Z = 35, FINISH_Z = -35;
  var TRACK_LEN = START_Z - FINISH_Z;
  var TRACK_HALF_W = 15;
  var TEAM_COLORS = ['#e53935', '#f9a825', '#43a047'];
  var TEAM_NAMES = ['Đỏ', 'Vàng', 'Xanh lá'];
  var VILLAGES = ['Hải Hậu', 'Hải Lý', 'Hải Tiến', 'Hải Châu', 'Hải Anh', 'Hải Quang', 'Hải Đông', 'Hải Tây'];

  // ---- Dữ liệu đảo du lịch: 11 đảo, mỗi đảo một hình dáng, icon, góc camera
  // và câu chuyện riêng (port từ POIS của bản prototype).
  var TOUR_ISLANDS = [
    { id: 'hoi-lang', name: 'Đảo Hội Làng', label: 'Chuyện trong game', x: 0, z: 0, size: 34, y: 2, yaw: 0.7, pitch: 0.42, dist: 95, icon: 'village',
      feat: 'Đảo đỉnh bằng có làng quê, sân đình, ao sen',
      story: 'Chuyện trong thế giới game: Đảo Hội Làng là "sân nhà" của lễ hội trống — trong game tương truyền ai thắng cả hai vòng sẽ được khắc tên lên biển cổng đảo. Đỉnh đảo bằng phẳng nên làng mới dựng được sân đình, lũy tre, ao sen và hồ cá; vành bãi cát ôm trọn đảo, cua bò trên cát, cá nhảy gần bờ, bốn bề là biển và xa xa là cả vịnh đá vôi nghìn đảo.' },
    { id: 'trong-mai', name: 'Hòn Trống Mái', label: 'Truyền thuyết dân gian', x: -215, z: -165, size: 22, y: 7, yaw: 0.62, pitch: 0.3, dist: 68, icon: 'pair',
      feat: 'Hai khối đá nghiêng vào nhau như gà chọi, khe hở ở giữa',
      story: 'Truyền thuyết dân gian: Xưa có chàng ngư phủ nghèo hiền lành, ngày ngày ra khơi kéo lưới; nàng tiên trên trời thương tình hóa thân thành con cò trắng xuống giúp chàng. Trời quở phạt mối duyên tiên — người, nên cả hai hóa đá giữa vịnh thành một đôi gà: trống và mái chọi nhau mà không rời nhau — biểu tượng chung thủy của Hạ Long. Trong game: khối trái to, đỉnh bằng có cây là "trống"; khối phải mảnh, nhọn, nghiêng sang là "mái"; giữa là khe hở, chân đá sẫm ngấn nước, không bãi cát, mặt đá còn vết nứt dọc và dây leo bám vách.' },
    { id: 'ti-top', name: 'Đảo Ti Tốp', label: 'Chuyện lịch sử thật', x: 238, z: -150, size: 26, y: 12, yaw: -0.68, pitch: 0.36, dist: 88, icon: 'cone',
      feat: 'Núi nón dốc phủ cây + bãi cát lưỡi liềm + cầu tàu',
      story: 'Tư liệu thật: Tên cũ của đảo là Cát Nàng. Năm 1962, nhà du hành vũ trụ Liên Xô Gherman Titov — người thứ hai của nhân loại bay vào vũ trụ — cùng Chủ tịch Hồ Chí Minh ra thăm đảo; Bác Hồ đặt tên đảo là Ti Tốp theo tên ông để ghi nhớ chuyến thăm đó. Bãi tắm ở chân đảo cong hình vầng trăng khuyết. Trong game: núi nón dốc phủ cây, tre mọc từng cụm trên sườn, dừa ở bãi cát lưỡi liềm, cua bò trên cát, cầu tàu vươn ra biển và thuyền neo phía bãi.' },
    { id: 'thap-da', name: 'Vịnh Tháp Đá', label: 'Chuyện trong game', x: 15, z: -262, size: 24, y: 9, yaw: 0.05, pitch: 0.38, dist: 105, icon: 'towers',
      feat: 'Cụm tháp đá cao thấp khác nhau, khe nước hẹp ở giữa',
      story: 'Chuyện trong thế giới game: Ngư dân trong game gọi đây là "vịnh trú bão" — các tháp đá cao thấp chen nhau chắn gió, khe nước hẹp ở giữa là lối thuyền lách vào né sóng, để lại vệt trắng sau đuôi. Truyền thuyết dân gian của vùng vịnh kể rồng mẹ cùng đàn rồng con phun châu ngọc xuống biển, ngọc hóa thành muôn đảo chắn giặc — cụm tháp này là một "đàn rồng con" như thế. Mỗi tháp đều có cây trên đỉnh và dây leo bám vách, chim lượn vòng quanh tháp cao nhất.' },
    { id: 'yen-ngua', name: 'Đảo Yên Ngựa', label: 'Chuyện trong game', x: 255, z: 95, size: 22, y: 7, yaw: -1.15, pitch: 0.3, dist: 74, icon: 'saddle',
      feat: 'Hai đỉnh nối nhau bằng yên ngựa phủ cây',
      story: 'Chuyện trong thế giới game: Dân làng kể có con ngựa trời khổng lồ phi qua vịnh, mệt quá nằm nghỉ giữa biển, lưng võng xuống thành yên ngựa, hai đầu nhô lên thành hai đỉnh phủ cây. Ai bơi qua đúng chỗ "yên" lúc bình minh sẽ may mắn cả mùa cá — đó là chuyện kể trong game; còn hình dáng hai đỉnh nối bằng yên thấp phủ tre và hoa thì nhìn từ xa là đọc ra ngay, không lẫn với đảo nào khác.' },
    { id: 'hang-vom', name: 'Đảo Hang Vòm', label: 'Chuyện trong game', x: -245, z: 60, size: 22, y: 6, yaw: 1.15, pitch: 0.27, dist: 66, icon: 'arch',
      feat: 'Khối đá rộng có vòm hang tối mở ra mặt nước ở chân',
      story: 'Chuyện trong thế giới game: Vòm hang tối ở chân đảo là nơi thuyền buôn trong game xưa neo tránh bão, và lời đồn còn giấu một kho đèn dầu của lái buôn trong hang — chưa ai tìm thấy. Kiểu chuyện này gắn với nhiều hang thật ở Hạ Long, nơi ngư dân trú bão từ bao đời. Khối đá rộng và thấp, đỉnh là thảm cây phẳng, dây leo rủ ngay miệng hang, thuyền nhỏ có thể ghé sát cửa hang.' },
    { id: 'cau-khi', name: 'Cầu Khỉ Sương Mù', label: 'Chuyện trong game', x: 0, z: -115, size: 20, y: 3, yaw: 0.5, pitch: 0.34, dist: 55, icon: 'bridge',
      feat: 'Ba cầu song song theo đội nối đảo chính với đảo cuối',
      story: 'Chuyện trong thế giới game: Ba chiếc cầu ván song song của vòng 2 — mỗi đội một cầu, dây thừng nhuộm màu đội — bắc qua biển nối đảo chính với đảo cuối, chìm trong sương. Chia đội chỉ để qua cầu theo lượt cho có trật tự: ai rớt cầu là bị loại cá nhân, không có đội thắng đội thua. Từ đây bạn vừa ngắm cầu, vừa theo dõi người chơi đang qua cầu.' },
    { id: 'dinh-huong', name: 'Hòn Đỉnh Hương', label: 'Chuyện trong game', x: -90, z: -255, size: 18, y: 4, yaw: 0.35, pitch: 0.3, dist: 58, icon: 'incense',
      feat: 'Khối đá như lư hương khổng lồ: mặt đỉnh phẳng trên ba chân đá',
      story: 'Tư liệu & tên gọi thật: Hòn Đỉnh Hương là đảo đá thật trong vịnh — nhìn từ xa giống hệt một chiếc lư hương khổng lồ đặt trên mặt biển: ba chân đá đỡ phần đỉnh phẳng. Truyền thuyết dân gian quanh vùng vịnh xem nó như nén hương thắp giữa trời nước để tạ ơn biển khơi. Trong game: đỉnh đảo phủ cây xanh, có vết nứt dọc mặt đá và đèn dấu đỏ để thuyền đêm nhận ra từ xa.' },
    { id: 'con-coc', name: 'Hòn Con Cóc', label: 'Chuyện trong game', x: 120, z: -265, size: 18, y: 3, yaw: -0.3, pitch: 0.28, dist: 52, icon: 'toad',
      feat: 'Khối đá thấp bè như chú cóc ngồi, hai u mắt trên đầu',
      story: 'Truyền thuyết dân gian: Hòn Con Cóc gắn với tích "cóc kiện trời" — chú cóc ngồi chồm hỗm giữa vịnh, ngẩng đầu chờ mưa, hai u đá trên đầu như đôi mắt. Dân chài nhìn thấy dáng cóc là nhớ tích xưa. Trong game, đây là đảo thấp và bè nhất vịnh: lưng phủ thảm cây thấp, bụi cây và dây leo bám quanh chân đá, đèn dấu vàng ở mỏm đá phía đông.' },
    { id: 'soi-sim', name: 'Đảo Soi Sim', label: 'Chuyện trong game', x: -300, z: 130, size: 24, y: 5, yaw: 0.9, pitch: 0.34, dist: 78, icon: 'sim',
      feat: 'Đảo thoai thoải phủ rừng sim tím, dừa ở bãi cát',
      story: 'Tư liệu thật: Soi Sim là đảo thật ở phía tây nam Vịnh Hạ Long, nổi tiếng với rừng sim tự nhiên — mùa hè hoa sim nở tím cả sườn đảo, sau đó là mùa quả sim chín mọng. Trong game: đảo thoai thoải thay vì vách dựng đứng, bụi sim tím điểm khắp sườn, dừa ở bãi cát, bướm bay quanh hoa cả ngày và đàn chim lượn trên đỉnh.' },
    { id: 'dao-khi', name: 'Đảo Khỉ', label: 'Chuyện trong game', x: 300, z: 170, size: 24, y: 5, yaw: -0.9, pitch: 0.32, dist: 72, icon: 'monkey',
      feat: 'Hai mỏm đá có cây, đàn khỉ voxel ngồi trên đá vẫy tay',
      story: 'Chuyện trong thế giới game: Đây là đảo của đàn khỉ — khỉ ngồi trên mỏm đá ngắm thuyền qua lại, một con gãi đầu, hai con vẫy tay, thỉnh thoảng một con nhảy phóc sang mỏm đá bên kia. Ngoài đời, vùng Cát Bà — Hạ Long cũng có đảo khỉ thật với khỉ sống tự nhiên. Trong game cứ ghé đảo là thấy khỉ chuyển động, không con nào đứng yên như tượng.' }
  ];

  var scene, camera, renderer, raycaster, pointer;
  var player, playerGroup, bots = [], remotePlayers = {};
  var birds = [], butterflies = [], fishes = [], crabs = [], monkeys = [];
  var tourGroups = {}, detailedIsland = null;
  var mode = null, ws = null, myId = null, isHost = false, roomCode = null;
  var phase = 'menu'; // menu | flyover | countdown | round1 | team | round2 | round3..6 | interstitial | spectator | finished | tourism
  var drumState = 'drum', drumTimer = 0, matchTime = 0, matchStartAt = 0;
  // Timer trận tổng (P1-07, ĐÃ QUYẾT tạm 2026-11-06 — 30 phút, QC lật
  // được): server là nguồn chuẩn và gửi matchTimeLimit theo từng tin
  // roundStart; hằng số dưới đây là mặc định cho chơi đơn (và fallback).
  // matchTimeLimit = 0 nghĩa là không giới hạn (phòng QC / chưa vào trận).
  var MATCH_TIME_LIMIT_S = 30 * 60, matchTimeLimit = 0;
  var aliveCount = 0, aliveBefore = 0;
  // ---- Luồng số vòng KHÔNG giới hạn (Sudo 2026-11-06) ----
  // Vòng 1-2 cố định; từ vòng 3, trò bốc theo chu kỳ kho 5 trò (không lặp
  // trong chu kỳ) và Rồng Rắn chỉ là chung kết khi <= 6 người sống lúc bắt
  // đầu vòng. Xem localGameForRound / localPoolCycle dưới đây (phải khớp
  // server: games.drawPoolCycle + roundEntryFor).
  var ROUND_NAMES = { 1: 'Trống Hội', 2: 'Cầu Khỉ Sương Mù' };
  var POOL_GAMES = ['keo-co', 'to-he', 'bit-mat', 'o-an-quan', 'nhay-bao-bo'];
  var POOL_NAMES = { 'keo-co': 'Kéo Co Nhịp', 'to-he': 'Nặn Tò He', 'bit-mat': 'Bịt Mắt Bắt Dê', 'o-an-quan': 'Ô Ăn Quan', 'nhay-bao-bo': 'Nhảy Bao Bố', 'rong-ran': 'Rồng Rắn Cướp Cờ' };
  var ROUND_TIME_LIMITS = { 'keo-co': 60, 'to-he': 60, 'bit-mat': 60, 'o-an-quan': 90, 'nhay-bao-bo': 60, 'rong-ran': 120 };
  // Không còn TOTAL_ROUNDS: trận chỉ kết thúc khi còn 1 người (xem BRD OD-11).
  function localRng(seed) {
    var a = (seed || 1) >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var x = a;
      x = Math.imul(x ^ (x >>> 15), x | 1);
      x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }
  // Xáo kho 5 trò của một chu kỳ (seed theo thời điểm bắt đầu trận + chu kỳ);
  // không lặp liền kề qua biên chu kỳ: chu kỳ mới mở đầu bằng trò cuối của
  // chu kỳ trước thì đổi chỗ 2 trò đầu (giống server drawPoolCycle).
  function localPoolCycle(cycle) {
    var rng = localRng((matchStartAt || 1) + cycle * 7919);
    var order = [0, 1, 2, 3, 4];
    for (var i = order.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var tmp = order[i]; order[i] = order[j]; order[j] = tmp;
    }
    if (cycle > 0) {
      var prev = localPoolCycle(cycle - 1);
      if (prev[prev.length - 1] === order[0]) { var t2 = order[0]; order[0] = order[1]; order[1] = t2; }
    }
    return order;
  }
  // Trò của vòng n ở chơi đơn (khớp server roundEntryFor): vòng 1-2 cố định;
  // từ vòng 3, <= 6 người sống thì là chung kết Rồng Rắn, ngược lại bốc
  // theo chu kỳ kho. aliveCount = số người sống lúc bắt đầu vòng.
  function localGameForRound(round, aliveCount) {
    if (round === 1) return 'trong-hoi';
    if (round === 2) return 'cau-khi';
    if (aliveCount <= 6) return 'rong-ran';
    var idx = (round - 3) % POOL_GAMES.length;
    var cycle = Math.floor((round - 3) / POOL_GAMES.length);
    return POOL_GAMES[localPoolCycle(cycle)[idx]];
  }
  function localNameForRound(round, aliveCount) {
    var g = localGameForRound(round, aliveCount);
    if (round === 1) return 'Trống Hội';
    if (round === 2) return 'Cầu Khỉ Sương Mù';
    return POOL_NAMES[g] + (g === 'rong-ran' ? ' (CHUNG KẾT)' : '');
  }
  var currentRound = 0, currentRoundName = '', currentRoundGame = null, roundTimeLimit = 0, roundEndsAt = 0, roundStartAlive = [], roundTarget = 0, roundIsFinal = false;
  var lastInputSentAt = 0, jumpQueued = false, interstitialTimer = null;
  var keys = {}, typing = false, joy = { x: 0, y: 0, active: false };
  // Camera người chơi (hệ damping của bản prototype).
  var camYaw = 0, camPitch = 0.32, camDist = 8.5;
  var camTarget = new THREE.Vector3();
  var camFocusSmooth = new THREE.Vector3(0, 1.25, START_Z);
  var camLookSmooth = new THREE.Vector3(0, 1.25, 0);
  var camYawCur = 0, camPitchCur = 0.32, camInit = false;
  var flyT = 0, introBlend = 0, countdownT = 0, countdownStep = 4, shakeT = 0;
  var flyoverTitleEl = null, countdownEl = null;
  var spectatorView = 'follow', watchedId = null, spectatorList = [];
  var myTeam = null, myBridgeStep = 0, myBridge = null, teamQueue = [], teamLeader = null;
  var teamLeaders = {}, brokenSteps = {}, teamAutoTimer = null;
  var teamQueues = {}, teamNames = {}; // multi: thứ tự lượt từng đội + tên theo id (server gửi ở phase 'team')
  // Vòng 2 — đồng hồ LƯỢT 30 giây/người (DECIDED 2026-11-05, tạm, QC lật được;
  // xem BRD §9.4 OD-09). 9 bước cầu, ~3 giây suy nghĩ mỗi bước: đủ để nghĩ,
  // không đủ để đứng chờ cho cầu lộ hết ván rồi mới đi. Đồng hồ chạy từ lúc
  // lượt bắt đầu — lượt không bắt đầu và lượt đi quá chậm là một: hết 30 giây
  // mà chưa qua hết cầu thì người đó bị loại, lượt chuyển cho người tiếp theo.
  // Server (multi) là nguồn chuẩn; client (chơi đơn) áp cùng luật.
  var R2_TURN_LIMIT_S = 30;
  // Chơi đơn: lượt đang chạy của ai (key 'me' hoặc 'bot:<tên>'), bắt đầu lúc nào.
  var r2Turn = { key: null, startedAt: 0, endsAt: 0 };
  // Multi: thời điểm hết lượt từng đội (server gửi kèm tin 'turn').
  // Đồng hồ lượt 30 giây của đội mình lấy từ đây để hiện đếm ngược trên HUD.
  var teamTurnEndsAt = {};
  var localBridges = {}, localRanking = [];
  // ---- CHẾ ĐỘ QC (FR-46, chỉ test) ----
  // QC cho phép nhảy thẳng tới vòng bất kỳ để test nhanh (qua mỗi vòng thật
  // rất khó nên test hết các vòng sẽ rất lâu). TẮT mặc định, không ảnh hưởng
  // trận thường: trận QC không thưởng Hội Xu / XP Pass, không tính BXH.
  var qcMode = false, qcNoElim = false, qcStartRound = 1, qcPlan = null, qcJumpedRound = 0;
  // Số người còn sống khi vào thẳng vòng n ở chơi đơn (61 người): áp tỉ lệ
  // giữ lại theo chu kỳ (0.614, 0.536, 0.467, 0.343, 0.25, 0.167) từ 61 —
  // games.scaledTargets(61) = [37, 20, 9, 3, 1]. Không hardcode bảng 6 vòng:
  // vòng nào cũng tính bằng cùng công thức, và QC lấy tối thiểu 2 người
  // (để vòng chung kết còn test được cờ, và các vòng sau vòng 6 vẫn có bot).
  var QC_CURVE_RATIOS = [0.614, 0.536, 0.467, 0.343, 0.25, 0.167];
  function qcAliveForRound(n) {
    var cur = 61;
    for (var i = 1; i < n; i++) {
      var ratio = QC_CURVE_RATIOS[(i - 1) % QC_CURVE_RATIOS.length];
      cur = Math.max(1, Math.min(cur - 1, Math.round(cur * ratio)));
    }
    return Math.max(2, cur); // sàn QC: luôn có ít nhất người chơi + 1 bot
  }
  var QC_START_ALIVE = { 1: 61, 2: 37, 3: 20, 4: 9, 5: 3, 6: 2 }; // giữ để tương thích cũ; dùng qcAliveForRound()
  // RNG có seed (mulberry32) để xáo thứ tự lượt vòng 2 khi nhảy thẳng mà
  // không có thời gian về đích vòng 1 — seed là thời điểm bắt đầu trận.
  function qcRng() {
    var a = (matchStartAt || Date.now()) >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function qcRoundName(r) {
    if (qcPlan && qcPlan[r - 1] && qcPlan[r - 1].name) return qcPlan[r - 1].name;
    if (r === 1) return 'Trống Hội';
    if (r === 2) return 'Cầu Khỉ Sương Mù';
    return localNameForRound(r, qcAliveForRound(r));
  }
  function renderQcButtons() {
    var box = $('qc-round-btns'); if (!box) return;
    var html = '';
    for (var r = 1; r <= 8; r++) { // QC nhảy được qua vòng 6 (vòng 7, 8, ...)
      var name = (mode === 'multi' && !qcPlan && r >= 3 && r <= 5)
        ? 'Vòng ' + r + ' · bốc từ kho' : qcRoundName(r);
      html += '<button type="button" class="qcRoundBtn' + (r === qcStartRound ? ' on' : '') +
        '" data-qc-round="' + r + '">V' + r + ' · ' + escapeHtml(name) +
        (mode === 'multi' ? '' : ' · ' + qcAliveForRound(r) + ' người') + '</button>';
    }
    box.innerHTML = html;
    var btns = box.querySelectorAll('[data-qc-round]');
    for (var i = 0; i < btns.length; i++) {
      btns[i].onclick = function () { qcStartRound = Number(this.getAttribute('data-qc-round')); renderQcButtons(); };
    }
  }
  function renderQcBarButtons() {
    var box = $('qcBarRounds'); if (!box) return;
    var html = '';
    for (var r = 1; r <= 8; r++) { // QC nhảy được qua vòng 6
      html += '<button type="button" class="qcRoundBtn" data-qc-bar-round="' + r + '">V' + r + '</button>';
    }
    box.innerHTML = html;
    var btns = box.querySelectorAll('[data-qc-bar-round]');
    for (var i = 0; i < btns.length; i++) {
      btns[i].onclick = function () { qcSkipTo(Number(this.getAttribute('data-qc-bar-round'))); };
    }
  }
  function syncQcBar() {
    var bar = $('qcBar'); if (!bar) return;
    var show = qcMode && mode && (phase.indexOf('round') === 0 || phase === 'team' || phase === 'interstitial' || phase === 'spectator');
    bar.classList.toggle('hidden', !show);
    var br = $('qcBarRound');
    if (br) br.textContent = currentRound ? ('Vòng ' + currentRound + ' — ' + (currentRoundName || '')) : '—';
  }
  function qcSkipTo(n) {
    n = Math.max(1, Math.min(20, Number(n) || 1)); // không giới hạn ở vòng 6
    // Chặn ở tầng hàm, không chỉ tầng giao diện: trận thường không bao giờ
    // nhảy vòng được, kể cả khi ai đó gọi hàm này trực tiếp.
    if (!qcMode) { toast('Chế độ QC chưa bật — không nhảy vòng được.'); return; }
    if (mode === 'single') { qcJumpSingle(n); return; }
    if (mode === 'multi') {
      if (!isHost) { toast('Chỉ chủ phòng mới nhảy vòng trong chế độ QC.'); return; }
      sendWS({ type: 'qcSkip', round: n }); return;
    }
    toast('Vào trận QC rồi mới nhảy vòng được.');
  }
  // Chuẩn bị đội hình chơi đơn cho vòng n: đúng số người còn sống theo
  // đường loại (QC_START_ALIVE), người chơi luôn còn sống, bot thừa ẩn đi.
  function qcSetupSingle(n) {
    var alive = qcAliveForRound(n);
    var shuffled = bots.slice();
    for (var i = shuffled.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = t;
    }
    var keep = Math.max(0, alive - 1);
    bots.forEach(function (b) {
      var k = shuffled.indexOf(b) < keep;
      b.alive = k; b.finished = false; b.finishTime = null; b.falling = false;
      b.group.visible = k;
      if (k) { b.x = -13.5 + Math.random() * 27; b.z = START_Z - Math.random() * 8; b.group.position.set(b.x, 0, b.z); }
    });
    player.alive = true; player.spectator = false; player.finished = false;
    player.finishTime = null; player.falling = false; player.dist = 0;
    player.x = 0; player.z = START_Z; player.group.position.set(0, 0, START_Z);
    player.group.visible = true;
    exitSpectator();
    setSpectatorBanner(false);
    myTeam = null; myBridgeStep = 0; localBridges = {}; localRanking = [];
    brokenSteps = {}; teams = [];
    leaderArrows.forEach(function (a) { a.visible = false; });
    updateAliveHUD();
  }
  // Nhảy thẳng tới vòng n ở chơi đơn (bắt đầu trận QC hoặc nút nhảy giữa trận).
  function qcJumpSingle(n) {
    if (mode !== 'single' || !player) return;
    if (window.Rounds && window.Rounds.currentRound && window.Rounds.currentRound()) window.Rounds.endRound();
    hideInterstitial(); hideTeamPanel();
    var ts = $('team-screen'); if (ts) ts.classList.add('hidden');
    qcJumpedRound = n;
    matchStartAt = Date.now();
    qcSetupSingle(n);
    if (n === 1) { startRoundCommon(1, 'trong-hoi', 'Trống Hội', 120); }
    else if (n === 2) {
      // Không có thời gian về đích vòng 1: gán finishTime giả từ seeded RNG
      // để assignTeamsAndPlace xáo thứ tự lượt (team screen ghi rõ điều này).
      var rng = qcRng();
      randomizeBridge();
      allPersons().filter(function (p) { return p.alive; }).forEach(function (p) { p.finished = true; p.finishTime = rng() * 1000; });
      showTeamScreenSingle();
    } else { startRoundLocal(n); }
    syncQcBar();
  }
  var lastChatAt = 0, hideBubbles = false;
  var labelsEl = document.getElementById('labels');
  var tagEls = {};

  // ---- Cầu nối id: code repo cũ dùng id kebab-case, HTML mới dùng id của
  // bản artifact (camelCase). $() dịch qua bảng này nên mọi wiring cũ đều chạy.
  var ID_ALIASES = {
    'menu': 'startCard', 'btn-start': 'btnStart', 'btn-jump': 'btnJump',
    'joystick': 'joyBase', 'joy-knob': 'joyKnob',
    'hud-round': 'hudRound', 'hud-time': 'hudTime', 'hud-alive': 'hudAlive',
    'hud-countdown': 'hudCountdown',
    'hud-drum': 'hudState', 'hud-round-time': 'hud-round-time',
    'progress-fill': 'progressFill',
    'chat-panel': 'chatPanel', 'chat-input': 'chatInput', 'chat-log': 'chatMsgs',
    'btn-chat-open': 'btnChatToggle', 'btn-close-chat': 'btnChatClose',
    'btn-hide-bubbles': 'btnChatBubbles', 'btn-send-chat': 'chatSend',
    'team-screen': 'teamCard', 'team-list': 'teamCols', 'team-panel': 'teamPanel',
    'btn-to-bridge': 'btnTeamGo',
    'spectator': 'specBanner', 'watched-name': 'specTargetName',
    'btn-prev-person': 'btnSpecPrev', 'btn-next-person': 'btnSpecNext',
    'tourism': 'tourPanel', 'tour-list': 'tourList', 'tour-detail': 'tourInfo',
    'btn-close-tour': 'btnTourBack', 'btn-replay': 'btnTourAgain',
    'btn-back-match': 'btnTourBack', 'btn-panorama': 'btnTourOverview',
    'minimap-box': 'minimapWrap', 'btn-zoom-in': 'btnZoomIn', 'btn-zoom-out': 'btnZoomOut',
    'btn-tour': 'btnTour', 'round-timer-wrap': 'round-timer-wrap',
    'round-timer-fill': 'round-timer-fill'
  };
  function $(id) { return document.getElementById(ID_ALIASES[id] || id); }
  // CSS của artifact bật/tắt joystick và vị trí chat theo class của body.
  function syncBodyMode() {
    var b = document.body;
    b.classList.toggle('playing', phase === 'round1' || phase === 'round2' || phase.indexOf('round') === 0 || phase === 'countdown' || phase === 'flyover');
    b.classList.toggle('spectator', phase === 'spectator');
    b.classList.toggle('touring', phase === 'tourism' || (typeof tour !== 'undefined' && tour && tour.active));
  }
  function toast(msg) {
    var t = $('toast'); if (!t) return;
    t.textContent = msg; t.style.display = 'block';
    clearTimeout(t._h); t._h = setTimeout(function () { t.style.display = 'none'; }, 3000);
  }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function randInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function fmtTime(sec) {
    sec = Math.max(0, Math.floor(sec));
    return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
  }
  function teamColorHex(team) { return team === null || team === undefined ? '#2196f3' : TEAM_COLORS[team]; }
  function dampK(lambda, dt) { return 1 - Math.exp(-lambda * dt); }
  function angleDamp(cur, target, lambda, dt, maxSpeed) {
    var d = target - cur;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    var step = d * dampK(lambda, dt);
    var cap = maxSpeed * dt;
    if (step > cap) step = cap; else if (step < -cap) step = -cap;
    return cur + step;
  }

  // ================= AUDIO (WebAudio, không file ngoài — port từ prototype) =================
  var AC = null;
  function ensureAudio() {
    if (!AC) {
      try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; }
    }
    if (AC && AC.state === 'suspended') AC.resume();
  }
  function noiseBuffer(dur) {
    var len = Math.floor(AC.sampleRate * dur);
    var buf = AC.createBuffer(1, len, AC.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }
  /* Bus vang vọng kiểu trống hội: delay phản hồi + lọc trầm, tạo tiếng dội giữa núi đá */
  var drumBus = null, drumEcho = null;
  function getDrumOut() {
    if (!AC) return null;
    if (!drumBus) {
      drumBus = AC.createGain(); drumBus.gain.value = 1;
      drumBus.connect(AC.destination);
      drumEcho = AC.createDelay(1); drumEcho.delayTime.value = 0.17;
      var fb = AC.createGain(); fb.gain.value = 0.42;
      var ef = AC.createBiquadFilter(); ef.type = 'lowpass'; ef.frequency.value = 1100;
      var wet = AC.createGain(); wet.gain.value = 0.55;
      drumBus.connect(drumEcho); drumEcho.connect(ef); ef.connect(fb); fb.connect(drumEcho);
      ef.connect(wet); wet.connect(AC.destination);
    }
    return drumBus;
  }
  function drumHit(vol) {
    if (!AC) return;
    var out = getDrumOut(); if (!out) return;
    var t = AC.currentTime;
    var v = Math.min(1.5, (vol || 0.9) * 1.35);
    var osc = AC.createOscillator(), g = AC.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(170, t);
    osc.frequency.exponentialRampToValueAtTime(46, t + 0.2);
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
    osc.connect(g); g.connect(out);
    osc.start(t); osc.stop(t + 0.45);
    var o2 = AC.createOscillator(), g2 = AC.createGain();
    o2.type = 'sine'; o2.frequency.setValueAtTime(86, t);
    o2.frequency.exponentialRampToValueAtTime(52, t + 0.3);
    g2.gain.setValueAtTime(v * 0.55, t);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    o2.connect(g2); g2.connect(out);
    o2.start(t); o2.stop(t + 0.52);
    var src = AC.createBufferSource(); src.buffer = noiseBuffer(0.09);
    var ng = AC.createGain(), nf = AC.createBiquadFilter();
    nf.type = 'lowpass'; nf.frequency.value = 900;
    ng.gain.setValueAtTime(v * 0.4, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    src.connect(nf); nf.connect(ng); ng.connect(out);
    src.start(t); src.stop(t + 0.1);
  }
  function gongHit() {
    if (!AC) return;
    var t = AC.currentTime;
    var partials = [164.8, 247.1, 329.6, 440.5, 587.3];
    var gains = [0.50, 0.34, 0.26, 0.16, 0.09];
    for (var i = 0; i < partials.length; i++) {
      var o = AC.createOscillator(), g = AC.createGain();
      o.type = 'sine'; o.frequency.value = partials[i] * (1 + (Math.random() - 0.5) * 0.002);
      g.gain.setValueAtTime(gains[i], t);
      g.gain.exponentialRampToValueAtTime(0.0008, t + 2.6);
      o.connect(g); g.connect(AC.destination);
      o.start(t); o.stop(t + 2.7);
    }
    var src = AC.createBufferSource(); src.buffer = noiseBuffer(0.25);
    var bp = AC.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2400; bp.Q.value = 1.2;
    var ng = AC.createGain();
    ng.gain.setValueAtTime(0.20, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    src.connect(bp); bp.connect(ng); ng.connect(AC.destination);
    src.start(t); src.stop(t + 0.3);
  }
  function elimSound() {
    if (!AC) return;
    var t = AC.currentTime;
    var o = AC.createOscillator(), g = AC.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(520, t);
    o.frequency.exponentialRampToValueAtTime(110, t + 0.35);
    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    o.connect(g); g.connect(AC.destination);
    o.start(t); o.stop(t + 0.42);
  }
  /* Âm nền vịnh: sóng rì rào (to dần khi gần bờ), gió nhẹ, chim hót rải rác gần lũy tre */
  var amb = { started: false, waveGain: null, windGain: null, birdT: 3, splashGain: null };
  function startAmbient() {
    if (!AC || amb.started) return;
    amb.started = true;
    function loopNoise(filterType, freq, q) {
      var src = AC.createBufferSource(); src.buffer = noiseBuffer(3.7); src.loop = true;
      var f = AC.createBiquadFilter(); f.type = filterType; f.frequency.value = freq; if (q) f.Q.value = q;
      var g = AC.createGain(); g.gain.value = 0;
      src.connect(f); f.connect(g); g.connect(AC.destination); src.start();
      return g;
    }
    amb.waveGain = loopNoise('lowpass', 520);
    amb.windGain = loopNoise('bandpass', 380, 0.6);
    amb.windGain.gain.value = 0.016;
  }
  function birdChirp(vol) {
    if (!AC || vol <= 0.01) return;
    var t = AC.currentTime;
    var n = 2 + Math.floor(Math.random() * 3);
    for (var i = 0; i < n; i++) {
      var o = AC.createOscillator(), g = AC.createGain();
      o.type = 'sine';
      var f0 = 2300 + Math.random() * 1300, tt = t + i * 0.16;
      o.frequency.setValueAtTime(f0, tt);
      o.frequency.exponentialRampToValueAtTime(f0 * (1.25 + Math.random() * 0.3), tt + 0.07);
      o.frequency.exponentialRampToValueAtTime(f0 * 0.9, tt + 0.13);
      g.gain.setValueAtTime(0.0001, tt);
      g.gain.exponentialRampToValueAtTime(vol, tt + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.14);
      o.connect(g); g.connect(AC.destination);
      o.start(tt); o.stop(tt + 0.16);
    }
  }
  function splashSound(vol) {
    if (!AC) return;
    var t = AC.currentTime;
    var src = AC.createBufferSource(); src.buffer = noiseBuffer(0.5);
    var f = AC.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(900, t);
    f.frequency.exponentialRampToValueAtTime(300, t + 0.45);
    var g = AC.createGain();
    g.gain.setValueAtTime(vol || 0.4, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    src.connect(f); f.connect(g); g.connect(AC.destination);
    src.start(t); src.stop(t + 0.52);
  }
  function crackSound() {
    if (!AC) return;
    var t = AC.currentTime;
    var src = AC.createBufferSource(); src.buffer = noiseBuffer(0.16);
    var f = AC.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 700;
    var g = AC.createGain();
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    src.connect(f); f.connect(g); g.connect(AC.destination);
    src.start(t); src.stop(t + 0.18);
  }
  function cheerSound() {
    if (!AC) return;
    var notes = [523.25, 659.25, 783.99, 1046.5];
    for (var i = 0; i < notes.length; i++) {
      (function (idx) {
        var t = AC.currentTime + idx * 0.11;
        var o = AC.createOscillator(), g = AC.createGain();
        o.type = 'triangle'; o.frequency.value = notes[idx];
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.32, t + 0.03);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        o.connect(g); g.connect(AC.destination);
        o.start(t); o.stop(t + 0.55);
      })(i);
    }
  }
  var BAMBOO_POS = [[-22.5, 42], [22.5, 34], [-23, 18], [23.5, -14], [-22.5, -24], [22.5, -34], [-24, 58], [25, 56], [-38, -34], [40, 34]];
  var LAND_CENTERS = [{ x: 0, z: 0, r: 88 }, { x: 0, z: -137, r: 16 }, { x: -215, z: -165, r: 26 }, { x: 238, z: -150, r: 24 }, { x: -245, z: 60, r: 22 }, { x: 255, z: 95, r: 28 }, { x: -90, z: -255, r: 20 }, { x: 120, z: -265, r: 24 }, { x: -300, z: 130, r: 26 }, { x: 300, z: 170, r: 24 }];
  var BIRD_SPOTS = [[-215, -165], [238, -150], [15, -262], [255, 95], [-245, 60], [-90, -255], [120, -265], [-300, 130], [300, 170]];
  function updateAmbient(dt, fx, fz, tNow) {
    if (!AC || !amb.started) return;
    var best = 1e9;
    for (var i = 0; i < LAND_CENTERS.length; i++) {
      var lc = LAND_CENTERS[i];
      var d = Math.abs(Math.hypot(fx - lc.x, fz - lc.z) - lc.r);
      if (d < best) best = d;
    }
    var waveTarget = Math.max(0, 1 - best / 46) * 0.13 + 0.012;
    var swell = 0.75 + 0.25 * Math.sin(tNow * 0.45);
    amb.waveGain.gain.value += (waveTarget * swell - amb.waveGain.gain.value) * Math.min(1, dt * 2);
    amb.windGain.gain.value = 0.013 + 0.006 * (0.5 + 0.5 * Math.sin(tNow * 0.23 + 1.7));
    amb.birdT -= dt;
    if (amb.birdT <= 0) {
      amb.birdT = 3.5 + Math.random() * 6;
      var bd = 1e9;
      for (var j = 0; j < BAMBOO_POS.length; j++) {
        var dd2 = Math.hypot(fx - BAMBOO_POS[j][0], fz - BAMBOO_POS[j][1]);
        if (dd2 < bd) bd = dd2;
      }
      if (bd < 30) birdChirp(Math.max(0, 1 - bd / 30) * 0.11);
      else {
        var bd2 = 1e9;
        for (var j2 = 0; j2 < BIRD_SPOTS.length; j2++) {
          var dd3 = Math.hypot(fx - BIRD_SPOTS[j2][0], fz - BIRD_SPOTS[j2][1]);
          if (dd3 < bd2) bd2 = dd3;
        }
        if (bd2 < 70) birdChirp(Math.max(0, 1 - bd2 / 70) * 0.09);
      }
    }
  }

  // ================= THREE SETUP + helpers =================
  function mat(color, rough, metal) {
    return new THREE.MeshStandardMaterial({ color: color, roughness: rough == null ? 0.85 : rough, metalness: metal == null ? 0 : metal });
  }
  function flatMat(color) { var m = mat(color, 1); m.flatShading = true; return m; }
  function box(w, h, d, material, x, y, z, parent, shadow) {
    var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    m.position.set(x || 0, y || 0, z || 0);
    if (shadow !== false) { m.castShadow = true; m.receiveShadow = true; }
    (parent || scene).add(m);
    return m;
  }
  function cyl(rt, rb, h, seg, material, x, y, z, parent, shadow) {
    var m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material);
    m.position.set(x || 0, y || 0, z || 0);
    if (shadow !== false) { m.castShadow = true; m.receiveShadow = true; }
    (parent || scene).add(m);
    return m;
  }
  function textBoardTexture(text, w, h, bg, fg) {
    var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    var cx2 = cv.getContext('2d');
    cx2.fillStyle = bg; cx2.fillRect(0, 0, w, h);
    cx2.strokeStyle = fg; cx2.lineWidth = 7; cx2.strokeRect(10, 10, w - 20, h - 20);
    cx2.fillStyle = fg; cx2.textAlign = 'center'; cx2.textBaseline = 'middle';
    cx2.font = '900 62px "Be Vietnam Pro", Arial, sans-serif';
    cx2.fillText(text, w / 2, h / 2 + 3);
    var tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace;
    return tx;
  }
  function signBoard(text, bw, bh, bg, fg) {
    var tex = textBoardTexture(text, 512, Math.max(64, Math.round(512 * bh / bw)), bg, fg);
    var sideM = mat(0x5d3a1a, 0.9);
    var faceM = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 });
    var m = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 0.18), [sideM, sideM, sideM, sideM, faceM, sideM]);
    m.castShadow = true;
    return m;
  }

  // World state (port từ prototype).
  var seaMat, sea, mistPlanes = [], isleBobbers = [];
  var isleSwayers = [], beacons = [], birdFlocks = [], butterflies = [], jumpFishes = [], crabs = [];
  var swayers = [], fishes = [], boats = [], farBoats = [], lanterns = [], flags = [], waves = [];
  var distantIslands = [], distantMeshes = [];
  var LOTUS = { x: 35, z: 12, r: 10 }, FISHPOND = { x: -35, z: -8, r: 9 };
  var drumGroup, hostGroup, hostArmL, hostArmR, playerRing, playerArrow, specRing, specArrow;
  var confetti = [], confettiGroup = null;
  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function isleSign(text, x, z, y) {
    var b = signBoard(text, 11, 2.1, '#7a4a24', '#ffedb8');
    b.position.set(x, y || 3.4, z);
    b.rotation.y = Math.atan2(-x, -z);
    scene.add(b);
    box(0.3, (y || 3.4) + 1, 0.3, mat(0x6e4a26, 0.95), x, ((y || 3.4) - 1) / 2 + 0.4, z, scene, false);
    return b;
  }
  function miniBoat(x, z, ry, sailCol) {
    var g = new THREE.Group(); g.position.set(x, -0.95, z); g.rotation.y = ry;
    box(4.2, 0.6, 1.5, mat(0x8a5a2b, 0.9), 0, 0.3, 0, g, false);
    box(0.16, 3.4, 0.16, mat(0x5d3a1a, 0.9), 0, 1.9, 0, g, false);
    box(0.1, 2.2, 1.7, mat(sailCol || 0xf6ead0, 0.95), 0.8, 2.0, 0, g, false);
    scene.add(g);
    isleBobbers.push({ g: g, baseY: -0.95, phase: Math.random() * 6.28 });
  }

  // ---- Cây cối & sự sống cho mọi đảo (mỗi đảo một mật độ/kiểu cây khác nhau) ----
  function vxTree(parent, x, y, z, s, style) {
    var g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(s || 1);
    var greens = [0x4d8f3a, 0x5da348, 0x3e7d33, 0x6fae52];
    if (style === 'palm') {
      var trunk = box(0.2, 2.8, 0.2, mat(0x8a6b35, 0.95), 0.25, 1.4, 0, g, false);
      trunk.rotation.z = -0.16;
      for (var i = 0; i < 5; i++) {
        var a = i * 1.256;
        var fr = box(1.6, 0.1, 0.36, mat(greens[i % 4], 0.9), 0.5 + Math.cos(a) * 0.75, 2.85, Math.sin(a) * 0.75, g, false);
        fr.rotation.y = -a; fr.rotation.z = Math.cos(a) * 0.35;
      }
      box(0.3, 0.3, 0.3, mat(0x6e8b2e, 0.9), 0.45, 2.55, 0.1, g, false);
    } else if (style === 'bamboo') {
      for (var j = 0; j < 4; j++) {
        var sx = (Math.random() - 0.5) * 1.1, sz = (Math.random() - 0.5) * 1.1, h = 3.4 + Math.random() * 1.4;
        box(0.13, h, 0.13, mat(0x7fae56, 0.9), sx, h / 2, sz, g, false);
        box(1.1, 0.6, 1.1, mat(greens[j % 4], 0.9), sx, h + 0.25, sz, g, false);
      }
      isleSwayers.push({ g: g, phase: Math.random() * 6.28, amp: 0.03 });
    } else {
      box(0.34, 1.9, 0.34, mat(0x6e4a26, 0.95), 0, 0.95, 0, g, false);
      box(2.5, 1.2, 2.5, mat(greens[0], 0.9), 0, 2.4, 0, g, false);
      box(1.8, 1.0, 1.8, mat(greens[1], 0.9), 0.5, 3.2, 0.3, g, false);
      box(1.2, 0.8, 1.2, mat(greens[2], 0.9), -0.5, 3.8, -0.2, g, false);
    }
    parent.add(g);
    return g;
  }
  function vxBush(parent, x, y, z, s, col) {
    var g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(s || 1);
    box(1.1, 0.7, 1.1, mat(col || 0x4c8f3d, 0.9), 0, 0.35, 0, g, false);
    box(0.8, 0.55, 0.8, mat(0x5da24a, 0.9), 0.3, 0.75, 0.2, g, false);
    parent.add(g); return g;
  }
  function vxFlowers(parent, x, y, z, n, cols) {
    for (var i = 0; i < (n || 5); i++) {
      var ox = (Math.random() - 0.5) * 2.4, oz = (Math.random() - 0.5) * 2.4;
      box(0.16, 0.3, 0.16, mat(0x4c8f3d, 0.9), x + ox, y + 0.1, z + oz, parent, false);
      box(0.3, 0.3, 0.3, mat(cols[i % cols.length], 0.7), x + ox, y + 0.32, z + oz, parent, false);
    }
  }
  function vxVine(parent, x, y, z, len) {
    box(0.26, len, 0.26, mat(0x3e7d33, 0.95), x, y - len / 2, z, parent, false);
    box(0.5, 0.5, 0.5, mat(0x4c9440, 0.9), x, y - len, z, parent, false);
  }
  function vxBeacon(parent, x, y, z, col) {
    box(0.16, 2.2, 0.16, mat(0x5d3a1a, 0.9), x, y + 1.1, z, parent, false);
    var lampM = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.7, roughness: 0.4 });
    var lamp = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), lampM);
    lamp.position.set(x, y + 2.45, z); parent.add(lamp);
    beacons.push(lampM);
  }
  function updateWildlife(dt, t) {
    for (var i = 0; i < isleSwayers.length; i++) {
      var s = isleSwayers[i];
      s.g.rotation.z = Math.sin(t * 0.9 + s.phase) * s.amp;
      s.g.rotation.x = Math.cos(t * 0.7 + s.phase) * s.amp * 0.7;
    }
    for (var b = 0; b < beacons.length; b++) beacons[b].emissiveIntensity = 0.4 + (Math.sin(t * 2 + b * 1.7) * 0.5 + 0.5) * 0.9;
    for (var f = 0; f < birdFlocks.length; f++) {
      var bd = birdFlocks[f];
      var a = t * bd.sp + bd.ph;
      bd.g.position.set(bd.cx + Math.cos(a) * bd.r, bd.cy + Math.sin(t * 0.7 + bd.hBob) * 1.6, bd.cz + Math.sin(a) * bd.r);
      bd.g.rotation.y = -a;
      var flap = Math.sin(t * bd.fl * 2 + bd.ph * 3) * 0.75;
      bd.wl.rotation.z = flap; bd.wr.rotation.z = -flap;
    }
    for (var bf = 0; bf < butterflies.length; bf++) {
      var B = butterflies[bf];
      var ba = t * B.sp + B.ph;
      B.g.position.set(B.cx + Math.cos(ba) * B.r, B.cy + Math.sin(t * 1.7 + B.ph) * 0.45, B.cz + Math.sin(ba * 1.3) * B.r);
      B.g.rotation.y = -ba;
      var wf = 0.25 + Math.abs(Math.sin(t * 13 + B.ph)) * 0.85;
      B.wl.rotation.z = wf; B.wr.rotation.z = -wf;
    }
    for (var jf = 0; jf < jumpFishes.length; jf++) {
      var J = jumpFishes[jf];
      var u = (t + J.off) % 4.2;
      if (u < 1.0) {
        var k = u;
        J.g.visible = true;
        J.g.position.set(J.x + J.dir * k * 4.2, -0.75 + Math.sin(k * Math.PI) * 2.0, J.z + k * 1.2);
        J.g.rotation.z = J.dir * (0.6 - k * 1.2);
        J.g.rotation.y = J.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      } else J.g.visible = false;
    }
    for (var cb = 0; cb < crabs.length; cb++) {
      var C = crabs[cb];
      var off = Math.sin(t * 0.4 + C.ph);
      C.g.position.x = C.bx + C.tx * off * 2.3;
      C.g.position.z = C.bz + C.tz * off * 2.3;
      C.g.rotation.y = C.rot + (Math.cos(t * 0.4 + C.ph) >= 0 ? 0 : Math.PI);
    }
    for (var mk = 0; mk < monkeys.length; mk++) {
      var mo = monkeys[mk];
      if (mo.kind === 'jump' && mo.a) {
        var cyc = (t * 0.22 + mo.ph) % 2;
        var p = cyc < 0.35 ? cyc / 0.35 : (cyc < 1 ? 1 : (cyc < 1.35 ? 1 - (cyc - 1) / 0.35 : 0));
        var hopping = (cyc < 0.35 || (cyc >= 1 && cyc < 1.35));
        mo.g.position.x = mo.a.x + (mo.b.x - mo.a.x) * p;
        mo.g.position.z = mo.a.z + (mo.b.z - mo.a.z) * p;
        mo.g.position.y = mo.a.y + (mo.b.y - mo.a.y) * p + (hopping ? Math.sin(p * Math.PI) * 1.6 : 0);
        mo.g.rotation.y = p < 0.5 ? Math.PI / 2 : -Math.PI / 2;
        mo.armR.rotation.x = -1.2; mo.armL.rotation.x = -1.2;
      } else {
        mo.g.position.y = mo.baseY + Math.abs(Math.sin(t * 1.8 + mo.ph)) * 0.1;
        if (mo.kind === 'wave') { mo.armR.rotation.x = -2.4 + Math.sin(t * 4 + mo.ph) * 0.5; mo.armL.rotation.x = 0.15; }
        else { mo.armR.rotation.x = -1.9 + Math.sin(t * 6 + mo.ph) * 0.35; mo.armL.rotation.x = -0.4 + Math.cos(t * 5 + mo.ph) * 0.3; }
        mo.g.rotation.y = Math.sin(t * 0.4 + mo.ph) * 0.5;
      }
    }
  }

  // ---- Sương (fog) + màu nền: MỘT NƠI DUY NHẤT quản lý — ĐÃ QUYẾT cycle 6, 2026-11-06 (#5).
  // Trước đây fog bị set rải rác ở startSingle / beginRound2Play /
  // startRoundCommon / startRoundLocal / btn-replay VÀ sim Bịt Mắt + Nhảy Bao
  // Bố tự lưu/khôi phục (savedFog), nên một lần khôi phục trễ (QC nhảy vòng,
  // teardown chạy sau khi vòng mới đã set fog) là đè fog sai lên vòng đang
  // chơi. Nay chỉ game.js sở hữu fog: preset theo vòng (sân làng / cầu) +
  // override theo trò (sim xin qua setFogOverride, gỡ qua clearFogOverride,
  // chỉ gỡ đúng tên đang giữ); đổi vòng luôn xoá override. Giá trị hiệu dụng
  // giữ nguyên như trước — không đổi cảm giác chơi.
  var FOG_PRESETS = {
    yard:   { near: 150, far: 720, color: 0xa9bfba, bg: 0xffc98a }, // sân làng: vòng 1 + vòng 3 trở đi
    bridge: { near: 16,  far: 130, color: 0xa9bfba, bg: 0xe8c39a }, // vòng 2 cầu sương mù
    blind:  { near: 4,   far: 26,  color: 0x1a2340, bg: 0x141b33 }, // Bịt Mắt: tối + sương dày
    hop:    { near: 60,  far: 420, color: null,     bg: null }     // Nhảy Bao Bố: chỉ nới tầm nhìn, giữ màu/bg của vòng
  };
  var fogOverride = null; // tên preset đang ghi đè fog vòng, null = fog theo vòng
  function applyFogPreset(name) {
    var p = FOG_PRESETS[name]; if (!p || !scene || !scene.fog) return false;
    scene.fog.near = p.near; scene.fog.far = p.far;
    if (p.color !== null && p.color !== undefined && scene.fog.color) scene.fog.color.setHex(p.color);
    if (p.bg !== null && p.bg !== undefined && scene.background && scene.background.set) scene.background.set(p.bg);
    return true;
  }
  function fogPresetForRound(round) { return round === 2 ? 'bridge' : 'yard'; }
  function refreshFog() { return applyFogPreset(fogOverride || fogPresetForRound(currentRound)); }
  function setFogOverride(name) {
    if (!FOG_PRESETS[name]) return false;
    fogOverride = name; return applyFogPreset(name);
  }
  function clearFogOverride(name) {
    // Chỉ gỡ đúng override đang giữ: lệnh gỡ cũ (teardown trễ sau khi đã đổi
    // vòng / sim khác đã ghi đè) không được đè fog của vòng đang chơi.
    if (name && fogOverride !== name) return false;
    fogOverride = null; return refreshFog();
  }

  // ---- Thế giới ----
  function buildWorld() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffc98a);
    /* Sương phối cảnh XANH XÁM kiểu vịnh biển (không phải sương vàng/trắng):
       đảo xa ngả sang xanh xám nhưng vẫn đọc được hình thù đá xám + cây xanh,
       không còn bị rửa thành màu trắng bệch như trước. */
    scene.fog = new THREE.Fog(0xa9bfba, 150, 720);
    camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 950);
    renderer = new THREE.WebGLRenderer({ canvas: $('scene'), antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    var hemi = new THREE.HemisphereLight(0xffe3b3, 0x7a8c4a, 1.05);
    scene.add(hemi);
    var sun = new THREE.DirectionalLight(0xffb36b, 2.1);
    sun.position.set(-48, 34, 18);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -70; sun.shadow.camera.right = 70;
    sun.shadow.camera.top = 90; sun.shadow.camera.bottom = -90;
    sun.shadow.camera.far = 200;
    sun.shadow.bias = -0.0004;
    scene.add(sun);
    var fill = new THREE.DirectionalLight(0xffd9a0, 0.5);
    fill.position.set(30, 22, -40);
    scene.add(fill);
    var seaGlow = new THREE.DirectionalLight(0x7ec8e3, 0.35);
    seaGlow.position.set(20, 10, 60);
    scene.add(seaGlow);

    // Biển bao quanh đảo bốn phía — đường chân trời toàn biển
    seaMat = new THREE.MeshStandardMaterial({ color: 0x2b7fb3, roughness: 0.3, metalness: 0.05, transparent: true, opacity: 0.94 });
    sea = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), seaMat);
    sea.rotation.x = -Math.PI / 2; sea.position.y = -1.25; scene.add(sea);
    // Thân đảo bậc khối voxel: vách đá dựng -> vành bãi cát -> bậc đất -> thảm cỏ làng
    var cliff = new THREE.Mesh(new THREE.CylinderGeometry(89, 72, 2.3, 16), flatMat(0x7d7268));
    cliff.position.y = -1.25; cliff.receiveShadow = true; scene.add(cliff);
    var sandDisc = new THREE.Mesh(new THREE.CircleGeometry(88, 28), flatMat(0xe3c98d));
    sandDisc.rotation.x = -Math.PI / 2; sandDisc.position.y = -0.045; sandDisc.receiveShadow = true; scene.add(sandDisc);
    var dirtStep = new THREE.Mesh(new THREE.CircleGeometry(82, 28), flatMat(0xd9be82));
    dirtStep.rotation.x = -Math.PI / 2; dirtStep.position.y = -0.03; dirtStep.receiveShadow = true; scene.add(dirtStep);
    var ground = new THREE.Mesh(new THREE.CircleGeometry(76, 28), flatMat(0x8fb45e));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.015; ground.receiveShadow = true;
    scene.add(ground);
    // Sân chạy đất nện (dài theo sân, vạch xuất phát/đích của server đặt trên đó)
    var track = new THREE.Mesh(new THREE.PlaneGeometry(TRACK_HALF_W * 2 + 10, 118), mat(0xdcbc7d, 1));
    track.rotation.x = -Math.PI / 2; track.position.set(0, 0, 2); track.receiveShadow = true;
    scene.add(track);
    // Đảo nhỏ xa xa trên biển (quần đảo) — đồi xếp khối voxel, chỉ trang trí, không đổ bóng
    [[-150, -120, 16], [135, -60, 11], [-120, 90, 13], [150, 110, 18]].forEach(function (isl) {
      var ig = new THREE.Group(); ig.position.set(isl[0], -1.2, isl[1]);
      var r = isl[2];
      box(r * 2, 2.2, r * 2, mat(0xd8bd85, 1), 0, 0.6, 0, ig, false);
      box(r * 1.5, r * 0.34, r * 1.5, mat(0x5d9c48, 1), 0, 1.7 + r * 0.17, 0, ig, false);
      box(r * 1.0, r * 0.3, r * 1.0, mat(0x6fae52, 1), 0, 1.7 + r * 0.47, 0, ig, false);
      box(r * 0.5, r * 0.26, r * 0.5, mat(0x5d9c48, 1), 0, 1.7 + r * 0.72, 0, ig, false);
      scene.add(ig);
    });
    /* ---- Dãy núi đá vôi voxel kiểu Hạ Long: nhiều lớp xa dần, sương mờ giữa các lớp ---- */
    var KARST_POS = [[-300, -40, 30], [310, -30, 26], [40, -300, 22], [-170, 215, 24], [190, 225, 26], [-262, -196, 20]];
    (function buildKarsts() {
      var rockM = flatMat(0x8d9291), rockM2 = flatMat(0x7a8587), vegM = flatMat(0x5d8a4d), vegM2 = flatMat(0x4c7a41);
      KARST_POS.forEach(function (kp, ki) {
        var g = new THREE.Group(); g.position.set(kp[0], -1.3, kp[1]);
        var R = kp[2], H = R * (1.15 + (ki % 3) * 0.28);
        var tiers = 5;
        for (var ti = 0; ti < tiers; ti++) {
          var fr = 1 - ti / (tiers + 0.6);
          var w = R * 2 * fr * (0.82 + ((ti * 7 + ki * 3) % 5) * 0.07);
          var hh = H / tiers * 1.25;
          var off = (((ti * 13 + ki * 7) % 7) - 3) * R * 0.06;
          var offz = (((ti * 11 + ki * 5) % 7) - 3) * R * 0.06;
          box(w, hh, w * 0.86, ti % 2 ? rockM : rockM2, off, ti * (H / tiers) + hh / 2, offz, g, false);
          if (ti >= tiers - 2) box(w * 0.8, hh * 0.4, w * 0.7, ti % 2 ? vegM : vegM2, off, ti * (H / tiers) + hh + hh * 0.16, offz, g, false);
        }
        var sw2 = R * 0.9, sh = H * 0.55;
        box(sw2, sh * 0.5, sw2 * 0.8, rockM2, R * 0.75, sh * 0.25, R * 0.2, g, false);
        box(sw2 * 0.65, sh * 0.5, sw2 * 0.55, rockM, R * 0.75, sh * 0.75, R * 0.2, g, false);
        box(sw2 * 0.5, sh * 0.22, sw2 * 0.42, vegM, R * 0.75, sh + sh * 0.1, R * 0.2, g, false);
        scene.add(g);
      });
      var mistM = new THREE.MeshBasicMaterial({ color: 0xc4d6d2, transparent: true, opacity: 0.08, depthWrite: false });
      var mistM2 = new THREE.MeshBasicMaterial({ color: 0xb9cdc9, transparent: true, opacity: 0.06, depthWrite: false });
      [[-150, -215, 300, 10], [170, -225, 320, 13], [0, -285, 420, 16], [-265, -90, 240, 9], [275, -80, 240, 11], [0, 265, 380, 12]].forEach(function (ms, mi) {
        var p = new THREE.Mesh(new THREE.PlaneGeometry(ms[2], ms[3]), mi % 2 ? mistM2 : mistM);
        p.position.set(ms[0], ms[3] * 0.75, ms[1]);
        scene.add(p);
        mistPlanes.push(p);
      });
    })();
    /* ---- Các đảo đặc trưng riêng theo dáng thật của vịnh ---- */
    (function specialIslands() {
      var rock = flatMat(0x8d9291), rock2 = flatMat(0x767f83), dark = flatMat(0x565e60), veg = flatMat(0x4c7a41), veg2 = flatMat(0x3e6b35), sand = flatMat(0xe9d193);
      /* HÒN TRỐNG MÁI (-215,-165): hai khối đá xám nghiêng vào nhau như gà chọi */
      var tm = new THREE.Group(); tm.position.set(-215, -1.3, -165);
      var left = new THREE.Group(); left.position.set(-7.5, 0, 0); left.rotation.z = 0.13;
      box(11, 4, 9, dark, 0, 2, 0, left, false);
      box(10, 5, 8.4, rock2, 0.4, 6.2, 0, left, false);
      box(8.6, 5, 7.6, rock, 0.8, 10.8, 0, left, false);
      box(7.4, 3.6, 6.8, rock, 1.1, 14.8, 0, left, false);
      box(6.8, 1.1, 6.2, veg, 1.1, 17.1, 0, left, false);
      box(3.4, 1.4, 3.2, veg2, 0.2, 17.9, 0.8, left, false);
      box(0.5, 12, 0.5, dark, -3.4, 9, 4.05, left, false);
      box(0.5, 8, 0.5, dark, 2.2, 7, 4.05, left, false);
      tm.add(left);
      var right = new THREE.Group(); right.position.set(6.5, 0, 0.6); right.rotation.z = -0.24;
      box(6.4, 3.4, 6.8, dark, 0, 1.7, 0, right, false);
      box(5.4, 4.6, 5.8, rock2, -0.3, 5.4, 0, right, false);
      box(4.2, 4.4, 4.8, rock, -0.6, 9.6, 0, right, false);
      box(2.4, 3.6, 3.2, rock, -0.9, 13.4, 0, right, false);
      box(2.6, 1.0, 3.0, veg, -0.7, 15.4, 0, right, false);
      box(0.45, 9, 0.45, dark, 1.6, 7.5, 2.95, right, false);
      tm.add(right);
      scene.add(tm);
      isleSign('HÒN TRỐNG MÁI', -198, -148, 3.2);
      /* ĐẢO TI TỐP (238,-150): núi hình nón dốc đứng phủ cây xanh đậm, bãi cát lưỡi liềm */
      var tt = new THREE.Group(); tt.position.set(238, -1.3, -150);
      box(34, 2.2, 30, rock2, 0, 0.4, 0, tt, false);
      var tiersT = [[27, 7], [22, 7], [17.5, 6.5], [13.5, 6], [10, 5.5], [6.8, 5], [4, 4.4]];
      var yT = 1.4;
      tiersT.forEach(function (tw, ti2) {
        box(tw[0], tw[1], tw[0] * 0.88, ti2 === 0 ? rock : (ti2 % 2 ? veg : veg2), (ti2 % 2 ? 0.8 : -0.7), yT + tw[1] / 2, 0, tt, false);
        yT += tw[1] * 0.92;
      });
      for (var ci2 = 0; ci2 < 7; ci2++) {
        var ca = 2.35 + ci2 * 0.24;
        box(6.5, 0.55, 3.4, sand, Math.cos(ca) * 15.5, 0.75, Math.sin(ca) * 13.5, tt, false).rotation.y = -ca;
      }
      for (var pi2 = 0; pi2 < 6; pi2++) box(2.6, 0.3, 1.9, mat(0x8a6b35, 0.95), -19 - pi2 * 1.95, 0.15, 9.5 - pi2 * 0.55, tt, false);
      scene.add(tt);
      miniBoat(214, -128, 0.7, 0xf6ead0); miniBoat(207, -139, 1.2, 0xe2703a); miniBoat(219, -120, -0.4, 0xf6ead0);
      isleSign('ĐẢO TI TỐP', 219, -133, 3.2);
      /* VỊNH THÁP ĐÁ (15,-262): cụm tháp đá vôi cao thấp khác nhau */
      var vt = new THREE.Group(); vt.position.set(15, -1.3, -262);
      [[-17, 0, 7, 26], [-8.5, -3, 5.4, 19], [9, -2, 6.2, 30], [17.5, 2, 5, 22], [2, 8, 4.6, 14], [-14, 9, 4.2, 12]].forEach(function (tw2) {
        var twg = new THREE.Group(); twg.position.set(tw2[0], 0, tw2[1]);
        var R2 = tw2[2], H2 = tw2[3];
        box(R2 * 2, H2 * 0.3, R2 * 1.8, dark, 0, H2 * 0.15, 0, twg, false);
        box(R2 * 1.8, H2 * 0.42, R2 * 1.6, rock2, 0.3, H2 * 0.48, 0, twg, false);
        box(R2 * 1.45, H2 * 0.34, R2 * 1.3, rock, -0.2, H2 * 0.83, 0, twg, false);
        box(R2 * 1.3, H2 * 0.12, R2 * 1.15, veg, -0.2, H2 * 1.05, 0, twg, false);
        vt.add(twg);
      });
      scene.add(vt);
      miniBoat(13, -238, 0.15, 0xf6ead0);
      box(0.9, 0.1, 7, new THREE.MeshBasicMaterial({ color: 0xeaf7ff, transparent: true, opacity: 0.5 }), 13, -1.05, -229, scene, false);
      isleSign('VỊNH THÁP ĐÁ', 15, -233, 3.2);
      /* ĐẢO YÊN NGỰA (255,95): hai đỉnh nối nhau bằng yên ngựa thấp ở giữa */
      var yn = new THREE.Group(); yn.position.set(255, -1.3, 95);
      box(30, 2.4, 20, dark, 0, 0.6, 0, yn, false);
      box(11, 6, 12, rock2, -8.5, 4.4, 0, yn, false);
      box(9, 5.5, 10.5, veg2, -8.5, 9.8, 0, yn, false);
      box(6.4, 4.4, 8, veg, -8.5, 14.6, 0, yn, false);
      box(9.5, 5, 11, rock2, 8.5, 3.9, 0, yn, false);
      box(8, 4.6, 9.5, veg, 8.5, 8.5, 0, yn, false);
      box(5.6, 3.6, 7.4, veg2, 8.5, 12.4, 0, yn, false);
      box(9, 3.2, 9, veg2, 0, 3.2, 0, yn, false);
      scene.add(yn);
      isleSign('ĐẢO YÊN NGỰA', 238, 82, 3.2);
      /* ĐẢO HANG VÒM (-245,60): khối đá rộng, chân có vòm hang tối mở ra mặt nước */
      var hv = new THREE.Group(); hv.position.set(-245, -1.3, 60);
      box(26, 3, 18, dark, 0, 0.8, 0, hv, false);
      box(9.5, 9, 16, rock2, -7.8, 6.6, 0, hv, false);
      box(9.5, 9, 16, rock2, 7.8, 6.6, 0, hv, false);
      box(25, 4.6, 16.5, rock, 0, 13.2, 0, hv, false);
      box(21, 4.2, 14, rock2, 0, 17.3, 0, hv, false);
      box(16, 1.2, 11, veg, 0, 19.9, 0, hv, false);
      box(9, 1.6, 8, veg2, -3, 20.9, 1, hv, false);
      var cave = box(5.6, 5.4, 1.2, new THREE.MeshBasicMaterial({ color: 0x10181c }), 0, 3.4, 8.6, hv, false);
      cave.castShadow = false;
      scene.add(hv);
      miniBoat(-228, 74, -0.8, 0xe2703a);
      isleSign('ĐẢO HANG VÒM', -229, 47, 3.2);
    })();
    (function islandVegetation() {
      var darkM = flatMat(0x4c565a);
      var tmv = new THREE.Group(); tmv.position.set(-215, -1.3, -165); scene.add(tmv);
      vxTree(tmv, -6.4, 17.6, 0.5, 0.62, 'canopy');
      vxBush(tmv, 5.8, 15.9, 0.6, 0.8);
      vxVine(tmv, -10.5, 14, 4.4, 6); vxVine(tmv, -4.5, 12, 4.4, 5); vxVine(tmv, 8.6, 11, 3.6, 4.5);
      vxFlowers(tmv, -6, 17.7, 2.5, 3, [0xf28bb4, 0xf2b01e]);
      vxBeacon(tmv, -13.5, 0.8, 7, 0xe2483a);
      var ttv = new THREE.Group(); ttv.position.set(238, -1.3, -150); scene.add(ttv);
      box(35.5, 1.1, 31.5, darkM, 0, 0.2, 0, ttv, false);
      vxTree(ttv, 9, 13.5, 3, 0.9, 'bamboo'); vxTree(ttv, -9, 13.5, -3, 0.9, 'bamboo');
      vxTree(ttv, 7, 19.8, 4, 0.85, 'bamboo'); vxTree(ttv, -7, 19.8, -4, 0.85, 'bamboo');
      vxTree(ttv, 4.5, 25.3, 2, 0.8, 'bamboo'); vxTree(ttv, -4.5, 25.3, -2, 0.8, 'bamboo');
      vxTree(ttv, 2.5, 30.3, 3, 1.0, 'canopy'); vxTree(ttv, -3, 34.9, -2, 0.9, 'canopy'); vxTree(ttv, 0, 39.3, 0, 1.05, 'canopy');
      for (var pi = 0; pi < 4; pi++) { var ca2 = 2.5 + pi * 0.45; vxTree(ttv, Math.cos(ca2) * 16.5, 0.9, Math.sin(ca2) * 14.5, 1.0, 'palm'); }
      vxBush(ttv, 14, 1.5, -8, 1); vxBush(ttv, -13, 1.5, 9, 0.9);
      vxFlowers(ttv, 10, 1.5, 12, 6, [0xe2703a, 0xf28bb4, 0xf2b01e]);
      vxBeacon(ttv, -16.5, 0.8, 10, 0xf2b01e);
      var vtv = new THREE.Group(); vtv.position.set(15, -1.3, -262); scene.add(vtv);
      vxTree(vtv, -17, 27, 0, 0.8, 'canopy'); vxTree(vtv, -8.5, 20, -3, 0.7, 'canopy');
      vxTree(vtv, 9, 31, -2, 0.85, 'canopy'); vxTree(vtv, 17.5, 23, 2, 0.7, 'canopy');
      vxTree(vtv, 2, 14.5, 8, 0.6, 'bamboo'); vxTree(vtv, -14, 12.5, 9, 0.6, 'canopy');
      vxVine(vtv, 13.2, 20, 0, 8); vxVine(vtv, -21.8, 16, 2, 6);
      vxBeacon(vtv, 24, 0.8, 10, 0x53e0d4);
      var ynv = new THREE.Group(); ynv.position.set(255, -1.3, 95); scene.add(ynv);
      vxTree(ynv, -8.5, 16.6, 0, 1.1, 'canopy'); vxTree(ynv, 8.5, 14, 0, 1.0, 'canopy'); vxTree(ynv, 0, 4.6, 2, 0.8, 'bamboo');
      vxBush(ynv, -3, 4.8, -3, 0.9); vxBush(ynv, 4, 4.8, 3, 0.8);
      vxFlowers(ynv, 0, 4.9, 0, 5, [0xf2b01e, 0xf28bb4]);
      vxVine(ynv, -13.8, 9, 5.5, 5);
      vxBeacon(ynv, -16, 1.8, 8, 0xe2703a);
      var hvv = new THREE.Group(); hvv.position.set(-245, -1.3, 60); scene.add(hvv);
      vxTree(hvv, -6, 20.4, 0, 1.0, 'canopy'); vxTree(hvv, 5, 20.4, -2, 0.9, 'canopy'); vxTree(hvv, 0, 20.6, 4, 0.8, 'bamboo');
      vxVine(hvv, -3.4, 9.5, 8.8, 4.5); vxVine(hvv, 3.4, 9.5, 8.8, 4.5);
      vxBush(hvv, -11, 2.3, 7, 0.9); vxBush(hvv, 11, 2.3, 7, 0.9);
      vxBeacon(hvv, 14, 2.3, 6, 0x39a05a);
      vxTree(scene, -150, 14, -120, 1.2, 'canopy'); vxTree(scene, -143, 12.5, -114, 0.9, 'bamboo');
      vxTree(scene, 135, 10.6, -60, 1.0, 'canopy');
      vxTree(scene, -120, 12, 90, 1.1, 'palm'); vxTree(scene, -114, 11, 96, 0.8, 'canopy');
      vxTree(scene, 150, 15.4, 110, 1.25, 'canopy'); vxTree(scene, 158, 13.5, 104, 0.9, 'bamboo');
    })();
    /* ================= 4 ĐẢO MỚI CÓ TÊN THẬT / ĐẶC TRƯNG RIÊNG ================= */
    (function newIslands() {
      var rock = flatMat(0x8d9291), rock2 = flatMat(0x767f83), dark = flatMat(0x565e60), veg = flatMat(0x4c7a41), veg2 = flatMat(0x3e6b35), sand = flatMat(0xe9d193);
      /* HÒN ĐỈNH HƯƠNG (-90,-255): chiếc lư hương — mặt đỉnh phẳng phủ cây trên ba chân đá */
      var dh = new THREE.Group(); dh.position.set(-90, -1.3, -255);
      box(19, 2, 16, dark, 0, 0.5, 0, dh, false);
      box(4, 7.5, 4, rock2, -5.5, 5, -4, dh, false);
      box(4, 7.5, 4, rock2, 5.5, 5, -4, dh, false);
      box(4, 7.5, 4, rock2, 0, 5, 4.5, dh, false);
      box(16.5, 2.4, 14, rock, 0, 9.8, 0, dh, false);
      box(14.5, 1.1, 12, veg, 0, 11.5, 0, dh, false);
      box(0.5, 6, 0.5, dark, -8.05, 6, 3, dh, false);
      vxTree(dh, -4, 12, -2, 0.95, 'canopy'); vxTree(dh, 4.5, 12, 2.5, 0.8, 'canopy');
      vxVine(dh, 8.1, 9, 2, 5);
      vxBeacon(dh, -9.5, 1.2, 6.5, 0xe2483a);
      scene.add(dh);
      isleSign('HÒN ĐỈNH HƯƠNG', -76, -242, 3.2);
      /* HÒN CON CÓC (120,-265): cóc ngồi thấp bè nhất vịnh, đầu ngẩng, hai u mắt */
      var cc = new THREE.Group(); cc.position.set(120, -1.3, -265);
      box(21, 2.4, 17, dark, 0, 0.6, 0, cc, false);
      box(19, 3.6, 15.5, rock2, 0, 3.4, 0, cc, false);
      box(16, 3.2, 13, rock, -0.5, 6.6, 0, cc, false);
      box(13, 1.1, 10.5, veg2, -0.5, 8.7, 0, cc, false);
      box(6.5, 3.4, 6, rock, 0, 8.6, -6.5, cc, false);
      box(1.7, 1.7, 1.7, rock2, -2.2, 11, -7.5, cc, false);
      box(1.7, 1.7, 1.7, rock2, 2.2, 11, -7.5, cc, false);
      box(1.2, 0.7, 1.2, veg, -2.2, 12.2, -7.5, cc, false);
      box(1.2, 0.7, 1.2, veg, 2.2, 12.2, -7.5, cc, false);
      vxBush(cc, -6, 9.2, 3, 0.9); vxBush(cc, 6.5, 9.2, -1, 0.8);
      vxVine(cc, -9.6, 6, 4, 4); vxVine(cc, 9.6, 6, -3, 4);
      vxBeacon(cc, 11, 1.6, 7, 0xf2b01e);
      scene.add(cc);
      isleSign('HÒN CON CÓC', 134, -252, 3.2);
      /* ĐẢO SOI SIM (-300,130): thoai thoải thay vì vách dựng, rừng sim tím trên sườn */
      var ss = new THREE.Group(); ss.position.set(-300, -1.3, 130);
      box(40, 2, 34, sand, 0, 0.3, 0, ss, false);
      box(34, 3.4, 28, veg2, 0, 2.6, 0, ss, false);
      box(26, 3.4, 21, veg, 0, 5.8, 0, ss, false);
      box(17, 3.2, 14, veg2, 0, 8.9, 0, ss, false);
      box(9, 2.8, 8, veg, 0, 11.8, 0, ss, false);
      var simCols = [0xb565d8, 0x9b4dca, 0xc77fd6];
      for (var si3 = 0; si3 < 16; si3++) {
        var sa = Math.random() * 6.28, sr = 6 + Math.random() * 10;
        vxBush(ss, Math.cos(sa) * sr, 4.4 + Math.random() * 3.2, Math.sin(sa) * sr * 0.8, 0.75, simCols[si3 % 3]);
      }
      vxTree(ss, -6, 13, -3, 1.1, 'canopy'); vxTree(ss, 7, 10.4, 4, 0.95, 'canopy'); vxTree(ss, 0, 7.4, -9, 0.9, 'bamboo');
      vxTree(ss, -17, 1.2, 10, 1.0, 'palm'); vxTree(ss, 16, 1.2, 12, 1.0, 'palm'); vxTree(ss, 19, 1.2, -6, 0.9, 'palm');
      vxFlowers(ss, 8, 4.4, -8, 5, [0xb565d8, 0xf28bb4, 0xf2b01e]);
      vxBeacon(ss, -20, 1.2, -12, 0x39a05a);
      scene.add(ss);
      isleSign('ĐẢO SOI SIM', -282, 116, 3.2);
      miniBoat(-272, 148, 0.5, 0xf6ead0);
      /* ĐẢO KHỈ (300,170): hai mỏm đá có cây, bãi cát nhỏ, đàn khỉ voxel chuyển động */
      var kh = new THREE.Group(); kh.position.set(300, -1.3, 170);
      box(30, 2.2, 22, dark, 0, 0.5, 0, kh, false);
      box(13, 5.5, 12, rock2, -7, 4.2, 0, kh, false);
      box(10.5, 4.6, 10, rock, -7, 9.2, 0, kh, false);
      box(9, 1, 8.5, veg, -7, 12, 0, kh, false);
      box(11, 4.6, 10.5, rock2, 8, 3.6, 2, kh, false);
      box(8.5, 3.8, 8.5, rock, 8, 7.7, 2, kh, false);
      box(7, 0.9, 7, veg2, 8, 10, 2, kh, false);
      box(12, 1.4, 9, sand, 2, 1.2, 12.5, kh, false);
      vxTree(kh, -7, 12.4, 0, 1.05, 'canopy'); vxTree(kh, 8, 10.4, 2, 0.9, 'canopy'); vxTree(kh, -13, 6.8, 6, 0.8, 'bamboo');
      vxVine(kh, -13.8, 8, 4, 5);
      vxBeacon(kh, 15, 1.6, -8, 0xe2703a);
      scene.add(kh);
      isleSign('ĐẢO KHỈ', 284, 156, 3.2);
      function monkey(parent, x, y, z, s, kind) {
        var g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(s);
        var fur = mat(0x8a5a2b, 0.9), face = mat(0xe8c39a, 0.8);
        box(0.52, 0.55, 0.42, fur, 0, 0.5, 0, g, false);
        box(0.4, 0.4, 0.4, fur, 0, 1.05, 0, g, false);
        box(0.3, 0.22, 0.08, face, 0, 0.98, 0.2, g, false);
        box(0.14, 0.14, 0.14, fur, -0.28, 1.12, 0, g, false);
        box(0.14, 0.14, 0.14, fur, 0.28, 1.12, 0, g, false);
        var armR = new THREE.Group(); armR.position.set(0.3, 0.78, 0); g.add(armR);
        box(0.13, 0.5, 0.13, fur, 0.05, -0.22, 0, armR, false);
        var armL = new THREE.Group(); armL.position.set(-0.3, 0.78, 0); g.add(armL);
        box(0.13, 0.5, 0.13, fur, -0.05, -0.22, 0, armL, false);
        var tail = box(0.1, 0.55, 0.1, fur, 0.16, 0.4, -0.3, g, false); tail.rotation.x = 0.7;
        parent.add(g);
        var rec = { g: g, armR: armR, armL: armL, baseY: y, ph: Math.random() * 6.28, kind: kind || 'wave' };
        monkeys.push(rec);
        return rec;
      }
      monkey(kh, -9.5, 12.5, 2.5, 1, 'wave');
      monkey(kh, -4.5, 12.5, -2.5, 0.75, 'scratch');
      monkey(kh, 8, 10.5, 4.5, 0.9, 'wave');
      var jumper = monkey(kh, -7, 12.5, -4, 0.8, 'jump');
      jumper.a = { x: -7, y: 12.5, z: -4 }; jumper.b = { x: 6, y: 10.5, z: 0 };
    })();
    /* ================= SỰ SỐNG QUANH ĐẢO: chim, bướm, cá nhảy, cua ================= */
    (function wildlife() {
      var birdCols = [0xf6f2e8, 0xdfe8ee, 0xf2b01e];
      [[0, 30, 0, 26, 5], [238, 26, -150, 20, 5], [-215, 24, -165, 17, 4], [-300, 20, 130, 20, 4], [300, 22, 170, 18, 4], [15, 30, -262, 22, 4]].forEach(function (f, fi) {
        for (var i = 0; i < f[4]; i++) {
          var g = new THREE.Group();
          var bm = mat(birdCols[fi % 3], 0.7);
          box(0.55, 0.16, 0.2, bm, 0, 0, 0, g, false);
          box(0.2, 0.14, 0.34, bm, 0, 0.02, -0.32, g, false);
          var wl = new THREE.Group(); wl.position.set(-0.06, 0.06, 0); g.add(wl);
          box(0.85, 0.07, 0.3, bm, -0.45, 0, 0, wl, false);
          var wr = new THREE.Group(); wr.position.set(0.06, 0.06, 0); g.add(wr);
          box(0.85, 0.07, 0.3, bm, 0.45, 0, 0, wr, false);
          scene.add(g);
          birdFlocks.push({ g: g, wl: wl, wr: wr, cx: f[0], cy: f[1], cz: f[2], r: f[3] + (i % 3) * 3, sp: 0.13 + Math.random() * 0.1, ph: (i / f[4]) * 6.28 + fi * 1.3, fl: 7 + Math.random() * 3, hBob: Math.random() * 6.28 });
        }
      });
      var bfCols = [0xf28bb4, 0xe2703a, 0xb565d8, 0xf2b01e];
      [[35, 1.6, 23], [248, 2.6, -138], [-292, 3.4, 122], [22, 1.6, 58]].forEach(function (sp2, si4) {
        for (var bi3 = 0; bi3 < 2; bi3++) {
          var g2 = new THREE.Group();
          var wm = mat(bfCols[(si4 + bi3) % 4], 0.6);
          var wl2 = new THREE.Group(); g2.add(wl2); box(0.3, 0.04, 0.22, wm, -0.16, 0, 0, wl2, false);
          var wr2 = new THREE.Group(); g2.add(wr2); box(0.3, 0.04, 0.22, wm, 0.16, 0, 0, wr2, false);
          box(0.07, 0.07, 0.3, mat(0x33333e, 0.7), 0, 0, 0, g2, false);
          scene.add(g2);
          butterflies.push({ g: g2, wl: wl2, wr: wr2, cx: sp2[0], cy: sp2[1], cz: sp2[2], r: 2.2 + bi3 * 1.3, ph: Math.random() * 6.28, sp: 0.5 + Math.random() * 0.3 });
        }
      });
      [[88, 26, 1], [216, -128, -1], [-226, 76, 1], [-272, 148, -1]].forEach(function (fs2, fi2) {
        var g3 = new THREE.Group();
        box(0.2, 0.16, 0.6, mat(0xe2703a, 0.6), 0, 0, 0, g3, false);
        box(0.06, 0.26, 0.24, mat(0xf2a01e, 0.6), 0, 0, -0.38, g3, false);
        g3.visible = false; scene.add(g3);
        jumpFishes.push({ g: g3, x: fs2[0], z: fs2[1], dir: fs2[2], off: fi2 * 1.37 });
      });
      function crab(x, y, z, ang) {
        var g4 = new THREE.Group(); g4.position.set(x, y, z);
        box(0.55, 0.2, 0.4, mat(0xd8542e, 0.8), 0, 0.16, 0, g4, false);
        box(0.2, 0.16, 0.2, mat(0xe2703a, 0.8), -0.38, 0.14, 0.22, g4, false);
        box(0.2, 0.16, 0.2, mat(0xe2703a, 0.8), 0.38, 0.14, 0.22, g4, false);
        box(0.08, 0.22, 0.08, mat(0x8a3a1a, 0.9), -0.2, 0.3, 0.1, g4, false);
        box(0.08, 0.22, 0.08, mat(0x8a3a1a, 0.9), 0.2, 0.3, 0.1, g4, false);
        scene.add(g4);
        crabs.push({ g: g4, bx: x, bz: z, tx: Math.cos(ang), tz: Math.sin(ang), rot: ang + Math.PI / 2, ph: Math.random() * 6.28 });
      }
      [0.5, 1.6, 2.9, 4.4, 5.6].forEach(function (a) { crab(Math.cos(a) * 84.5, 0.12, Math.sin(a) * 84.5, a + Math.PI / 2); });
      crab(222, 1.1, -136, 2.8); crab(230, 1.1, -128, 3.4); crab(215, 1.1, -141, 2.4);
    })();
    /* ================= QUY MÔ VỊNH: 370 silhouette đảo xa tới chân trời =================
       Vịnh Hạ Long thật: 1.969 đảo đá vôi / ~1.553 km². Ba lớp đảo xa bằng instanced mesh.
       Màu ĐÁ XÁM + ĐỈNH CÂY XANH, chịu sương xanh xám — TUYỆT ĐỐI không dùng màu
       trắng/xám nhạt rửa trắng như trước. */
    (function distantArchipelago() {
      var geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
      function layer(count, rMin, rMax, rockCol, vegCol, hMax) {
        var im = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: rockCol, fog: true }), count);
        var tops = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: vegCol, fog: true }), count);
        var d = new THREE.Object3D();
        for (var i = 0; i < count; i++) {
          var a = Math.random() * Math.PI * 2, r = rMin + Math.random() * (rMax - rMin);
          var w = 9 + Math.random() * 26;
          var ix = Math.cos(a) * r, iz = Math.sin(a) * r;
          var ih = 8 + Math.random() * hMax;
          d.position.set(ix, -2.5, iz);
          d.scale.set(w, ih, w * (0.65 + Math.random() * 0.5));
          d.rotation.set(0, Math.random() * 3, 0);
          d.updateMatrix(); im.setMatrixAt(i, d.matrix);
          d.position.set(ix, -2.5 + ih * 0.92, iz);
          d.scale.set(w * 0.72, ih * 0.24 + 1.2, w * 0.55);
          d.updateMatrix(); tops.setMatrixAt(i, d.matrix);
          distantIslands.push({ x: ix, z: iz, w: w, h: ih });
        }
        im.instanceMatrix.needsUpdate = true;
        tops.instanceMatrix.needsUpdate = true;
        im.userData.isDistant = true;
        scene.add(im); scene.add(tops);
        distantMeshes.push(im);
      }
      layer(120, 380, 470, 0x66796d, 0x46683c, 30);
      layer(130, 480, 600, 0x71837a, 0x4d7343, 36);
      layer(120, 610, 760, 0x7e9186, 0x557a49, 42);
    })();
    // Thuyền buồm xa trên vịnh — bóng thuyền giữa núi đá
    [[-140, -190, 0.6], [170, -195, -0.4], [-185, 120, 1.2], [205, 160, -1.0], [60, -215, 0.2], [-60, 240, -0.7], [150, 60, 0.9]].forEach(function (fb) {
      var g = new THREE.Group(); g.position.set(fb[0], -1.0, fb[1]); g.rotation.y = fb[2];
      box(7, 1.1, 2.6, mat(0x6e4420, 0.9), 0, 0.4, 0, g, false);
      box(0.22, 6.4, 0.22, mat(0x5d3a1a, 0.9), 0, 3.4, 0, g, false);
      var s1 = box(0.12, 4.4, 3.4, mat(0xf6ead0, 0.95), 1.1, 3.6, 0, g, false); s1.rotation.y = 0.12;
      var s2 = box(0.12, 3.0, 2.2, mat(0xe2703a, 0.9), -1.2, 3.0, 0, g, false); s2.rotation.y = -0.1;
      scene.add(g);
      farBoats.push({ g: g, baseY: -1.0, phase: Math.random() * 6.28 });
    });
    // Sân gạch trước đình
    var plaza = new THREE.Mesh(new THREE.PlaneGeometry(56, 26), mat(0xc47a4e, 1));
    plaza.rotation.x = -Math.PI / 2; plaza.position.set(0, 0.01, -50); plaza.receiveShadow = true;
    scene.add(plaza);
    // Vạch xuất phát (đỏ trắng) — theo START_Z của server
    (function () {
      var g = new THREE.Group();
      for (var i = 0; i < 16; i++) {
        var p = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.4), mat(i % 2 ? 0xffffff : 0xd63c2f, 0.9));
        p.rotation.x = -Math.PI / 2; p.position.set(-16.5 + i * 2.2, 0.02, 0); p.receiveShadow = true; g.add(p);
      }
      g.position.z = START_Z; scene.add(g);
    })();
    // Vạch đích (cờ caro đen trắng) — theo FINISH_Z của server
    (function () {
      var g = new THREE.Group();
      for (var r = 0; r < 2; r++) for (var i = 0; i < 16; i++) {
        var p = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.1), mat((i + r) % 2 ? 0x222222 : 0xffffff, 0.9));
        p.rotation.x = -Math.PI / 2; p.position.set(-16.5 + i * 2.2, 0.02, -0.55 + r * 1.1); p.receiveShadow = true; g.add(p);
      }
      g.position.z = FINISH_Z; scene.add(g);
    })();
    // Hàng rào tre hai bên
    var bambooMat = mat(0xb99a55, 0.95), postMat = mat(0x8a6b35, 0.95);
    for (var side = -1; side <= 1; side += 2) {
      for (var fz = 52; fz >= -44; fz -= 4) {
        box(0.15, 1.15, 0.15, postMat, side * (TRACK_HALF_W + 2.6), 0.57, fz);
      }
      var rail = box(0.09, 0.09, 100, bambooMat, side * (TRACK_HALF_W + 2.6), 1.02, 4);
      rail.castShadow = false;
      var rail2 = box(0.09, 0.09, 100, bambooMat, side * (TRACK_HALF_W + 2.6), 0.55, 4);
      rail2.castShadow = false;
    }
    /* ---- Đình làng ở cuối sân ---- */
    (function buildDinh() {
      var g = new THREE.Group(); g.position.set(0, 0, -64);
      var wood = mat(0x7a4a24, 0.8), woodDark = mat(0x5d3717, 0.85), roofM = mat(0xb5451b, 0.75), stone = mat(0xb8ab98, 0.95);
      box(30, 1.0, 13, stone, 0, 0.5, 0, g);
      box(32, 0.35, 15, stone, 0, 0.17, 0, g);
      var colX = [-12.5, -7.5, -2.5, 2.5, 7.5, 12.5];
      for (var i = 0; i < colX.length; i++) {
        box(0.85, 5.4, 0.85, wood, colX[i], 3.7, 3.4, g);
        box(0.85, 5.4, 0.85, woodDark, colX[i], 3.7, -3.4, g);
      }
      box(29, 0.8, 10.5, woodDark, 0, 6.7, 0, g);
      var slopeL = box(17.8, 0.5, 13.5, roofM, -8.7, 8.2, 0, g); slopeL.rotation.z = 0.10;
      var slopeR = box(17.8, 0.5, 13.5, roofM, 8.7, 8.2, 0, g); slopeR.rotation.z = -0.10;
      box(30, 0.45, 1.3, roofM, 0, 9.15, 0, g);
      var sL2 = box(11.2, 0.45, 5.6, roofM, -5.5, 10.35, 0, g); sL2.rotation.z = 0.12;
      var sR2 = box(11.2, 0.45, 5.6, roofM, 5.5, 10.35, 0, g); sR2.rotation.z = -0.12;
      box(5.5, 0.95, 1.15, mat(0xd8a03c, 0.6), 0, 11.15, 0, g);
      [-17.5, 17.5].forEach(function (x) {
        var d1 = box(1.9, 0.42, 13.5, roofM, x, 7.75, 0, g); d1.rotation.z = x < 0 ? -0.4 : 0.4;
      });
      var sign = box(9, 1.5, 0.25, mat(0x8f1f14, 0.6), 0, 5.6, 5.35, g);
      sign.castShadow = false;
      scene.add(g);
    })();
    /* ---- Cây cổ thụ + cây hai bên ---- */
    function tree(x, z, s) {
      var g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s || 1);
      box(0.62, 3.4, 0.62, mat(0x6e4a26, 0.95), 0, 1.7, 0, g);
      box(3.6, 1.7, 3.6, mat(0x4d8f3a, 0.9), 0, 4.3, 0, g);
      box(2.6, 1.4, 2.6, mat(0x5da348, 0.9), 0.7, 5.5, 0.3, g);
      box(1.7, 1.1, 1.7, mat(0x4d8f3a, 0.9), -0.8, 6.4, -0.3, g);
      scene.add(g);
    }
    tree(-24, -52, 1.5); tree(24, -54, 1.4); tree(-26, 8, 1.1); tree(26, 20, 1.2);
    tree(-25, 44, 1.0); tree(25, 52, 1.1); tree(-28, -16, 1.25); tree(28, -26, 1.05);
    tree(50, 50, 1.15); tree(-52, -42, 1.2); tree(64, -34, 1.0); tree(-46, 52, 1.05);
    /* ---- Lũy tre & bụi tre đung đưa dọc đường chạy ---- */
    function bambooClump(x, z, n, s) {
      var g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s || 1);
      var greens = [0x5da24a, 0x4c8f3d, 0x6fae52];
      for (var i = 0; i < (n || 6); i++) {
        var h = 5 + Math.random() * 2.2;
        var sx = (Math.random() - 0.5) * 1.7, sz = (Math.random() - 0.5) * 1.7;
        var stalk = box(0.17, h, 0.17, mat(0x7fae56, 0.9), sx, h / 2, sz, g, false);
        stalk.rotation.z = (Math.random() - 0.5) * 0.09;
        box(0.21, 0.14, 0.21, mat(0x5d8a3d, 0.9), sx, h * 0.55, sz, g, false);
        box(1.5, 0.75, 1.5, mat(greens[i % 3], 0.9), sx, h + 0.35, sz, g, false);
        box(1.0, 0.6, 1.0, mat(greens[(i + 1) % 3], 0.9), sx + 0.2, h + 0.95, sz, g, false);
      }
      scene.add(g);
      swayers.push({ g: g, phase: Math.random() * 6.28, amp: 0.022 + Math.random() * 0.02 });
      return g;
    }
    bambooClump(-22.5, 42, 7, 1.05); bambooClump(22.5, 34, 6, 0.95);
    bambooClump(-23, 18, 6, 1); bambooClump(23.5, -14, 7, 1.1);
    bambooClump(-22.5, -24, 6, 0.9); bambooClump(22.5, -34, 6, 1);
    bambooClump(-24, 58, 7, 1.1); bambooClump(25, 56, 6, 1);
    bambooClump(-38, -34, 7, 1.15); bambooClump(40, 34, 6, 1);
    /* ---- Ao sen (phía đông đường chạy) ---- */
    (function lotusPond() {
      var rim = new THREE.Mesh(new THREE.CircleGeometry(LOTUS.r + 1.1, 22), mat(0xa98f5f, 1));
      rim.rotation.x = -Math.PI / 2; rim.position.set(LOTUS.x, 0.0, LOTUS.z); rim.receiveShadow = true; scene.add(rim);
      var water = new THREE.Mesh(new THREE.CircleGeometry(LOTUS.r, 22),
        new THREE.MeshStandardMaterial({ color: 0x3f8f74, roughness: 0.22, metalness: 0.05 }));
      water.rotation.x = -Math.PI / 2; water.position.set(LOTUS.x, 0.05, LOTUS.z); scene.add(water);
      var padM = mat(0x3e7d33, 0.85), padM2 = mat(0x4c9440, 0.85);
      for (var i = 0; i < 14; i++) {
        var a = Math.random() * 6.28, rr = Math.random() * (LOTUS.r - 1.6);
        var psz = 0.9 + Math.random() * 0.8;
        var pad = box(psz, 0.07, psz, i % 2 ? padM : padM2, LOTUS.x + Math.cos(a) * rr, 0.09, LOTUS.z + Math.sin(a) * rr, scene, false);
        pad.rotation.y = Math.random() * 1.2;
      }
      for (var f = 0; f < 6; f++) {
        var fa = Math.random() * 6.28, fr = Math.random() * (LOTUS.r - 2.4);
        var fx = LOTUS.x + Math.cos(fa) * fr, fz = LOTUS.z + Math.sin(fa) * fr;
        box(0.09, 0.55, 0.09, mat(0x4c9440, 0.9), fx, 0.32, fz, scene, false);
        box(0.42, 0.3, 0.42, mat(f % 2 ? 0xf28bb4 : 0xf6c6d9, 0.6), fx, 0.68, fz, scene, false);
        box(0.18, 0.14, 0.18, mat(0xf2c01e, 0.6), fx, 0.88, fz, scene, false);
      }
    })();
    /* ---- Hồ cá (phía tây đường chạy) + cá bơi ---- */
    (function fishPond() {
      var rim = new THREE.Mesh(new THREE.CircleGeometry(FISHPOND.r + 1.1, 22), mat(0xa98f5f, 1));
      rim.rotation.x = -Math.PI / 2; rim.position.set(FISHPOND.x, 0.0, FISHPOND.z); rim.receiveShadow = true; scene.add(rim);
      var water = new THREE.Mesh(new THREE.CircleGeometry(FISHPOND.r, 22),
        new THREE.MeshStandardMaterial({ color: 0x3a7ca5, roughness: 0.2, metalness: 0.05, transparent: true, opacity: 0.92 }));
      water.rotation.x = -Math.PI / 2; water.position.set(FISHPOND.x, 0.05, FISHPOND.z); scene.add(water);
      var fishCols = [0xe2703a, 0xf2a01e, 0xe2483a, 0xf3e3c2];
      for (var i = 0; i < 7; i++) {
        var holder = new THREE.Group();
        box(0.17, 0.13, 0.52, mat(fishCols[i % 4], 0.6), 0, 0, 0.02, holder, false);
        box(0.05, 0.2, 0.2, mat(fishCols[i % 4], 0.6), 0, 0, -0.32, holder, false);
        scene.add(holder);
        fishes.push({ h: holder, r: 2 + Math.random() * (FISHPOND.r - 3.4), sp: 0.25 + Math.random() * 0.4, a: Math.random() * 6.28, dir: i % 2 ? 1 : -1 });
      }
      for (var r2 = 0; r2 < 9; r2++) {
        var ra = (r2 / 9) * 6.28 + Math.random() * 0.4;
        var rx = FISHPOND.x + Math.cos(ra) * (FISHPOND.r + 0.7), rz = FISHPOND.z + Math.sin(ra) * (FISHPOND.r + 0.7);
        cyl(0.035, 0.05, 1.5 + Math.random() * 0.7, 5, mat(0x6fae52, 0.9), rx, 0.8, rz, scene, false);
      }
    })();
    /* ---- Cầu tre bắc qua ao sen ---- */
    (function bambooBridge() {
      var g = new THREE.Group(); g.position.set(LOTUS.x, 0, LOTUS.z); g.rotation.y = 0.35;
      var bm = mat(0xb99a55, 0.9), dm = mat(0x8a6b35, 0.9);
      for (var i = 0; i < 9; i++) {
        var px = -5.2 + i * 1.3;
        var py = 0.55 + Math.cos((i - 4) / 4 * Math.PI * 0.5) * 0.75;
        var plank = box(1.15, 0.09, 3.1, bm, px, py, 0, g, false);
        plank.rotation.z = Math.sin((i - 4) / 4 * Math.PI * 0.5) * -0.38;
      }
      for (var sd = -1; sd <= 1; sd += 2) {
        for (var p2 = 0; p2 < 5; p2++) {
          var qx = -5.2 + p2 * 2.6;
          var qy = 0.55 + Math.cos((p2 * 2 - 4) / 4 * Math.PI * 0.5) * 0.75;
          cyl(0.05, 0.05, 0.85, 5, dm, qx, qy + 0.42, sd * 1.45, g, false);
        }
        var railB = box(11.2, 0.07, 0.07, dm, 0, 1.85, sd * 1.45, g, false);
        railB.rotation.z = 0; railB.position.y = 1.8;
      }
      scene.add(g);
    })();
    /* ---- Nhà mái ngói quanh làng ---- */
    function house(x, z, ry, s, roofColor) {
      var g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; g.scale.setScalar(s || 1);
      var wall = mat(0xf3e2c0, 0.95), woodM = mat(0x7a4a24, 0.85), roofM2 = mat(roofColor || 0xb5451b, 0.8);
      box(6.4, 2.9, 5, wall, 0, 1.45, 0, g);
      box(1.3, 2.1, 0.14, woodM, 0, 1.05, 2.53, g, false);
      var win = box(1.1, 0.9, 0.12, new THREE.MeshStandardMaterial({ color: 0xffca6a, emissive: 0xff9c2e, emissiveIntensity: 0.5, roughness: 0.4 }), -1.9, 1.7, 2.53, g, false);
      win.castShadow = false;
      var win2 = box(1.1, 0.9, 0.12, woodM, 1.9, 1.7, 2.53, g, false); win2.castShadow = false;
      var rL = box(4.1, 0.32, 6.1, roofM2, -1.85, 3.75, 0, g); rL.rotation.z = 0.42;
      var rR = box(4.1, 0.32, 6.1, roofM2, 1.85, 3.75, 0, g); rR.rotation.z = -0.42;
      box(1.1, 0.5, 6.2, roofM2, 0, 4.42, 0, g);
      for (var fi3 = 0; fi3 < 6; fi3++) cyl(0.045, 0.045, 0.8, 5, mat(0xb99a55, 0.95), -3 + fi3 * 1.2, 0.4, 3.8, g, false);
      scene.add(g);
    }
    house(-31, -46, 0.35, 1, 0xb5451b); house(31, -48, -0.3, 1.1, 0x9c4a2f);
    house(-36, 40, 0.95, 0.95, 0xb5451b); house(38, 46, -0.85, 1, 0xa03d22);
    house(44, -22, -1.25, 0.9, 0xb5451b); house(-46, 14, 1.35, 0.9, 0x9c4a2f);
    house(20, 68, 0.1, 0.95, 0xa03d22); house(-22, -68, 3.0, 1, 0xb5451b);
    /* ---- Thuyền nhỏ ven bờ biển ---- */
    function boat(x, z, ry, withSail) {
      var g = new THREE.Group(); g.position.set(x, -0.72, z); g.rotation.y = ry;
      var hullM = mat(0x8a5a2b, 0.85), darkM = mat(0x6e4420, 0.9);
      box(3.6, 0.55, 1.35, hullM, 0, 0.28, 0, g, false);
      var bow = new THREE.Mesh(new THREE.ConeGeometry(0.68, 1.3, 4), hullM);
      bow.rotation.z = -Math.PI / 2; bow.rotation.y = Math.PI / 4; bow.scale.z = 0.55;
      bow.position.set(2.35, 0.32, 0); g.add(bow);
      box(0.5, 0.7, 1.3, darkM, -1.85, 0.4, 0, g, false);
      box(0.35, 0.12, 1.1, darkM, -0.7, 0.62, 0, g, false);
      box(0.35, 0.12, 1.1, darkM, 0.7, 0.62, 0, g, false);
      if (withSail) {
        cyl(0.05, 0.06, 3.1, 6, darkM, 0, 2, 0, g, false);
        var sail = box(0.05, 1.9, 1.5, mat(0xf6ead0, 0.9), 0.75, 2.1, 0, g, false);
        sail.rotation.y = 0.15;
      }
      scene.add(g);
      boats.push({ g: g, baseY: -0.72, phase: Math.random() * 6.28 });
    }
    boat(74, 64, -0.7, true); boat(-88, 34, 1.1, false); boat(14, -100, 0.3, true); boat(-52, -88, 2.4, false);
    /* ---- Cột đèn lồng hai bên đường chạy ---- */
    var poleM = mat(0x6e3b1a, 0.9);
    function lanternPole(x, z, hue) {
      var g = new THREE.Group(); g.position.set(x, 0, z);
      box(0.18, 4.4, 0.18, poleM, 0, 2.2, 0, g);
      var arm = box(1.5, 0.09, 0.09, poleM, (x < 0 ? 0.65 : -0.65), 4.3, 0, g); arm.castShadow = false;
      var lm = new THREE.MeshStandardMaterial({ color: hue, roughness: 0.5, emissive: hue, emissiveIntensity: 0.55 });
      var lamp = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.84, 0.66), lm);
      lamp.position.set(x < 0 ? 1.25 : -1.25, 3.85, 0);
      g.add(lamp);
      box(0.52, 0.1, 0.52, mat(0xd8a03c, 0.5, 0.4), x < 0 ? 1.25 : -1.25, 4.42, 0, g, false);
      box(0.8, 0.1, 0.8, mat(0xd8a03c, 0.5, 0.4), x < 0 ? 1.25 : -1.25, 3.36, 0, g, false);
      lanterns.push(lamp);
      scene.add(g);
    }
    var lanternColors = [0xe2483a, 0xf2a01e, 0xe2483a, 0x39a05a, 0xf2a01e, 0xe2483a];
    for (var li = 0; li < 6; li++) {
      var lz = 42 - li * 16;
      lanternPole(-(TRACK_HALF_W + 4.6), lz, lanternColors[li]);
      lanternPole((TRACK_HALF_W + 4.6), lz - 8, lanternColors[(li + 3) % 6]);
    }
    for (var hi = -3; hi <= 3; hi++) {
      var hl = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.95, 0.8),
        new THREE.MeshStandardMaterial({ color: 0xe2483a, roughness: 0.5, emissive: 0xe2483a, emissiveIntensity: 0.5 }));
      hl.position.set(hi * 4.4, 5.6, -58.4);
      scene.add(hl); lanterns.push(hl);
    }
    /* ---- Cờ hội phấp phới ---- */
    var flagColors = [0xe2483a, 0xf2b01e, 0x2e7fc4, 0x39a05a, 0xe2703a];
    function flagPole(x, z, ci) {
      var g = new THREE.Group(); g.position.set(x, 0, z);
      box(0.14, 6.4, 0.14, poleM, 0, 3.2, 0, g);
      var f = box(1.7, 1.05, 0.04, mat(flagColors[ci % flagColors.length], 0.8), 0.88, 5.75, 0, g, false);
      flags.push(f);
      scene.add(g);
    }
    for (var fi = 0; fi < 5; fi++) { flagPole(-(TRACK_HALF_W + 6.5), 38 - fi * 20, fi); flagPole((TRACK_HALF_W + 6.5), 28 - fi * 20, fi + 2); }
    /* ---- Cổng đảo + biển chỉ dẫn + cầu gỗ ra biển + sóng bọt + khối rải ---- */
    (function islandGate() {
      var g = new THREE.Group(); g.position.set(0, 0, START_Z - 5);
      var postM = mat(0x7a2d16, 0.85);
      box(0.55, 5.4, 0.55, postM, -7.6, 2.7, 0, g);
      box(0.55, 5.4, 0.55, postM, 7.6, 2.7, 0, g);
      box(0.85, 0.7, 0.85, mat(0xb5451b, 0.8), -7.6, 5.65, 0, g);
      box(0.85, 0.7, 0.85, mat(0xb5451b, 0.8), 7.6, 5.65, 0, g);
      box(17.5, 0.55, 0.6, postM, 0, 5.15, 0, g);
      var board = signBoard('ĐẢO HỘI LÀNG', 9.5, 1.7, '#8f1f14', '#ffe9b0');
      board.position.set(0, 3.9, 0); g.add(board);
      [-4.6, 4.6].forEach(function (lx) {
        var lm2 = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.55),
          new THREE.MeshStandardMaterial({ color: 0xe2483a, roughness: 0.5, emissive: 0xe2483a, emissiveIntensity: 0.5 }));
        lm2.position.set(lx, 4.3, 0); g.add(lm2); lanterns.push(lm2);
      });
      scene.add(g);
    })();
    function dirSign(text, x, z) {
      var g = new THREE.Group(); g.position.set(x, 0, z);
      box(0.22, 2.5, 0.22, mat(0x6e4a26, 0.9), 0, 1.25, 0, g);
      var b = signBoard(text, 3.1, 0.95, '#7a4a24', '#ffedb8');
      b.position.set(0, 2.35, 0); g.add(b);
      scene.add(g);
    }
    dirSign('AO SEN', 20.5, 24);
    dirSign('HỒ CÁ', -20.5, 2);
    dirSign('SÂN ĐÌNH', 20.5, -26);
    dirSign('BÃI BIỂN', -20.5, 44);
    (function pier() {
      var g = new THREE.Group();
      var pm = mat(0x8a6b35, 0.95), dm2 = mat(0x6e4a26, 0.95);
      for (var i = 0; i < 7; i++) box(3.4, 0.22, 1.7, pm, 30, -0.5, 84 + i * 1.85, g, false);
      [-1.5, 1.5].forEach(function (px) {
        for (var j = 0; j < 4; j++) box(0.28, 1.7, 0.28, dm2, 30 + px, -1.25, 85 + j * 3.7, g, false);
      });
      scene.add(g);
    })();
    (function foamRing() {
      var fm1 = new THREE.MeshBasicMaterial({ color: 0xeaf7ff, transparent: true, opacity: 0.55 });
      var fm2 = new THREE.MeshBasicMaterial({ color: 0xd8f2ff, transparent: true, opacity: 0.38 });
      for (var i = 0; i < 44; i++) {
        var a = Math.random() * Math.PI * 2;
        var rr = 90.5 + Math.random() * 9;
        var w = new THREE.Mesh(new THREE.BoxGeometry(1.4 + Math.random() * 1.6, 0.16, 1.1 + Math.random()), i % 2 ? fm1 : fm2);
        w.position.set(Math.cos(a) * rr, -1.12, Math.sin(a) * rr);
        w.rotation.y = Math.random() * 3;
        scene.add(w);
        waves.push({ m: w, ph: Math.random() * 6.28 });
      }
    })();
    (function voxelScatter() {
      var dummy = new THREE.Object3D();
      var beach = new THREE.InstancedMesh(new THREE.BoxGeometry(1.05, 0.5, 1.05), mat(0xdec491, 1), 110);
      for (var i = 0; i < 110; i++) {
        var a = Math.random() * Math.PI * 2, rr = 83.5 + Math.random() * 4.5;
        dummy.position.set(Math.cos(a) * rr, -0.05 + Math.random() * 0.12, Math.sin(a) * rr);
        dummy.rotation.set(0, Math.random() * 3, 0);
        var sc = 0.7 + Math.random() * 0.9; dummy.scale.set(sc, sc, sc);
        dummy.updateMatrix();
        beach.setMatrixAt(i, dummy.matrix);
      }
      beach.receiveShadow = true; scene.add(beach);
      var tuft = new THREE.InstancedMesh(new THREE.BoxGeometry(0.34, 0.55, 0.34), mat(0xffffff, 0.95), 150);
      var tuftCols = [new THREE.Color(0x5da24a), new THREE.Color(0x4c8f3d), new THREE.Color(0x6fae52), new THREE.Color(0xe2703a)];
      for (var j = 0; j < 150; j++) {
        var a2 = Math.random() * Math.PI * 2, r2 = Math.sqrt(Math.random()) * 73;
        var tx = Math.cos(a2) * r2, tz = Math.sin(a2) * r2;
        if (Math.abs(tx) < 20 && tz > -60 && tz < 64) tx += (tx < 0 ? -23 : 23);
        if (tz < -36 && tz > -64 && Math.abs(tx) < 29) tz += 32;
        if (Math.hypot(tx - LOTUS.x, tz - LOTUS.z) < 12.5) tx += 17;
        if (Math.hypot(tx - FISHPOND.x, tz - FISHPOND.z) < 11.5) tx -= 17;
        dummy.position.set(tx, 0.22, tz);
        dummy.rotation.set(0, Math.random() * 3, 0);
        var sc2 = 0.7 + Math.random() * 0.8; dummy.scale.set(sc2, sc2 * (0.8 + Math.random() * 0.7), sc2);
        dummy.updateMatrix();
        tuft.setMatrixAt(j, dummy.matrix);
        tuft.setColorAt(j, tuftCols[j % 13 === 0 ? 3 : j % 3]);
      }
      if (tuft.instanceColor) tuft.instanceColor.needsUpdate = true;
      scene.add(tuft);
    })();

    buildBridgeMeshes();
    buildDrumAndHost();
    buildRingsAndConfetti();
    buildTourList();
  }

  // ================= VÒNG 2 — CẦU KHỈ SƯƠNG MÙ (hình học port từ prototype) =================
  /* Cầu voxel bắc từ bờ bắc đảo (z=-90) qua biển tới đảo cuối (z≈-152).
     Mỗi bước: 2 tấm ván trái/phải — 1 chắc, 1 yếu. Server là nguồn chuẩn cho
     ván yếu ở multiplayer (step-index, không theo tọa độ); ở chơi đơn ván yếu
     bốc ngẫu nhiên lại mỗi trận tại client. */
  var BR = { platZ0: -100, platZ1: -90, firstStepZ: -101.9, stepGap: 3.1, steps: 9, endZ0: -143, endZ1: -131, deckHalfW: 2.3 };
  BR.lastStepZ = BR.firstStepZ - (BR.steps - 1) * BR.stepGap;
  /* CHIA TEAM vòng 2: tối đa 3 đội màu, mỗi đội 1 cầu riêng song song.
     Team chỉ để tổ chức lượt qua cầu cho đỡ loạn — KHÔNG có thắng/thua theo team. */
  var TEAMS = [
    { name: 'ĐỘI ĐỎ', short: 'Đỏ', color: 0xe2483a },
    { name: 'ĐỘI VÀNG', short: 'Vàng', color: 0xf2b01e },
    { name: 'ĐỘI XANH LÁ', short: 'Xanh lá', color: 0x39a05a }
  ];
  var TEAM_BRIDGE_X = [-11, 0, 11];
  var bridges = [];        // mỗi team: {x, planks:[...]}
  var allPlanks = [];      // mọi tấm ván của cả 3 cầu (kèm bx = tâm cầu)
  var fallingPlanks = [];  // {mesh, vy, vr}
  var teams = [];          // mỗi team: {members:[{isPlayer, bot}]} — dựng lúc chia team
  var leaderArrows = [];
  function bridgeX(team) { return TEAM_BRIDGE_X[team] || 0; }
  function stepZ(step) { return BR.firstStepZ - step * BR.stepGap; }
  function buildBridgeMeshes() {
    var g = new THREE.Group();
    var platM = mat(0xd9be82, 1), woodM = mat(0xa5763a, 0.9), woodD = mat(0x7a4a24, 0.9), postM2 = mat(0x6e4a26, 0.95);
    TEAM_BRIDGE_X.forEach(function (bx, ti) {
      box(10.5, 1.1, BR.platZ1 - BR.platZ0, platM, bx, -0.56, (BR.platZ0 + BR.platZ1) / 2, g, false);
      box(0.55, 1.7, 0.55, mat(TEAMS[ti].color, 0.7), bx - 4.9, 0.85, -99.3, g, false);
      box(0.55, 1.7, 0.55, mat(TEAMS[ti].color, 0.7), bx + 4.9, 0.85, -99.3, g, false);
      bridges.push({ x: bx, planks: [] });
    });
    box(40, 1.1, BR.endZ1 - BR.endZ0, platM, 0, -0.56, (BR.endZ0 + BR.endZ1) / 2, g, false);
    var isl = new THREE.Mesh(new THREE.CylinderGeometry(17, 12, 2.4, 14), flatMat(0x7d7268));
    isl.position.set(0, -1.6, -137); g.add(isl);
    var islTop = new THREE.Mesh(new THREE.CircleGeometry(16.5, 20), flatMat(0x8fb45e));
    islTop.rotation.x = -Math.PI / 2; islTop.position.set(0, -0.02, -137); g.add(islTop);
    TEAM_BRIDGE_X.forEach(function (bx, ti) {
      var ropeM = mat(TEAMS[ti].color, 0.9);
      for (var pz = -100; pz >= -128; pz -= 5.8) {
        box(0.34, 3.4, 0.34, postM2, bx - 2.15, -1.7, pz, g, false);
        box(0.34, 3.4, 0.34, postM2, bx + 2.15, -1.7, pz, g, false);
      }
      for (var rs = -1; rs <= 1; rs += 2) {
        var rope = box(0.07, 0.07, 33, ropeM, bx + rs * 2.25, 1.06, -114.5, g, false); rope.castShadow = false;
        var rope2 = box(0.07, 0.07, 33, mat(0xc9a86a, 0.95), bx + rs * 2.25, 0.55, -114.5, g, false); rope2.castShadow = false;
        for (var rp = -101; rp >= -127; rp -= 4.4) box(0.12, 1.12, 0.12, postM2, bx + rs * 2.25, 0.56, rp, g, false);
      }
      for (var si = 0; si < BR.steps; si++) {
        var sz = BR.firstStepZ - si * BR.stepGap;
        var mL = box(1.95, 0.16, 3.0, si % 2 ? woodM : woodD, bx - 1.02, -0.09, sz, g, false);
        var mR = box(1.95, 0.16, 3.0, si % 2 ? woodM : woodD, bx + 1.02, -0.09, sz, g, false);
        // userData để bấm ván trong 3D (giữ hành vi cũ của repo).
        mL.userData = { bridge: true, team: ti, step: si, plank: 0 };
        mR.userData = { bridge: true, team: ti, step: si, plank: 1 };
        var pk = { meshL: mL, meshR: mR, z: sz, bx: bx, weakSide: 0, brokenL: false, brokenR: false, crackSide: -1, crackT: 0, touched: false };
        bridges[ti].planks.push(pk);
        allPlanks.push(pk);
      }
      var arr = box(1.4, 0.06, 2.2, mat(TEAMS[ti].color, 0.8), bx, 0.03, -98.6, g, false);
      arr.rotation.y = Math.PI;
    });
    box(0.4, 4.6, 0.4, woodD, -3.4, 2.3, -142, g, false);
    box(0.4, 4.6, 0.4, woodD, 3.4, 2.3, -142, g, false);
    box(7.6, 0.4, 0.45, woodD, 0, 4.5, -142, g, false);
    var endBoard = signBoard('ĐẢO CUỐI', 5.6, 1.15, '#8f1f14', '#ffe9b0');
    endBoard.position.set(0, 3.4, -142); endBoard.rotation.y = Math.PI; g.add(endBoard);
    box(0.16, 6.2, 0.16, postM2, 5.5, 3.1, -137, g, false);
    var endFlag = box(1.9, 1.15, 0.05, mat(0xe2483a, 0.8), 6.5, 5.6, -137, g, false);
    flags.push(endFlag);
    var warn = signBoard('CẦU KHỈ — SƯƠNG MÙ', 5.2, 1.0, '#7a4a24', '#ffedb8');
    warn.position.set(4.9, 2.3, -92); warn.rotation.y = Math.PI; g.add(warn);
    box(0.2, 2.4, 0.2, postM2, 4.9, 1.0, -92, g, false);
    scene.add(g);
  }
  function randomizeBridge() {
    for (var i = 0; i < allPlanks.length; i++) {
      var p = allPlanks[i];
      p.weakSide = Math.random() < 0.5 ? 0 : 1; // mỗi cầu bốc riêng: 0 = trái yếu, 1 = phải yếu — mới hoàn toàn mỗi trận
      p.brokenL = false; p.brokenR = false; p.crackSide = -1; p.crackT = 0; p.touched = false;
      [p.meshL, p.meshR].forEach(function (m, mi) {
        m.visible = true;
        m.position.set(p.bx + (mi === 0 ? -1.02 : 1.02), -0.09, p.z);
        m.rotation.set(0, 0, 0);
      });
    }
    fallingPlanks.length = 0;
  }
  function breakPlank(p, side) {
    var m = side === 0 ? p.meshL : p.meshR;
    if (side === 0) p.brokenL = true; else p.brokenR = true;
    p.crackSide = -1; p.crackT = 0;
    m.rotation.set(0, 0, 0);
    fallingPlanks.push({ mesh: m, vy: 0, vr: (Math.random() - 0.5) * 1.6 });
    crackSound(); splashSound(0.35);
  }
  function updateFallingPlanks(dt) {
    for (var i = fallingPlanks.length - 1; i >= 0; i--) {
      var fp = fallingPlanks[i];
      fp.vy -= 9 * dt;
      fp.mesh.position.y += fp.vy * dt;
      fp.mesh.rotation.x += fp.vr * dt;
      if (fp.mesh.position.y < -4) { fp.mesh.visible = false; fallingPlanks.splice(i, 1); }
    }
    for (var j = 0; j < allPlanks.length; j++) {
      var p = allPlanks[j];
      if (p.crackSide >= 0) {
        var m = p.crackSide === 0 ? p.meshL : p.meshR;
        if (!p.touched) {
          p.crackSide = -1; p.crackT = 0;
          m.rotation.z = 0; m.position.y = -0.09;
        } else {
          m.rotation.z = Math.sin(performance.now() * 0.09) * 0.05;
          m.position.y = -0.09 - Math.random() * 0.03;
        }
      }
      p.touched = false;
    }
  }
  // Có mặt đất dưới chân tại (x,z) trên cầu CỦA ĐỘI ti không? Mỗi đội chỉ đứng được trên cầu của mình.
  function bridgeGround(x, z, ti) {
    var bx = TEAM_BRIDGE_X[ti || 0];
    if (Math.abs(x - bx) <= 5.4 && z <= BR.platZ1 + 0.4 && z >= BR.platZ0 - 0.4) return { ground: true, step: -1, side: -1 };
    if (Math.abs(x) <= 20 && z <= BR.endZ1 + 2.3 && z >= BR.endZ0 - 0.4) return { ground: true, step: -2, side: -1 };
    if (Math.abs(x - bx) > BR.deckHalfW) return { ground: false, step: -3, side: -1 };
    if (z > BR.firstStepZ + 1.55 || z < BR.lastStepZ - 1.55) return { ground: false, step: -3, side: -1 };
    var idx = Math.round((BR.firstStepZ - z) / BR.stepGap);
    if (idx < 0) idx = 0; if (idx > BR.steps - 1) idx = BR.steps - 1;
    var p = bridges[ti || 0].planks[idx];
    var side = x < bx ? 0 : 1;
    var broken = side === 0 ? p.brokenL : p.brokenR;
    return { ground: !broken, step: idx, side: side };
  }

  /* ---- Trống hội lớn + Ông Trùm Hội (mặt nạ tuồng) ---- */
  function buildDrumAndHost() {
    drumGroup = new THREE.Group(); drumGroup.position.set(9.5, 0, -44);
    (function () {
      var stand = mat(0x7a2d16, 0.8);
      box(2.6, 0.35, 1.6, stand, 0, 0.9, 0, drumGroup);
      box(0.3, 0.95, 1.5, stand, -1.0, 0.45, 0, drumGroup);
      box(0.3, 0.95, 1.5, stand, 1.0, 0.45, 0, drumGroup);
      box(1.7, 1.9, 1.9, mat(0xc22f22, 0.55), 0, 2.05, 0, drumGroup);
      var faceM = mat(0xf3e3c2, 0.7);
      box(0.1, 1.96, 1.96, faceM, -0.9, 2.05, 0, drumGroup);
      box(0.1, 1.96, 1.96, faceM, 0.9, 2.05, 0, drumGroup);
      for (var i = 0; i < 10; i++) {
        var a = (i / 10) * Math.PI * 2;
        box(0.13, 0.13, 0.13, mat(0xd8a03c, 0.4, 0.6), (i % 2 ? 0.97 : -0.97), 2.05 + Math.sin(a) * 0.85, Math.cos(a) * 0.85, drumGroup, false);
      }
      drumGroup.rotation.y = 0.5;
      scene.add(drumGroup);
    })();
    hostGroup = new THREE.Group(); hostGroup.position.set(11.8, 0, -45.5); hostGroup.rotation.y = -0.9;
    (function buildHost() {
      var robe = mat(0x8f1f6e, 0.7);
      box(0.72, 1.25, 0.56, robe, 0, 0.85, 0, hostGroup);
      box(0.92, 0.3, 0.72, robe, 0, 0.15, 0, hostGroup);
      box(0.62, 0.5, 0.36, robe, 0, 1.62, 0, hostGroup);
      box(0.46, 0.5, 0.46, mat(0xf0c08a, 0.65), 0, 2.12, 0, hostGroup);
      var cv = document.createElement('canvas'); cv.width = 128; cv.height = 160;
      var cx = cv.getContext('2d');
      cx.fillStyle = '#f7f0e0'; cx.fillRect(0, 0, 128, 160);
      cx.fillStyle = '#c22f22';
      cx.beginPath(); cx.arc(64, 42, 26, 0, Math.PI * 2); cx.fill();
      cx.fillStyle = '#1c1c22';
      cx.fillRect(18, 66, 34, 9); cx.fillRect(76, 66, 34, 9);
      cx.fillStyle = '#fff';
      cx.beginPath(); cx.arc(35, 88, 8, 0, Math.PI * 2); cx.arc(93, 88, 8, 0, Math.PI * 2); cx.fill();
      cx.fillStyle = '#1c1c22';
      cx.beginPath(); cx.arc(35, 88, 3.6, 0, Math.PI * 2); cx.arc(93, 88, 3.6, 0, Math.PI * 2); cx.fill();
      cx.strokeStyle = '#c22f22'; cx.lineWidth = 6;
      cx.beginPath(); cx.arc(64, 118, 20, 0.15 * Math.PI, 0.85 * Math.PI); cx.stroke();
      cx.fillStyle = '#d8a03c'; cx.fillRect(56, 0, 16, 20);
      var tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
      var mask = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.64),
        new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5 }));
      mask.position.set(0, 2.12, 0.245); hostGroup.add(mask);
      box(0.5, 0.16, 0.5, mat(0x1c1c22, 0.6), 0, 2.42, 0, hostGroup);
      var w1 = box(0.08, 0.5, 0.3, mat(0x1c1c22, 0.6), -0.32, 2.55, 0, hostGroup); w1.rotation.z = 0.35;
      var w2 = box(0.08, 0.5, 0.3, mat(0x1c1c22, 0.6), 0.32, 2.55, 0, hostGroup); w2.rotation.z = -0.35;
      function arm(side) {
        var pivot = new THREE.Group(); pivot.position.set(0.36 * side, 1.78, 0);
        box(0.16, 0.62, 0.16, robe, 0, -0.28, 0, pivot);
        var stick = box(0.09, 0.62, 0.09, mat(0xd8b878, 0.7), 0.1 * side, -0.72, 0.22, pivot);
        stick.rotation.x = 0.9;
        hostGroup.add(pivot);
        return pivot;
      }
      hostArmL = arm(-1); hostArmR = arm(1);
      scene.add(hostGroup);
    })();
  }
  function buildRingsAndConfetti() {
    playerRing = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.68, 24),
      new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
    playerRing.rotation.x = -Math.PI / 2; scene.add(playerRing);
    playerArrow = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.5, 4),
      new THREE.MeshBasicMaterial({ color: 0xffd34d }));
    playerArrow.rotation.x = Math.PI; scene.add(playerArrow);
    // Vòng ngọc lam đánh dấu người đang được khán giả theo dõi.
    specRing = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.74, 24),
      new THREE.MeshBasicMaterial({ color: 0x53e0d4, transparent: true, opacity: 0.95, side: THREE.DoubleSide }));
    specRing.rotation.x = -Math.PI / 2; specRing.visible = false; scene.add(specRing);
    specArrow = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.46, 4),
      new THREE.MeshBasicMaterial({ color: 0x53e0d4 }));
    specArrow.rotation.x = Math.PI; specArrow.visible = false; scene.add(specArrow);
    confettiGroup = new THREE.Group(); scene.add(confettiGroup);
  }
  function burstConfetti(x, z) {
    var cols = [0xe2483a, 0xf2b01e, 0x39a05a, 0x2e7fc4, 0xe2703a];
    for (var i = 0; i < 90; i++) {
      var m = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.24),
        new THREE.MeshBasicMaterial({ color: cols[i % cols.length], side: THREE.DoubleSide }));
      m.position.set(x + (Math.random() - 0.5) * 2, 3 + Math.random() * 2, z + (Math.random() - 0.5) * 2);
      m.userData = {
        vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 4, vz: (Math.random() - 0.5) * 3,
        rx: Math.random() * 6, rz: Math.random() * 6, life: 2.6 + Math.random()
      };
      confettiGroup.add(m); confetti.push(m);
    }
  }
  function updateConfetti(dt) {
    for (var i = confetti.length - 1; i >= 0; i--) {
      var m = confetti[i], u = m.userData;
      u.life -= dt; u.vy -= 5.5 * dt;
      m.position.x += u.vx * dt; m.position.y += u.vy * dt; m.position.z += u.vz * dt;
      m.rotation.x += u.rx * dt; m.rotation.z += u.rz * dt;
      if (u.life <= 0 || m.position.y < 0.05) { confettiGroup.remove(m); confetti.splice(i, 1); }
    }
  }

  // ================= CHARACTERS (port từ prototype) =================
  var SHIRT_COLORS = [0xe2483a, 0x2e7fc4, 0x39a05a, 0xf2a01e, 0xe2703a, 0x8e44ad, 0x16a3a3, 0xd6336c, 0x5b8c2a, 0x2470a0, 0xc98a1e, 0x7070c8];
  var SKIN = [0xf0c08a, 0xe0aa72, 0xc98a5e];
  var VN_NAMES = ['Tí', 'Tèo', 'Bin', 'Bống', 'Cò', 'Vạc', 'Sáo', 'Mít', 'Na', 'Ổi', 'Xoài', 'Bưởi', 'Cam', 'Chanh', 'Dừa', 'Mận', 'Đào', 'Lê', 'Táo', 'Nho', 'Khế', 'Sung', 'Vả', 'Dâu', 'Sen', 'Súng', 'Huệ', 'Lan', 'Cúc', 'Mai'];
  function makeVillager(shirtColor, skinColor, opts) {
    opts = opts || {};
    var g = new THREE.Group();
    var shirt = mat(shirtColor, 0.8), pants = mat(0x33333e, 0.9), skin = mat(skinColor, 0.65);
    function leg(side) {
      var pivot = new THREE.Group(); pivot.position.set(0.13 * side, 0.92, 0);
      box(0.17, 0.9, 0.19, pants, 0, -0.45, 0, pivot);
      g.add(pivot); return pivot;
    }
    var legL = leg(-1), legR = leg(1);
    box(0.56, 0.72, 0.32, shirt, 0, 1.28, 0, g);
    box(0.58, 0.1, 0.34, shirt, 0, 0.95, 0, g);
    function armMesh(side) {
      var pivot = new THREE.Group(); pivot.position.set(0.36 * side, 1.58, 0);
      box(0.15, 0.6, 0.15, shirt, 0, -0.24, 0, pivot);
      box(0.13, 0.16, 0.13, skin, 0, -0.6, 0, pivot);
      g.add(pivot); return pivot;
    }
    var armL = armMesh(-1), armR = armMesh(1);
    box(0.42, 0.44, 0.42, skin, 0, 1.86, 0, g);
    var eyeM = mat(0x1c1c22, 0.5);
    box(0.06, 0.08, 0.03, eyeM, -0.1, 1.9, 0.215, g, false);
    box(0.06, 0.08, 0.03, eyeM, 0.1, 1.9, 0.215, g, false);
    if (opts.hat !== false) {
      box(0.8, 0.09, 0.8, mat(0xd9b878, 0.9), 0, 2.1, 0, g);
      box(0.52, 0.12, 0.52, mat(0xd9b878, 0.9), 0, 2.2, 0, g);
      box(0.26, 0.12, 0.26, mat(0xc9a86a, 0.9), 0, 2.31, 0, g);
    } else {
      box(0.46, 0.12, 0.46, mat(0xd63c2f, 0.7), 0, 2.06, 0, g, false);
    }
    g.userData = { legL: legL, legR: legR, armL: armL, armR: armR, shirtMat: shirt, shirtColor: shirtColor };
    scene.add(g);
    return g;
  }
  function animateFigure(fig, speedNorm, dt, baseY) {
    var u = fig.userData;
    var target = Math.min(1, Math.abs(speedNorm));
    u.walkAmp = (u.walkAmp == null ? 0 : u.walkAmp) + (target - (u.walkAmp || 0)) * Math.min(1, dt * 10);
    var amp = u.walkAmp || 0;
    u.phase = (u.phase || 0) + dt * (4 + Math.abs(speedNorm) * 7) * (amp > 0.02 ? 1 : 0);
    var s = Math.sin(u.phase || 0);
    u.legL.rotation.x = s * 0.65 * amp;
    u.legR.rotation.x = -s * 0.65 * amp;
    u.armL.rotation.x = -s * 0.55 * amp;
    u.armR.rotation.x = s * 0.55 * amp;
    fig.position.y = Math.abs(Math.cos(u.phase || 0)) * 0.05 * amp + (baseY || 0);
  }
  function resetFigure(fig, x, z) {
    fig.position.set(x, 0, z);
    fig.rotation.set(0, Math.PI, 0);
    fig.userData.walkAmp = 0; fig.userData.phase = Math.random() * 6;
    fig.visible = true;
  }

  // ---- Người chơi / bot (giữ đúng API mà rounds.js và server dùng) ----
  // Nhân vật đứng trên mặt đất y=0 (không còn bệ y=4 như bản cũ); nhảy cộng vào group.position.y.
  function createPerson(name, shirtColor, isBot, x, z) {
    var hex = typeof shirtColor === 'string' ? parseInt(shirtColor.slice(1), 16) : shirtColor;
    var g = makeVillager(hex, 0xf0c08a, { hat: !isBot || Math.random() < 0.75 });
    g.position.set(x, 0, z);
    return {
      id: null, name: name, group: g, x: x, z: z, y: 0, vy: 0, vx: 0, vz: 0, face: Math.PI,
      grounded: true, alive: true, finished: false, finishTime: null, isBot: !!isBot,
      team: null, bridgeStep: 0, jumped: false, color: shirtColor,
      speed: 3.1 + Math.random() * 2.3, laneX: x, wobble: Math.random() * Math.PI * 2,
      react: 0.08 + Math.random() * 0.35, willFall: false, fallTimer: 0, fallAnim: 0, stopTimer: 0,
      gongMove: 0, jumpedInGong: false, dist: 0, falling: false, teamRing: null
    };
  }
  function spawnBots() {
    bots = [];
    for (var i = 0; i < 60; i++) {
      var colIdx = i % 12, row = Math.floor(i / 12);
      var bx = -13.5 + colIdx * 2.45 + (Math.random() - 0.5) * 0.8;
      var bz = START_Z - 1.2 - row * 1.7 - Math.random() * 0.5;
      var name = 'Số ' + (i + 1) + ' · ' + VN_NAMES[i % VN_NAMES.length] + (i >= VN_NAMES.length ? ' ' + (Math.floor(i / VN_NAMES.length) + 1) : '') + ' · BOT';
      var b = createPerson(name, '#' + SHIRT_COLORS[i % SHIRT_COLORS.length].toString(16).padStart(6, '0'), true, bx, bz);
      b.id = 'bot-' + i; b.laneX = bx;
      bots.push(b);
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
    var el = $('hud-alive'); if (el) el.textContent = alive;
    if (player && player.alive) {
      var prog = Math.min(1, Math.max(0, (START_Z - player.z) / TRACK_LEN));
      var pf = $('progress-fill'); if (pf) pf.style.width = Math.round(prog * 100) + '%';
    }
  }
  function eliminate(person, reason) {
    if (!person || !person.alive) return;
    // QC "Không loại (chỉ test giao diện)": người chơi không bị loại.
    if (qcMode && qcNoElim && person === player) { toast('QC: Không loại — bạn vẫn tiếp tục (chỉ test giao diện).'); return; }
    person.alive = false; person.spectator = true;
    if (person.isBot) person.fallAnim = 0.0001;
    if (person === player) {
      elimSound();
      phase = 'spectator';
      enterSpectator();
      setSpectatorBanner(true);
      buildSpectatorList();
      toast('Bạn bị loại: ' + reason);
      var hd = $('hud-drum'); if (hd) hd.textContent = 'BỊ LOẠI — Chế độ khán giả';
    }
    updateAliveHUD();
  }
  function buildSpectatorList() {
    spectatorList = allPersons().filter(function (p) { return p.alive; });
    // Dự phòng cuối loại chính mình khi mình đã chết (xem specTargets, bug #29).
    if (!spectatorList.length) spectatorList = allPersons().filter(function (p) { return p !== player || p.alive; });
    if (!spectatorList.length) spectatorList = allPersons();
    // Đừng ghi đè watchedId khi camera đang theo một người còn sống hợp lệ
    // (enterSpectator vừa chọn leader theo z): trước đây buildSpectatorList
    // luôn đặt watchedId = spectatorList[0] nên banner "Đang xem" có thể
    // ghi tên người khác với người camera đang theo.
    if (spectatorList.length && !(spec.target && spec.target.alive)) watchedId = spectatorList[0].id;
    updateWatchedName();
  }
  function watchedPerson() {
    return allPersons().find(function (p) { return p.id === watchedId; }) || spectatorList[0];
  }
  function updateWatchedName() {
    var w = watchedPerson();
    var el = $('watched-name'); if (el) el.textContent = w ? ('Đang xem: ' + w.name) : 'Đang xem: —';
  }

  // ---- Danh sách du lịch (nút + icon silhouette khối vuông riêng từng đảo) ----
  function drawPoiIcon(cv, type) {
    var cx = cv.getContext('2d');
    cx.fillStyle = '#bfe6ef'; cx.fillRect(0, 0, cv.width, cv.height);
    cx.fillStyle = '#2b7fb3'; cx.fillRect(0, cv.height - 5, cv.width, 5);
    var rock = '#8d9291', veg = '#3e6b35', sand = '#e9d193', dark = '#10181c';
    function R(x, y, w, h, c) { cx.fillStyle = c; cx.fillRect(x, y, w, h); }
    if (type === 'pair') {
      R(6, 8, 5, 14, rock); R(8, 5, 4, 4, rock); R(8, 3, 5, 3, veg);
      R(24, 10, 4, 12, rock); R(22, 6, 4, 5, rock); R(21, 4, 4, 3, veg);
    } else if (type === 'cone') {
      R(16, 3, 4, 4, veg); R(13, 7, 10, 4, veg); R(10, 11, 16, 4, veg); R(7, 15, 22, 4, veg);
      R(4, 20, 12, 3, sand); R(24, 21, 8, 2, '#8a6b35');
    } else if (type === 'towers') {
      R(3, 10, 5, 13, rock); R(10, 5, 5, 18, rock); R(11, 3, 4, 3, veg); R(19, 8, 5, 15, rock); R(27, 12, 5, 11, rock);
    } else if (type === 'saddle') {
      R(4, 9, 6, 5, veg); R(3, 14, 8, 8, rock); R(13, 14, 10, 4, veg); R(25, 9, 6, 5, veg); R(24, 14, 8, 8, rock);
    } else if (type === 'arch') {
      R(5, 6, 26, 16, rock); R(5, 3, 26, 4, veg);
      cx.fillStyle = '#bfe6ef'; cx.fillRect(14, 13, 8, 9);
      R(14, 13, 8, 3, dark);
    } else if (type === 'bridge') {
      R(2, 18, 32, 2, '#a5763a');
      R(8, 12, 2, 7, '#6e4a26'); R(17, 12, 2, 7, '#6e4a26'); R(26, 12, 2, 7, '#6e4a26');
      R(4, 10, 28, 2, '#e2483a');
    } else if (type === 'incense') {
      R(7, 6, 22, 4, rock); R(7, 3, 22, 3, veg);
      R(9, 10, 4, 10, rock); R(16, 10, 4, 10, rock); R(23, 10, 4, 10, rock);
    } else if (type === 'toad') {
      R(5, 12, 26, 10, rock); R(5, 9, 26, 4, veg);
      R(10, 5, 5, 5, rock); R(21, 5, 5, 5, rock); R(11, 3, 3, 3, veg); R(22, 3, 3, 3, veg);
    } else if (type === 'sim') {
      R(6, 12, 24, 10, veg); R(10, 7, 16, 6, veg); R(15, 3, 6, 5, veg);
      cx.fillStyle = '#b565d8';
      [[9, 14], [15, 16], [22, 13], [27, 17], [12, 19]].forEach(function (p) { cx.fillRect(p[0], p[1], 2, 2); });
      R(3, 20, 10, 3, sand);
    } else if (type === 'monkey') {
      R(4, 14, 10, 8, rock); R(20, 12, 12, 10, rock); R(6, 9, 6, 6, veg); R(23, 7, 7, 6, veg);
      cx.fillStyle = '#8a5a2b'; cx.fillRect(8, 10, 3, 3); cx.fillRect(25, 8, 3, 3);
    } else {
      R(4, 16, 28, 6, veg);
      R(9, 11, 6, 5, '#f3e2c0'); R(8, 9, 8, 3, '#b5451b');
      R(21, 12, 5, 4, '#f3e2c0'); R(20, 10, 7, 3, '#b5451b');
      R(29, 8, 2, 8, veg);
    }
  }
  function buildTourList() {
    var list = $('tour-list');
    if (!list) return;
    TOUR_ISLANDS.forEach(function (island, idx) {
      var b = document.createElement('button');
      b.className = 'btn small';
      var cv = document.createElement('canvas'); cv.width = 36; cv.height = 26;
      drawPoiIcon(cv, island.icon);
      b.appendChild(cv);
      var wrap = document.createElement('span');
      var nm = document.createElement('span'); nm.textContent = island.name + ' — ' + island.label;
      var ft = document.createElement('span'); ft.textContent = island.feat;
      wrap.appendChild(nm); wrap.appendChild(document.createElement('br')); wrap.appendChild(ft);
      b.appendChild(wrap);
      b.onclick = function () { focusIsland(idx, true); };
      list.appendChild(b);
    });
  }

  // ================= SPECTATOR CAMERA (port từ prototype) =================
  /* Nguyên tắc mượt: mọi điểm nhìn & vị trí camera đều qua damping mũ
     độc lập FPS (1-exp(-lambda*dt)); điểm nhìn cố định ở thân (y=1.25),
     không bám theo nhún nhảy của hình; đổi người/góc chỉ đổi "đích",
     camera tự blend tới trong ~0.8s, không bao giờ cắt cảnh. */
  var spec = {
    active: false, mode: 'follow', target: null,
    yaw: 0, pitch: 0.34, dist: 9,
    ovYaw: 0.0, ovPitch: 0.95, ovDist: 58,
    freeYaw: 0, freePitch: 0.4, freeDist: 12,
    freeCenter: new THREE.Vector3(0, 1.25, 10)
  };
  function specTargets() {
    var list = allPersons().filter(function (p) { return p.alive && !p.finished; });
    if (!list.length) list = allPersons().filter(function (p) { return p.alive; });
    // Dự phòng cuối: loại chính mình khi mình đã chết (khán giả vào giữa
    // trận) — nếu không, khán giả mới vào sẽ "Đang xem" chính mình (bug
    // #29: lúc joined chưa có remotePlayers, allPersons() chỉ có mình).
    // Chỉ khi trong phòng thật sự chỉ còn mình thì mới trả về chính mình.
    if (!list.length) list = allPersons().filter(function (p) { return p !== player || p.alive; });
    if (!list.length) list = allPersons();
    return list;
  }
  function specLeader() {
    var list = specTargets(), best = null;
    for (var i = 0; i < list.length; i++) if (!best || list[i].z < best.z) best = list[i];
    return best;
  }
  function updateSpecUI() {
    document.querySelectorAll('.spec-view, .specBtn[data-specmode]').forEach(function (b) {
      var v = b.dataset.view || b.dataset.specmode;
      b.classList.toggle('on', v === (spec.mode === 'overview' ? 'panorama' : spec.mode));
    });
    var w = spec.target || watchedPerson();
    var el = $('watched-name'); if (el) el.textContent = 'Đang xem: ' + (w ? w.name : '— (chờ người chạy)');
  }
  function setSpecTarget(p) {
    if (!p) return;
    spec.target = p;
    watchedId = p.id;
    updateSpecUI();
  }
  function cycleSpecTarget(dir) {
    var list = spectatorList.length ? spectatorList : specTargets();
    if (!list.length) return;
    var cur = spec.target || watchedPerson();
    var idx = list.indexOf(cur);
    if (idx < 0) idx = dir > 0 ? -1 : 0;
    idx = (idx + dir + list.length) % list.length;
    setSpecTarget(list[idx]);
    if (spec.mode === 'free') spec.freeCenter.set(list[idx].x, 1.25, list[idx].z);
  }
  function setSpecMode(m) {
    if (m === 'panorama') m = 'overview';
    spec.mode = m;
    spectatorView = m === 'overview' ? 'panorama' : m;
    if (m === 'free' && spec.target) spec.freeCenter.set(spec.target.x, 1.25, spec.target.z);
    if (m === 'follow' && spec.target) spec.yaw = spec.target.face + Math.PI;
    updateSpecUI();
  }
  // Banner khán giả: CSS #specBanner mặc định display:none nên chỉ gỡ class
  // .hidden là chưa đủ (cùng họ lỗi với #teamPanel / #chatPanel) — phải set
  // cả style.display. Mọi chỗ hiện/ẩn banner đều qua helper này.
  function setSpectatorBanner(show) {
    var sp = $('spectator'); if (!sp) return;
    sp.classList.toggle('hidden', !show);
    sp.style.display = show ? 'block' : 'none';
  }
  function enterSpectator() {
    hideRoundHint(); // khán giả không điều khiển nhân vật — ẩn gợi ý phím
    spec.active = true;
    spec.mode = 'follow'; spectatorView = 'follow';
    spec.yaw = camYawCur; spec.pitch = 0.34; spec.dist = 9;
    setSpecTarget(specLeader());
    updateSpecUI();
  }
  function exitSpectator() {
    spec.active = false; spec.target = null;
    if (specRing) specRing.visible = false;
    if (specArrow) specArrow.visible = false;
  }
  function specZoom(f) {
    if (spec.mode === 'overview') spec.ovDist = Math.max(26, Math.min(85, spec.ovDist * f));
    else if (spec.mode === 'free') spec.freeDist = Math.max(4, Math.min(30, spec.freeDist * f));
    else spec.dist = Math.max(4.5, Math.min(16, spec.dist * f));
  }

  // ================= DU LỊCH HẠ LONG (port từ prototype) =================
  var tour = {
    active: false, yaw: 0.7, pitch: 0.42, dist: 80, tDist: 80, tYaw: 0.7, tPitch: 0.42,
    center: new THREE.Vector3(0, 2, 0), tCenter: new THREE.Vector3(0, 2, 0), poi: 0, custom: null
  };
  var exploreReturn = { menu: false };
  var detailGroup = null, detailExtra = null, detailBirds = [];
  var DISTANT_TALES = [
    { tag: 'Hòn Tháp Cô Đơn', story: 'Chuyện trong thế giới game: Tháp đá đứng một mình giữa vịnh, ngư dân trong game lấy nó làm mốc né đá ngầm — thấy tháp là biết luồng nước sâu. Đỉnh tháp phủ cây, chim làm tổ trong các khe đá nứt.' },
    { tag: 'Hòn Mâm Xanh', story: 'Chuyện trong thế giới game: Đảo thấp và tròn như chiếc mâm úp, mùa nào cũng xanh cây. Lời kể trong game nói ai neo thuyền qua đêm ở bãi cát phía nam sẽ nghe tiếng chim gọi nhau lúc rạng sáng.' },
    { tag: 'Hòn Song Sinh', story: 'Chuyện trong thế giới game: Hai chỏm đá nhô cạnh nhau như anh em sinh đôi — dân chài trong game gọi vui là "hai anh em giữ cửa vịnh", thuyền qua giữa hai chỏm là vào vùng nước lặng.' },
    { tag: 'Hòn Ngọn Nến', story: 'Chuyện trong thế giới game: Khối đá cao và mảnh như ngọn nến cắm giữa biển. Truyền thuyết trong game kể đó là cây nến đá thắp cho thuyền lạc đường tìm về bờ, nên đảo có đèn dấu nhấp nháy suốt đêm.' },
    { tag: 'Hòn Mai Rùa', story: 'Chuyện trong thế giới game: Đảo tròn vo phủ cây như mai rùa khổng lồ nhô lên mặt nước. Trong game, trẻ làng tin rằng "cụ rùa đá" này bơi rất chậm — chậm đến mức cả đời chỉ nhích được vài gang tay.' }
  ];
  function setTourInfo(name, text) {
    var d = $('tour-detail');
    if (!d) return;
    d.innerHTML = '<h3>' + escapeHtml(name) + '</h3><p>' + escapeHtml(text) + '</p>' +
      '<p class="note">Bấm đảo khác trong danh sách, chấm đảo trên minimap, hoặc bấm trực tiếp đảo trong 3D để bay tới đảo đó. Chỉ đảo đang xem mới hiển thị chi tiết đầy đủ.</p>';
  }
  function markTourBtn(idx) {
    var list = $('tour-list');
    if (!list) return;
    Array.prototype.forEach.call(list.children, function (b, i) { b.classList.toggle('on', i === idx); });
  }
  function clearDetailIsland() {
    if (detailGroup) { scene.remove(detailGroup); detailGroup = null; }
    if (detailExtra) { scene.remove(detailExtra); detailExtra = null; }
    for (var i = 0; i < detailBirds.length; i++) {
      scene.remove(detailBirds[i].g);
      var ix = birdFlocks.indexOf(detailBirds[i]);
      if (ix >= 0) birdFlocks.splice(ix, 1);
    }
    detailBirds = [];
  }
  function buildDetailIsland(rec, seedIdx) {
    clearDetailIsland();
    var sd = ((seedIdx * 1103515245 + 12345) % 2147483648) / 2147483648;
    function rnd() { sd = ((sd * 1103515245 + 12345) % 2147483648) / 2147483648; return sd; }
    var g = new THREE.Group(); g.position.set(rec.x, -1.3, rec.z);
    var rock = flatMat(0x848e90), rock2 = flatMat(0x707a7e), dark = flatMat(0x525c60), veg = flatMat(0x4c7a41), veg2 = flatMat(0x3e6b35), sand = flatMat(0xe9d193);
    var W = Math.max(20, rec.w * 1.25), H = Math.max(13, rec.h * 0.95);
    box(W * 1.15, 2.2, W * 0.95, dark, 0, 0.5, 0, g, false);
    box(W, H * 0.34, W * 0.82, rock2, 0.5, 1.4 + H * 0.17, 0, g, false);
    box(W * 0.78, H * 0.32, W * 0.64, rock, -0.4, 1.4 + H * 0.5, 0, g, false);
    box(W * 0.55, H * 0.3, W * 0.46, rock, 0.2, 1.4 + H * 0.8, 0, g, false);
    box(W * 0.52, H * 0.1, W * 0.44, veg, 0.2, 1.4 + H * 0.99, 0, g, false);
    box(0.6, H * 0.55, 0.6, dark, W * 0.31, 1.4 + H * 0.42, W * 0.3, g, false);
    box(0.6, H * 0.4, 0.6, dark, -W * 0.26, 1.4 + H * 0.5, W * 0.31, g, false);
    for (var ci = 0; ci < 5; ci++) {
      var ca = 2.5 + ci * 0.3;
      box(6, 0.5, 3, sand, Math.cos(ca) * W * 0.52, 0.8, Math.sin(ca) * W * 0.42, g, false).rotation.y = -ca;
    }
    for (var pi = 0; pi < 5; pi++) box(2.4, 0.3, 1.8, mat(0x8a6b35, 0.95), -W * 0.55 - pi * 1.9, 0.2, W * 0.3 - pi * 0.5, g, false);
    var topY = 1.4 + H * 1.04;
    vxTree(g, 0, topY, 0, 1.05, 'canopy'); vxTree(g, W * 0.18, topY - 0.4, W * 0.1, 0.8, 'canopy');
    vxTree(g, -W * 0.2, topY - H * 0.22, -W * 0.08, 0.85, 'bamboo');
    vxTree(g, W * 0.28, topY - H * 0.3, -W * 0.14, 0.8, 'bamboo');
    if (rnd() > 0.35) vxTree(g, -W * 0.34, 1.1, W * 0.3, 1.0, 'palm');
    if (rnd() > 0.5) vxTree(g, W * 0.3, 1.1, W * 0.34, 0.9, 'palm');
    vxBush(g, W * 0.36, 1.3, W * 0.18, 1); vxBush(g, -W * 0.38, 1.3, -W * 0.16, 0.9);
    vxFlowers(g, -W * 0.2, 1.35, W * 0.26, 5, [0xf28bb4, 0xf2b01e, 0xe2703a]);
    vxBeacon(g, W * 0.44, 1, W * 0.3, [0xe2483a, 0xf2b01e, 0x53e0d4][seedIdx % 3]);
    var tale = DISTANT_TALES[seedIdx % DISTANT_TALES.length];
    var nm = tale.tag + ' · Đảo xa ' + (seedIdx + 1);
    var board = signBoard(nm.toUpperCase(), 13, 2.2, '#7a4a24', '#ffedb8');
    board.position.set(rec.x - Math.sin(0.8) * W * 0.4, 4.2, rec.z - Math.cos(0.8) * W * 0.4);
    board.rotation.y = Math.atan2(rec.x - board.position.x, rec.z - board.position.z) + Math.PI;
    scene.add(board);
    var pole = box(0.3, 3.4, 0.3, mat(0x6e4a26, 0.95), board.position.x, 1.6, board.position.z, scene, false);
    detailGroup = g; scene.add(g);
    for (var bi = 0; bi < 3; bi++) {
      var bg = new THREE.Group();
      var bm = mat(0xf6f2e8, 0.7);
      box(0.55, 0.16, 0.2, bm, 0, 0, 0, bg, false);
      var wl = new THREE.Group(); wl.position.set(-0.06, 0.06, 0); bg.add(wl);
      box(0.85, 0.07, 0.3, bm, -0.45, 0, 0, wl, false);
      var wr = new THREE.Group(); wr.position.set(0.06, 0.06, 0); bg.add(wr);
      box(0.85, 0.07, 0.3, bm, 0.45, 0, 0, wr, false);
      scene.add(bg);
      var rec2 = { g: bg, wl: wl, wr: wr, cx: rec.x, cy: topY + 7 + bi * 1.5, cz: rec.z, r: W * 0.55 + bi * 2.5, sp: 0.16 + rnd() * 0.08, ph: bi * 2.1 + rnd() * 3, fl: 8 + rnd() * 2, hBob: rnd() * 6 };
      birdFlocks.push(rec2); detailBirds.push(rec2);
    }
    var holder = new THREE.Group(); scene.add(holder); holder.add(board); holder.add(pole);
    detailExtra = holder;
    return { name: nm, text: tale.story + ' Đây là một trong hàng trăm đảo xa của vịnh — chi tiết (cây, bãi cát, cầu tàu, biển tên, chim) chỉ dựng khi bạn bay tới xem đảo này, các đảo xa khác vẫn giữ dạng đơn giản cho nhẹ máy.' };
  }
  function flyToPOI(idx) {
    tour.poi = idx; tour.custom = null;
    clearDetailIsland();
    var poi = TOUR_ISLANDS[idx];
    tour.tCenter.set(poi.x, poi.y, poi.z);
    tour.tDist = poi.dist;
    if (poi.yaw != null) tour.tYaw = poi.yaw;
    if (poi.pitch != null) tour.tPitch = poi.pitch;
    setTourInfo(poi.name, poi.story);
    markTourBtn(idx);
    detailedIsland = poi.id;
  }
  function flyToDistant(rec, seedIdx) {
    if (!activateExplore()) return;
    var info = buildDetailIsland(rec, seedIdx);
    tour.custom = { x: rec.x, z: rec.z };
    markTourBtn(-1);
    tour.tCenter.set(rec.x, Math.max(3, rec.h * 0.4), rec.z);
    tour.tDist = Math.max(42, Math.min(115, rec.w * 2.7));
    tour.tYaw = 0.8; tour.tPitch = 0.32;
    setTourInfo(info.name, info.text);
    toast('Đang bay tới ' + info.name + ' — đảo đã hiện chi tiết đầy đủ');
  }
  function flyOverview() {
    tour.custom = null;
    clearDetailIsland();
    markTourBtn(-1);
    tour.tCenter.set(0, 6, 10);
    tour.tDist = 235; tour.tYaw = 0.7; tour.tPitch = 0.46;
    setTourInfo('Toàn cảnh Vịnh Hạ Long', 'Từ trên cao nhìn xuống: Đảo Hội Làng ở giữa, quanh là các đảo đá vôi lớn nhỏ của vịnh — vịnh thật có 1.969 đảo trên 1.553 km². Bấm vào bất kỳ đảo nào trong thế giới 3D, trên bản đồ nhỏ hoặc trong danh sách để bay tới xem chi tiết đảo đó.');
  }
  function canExplore() {
    return phase === 'menu' || phase === 'finished' || phase === 'tourism' || !player || !player.alive || player.finished;
  }
  function activateExplore() {
    if (!canExplore()) {
      toast('Đang trong trận — về đích hoặc bị loại rồi mới đi khám phá đảo được nhé!');
      return false;
    }
    if (tour.active) return true;
    exploreReturn.menu = (phase === 'menu');
    exitSpectator();
    tour.active = true;
    tour.center.set(camera.position.x * 0.3, 2, camera.position.z * 0.3);
    var tp = $('tourism'); if (tp) tp.classList.remove('hidden');
    setSpectatorBanner(false);
    if (exploreReturn.menu) { var m = $('menu'); if (m) m.classList.add('hidden'); }
    return true;
  }
  function enterTour() {
    if (!activateExplore()) return;
    ensureAudio(); startAmbient();
    flyToPOI(tour.poi || 0);
  }
  function exitTour(backToSpec) {
    var tp = $('tourism'); if (tp) tp.classList.add('hidden');
    if (!tour.active) return;
    tour.active = false;
    tour.custom = null;
    clearDetailIsland();
    if (exploreReturn.menu) {
      exploreReturn.menu = false;
      var m = $('menu'); if (m) m.classList.remove('hidden');
      return;
    }
    if (backToSpec && player && !player.alive) {
      enterSpectator();
      setSpectatorBanner(true);
    }
  }
  // ---- Bấm thẳng vào đảo trong thế giới 3D ----
  var poiProxies = [];
  function buildPoiProxies() {
    var proxyMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false });
    TOUR_ISLANDS.forEach(function (poi, idx) {
      if (idx === 0) return; // đảo chính có proxy quá lớn, dễ bấm nhầm lúc xem trận
      var r = Math.max(17, Math.min(44, poi.dist * 0.44));
      var m = new THREE.Mesh(new THREE.BoxGeometry(r * 2, 40, r * 2), proxyMat);
      m.position.set(poi.x, 9, poi.z);
      m.userData.poiIdx = idx;
      scene.add(m); poiProxies.push(m);
    });
    [[-150, -120, 17], [135, -60, 12], [-120, 90, 14], [150, 110, 19]].forEach(function (si, k) {
      var m2 = new THREE.Mesh(new THREE.BoxGeometry(si[2] * 2.2, 26, si[2] * 2.2), proxyMat);
      m2.position.set(si[0], 6, si[1]);
      m2.userData.smallIsle = { x: si[0], z: si[1], w: si[2] * 1.9, h: 13 + k * 2 };
      m2.userData.smallIdx = 40 + k;
      scene.add(m2); poiProxies.push(m2);
    });
    distantMeshes.forEach(function (dm, li) {
      dm.userData.baseIdx = li === 0 ? 0 : (li === 1 ? 120 : 250);
    });
  }
  function pickIslandAt(clientX, clientY) {
    var ndc = new THREE.Vector2((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
    raycaster = raycaster || new THREE.Raycaster();
    raycaster.setFromCamera(ndc, camera);
    var hits = raycaster.intersectObjects(poiProxies.concat(distantMeshes), false);
    if (!hits.length) return null;
    var h = hits[0];
    if (h.object.userData.poiIdx != null) return { type: 'poi', idx: h.object.userData.poiIdx };
    if (h.object.userData.smallIsle) return { type: 'distant', rec: h.object.userData.smallIsle, seed: h.object.userData.smallIdx };
    if (h.object.userData.isDistant && h.instanceId != null) {
      var gi = h.object.userData.baseIdx + h.instanceId;
      if (distantIslands[gi]) return { type: 'distant', rec: distantIslands[gi], seed: gi };
    }
    return null;
  }
  function goPick(pick) {
    if (!pick) return false;
    if (!canExplore() && !tour.active) {
      toast('Đang trong trận — về đích hoặc bị loại rồi mới đi khám phá đảo được nhé!');
      return true;
    }
    if (pick.type === 'poi') { if (activateExplore()) flyToPOI(pick.idx); }
    else flyToDistant(pick.rec, pick.seed);
    return true;
  }
  function focusIsland(idx, fromList) {
    var island = TOUR_ISLANDS[idx];
    if (!island) return;
    if (!activateExplore()) return;
    flyToPOI(idx);
  }
  function backToPanorama() { flyOverview(); }
  function backToMatch() {
    exitTour(false);
    if (player && player.alive) { phase = phase === 'tourism' ? 'round1' : phase; }
    else if (player) { phase = 'spectator'; setSpectatorBanner(true); }
  }

  // ================= CHAT PHÒNG (port từ prototype, map sang DOM của repo) =================
  var CHAT_MAX_LEN = 120, CHAT_MIN_GAP = 2000, BUBBLE_MS = 5000;
  var lastPlayerChatAt = 0, chatBubbles = [];
  var BOT_LINES = [
    'Chào cả nhà! Mình là bot mẫu của bản chơi đơn đây.',
    'Cố lên mọi người ơi!',
    'Nghe trống cho kỹ nhé — chiêng vang là đứng yên tuyệt đối đấy.',
    'Đảo hôm nay đẹp quá, có cả chim bay trên vịnh.',
    'Ai qua cầu vòng 2 thì đi theo lượt của đội mình thôi nhé, đừng chen.',
    'Hay quá!',
    'Nhanh lên, đích ở sân đình kìa!'
  ];
  var botChatT = 5;
  function chatTyping() { return document.activeElement === $('chat-input'); }
  function chatNow() {
    var d = new Date();
    return (d.getHours() < 10 ? '0' : '') + d.getHours() + ':' + (d.getMinutes() < 10 ? '0' : '') + d.getMinutes();
  }
  function playerChatColor() {
    if (currentRound === 2 && myTeam !== null && myTeam !== undefined) return teamColorHex(myTeam);
    return '#e2483a';
  }
  function openChat() {
    var p = $('chat-panel'); if (!p) return;
    p.classList.add('open'); // CSS hiện panel qua #chatPanel.open{display:flex}
    p.classList.remove('hidden'); // .hidden{display:none!important} sẽ thắng .open nếu còn sót
    for (var k in keys) keys[k] = false; // đang gõ thì nhân vật đứng yên, WASD không lọt vào điều khiển
    setTimeout(function () { var ci = $('chat-input'); if (ci) { try { ci.focus({ preventScroll: true }); } catch (e) { ci.focus(); } } }, 30);
  }
  function closeChat(blur) {
    var p = $('chat-panel'); if (p) { p.classList.remove('open'); p.classList.add('hidden'); }
    if (blur && chatTyping()) { var ci = $('chat-input'); if (ci) ci.blur(); }
  }
  function toggleChat() {
    var p = $('chat-panel'); if (!p) return;
    if (p.classList.contains('open')) closeChat(true); else openChat();
  }
  function addChatMessage(name, colorCss, text, isBot) {
    var log = $('chat-log'); if (!log) return;
    var row = document.createElement('div');
    row.className = 'chatMsg';
    var nm = document.createElement('span');
    nm.className = 'cmName'; nm.style.color = colorCss; nm.textContent = name;
    var tx = document.createElement('span'); tx.textContent = ': ' + text;
    var tm = document.createElement('span');
    tm.className = 'cmTime'; tm.textContent = chatNow();
    row.appendChild(nm); row.appendChild(tx); row.appendChild(tm);
    log.appendChild(row);
    while (log.children.length > 60) log.removeChild(log.firstChild);
    log.scrollTop = log.scrollHeight;
  }
  function addChatSystem(text) {
    var log = $('chat-log'); if (!log) return;
    var row = document.createElement('div');
    row.className = 'chatMsg sys'; row.textContent = text;
    log.appendChild(row);
    while (log.children.length > 60) log.removeChild(log.firstChild);
    log.scrollTop = log.scrollHeight;
  }
  function showBubble(fig, name, colorCss, text) {
    // hideBubbles là cờ thật do nút ẨN BONG BÓNG bật/tắt (biến cũ
    // bubblesHidden không bao giờ được gán true — code chết, cycle 7 đã xoá).
    if (hideBubbles || !fig || !labelsEl) return;
    var key = fig.uuid;
    for (var i = 0; i < chatBubbles.length; i++) {
      if (chatBubbles[i].key === key) { // người này chat tiếp: thay nội dung, đếm lại 5 giây
        chatBubbles[i].until = performance.now() + BUBBLE_MS;
        chatBubbles[i].el.querySelector('.bText').textContent = text;
        return;
      }
    }
    var el = document.createElement('div');
    el.className = 'bubble'; el.style.borderColor = colorCss;
    var bn = document.createElement('span');
    bn.className = 'bName'; bn.style.color = colorCss; bn.textContent = name;
    var bt = document.createElement('span');
    bt.className = 'bText'; bt.textContent = text;
    el.appendChild(bn); el.appendChild(bt);
    labelsEl.appendChild(el);
    chatBubbles.push({ el: el, fig: fig, until: performance.now() + BUBBLE_MS, key: key });
  }
  function sendPlayerChat(raw) {
    var text = (raw || '').trim().slice(0, CHAT_MAX_LEN);
    if (!text) return false;
    var now = performance.now();
    var wait = CHAT_MIN_GAP - (now - lastPlayerChatAt);
    if (wait > 0) {
      toast('Gửi chậm thôi — chờ ' + Math.ceil(wait / 1000) + ' giây nữa mới gửi tiếp được (chống spam).');
      return false;
    }
    lastPlayerChatAt = now;
    var col = playerChatColor();
    addChatMessage('BẠN', col, text, false);
    if (player) showBubble(player.group, 'BẠN', col, text);
    return true;
  }
  function sendBotChat(b, text) {
    var col = '#' + b.group.userData.shirtMat.color.getHexString();
    addChatMessage(b.name, col, text, true);
    showBubble(b.group, b.name, col, text);
  }
  function updateChatBots(dt) {
    if (mode !== 'single') return;
    botChatT -= dt;
    if (botChatT > 0) return;
    botChatT = 24 + Math.random() * 20;
    var cand = [];
    for (var i = 0; i < bots.length; i++) if (bots[i].group.visible && bots[i].alive) cand.push(bots[i]);
    if (!cand.length) return;
    var b = cand[Math.floor(Math.random() * cand.length)];
    sendBotChat(b, BOT_LINES[Math.floor(Math.random() * BOT_LINES.length)]);
  }
  var bubbleV = new THREE.Vector3();
  function updateBubbles() {
    var now = performance.now();
    for (var i = chatBubbles.length - 1; i >= 0; i--) {
      var rec = chatBubbles[i];
      if (now > rec.until || !rec.fig.visible) {
        if (rec.el.parentNode) rec.el.parentNode.removeChild(rec.el);
        chatBubbles.splice(i, 1); continue;
      }
      bubbleV.copy(rec.fig.position); bubbleV.y += 2.85;
      var distC = bubbleV.distanceTo(camera.position);
      bubbleV.project(camera);
      if (bubbleV.z > 1 || bubbleV.z < -1 || distC > 110) { rec.el.style.display = 'none'; continue; }
      rec.el.style.display = 'block';
      rec.el.style.left = ((bubbleV.x * 0.5 + 0.5) * window.innerWidth) + 'px';
      rec.el.style.top = ((-bubbleV.y * 0.5 + 0.5) * window.innerHeight) + 'px';
      var sc = Math.max(0.72, Math.min(1, 34 / distC));
      rec.el.style.transform = 'translate(-50%,-100%) scale(' + sc.toFixed(2) + ')';
    }
  }
  function sendChat(text) {
    text = (text || '').trim();
    if (!text) return;
    // Không kiểm length > 120 ở đây nữa: mọi đường gọi đều đã bị chặn ở 120 ký
    // tự (input #chatInput có maxlength="120", nút quick phrase ngắn hơn nhiều)
    // nên nhánh đó không bao giờ chạy — code chết (P1-10, cycle 7, đã xoá).
    // Giới hạn thật nằm ở sendPlayerChat (.slice(0, 120), chơi đơn) và server
    // (từ chối tin > 120 ký tự, multi).
    var now = Date.now();
    if (now - lastChatAt < 2000) { toast('Gửi chậm lại một chút (2 giây/tin).'); return; }
    lastChatAt = now;
    var myName = player ? player.name : ($('player-name') ? $('player-name').value : 'Người chơi');
    if (mode === 'multi') {
      // Server kiểm tra lại 120 ký tự / 2 giây và broadcast lại cho mọi người (kể cả mình).
      sendWS({ type: 'chat', text: text });
    } else {
      if (!sendPlayerChat(text)) return;
      // Bot trả lời mẫu, luôn ghi rõ là bot.
      setTimeout(function () {
        var bot = bots[Math.floor(Math.random() * bots.length)];
        if (bot) sendBotChat(bot, BOT_LINES[Math.floor(Math.random() * BOT_LINES.length)]);
      }, 1200);
    }
  }
  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ---- Name tags (giữ API cũ cho rounds.js / chat) ----
  function setTag(id, text, color, isBubble) {
    if (hideBubbles && isBubble) return;
    var el = tagEls[id];
    if (!el) {
      el = document.createElement('div');
      el.className = isBubble ? 'bubble' : 'name-tag';
      if (labelsEl) labelsEl.appendChild(el);
      tagEls[id] = el;
    }
    el.className = isBubble ? 'bubble' : 'name-tag';
    el.textContent = text;
    if (!isBubble && color) el.style.borderColor = color;
    el._until = isBubble ? Date.now() + 5000 : 0;
    el._isBubble = isBubble;
  }
  function clearTag(id) { if (tagEls[id]) { tagEls[id].remove(); delete tagEls[id]; } }

  // ================= MINIMAP — hình đảo thật, đường chạy, chấm người chơi/người đang xem =================
  var minimapTimer = 0;
  function drawMinimap() {
    var mmCanvas = $('minimap'); if (!mmCanvas) return;
    var mmCtx = mmCanvas.getContext('2d'); if (!mmCtx) return;
    if (currentRound === 2 && phase === 'round2') {
      // bản đồ cầu: đường thẳng qua biển, các bước ván, đảo cuối ở trên cùng
      var S2 = mmCanvas.width;
      mmCtx.fillStyle = '#2b7fb3'; mmCtx.fillRect(0, 0, S2, S2);
      function BZ(z) { return 14 + ((-87 - z) / 58) * (S2 - 30); }
      function BX(x) { return S2 / 2 + x * 3.4; }
      mmCtx.fillStyle = '#8fb45e';
      mmCtx.beginPath(); mmCtx.arc(S2 / 2, BZ(-137), 15, 0, Math.PI * 2); mmCtx.fill();
      for (var ti3 = 0; ti3 < bridges.length; ti3++) {
        var brg = bridges[ti3];
        mmCtx.fillStyle = '#d9be82';
        mmCtx.fillRect(BX(brg.x - 5.2), BZ(-90), 10.4 * 3.4, BZ(-100) - BZ(-90));
        mmCtx.fillStyle = '#' + TEAMS[ti3].color.toString(16).padStart(6, '0');
        mmCtx.fillRect(BX(brg.x - 5.2), BZ(-90), 10.4 * 3.4, 2.5);
        for (var pi3 = 0; pi3 < brg.planks.length; pi3++) {
          var pp = brg.planks[pi3];
          mmCtx.fillStyle = pp.brokenL ? '#2b7fb3' : '#a5763a';
          mmCtx.fillRect(BX(brg.x - 2.05), BZ(pp.z + 1.5), 1.95 * 3.4, Math.max(2.5, (3 / 76) * (S2 - 30)));
          mmCtx.fillStyle = pp.brokenR ? '#2b7fb3' : '#a5763a';
          mmCtx.fillRect(BX(brg.x + 0.05), BZ(pp.z + 1.5), 1.95 * 3.4, Math.max(2.5, (3 / 76) * (S2 - 30)));
        }
      }
      mmCtx.fillStyle = 'rgba(30,15,5,.85)';
      mmCtx.font = '700 10px "Be Vietnam Pro", sans-serif'; mmCtx.textAlign = 'center';
      mmCtx.fillText('ĐẢO CUỐI', S2 / 2, BZ(-137) + 3);
      mmCtx.fillText('ĐẦU CẦU', S2 / 2, BZ(-95) + 16);
      mmCtx.fillStyle = 'rgba(255,255,255,.85)';
      for (var bi2 = 0; bi2 < bots.length; bi2++) {
        if (!bots[bi2].alive) continue;
        mmCtx.fillRect(BX(bots[bi2].x) - 1.2, BZ(bots[bi2].z) - 1.2, 2.4, 2.4);
      }
      Object.keys(remotePlayers).forEach(function (k) {
        var rp = remotePlayers[k];
        if (!rp.alive) return;
        mmCtx.fillRect(BX(rp.x) - 1.2, BZ(rp.z) - 1.2, 2.4, 2.4);
      });
      var wt = spec.active ? spec.target : watchedPerson();
      if (wt) {
        mmCtx.strokeStyle = '#53e0d4'; mmCtx.lineWidth = 2.4;
        mmCtx.beginPath(); mmCtx.arc(BX(wt.x), BZ(wt.z), 5.4, 0, Math.PI * 2); mmCtx.stroke();
      }
      if (player) {
        mmCtx.fillStyle = '#ffd34d'; mmCtx.strokeStyle = '#1d0f06'; mmCtx.lineWidth = 2;
        mmCtx.beginPath(); mmCtx.arc(BX(player.x), BZ(player.z), 4, 0, Math.PI * 2); mmCtx.fill(); mmCtx.stroke();
      }
      return;
    }
    var S = mmCanvas.width, H = S / 2, SC = H / 100;
    function MX(x) { return H + x * SC; }
    function MZ(z) { return H + z * SC; }
    function circ(x, z, r, col) {
      mmCtx.fillStyle = col;
      mmCtx.beginPath(); mmCtx.arc(MX(x), MZ(z), r * SC, 0, Math.PI * 2); mmCtx.fill();
    }
    mmCtx.fillStyle = '#2b7fb3'; mmCtx.fillRect(0, 0, S, S);
    circ(-150, -120, 15, '#5d9c48'); circ(135, -60, 10, '#5d9c48'); circ(-120, 90, 12, '#5d9c48'); circ(150, 110, 17, '#5d9c48');
    // hình dáng riêng của từng đảo đặc trưng — ghim ở mép bản đồ theo đúng hướng của đảo
    function glyph(x, z, draw) {
      var gx = Math.max(13, Math.min(S - 13, MX(x))), gz = Math.max(13, Math.min(S - 13, MZ(z)));
      draw(gx, gz);
    }
    mmCtx.fillStyle = '#8d9291';
    glyph(-215, -165, function (gx, gz) { // Trống Mái: hai khối đá nghiêng đối nhau, khe hở giữa
      mmCtx.beginPath(); mmCtx.moveTo(gx - 8, gz + 6); mmCtx.lineTo(gx - 4, gz - 7); mmCtx.lineTo(gx - 1, gz + 6); mmCtx.fill();
      mmCtx.beginPath(); mmCtx.moveTo(gx + 2, gz + 6); mmCtx.lineTo(gx + 6, gz - 6); mmCtx.lineTo(gx + 8, gz + 6); mmCtx.fill();
    });
    glyph(238, -150, function (gx, gz) { // Ti Tốp: nón dốc + bãi cát lưỡi liềm
      mmCtx.fillStyle = '#3e6b35';
      mmCtx.beginPath(); mmCtx.moveTo(gx - 8, gz + 6); mmCtx.lineTo(gx, gz - 8); mmCtx.lineTo(gx + 8, gz + 6); mmCtx.fill();
      mmCtx.strokeStyle = '#e9d193'; mmCtx.lineWidth = 2.4;
      mmCtx.beginPath(); mmCtx.arc(gx, gz + 3, 6.5, 0.25 * Math.PI, 0.85 * Math.PI); mmCtx.stroke();
      mmCtx.fillStyle = '#8d9291';
    });
    glyph(15, -262, function (gx, gz) { // Vịnh Tháp Đá: cụm tháp cao thấp + khe nước giữa
      mmCtx.fillRect(gx - 8, gz - 4, 3.4, 10); mmCtx.fillRect(gx - 3.4, gz - 8, 3.4, 14); mmCtx.fillRect(gx + 1.6, gz - 6, 3.4, 12); mmCtx.fillRect(gx + 5.6, gz - 3, 3, 9);
    });
    glyph(255, 95, function (gx, gz) { // Yên Ngựa: hai đỉnh nối bằng yên thấp
      mmCtx.fillStyle = '#3e6b35';
      mmCtx.beginPath(); mmCtx.moveTo(gx - 9, gz + 6); mmCtx.lineTo(gx - 5, gz - 6); mmCtx.lineTo(gx - 1, gz + 1); mmCtx.lineTo(gx + 2, gz + 1); mmCtx.lineTo(gx + 6, gz - 6); mmCtx.lineTo(gx + 9, gz + 6); mmCtx.fill();
      mmCtx.fillStyle = '#8d9291';
    });
    glyph(-245, 60, function (gx, gz) { // Hang Vòm: khối đá có miệng hang tối ở chân
      mmCtx.fillRect(gx - 8, gz - 6, 16, 12);
      mmCtx.fillStyle = '#10181c';
      mmCtx.beginPath(); mmCtx.arc(gx, gz + 6, 3.6, Math.PI, 0); mmCtx.fill();
      mmCtx.fillStyle = '#8d9291';
    });
    glyph(-90, -255, function (gx, gz) { // Đỉnh Hương: mặt đỉnh phẳng trên ba chân đá
      mmCtx.fillRect(gx - 8, gz - 6, 16, 3.4);
      mmCtx.fillRect(gx - 7, gz - 2, 3, 8); mmCtx.fillRect(gx - 1.5, gz - 2, 3, 8); mmCtx.fillRect(gx + 4, gz - 2, 3, 8);
    });
    glyph(120, -265, function (gx, gz) { // Con Cóc: khối thấp bè, hai u mắt
      mmCtx.beginPath(); mmCtx.arc(gx, gz + 5, 8.5, Math.PI, 0); mmCtx.fill();
      mmCtx.fillRect(gx - 5.5, gz - 6, 3, 3.4); mmCtx.fillRect(gx + 2.5, gz - 6, 3, 3.4);
    });
    glyph(-300, 130, function (gx, gz) { // Soi Sim: đồi thoai thoải phủ sim tím
      mmCtx.fillStyle = '#3e6b35';
      mmCtx.beginPath(); mmCtx.arc(gx, gz + 6, 9, Math.PI, 0); mmCtx.fill();
      mmCtx.fillStyle = '#b565d8';
      mmCtx.fillRect(gx - 4, gz + 1, 2, 2); mmCtx.fillRect(gx + 2, gz - 1, 2, 2); mmCtx.fillRect(gx, gz + 4, 2, 2);
      mmCtx.fillStyle = '#8d9291';
    });
    glyph(300, 170, function (gx, gz) { // Đảo Khỉ: hai mỏm đá có cây
      mmCtx.fillRect(gx - 9, gz - 1, 7, 7); mmCtx.fillRect(gx + 2, gz - 3, 7, 9);
      mmCtx.fillStyle = '#3e6b35';
      mmCtx.fillRect(gx - 8, gz - 5, 5, 4); mmCtx.fillRect(gx + 3, gz - 7, 5, 4);
      mmCtx.fillStyle = '#8d9291';
    });
    circ(0, 0, 88, '#e3c98d');            // vành bãi cát
    circ(0, 0, 76, '#8fb45e');            // thảm cỏ
    circ(LOTUS.x, LOTUS.z, LOTUS.r, '#3f8f74');
    circ(FISHPOND.x, FISHPOND.z, FISHPOND.r, '#3a7ca5');
    mmCtx.fillStyle = '#dcbc7d';          // đường chạy
    mmCtx.fillRect(MX(-(TRACK_HALF_W + 5)), MZ(-57), (TRACK_HALF_W + 5) * 2 * SC, 118 * SC);
    mmCtx.fillStyle = '#c47a4e';          // sân đình
    mmCtx.fillRect(MX(-28), MZ(-63), 56 * SC, 26 * SC);
    mmCtx.fillStyle = '#8f1f14';          // đình
    mmCtx.fillRect(MX(-15), MZ(-70), 30 * SC, 12 * SC);
    mmCtx.fillStyle = '#ffffff';          // vạch đích
    mmCtx.fillRect(MX(-TRACK_HALF_W), MZ(FINISH_Z) - 1.5, TRACK_HALF_W * 2 * SC, 3);
    mmCtx.fillStyle = '#d63c2f';          // vạch xuất phát
    mmCtx.fillRect(MX(-TRACK_HALF_W), MZ(START_Z) - 1.5, TRACK_HALF_W * 2 * SC, 3);
    mmCtx.fillStyle = 'rgba(30,15,5,.8)';
    mmCtx.font = '700 10px "Be Vietnam Pro", sans-serif'; mmCtx.textAlign = 'center';
    mmCtx.fillText('ĐÍCH', MX(0), MZ(FINISH_Z) - 6);
    mmCtx.fillText('XUẤT PHÁT', MX(0), MZ(START_Z) + 14);
    mmCtx.font = '700 8.5px "Be Vietnam Pro", sans-serif';
    mmCtx.fillStyle = 'rgba(255,243,217,.95)';
    mmCtx.fillText('1.969 ĐẢO · 1.553 km²', S / 2, S - 5);
    mmCtx.fillStyle = 'rgba(255,255,255,.85)';
    for (var i = 0; i < bots.length; i++) {
      if (!bots[i].alive) continue;
      mmCtx.fillRect(MX(bots[i].x) - 1.2, MZ(bots[i].z) - 1.2, 2.4, 2.4);
    }
    Object.keys(remotePlayers).forEach(function (k) {
      var rp = remotePlayers[k];
      if (!rp.alive) return;
      mmCtx.fillRect(MX(rp.x) - 1.2, MZ(rp.z) - 1.2, 2.4, 2.4);
    });
    var wt2 = spec.active ? spec.target : watchedPerson();
    if (wt2) {
      mmCtx.strokeStyle = '#53e0d4'; mmCtx.lineWidth = 2.4;
      mmCtx.beginPath(); mmCtx.arc(MX(wt2.x), MZ(wt2.z), 5.4, 0, Math.PI * 2); mmCtx.stroke();
      mmCtx.fillStyle = '#53e0d4';
      mmCtx.beginPath(); mmCtx.arc(MX(wt2.x), MZ(wt2.z), 2.4, 0, Math.PI * 2); mmCtx.fill();
    }
    if (player) {
      mmCtx.fillStyle = '#ffd34d'; mmCtx.strokeStyle = '#1d0f06'; mmCtx.lineWidth = 2;
      mmCtx.beginPath(); mmCtx.arc(MX(player.x), MZ(player.z), 4, 0, Math.PI * 2); mmCtx.fill(); mmCtx.stroke();
    }
  }

  // ---- HUD / pha trống-chiêng ----
  function setHudDrum(t) { var el = $('hud-drum'); if (el) el.textContent = t; }
  function setPhaseUI() {
    if (drumState === 'drum') setHudDrum('TRỐNG ĐÁNH — Chạy đi!');
    else if (drumState === 'gong') setHudDrum('CHIÊNG VANG — Đứng yên!');
    else setHudDrum('CHUẨN BỊ — Nghe trống hiệu…');
  }
  function showBanner(text, isGong, ms) { toast(text); }
  var hostBeatPhase = 0;
  // ---- Vòng 1 chơi đơn: máy pha trống/chiêng (port từ prototype) ----
  var r1Phase = 'drum', r1PhaseT = 0, r1DrumBeatT = 0, r1GongAge = 0;
  var GONG_GRACE = 0.22;
  function startPhase(name) {
    r1Phase = name;
    drumState = name;
    r1GongAge = 0;
    if (name === 'drum') {
      r1PhaseT = 2.2 + Math.random() * 3.4; // NHỊP NGẪU NHIÊN HOÀN TOÀN — bốc mới mỗi pha, không pattern
      r1DrumBeatT = 0;
      drumHit(1);
      if (hostArmL) { hostArmL.rotation.x = -1.4; hostArmR.rotation.x = -0.6; }
      showBanner('TRỐNG ĐÁNH — CHẠY!', false, 900);
    } else {
      r1PhaseT = 1.6 + Math.random() * 3.0;
      gongHit();
      if (hostArmL) { hostArmL.rotation.x = 0.2; hostArmR.rotation.x = 0.2; }
      showBanner('CHIÊNG! ĐỨNG YÊN!', true, 1000);
      if (player) { player.gongMove = 0; player.jumpedInGong = false; }
      for (var i = 0; i < bots.length; i++) {
        var b = bots[i];
        if (!b.alive || b.finished) continue;
        b.stopTimer = b.react;
        b.willFall = Math.random() < 0.085;
        b.fallTimer = 0.35 + Math.random() * 0.6;
      }
    }
    setPhaseUI();
  }
  // ---- Timer trận tổng (P1-07) ----
  // Số giây còn lại của trận, hoặc null khi không có giới hạn (QC / chưa
  // vào trận). Server áp deadline thật ở multi; chơi đơn tự áp ở client.
  function matchTimeLeft() {
    if (!matchTimeLimit || !matchStartAt) return null;
    return Math.max(0, matchTimeLimit - (Date.now() - matchStartAt) / 1000);
  }
  // Chơi đơn: hết giờ tổng thì trận kết thúc có kết quả — xếp người còn
  // sống theo tiến độ vòng hiện tại (về đích trước theo finishTime, rồi
  // tới quãng đường đã đi). Gọi mỗi frame từ updateHUD; chỉ chạy 1 lần
  // vì showRanking đổi phase sang 'finished'.
  function endMatchOnTimeoutIfNeeded() {
    if (mode !== 'single' || qcMode) return false;
    // Chạy cả khi đang xem (spectator): trận vẫn chạy nền cho bot, hết giờ
    // tổng thì trận vẫn phải kết thúc có kết quả.
    if (phase.indexOf('round') !== 0 && phase !== 'spectator') return false;
    if (matchTimeLeft() === null || matchTimeLeft() > 0) return false;
    var alive = allPersons().filter(function (p) { return p.alive; });
    alive.sort(function (a, b) {
      var aFin = a.finished ? (a.finishTime || 0) : Infinity;
      var bFin = b.finished ? (b.finishTime || 0) : Infinity;
      if (aFin !== bFin) return aFin - bFin;
      return (b.dist || 0) - (a.dist || 0);
    });
    showRanking(alive.map(function (p) { return { name: p.name, time: Date.now() - matchStartAt }; }),
      'Hết giờ trận (giới hạn ' + fmtTime(matchTimeLimit || MATCH_TIME_LIMIT_S) + ') — xếp hạng theo tiến độ vòng hiện tại.');
    return true;
  }
  function updateHUD() {
    var ht = $('hud-time');
    if (ht && phase.indexOf('round') === 0) {
      // Ô THỜI GIAN hiện thời gian CÒN LẠI của trận khi có giới hạn tổng
      // (đỏ khi ≤ 60 giây); không giới hạn (QC) thì hiện thời gian đã chơi
      // như trước. Tooltip giữ số đã chơi / giới hạn để không mất thông tin.
      var left = matchTimeLeft();
      if (left === null) {
        ht.textContent = fmtTime((Date.now() - matchStartAt) / 1000);
        ht.title = '';
      } else {
        ht.textContent = fmtTime(left);
        ht.title = 'Đã chơi ' + fmtTime((Date.now() - matchStartAt) / 1000) + ' / giới hạn trận ' + fmtTime(matchTimeLimit);
      }
      ht.classList.toggle('urgent', left !== null && left <= 60);
    }
    // Chơi đơn tự áp deadline tổng (multi do server áp). Đặt ngoài khối
    // trên để cả phase spectator (đang xem bot chơi tiếp) cũng kết thúc
    // đúng giờ — updateHUD chỉ được gọi trong các nhánh round/spectator.
    endMatchOnTimeoutIfNeeded();
    if (currentRound === 2 && player) {
      var pf = $('progress-fill');
      if (pf) {
        if (mode === 'multi') pf.style.width = Math.min(100, (myBridgeStep / 9) * 100) + '%';
        else pf.style.width = Math.min(100, (player.dist / 41) * 100) + '%';
      }
    } else if (player) {
      var d = Math.max(0, Math.floor(player.dist));
      var pf2 = $('progress-fill');
      if (pf2) pf2.style.width = Math.min(100, (player.dist / TRACK_LEN) * 100) + '%';
    }
  }

  // ---- Flyover + đếm ngược (port từ prototype) ----
  function ensureFlyoverEls() {
    if (!flyoverTitleEl) {
      // Tiêu đề bay tổng quan co theo màn hình (cycle 15, #10): 52px cố định
      // làm "ĐẢO HỘI LÀNG" gãy 3 dòng ở 360px và đè lên cột kinh tế phải.
      // Ở 360px còn ~40px, vừa 1 dòng (nowrap); top 28% để khối tiêu đề
      // kết thúc trước cột econBar (top 300px).
      var vw = window.innerWidth || 360;
      var titleFs = Math.max(30, Math.min(52, Math.round(vw * 0.11)));
      var titleTop = vw <= 620 ? '28%' : '34%';
      flyoverTitleEl = document.createElement('div');
      flyoverTitleEl.style.cssText = 'position:fixed;left:50%;top:' + titleTop + ';transform:translate(-50%,-50%);z-index:40;pointer-events:none;text-align:center;color:#fff;text-shadow:0 3px 18px rgba(0,0,0,.55);display:none';
      flyoverTitleEl.innerHTML = '<div style="font-size:' + titleFs + 'px;font-weight:900;letter-spacing:2px;white-space:nowrap">ĐẢO HỘI LÀNG</div><div style="font-size:18px;margin-top:6px">Vịnh Hạ Long · 1.969 đảo đá vôi</div>';
      document.body.appendChild(flyoverTitleEl);
    }
    if (!countdownEl) {
      countdownEl = document.createElement('div');
      countdownEl.style.cssText = 'position:fixed;left:50%;top:42%;transform:translate(-50%,-50%);z-index:40;pointer-events:none;font-size:84px;font-weight:900;color:#fff;text-shadow:0 3px 18px rgba(0,0,0,.6);display:none';
      document.body.appendChild(countdownEl);
    }
  }
  // Hết đoạn bay tổng quan quanh đảo -> hạ camera mượt về sau lưng người chơi rồi đếm ngược
  function beginCountdown() {
    if (phase !== 'flyover') return;
    phase = 'countdown';
    countdownT = 0; countdownStep = 4;
    introBlend = 1.6;
    camYaw = 0; camPitch = 0.32;
    camInit = true;
    camYawCur = 0.85; camPitchCur = 0.55;
    camFocusSmooth.set(player ? player.x : 0, 1.25, player ? player.z : START_Z);
    camLookSmooth.set(0, 1.6, 6);
    if (flyoverTitleEl) flyoverTitleEl.style.display = 'none';
    ensureFlyoverEls();
    countdownEl.style.display = 'block';
    countdownEl.textContent = 'SẴN SÀNG';
  }

  // ---- Chế độ chơi ----
  function showHUD(show) {
    if (!show) hideRoundHint(); // về menu thì gợi ý phím cũng ẩn
    var hud = $('hud'); if (hud) hud.classList.toggle('hidden', !show);
    var mm = $('minimap-box'); if (mm) mm.classList.toggle('hidden', !show);
    var bc = $('btn-chat-open'); if (bc) bc.style.display = show ? 'block' : 'none';
    if (window.innerWidth < 760 || 'ontouchstart' in window) {
      var j = $('joystick'); if (j) j.classList.toggle('hidden', !show);
      var bj = $('btn-jump'); if (bj) bj.classList.toggle('hidden', !show);
    }
  }
  function startSingle(qcRound) {
    ensureAudio();
    mode = 'single';
    var menu = $('menu'); if (menu) menu.classList.add('hidden');
    exitTour(false);
    exitSpectator();
    player = createPerson((($('player-name') && $('player-name').value) || 'Người chơi').trim(), '#2196f3', false, 0, START_Z);
    player.id = 'me';
    resetFigure(player.group, player.x, player.z);
    spawnBots();
    myTeam = null; myBridgeStep = 0; localBridges = {}; localRanking = [];
    teams = [];
    leaderArrows.forEach(function (a) { a.visible = false; });
    drumState = 'drum'; drumTimer = 2.5;
    // P1-07: chơi đơn tự áp giới hạn trận tổng 30 phút; QC miễn (0).
    matchTimeLimit = qcMode ? 0 : MATCH_TIME_LIMIT_S;
    r1Phase = 'drum'; r1PhaseT = 0; r1DrumBeatT = 0; r1GongAge = 0;
    randomizeBridge();
    fogOverride = null; applyFogPreset('yard');
    var tp = $('team-panel'); if (tp) tp.classList.add('hidden');
    var ts = $('team-screen'); if (ts) ts.classList.add('hidden');
    setSpectatorBanner(false);
    showHUD(true); updateAliveHUD();
    updateSingleR1._teamTimer = 0; updateSingleR1._r1TimeoutDone = false;
    startAmbient();
    // QC: vào thẳng vòng đã chọn, bỏ qua flyover + vòng trước.
    if (qcMode && (qcRound || qcStartRound) > 1) {
      matchStartAt = Date.now();
      qcJumpSingle(qcRound || qcStartRound);
      return;
    }
    // Flyover ~3.4s rồi đếm ngược, rồi mới vào vòng 1.
    phase = 'flyover'; flyT = 0; introBlend = 0;
    ensureFlyoverEls();
    flyoverTitleEl.style.display = 'block';
    setHudDrum('VÒNG 1 — Trống Hội');
    toast('Bay tổng quan quanh đảo… bấm phím bất kỳ để bỏ qua.');
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
    var mb = $('multi-box'); if (mb) mb.classList.remove('hidden');
    connectWS();
  }
  function onServerMessage(msg) {
    // Tin nhắn riêng của các vòng 3-6 do rounds.js xử lý trước.
    if (window.Rounds && window.Rounds.onServerMessage && window.Rounds.onServerMessage(msg)) return;
    if (msg.type === 'welcome') { myId = msg.id; return; }
    if (msg.type === 'roundStart') {
      // Server gửi kèm matchTimeLimit (0 = phòng QC, không giới hạn tổng).
      if (typeof msg.matchTimeLimit === 'number') matchTimeLimit = msg.matchTimeLimit;
      startRoundCommon(msg.round, msg.game, msg.name, msg.timeLimit, msg.seed, msg.target, msg.isFinal); return;
    }
    if (msg.type === 'economy' && window.HoiShop && window.HoiShop.onMessage) { window.HoiShop.onMessage(msg); return; }
    if (msg.type === 'roundEnd') { onRoundEnd(msg); return; }
    if (msg.type === 'tick') { onTick(msg); return; }
    if (msg.type === 'rooms') {
      var rl = $('room-list'); if (!rl) return;
      rl.innerHTML = msg.rooms.map(function (r) {
        return '<button class="btn small" onclick="window.__joinRoom(\'' + r.code + '\')">' + r.code + ' — ' + r.count + ' người' + (r.qc ? ' · [QC]' : '') + '</button>';
      }).join('') || '<div class="note">Chưa có phòng nào đang mở.</div>';
      return;
    }
    if (msg.type === 'joined') {
      roomCode = msg.code; isHost = !!msg.isHost; mode = 'multi';
      // Phòng QC (server gửi kèm qc/startRound/noElim/plan): bật chế độ QC
      // ở client để hiện thanh QC; phòng thường thì qcMode = false.
      qcMode = !!msg.qc; qcStartRound = msg.startRound || 1; qcNoElim = !!msg.noElim;
      qcPlan = msg.plan || null; renderQcButtons();
      if (qcMode) toast('Phòng QC — trận test, không thưởng Hội Xu / XP.');
      var menu = $('menu'); if (menu) menu.classList.add('hidden');
      showHUD(true);
      var li = $('lobby-info'); if (li) li.textContent = 'Phòng ' + msg.code + (msg.spectator ? ' — bạn vào làm khán giả.' : '');
      if (!player) {
        player = createPerson((($('player-name') && $('player-name').value) || 'Người chơi').trim(), '#2196f3', false, 0, START_Z);
        player.id = 'me';
      }
      // Đồng bộ người chơi từ xa TRƯỚC khi vào chế độ khán giả (bug #29):
      // enterSpectator()/buildSpectatorList() chọn mục tiêu từ allPersons();
      // nếu sync chạy sau thì lúc đó remotePlayers còn rỗng, danh sách chỉ
      // có chính mình (đã chết) nên banner ghi "Đang xem: <tên mình>".
      syncRemotePlayers(msg.players || []);
      if (msg.spectator) {
        player.alive = false; player.spectator = true;
        setSpectatorBanner(true);
        enterSpectator(); buildSpectatorList();
      }
      // Vào giữa trận (khán giả / reconnect, P1-07): đồng bộ trạng thái
      // trận để HUD hiện đúng vòng + trò đang chơi và đúng đồng hồ (tổng +
      // vòng) thay vì mặc định vòng 1 / 0:00. Chỉ áp khi server báo đang
      // ở trong một vòng (phase 'round*'); ở sảnh hoặc phase 'team' thì
      // msg.match là null / không áp, chờ tin phase/roundStart tiếp theo.
      // startRoundCommon đặt phase='round*' nhưng không phá camera khán
      // giả (camera chạy theo spec.active) và updatePlayerMovement bỏ qua
      // người đã chết.
      if (msg.match && msg.phase && msg.phase.indexOf('round') === 0) {
        matchTimeLimit = msg.match.matchTimeLimit || 0;
        var endsIn = (msg.match.roundEndsIn || 0) / 1000;
        startRoundCommon(msg.match.round, msg.match.roundGame, msg.match.roundName,
          endsIn > 0 ? endsIn : (msg.match.roundTimeLimit || 90));
        // startRoundCommon(1, ...) ghi đè matchStartAt = now — trả lại mốc
        // thật của trận để đồng hồ tổng đếm đúng thời gian đã chơi.
        matchStartAt = Date.now() - (msg.match.matchElapsed || 0);
        updateAliveHUD();
      }
      var bs = $('btn-start'); if (bs) bs.classList.toggle('hidden', !isHost);
      return;
    }
    if (msg.type === 'players') {
      syncRemotePlayers(msg.players); updateAliveHUD();
      // Khán giả vào giữa trận: danh sách người chơi có thể tới sau tin
      // 'joined' (lúc đó chỉ có mình) nên mục tiêu đang xem có thể là
      // chính mình đã chết — chọn lại người dẫn đầu khi mục tiêu hiện tại
      // không còn xem được. Vòng lặp animate cũng làm việc này mỗi frame,
      // nhưng khi WebGL null (VM) / tab ẩn thì rAF không chạy, banner kẹt
      // ở tên mình (bug #29). Không đụng tới mục tiêu đang xem tốt.
      if (spec.active) {
        var cur = spec.target || watchedPerson();
        if (!cur || !cur.alive) { buildSpectatorList(); var nl = specLeader(); if (nl) setSpecTarget(nl); }
      }
      return;
    }
    if (msg.type === 'playerPos') {
      var rp = remotePlayers[msg.id];
      if (rp) { rp.x = msg.x; rp.z = msg.z; rp.group.position.set(msg.x, rp.y || 0, msg.z); rp.alive = msg.alive; rp.team = msg.team; }
      return;
    }
    if (msg.type === 'phase') {
      phase = msg.phase;
      if (msg.phase === 'round1') { startRoundCommon(1, 'trong-hoi', 'Trống Hội', 120); matchStartAt = Date.now(); }
      if (msg.phase === 'team') {
        // Ẩn ngay bảng "hết vòng 1" để thông tin chia team hiện ra luôn, thay vì
        // bị che mất 3 giây đầu trong tổng số 5,5 giây của bước chia team.
        hideInterstitial();
        var ts2 = $('team-screen'); if (ts2) ts2.classList.remove('hidden');
        setTeamCardMode('team'); // khôi phục màn CHIA TEAM sau lần hiện bảng cuối trận trước đó
        // Lưu thứ tự lượt từng đội (server đã đảo ngược thứ tự về đích vòng 1) + tên theo id.
        teamQueues = msg.queues || {};
        teamNames = {};
        (msg.teams || []).forEach(function (t) { teamNames[t.id] = t.name; });
        var me = (msg.teams || []).find(function (t) { return t.id === myId; });
        if (me) { myTeam = me.team; if (player) player.team = me.team; }
        var tl = $('team-list');
        if (tl) tl.innerHTML = renderMultiTeamQueues(msg.teams || []);
        if (qcMode && tl) {
          tl.innerHTML += '<div><b>QC — NHẢY THẲNG VÒNG 2:</b> không có thời gian về đích Vòng 1 nên thứ tự lượt xáo trộn theo seed của trận (không phải ngược thứ tự về đích). Đồng hồ lượt 30 giây vẫn áp dụng.</div>';
        }
        // Lượt đội mình có thể đã tới trước tin 'team' — lúc đó mới khớp được.
        if (myTeam !== null && teamLeaders[myTeam] !== undefined) {
          setHudDrum(teamLeaders[myTeam] === myId ? 'TỚI LƯỢT BẠN — chọn ván!' : 'Chờ tới lượt của bạn…');
        }
      }
      if (msg.phase === 'round2') {
        var ts3 = $('team-screen'); if (ts3) ts3.classList.add('hidden');
        // Trước đây truyền timeLimit 0 nên roundEndsAt bị ghi đè thành 0 và
        // đồng hồ vòng 2 ở multiplayer không bao giờ hiện — server vẫn áp
        // deadline 180 giây (games.js). Truyền đúng 180 để HUD đếm ngược được.
        startRoundCommon(2, 'cau-khi', 'Cầu Khỉ Sương Mù', 180);
        teleportToBridge();
        updateMultiQueuePanel();
      }
      if (msg.phase && msg.phase.indexOf('round') === 0 && msg.phase !== 'round1' && msg.phase !== 'round2') {
        var rn = Number(msg.phase.slice(5));
        var ts4 = $('team-screen'); if (ts4) ts4.classList.add('hidden');
        // Trò/tên vòng do server gửi kèm tin roundStart (trước tin phase);
        // nếu chưa có thì dùng tên theo vòng (chỉ đúng vòng 1-2, còn lại
        // server là nguồn chuẩn). Không hardcode vòng 3-6.
        startRoundCommon(rn, msg.game || currentRoundGame, msg.name || currentRoundName, msg.timeLimit || ROUND_TIME_LIMITS[msg.game] || 90);
        // Server đã đưa mọi người về sân làng ở startRound (vòng 3–6) —
        // dịch người chơi theo đúng vị trí server của mình (tin phase kèm
        // players), nếu không client vẫn đứng ở cuối cầu trong khi server
        // tính vị trí ở sân (bắt dê / cướp cờ đều chấm bằng vị trí server).
        if (player && msg.players) {
          var meInfo = msg.players.find(function (pp) { return pp.id === myId; });
          var px = meInfo ? meInfo.x : 0, pz = meInfo ? meInfo.z : START_Z;
          if (Number.isFinite(px) && Number.isFinite(pz)) {
            player.x = px; player.z = pz;
            player.group.position.set(px, player.y || 0, pz);
          }
        }
      }
      if (msg.phase === 'finished') {
        showRanking(msg.ranking || [], msg.reason === 'match-timeout'
          ? 'Hết giờ trận (giới hạn ' + fmtTime(matchTimeLimit || MATCH_TIME_LIMIT_S) + ') — xếp hạng theo tiến độ vòng hiện tại.'
          : null);
      }
      if (msg.players) syncRemotePlayers(msg.players);
      updateAliveHUD();
      return;
    }
    if (msg.type === 'drum') {
      drumState = msg.drum;
      if (msg.drum === 'drum') drumHit(0.9); else gongHit();
      setHudDrum(drumState === 'drum' ? 'TRỐNG ĐÁNH — Chạy đi!' : 'CHIÊNG VANG — Đứng yên!');
      return;
    }
    if (msg.type === 'turn') {
      // Giữ lượt theo từng đội: tin 'turn' của đội khác tới trước khi client biết
      // mình thuộc đội nào vẫn phải nhớ, không được ghi đè bằng một biến chung.
      teamLeaders[msg.team] = msg.leaderId;
      teamLeader = msg.leaderId;
      // Server gửi kèm thời điểm hết lượt (30 giây/lượt) để hiện đếm ngược.
      if (msg.turnEndsAt) teamTurnEndsAt[msg.team] = msg.turnEndsAt;
      else if (msg.leaderId) teamTurnEndsAt[msg.team] = Date.now() + R2_TURN_LIMIT_S * 1000;
      else teamTurnEndsAt[msg.team] = 0;
      if (msg.team === myTeam) {
        setHudDrum(msg.leaderId === myId ? 'TỚI LƯỢT BẠN — chọn ván!' : 'Chờ tới lượt của bạn…');
        updateMultiQueuePanel();
      }
      return;
    }
    if (msg.type === 'bridgeUpdate') {
      // Ván vỡ / bước đi được server xác nhận thì client mới vẽ lại cầu.
      if (msg.broken) {
        toast('Ván yếu đã vỡ ở bước ' + (msg.step + 1));
        brokenSteps[msg.team + ':' + msg.step] = true;
        var pl = bridges[msg.team] && bridges[msg.team].planks[msg.step];
        if (pl) { // chỉ đánh dấu vỡ, không tự rơi ván (server là nguồn chuẩn)
          // Server gửi kèm phía ván đã giẫm (msg.plank); không dùng weakSide bốc
          // ngẫu nhiên ở client (multi không gọi randomizeBridge nên luôn là 0).
          var side = (msg.plank === 0 || msg.plank === 1) ? msg.plank : pl.weakSide;
          if (side === 0) pl.brokenL = true; else pl.brokenR = true;
          breakPlank(pl, side);
        }
      } else if (msg.playerId === myId && msg.bridgeStep !== undefined) {
        myBridgeStep = msg.bridgeStep;
        if (player) {
          player.bridgeStep = myBridgeStep;
          if (myBridgeStep < 9) {
            player.z = stepZ(myBridgeStep);
            player.group.position.set(player.x, player.y || 0, player.z);
          }
        }
      }
      updateMultiQueuePanel();
      return;
    }
    if (msg.type === 'eliminated') {
      var p = remotePlayers[msg.id];
      if (p) { p.alive = false; if (p.isBot) p.fallAnim = 0.0001; }
      if (msg.id === myId) eliminate(player, msg.reason || 'Bị loại');
      updateAliveHUD();
      return;
    }
    if (msg.type === 'ranking') {
      // Trước đây gọi showRanking() ngay khi có người qua cầu vòng 2 — chiếm
      // màn hình + set phase='finished' cho cả người còn đang chơi (lỗi).
      // Nay chỉ cập nhật bảng trực tiếp; bảng cuối trận vẫn do tin phase
      // 'finished' gọi showRanking.
      renderLeaderboard({ finished: msg.ranking });
      return;
    }
    if (msg.type === 'leaderboard') { renderLeaderboard(msg); return; }
    if (msg.type === 'chat') {
      addChatMessage(msg.name, teamColorHex(msg.team), msg.text, false);
      var sender = msg.senderId === myId ? player : remotePlayers[msg.senderId];
      if (sender) showBubble(sender.group, msg.name, teamColorHex(msg.team), msg.text);
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
      // Đồng bộ cả x/z (rounds.js/sim dùng p.x, p.z để tính hướng tới dê):
      // trước đây chỉ group.position được cập nhật nên x/z cũ tới khi có tick.
      p.x = info.x || 0; p.z = info.z || START_Z;
      p._posAt = Date.now(); // vị trí tươi — dùng để biết có tin được khi tính hướng
      p.group.position.set(info.x || 0, p.y || 0, info.z || START_Z);
    });
  }
  window.__joinRoom = function (code) {
    var rc = $('room-code'); if (rc) rc.value = code;
    connectWS();
    setTimeout(function () { sendWS({ type: 'join', code: code, name: ($('player-name') && $('player-name').value) || 'Người chơi' }); }, 300);
  };
  // ---- Bảng xếp hạng trực tiếp cho khán giả (P1-09, cycle 8) ----
  // Panel #leaderboard nằm trong #specBanner nên chỉ hiện cùng banner khán
  // giả; chơi đơn không có server nên không có dữ liệu bảng (giữ ẩn).
  var lastLeaderboard = null;
  function renderLeaderboard(data) {
    if (!data) return;
    // Gộp từng phần: tin 'ranking' chỉ mang finished, tin 'leaderboard'
    // mang đủ — giữ lại phần tin mới không có.
    lastLeaderboard = {
      round: data.round !== undefined ? data.round : (lastLeaderboard && lastLeaderboard.round),
      roundName: data.roundName !== undefined ? data.roundName : (lastLeaderboard && lastLeaderboard.roundName),
      aliveCount: data.aliveCount !== undefined ? data.aliveCount : (lastLeaderboard && lastLeaderboard.aliveCount),
      finished: data.finished || (lastLeaderboard && lastLeaderboard.finished) || [],
      eliminated: data.eliminated || (lastLeaderboard && lastLeaderboard.eliminated) || [],
    };
    var lb = $('leaderboard'); if (!lb) return;
    if (mode !== 'multi') { lb.style.display = 'none'; return; }
    var b = lastLeaderboard;
    var title = 'BẢNG TRỰC TIẾP' + (b.round ? ' · VÒNG ' + b.round + (b.roundName ? ' — ' + b.roundName : '') : '');
    var leaders = b.finished.length
      ? b.finished.slice(0, 5).map(function (r, i) {
          return '<div class="lbRow"><span><span class="lbRank">' + (i + 1) + '.</span> ' + escapeHtml(r.name) + '</span><span class="lbTime">' + (r.time / 1000).toFixed(1) + 's</span></div>';
        }).join('')
      : '<div class="lbEmpty">Chưa ai về đích.</div>';
    var elim = b.eliminated.length
      ? b.eliminated.slice(0, 5).map(function (e) {
          return '<div class="lbRow"><span>✕ ' + escapeHtml(e.name) + '</span><span class="lbWhy">V' + (e.round || '?') + ' — ' + escapeHtml(e.reason || 'Bị loại') + '</span></div>';
        }).join('')
      : '<div class="lbEmpty">Chưa ai bị loại.</div>';
    lb.innerHTML = '<div class="lbTitle">' + escapeHtml(title) + '</div>' +
      '<div class="lbRow"><span>Còn lại:</span><b>' + (b.aliveCount === undefined || b.aliveCount === null ? '—' : b.aliveCount) + ' người</b></div>' +
      '<div class="lbHead">DẪN ĐẦU</div>' + leaders +
      '<div class="lbHead">VỪA BỊ LOẠI</div>' + elim;
    lb.style.display = 'block';
  }
  // Màn kết thúc trận tái dùng #teamCard: chế độ 'ranking' ẩn tiêu đề +
  // luật chia team + dòng tự chuyển, hiện tiêu đề kết quả, bảng xếp hạng
  // thành 1 cột rộng (CSS #teamCard.ranking). Chế độ 'team' khôi phục lại
  // màn CHIA TEAM — gọi mỗi khi hiện màn chia team (chơi đơn + multi),
  // vì cùng một overlay dùng cho cả hai màn.
  function setTeamCardMode(mode) {
    var tc = $('team-screen'); if (!tc) return;
    tc.classList.toggle('ranking', mode === 'ranking');
  }
  function showRanking(ranking, note) {
    phase = 'finished';
    var html =
      '<p class="note">Xếp theo thời gian cá nhân — nhanh nhất đứng đầu.</p>' +
      (note ? '<p class="note">' + escapeHtml(note) + '</p>' : '') +
      (ranking.length ? ranking.map(function (r, i) {
        return '<div class="rankRow' + (i === 0 ? ' first' : '') + '">' + (i + 1) + '. ' + escapeHtml(r.name) + ' — ' + (r.time / 1000).toFixed(1) + 's</div>';
      }).join('') : '<div class="rankRow">Chưa có ai về đích.</div>') +
      '<p class="note">Không có xếp hạng team. Chia team chỉ để chia lượt.</p>';
    var ts = $('team-screen'); if (ts) ts.classList.remove('hidden');
    setTeamCardMode('ranking');
    var tl = $('team-list'); if (tl) tl.innerHTML = html;
    var btb = $('btn-to-bridge'); if (btb) btb.textContent = 'Chơi lại từ vòng 1';
  }

  // ---- Cầu Khỉ: chia team + qua cầu ----
  function memberDone(m) {
    return m.isPlayer ? (player.finished || !player.alive) : (m.bot.finished || !m.bot.alive);
  }
  function memberName(m) { return m.isPlayer ? 'BẠN' : m.bot.name; }
  function teamActiveMember(t) {
    if (!t) return null;
    for (var i = 0; i < t.members.length; i++) if (!memberDone(t.members[i])) return t.members[i];
    return null;
  }
  function isPlayerTurn() {
    if (currentRound !== 2 || !teams.length) return true;
    var act = teamActiveMember(teams[myTeam || 0]);
    return !!(act && act.isPlayer);
  }
  function slotPos(ti, slot) {
    var bx = TEAM_BRIDGE_X[ti];
    return { x: bx + ((slot % 3) - 1) * 1.9, z: -93.0 - Math.floor(slot / 3) * 2.1 };
  }
  function teamCrossedCount(t) {
    var n = 0;
    for (var i = 0; i < t.members.length; i++) {
      var m = t.members[i];
      if (m.isPlayer ? player.finished : m.bot.finished) n++;
    }
    return n;
  }
  function teamCountsLine() {
    // "Đỏ 2/5 · Vàng 1/5 · Xanh 0/5" — đội của bạn in đậm vàng.
    return teams.map(function (t, ti) {
      var mine = ti === (myTeam || 0);
      var s = TEAMS[ti].name + ' ' + teamCrossedCount(t) + '/' + t.members.length;
      return mine ? '<b>★ ' + s + '</b>' : s;
    }).join(' · ');
  }
  function hideTeamPanel() {
    var tp = $('team-panel'); if (!tp) return;
    tp.classList.add('hidden'); tp.style.display = 'none';
  }
  var tpLast = 0;
  function updateTeamPanel() {
    var tp = $('team-panel'); if (!tp) return;
    // Dải team chỉ hiện trong vòng 2; sang vòng khác thì ẩn hẳn, không được
    // nấn ná che màn hình (lỗi Sudo báo: banner team chắn màn hình ở vòng 2
    // là do panel cũ liệt kê cả hàng chờ dài thành nhiều dòng).
    if (currentRound !== 2 || !teams.length || mode !== 'single') { hideTeamPanel(); return; }
    var nowMs = performance.now();
    if (nowMs - tpLast < 250 && !tp.classList.contains('hidden')) return;
    tpLast = nowMs;
    tp.classList.remove('hidden');
    tp.style.display = 'block'; // CSS #teamPanel mặc định display:none nên chỉ gỡ class hidden là chưa đủ
    var myT = teams[myTeam || 0];
    var act = teamActiveMember(myT);
    var turnRemain = r2Turn.endsAt ? Math.max(0, Math.ceil((r2Turn.endsAt - Date.now()) / 1000)) : null;
    var turnHtml;
    if (player.finished) turnHtml = 'Bạn đã qua cầu an toàn!';
    else if (!player.alive) turnHtml = 'Bạn đã bị loại — đồng đội vẫn qua cầu theo lượt.';
    else if (!act) turnHtml = 'Cả đội đã qua hết cầu.';
    else if (act.isPlayer) turnHtml = '▶ LƯỢT CỦA <b>BẠN</b> — lên cầu đi!' + (turnRemain !== null ? ' Còn <b class="turnLeft' + (turnRemain <= 10 ? ' urgent' : '') + '">' + turnRemain + 's</b>' : '');
    else turnHtml = 'Chờ lượt — dẫn đầu: <b>' + escapeHtml(memberName(act)) + '</b>' + (turnRemain !== null ? ' · Còn <b class="turnLeft' + (turnRemain <= 10 ? ' urgent' : '') + '">' + turnRemain + 's</b>' : '') + ' · Bạn vị trí ' + (myT.members.findIndex(function (m) { return m.isPlayer; }) + 1) + '/' + myT.members.length;
    tp.innerHTML = '<div class="tpLine1">VÒNG 2 · ' + teamCountsLine() + '</div><div class="tpLine2">' + turnHtml + '</div>';
  }
  // Multi: vẽ thứ tự đi cầu của từng đội trên màn chia team (ngược thứ tự
  // về đích vòng 1: chậm nhất đi đầu, nhanh nhất đi cuối).
  function renderMultiTeamQueues(teamsList) {
    var byTeam = {};
    teamsList.forEach(function (t) {
      if (!byTeam[t.team]) byTeam[t.team] = [];
      byTeam[t.team].push(t);
    });
    var html = '';
    Object.keys(byTeam).sort().forEach(function (tk) {
      var ti = Number(tk);
      var q = teamQueues[tk] || teamQueues[ti] || null;
      var ordered = q ? q.map(function (id) {
        return byTeam[ti].find(function (t) { return t.id === id; });
      }).filter(Boolean) : byTeam[ti];
      html += '<div><b style="color:' + TEAM_COLORS[ti] + '">' + TEAMS[ti].name + ' · ' + ordered.length + ' người' + (ti === (myTeam || 0) ? ' · ĐỘI CỦA BẠN' : '') + '</b>';
      ordered.forEach(function (t, i) {
        var isMe = t.id === myId;
        html += '<div>' + (i + 1) + '. ' + (isMe ? '★ BẠN' : escapeHtml(t.name)) + (i === 0 ? ' — đi đầu' : (i === ordered.length - 1 ? ' — đi cuối (an toàn nhất)' : '')) + '</div>';
      });
      if (ti === (myTeam || 0)) {
        var pos = ordered.findIndex(function (t) { return t.id === myId; }) + 1;
        html += '<div>Bạn ở vị trí ' + pos + '/' + ordered.length + ' — thứ tự ngược với về đích vòng 1: chậm nhất đi đầu, nhanh nhất đi cuối.</div>';
      }
      html += '</div>';
    });
    return html;
  }
  // Multi: trong lúc qua cầu, dải team gọn 2 dòng ở mép trên (như chơi đơn):
  // dòng 1 là số người mỗi đội đã qua cầu + đội của bạn, dòng 2 là ai đang
  // tới lượt + đếm ngược lượt 30 giây + vị trí của bạn. Không liệt kê cả
  // hàng chờ dài thành nhiều dòng nữa — danh sách thứ tự đầy đủ vẫn có
  // trên màn CHIA TEAM trước khi vòng bắt đầu.
  var tpMultiLast = 0;
  function updateMultiQueuePanel() {
    var tp = $('team-panel'); if (!tp) return;
    if (mode !== 'multi' || myTeam === null || !teamQueues[myTeam] || currentRound !== 2) { hideTeamPanel(); return; }
    var nowMs = performance.now();
    if (nowMs - tpMultiLast < 250 && !tp.classList.contains('hidden')) return;
    tpMultiLast = nowMs;
    tp.classList.remove('hidden');
    tp.style.display = 'block'; // CSS #teamPanel mặc định display:none nên chỉ gỡ class hidden là chưa đủ
    var q = teamQueues[myTeam];
    var counts = Object.keys(teamQueues).sort().map(function (tk) {
      var ti = Number(tk), qq = teamQueues[tk];
      var done = qq.filter(function (id) {
        if (id === myId) return player.finished || !player.alive;
        var rp = remotePlayers[id];
        return rp ? (rp.finished || !rp.alive) : false;
      }).length;
      var s = TEAMS[ti].name + ' ' + done + '/' + qq.length;
      return ti === myTeam ? '<b>★ ' + s + '</b>' : s;
    }).join(' · ');
    var leaderId = teamLeaders[myTeam];
    var leaderName = leaderId === myId ? '★ BẠN' : escapeHtml(teamNames[leaderId] || (remotePlayers[leaderId] && remotePlayers[leaderId].name) || '—');
    var endsAt = teamTurnEndsAt[myTeam] || 0;
    var remain = endsAt ? Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)) : null;
    var pos = q.indexOf(myId) + 1;
    var turnHtml;
    if (player.finished) turnHtml = 'Bạn đã qua cầu an toàn!';
    else if (!player.alive) turnHtml = 'Bạn đã bị loại — đồng đội vẫn qua cầu theo lượt.';
    else if (!leaderId) turnHtml = 'Cả đội đã qua hết cầu.';
    else if (leaderId === myId) turnHtml = '▶ LƯỢT CỦA <b>BẠN</b> — lên cầu đi!' + (remain !== null ? ' Còn <b class="turnLeft' + (remain <= 10 ? ' urgent' : '') + '">' + remain + 's</b>' : '');
    else turnHtml = 'Chờ lượt — dẫn đầu: <b>' + leaderName + '</b>' + (remain !== null ? ' · Còn <b class="turnLeft' + (remain <= 10 ? ' urgent' : '') + '">' + remain + 's</b>' : '') + ' · Bạn vị trí ' + pos + '/' + q.length;
    tp.innerHTML = '<div class="tpLine1">VÒNG 2 · ' + counts + '</div><div class="tpLine2">' + turnHtml + '</div>';
  }
  function updateLeaderArrows() {
    for (var ti = 0; ti < 3; ti++) {
      var arr = leaderArrows[ti];
      if (!arr) continue;
      var t = teams[ti];
      var act = t ? teamActiveMember(t) : null;
      if (!act || currentRound !== 2) { arr.visible = false; continue; }
      var mx = act.isPlayer ? player.x : act.bot.x, mz = act.isPlayer ? player.z : act.bot.z;
      arr.visible = true;
      arr.position.set(mx, 3.1 + Math.sin(performance.now() * 0.005 + ti) * 0.14, mz);
    }
  }
  function assignTeamsAndPlace() {
    // CHIA TEAM: gom người sống sót (bạn + bot qua vòng 1), xáo trộn rồi chia vòng tròn
    // vào tối đa 3 đội sao cho số lượng cân bằng nhất. Team CHỈ tổ chức lượt qua cầu.
    var quals = bots.filter(function (b) { return b.finished && b.alive; });
    for (var i = 0; i < bots.length; i++) {
      var b0 = bots[i];
      if (!b0.finished || !b0.alive) { b0.alive = false; b0.group.visible = false; b0.finished = false; b0.rank = 0; b0.finishTime = null; }
    }
    // CHIA TEAM: gom người sống sót (bạn + bot qua vòng 1), xếp theo thời gian
    // về đích vòng 1 (nhanh nhất trước), chia vòng tròn vào tối đa 3 đội cho
    // cân bằng, rồi ĐẢO NGƯỢC thứ tự trong mỗi đội: người về đích chậm nhất
    // đi đầu, nhanh nhất đi cuối. Đi cuối an toàn nhất (đã biết ván nào chắc
    // nhờ người đi trước) nên đó là phần thưởng cho người nhanh nhất vòng 1.
    // Trước đây bạn luôn đứng đầu pool nên luôn là members[0] của đội 0 và
    // luôn phải đi đầu tiên. Mỗi cầu có đúng số lượt bằng số thành viên của
    // nó — không có lượt thừa, không ai ké cầu đã lộ hết ván.
    var pool = [{ isPlayer: true, bot: null, ft: player.finishTime || 0 }];
    quals.forEach(function (b) { pool.push({ isPlayer: false, bot: b, ft: b.finishTime || 0 }); });
    pool.sort(function (a, b) { return a.ft - b.ft; });
    var teamCount = Math.min(3, pool.length);
    teams = [];
    for (var ti0 = 0; ti0 < teamCount; ti0++) teams.push({ members: [] });
    pool.forEach(function (m, mi) {
      var t = mi % teamCount;
      teams[t].members.push(m);
      if (m.isPlayer) myTeam = t; else m.bot.team = t;
    });
    teams.forEach(function (t) { t.members.reverse(); });
    leaderArrows.forEach(function (a) { scene.remove(a); });
    leaderArrows = [];
    for (var ta = 0; ta < 3; ta++) {
      var cone = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.55, 4), new THREE.MeshBasicMaterial({ color: TEAMS[ta].color }));
      cone.rotation.x = Math.PI; cone.visible = false; scene.add(cone);
      leaderArrows.push(cone);
    }
    teams.forEach(function (t, ti) {
      t.members.forEach(function (m, k) {
        var fig = m.isPlayer ? player.group : m.bot.group;
        fig.userData.shirtMat.color.setHex(TEAMS[ti].color);
        var pos = k === 0 ? { x: TEAM_BRIDGE_X[ti], z: -98.7 } : slotPos(ti, k - 1);
        if (m.isPlayer) {
          player.x = pos.x; player.z = pos.z; player.y = 0; player.vy = 0; player.vx = 0; player.vz = 0; player.face = Math.PI;
          player.finished = false; player.rank = 0; player.falling = false; player.dist = 0; player.finishTime = null;
          player.group.rotation.x = 0;
          playerRing.material.color.setHex(TEAMS[ti].color);
          resetFigure(player.group, player.x, player.z);
        } else {
          var b = m.bot;
          b.finished = false; b.rank = 0; b.finishTime = null; b.y = 0; b.vy = 0; b.falling = false;
          b.r2speed = 2.4 + Math.random() * 1.3; // đủ nhanh để qua hết cầu trong 30 giây/lượt (cầu dài ~34 đơn vị)
          b.stepSide = -1; b.crackFor = -1; b.stepSideIdx = -1; b.jumpedForStep = null; b.wantSide = 0;
          b.x = pos.x; b.z = pos.z; b.vx = 0; b.vz = 0; b.face = Math.PI;
          resetFigure(b.group, b.x, b.z);
          if (!b.teamRing) {
            b.teamRing = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.66, 24),
              new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
            b.teamRing.rotation.x = -Math.PI / 2; scene.add(b.teamRing);
          }
          b.teamRing.material.color.setHex(TEAMS[ti].color);
          b.teamRing.visible = true;
          b.teamRing.position.set(b.x, 0.05, b.z);
        }
      });
    });
    // Local bridge state cho lượt bot (ván yếu đã bốc ở randomizeBridge).
    localBridges = {};
    teams.forEach(function (t, ti) {
      localBridges[ti] = { queue: t.members.map(function (m) { return m.isPlayer ? player : m.bot; }) };
    });
  }
  function showTeamScreenSingle() {
    phase = 'team';
    assignTeamsAndPlace();
    var survivors = allPersons().filter(function (p) { return p.alive; });
    var html = teams.map(function (t, ti) {
      var myPos = -1;
      t.members.forEach(function (m, i) { if (m.isPlayer) myPos = i + 1; });
      var list = t.members.map(function (m, i) {
        return '<div>' + (i + 1) + '. ' + (m.isPlayer ? '★ BẠN' : escapeHtml(m.bot.name)) + (i === 0 ? ' — đi đầu' : (i === t.members.length - 1 ? ' — đi cuối (an toàn nhất)' : '')) + '</div>';
      }).join('');
      var note = (ti === (myTeam || 0) && myPos > 0)
        ? '<div>Bạn ở vị trí ' + myPos + '/' + t.members.length + ' — thứ tự ngược với về đích vòng 1: chậm nhất đi đầu, nhanh nhất đi cuối (đi cuối an toàn nhất).</div>' : '';
      return '<div><b style="color:' + TEAM_COLORS[ti] + '">' + TEAMS[ti].name + ' · ' + t.members.length + ' người' + (ti === (myTeam || 0) ? ' · ĐỘI CỦA BẠN' : '') + '</b>' + list + note + '</div>';
    }).join('');
    var tl = $('team-list'); if (tl) tl.innerHTML = html;
    // QC nhảy thẳng vòng 2: thứ tự lượt xáo theo seed, không phải ngược
    // thứ tự về đích vòng 1 (vì không có vòng 1).
    if (qcMode && qcJumpedRound === 2 && tl) {
      tl.innerHTML = '<div><b>QC — NHẢY THẲNG VÒNG 2:</b> không có thời gian về đích Vòng 1 nên thứ tự lượt xáo trộn theo seed ' + matchStartAt + ' (không phải ngược thứ tự về đích). Đồng hồ lượt 30 giây vẫn áp dụng.</div>' + tl.innerHTML;
    }
    var ts = $('team-screen'); if (ts) ts.classList.remove('hidden');
    setTeamCardMode('team'); // khôi phục màn CHIA TEAM sau lần hiện bảng cuối trận trước đó
    var btb = $('btn-to-bridge'); if (btb) btb.textContent = 'Vào cầu ngay';
    // Tự chuyển sang vòng 2 sau vài giây như dòng chữ trên màn hình đã hứa —
    // trước đây màn hình chỉ chuyển khi bấm nút, nên nếu nút không bấm được thì kẹt ở đây.
    clearTimeout(teamAutoTimer);
    teamAutoTimer = setTimeout(function () {
      if (mode === 'single' && phase === 'team') beginRound2Play();
    }, 5500);
  }
  function beginRound2Play() {
    clearTimeout(teamAutoTimer);
    var ts = $('team-screen'); if (ts) ts.classList.add('hidden');
    hideInterstitial();
    phase = 'round2'; currentRound = 2; roundTimeLimit = 0; roundEndsAt = 0;
    // Vòng 2 chơi đơn không có deadline cả vòng (bot qua cầu lần lượt từng
    // người nên cả vòng kéo dài 2–3 phút) — đồng hồ có ý nghĩa ở đây là đồng
    // hồ LƯỢT 30 giây, tính lại từ đầu khi lượt đầu tiên bắt đầu.
    r2Turn.key = null; r2Turn.startedAt = 0; r2Turn.endsAt = 0;
    roundStartAlive = allPersons().filter(function (p) { return p.alive; }).map(function (p) { return p.name; });
    fogOverride = null; applyFogPreset('bridge');
    setHudDrum('VÒNG 2 — Cầu Khỉ Sương Mù');
    toast('VÒNG 2 — CẦU KHỈ · ĐI THEO LƯỢT THEO ĐỘI');
    updateTeamPanel();
    syncQcBar();
    showRoundHint('cau-khi'); // gợi ý phím theo vòng (P4-02 bước 2)
  }
  function teleportToBridge() {
    if (player && player.alive && myTeam !== null) {
      player.z = -95; player.x = bridgeX(myTeam);
      player.group.position.set(player.x, player.y || 0, player.z);
      myBridgeStep = 0;
    }
  }
  function stepOnBridge(plank) {
    if (mode === 'multi') {
      // Bước hiện tại đã vỡ (đồng đội giẫm ván yếu trước đó) thì phải nhảy qua khoảng trống.
      if (brokenSteps[(myTeam || 0) + ':' + myBridgeStep]) sendWS({ type: 'bridge', action: 'jumpGap' });
      else sendWS({ type: 'bridge', action: 'step', plank: plank });
      return;
    }
    if (!isPlayerTurn()) { toast('Chưa tới lượt của bạn.'); return; }
    var b = bridges[myTeam || 0];
    var step = myBridgeStep;
    var pk = b.planks[step];
    if (!pk) return;
    if (plank === pk.weakSide) {
      breakPlank(pk, plank);
      player.falling = true; player.vy = 0;
      player.fallReason = 'Giẫm phải ván yếu — ván gãy, bạn rơi xuống biển!';
    } else {
      myBridgeStep++; player.bridgeStep = myBridgeStep;
      if (myBridgeStep >= 9) {
        player.finished = true; player.finishTime = (Date.now() - matchStartAt) / 1000;
        localRanking.push({ name: player.name, time: (Date.now() - matchStartAt) });
        cheerSound(); burstConfetti(player.x, -137);
      } else {
        player.z = stepZ(myBridgeStep); player.x = bridgeX(myTeam) + (plank === 0 ? -1.02 : 1.02);
        player.group.position.set(player.x, player.y || 0, player.z);
      }
    }
  }
  /* --- Người chơi trên cầu (chơi đơn, port từ prototype) --- */
  function updatePlayerR2(dt) {
    if (!player) return;
    if (!player.alive) {
      player.fallAnim = Math.min(1, (player.fallAnim || 0) + dt * 1.6);
      player.group.position.set(player.x, -2.6 * player.fallAnim, player.z);
      player.group.rotation.x = -0.5 * player.fallAnim;
      return;
    }
    if (player.finished) {
      player.group.position.y = Math.abs(Math.sin(performance.now() * 0.005)) * 0.15;
      player.group.userData.armL.rotation.x = -2.6 + Math.sin(performance.now() * 0.006) * 0.25;
      player.group.userData.armR.rotation.x = -2.6 + Math.cos(performance.now() * 0.006) * 0.25;
      return;
    }
    if (player.falling) {
      player.vy -= 15 * dt; player.y += player.vy * dt;
      player.group.position.set(player.x, player.y, player.z);
      player.group.rotation.x += dt * 1.4;
      if (player.y < -2.2) { player.falling = false; splashSound(0.55); eliminate(player, player.fallReason || 'Rơi xuống biển!'); }
      return;
    }
    var iv = inputVector();
    var sin = Math.sin(camYaw), cos = Math.cos(camYaw);
    var wx = iv.x * cos + iv.z * sin;
    var wz = -iv.x * sin + iv.z * cos;
    var ACCEL = 32, MAXS = 5.6;
    player.vx += wx * ACCEL * dt; player.vz += wz * ACCEL * dt;
    var fr = Math.exp(-8 * dt);
    if (Math.abs(wx) < 0.01) player.vx *= fr;
    if (Math.abs(wz) < 0.01) player.vz *= fr;
    var sp = Math.sqrt(player.vx * player.vx + player.vz * player.vz);
    if (sp > MAXS) { player.vx = player.vx / sp * MAXS; player.vz = player.vz / sp * MAXS; sp = MAXS; }
    player.x += player.vx * dt; player.z += player.vz * dt;
    player.x = Math.max(-20.5, Math.min(20.5, player.x));
    player.z = Math.max(-145, Math.min(-87.5, player.z));
    var bxP = TEAM_BRIDGE_X[myTeam || 0];
    if (!isPlayerTurn()) {
      if (player.z < -99.4) { player.z = -99.4; if (player.vz < 0) player.vz = 0; }
      player.x = Math.max(bxP - 5.2, Math.min(bxP + 5.2, player.x));
    } else if (player.z < -100.4 && player.z > -131) {
      player.x = Math.max(bxP - 2.6, Math.min(bxP + 2.6, player.x));
    }
    if (player.z >= -100.4) {
      player.x = Math.max(bxP - 5.4, Math.min(bxP + 5.4, player.x));
      player.z = Math.min(player.z, -90.3);
    }
    if (jumpQueued) {
      jumpQueued = false;
      if (player.y <= 0.001) player.vy = 6.6;
    }
    var airborne = false;
    if (player.y > 0 || player.vy > 0) {
      player.vy -= 17 * dt; player.y += player.vy * dt;
      airborne = player.y > 0.02;
      if (player.y <= 0) { player.y = 0; player.vy = 0; }
    }
    var gnd = bridgeGround(player.x, player.z, myTeam || 0);
    if (!airborne) {
      if (!gnd.ground) {
        player.falling = true; player.vy = 0;
        player.fallReason = gnd.step >= 0 ? 'Bước vào khoảng trống ván đã vỡ — cần nhảy (Space) qua!' : 'Trượt khỏi cầu xuống biển!';
        return;
      }
      if (gnd.step >= 0) {
        var pl = bridges[myTeam || 0].planks[gnd.step];
        if (gnd.side === pl.weakSide && !(gnd.side === 0 ? pl.brokenL : pl.brokenR)) {
          if (pl.crackSide !== gnd.side) { pl.crackSide = gnd.side; pl.crackT = 0; crackSound(); }
          pl.touched = true;
          pl.crackT += dt;
          if (pl.crackT >= 0.34) {
            breakPlank(pl, gnd.side);
            player.falling = true; player.vy = 0;
            player.fallReason = 'Giẫm phải ván yếu — ván gãy, bạn rơi xuống biển!';
            return;
          }
        }
      }
    }
    if (sp > 0.4) {
      var tf2 = Math.atan2(player.vx, player.vz);
      var dd = tf2 - player.face;
      while (dd > Math.PI) dd -= Math.PI * 2;
      while (dd < -Math.PI) dd += Math.PI * 2;
      player.face += dd * Math.min(1, dt * 12);
    }
    player.group.position.set(player.x, player.y, player.z);
    player.group.rotation.y = player.face;
    animateFigure(player.group, sp / MAXS, dt, player.y);
    player.group.position.x = player.x; player.group.position.z = player.z;
    player.dist = Math.max(0, -92 - player.z);
    if (player.z <= -132.5) {
      player.finished = true; player.finishTime = (Date.now() - matchStartAt) / 1000;
      localRanking.push({ name: player.name, time: (Date.now() - matchStartAt) });
      cheerSound(); burstConfetti(player.x, -137);
    }
  }
  /* --- Bot trên cầu (chơi đơn, port từ prototype) --- */
  function updateBotsR2(dt) {
    for (var i = 0; i < bots.length; i++) {
      var b = bots[i];
      if (!b.alive) {
        if (b.falling) {
          b.y -= dt * 2.6;
          b.group.position.y = b.y;
          b.group.rotation.x += dt * 1.2;
          if (b.y < -3) { b.falling = false; b.group.visible = false; if (b.teamRing) b.teamRing.visible = false; }
        }
        continue;
      }
      if (b.finished) {
        b.group.position.y = Math.abs(Math.sin(performance.now() * 0.005 + i)) * 0.13;
        b.group.userData.armL.rotation.x = -2.6 + Math.sin(performance.now() * 0.006 + i) * 0.25;
        b.group.userData.armR.rotation.x = -2.6 + Math.cos(performance.now() * 0.006 + i) * 0.25;
        continue;
      }
      if (b.falling) {
        b.vy -= 15 * dt; b.y += b.vy * dt;
        b.group.position.set(b.x, b.y, b.z);
        b.group.rotation.x += dt * 1.3;
        if (b.y < -2.2) { b.alive = false; b.falling = true; splashSound(0.25); }
        continue;
      }
      var myTeamB = teams[b.team || 0];
      var actBot = myTeamB ? teamActiveMember(myTeamB) : null;
      if (!actBot || actBot.bot !== b) {
        var waitSlot = 0;
        if (myTeamB) {
          for (var wi = 0; wi < myTeamB.members.length; wi++) {
            var wm = myTeamB.members[wi];
            if (wm.bot === b) break;
            if (!memberDone(wm) && wm !== actBot) waitSlot++;
          }
        }
        var wp = slotPos(b.team || 0, waitSlot);
        var wdx = wp.x - b.x, wdz = wp.z - b.z;
        b.vx += (wdx * 2.4 - b.vx) * Math.min(1, dt * 4);
        b.vz += (wdz * 2.4 - b.vz) * Math.min(1, dt * 4);
        b.x += b.vx * dt; b.z += b.vz * dt;
        var wsp = Math.sqrt(b.vx * b.vx + b.vz * b.vz);
        if (wsp > 0.4) {
          var wtf = Math.atan2(b.vx, b.vz);
          var wdd = wtf - b.face;
          while (wdd > Math.PI) wdd -= Math.PI * 2;
          while (wdd < -Math.PI) wdd += Math.PI * 2;
          b.face += wdd * Math.min(1, dt * 10);
        } else b.face += (Math.PI - b.face) * Math.min(1, dt * 6);
        b.group.position.x = b.x; b.group.position.z = b.z;
        b.group.rotation.y = b.face;
        animateFigure(b.group, wsp / 5, dt, 0);
        b.group.position.x = b.x; b.group.position.z = b.z; b.group.position.y = 0;
        if (b.teamRing) b.teamRing.position.set(b.x, 0.05, b.z);
        continue;
      }
      var bxB = TEAM_BRIDGE_X[b.team || 0];
      var gndB = bridgeGround(b.x, b.z, b.team || 0);
      var nextStep = gndB.step >= 0 ? gndB.step + 1 : 0;
      if (gndB.step === -1) nextStep = 0;
      if (nextStep !== b.stepSideIdx) {
        b.stepSideIdx = nextStep;
        b.wantSide = Math.random() < 0.5 ? 0 : 1;
      }
      var targetX = gndB.step === -2 ? b.x : bxB + (b.wantSide === 0 ? -1.02 : 1.02);
      var dxB = targetX - b.x;
      b.vx += (dxB * 2.2 - b.vx) * Math.min(1, dt * 4);
      b.vz += (-b.r2speed - b.vz) * Math.min(1, dt * 3);
      b.x += b.vx * dt; b.z += b.vz * dt;
      var airB = false;
      if (b.y > 0 || b.vy > 0) {
        b.vy -= 17 * dt; b.y += b.vy * dt;
        airB = b.y > 0.02;
        if (b.y <= 0) { b.y = 0; b.vy = 0; }
      }
      var gnd2 = bridgeGround(b.x, b.z, b.team || 0);
      if (!airB) {
        if (!gnd2.ground) {
          if (gnd2.step >= 0 && b.y <= 0.001 && !b.jumpedForStep) {
            b.jumpedForStep = gnd2.step;
            if (Math.random() < 0.78) { b.vy = 6.4; }
            else { b.falling = true; b.vy = 0; }
          } else if (gnd2.step < 0) {
            b.falling = true; b.vy = 0;
          }
          if (b.falling) continue;
        } else {
          if (b.jumpedForStep != null && gnd2.step !== b.jumpedForStep) b.jumpedForStep = null;
          if (gnd2.step >= 0) {
            var pl2 = bridges[b.team || 0].planks[gnd2.step];
            var brokenSide = gnd2.side === 0 ? pl2.brokenL : pl2.brokenR;
            if (gnd2.side === pl2.weakSide && !brokenSide) {
              if (pl2.crackSide !== gnd2.side) { pl2.crackSide = gnd2.side; pl2.crackT = 0; crackSound(); }
              pl2.touched = true;
              pl2.crackT += dt;
              if (pl2.crackT >= 0.34) {
                breakPlank(pl2, gnd2.side);
                b.falling = true; b.vy = 0;
                continue;
              }
            }
          }
        }
      }
      var spB = Math.sqrt(b.vx * b.vx + b.vz * b.vz);
      if (spB > 0.4) {
        var tfB = Math.atan2(b.vx, b.vz);
        var ddB = tfB - b.face;
        while (ddB > Math.PI) ddB -= Math.PI * 2;
        while (ddB < -Math.PI) ddB += Math.PI * 2;
        b.face += ddB * Math.min(1, dt * 10);
      }
      b.group.position.x = b.x; b.group.position.z = b.z;
      b.group.rotation.y = b.face;
      animateFigure(b.group, spB / 5, dt, b.y || 0);
      b.group.position.x = b.x; b.group.position.z = b.z; b.group.position.y = b.y || 0;
      if (b.teamRing) b.teamRing.position.set(b.x, 0.05, b.z);
      if (b.z <= -132.5) {
        b.finished = true; b.finishTime = (Date.now() - matchStartAt) / 1000;
        localRanking.push({ name: b.name, time: (Date.now() - matchStartAt) });
      }
    }
  }
  function checkR2EndSingle() {
    // Người chơi bị loại ở vòng 2 vẫn đang xem (phase 'spectator') thì vòng vẫn
    // phải kết thúc khi mọi bot đã xong — trước đây hàm này từ chối chạy ở
    // phase 'spectator' nên trận kẹt mãi ở màn hình khán giả, không ai kết thúc vòng.
    if (phase !== 'round2' && !(phase === 'spectator' && currentRound === 2)) return;
    // Đồng hồ LƯỢT 30 giây (thay cho đồng hồ "đứng yên 45 giây" cũ): đồng hồ
    // chạy từ lúc lượt bắt đầu — lượt không bắt đầu và lượt đi quá chậm là
    // một. Hết 30 giây mà chưa qua hết cầu thì người đó bị loại, lượt chuyển
    // cho người tiếp theo. Bot cũng chịu cùng luật: bot qua cầu mất ~10–15
    // giây (tốc độ 2.4–3.7) nên bình thường không chạm giới hạn; bot nào
    // không qua được trong 30 giây thì bị loại như người chơi.
    if (phase === 'round2' || (phase === 'spectator' && currentRound === 2)) {
      var actM = teams[myTeam || 0] ? teamActiveMember(teams[myTeam || 0]) : null;
      var key = actM ? (actM.isPlayer ? 'me' : 'bot:' + actM.bot.name) : null;
      if (key && key !== r2Turn.key) {
        r2Turn.key = key; r2Turn.startedAt = Date.now();
        r2Turn.endsAt = r2Turn.startedAt + R2_TURN_LIMIT_S * 1000;
      } else if (!key) { r2Turn.key = null; r2Turn.endsAt = 0; }
      if (key && Date.now() >= r2Turn.endsAt) {
        r2Turn.key = null; r2Turn.endsAt = 0;
        if (actM.isPlayer) {
          if (player && player.alive && !player.finished && !player.falling) eliminate(player, 'Hết lượt qua cầu (30 giây) — đi chậm quá!');
        } else if (actM.bot && actM.bot.alive && !actM.bot.finished) {
          var bb = actM.bot;
          eliminate(bb, 'Hết lượt qua cầu (30 giây) — đi chậm quá!');
          if (bb.group) bb.group.visible = false;
          if (bb.teamRing) bb.teamRing.visible = false;
        }
      }
    }
    var running = 0;
    for (var i = 0; i < bots.length; i++) if (bots[i].alive && !bots[i].finished) running++;
    var playerDone = !player || !player.alive || player.finished;
    if (playerDone && running === 0) {
      var st = roundEndStats();
      localRoundEnd(2, st.survivors, st.eliminated);
    }
  }

  // ---- Vòng 1 chơi đơn: người chơi + bot (port từ prototype) ----
  function inputVector() {
    var x = 0, z = 0;
    if (keys['KeyW'] || keys['ArrowUp']) z -= 1;
    if (keys['KeyS'] || keys['ArrowDown']) z += 1;
    if (keys['KeyA'] || keys['ArrowLeft']) x -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) x += 1;
    if (joy.active) { x += joy.x; z += joy.y; }
    var len = Math.sqrt(x * x + z * z);
    if (len > 1) { x /= len; z /= len; }
    return { x: x, z: z, mag: Math.min(1, len) };
  }
  function updatePlayerR1(dt) {
    if (!player) return;
    if (!player.alive || player.finished) {
      if (!player.alive) {
        player.fallAnim = Math.min(1, (player.fallAnim || 0) + dt * 2.6);
        player.group.rotation.x = -Math.PI / 2 * player.fallAnim * 0.92;
        player.group.position.set(player.x, 0.25 * player.fallAnim, player.z);
      }
      return;
    }
    var iv = inputVector();
    var sin = Math.sin(camYaw), cos = Math.cos(camYaw);
    var wx = iv.x * cos + iv.z * sin;
    var wz = -iv.x * sin + iv.z * cos;
    var ACCEL = 34, MAXS = 6.4;
    player.vx += wx * ACCEL * dt;
    player.vz += wz * ACCEL * dt;
    var fr = Math.exp(-8 * dt);
    if (Math.abs(wx) < 0.01) player.vx *= fr;
    if (Math.abs(wz) < 0.01) player.vz *= fr;
    var sp = Math.sqrt(player.vx * player.vx + player.vz * player.vz);
    if (sp > MAXS) { player.vx = player.vx / sp * MAXS; player.vz = player.vz / sp * MAXS; sp = MAXS; }
    var oldX = player.x, oldZ = player.z;
    player.x += player.vx * dt; player.z += player.vz * dt;
    player.x = Math.max(-TRACK_HALF_W, Math.min(TRACK_HALF_W, player.x));
    player.z = Math.min(START_Z + 1.5, player.z);
    if (jumpQueued) {
      jumpQueued = false;
      if (player.y <= 0.001) {
        player.vy = 6.4;
        if (r1Phase === 'gong' && r1GongAge > GONG_GRACE) player.jumpedInGong = true;
      }
    }
    if (player.y > 0 || player.vy > 0) {
      player.vy -= 17 * dt; player.y += player.vy * dt;
      if (player.y <= 0) { player.y = 0; player.vy = 0; }
    }
    if (r1Phase === 'gong') {
      var moved = Math.sqrt((player.x - oldX) * (player.x - oldX) + (player.z - oldZ) * (player.z - oldZ));
      if (r1GongAge > GONG_GRACE) {
        player.gongMove += moved;
        if (player.gongMove > 0.38 || player.jumpedInGong) {
          eliminate(player, player.jumpedInGong ? 'Nhảy lên khi chiêng đang vang!' : 'Cử động khi chiêng đang vang!');
          if (!reducedMotion) shakeT = 0.35;
          return;
        }
      }
    }
    if (sp > 0.4) {
      var targetFace = Math.atan2(player.vx, player.vz);
      var d = targetFace - player.face;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      player.face += d * Math.min(1, dt * 12);
    }
    player.group.position.set(player.x, player.y, player.z);
    player.group.rotation.y = player.face;
    animateFigure(player.group, sp / MAXS, dt, player.y);
    player.group.position.x = player.x; player.group.position.z = player.z;
    player.dist = Math.max(player.dist, START_Z - 1.5 - player.z);
    if (player.z <= FINISH_Z) finishFigure(true, null);
  }
  function updateBotsR1(dt) {
    for (var i = 0; i < bots.length; i++) {
      var b = bots[i];
      if (!b.alive) {
        if (b.fallAnim > 0 && b.fallAnim < 1) {
          b.fallAnim = Math.min(1, b.fallAnim + dt * 2.4);
          b.group.rotation.x = -Math.PI / 2 * b.fallAnim * 0.92;
          b.group.position.y = 0.25 * b.fallAnim;
        }
        continue;
      }
      if (b.finished) {
        b.group.position.y = Math.abs(Math.sin(performance.now() * 0.005 + i)) * 0.14;
        b.group.userData.armL.rotation.x = -2.6 + Math.sin(performance.now() * 0.006 + i) * 0.25;
        b.group.userData.armR.rotation.x = -2.6 + Math.cos(performance.now() * 0.006 + i) * 0.25;
        continue;
      }
      var wantSpeed = 0;
      if (r1Phase === 'drum') {
        wantSpeed = b.speed;
      } else if (r1Phase === 'gong') {
        if (b.willFall) {
          wantSpeed = b.speed;
          b.fallTimer -= dt;
          if (b.fallTimer <= 0 && r1GongAge > 0.3) { b.alive = false; b.fallAnim = 0.0001; continue; }
        } else if (b.stopTimer > 0) {
          b.stopTimer -= dt;
          wantSpeed = b.speed * 0.55;
        } else {
          wantSpeed = 0;
        }
      }
      b.wobble += dt * 0.7;
      var tx = b.laneX + Math.sin(b.wobble) * 0.7;
      var dx = tx - b.x;
      var spNow = Math.sqrt(b.vx * b.vx + b.vz * b.vz);
      var accel = wantSpeed > spNow ? 16 : 30;
      var tvx = dx * 1.4, tvz = -wantSpeed;
      b.vx += (tvx - b.vx) * Math.min(1, dt * (accel / 6));
      b.vz += (tvz - b.vz) * Math.min(1, dt * (accel / 6));
      b.x += b.vx * dt; b.z += b.vz * dt;
      b.x = Math.max(-TRACK_HALF_W, Math.min(TRACK_HALF_W, b.x));
      var sp2 = Math.sqrt(b.vx * b.vx + b.vz * b.vz);
      if (sp2 > 0.4) {
        var tf = Math.atan2(b.vx, b.vz);
        var dd = tf - b.face;
        while (dd > Math.PI) dd -= Math.PI * 2;
        while (dd < -Math.PI) dd += Math.PI * 2;
        b.face += dd * Math.min(1, dt * 10);
      }
      b.group.position.x = b.x; b.group.position.z = b.z;
      b.group.rotation.y = b.face;
      animateFigure(b.group, sp2 / 5.5, dt, 0);
      if (b.z <= FINISH_Z) finishFigure(false, b);
    }
  }
  var finishCount = 0;
  function finishFigure(isPlayer, b) {
    finishCount++;
    if (isPlayer) {
      player.finished = true; player.rank = finishCount; player.finishTime = (Date.now() - matchStartAt) / 1000;
      cheerSound();
      burstConfetti(player.x, FINISH_Z - 2);
    } else {
      b.finished = true; b.rank = finishCount; b.finishTime = (Date.now() - matchStartAt) / 1000;
    }
  }
  function updateSingleR1(dt) {
    if (phase !== 'round1' && !(phase === 'spectator' && currentRound === 1)) return;
    // Hết giờ vòng 1 (giới hạn 120s, server cũng áp cùng giới hạn): ai chưa về đích bị loại.
    if (roundEndsAt && Date.now() >= roundEndsAt && !updateSingleR1._r1TimeoutDone) {
      updateSingleR1._r1TimeoutDone = true;
      allPersons().filter(function (p) { return p.alive && !p.finished; })
        .forEach(function (p) { eliminate(p, 'Hết giờ — người chưa về đích bị loại'); });
      toast('Hết giờ — người chưa về đích bị loại');
    }
    if (phase === 'round1' || (phase === 'spectator' && currentRound === 1)) {
      r1PhaseT -= dt;
      r1GongAge += dt;
      if (r1Phase === 'drum') {
        r1DrumBeatT -= dt;
        if (r1DrumBeatT <= 0) { r1DrumBeatT = 0.42 + Math.random() * 0.2; drumHit(0.9); }
      }
      if (r1PhaseT <= 0) startPhase(r1Phase === 'drum' ? 'gong' : 'drum');
      updatePlayerR1(dt); // khán giả: chỉ còn hoạt ảnh ngã của người chơi (hàm tự return khi đã chết)
    }
    updateBotsR1(dt);
    var active = allPersons().filter(function (p) { return p.alive && !p.finished; });
    if (active.length === 0 && (player || bots.length)) {
      if (!updateSingleR1._teamTimer) updateSingleR1._teamTimer = 1;
      updateSingleR1._teamTimer -= dt;
      if (updateSingleR1._teamTimer <= 0) {
        updateSingleR1._teamTimer = 0;
        var st1 = roundEndStats();
        localRoundEnd(1, st1.survivors, st1.eliminated);
      }
    }
  }

  // ---- Di chuyển người chơi (multi + vòng 3-6; vòng 1/2 chơi đơn dùng updatePlayerR1/R2) ----
  function updatePlayerMovement(dt) {
    if (!player || !player.alive || phase === 'tourism') return;
    if (document.activeElement === $('chat-input')) return;
    // Vòng vẽ / ô ăn quan dùng overlay, không di chuyển nhân vật.
    if (window.Rounds && window.Rounds.blocksMovement && window.Rounds.blocksMovement()) return;
    var speed = 9;
    var mx = 0, mz = 0;
    if (keys['KeyW'] || keys['ArrowUp']) mz -= 1;
    if (keys['KeyS'] || keys['ArrowDown']) mz += 1;
    if (keys['KeyA'] || keys['ArrowLeft']) mx -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) mx += 1;
    if (joy.active) { mx += joy.x; mz += joy.y; }
    if (mx || mz) {
      var len = Math.hypot(mx, mz); mx /= len; mz /= len;
      var oldX = player.x, oldZ = player.z;
      player.x += mx * speed * dt; player.z += mz * speed * dt;
      // Giới hạn trong đảo chính ở vòng 1 và các vòng sân làng.
      if (phase === 'round1' || phase === 'round3' || phase === 'round5' || phase === 'round6') { player.x = Math.max(-28, Math.min(28, player.x)); player.z = Math.max(-48, Math.min(38, player.z)); }
      if (phase === 'round2') {
        // Trên cầu chỉ đi trong làn cầu của đội mình.
        if (mode === 'single' && !isPlayerTurn()) { player.x = oldX; player.z = oldZ; }
        else {
          player.x = Math.max(bridgeX(myTeam) - 4, Math.min(bridgeX(myTeam) + 4, player.x));
          player.z = Math.max(-145, Math.min(-87.5, player.z));
        }
      }
      player.group.position.set(player.x, player.y || 0, player.z);
      if (mode === 'multi' && (Math.abs(player.x - oldX) > 0.01 || Math.abs(player.z - oldZ) > 0.01)) {
        sendWS({ type: 'pos', x: player.x, z: player.z, jumped: false });
      }
    }
    // Gửi input đã throttle tối đa 15Hz; giữ lại pos cho tương thích vòng 1/2.
    if (mode === 'multi' && (mx || mz || jumpQueued) && Date.now() - lastInputSentAt >= 66) {
      lastInputSentAt = Date.now();
      var ilen = Math.hypot(mx, mz) || 1;
      sendWS({ type: 'input', dx: mx / ilen, dz: mz / ilen, jump: jumpQueued });
      jumpQueued = false;
    }
    // Nhảy / trọng lực đơn giản (y=0 là mặt đất).
    if (!player.grounded) {
      player.vy -= 22 * dt;
      var y = player.y + player.vy * dt;
      if (y <= 0) { y = 0; player.grounded = true; player.vy = 0; player.jumped = false; }
      player.y = y;
      player.group.position.y = y;
    }
  }

  // ================= CAMERA (port từ prototype) =================
  var camDesired = new THREE.Vector3();
  var camLookDesired = new THREE.Vector3();
  function updateCamera(dt) {
    var TORSO_Y = 1.25; // điểm nhìn cố định ở thân — không bám đầu/nhún nhảy
    if (!camInit) {
      camInit = true;
      camFocusSmooth.set(player ? player.x : 0, TORSO_Y, player ? player.z : START_Z);
      camLookSmooth.copy(camFocusSmooth);
      camYawCur = camYaw; camPitchCur = camPitch;
      camera.position.set(player ? player.x : 0, 4.4, (player ? player.z : START_Z) + camDist);
    }
    camYawCur = angleDamp(camYawCur, camYaw, 14, dt, 7);
    camPitchCur += (camPitch - camPitchCur) * dampK(14, dt);
    if (tour.active) {
      /* ---------- DU LỊCH HẠ LONG ---------- */
      if (specRing) specRing.visible = false;
      if (specArrow) specArrow.visible = false;
      var panT = 26 * dt;
      var fxT = -Math.sin(tour.yaw), fzT = -Math.cos(tour.yaw);
      var rxT = Math.cos(tour.yaw), rzT = -Math.sin(tour.yaw);
      if (keys['KeyW'] || keys['ArrowUp']) { tour.tCenter.x += fxT * panT; tour.tCenter.z += fzT * panT; }
      if (keys['KeyS'] || keys['ArrowDown']) { tour.tCenter.x -= fxT * panT; tour.tCenter.z -= fzT * panT; }
      if (keys['KeyA']) { tour.tCenter.x -= rxT * panT; tour.tCenter.z -= rzT * panT; }
      if (keys['KeyD']) { tour.tCenter.x += rxT * panT; tour.tCenter.z += rzT * panT; }
      tour.tCenter.x = Math.max(-820, Math.min(820, tour.tCenter.x));
      tour.tCenter.z = Math.max(-820, Math.min(820, tour.tCenter.z));
      tour.center.x += (tour.tCenter.x - tour.center.x) * dampK(2.1, dt);
      tour.center.y += (tour.tCenter.y - tour.center.y) * dampK(2.1, dt);
      tour.center.z += (tour.tCenter.z - tour.center.z) * dampK(2.1, dt);
      tour.dist += (tour.tDist - tour.dist) * dampK(2.4, dt);
      tour.yaw += (tour.tYaw - tour.yaw) * dampK(2.2, dt);
      tour.pitch += (tour.tPitch - tour.pitch) * dampK(2.2, dt);
      camDesired.set(
        tour.center.x + Math.sin(tour.yaw) * Math.cos(tour.pitch) * tour.dist,
        tour.center.y + Math.sin(tour.pitch) * tour.dist,
        tour.center.z + Math.cos(tour.yaw) * Math.cos(tour.pitch) * tour.dist);
      if (camDesired.y < 1.2) camDesired.y = 1.2;
      camLookDesired.copy(tour.center);
      camera.position.x += (camDesired.x - camera.position.x) * dampK(2.6, dt);
      camera.position.y += (camDesired.y - camera.position.y) * dampK(2.6, dt);
      camera.position.z += (camDesired.z - camera.position.z) * dampK(2.6, dt);
    } else if (spec.active) {
      /* ---------- KHÁN GIẢ ---------- */
      if (!spec.target || !spec.target.alive) {
        var nl = specLeader();
        if (nl && nl !== spec.target) setSpecTarget(nl);
      }
      if (spec.mode === 'shoulder' && spec.target && spec.target.finished) setSpecMode('follow');
      var t = spec.target;
      var tx = t ? t.x : 0, tz = t ? t.z : FINISH_Z + 6, tface = t ? t.face : Math.PI;
      if (spec.mode === 'overview') {
        camFocusSmooth.x += (0 - camFocusSmooth.x) * dampK(3.2, dt);
        camFocusSmooth.y += (1 - camFocusSmooth.y) * dampK(3.2, dt);
        camFocusSmooth.z += (2 - camFocusSmooth.z) * dampK(3.2, dt);
        camDesired.set(
          camFocusSmooth.x + Math.sin(spec.ovYaw) * Math.cos(spec.ovPitch) * spec.ovDist,
          Math.max(10, Math.sin(spec.ovPitch) * spec.ovDist),
          camFocusSmooth.z + Math.cos(spec.ovYaw) * Math.cos(spec.ovPitch) * spec.ovDist);
        camLookDesired.copy(camFocusSmooth);
        camera.position.x += (camDesired.x - camera.position.x) * dampK(3.2, dt);
        camera.position.y += (camDesired.y - camera.position.y) * dampK(3.2, dt);
        camera.position.z += (camDesired.z - camera.position.z) * dampK(3.2, dt);
      } else if (spec.mode === 'free') {
        var panSp = 16 * dt;
        var fx2 = -Math.sin(spec.freeYaw), fz2 = -Math.cos(spec.freeYaw);
        var rx2 = Math.cos(spec.freeYaw), rz2 = -Math.sin(spec.freeYaw);
        if (keys['KeyW'] || keys['ArrowUp']) { spec.freeCenter.x += fx2 * panSp; spec.freeCenter.z += fz2 * panSp; }
        if (keys['KeyS'] || keys['ArrowDown']) { spec.freeCenter.x -= fx2 * panSp; spec.freeCenter.z -= fz2 * panSp; }
        if (keys['KeyA']) { spec.freeCenter.x -= rx2 * panSp; spec.freeCenter.z -= rz2 * panSp; }
        if (keys['KeyD']) { spec.freeCenter.x += rx2 * panSp; spec.freeCenter.z += rz2 * panSp; }
        spec.freeCenter.x = Math.max(-40, Math.min(40, spec.freeCenter.x));
        spec.freeCenter.z = Math.max(-58, Math.min(56, spec.freeCenter.z));
        camFocusSmooth.x += (spec.freeCenter.x - camFocusSmooth.x) * dampK(4.5, dt);
        camFocusSmooth.y += (TORSO_Y - camFocusSmooth.y) * dampK(4.5, dt);
        camFocusSmooth.z += (spec.freeCenter.z - camFocusSmooth.z) * dampK(4.5, dt);
        camDesired.set(
          camFocusSmooth.x + Math.sin(spec.freeYaw) * Math.cos(spec.freePitch) * spec.freeDist,
          camFocusSmooth.y + Math.sin(spec.freePitch) * spec.freeDist,
          camFocusSmooth.z + Math.cos(spec.freeYaw) * Math.cos(spec.freePitch) * spec.freeDist);
        if (camDesired.y < 0.9) camDesired.y = 0.9;
        camLookDesired.copy(camFocusSmooth);
        camera.position.x += (camDesired.x - camera.position.x) * dampK(5, dt);
        camera.position.y += (camDesired.y - camera.position.y) * dampK(5, dt);
        camera.position.z += (camDesired.z - camera.position.z) * dampK(5, dt);
      } else if (spec.mode === 'shoulder' && t) {
        camFocusSmooth.x += (tx - camFocusSmooth.x) * dampK(3.4, dt);
        camFocusSmooth.y += (TORSO_Y - camFocusSmooth.y) * dampK(3.4, dt);
        camFocusSmooth.z += (tz - camFocusSmooth.z) * dampK(3.4, dt);
        var fwX = Math.sin(tface), fwZ = Math.cos(tface);
        var sdX = Math.cos(tface), sdZ = -Math.sin(tface);
        camDesired.set(
          camFocusSmooth.x - fwX * 2.4 + sdX * 0.85,
          2.05,
          camFocusSmooth.z - fwZ * 2.4 + sdZ * 0.85);
        camLookDesired.set(
          camFocusSmooth.x + fwX * 7,
          1.35,
          camFocusSmooth.z + fwZ * 7);
        camera.position.x += (camDesired.x - camera.position.x) * dampK(4.2, dt);
        camera.position.y += (camDesired.y - camera.position.y) * dampK(4.2, dt);
        camera.position.z += (camDesired.z - camera.position.z) * dampK(4.2, dt);
      } else {
        // theo dõi (mặc định): thứ ba mượt sau lưng người đang xem — blend ~0.8s khi đổi người
        camFocusSmooth.x += (tx - camFocusSmooth.x) * dampK(3.4, dt);
        camFocusSmooth.y += (TORSO_Y - camFocusSmooth.y) * dampK(3.4, dt);
        camFocusSmooth.z += (tz - camFocusSmooth.z) * dampK(3.4, dt);
        camDesired.set(
          camFocusSmooth.x + Math.sin(spec.yaw) * Math.cos(spec.pitch) * spec.dist,
          camFocusSmooth.y + Math.sin(spec.pitch) * spec.dist,
          camFocusSmooth.z + Math.cos(spec.yaw) * Math.cos(spec.pitch) * spec.dist);
        if (camDesired.y < 0.9) camDesired.y = 0.9;
        camLookDesired.copy(camFocusSmooth);
        camera.position.x += (camDesired.x - camera.position.x) * dampK(4.2, dt);
        camera.position.y += (camDesired.y - camera.position.y) * dampK(4.2, dt);
        camera.position.z += (camDesired.z - camera.position.z) * dampK(4.2, dt);
      }
      if (t && spec.mode !== 'overview') {
        specRing.visible = true; specArrow.visible = true;
        specRing.position.set(t.x, 0.05, t.z);
        specRing.material.opacity = 0.7 + Math.sin(performance.now() * 0.006) * 0.25;
        specArrow.position.set(t.x, 2.8 + Math.sin(performance.now() * 0.004) * 0.12, t.z);
      } else { specRing.visible = false; specArrow.visible = false; }
    } else {
      /* ---------- NGƯỜI CHƠI (cùng hệ damping) ---------- */
      if (specRing) specRing.visible = false;
      if (specArrow) specArrow.visible = false;
      if (player) {
        camFocusSmooth.x += (player.x - camFocusSmooth.x) * dampK(11, dt);
        camFocusSmooth.y += (TORSO_Y - camFocusSmooth.y) * dampK(11, dt);
        camFocusSmooth.z += (player.z - camFocusSmooth.z) * dampK(11, dt);
        var posL = introBlend > 0 ? 2.6 : 10;
        camDesired.set(
          camFocusSmooth.x + Math.sin(camYawCur) * Math.cos(camPitchCur) * camDist,
          camFocusSmooth.y + Math.sin(camPitchCur) * camDist,
          camFocusSmooth.z + Math.cos(camYawCur) * Math.cos(camPitchCur) * camDist);
        if (camDesired.y < 0.8) camDesired.y = 0.8;
        camLookDesired.copy(camFocusSmooth);
        camera.position.x += (camDesired.x - camera.position.x) * dampK(posL, dt);
        camera.position.y += (camDesired.y - camera.position.y) * dampK(posL, dt);
        camera.position.z += (camDesired.z - camera.position.z) * dampK(posL, dt);
      } else {
        camera.position.set(0, 45, 90);
        camLookDesired.set(0, 4, 0);
      }
    }
    var lookL = tour.active ? 2.6 : (spec.active ? 5 : (introBlend > 0 ? 3.2 : 14));
    camLookSmooth.x += (camLookDesired.x - camLookSmooth.x) * dampK(lookL, dt);
    camLookSmooth.y += (camLookDesired.y - camLookSmooth.y) * dampK(lookL, dt);
    camLookSmooth.z += (camLookDesired.z - camLookSmooth.z) * dampK(lookL, dt);
    if (shakeT > 0) {
      shakeT -= dt;
      camera.position.x += (Math.random() - 0.5) * 0.14 * shakeT;
      camera.position.y += (Math.random() - 0.5) * 0.14 * shakeT;
    }
    camera.lookAt(camLookSmooth.x, camLookSmooth.y, camLookSmooth.z);
    // vòng sáng + mũi tên theo người chơi
    if (player && playerRing) {
      playerRing.position.set(player.x, 0.04, player.z);
      playerRing.material.opacity = (player.alive && !player.finished) ? 0.65 + Math.sin(performance.now() * 0.006) * 0.25 : 0;
      playerArrow.position.set(player.x, 2.85 + Math.sin(performance.now() * 0.004) * 0.12, player.z);
      playerArrow.visible = player.alive && !player.finished;
    }
  }
  function updateTags() {
    var now = Date.now();
    Object.keys(tagEls).forEach(function (k) {
      var el = tagEls[k];
      if (el._isBubble && el._until && now > el._until) { clearTag(k); }
    });
    function place(person, tagId) {
      if (!person || !person.group) return;
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

  // ---- Minimap click ----
  var mmEl = $('minimap');
  if (mmEl) mmEl.addEventListener('pointerdown', function (e) {
    if (currentRound === 2) return;
    var rect = mmEl.getBoundingClientRect();
    var px = (e.clientX - rect.left) / rect.width * mmEl.width;
    var py = (e.clientY - rect.top) / rect.height * mmEl.height;
    var S = mmEl.width, H = S / 2, SC = H / 100;
    var best = null, bestD = 22;
    TOUR_ISLANDS.forEach(function (poi, idx) {
      var gx = Math.max(13, Math.min(S - 13, H + poi.x * SC));
      var gz = Math.max(13, Math.min(S - 13, H + poi.z * SC));
      var d = Math.hypot(px - gx, py - gz);
      if (d < bestD) { bestD = d; best = idx; }
    });
    if (best == null) {
      var wx = (px - H) / SC, wz = (py - H) / SC, bd = 70;
      TOUR_ISLANDS.forEach(function (poi, idx) {
        var d = Math.hypot(wx - poi.x, wz - poi.z);
        if (d < bd) { bd = d; best = idx; }
      });
    }
    if (best == null) return;
    if (!canExplore() && !tour.active) { toast('Đang trong trận — về đích hoặc bị loại rồi mới đi khám phá đảo được nhé!'); return; }
    if (activateExplore()) flyToPOI(best);
  });

  // ---- Input ----
  document.addEventListener('keydown', function (ev) {
    if (chatTyping()) {
      // đang gõ chat: Enter gửi, Esc đóng, WASD/chữ chỉ vào ô nhập — nhân vật KHÔNG di chuyển
      if (ev.code === 'Enter') { ev.preventDefault(); var ci = $('chat-input'); if (ci) { sendChat(ci.value); ci.value = ''; } }
      else if (ev.code === 'Escape') { ev.preventDefault(); closeChat(true); }
      return;
    }
    if (ev.code === 'Enter') { ev.preventDefault(); ensureAudio(); openChat(); return; }
    if (ev.code === 'Escape') {
      var cp = $('chat-panel');
      if (cp && cp.classList.contains('open')) { closeChat(true); return; }
    }
    if (phase === 'flyover') { beginCountdown(); return; }
    keys[ev.code] = true;
    if (ev.code === 'Space') {
      ev.preventDefault();
      if (window.Rounds && window.Rounds.onSpace && window.Rounds.onSpace()) return; // Vòng kéo co / nhảy bao bố dùng Space làm nút hành động.
      // Multi vòng 2: đứng trước khoảng trống ván đã vỡ thì Space = nhảy qua (jumpGap).
      if (mode === 'multi' && phase === 'round2' && brokenSteps[(myTeam || 0) + ':' + myBridgeStep]) {
        sendWS({ type: 'bridge', action: 'jumpGap' });
        return;
      }
      if (mode === 'single' && (phase === 'round1' || phase === 'round2')) {
        jumpQueued = true;
      } else {
        jumpQueued = true;
        if (player && player.grounded) {
          player.vy = 9; player.grounded = false; player.jumped = true;
          if (mode === 'multi') sendWS({ type: 'pos', x: player.x, z: player.z, jumped: true });
        }
      }
      return;
    }
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(ev.code) >= 0) ev.preventDefault();
    if (spec.active) {
      var modes = ['overview', 'follow', 'shoulder', 'free'];
      if (ev.code === 'Digit1') setSpecMode('overview');
      else if (ev.code === 'Digit2') setSpecMode('follow');
      else if (ev.code === 'Digit3') setSpecMode('shoulder');
      else if (ev.code === 'Digit4') setSpecMode('free');
      else if (ev.code === 'KeyC') setSpecMode(modes[(modes.indexOf(spec.mode) + 1) % 4]);
      else if (ev.code === 'Tab') { cycleSpecTarget(ev.shiftKey ? -1 : 1); ev.preventDefault(); }
      else if (ev.code === 'ArrowRight' && !keys['KeyD']) cycleSpecTarget(1);
      else if (ev.code === 'ArrowLeft' && !keys['KeyA']) cycleSpecTarget(-1);
    }
  });
  document.addEventListener('keyup', function (ev) { keys[ev.code] = false; if (chatTyping()) return; });

  var dragging = false, lastMouse = null, downPos = null, downTime = 0;
  var sceneEl = $('scene');
  if (sceneEl) {
    sceneEl.addEventListener('pointerdown', function (ev) {
      ensureAudio();
      if (phase === 'flyover') { beginCountdown(); return; }
      dragging = true; lastMouse = { x: ev.clientX, y: ev.clientY };
      downPos = { x: ev.clientX, y: ev.clientY }; downTime = Date.now();
    });
    sceneEl.addEventListener('wheel', function (ev) {
      ev.preventDefault();
      if (tour.active) { tour.tDist = Math.max(16, Math.min(300, tour.tDist * (ev.deltaY > 0 ? 1.13 : 0.89))); return; }
      if (spec.active) { specZoom(ev.deltaY > 0 ? 1.12 : 0.9); return; }
      camDist = Math.max(5, Math.min(14, camDist + ev.deltaY * 0.01));
    }, { passive: false });
    sceneEl.addEventListener('dblclick', function (ev) {
      var pick = pickIslandAt(ev.clientX, ev.clientY);
      if (pick && (canExplore() || tour.active)) { goPick(pick); tour.tDist = Math.max(18, tour.tDist * 0.6); }
      else if (tour.active) tour.tDist = Math.max(18, tour.tDist * 0.55);
    });
  }
  window.addEventListener('pointermove', function (ev) {
    if (!dragging || !lastMouse) return;
    var dxm = ev.clientX - lastMouse.x, dym = ev.clientY - lastMouse.y;
    lastMouse = { x: ev.clientX, y: ev.clientY };
    if (tour.active) {
      tour.yaw -= dxm * 0.005;
      tour.pitch = Math.max(0.08, Math.min(1.25, tour.pitch + dym * 0.0038));
      return;
    }
    if (spec.active) {
      if (spec.mode === 'follow') { spec.yaw -= dxm * 0.0052; spec.pitch = Math.max(0.06, Math.min(1.15, spec.pitch + dym * 0.004)); }
      else if (spec.mode === 'overview') { spec.ovYaw -= dxm * 0.004; spec.ovPitch = Math.max(0.35, Math.min(1.35, spec.ovPitch + dym * 0.003)); }
      else if (spec.mode === 'free') { spec.freeYaw -= dxm * 0.0052; spec.freePitch = Math.max(0.06, Math.min(1.25, spec.freePitch + dym * 0.004)); }
      return;
    }
    camYaw -= dxm * 0.0052;
    camPitch += dym * 0.004;
    camPitch = Math.max(0.05, Math.min(1.15, camPitch));
  });
  window.addEventListener('pointerup', function (ev) {
    dragging = false;
    // Click (không kéo) vào đảo trong 3D để bay tới xem chi tiết, hoặc vào ván cầu.
    if (downPos && Math.hypot(ev.clientX - downPos.x, ev.clientY - downPos.y) < 6 && Date.now() - downTime < 400) {
      var pick = pickIslandAt(ev.clientX, ev.clientY);
      if (pick) { goPick(pick); downPos = null; return; }
      pointer = pointer || new THREE.Vector2();
      pointer.x = (ev.clientX / innerWidth) * 2 - 1;
      pointer.y = -(ev.clientY / innerHeight) * 2 + 1;
      raycaster = raycaster || new THREE.Raycaster();
      raycaster.setFromCamera(pointer, camera);
      var hits = raycaster.intersectObjects(scene.children, true);
      for (var i = 0; i < hits.length; i++) {
        if (hits[i].object.userData.bridge) {
          var bd = hits[i].object.userData;
          if (phase === 'round2' && player && player.alive) {
            // Multi: click ván là cách duy nhất để bước — gửi thẳng cho server,
            // server kiểm tra lượt (không phải lượt thì trả lỗi, không tự loại).
            if (bd.team === myTeam && bd.step === myBridgeStep) stepOnBridge(bd.plank);
          }
          break;
        }
      }
    }
    downPos = null;
  });

  // Thiết bị cảm ứng: gắn class 'touch' để CSS chỉ hiện joystick + nút NHẢY
  // trên điện thoại/máy tính bảng (P4-03, cycle 14). isTouchDevice() khai
  // báo dạng function nên gọi được dù định nghĩa ở dưới.
  if (isTouchDevice()) document.body.classList.add('touch');

  // Joystick mobile.
  var joyEl = $('joystick'), knob = $('joy-knob');
  if (joyEl && knob) {
    joyEl.addEventListener('touchstart', function (ev) { joy.active = true; }, { passive: true });
    joyEl.addEventListener('touchmove', function (ev) {
      var t = ev.touches[0], r = joyEl.getBoundingClientRect();
      joy.x = Math.max(-1, Math.min(1, (t.clientX - (r.left + r.width / 2)) / 40));
      joy.y = Math.max(-1, Math.min(1, (t.clientY - (r.top + r.height / 2)) / 40));
      knob.style.left = (35 + joy.x * 25) + 'px'; knob.style.top = (35 + joy.y * 25) + 'px';
    }, { passive: true });
    joyEl.addEventListener('touchend', function () { joy.active = false; joy.x = 0; joy.y = 0; knob.style.left = '35px'; knob.style.top = '35px'; });
  }
  var btnJumpEl = $('btn-jump');
  if (btnJumpEl) btnJumpEl.addEventListener('click', function () {
    if (window.Rounds && window.Rounds.onSpace && window.Rounds.onSpace()) return;
    jumpQueued = true;
    if (!(mode === 'single' && (phase === 'round1' || phase === 'round2')) && player && player.grounded) {
      player.vy = 9; player.grounded = false;
    }
  });

  // ---- Nút bấm ----
  var btnSingle = $('btn-single');
  if (btnSingle) btnSingle.onclick = function () { if (!window.THREE) { toast('Chưa tải được Three.js, kiểm tra mạng rồi tải lại trang.'); return; } startSingle(qcMode ? qcStartRound : 1); };
  var btnMulti = $('btn-multi');
  if (btnMulti) btnMulti.onclick = startMultiUI;
  var btnCreate = $('btn-create');
  if (btnCreate) btnCreate.onclick = function () { connectWS(); setTimeout(function () { sendWS({ type: 'create', name: ($('player-name') && $('player-name').value) || 'Người chơi', qc: qcMode, startRound: qcStartRound, noElim: qcNoElim }); }, 300); };
  var btnJoin = $('btn-join');
  if (btnJoin) btnJoin.onclick = function () {
    var code = ($('room-code') && $('room-code').value || '').trim().toUpperCase();
    if (!code) { toast('Nhập mã phòng trước.'); return; }
    connectWS(); setTimeout(function () { sendWS({ type: 'join', code: code, name: ($('player-name') && $('player-name').value) || 'Người chơi' }); }, 300);
  };
  var btnList = $('btn-list');
  if (btnList) btnList.onclick = function () { connectWS(); setTimeout(function () { sendWS({ type: 'list' }); }, 300); };
  var btnStart = $('btn-start');
  if (btnStart) btnStart.onclick = function () { if (mode === 'multi' || (ws && ws.readyState === WebSocket.OPEN)) sendWS({ type: 'start' }); else if (!window.THREE) toast('Chưa tải được Three.js, kiểm tra mạng rồi tải lại trang.'); else startSingle(qcMode ? qcStartRound : 1); };
  var btnTourLobby = $('btn-tour-lobby');
  // ---- CHẾ ĐỘ QC: bật/tắt panel, ?qc=1, thanh nhảy vòng trong lúc chơi ----
  var qcTgl = $('btnQcToggle');
  if (qcTgl) qcTgl.onclick = function () {
    qcMode = !qcMode;
    var qp = $('qcPanel'); if (qp) qp.classList.toggle('hidden', !qcMode);
    qcTgl.textContent = qcMode ? 'CHẾ ĐỘ QC — ĐANG BẬT (BẤM ĐỂ TẮT)' : 'CHẾ ĐỘ QC — TEST NHANH (CHỈ TEST)';
    renderQcButtons();
  };
  var qcNe = $('qcNoElim');
  if (qcNe) qcNe.onchange = function () { qcNoElim = !!qcNe.checked; };
  try {
    if (new URLSearchParams(location.search).get('qc') === '1') {
      qcMode = true;
      var qp2 = $('qcPanel'); if (qp2) qp2.classList.remove('hidden');
      if (qcTgl) qcTgl.textContent = 'CHẾ ĐỘ QC — ĐANG BẬT (BẤM ĐỂ TẮT)';
    }
  } catch (e) { /* URLSearchParams không có thì thôi, QC vẫn bật được bằng nút */ }
  renderQcButtons(); renderQcBarButtons();
  var qcNext = $('qcNextBtn');
  if (qcNext) qcNext.onclick = function () { qcSkipTo((currentRound || 1) + 1); }; // VÒNG SAU không dừng ở vòng 6
  var qcRe = $('qcRestartBtn');
  if (qcRe) qcRe.onclick = function () { qcSkipTo(currentRound || 1); };
  if (btnTourLobby) btnTourLobby.onclick = function () { ensureAudio(); startAmbient(); focusIsland(1, true); };
  // ---- Onboarding người mới (P4-02, cycle 12 bước 1): 3 bước, tự hiện lần đầu ----
  var OB_KEY = 'hoilang_onboarding_seen';
  var OB_STEPS = [
    { title: 'BƯỚC 1 · TRỐNG ĐÁNH — CHIÊNG LÀ LỆNH',
      body: '<b>VÒNG 1 · TRỐNG HỘI:</b> nghe <b>trống đánh</b> thì chạy thoải mái về sân đình. Nghe <b>chiêng vang</b> thì phải <b>đứng yên tuyệt đối</b> — cử động là bị loại ngay!<br />Chạy qua lũy tre, ao sen, hồ cá để về đích trước khi hết giờ vòng (120 giây). Về đích càng nhanh, vòng sau càng có lợi.' },
    { title: 'BƯỚC 2 · CẦU KHỈ — ĐI THEO LƯỢT',
      body: 'Trước <b>VÒNG 2</b> có bước <b>CHIA TEAM</b>: tối đa 3 đội (Đỏ / Vàng / Xanh lá), mỗi đội một cầu riêng, <b>đi theo lượt</b> — chỉ người dẫn đầu của đội được lên cầu, người sau chờ trên bệ an toàn, không chen lấn nhảy vượt.<br />Mỗi bước có 2 tấm ván: <b>một chắc, một yếu</b>, ngẫu nhiên riêng cho từng cầu mỗi trận. Giẫm ván yếu là rơi xuống biển, <b>bị loại cá nhân</b>. Ván đã vỡ thành khoảng trống — phải <b>nhảy (Space)</b> qua.' },
    { title: 'BƯỚC 3 · CHAT, KHÁN GIẢ, PHÍM TẮT',
      body: '<b>Chat:</b> phím <b>Enter</b> mở ô chat và gửi tin, <b>Esc</b> đóng — tin hiện thành bong bóng trên đầu nhân vật và trong panel CHAT.<br /><b>Bị loại</b> vẫn xem tiếp như khán giả (phím <b>1–4</b> đổi góc camera, <b>Tab</b> đổi người xem) hoặc bấm <b>Du lịch Hạ Long</b> để bay tham quan vịnh trong lúc trận vẫn chạy.<br /><b>Phím tắt:</b> WASD / phím mũi tên để chạy · kéo chuột xoay camera · <b>Space</b> nhảy · điện thoại: joystick ảo bên trái, nút NHẢY bên phải.' }
  ];
  var obStep = 0;
  function obSeen() { try { return localStorage.getItem(OB_KEY) === '1'; } catch (e) { return false; } }
  function obMarkSeen() { try { localStorage.setItem(OB_KEY, '1'); } catch (e) { /* chế độ riêng tư: lần sau hiện lại, không vỡ game */ } }
  function showOnboarding(step) {
    var card = $('onboardingCard'); if (!card) return false;
    obStep = Math.max(0, Math.min(OB_STEPS.length - 1, (typeof step === 'number' ? step : 0)));
    var t = $('obTitle'), b = $('obBody'), dots = $('obDots');
    if (t) t.textContent = OB_STEPS[obStep].title;
    if (b) b.innerHTML = OB_STEPS[obStep].body;
    if (dots) { var ds = dots.children; for (var i = 0; i < ds.length; i++) ds[i].className = (i === obStep ? 'on' : ''); }
    var last = obStep === OB_STEPS.length - 1;
    var prev = $('btnObPrev'), next = $('btnObNext'), done = $('btnObDone');
    if (prev) prev.classList.toggle('hidden', obStep === 0);
    if (next) next.classList.toggle('hidden', last);
    if (done) done.classList.toggle('hidden', !last);
    card.classList.remove('hidden');
    return true;
  }
  function hideOnboarding(markSeen) {
    var card = $('onboardingCard'); if (card) card.classList.add('hidden');
    if (markSeen) obMarkSeen();
  }
  var btnHelp = $('btnHelp');
  if (btnHelp) btnHelp.onclick = function () { showOnboarding(0); };
  var btnObNext = $('btnObNext');
  if (btnObNext) btnObNext.onclick = function () { showOnboarding(obStep + 1); };
  var btnObPrev = $('btnObPrev');
  if (btnObPrev) btnObPrev.onclick = function () { showOnboarding(obStep - 1); };
  var btnObDone = $('btnObDone');
  if (btnObDone) btnObDone.onclick = function () { hideOnboarding(true); };
  var btnObSkip = $('btnObSkip');
  if (btnObSkip) btnObSkip.onclick = function () { hideOnboarding(true); };
  // Tự hiện lần đầu vào sảnh chờ (phase menu, chưa từng xem). Bỏ qua được ngay.
  if (phase === 'menu' && !obSeen()) showOnboarding(0);
  // ---- Gợi ý phím theo từng vòng trong lúc chơi (P4-02 bước 2, cycle 13) ----
  // Dải nhỏ dưới HUD, hiện lúc bắt đầu mỗi vòng, tự ẩn sau 12 giây. Chỉ
  // hiện cho người đang chơi (player.alive) — khán giả vào giữa trận hoặc
  // người đã chết không thấy gợi ý phím vì không điều khiển nhân vật nữa.
  // Mỗi vòng chỉ có 1 câu ngắn: phím chính + luật quyết định của vòng đó.
  var ROUND_HINTS = {
    'trong-hoi': { keys: '<b>WASD / ←↑↓→</b> chạy về sân đình · <b>Trống</b> đánh thì chạy, <b>chiêng</b> vang thì <b>ĐỨNG YÊN</b>!',
      touch: '<b>Joystick</b> chạy về sân đình · <b>Trống</b> đánh thì chạy, <b>chiêng</b> vang thì <b>ĐỨNG YÊN</b>!' },
    'cau-khi': { keys: '<b>WASD</b> đi theo lượt của đội · <b>Space</b> nhảy qua khoảng trống · Ván yếu sẽ vỡ!',
      touch: '<b>Joystick</b> đi theo lượt của đội · nút <b>NHẢY</b> qua khoảng trống · Ván yếu sẽ vỡ!' },
    'keo-co': { keys: '<b>Space</b> (hoặc nút KÉO) đúng lúc vòng tròn sáng · Nghe nhịp trống!',
      touch: 'Bấm nút <b>KÉO</b> đúng lúc vòng tròn sáng · Nghe nhịp trống!' },
    'to-he': { keys: '<b>Chuột</b> vẽ theo mẫu · càng giống càng cao điểm · bấm <b>NỘP BÀI</b> khi xong',
      touch: '<b>Chạm + kéo</b> vẽ theo mẫu · càng giống càng cao điểm · bấm <b>NỘP BÀI</b> khi xong' },
    'bit-mat': { keys: '<b>WASD</b> chạy theo mũi tên · Người tìm chạm vào dê · Dê chạy trốn!',
      touch: '<b>Joystick</b> chạy theo mũi tên · Người tìm chạm vào dê · Dê chạy trốn!' },
    'o-an-quan': { keys: 'Bấm <b>ô bên mình (viền vàng)</b> để rải quân · Không bấm ô quan',
      touch: 'Bấm <b>ô bên mình (viền vàng)</b> để rải quân · Không bấm ô quan' },
    'nhay-bao-bo': { keys: '<b>Space</b> (hoặc nút NHẢY) khi vạch nằm trong ô sáng giữa thanh',
      touch: 'Bấm nút <b>NHẢY</b> khi vạch nằm trong ô sáng giữa thanh' },
    'rong-ran': { keys: '<b>WASD</b> chạy · <b>Chạm cờ</b> rồi chạy về vạch xuất phát!',
      touch: '<b>Joystick</b> chạy · <b>Chạm cờ</b> rồi chạy về vạch xuất phát!' }
  };
  var ROUND_HINT_MS = 12000;
  var roundHintTimer = null;
  function isTouchDevice() { try { return ('ontouchstart' in window) || (navigator && navigator.maxTouchPoints > 0); } catch (e) { return false; } }
  function roundHintFor(game) {
    var h = ROUND_HINTS[game]; if (!h) return '';
    return isTouchDevice() ? h.touch : h.keys;
  }
  function showRoundHint(game) {
    var txt = roundHintFor(game); if (!txt) return false;
    // Khán giả / người đã chết không điều khiển nhân vật — không hiện gợi ý.
    if (!player || player.alive === false) return false;
    var el = $('roundHint'), t = $('roundHintText');
    if (!el || !t) return false;
    t.innerHTML = txt;
    el.classList.remove('hidden');
    if (roundHintTimer) clearTimeout(roundHintTimer);
    roundHintTimer = setTimeout(hideRoundHint, ROUND_HINT_MS);
    return true;
  }
  function hideRoundHint() {
    if (roundHintTimer) { clearTimeout(roundHintTimer); roundHintTimer = null; }
    var el = $('roundHint'); if (el) el.classList.add('hidden');
  }
  var btnHintClose = $('roundHintClose');
  if (btnHintClose) btnHintClose.onclick = function () { hideRoundHint(); };
  var btnTour = $('btn-tour');
  if (btnTour) btnTour.onclick = function () { ensureAudio(); startAmbient(); setSpectatorBanner(false); focusIsland(1, true); };
  var btnCloseTour = $('btn-close-tour');
  if (btnCloseTour) btnCloseTour.onclick = backToMatch;
  var btnPanorama = $('btn-panorama');
  if (btnPanorama) btnPanorama.onclick = backToPanorama;
  var btnBackMatch = $('btn-back-match');
  if (btnBackMatch) btnBackMatch.onclick = backToMatch;
  var btnReplay = $('btn-replay');
  if (btnReplay) btnReplay.onclick = function () {
    if (window.Rounds) window.Rounds.endRound();
    hideInterstitial();
    if (mode === 'multi') sendWS({ type: 'replay' });
    exitTour(false); exitSpectator();
    var sp2 = $('spectator'); if (sp2) sp2.classList.add('hidden');
    var ts = $('team-screen'); if (ts) ts.classList.add('hidden');
    var m = $('menu'); if (m) m.classList.remove('hidden');
    showHUD(false);
    if (player) { scene.remove(player.group); player = null; }
    bots.forEach(function (b) { scene.remove(b.group); if (b.teamRing) scene.remove(b.teamRing); });
    bots = [];
    Object.keys(remotePlayers).forEach(function (k) { scene.remove(remotePlayers[k].group); });
    remotePlayers = {};
    fogOverride = null; applyFogPreset('yard');
    if (playerRing) playerRing.material.color.setHex(0xffd34d);
    phase = 'menu';
  };
  var btnToBridge = $('btn-to-bridge');
  if (btnToBridge) btnToBridge.onclick = function () {
    clearTimeout(teamAutoTimer);
    var ts = $('team-screen'); if (ts) ts.classList.add('hidden');
    // Nút này được showRanking dùng lại làm "Chơi lại từ vòng 1": lúc đó phase
    // đã là 'finished' nên phải đi qua luồng chơi lại, không thì bấm không có tác dụng.
    if (phase === 'finished') { var br = $('btn-replay'); if (br) br.click(); return; }
    if (mode === 'single' && phase === 'team') beginRound2Play();
  };
  document.querySelectorAll('.spec-view, .specBtn[data-specmode]').forEach(function (b) {
    b.onclick = function () { setSpecMode(b.dataset.view || b.dataset.specmode); };
  });
  var btnPrevPerson = $('btn-prev-person');
  if (btnPrevPerson) btnPrevPerson.onclick = function () { cycleSpecTarget(-1); };
  var btnNextPerson = $('btn-next-person');
  if (btnNextPerson) btnNextPerson.onclick = function () { cycleSpecTarget(1); };
  var btnZoomOut = $('btn-zoom-out');
  if (btnZoomOut) btnZoomOut.onclick = function () { if (spec.active) specZoom(1.22); else camDist = Math.min(14, camDist + 2); };
  var btnZoomIn = $('btn-zoom-in');
  if (btnZoomIn) btnZoomIn.onclick = function () { if (spec.active) specZoom(0.82); else camDist = Math.max(5, camDist - 2); };
  var btnChatOpen = $('btn-chat-open');
  if (btnChatOpen) btnChatOpen.onclick = function () { ensureAudio(); toggleChat(); };
  var btnCloseChat = $('btn-close-chat');
  if (btnCloseChat) btnCloseChat.onclick = function () { closeChat(true); };
  var btnHideBubbles = $('btn-hide-bubbles');
  if (btnHideBubbles) btnHideBubbles.onclick = function () {
    hideBubbles = !hideBubbles;
    btnHideBubbles.textContent = hideBubbles ? 'HIỆN BONG BÓNG' : 'ẨN BONG BÓNG';
    if (hideBubbles) {
      for (var i = chatBubbles.length - 1; i >= 0; i--) {
        if (chatBubbles[i].el.parentNode) chatBubbles[i].el.parentNode.removeChild(chatBubbles[i].el);
      }
      chatBubbles = [];
      Object.keys(tagEls).forEach(function (k) { if (tagEls[k]._isBubble) clearTag(k); });
    }
  };
  var btnSendChat = $('btn-send-chat');
  if (btnSendChat) btnSendChat.onclick = function () { var ci = $('chat-input'); if (ci) { sendChat(ci.value); ci.value = ''; } };
  var chatInputEl = $('chat-input');
  if (chatInputEl) chatInputEl.addEventListener('keydown', function (ev) {
    ev.stopPropagation();
    if (ev.key === 'Enter') { sendChat(chatInputEl.value); chatInputEl.value = ''; }
    if (ev.key === 'Escape') { closeChat(); }
  });
  document.querySelectorAll('.quick, .quickBtn').forEach(function (b) {
    b.onclick = function () { sendChat(b.dataset.text || b.dataset.quick); };
  });

  // ---- Cửa hàng / Hội Xu (shop.js do workstream khác tạo; chưa có thì báo nhẹ) ----
  [['btn-shop', 'shop-panel'], ['btn-pass', 'pass-panel'], ['btn-tournament', 'tournament-panel'], ['btn-gift', 'gift-panel']].forEach(function (pair) {
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

  // ---- Luồng nhiều vòng (số vòng không giới hạn) ----
  function roundEndStats() {
    var alive = allPersons().filter(function (p) { return p.alive; });
    var elim = roundStartAlive.filter(function (n) {
      return !alive.some(function (p) { return p.name === n; });
    });
    return { survivors: alive.length, eliminated: elim };
  }
  // Vòng 3–6 chơi trong sân làng (sim đặt đạo cụ ở z 0..35) — sau vòng 2
  // mọi người đang ở cuối cầu (z≈-95..-131) nên phải đưa đội hình về sân,
  // không thì sim ở một nơi, người chơi ở một nơi. Chơi đơn: game.js là
  // nguồn chuẩn nên dịch luôn. Nhiều người: server dịch ở startRound, client
  // dịch theo vị trí server gửi kèm tin phase (xem handler phase round3-6).
  function resetYardPositions() {
    if (player) {
      player.x = 0; player.z = START_Z; player.y = 0; player.vy = 0;
      player.group.position.set(0, 0, START_Z);
    }
    bots.forEach(function (b) {
      if (!b.alive) return;
      b.x = -13 + Math.random() * 26; b.z = 28 + Math.random() * 10; b.y = 0;
      b.group.position.set(b.x, 0, b.z);
    });
  }
  function startRoundCommon(round, game, name, timeLimit, seed, target, isFinal) {
    currentRound = round;
    currentRoundGame = game;
    currentRoundName = name || '';
    roundTarget = target || 0;
    roundIsFinal = !!isFinal;
    roundTimeLimit = timeLimit || 0;
    roundEndsAt = roundTimeLimit ? Date.now() + roundTimeLimit * 1000 : 0;
    roundStartAlive = allPersons().filter(function (p) { return p.alive; }).map(function (p) { return p.name; });
    updateSingleR1._r1TimeoutDone = false;
    phase = 'round' + round;
    // Fog vòng mới: xoá mọi override của sim vòng trước rồi áp preset theo vòng.
    fogOverride = null;
    applyFogPreset(fogPresetForRound(round));
    if (round >= 3) {
      if (mode === 'single') resetYardPositions();
    }
    var hr = $('hud-round'); if (hr) hr.textContent = 'VÒNG ' + round + ' — ' + (name || '');
    if (hr) hr.title = roundTarget ? ('Mục tiêu vòng này: giữ ~' + roundTarget + ' người' + (roundIsFinal ? ' · CHUNG KẾT' : '')) : '';
    setHudDrum(name || currentRoundName || '');
    hideInterstitial();
    // An toàn: màn CHIA TEAM và dải team không được nấn ná sang vòng chơi —
    // bắt đầu vòng nào thì mọi banner của vòng trước phải biến mất hẳn.
    var tc = $('team-screen'); if (tc) tc.classList.add('hidden');
    if (round !== 2) hideTeamPanel();
    if (round === 1) {
      matchStartAt = Date.now();
      finishCount = 0;
      if (mode === 'single') startPhase('drum');
    }
    if (round === 2) {
      brokenSteps = {};
    }
    if (round >= 3 && window.Rounds) window.Rounds.startRound(round, game, { timeLimit: roundTimeLimit, local: mode === 'single', seed: seed, isFinal: roundIsFinal });
    syncQcBar();
    showRoundHint(game); // gợi ý phím theo vòng (P4-02 bước 2)
  }
  function onRoundEnd(msg) {
    hideRoundHint(); // hết vòng thì gợi ý phím cũng hết (P4-02 bước 2)
    var st = roundEndStats();
    var survivors = (msg.survivors !== undefined && msg.survivors !== null) ? msg.survivors : st.survivors;
    // Server gửi eliminated là [id]; đổi sang tên để hiển thị.
    var elimNames = (msg.eliminated || []).map(function (id) {
      var pp = allPersons().find(function (x) { return x.id === id; });
      return pp ? pp.name : id;
    });
    showInterstitial(msg.round, survivors, elimNames.length ? elimNames : st.eliminated,
      msg.nextName || null);
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
        rp._posAt = Date.now(); // tick 15Hz, AOI 40 — vị trí tươi
        rp.group.position.set(info.x, rp.y || 0, info.z);
      } else {
        syncRemotePlayers([info]);
      }
    });
    updateAliveHUD();
  }
  function showInterstitial(round, survivors, eliminated, nextName) {
    var el = $('interstitial'); if (!el) return;
    el.innerHTML = '<h2>HẾT VÒNG ' + round + ' — ' + (currentRoundName || '') + '</h2>' +
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
    // Vòng tiếp theo bốc theo số người còn sống (không giới hạn ở vòng 6);
    // nếu chỉ còn 1 người hoặc vừa xong chung kết thì trận kết thúc.
    var nextName = (survivors > 1 && !roundIsFinal) ? localNameForRound(round + 1, survivors) : null;
    showInterstitial(round, survivors, eliminated, nextName);
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
      if (survivors > 1 && !roundIsFinal) { startRoundLocal(round + 1); return; }
      showRanking(allPersons().filter(function (p) { return p.alive; })
        .map(function (p) { return { name: p.name, time: Date.now() - matchStartAt }; }));
    }, 3000);
  }
  function startRoundLocal(round) {
    // Trò của vòng bốc theo số người còn sống lúc bắt đầu vòng (khớp server):
    // <= 6 người thì là chung kết Rồng Rắn, còn không thì bốc theo chu kỳ kho.
    var aliveNow = allPersons().filter(function (p) { return p.alive; }).length;
    var game = localGameForRound(round, aliveNow);
    var name = localNameForRound(round, aliveNow);
    var isFinal = game === 'rong-ran';
    currentRound = round; currentRoundGame = game; currentRoundName = name;
    roundIsFinal = isFinal;
    roundTarget = isFinal ? 1 : Math.max(1, Math.min(aliveNow - 1, Math.round(aliveNow * QC_CURVE_RATIOS[(round - 1) % QC_CURVE_RATIOS.length])));
    roundTimeLimit = ROUND_TIME_LIMITS[game] || 90; roundEndsAt = Date.now() + roundTimeLimit * 1000;
    roundStartAlive = allPersons().filter(function (p) { return p.alive; }).map(function (p) { return p.name; });
    phase = 'round' + round;
    resetYardPositions();
    fogOverride = null; applyFogPreset(fogPresetForRound(round));
    var hr = $('hud-round'); if (hr) hr.textContent = 'VÒNG ' + round + ' — ' + name;
    if (hr) hr.title = 'Mục tiêu vòng này: giữ ~' + roundTarget + ' người' + (isFinal ? ' · CHUNG KẾT' : '');
    setHudDrum(name);
    hideInterstitial();
    if (window.Rounds) window.Rounds.startRound(round, game, { timeLimit: roundTimeLimit, local: true, seed: Date.now(), isFinal: isFinal });
    showRoundHint(game); // gợi ý phím theo vòng (P4-02 bước 2)
  }
  // Đồng hồ đếm ngược HIỂN THỊ TRÊN HUD (ô ĐẾM NGƯỢC, cạnh ô VÒNG):
  // mọi vòng đều có đếm ngược. Vòng 1, 3–6: đếm ngược cả vòng (deadline
  // server ở multi, timer local ở chơi đơn). Vòng 2: đếm ngược THEO LƯỢT
  // 30 giây của người đang đi cầu — tới lượt mình thì ô này đếm 30 giây
  // của mình, lúc chờ thì đếm 30 giây của người dẫn đầu đội mình (multi)
  // hoặc của người đang đi (chơi đơn). Dưới 10 giây thì đỏ.
  function updateRoundTimer() {
    var wrap = $('round-timer-wrap'), fill = $('round-timer-fill'), txt = $('hud-round-time');
    var cd = $('hud-countdown');
    var remain = null, total = 0, isTurn = false;
    if (currentRound === 2) {
      if (mode === 'single') {
        if (r2Turn.endsAt) { remain = Math.max(0, (r2Turn.endsAt - Date.now()) / 1000); total = R2_TURN_LIMIT_S; isTurn = true; }
      } else {
        if (teamLeaders[myTeam] === myId && teamTurnEndsAt[myTeam]) {
          remain = Math.max(0, (teamTurnEndsAt[myTeam] - Date.now()) / 1000); total = R2_TURN_LIMIT_S; isTurn = true;
        } else if (teamTurnEndsAt[myTeam]) {
          remain = Math.max(0, (teamTurnEndsAt[myTeam] - Date.now()) / 1000); total = R2_TURN_LIMIT_S; isTurn = true;
        } else if (roundEndsAt) { remain = Math.max(0, (roundEndsAt - Date.now()) / 1000); total = roundTimeLimit; }
      }
    } else if (roundEndsAt && phase.indexOf('round') === 0) {
      remain = Math.max(0, (roundEndsAt - Date.now()) / 1000); total = roundTimeLimit;
    }
    if (cd) {
      cd.textContent = remain === null ? '—' : fmtTime(remain);
      cd.classList.toggle('urgent', remain !== null && remain <= 10);
      cd.title = isTurn ? 'Đếm ngược lượt qua cầu (30 giây/lượt)' : 'Đếm ngược cả vòng';
    }
    if (!wrap || !fill || !txt) return;
    if (roundEndsAt && phase.indexOf('round') === 0) {
      var rRemain = Math.max(0, (roundEndsAt - Date.now()) / 1000);
      wrap.classList.remove('hidden'); txt.classList.remove('hidden');
      txt.textContent = 'Còn ' + fmtTime(rRemain) + (currentRound === 1 ? ' — về đích trước khi hết giờ!' : ' — ' + (currentRoundName || '')) + (roundTarget ? ' · mục tiêu ~' + roundTarget + ' người' : '');
      fill.style.width = (roundTimeLimit ? Math.round(rRemain / roundTimeLimit * 100) : 0) + '%';
      txt.classList.toggle('urgent', rRemain <= 30);
      fill.classList.toggle('urgent', rRemain <= 30);
    } else {
      wrap.classList.add('hidden'); txt.classList.add('hidden');
    }
    // Vòng 2 multi: dải team (kèm đếm ngược lượt) cần tick theo từng khung
    // hình — updateMultiQueuePanel tự giới hạn 250ms nên gọi mỗi frame vẫn rẻ.
    if (mode === 'multi' && phase === 'round2') updateMultiQueuePanel();
    syncQcBar();
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
    get camera() { return camera; },
    get renderer() { return renderer; },
    get matchStartAt() { return matchStartAt; },
    get matchTimeLimit() { return matchTimeLimit; },
    matchTimeLeft: matchTimeLeft, endMatchOnTimeoutIfNeeded: endMatchOnTimeoutIfNeeded,
    allPersons: allPersons, eliminate: eliminate, sendWS: sendWS, toast: toast,
    renderLeaderboard: renderLeaderboard,
    get lastLeaderboard() { return lastLeaderboard; },
    setTag: setTag, clearTag: clearTag, updateAliveHUD: updateAliveHUD,
    teamColorHex: teamColorHex, TEAM_COLORS: TEAM_COLORS, TEAM_NAMES: TEAM_NAMES,
    localRoundEnd: localRoundEnd, showInterstitial: showInterstitial, hideInterstitial: hideInterstitial,
    showRanking: showRanking, setTeamCardMode: setTeamCardMode,
    showOnboarding: showOnboarding, hideOnboarding: hideOnboarding, onboardingSeen: obSeen,
    get onboardingStep() { return obStep; },
    showRoundHint: showRoundHint, hideRoundHint: hideRoundHint, roundHintFor: roundHintFor,
    get roundHintMs() { return ROUND_HINT_MS; },
    specLeader: specLeader, specTargets: specTargets, buildSpectatorList: buildSpectatorList,
    enterSpectator: enterSpectator, setSpecTarget: setSpecTarget, watchedPerson: watchedPerson,
    updateWatchedName: updateWatchedName,
    get spec() { return spec; },
    get watchedId() { return watchedId; },
    get spectatorList() { return spectatorList; },
    setHudDrum: setHudDrum, setFogOverride: setFogOverride, clearFogOverride: clearFogOverride,
    get fogOverride() { return fogOverride; },
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

  // ---- Vòng lặp game ----
  var lastTime = performance.now();
  function animate(now) {
    requestAnimationFrame(animate);
    syncBodyMode();
    var dt = Math.min(0.05, (now - lastTime) / 1000); lastTime = now;
    var t = now / 1000;
    // tre đung đưa trong gió chiều
    for (var sw = 0; sw < swayers.length; sw++) {
      var swy = swayers[sw];
      swy.g.rotation.z = Math.sin(t * 0.9 + swy.phase) * swy.amp;
      swy.g.rotation.x = Math.cos(t * 0.7 + swy.phase) * swy.amp * 0.7;
    }
    // sự sống quanh đảo: chim bay, bướm, cá nhảy, cua, khỉ, đèn dấu, tre đảo đung đưa
    updateWildlife(dt, t);
    // cá bơi vòng trong hồ
    for (var fs = 0; fs < fishes.length; fs++) {
      var fsh = fishes[fs];
      fsh.a += dt * fsh.sp * fsh.dir;
      fsh.h.position.set(FISHPOND.x + Math.cos(fsh.a) * fsh.r, 0.14, FISHPOND.z + Math.sin(fsh.a) * fsh.r);
      fsh.h.rotation.y = -fsh.a - (fsh.dir > 0 ? 0 : Math.PI);
    }
    // thuyền bập bềnh trên sóng
    for (var bt = 0; bt < boats.length; bt++) {
      var boa = boats[bt];
      boa.g.position.y = boa.baseY + Math.sin(t * 0.9 + boa.phase) * 0.09;
      boa.g.rotation.z = Math.sin(t * 0.7 + boa.phase) * 0.03;
    }
    // bọt sóng khối dập dềnh quanh bờ
    for (var wv = 0; wv < waves.length; wv++) {
      waves[wv].m.position.y = -1.14 + Math.sin(t * 1.4 + waves[wv].ph) * 0.09;
    }
    // mặt biển lăn tăn nhẹ
    if (seaMat) seaMat.color.setHSL(0.55, 0.62, 0.4 + Math.sin(t * 0.5) * 0.02);
    // thuyền buồm xa bập bềnh + dải sương luôn hướng về camera
    for (var fb2 = 0; fb2 < farBoats.length; fb2++) {
      farBoats[fb2].g.position.y = farBoats[fb2].baseY + Math.sin(t * 0.7 + farBoats[fb2].phase) * 0.14;
      farBoats[fb2].g.rotation.z = Math.sin(t * 0.55 + farBoats[fb2].phase) * 0.025;
    }
    for (var ib = 0; ib < isleBobbers.length; ib++) {
      isleBobbers[ib].g.position.y = isleBobbers[ib].baseY + Math.sin(t * 0.8 + isleBobbers[ib].phase) * 0.1;
      isleBobbers[ib].g.rotation.z = Math.sin(t * 0.6 + isleBobbers[ib].phase) * 0.03;
    }
    for (var mp = 0; mp < mistPlanes.length; mp++) {
      mistPlanes[mp].rotation.y = Math.atan2(camera.position.x - mistPlanes[mp].position.x, camera.position.z - mistPlanes[mp].position.z);
    }
    updateFallingPlanks(dt);
    // âm nền sóng/gió/chim theo điểm nhìn hiện tại
    var ambFx = player ? player.x : 0, ambFz = player ? player.z : 0;
    if (tour.active) { ambFx = tour.center.x; ambFz = tour.center.z; }
    else if (spec.active && spec.target) { ambFx = spec.target.x; ambFz = spec.target.z; }
    updateAmbient(dt, ambFx, ambFz, t);
    // chat: bot gửi câu mẫu thưa thớt + bong bóng chat bám theo đầu nhân vật
    updateChatBots(dt);
    updateBubbles();
    // đèn lồng nhấp nháy ấm
    for (var li2 = 0; li2 < lanterns.length; li2++) {
      lanterns[li2].material.emissiveIntensity = 0.45 + Math.sin(t * 2.2 + li2 * 1.7) * 0.14;
    }
    // cờ bay
    for (var fi2 = 0; fi2 < flags.length; fi2++) {
      flags[fi2].rotation.y = Math.sin(t * 2.6 + fi2 * 1.3) * 0.28;
      flags[fi2].scale.x = 1 + Math.sin(t * 3.4 + fi2) * 0.06;
    }
    // Ông Trùm Hội gõ nhịp khi trống đánh
    if (phase === 'round1' && drumState === 'drum' && player && player.alive) {
      hostBeatPhase += dt * 9;
      if (hostArmL) {
        hostArmL.rotation.x = -0.7 + Math.sin(hostBeatPhase) * 0.75;
        hostArmR.rotation.x = -0.7 + Math.cos(hostBeatPhase) * 0.75;
      }
      var ds = 1 + Math.max(0, Math.sin(hostBeatPhase)) * 0.03;
      if (drumGroup) drumGroup.scale.set(ds, 1, ds);
    } else {
      if (hostArmL) { hostArmL.rotation.x *= 0.92; hostArmR.rotation.x *= 0.92; }
      if (drumGroup) drumGroup.scale.set(1, 1, 1);
    }

    // Vòng 3-6 chạy kể cả khi người chơi đã bị loại và đang xem (như bản cũ).
    if (window.Rounds) window.Rounds.update(dt);
    if (phase === 'flyover') {
      // Bay tổng quan ~3.4 giây: quét cung cao quanh đảo, nhìn bao quát biển + làng + đường chạy
      flyT += dt;
      var ft = Math.min(1, flyT / 3.4);
      var fe = ft * ft * (3 - 2 * ft);
      var fang = -0.85 + fe * 1.15;
      var frad = (128 - fe * 26) * (camera.aspect < 1 ? Math.min(1.6, 1 / Math.sqrt(camera.aspect)) : 1);
      camera.position.set(Math.sin(fang) * frad, 54 - fe * 20, Math.cos(fang) * frad * 0.92 + 6);
      camera.lookAt(0, 1, -4);
      for (var fb = 0; fb < bots.length; fb += 2) animateFigure(bots[fb].group, 0, dt, 0);
      if (playerRing && player) {
        playerRing.position.set(player.x, 0.04, player.z);
        playerArrow.position.set(player.x, 2.85 + Math.sin(t * 3) * 0.12, player.z);
      }
      if (ft >= 1) beginCountdown();
    } else if (phase === 'countdown') {
      countdownT += dt;
      var step = Math.floor(countdownT / 0.85);
      if (step !== countdownStep) {
        countdownStep = step;
        if (step === 1) { countdownEl.textContent = '3'; drumHit(0.5); }
        else if (step === 2) { countdownEl.textContent = '2'; drumHit(0.5); }
        else if (step === 3) { countdownEl.textContent = '1'; drumHit(0.5); }
        else if (step >= 4) {
          countdownEl.textContent = 'CHẠY!';
          drumHit(1);
          startRoundCommon(1, 'trong-hoi', 'Trống Hội', 120);
          setTimeout(function () { if (countdownEl) countdownEl.style.display = 'none'; }, 450);
        }
      }
    } else if (phase === 'round1') {
      if (mode === 'single') updateSingleR1(dt);
      else updatePlayerMovement(dt);
      updateHUD();
    } else if (phase === 'round2') {
      if (mode === 'single') {
        updatePlayerR2(dt);
        updateBotsR2(dt);
        checkR2EndSingle();
        updateTeamPanel();
        updateLeaderArrows();
      } else {
        updatePlayerMovement(dt);
      }
      updateHUD();
    } else if (phase === 'spectator') {
      // Trận vẫn chạy nền cho khán giả xem (chơi đơn).
      if (mode === 'single' && currentRound === 1) updateSingleR1(dt);
      if (mode === 'single' && currentRound === 2) {
        updatePlayerR2(dt);
        updateBotsR2(dt);
        checkR2EndSingle();
        updateLeaderArrows();
      }
      updateHUD();
    } else if (phase.indexOf('round') === 0) {
      updatePlayerMovement(dt);
      updateHUD();
    } else if (phase === 'menu') {
      // menu: camera sau lưng đoàn người, nhìn xuôi đường chạy về phía đình
      // (đang khám phá đảo từ sảnh thì để hệ camera du lịch điều khiển)
      if (!tour.active) {
        var mt = t * 0.07;
        camera.position.set(Math.sin(mt) * 9, 5.6, 58);
        camera.lookAt(0, 1.6, 26);
      }
      for (var mi = 0; mi < bots.length; mi += 3) animateFigure(bots[mi].group, 0, dt, bots[mi].group.position.y);
      if (playerRing && player) {
        playerRing.position.set(player.x, 0.04, player.z);
        playerArrow.position.set(player.x, 2.85 + Math.sin(t * 3) * 0.12, player.z);
      }
    } else {
      // interstitial / team / finished: bot còn lại đứng yên, người chơi ăn mừng nếu đã về đích
      if (mode === 'single' && currentRound === 1) {
        for (var bi3 = 0; bi3 < bots.length; bi3++) if (bots[bi3].group.visible) animateFigure(bots[bi3].group, 0, dt, 0);
        if (player) animateFigure(player.group, 0, dt, 0);
      }
    }
    if (introBlend > 0) introBlend -= dt;
    if ((phase !== 'menu' && phase !== 'flyover') || tour.active) updateCamera(dt);
    minimapTimer += dt;
    if (minimapTimer > 0.12) { minimapTimer = 0; drawMinimap(); updateAliveHUD(); }
    updateRoundTimer();
    updateTags();
    renderer.render(scene, camera);
  }
  window.addEventListener('resize', function () {
    if (!camera || !renderer) return;
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  if (window.THREE) {
    buildWorld();
    buildPoiProxies();
    drawMinimap();
    addChatSystem('Chào mừng đến phòng chat! Nhấn Enter để chat — tin nhắn hiện trên đầu nhân vật 5 giây và lưu ở panel này. Các bạn bot trong bản chơi đơn luôn ghi rõ "· BOT" ở tên.');
    animate(performance.now());
  } else {
    document.addEventListener('DOMContentLoaded', function () {
      if (window.THREE) {
        buildWorld();
        buildPoiProxies();
        drawMinimap();
        addChatSystem('Chào mừng đến phòng chat! Nhấn Enter để chat — tin nhắn hiện trên đầu nhân vật 5 giây và lưu ở panel này. Các bạn bot trong bản chơi đơn luôn ghi rõ "· BOT" ở tên.');
        animate(performance.now());
      }
    });
  }
})();
