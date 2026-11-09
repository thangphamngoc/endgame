/* local-economy.js — Kinh tế CHƠI ĐƠN (ví local, lưu trên trình duyệt).
 *
 * Quyết định PO (ĐÃ QUYẾT, BRD §10.2 — cycle 28, backlog #19 bước 1):
 * - Chơi đơn không có server nên ví + đồ đã mua lưu ở localStorage
 *   (`hoilang_local_profile_v1`) trên máy người chơi, KHÔNG đồng bộ lên
 *   server. Lý do: chống cày xu chơi đơn (bot dễ) rồi mang sang multi.
 * - Mức thưởng Y HỆT multi (server/economy.js): +10 xu/vòng sống sót,
 *   thắng trận lấy CẢ HŨ VÀNG (khởi đầu 100 + 10 xu mỗi người bị loại,
 *   bot bị loại cũng cộng — #39 bước 1, cycle 41) thay cho +50 xu cố định
 *   trước đây; +100 XP/vòng, +500 XP/thắng, 500 XP/cấp, tối đa cấp 20; lên cấp tự nhận thưởng
 *   track MIỄN PHÍ (track trả phí không mở ở chơi đơn vì tier luôn free).
 * - Chỉ shop mua/trang bị chạy local. Pass hiển thị cấp/XP local;
 *   giải đấu / cổ vũ / tặng quà / vé tour cần người chơi khác nên chỉ có
 *   ở multi — bấm ở chơi đơn thì báo rõ, không gửi WS vô ích.
 * - Trận QC chơi đơn KHÔNG thưởng (game.js chặn ở localRoundEnd, như FR-46).
 * - Lì xì Tết (cycle 35, backlog #16 bước 2a — P4-06): khi mùa Tết đang
 *   chạy (`window.__season.id === 'tet'`, seasonal.js), thưởng vòng/thắng
 *   cộng thêm lì xì +8 xu/vòng sống sót, +20 xu khi thắng trận. Chỉ cộng
 *   XU, không cộng XP (tiến độ Pass không đổi); trận QC không lì xì vì
 *   game.js chặn toàn bộ thưởng ở localRoundEnd. Số 8/20: 8 là số phát,
 *   20 là lì xì thắng — nhỏ so với giá shop (60–300 xu) nên không phá
 *   cân bằng; chỉ là niềm vui trong 12 ngày Tết. Chơi nhiều người đã có
 *   lì xì cùng mức từ cycle 36 (bước 2b — server/economy.js, server tự
 *   tính mùa theo ngày ICT).
 * - Chưa có ở bước 1: nhiệm vụ ngày chơi đơn, đồng bộ ví khi đổi máy.
 *   (Bước 2, cycle 45, 2026-11-08 — backlog #19: nhiệm vụ ngày chơi đơn
 *   đã làm, xem QUESTS bên dưới. Bước 3, cycle 52, 2026-11-09 — backlog
 *   #19: chuyển ví sang máy khác bằng MÃ SAO LƯU xuất/nhập thủ công,
 *   xem exportWalletCode/importWalletCode bên dưới; KHÔNG phải đồng bộ
 *   tự động lên server — quyết định chống cày xu cycle 28 giữ nguyên.)
 * - Nhiệm vụ ngày chơi đơn (cycle 45, #19 bước 2) — Y HỆT server/economy.js:
 *   3 nhiệm vụ (chơi 1 trận / sống sót 2 vòng / gửi 5 chat), mỗi nhiệm vụ
 *   +20 xu, nhận 1 lần/ngày; tiến độ reset khi sang ngày mới (ngày UTC như
 *   server). Tiến độ đếm ở game.js: startSingle -> recordMatchPlayed,
 *   awardRoundSurvived -> surviveRounds, sendChat (trận đơn) -> recordChatSent.
 *   Trận QC không đếm (game.js chặn như FR-46). Panel Cửa hàng (shop.js)
 *   vẽ mục "Nhiệm vụ ngày" để xem tiến độ + nhận thưởng — mục này hiện cả
 *   ở multi vì server đã có sẵn action 'quests'/'claimQuest' từ trước,
 *   trước đây client chưa vẽ UI nên không nhận được.
 *   Còn nợ Sudo test tay: mua/trang bị thật ở chơi đơn, ví giữ sau khi
 *   tải lại trang, cảm giác số dư khi chuyển chơi đơn ↔ nhiều người.
 *   + Cảm giác lì xì Tết trên trình duyệt thật (toast + ví HUD tăng).
 *
 * Cách nối: shop.js gọi `HoiLocalEconomy.handle(msg)` TRƯỚC khi gửi WS;
 * handle trả 'handled' (đã xử lý local), 'server-only' (chỉ có ở multi)
 * hoặc false (để WS/server xử lý — vd đang ở multi). game.js gọi
 * `awardRoundSurvived()` / `awardWin()` ở `localRoundEnd`.
 * Module này KHÔNG mở WebSocket, KHÔNG chạm server.
 */
