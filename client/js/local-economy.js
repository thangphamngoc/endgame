/* local-economy.js — Kinh tế CHƠI ĐƠN (ví local, lưu trên trình duyệt).
 *
 * Quyết định PO (ĐÃ QUYẾT, BRD §10.2 — cycle 28, backlog #19 bước 1):
 * - Chơi đơn không có server nên ví + đồ đã mua lưu ở localStorage
 *   (`hoilang_local_profile_v1`) trên máy người chơi, KHÔNG đồng bộ lên
 *   server. Lý do: chống cày xu chơi đơn (bot dễ) rồi mang sang multi.
 * - Mức thưởng Y HỆT multi (server/economy.js): +10 xu/vòng sống sót,
 *   +50 xu khi thắng (là người sống sót duy nhất), +100 XP/vòng,
 *   +500 XP/thắng, 500 XP/cấp, tối đa cấp 20; lên cấp tự nhận thưởng
 *   track MIỄN PHÍ (track trả phí không mở ở chơi đơn vì tier luôn free).
 * - Chỉ shop mua/trang bị chạy local. Pass hiển thị cấp/XP local;
 *   giải đấu / cổ vũ / tặng quà / vé tour cần người chơi khác nên chỉ có
 *   ở multi — bấm ở chơi đơn thì báo rõ, không gửi WS vô ích.
 * - Trận QC chơi đơn KHÔNG thưởng (game.js chặn ở localRoundEnd, như FR-46).
 * - Chưa có ở bước 1: nhiệm vụ ngày chơi đơn, đồng bộ ví khi đổi máy.
 *   Còn nợ Sudo test tay: mua/trang bị thật ở chơi đơn, ví giữ sau khi
 *   tải lại trang, cảm giác số dư khi chuyển chơi đơn ↔ nhiều người.
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
      cosmetics: { skin: null, hat: null, banner: null, bubble: null }
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
        if (validProfile(p)) return p;
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
      cosmetics: { skin: profile.cosmetics.skin, hat: profile.cosmetics.hat, banner: profile.cosmetics.banner, bubble: profile.cosmetics.bubble }
    };
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
    return false; // action lạ: để WS thử
  }

  function awardRoundSurvived() {
    if (!isActive()) return null;
    profile.xu += XU_PER_ROUND;
    var rewards = grantXp(XP_PER_ROUND);
    save(profile);
    replyToShop({ type: 'economy', action: 'earned', reason: 'round', amount: XU_PER_ROUND, rewards: rewards, profile: snapshot() });
    return { profile: snapshot(), rewards: rewards };
  }

  function awardWin() {
    if (!isActive()) return null;
    profile.xu += XU_PER_WIN;
    var rewards = grantXp(XP_PER_WIN);
    save(profile);
    replyToShop({ type: 'economy', action: 'earned', reason: 'win', amount: XU_PER_WIN, rewards: rewards, profile: snapshot() });
    return { profile: snapshot(), rewards: rewards };
  }

  window.HoiLocalEconomy = {
    isActive: isActive,
    handle: handle,
    awardRoundSurvived: awardRoundSurvived,
    awardWin: awardWin,
    getProfile: snapshot,
    getBalance: function () { return profile.xu; },
    KEY: KEY,
    XU_PER_ROUND: XU_PER_ROUND,
    XU_PER_WIN: XU_PER_WIN
  };
})();
