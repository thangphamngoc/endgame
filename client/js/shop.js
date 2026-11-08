/* shop.js — Giao diện kinh tế trong game (Shop / Pass / Giải đấu / Quà tặng).
 *
 * Plain JS, không build step. File này CHỈ vẽ giao diện và gửi message
 * {type:'economy', action, ...} qua WebSocket của game.
 * - Dùng lại kết nối WebSocket sẵn có qua window.__sendWS (do game.js
 *   cung cấp) nếu có; KHÔNG mở kết nối mới.
 * - Nếu các container #shop-panel, #pass-panel, #tournament-panel,
 *   #gift-panel chưa tồn tại (workstream client chưa thêm), không làm gì
 *   và thử lại MỘT lần sau 2 giây.
 * - Mọi nút tiền thật đều ghi rõ "(Demo — chưa thanh toán thật)".
 * - Mọi mua/trang bị đều do server kiểm tra (economy.js); client chỉ hiển thị.
 *
 * game.js cần chuyển message server {type:'economy', ...} vào
 * window.HoiShop.onMessage(msg) để cập nhật ví / shop.
 * (Workstream client sở hữu việc này — xem docs/ARCHITECTURE.md §7.5.)
 */
(function () {
  'use strict';

  var STUB_LABEL = '(Demo — chưa thanh toán thật)';

  // Bản sao catalogue để vẽ khi chưa nhận được catalogue từ server.
  // Nguồn chân lý vẫn là server/economy.js; server gửi catalogue qua
  // action 'shop' và shop.js vẽ lại từ đó khi nhận được.
  var FALLBACK_CATALOGUE = [
    { id: 'skin-baba-do', name: 'Áo Bà Ba Đỏ', kind: 'skin', price: 150, desc: 'Chỉ đổi màu áo, không đổi chỉ số.' },
    { id: 'skin-baba-xanh', name: 'Áo Bà Ba Xanh', kind: 'skin', price: 150, desc: 'Chỉ đổi màu áo, không đổi chỉ số.' },
    { id: 'skin-baba-vang', name: 'Áo Bà Ba Vàng', kind: 'skin', price: 150, desc: 'Chỉ đổi màu áo, không đổi chỉ số.' },
    { id: 'hat-nonla-trang', name: 'Nón Lá Trắng', kind: 'hat', price: 100, desc: 'Nón lá trắng truyền thống.' },
    { id: 'hat-nonla-hoa', name: 'Nón Lá Hoa Sen', kind: 'hat', price: 200, desc: 'Nón lá thêu hoa sen.' },
    { id: 'hat-khan-dong', name: 'Khăn Đóng', kind: 'hat', price: 180, desc: 'Khăn đóng hội làng.' },
    { id: 'banner-trong-hoi', name: 'Cờ Trống Hội', kind: 'banner', price: 120, desc: 'Cờ hiệu trống hội.' },
    { id: 'banner-cau-khi', name: 'Cờ Cầu Khỉ', kind: 'banner', price: 120, desc: 'Cờ hiệu cầu khỉ.' },
    { id: 'banner-ha-long', name: 'Cờ Hạ Long', kind: 'banner', price: 200, desc: 'Cờ hiệu vịnh Hạ Long.' },
    { id: 'bubble-la-tre', name: 'Bong Bóng Lá Tre', kind: 'bubble', price: 80, desc: 'Kiểu bong bóng chat lá tre.' },
    { id: 'bubble-hoa-sen', name: 'Bong Bóng Hoa Sen', kind: 'bubble', price: 150, desc: 'Kiểu bong bóng chat hoa sen.' },
    { id: 'emote-wave', name: 'Vẫy Tay', kind: 'emote', price: 60, desc: 'Động tác vẫy tay chào.' },
    { id: 'emote-drum', name: 'Đánh Trống', kind: 'emote', price: 100, desc: 'Động tác đánh trống hội.' },
    { id: 'emote-cheer', name: 'Reo Hò', kind: 'emote', price: 100, desc: 'Động tác reo hò cổ vũ.' },
    { id: 'decor-den-long', name: 'Đèn Lồng Đình', kind: 'decor', price: 250, desc: 'Trang trí đảo hội làng.' },
    { id: 'decor-cay-da', name: 'Cây Đa Đầu Làng', kind: 'decor', price: 300, desc: 'Trang trí đảo hội làng.' }
  ];

  var FALLBACK_STICKERS = [
    { id: 'sticker-hoa-sen', name: 'Hoa Sen', price: 10 },
    { id: 'sticker-trong-hoi', name: 'Trống Hội', price: 20 },
    { id: 'sticker-ca-chep', name: 'Cá Chép Vàng', price: 30 }
  ];

  // Thưởng Pass theo cấp (bản sao để vẽ; nguồn chân lý: server/economy.js).
  var PASS_REWARDS = [
    { level: 2, free: 'Vẫy Tay', paid: 'Bong Bóng Lá Tre' },
    { level: 5, free: 'Nón Lá Trắng', paid: 'Cờ Trống Hội' },
    { level: 8, free: 'Đánh Trống', paid: 'Áo Bà Ba Đỏ' },
    { level: 10, free: 'Cờ Cầu Khỉ', paid: 'Áo Bà Ba Tím (Pass)' },
    { level: 12, free: 'Bong Bóng Hoa Sen', paid: 'Nón Lá Hoa Sen' },
    { level: 15, free: 'Cờ Hội Làng Vàng (Pass)', paid: 'Đèn Lồng Đình' },
    { level: 18, free: 'Reo Hò', paid: 'Áo Bà Ba Xanh' },
    { level: 20, free: 'Cây Đa Đầu Làng', paid: 'Nón Lá Vàng (Pass)' }
  ];

  var catalogue = FALLBACK_CATALOGUE.slice();
  var stickers = FALLBACK_STICKERS.slice();
  var walletBalance = 0;
  var profile = null;
  // Nhiệm vụ ngày (cycle 45, #19 bước 2): server trả qua action 'quests'
  // ({quests, progress}); chơi đơn thì local-economy.js trả y hệt.
  var quests = null;
  var questProgress = null;
  var selectedSticker = FALLBACK_STICKERS[0].id;
  var retried = false;
  var rendered = false;

  function sendEconomy(msg) {
    msg.type = 'economy';
    // #19 bước 1: chơi đơn / sảnh chờ thì kinh tế chạy local (localStorage,
    // HoiLocalEconomy) — không gửi WS vô ích. Đang multi thì để WS/server
    // xử lý như trước; action chỉ có ở multi thì báo rõ, không gửi.
    if (typeof window !== 'undefined' && window.HoiLocalEconomy) {
      var r = window.HoiLocalEconomy.handle(msg);
      if (r === 'handled') return true;
      if (r === 'server-only') {
        if (window.__game && typeof window.__game.toast === 'function') window.__game.toast('Tính năng này chỉ có ở chế độ nhiều người.');
        return true;
      }
    }
    if (typeof window.__sendWS === 'function') {
      window.__sendWS(msg);
      return true;
    }
    if (typeof window.sendWS === 'function') {
      window.sendWS(msg);
      return true;
    }
    // Không mở kết nối mới. Ghi chú để game.js nối sau khi có __sendWS.
    if (!window.__hoiShopQueue) window.__hoiShopQueue = [];
    window.__hoiShopQueue.push(msg);
    return false;
  }

  function el(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function setWallet(balance) {
    walletBalance = Number(balance) || 0;
    var hud = el('wallet-hud');
    if (hud) hud.textContent = 'Hội Xu: ' + walletBalance + ' xu';
  }

  function questNeed(id) { return { 'play-match': 1, 'survive-2': 2, 'chat-5': 5 }[id] || 0; }

  function questProgressValue(id) {
    if (!questProgress) return 0;
    if (id === 'play-match') return questProgress.playMatch || 0;
    if (id === 'survive-2') return questProgress.surviveRounds || 0;
    if (id === 'chat-5') return questProgress.chats || 0;
    return 0;
  }

  // Mục "Nhiệm vụ ngày" trong panel Cửa hàng (cycle 45): hiện cả 2 chế độ
  // — multi lấy từ server, chơi đơn lấy từ local-economy.js. Trước đây
  // server đã có sẵn action 'quests'/'claimQuest' nhưng client chưa vẽ UI
  // nên người chơi không xem/nhận được nhiệm vụ.
  function renderQuests() {
    var html = '<h4>Nhiệm vụ ngày — mỗi nhiệm vụ +20 Hội Xu, nhận 1 lần/ngày</h4>';
    if (!quests || !questProgress) {
      return html + '<p class="shop-note">Đang tải nhiệm vụ ngày…</p>';
    }
    html += '<div class="quest-list">';
    quests.forEach(function (q) {
      var prog = questProgressValue(q.id);
      var need = questNeed(q.id);
      var claimed = (questProgress.claimed || []).indexOf(q.id) !== -1;
      var done = prog >= need;
      html += '<div class="quest-row"><div><div class="quest-name">' + esc(q.name) + '</div>'
        + '<div class="quest-desc">' + esc(q.desc || '') + '</div></div>'
        + '<div class="quest-progress">' + prog + '/' + need + '</div>'
        + (claimed
          ? '<button type="button" disabled>Đã nhận ✓</button>'
          : (done
            ? '<button type="button" data-claim-quest="' + esc(q.id) + '">Nhận +' + (q.reward || 20) + ' xu</button>'
            : '<button type="button" disabled>Chưa đủ</button>'))
        + '</div>';
    });
    return html + '</div>';
  }

  function renderShop() {
    var panel = el('shop-panel');
    if (!panel) return;
    var owned = (profile && profile.inventory) || [];
    var html = '<h3>Cửa hàng — đồ trang trí (chỉ đổi hình thức, không đổi chỉ số)</h3>'
      + '<p>Ví của bạn: <strong>' + walletBalance + ' Hội Xu</strong> — kiếm xu bằng cách chơi: +10 xu/vòng sống sót, thắng trận lấy cả Hũ Vàng (từ 100 Hội Xu), +20 xu/nhiệm vụ ngày.</p>'
      + renderQuests()
      + ((typeof window !== 'undefined' && window.HoiLocalEconomy && window.HoiLocalEconomy.isActive())
        ? '<p class="shop-note">Ví chơi đơn lưu trên trình duyệt này — không đồng bộ lên máy chủ.</p>' : '')
      + '<div class="shop-grid">';
    catalogue.forEach(function (item) {
      var isOwned = owned.indexOf(item.id) !== -1;
      var priceText = (item.price === null || item.price === undefined)
        ? 'Chỉ nhận qua Hội Làng Pass'
        : item.price + ' xu';
      html += '<div class="shop-item" data-item="' + esc(item.id) + '">'
        + '<div class="shop-item-name">' + esc(item.name) + '</div>'
        + '<div class="shop-item-desc">' + esc(item.desc || '') + '</div>'
        + '<div class="shop-item-price">' + esc(priceText) + '</div>'
        + (isOwned
          ? '<button type="button" data-equip="' + esc(item.id) + '">Trang bị</button>'
          : (item.price === null || item.price === undefined
            ? '<button type="button" disabled>Nhận qua Pass</button>'
            : '<button type="button" data-buy="' + esc(item.id) + '">Mua (' + item.price + ' xu)</button>'))
        + '</div>';
    });
    html += '</div>';
    panel.innerHTML = html;
    panel.querySelectorAll('[data-claim-quest]').forEach(function (btn) {
      btn.addEventListener('click', function () { sendEconomy({ action: 'claimQuest', questId: btn.getAttribute('data-claim-quest') }); });
    });
    panel.querySelectorAll('[data-buy]').forEach(function (btn) {
      btn.addEventListener('click', function () { sendEconomy({ action: 'buy', itemId: btn.getAttribute('data-buy') }); });
    });
    panel.querySelectorAll('[data-equip]').forEach(function (btn) {
      btn.addEventListener('click', function () { sendEconomy({ action: 'equip', itemId: btn.getAttribute('data-equip') }); });
    });
  }

  function renderPass() {
    var panel = el('pass-panel');
    if (!panel) return;
    var pass = (profile && profile.pass) || { tier: 'free', level: 1, xp: 0 };
    var html = '<h3>Hội Làng Pass</h3>'
      + '<p>Cấp hiện tại: <strong>' + pass.level + '/20</strong> — XP: ' + pass.xp
      + ' (100 XP/vòng sống sót, 500 XP khi thắng trận). Hạng: <strong>'
      + (pass.tier === 'paid' ? 'Trả phí (demo)' : 'Miễn phí') + '</strong></p>'
      + ((typeof window !== 'undefined' && window.HoiLocalEconomy && window.HoiLocalEconomy.isActive())
        ? '<p class="shop-note">Chơi đơn: cấp/XP lưu trên máy này; thưởng track miễn phí tự nhận khi lên cấp.</p>' : '')
      + '<p>Thưởng toàn đồ trang trí. Mở hạng trả phí ' + STUB_LABEL
      + ' — không có thanh toán thật, chỉ mở khóa thử trong bản demo.</p>'
      + '<button type="button" id="buy-pass-btn">Mở Pass trả phí ' + STUB_LABEL + '</button>'
      + '<table class="pass-table"><tr><th>Cấp</th><th>Track miễn phí</th><th>Track trả phí</th></tr>';
    PASS_REWARDS.forEach(function (row) {
      var reached = pass.level >= row.level;
      html += '<tr class="' + (reached ? 'pass-reached' : '') + '"><td>' + row.level + '</td><td>'
        + esc(row.free) + '</td><td>' + esc(row.paid) + '</td></tr>';
    });
    html += '</table>';
    panel.innerHTML = html;
    var btn = el('buy-pass-btn');
    if (btn) btn.addEventListener('click', function () { sendEconomy({ action: 'buyPass' }); });
  }

  function renderTournament() {
    var panel = el('tournament-panel');
    if (!panel) return;
    panel.innerHTML = '<h3>Chủ Hội — tạo giải đấu riêng</h3>'
      + '<p>Giải thưởng trả bằng Hội Xu từ ví của bạn. Người thắng nhận toàn bộ giải bằng Hội Xu (chỉ dùng mua đồ trang trí, không đổi ra tiền mặt). Không cá cược kết quả trận.</p>'
      + '<label>Tên giải đấu <input type="text" id="tournament-name" maxlength="40" placeholder="Ví dụ: Hội Làng Hải Hậu Mở Rộng"></label>'
      + '<label>Thương hiệu <input type="text" id="tournament-brand" maxlength="40" placeholder="Tên đội / nhà tài trợ (tùy chọn)"></label>'
      + '<label>Giải thưởng (Hội Xu) <input type="number" id="tournament-prize" min="0" value="100"></label>'
      + '<button type="button" id="tournament-create-btn">Tạo giải đấu</button>'
      + '<button type="button" id="tournament-list-btn">Xem giải đấu đang mở</button>'
      + '<div id="tournament-list"></div>';
    var createBtn = el('tournament-create-btn');
    if (createBtn) createBtn.addEventListener('click', function () {
      sendEconomy({
        action: 'createTournament',
        name: (el('tournament-name') || {}).value || '',
        brand: (el('tournament-brand') || {}).value || '',
        prizePoolXu: Number((el('tournament-prize') || {}).value || 0)
      });
    });
    var listBtn = el('tournament-list-btn');
    if (listBtn) listBtn.addEventListener('click', function () { sendEconomy({ action: 'listTournaments' }); });
  }

  function renderTournamentList(list) {
    var box = el('tournament-list');
    if (!box) return;
    if (!list || !list.length) { box.innerHTML = '<p>Chưa có giải đấu nào đang mở.</p>'; return; }
    var html = '<ul>';
    list.forEach(function (t) {
      html += '<li><strong>' + esc(t.name) + '</strong>'
        + (t.brand ? ' — ' + esc(t.brand) : '')
        + ' — giải ' + t.prizePoolXu + ' xu — chủ hội: ' + esc(t.hostName || '')
        + ' — ' + esc(t.status) + '</li>';
    });
    box.innerHTML = html + '</ul>';
  }

  function renderGift() {
    var panel = el('gift-panel');
    if (!panel) return;
    var html = '<h3>Cổ vũ &amp; tặng quà cho khán giả / người chơi</h3>'
      + '<p>Cổ vũ miễn phí: người được cổ vũ nhận +5 Hội Xu. Tặng sticker: bạn trả xu mua sticker, người nhận cũng nhận +5 Hội Xu.</p>'
      + '<label>Người nhận (ID người chơi) <input type="text" id="gift-to" placeholder="ID người chơi"></label>'
      + '<div class="sticker-picker">';
    stickers.forEach(function (s) {
      html += '<button type="button" data-sticker="' + esc(s.id) + '" class="sticker-btn'
        + (s.id === selectedSticker ? ' selected' : '') + '">'
        + esc(s.name) + ' (' + s.price + ' xu)</button>';
    });
    html += '</div>'
      + '<button type="button" id="cheer-btn">Cổ vũ (miễn phí, +5 xu cho người nhận)</button>'
      + '<button type="button" id="gift-btn">Tặng sticker đã chọn</button>'
      + '<hr><h4>Vé Du Lịch Hạ Long</h4>'
      + '<p>Mở thêm câu chuyện đảo, tuyến tour cao cấp và huy hiệu lưu niệm cho khách du lịch bị loại. Không ảnh hưởng kết quả trận đấu.</p>'
      + '<button type="button" id="tour-xu-btn">Mua vé bằng 500 Hội Xu</button>'
      + '<button type="button" id="tour-stub-btn">Mua vé bằng tiền thật ' + STUB_LABEL + '</button>';
    panel.innerHTML = html;
    panel.querySelectorAll('[data-sticker]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        selectedSticker = btn.getAttribute('data-sticker');
        panel.querySelectorAll('.sticker-btn').forEach(function (b) {
          b.classList.toggle('selected', b.getAttribute('data-sticker') === selectedSticker);
        });
      });
    });
    var cheerBtn = el('cheer-btn');
    if (cheerBtn) cheerBtn.addEventListener('click', function () {
      sendEconomy({ action: 'cheer', toPlayerId: (el('gift-to') || {}).value || '' });
    });
    var giftBtn = el('gift-btn');
    if (giftBtn) giftBtn.addEventListener('click', function () {
      sendEconomy({ action: 'gift', toPlayerId: (el('gift-to') || {}).value || '', stickerId: selectedSticker });
    });
    var tourXu = el('tour-xu-btn');
    if (tourXu) tourXu.addEventListener('click', function () { sendEconomy({ action: 'buyTourPass', pay: 'xu' }); });
    var tourStub = el('tour-stub-btn');
    if (tourStub) tourStub.addEventListener('click', function () { sendEconomy({ action: 'buyTourPass', pay: 'stub' }); });
  }

  function renderAll() {
    var any = el('shop-panel') || el('pass-panel') || el('tournament-panel') || el('gift-panel');
    if (!any) return false;
    renderShop();
    renderPass();
    renderTournament();
    renderGift();
    rendered = true;
    // Hỏi server lấy ví + catalogue thật ngay khi có thể.
    sendEconomy({ action: 'getProfile' });
    sendEconomy({ action: 'shop' });
    sendEconomy({ action: 'pass' });
    sendEconomy({ action: 'quests' });
    return true;
  }

  function init() {
    if (renderAll()) return;
    if (!retried) {
      retried = true;
      setTimeout(function () { renderAll(); }, 2000); // Thử lại MỘT lần sau 2 giây.
    }
  }

  // game.js chuyển message economy từ server vào đây.
  function onMessage(msg) {
    if (!msg || msg.type !== 'economy') return;
    if (msg.profile) {
      profile = msg.profile;
      setWallet(msg.profile.xu);
      if (msg.profile.quests) questProgress = msg.profile.quests;
    }
    if (msg.catalogue) { catalogue = msg.catalogue; }
    if (msg.stickers) { stickers = msg.stickers; }
    if (msg.action === 'quests' && msg.quests) {
      quests = msg.quests;
      if (msg.progress) questProgress = msg.progress;
    }
    if (msg.action === 'shop' && msg.catalogue) { renderShop(); return; }
    if (msg.action === 'listTournaments' && msg.tournaments) { renderTournamentList(msg.tournaments); return; }
    if (msg.action === 'tournamentCreated' && msg.tournament) { sendEconomy({ action: 'listTournaments' }); }
    if (msg.ok === false && msg.error) {
      // Báo lỗi nhẹ, không phá game: ghi log + hiện trong panel shop nếu có.
      if (typeof console !== 'undefined' && console.warn) console.warn('[HoiShop]', msg.error);
      var panel = el('shop-panel');
      if (panel) {
        var note = document.createElement('p');
        note.className = 'shop-error';
        note.textContent = msg.error;
        panel.appendChild(note);
      }
      return;
    }
    // Mọi cập nhật ví / trang bị / pass đều vẽ lại các panel đã có.
    if (rendered) { renderShop(); renderPass(); }
  }

  window.HoiShop = {
    init: init,
    render: renderAll,
    onMessage: onMessage,
    send: sendEconomy,
    getBalance: function () { return walletBalance; },
    STUB_LABEL: STUB_LABEL
  };

  window.HoiWallet = {
    set: setWallet,
    get: function () { return walletBalance; }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