(function () {
  'use strict';

  var KEY = 'hoilang_local_profile_v1';
  var XU_PER_ROUND = 10, XU_PER_WIN = 50;
  var XP_PER_ROUND = 100, XP_PER_WIN = 500;
  var XP_PER_LEVEL = 500, MAX_LEVEL = 20;
  // Lì xì Tết (cycle 35, #16 bước 2a): chỉ khi mùa Tết đang chạy.
  var LIXI_XU_PER_ROUND = 8, LIXI_XU_PER_WIN = 20;

  // Nhiệm vụ ngày (cycle 45, #19 bước 2) — bản sao y hệt server/economy.js.
  var QUESTS = [
    { id: 'play-match', name: 'Chơi 1 trận', reward: 20, desc: 'Chơi 1 trận bất kỳ.' },
    { id: 'survive-2', name: 'Sống sót 2 vòng', reward: 20, desc: 'Sống sót qua 2 vòng trong ngày.' },
    { id: 'chat-5', name: 'Gửi 5 tin chat', reward: 20, desc: 'Gửi 5 tin nhắn chat trong ngày.' }
  ];
  var QUEST_NEED = { 'play-match': 1, 'survive-2': 2, 'chat-5': 5 };

  function todayStr() {
    return new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC, như server)
  }

  function blankQuests() {
    return { date: todayStr(), playMatch: 0, surviveRounds: 0, chats: 0, claimed: [] };
  }

  // Profile cũ (trước cycle 45) chưa có quests thì thêm mới; sang ngày
  // mới thì reset tiến độ (giữ nguyên xu / đồ / Pass).
  function normalizeQuests(p) {
    if (!p.quests || typeof p.quests !== 'object' || typeof p.quests.date !== 'string'
      || typeof p.quests.playMatch !== 'number' || typeof p.quests.surviveRounds !== 'number'
      || typeof p.quests.chats !== 'number' || !Array.isArray(p.quests.claimed)) {
      p.quests = blankQuests();
    } else if (p.quests.date !== todayStr()) {
      p.quests = blankQuests();
    }
    return p;
  }

  // Mùa hiện tại do game.js đặt (window.__season, từ seasonal.js).
  // opts.seasonId ghi đè rõ (phục vụ test); khi có khóa seasonId thì
  // lấy đúng giá trị đó — null nghĩa là ép "không mùa" (như ?season=none).
  function seasonId(opts) {
    if (opts && Object.prototype.hasOwnProperty.call(opts, 'seasonId')) {
      return (typeof opts.seasonId === 'string') ? opts.seasonId : null;
    }
    try {
      if (typeof window !== 'undefined' && window.__season && typeof window.__season.id === 'string') return window.__season.id;
    } catch (e) { /* __season chưa có: coi như không mùa */ }
    return null;
  }

  function lixiFor(kind, sid) {
    if (sid !== 'tet') return 0;
    return kind === 'win' ? LIXI_XU_PER_WIN : LIXI_XU_PER_ROUND;
  }

  // Bản sao catalogue server (nguồn chân lý: server/economy.js).
  // price null = chỉ nhận qua Pass, không bán trực tiếp bằng xu.
  var CATALOGUE = [
    { id: 'skin-baba-do', name: 'Áo Bà Ba Đỏ', kind: 'skin', price: 150, desc: 'Áo bà ba đỏ — chỉ đổi màu áo, không đổi chỉ số.' },
    { id: 'skin-baba-xanh', name: 'Áo Bà Ba Xanh', kind: 'skin', price: 150, desc: 'Áo bà ba xanh — chỉ đổi màu áo, không đổi chỉ số.' },
    { id: 'skin-baba-vang', name: 'Áo Bà Ba Vàng', kind: 'skin', price: 150, desc: 'Áo bà ba vàng — chỉ đổi màu áo, không đổi chỉ số.' },
    { id: 'hat-nonla-trang', name: 'Nón Lá Trắng', kind: 'hat', price: 100, desc: 'Nón lá trắng truyền thống.' },
    { id: 'hat-nonla-hoa', name: 'Nón Lá Hoa Sen', kind: 'hat', price: 200, desc: 'Nón lá thêu hoa sen.' },
    { id: 'hat-khan-dong', name: 'Khăn Đóng', kind: 'hat', price: 180, desc: 'Khăn đóng hội làng.' },
    { id: 'banner-trong-hoi', name: 'Cờ Trống Hội', kind: 'banner', price: 120, desc: 'Cờ hiệu trống hội treo sau lưng.' },
    { id: 'banner-cau-khi', name: 'Cờ Cầu Khỉ', kind: 'banner', price: 120, desc: 'Cờ hiệu cầu khỉ treo sau lưng.' },
    { id: 'banner-ha-long', name: 'Cờ Hạ Long', kind: 'banner', price: 200, desc: 'Cờ hiệu vịnh Hạ Long.' },
    { id: 'bubble-la-tre', name: 'Bong Bóng Lá Tre', kind: 'bubble', price: 80, desc: 'Kiểu bong bóng chat lá tre.' },
    { id: 'bubble-hoa-sen', name: 'Bong Bóng Hoa Sen', kind: 'bubble', price: 150, desc: 'Kiểu bong bóng chat hoa sen.' },
    { id: 'emote-wave', name: 'Vẫy Tay', kind: 'emote', price: 60, desc: 'Động tác vẫy tay chào.' },
    { id: 'emote-drum', name: 'Đánh Trống', kind: 'emote', price: 100, desc: 'Động tác đánh trống hội.' },
    { id: 'emote-cheer', name: 'Reo Hò', kind: 'emote', price: 100, desc: 'Động tác reo hò cổ vũ.' },
    { id: 'decor-den-long', name: 'Đèn Lồng Đình', kind: 'decor', price: 250, desc: 'Đèn lồng trang trí đảo hội làng của bạn.' },
    { id: 'decor-cay-da', name: 'Cây Đa Đầu Làng', kind: 'decor', price: 300, desc: 'Cây đa trang trí đảo hội làng của bạn.' },
    { id: 'skin-baba-tim', name: 'Áo Bà Ba Tím (Pass)', kind: 'skin', price: null, desc: 'Thưởng Pass trả phí cấp 10 — chỉ đổi màu áo.' },
    { id: 'hat-nonla-vang', name: 'Nón Lá Vàng (Pass)', kind: 'hat', price: null, desc: 'Thưởng Pass trả phí cấp 20 — trang trí.' },
    { id: 'banner-hoi-lang', name: 'Cờ Hội Làng Vàng (Pass)', kind: 'banner', price: null, desc: 'Thưởng Pass miễn phí cấp 15 — trang trí.' }
  ];

  // Thưởng Pass theo cấp (bản sao id-based của server/economy.js).
  var PASS_REWARDS = [
    { level: 2, free: 'emote-wave', paid: 'bubble-la-tre' },
    { level: 5, free: 'hat-nonla-trang', paid: 'banner-trong-hoi' },
    { level: 8, free: 'emote-drum', paid: 'skin-baba-do' },
    { level: 10, free: 'banner-cau-khi', paid: 'skin-baba-tim' },
    { level: 12, free: 'bubble-hoa-sen', paid: 'hat-nonla-hoa' },
    { level: 15, free: 'banner-hoi-lang', paid: 'decor-den-long' },
    { level: 18, free: 'emote-cheer', paid: 'skin-baba-xanh' },
    { level: 20, free: 'decor-cay-da', paid: 'hat-nonla-vang' }
  ];

  // Hành động cần người chơi khác / server — không chạy local.
  var SERVER_ONLY = { buyPass: true, createTournament: true, listTournaments: true, cheer: true, gift: true, buyTourPass: true };

  var memFallback = null; // localStorage không dùng được thì giữ trong RAM

  function storage() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
    } catch (e) { /* localStorage bị chặn: dùng RAM */ }
    return null;
  }

  function blankProfile() {
    return {
      id: 'local', name: 'Người chơi', xu: 0, inventory: [],
      pass: { tier: 'free', level: 1, xp: 0, claimedLevels: [] },
      cosmetics: { skin: null, hat: null, banner: null, bubble: null },
      quests: blankQuests()
    };
  }

  function validProfile(p) {
    return p && typeof p === 'object' && typeof p.xu === 'number'
      && Array.isArray(p.inventory) && p.pass && typeof p.pass === 'object'
      && typeof p.pass.level === 'number' && typeof p.pass.xp === 'number'
      && p.cosmetics && typeof p.cosmetics === 'object';
  }

  function load() {
    var raw = null;
    var st = storage();
    try { raw = st ? st.getItem(KEY) : memFallback; } catch (e) { raw = memFallback; }
    if (raw) {
      try {
        var p = JSON.parse(raw);
        if (validProfile(p)) return normalizeQuests(p);
      } catch (e) { /* dữ liệu hỏng: tạo mới bên dưới */ }
    }
    return blankProfile();
  }

  function save(p) {
    var raw = JSON.stringify(p);
    var st = storage();
    try {
      if (st) st.setItem(KEY, raw);
      else memFallback = raw;
    } catch (e) { memFallback = raw; }
  }

  var profile = load();

  function snapshot() {
    return {
      id: profile.id, name: profile.name, xu: profile.xu,
      inventory: profile.inventory.slice(),
      pass: { tier: profile.pass.tier, level: profile.pass.level, xp: profile.pass.xp, claimedLevels: profile.pass.claimedLevels.slice() },
      cosmetics: { skin: profile.cosmetics.skin, hat: profile.cosmetics.hat, banner: profile.cosmetics.banner, bubble: profile.cosmetics.bubble },
      quests: { date: profile.quests.date, playMatch: profile.quests.playMatch, surviveRounds: profile.quests.surviveRounds, chats: profile.quests.chats, claimed: profile.quests.claimed.slice() }
    };
  }

  // Mã sao lưu ví chơi đơn (cycle 52, #19 bước 3 — ĐÃ QUYẾT, BRD §10.2):
  // `HOI1.<base64url(JSON profile)>.<checksum 8 ký tự hex>`.
  // Người chơi copy mã từ máy A, dán vào máy B để chuyển ví sang đó
  // (xu, đồ đã mua, cấp Pass, nhiệm vụ ngày). Nhập sẽ THAY ví local
  // trên máy đích. Không đồng bộ lên server (quyết định chống cày xu
  // cycle 28 giữ nguyên): ví multi vẫn riêng, mã chỉ mang ví CHƠI ĐƠN.
  // Ai có mã cũng nhập được ví này nên chỉ gửi mã cho chính mình —
  // checksum chỉ chống gõ sai, không phải bảo mật.
  var WALLET_CODE_PREFIX = 'HOI1';

  function b64urlEncode(str) {
    // str là chuỗi UTF-8 (JSON có tiếng Việt): mã hoá UTF-8 rồi base64url.
    if (typeof Buffer !== 'undefined' && typeof Buffer.from === 'function') {
      return Buffer.from(str, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
    // Trình duyệt: btoa chỉ nhận chuỗi Latin-1 nên qua encodeURIComponent.
    var bin = unescape(encodeURIComponent(str));
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function b64urlDecode(b64) {
    var std = b64.replace(/-/g, '+').replace(/_/g, '/');
    while (std.length % 4) std += '=';
    if (typeof Buffer !== 'undefined' && typeof Buffer.from === 'function') {
      return Buffer.from(std, 'base64').toString('utf8');
    }
    var bin = atob(std);
    return decodeURIComponent(escape(bin)); // escape/unescape: cặp với encodeURIComponent
  }

  // Checksum lăn đơn giản (đủ chống gõ sai 1 ký tự); phép nhân *31 giữ
  // trong số nguyên an toàn (< 2^53) nên không cần Math.imul.
  function checksumHex(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) {
      h = ((h * 31) + str.charCodeAt(i)) >>> 0;
    }
    var s = h.toString(16);
    while (s.length < 8) s = '0' + s;
    return s;
  }

  function exportWalletCode() {
    var payload = b64urlEncode(JSON.stringify(snapshot()));
    return WALLET_CODE_PREFIX + '.' + payload + '.' + checksumHex(payload);
  }

  function importWalletCode(code) {
    if (typeof code !== 'string') return { ok: false, error: 'Mã sao lưu không đúng định dạng.' };
    var c = code.trim();
    var parts = c.split('.');
    if (parts.length !== 3 || parts[0] !== WALLET_CODE_PREFIX || !parts[1]
      || !/^[A-Za-z0-9_-]+$/.test(parts[1]) || !/^[0-9a-f]{8}$/.test(parts[2])) {
      return { ok: false, error: 'Mã sao lưu không đúng định dạng.' };
    }
    if (checksumHex(parts[1]) !== parts[2]) {
      return { ok: false, error: 'Mã sao lưu sai — kiểm tra lại từng ký tự (có thể gõ thiếu/sai).' };
    }
    var p;
    try { p = JSON.parse(b64urlDecode(parts[1])); } catch (e) {
      return { ok: false, error: 'Mã sao lưu không đọc được.' };
    }
    if (!validProfile(p)) return { ok: false, error: 'Mã sao lưu không chứa ví chơi đơn hợp lệ.' };
    profile = normalizeQuests(p);
    save(profile);
    return { ok: true, profile: snapshot() };
  }

  function levelForXp(xp) {
    return Math.min(MAX_LEVEL, 1 + Math.floor(Math.max(0, xp) / XP_PER_LEVEL));
  }

  // Y hệt server/economy.js grantXp — trừ track trả phí (tier local luôn free).
  function grantXp(amount) {
    profile.pass.xp += amount;
    var newLevel = levelForXp(profile.pass.xp);
    var granted = [];
    if (newLevel > profile.pass.level) {
      for (var lvl = profile.pass.level + 1; lvl <= newLevel; lvl++) {
        var row = null;
        for (var i = 0; i < PASS_REWARDS.length; i++) {
          if (PASS_REWARDS[i].level === lvl) { row = PASS_REWARDS[i]; break; }
        }
        if (!row) continue;
        if (row.free && profile.inventory.indexOf(row.free) === -1) {
          profile.inventory.push(row.free);
          granted.push({ level: lvl, track: 'free', itemId: row.free });
        }
        profile.pass.claimedLevels.push(lvl);
      }
      profile.pass.level = newLevel;
    }
    return granted;
  }

  function findItem(itemId) {
    for (var i = 0; i < CATALOGUE.length; i++) {
      if (CATALOGUE[i].id === itemId) return CATALOGUE[i];
    }
    return null;
  }

  function replyToShop(msg) {
    if (window.HoiShop && typeof window.HoiShop.onMessage === 'function') {
      window.HoiShop.onMessage(msg);
    }
  }

  // Local active khi KHÔNG ở trong phòng multi (sảnh chờ / chơi đơn / menu).
  // game.js lộ mode qua window.__game.mode; chưa có __game thì mặc định local.
  function isActive() {
    try {
      return !(window.__game && window.__game.mode === 'multi');
    } catch (e) {
      return true;
    }
  }

  function handle(msg) {
    if (!msg || msg.type !== 'economy') return false;
    if (!isActive()) return false; // đang multi: để WS/server xử lý
    var action = msg.action;
    if (SERVER_ONLY[action]) return 'server-only';
    if (action === 'getProfile' || action === 'pass') {
      replyToShop({ type: 'economy', action: action, profile: snapshot() });
      return 'handled';
    }
    if (action === 'shop') {
      replyToShop({ type: 'economy', action: 'shop', catalogue: CATALOGUE.map(function (it) { return { id: it.id, name: it.name, kind: it.kind, price: it.price, desc: it.desc }; }) });
      return 'handled';
    }
    if (action === 'buy') {
      var item = findItem(msg.itemId);
      if (!item) {
        replyToShop({ type: 'economy', action: 'buy', ok: false, error: 'Món này không có trong cửa hàng.' });
      } else if (item.price === null || item.price === undefined) {
        replyToShop({ type: 'economy', action: 'buy', ok: false, error: 'Món này chỉ nhận qua Hội Làng Pass.' });
      } else if (profile.inventory.indexOf(item.id) !== -1) {
        replyToShop({ type: 'economy', action: 'buy', ok: false, error: 'Bạn đã sở hữu món này rồi.' });
      } else if (profile.xu < item.price) {
        replyToShop({ type: 'economy', action: 'buy', ok: false, error: 'Không đủ Hội Xu (' + profile.xu + '/' + item.price + '). Chơi thêm để kiếm xu.' });
      } else {
        profile.xu -= item.price;
        profile.inventory.push(item.id);
        save(profile);
        replyToShop({ type: 'economy', action: 'buy', ok: true, profile: snapshot() });
      }
      return 'handled';
    }
    if (action === 'equip') {
      var it2 = findItem(msg.itemId);
      if (!it2) {
        replyToShop({ type: 'economy', action: 'equip', ok: false, error: 'Món này không có trong cửa hàng.' });
      } else if (profile.inventory.indexOf(it2.id) === -1) {
        replyToShop({ type: 'economy', action: 'equip', ok: false, error: 'Bạn chưa sở hữu món này.' });
      } else if (it2.kind === 'emote' || it2.kind === 'decor') {
        // Emote/decor không có slot cosmetics (như server: chỉ skin/hat/banner/bubble).
        replyToShop({ type: 'economy', action: 'equip', ok: false, error: 'Món này không trang bị lên người được.' });
      } else {
        profile.cosmetics[it2.kind] = it2.id;
        save(profile);
        replyToShop({ type: 'economy', action: 'equip', ok: true, cosmetics: { skin: profile.cosmetics.skin, hat: profile.cosmetics.hat, banner: profile.cosmetics.banner, bubble: profile.cosmetics.bubble }, profile: snapshot() });
      }
      return 'handled';
    }
    if (action === 'quests') {
      normalizeQuests(profile);
      replyToShop({ type: 'economy', action: 'quests', quests: QUESTS.map(function (q) { return { id: q.id, name: q.name, reward: q.reward, desc: q.desc }; }), progress: { date: profile.quests.date, playMatch: profile.quests.playMatch, surviveRounds: profile.quests.surviveRounds, chats: profile.quests.chats, claimed: profile.quests.claimed.slice() } });
      return 'handled';
    }
    if (action === 'claimQuest' || action === 'quest') {
      var r = claimDailyQuest(msg.questId);
      if (!r) {
        replyToShop({ type: 'economy', action: 'claimQuest', ok: false, error: 'Nhiệm vụ ngày chỉ có ở chế độ chơi đơn.' });
      } else if (!r.ok) {
        replyToShop({ type: 'economy', action: 'claimQuest', ok: false, error: r.error });
      } else {
        replyToShop({ type: 'economy', action: 'claimQuest', ok: true, reward: r.reward, profile: r.profile });
      }
      return 'handled';
    }
    if (action === 'exportWallet') {
      replyToShop({ type: 'economy', action: 'exportWallet', ok: true, code: exportWalletCode() });
      return 'handled';
    }
    if (action === 'importWallet') {
      var r2 = importWalletCode(msg.code);
      if (r2.ok) {
        replyToShop({ type: 'economy', action: 'importWallet', ok: true, profile: r2.profile });
      } else {
        replyToShop({ type: 'economy', action: 'importWallet', ok: false, error: r2.error });
      }
      return 'handled';
    }
    return false; // action lạ: để WS thử
  }

  function questProgressFor(questId) {
    if (questId === 'play-match') return profile.quests.playMatch;
    if (questId === 'survive-2') return profile.quests.surviveRounds;
    if (questId === 'chat-5') return profile.quests.chats;
    return 0;
  }

  // Đẩy tiến độ nhiệm vụ mới về shop để panel đang mở cập nhật ngay
  // (không đợi người chơi mở lại panel — panel mở từ sảnh chờ vẫn mở
  // khi trận bắt đầu vì startSingle không ẩn panel kinh tế).
  function replyQuests() {
    replyToShop({ type: 'economy', action: 'quests', quests: QUESTS.map(function (q) { return { id: q.id, name: q.name, reward: q.reward, desc: q.desc }; }), progress: { date: profile.quests.date, playMatch: profile.quests.playMatch, surviveRounds: profile.quests.surviveRounds, chats: profile.quests.chats, claimed: profile.quests.claimed.slice() } });
  }

  // Y hệt server/economy.js recordMatchPlayed / recordChatSent / claimDailyQuest.
  function recordMatchPlayed() {
    if (!isActive()) return null;
    normalizeQuests(profile);
    profile.quests.playMatch += 1;
    save(profile);
    replyQuests();
    return snapshot();
  }

  function recordChatSent() {
    if (!isActive()) return null;
    normalizeQuests(profile);
    profile.quests.chats += 1;
    save(profile);
    replyQuests();
    return snapshot();
  }

  function claimDailyQuest(questId) {
    if (!isActive()) return null;
    normalizeQuests(profile);
    var quest = null;
    for (var i = 0; i < QUESTS.length; i++) {
      if (QUESTS[i].id === questId) { quest = QUESTS[i]; break; }
    }
    if (!quest) return { ok: false, error: 'Nhiệm vụ không tồn tại.' };
    if (profile.quests.claimed.indexOf(questId) !== -1) return { ok: false, error: 'Đã nhận thưởng nhiệm vụ này hôm nay.' };
    var progress = questProgressFor(questId);
    var need = QUEST_NEED[questId] || 0;
    if (progress < need) return { ok: false, error: 'Chưa đủ điều kiện (' + progress + '/' + need + ').' };
    profile.quests.claimed.push(questId);
    profile.xu += quest.reward; // +20 xu / nhiệm vụ ngày
    save(profile);
    return { ok: true, reward: quest.reward, profile: snapshot() };
  }

  function awardRoundSurvived(opts) {
    if (!isActive()) return null;
    normalizeQuests(profile);
    profile.quests.surviveRounds += 1; // như server: awardRoundSurvived đếm tiến độ nhiệm vụ
    var sid = seasonId(opts);
    var lixi = lixiFor('round', sid);
    profile.xu += XU_PER_ROUND + lixi;
    var rewards = grantXp(XP_PER_ROUND);
    save(profile);
    replyToShop({ type: 'economy', action: 'earned', reason: 'round', amount: XU_PER_ROUND, lixi: lixi, seasonId: sid, rewards: rewards, profile: snapshot() });
    return { profile: snapshot(), rewards: rewards, lixi: lixi, seasonId: sid };
  }

  function awardWin(opts) {
    if (!isActive()) return null;
    var sid = seasonId(opts);
    var lixi = lixiFor('win', sid);
    // #39 bước 1 — Hũ Vàng: opts.potXu (số hũ lúc thắng, game.js giữ
    // localPot) thay cho +50 xu thắng cố định; không có potXu thì giữ
    // mức cũ 50 (tương thích test/cuộc gọi cũ). Chỉ cộng XU, XP vẫn 500.
    var potXu = (opts && typeof opts.potXu === 'number' && isFinite(opts.potXu) && opts.potXu >= 0) ? Math.floor(opts.potXu) : null;
    var winXu = (potXu === null) ? XU_PER_WIN : potXu;
    profile.xu += winXu + lixi;
    var rewards = grantXp(XP_PER_WIN);
    save(profile);
    replyToShop({ type: 'economy', action: 'earned', reason: 'win', amount: winXu, pot: potXu, lixi: lixi, seasonId: sid, rewards: rewards, profile: snapshot() });
    return { profile: snapshot(), rewards: rewards, lixi: lixi, seasonId: sid, potAmount: potXu };
  }

  window.HoiLocalEconomy = {
    isActive: isActive,
    handle: handle,
    awardRoundSurvived: awardRoundSurvived,
    awardWin: awardWin,
    recordMatchPlayed: recordMatchPlayed,
    recordChatSent: recordChatSent,
    claimDailyQuest: claimDailyQuest,
    QUESTS: QUESTS,
    QUEST_NEED: QUEST_NEED,
    getProfile: snapshot,
    getBalance: function () { return profile.xu; },
    exportWalletCode: exportWalletCode,
    importWalletCode: importWalletCode,
    WALLET_CODE_PREFIX: WALLET_CODE_PREFIX,
    KEY: KEY,
    XU_PER_ROUND: XU_PER_ROUND,
    XU_PER_WIN: XU_PER_WIN,
    POT_START_XU: 100, // #39 bước 1 — khớp server/economy.js POT_START_XU
    POT_PER_ELIMINATION_XU: 10, // #39 bước 1 — khớp server POT_PER_ELIMINATION_XU
    LIXI_XU_PER_ROUND: LIXI_XU_PER_ROUND,
    LIXI_XU_PER_WIN: LIXI_XU_PER_WIN
  };
})();
