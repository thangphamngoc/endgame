// Sự kiện theo mùa — backlog #16 (P4-06), bước 1 (cycle 25, 2026-11-07).
// Khung đăng ký sự kiện + sự kiện đầu tiên: Tết Hội Làng 2027.
// Phạm vi bước 1: CHỦ ĐỀ (badge sảnh chờ + tông đỏ/vàng) và THÔNG BÁO
// trong game (toast lúc bắt đầu trận). Trò biến thể (ví dụ lì xì Hội Xu,
// trống Tết) là bước 2 — chưa làm.
// Ngày Tết đã kiểm chứng qua web (2026-11-07): mùng 1 Tết Đinh Mùi =
// thứ Bảy 06/02/2027; giao thừa tối 05/02/2027 (tháng Chạp chỉ 29 ngày,
// không có 30 Tết); ông Công ông Táo 30/01/2027; nghỉ lễ chính thức
// 04/02–10/02/2027 (TB 11483/TB-BNV). Cửa sổ sự kiện lấy từ mốc đã
// kiểm chứng: 30/01 (ông Táo) → 10/02/2027 (hết nghỉ lễ).
// Quyết định ĐÃ QUYẾT (xem BRD §6): cửa sổ mùa ghi bằng ngày dương cố
// định theo từng năm; Sudo chốt lại ngày âm lịch mỗi năm trước khi mở.
// Ghi đè để test/QC: ?season=tet (bật) / ?season=none (tắt), hoặc
// localStorage hoilang_season = 'tet' | 'none'. Ưu tiên: URL > storage > ngày.
(function () {
  'use strict';

  var SEASONS = [
    {
      id: 'tet',
      name: 'Tết Hội Làng',
      badge: '🧧 TẾT HỘI LÀNG',
      datesLabel: '30/01 – 10/02/2027',
      // Cửa sổ đã kiểm chứng, xem header file.
      start: '2027-01-30',
      end: '2027-02-10',
      announce: '🧧 Tết Hội Làng — làng đón Tết Đinh Mùi, từ 30/01 đến 10/02/2027!',
      cssClass: 'season-tet'
    }
  ];

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  // Ngày địa phương của trình duyệt, dạng YYYY-MM-DD (so chuỗi là đủ vì
  // cùng định dạng cố định). Tết tính theo giờ Việt Nam (UTC+7); người
  // chơi ở múi giờ khác có thể thấy lệch tối đa 1 ngày ở biên cửa sổ —
  // chấp nhận được cho chủ đề trang trí, không ảnh hưởng luật chơi.
  function todayStr(date) {
    // Duck-typing thay vì instanceof Date: test chạy seasonal.js trong vm
    // nên Date truyền vào thuộc realm khác, instanceof sẽ sai.
    var d = (date && typeof date.getFullYear === 'function') ? date : new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function parseSeasonOverride(search) {
    if (!search) return undefined;
    var m = /(?:\?|&)season=([^&]*)/.exec(search);
    if (!m) return undefined;
    var v = decodeURIComponent(m[1] || '').toLowerCase();
    if (v === 'none' || v === 'off' || v === '0') return null;
    for (var i = 0; i < SEASONS.length; i++) {
      if (SEASONS[i].id === v) return SEASONS[i];
    }
    return undefined; // giá trị lạ: bỏ qua, rơi về logic theo ngày
  }

  function readStoredSeason(storage) {
    try {
      var v = storage && storage.getItem ? storage.getItem('hoilang_season') : null;
      if (v === null || v === undefined || v === '') return undefined;
      v = String(v).toLowerCase();
      if (v === 'none' || v === 'off' || v === '0') return null;
      for (var i = 0; i < SEASONS.length; i++) {
        if (SEASONS[i].id === v) return SEASONS[i];
      }
    } catch (e) { /* storage bị chặn: rơi về logic theo ngày */ }
    return undefined;
  }

  // opts: { now?: Date, search?: string, storage?: Storage } — phục vụ test.
  function detectSeason(now, opts) {
    opts = opts || {};
    var url = parseSeasonOverride(opts.search !== undefined ? opts.search : (typeof window !== 'undefined' && window.location ? window.location.search : ''));
    if (url !== undefined) return url;
    var stored = readStoredSeason(opts.storage !== undefined ? opts.storage : (typeof window !== 'undefined' ? window.localStorage : null));
    if (stored !== undefined) return stored;
    var today = todayStr(now);
    for (var i = 0; i < SEASONS.length; i++) {
      if (today >= SEASONS[i].start && today <= SEASONS[i].end) return SEASONS[i];
    }
    return null;
  }

  function applySeason(season) {
    if (typeof document === 'undefined') return season || null;
    var body = document.body;
    var badge = document.getElementById('seasonBadge');
    SEASONS.forEach(function (s) { if (body) body.classList.remove(s.cssClass); });
    if (!season) {
      if (badge) { badge.classList.add('hidden'); badge.textContent = ''; }
      return null;
    }
    if (body) body.classList.add(season.cssClass);
    if (badge) {
      badge.textContent = season.badge + ' · ' + season.datesLabel;
      badge.classList.remove('hidden');
    }
    return season;
  }

  var _announced = false;
  function announceSeason(season, toastFn) {
    if (!season || _announced || typeof toastFn !== 'function') return false;
    _announced = true;
    toastFn(season.announce);
    return true;
  }

  var api = {
    SEASONS: SEASONS,
    detectSeason: detectSeason,
    parseSeasonOverride: parseSeasonOverride,
    applySeason: applySeason,
    announceSeason: announceSeason,
    todayStr: todayStr,
    // Nhịp trống Tết (P4-06 bước 2c, cycle 39) — biến thể vòng 1 Trống Hội:
    // tum–tum–TUM: 2 tiếng vừa (0.42s, vol 0.9) rồi 1 tiếng vang (0.84s,
    // vol 1.0), lặp lại. Chỉ đổi nhịp âm thanh — luật chạy/đứng yên không
    // đổi. nextTetBeat(idx) thuần túy để test được trong vm (game.js chỉ
    // gọi nó trong updateSingleR1 khi mùa Tết đang chạy).
    TET_BEAT_PATTERN: [0.42, 0.42, 0.84],
    TET_BEAT_VOLS: [0.9, 0.9, 1.0],
    nextTetBeat: function (idx) {
      var i = ((idx % 3) + 3) % 3;
      return { delay: [0.42, 0.42, 0.84][i], vol: [0.9, 0.9, 1.0][i], next: idx + 1 };
    }
  };

  if (typeof window !== 'undefined') {
    window.__seasonal = api;
    window.__season = null;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
