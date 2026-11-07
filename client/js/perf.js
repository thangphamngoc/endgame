// Đo hiệu năng ở client cho KPI-06 — backlog #14 (P3-06), bước 4
// (cycle 26, 2026-11-07).
// Đo 2 số mà BRD §2 yêu cầu:
//   - FPS khi cảnh 3D đang chạy (trung bình + thấp nhất theo từng giây).
//   - Thời gian tải trang đầu (Navigation Timing: loadEventEnd).
// Cách gửi: 1 báo cáo mỗi lần tải trang, chỉ gửi SAU KHI đã vào phòng
// (game.js gọi onJoined() khi nhận 'joined') để server quy được báo cáo
// về phòng thường hay phòng QC. Chơi đơn không có WS nên không gửi —
// KPI-06 chỉ đo người chơi multiplayer (ghi rõ trong BRD §8.1).
// Không gửi tên người chơi, không gửi gì ngoài 5 số dưới đây.
// Giới hạn: FPS đo trong 10 giây đầu sau khi trang tải xong (lúc đó
// người chơi đang ở sảnh chờ, cảnh 3D đã chạy) — không phải FPS giữa
// trận; số này chỉ là mẫu, không thay cho đo FPS trên điện thoại thật
// (backlog #10). Tab bị ẩn thì rAF dừng: bucket nào kéo dài > 2s (tab
// ẩn rồi hiện lại) bị bỏ, không tính vào trung bình.
(function () {
  'use strict';

  var SAMPLE_SEC = 10; // cửa sổ đo FPS (giây) sau khi trang tải xong
  var MAX_FPS = 240; // trần hợp lệ (màn 240Hz); cao hơn là số rác
  var MAX_LOAD_MS = 300000; // 5 phút; cao hơn là số rác

  var loadMs = null; // ms từ lúc bắt đầu điều hướng tới load event
  var buckets = []; // FPS từng giây trong cửa sổ đo
  var sampling = false;
  var joined = false;
  var sent = false;
  var report = null;

  function readLoadMs() {
    try {
      var nav = performance.getEntriesByType
        ? performance.getEntriesByType('navigation')[0]
        : null;
      if (nav && typeof nav.loadEventEnd === 'number' && nav.loadEventEnd > 0) {
        return Math.round(nav.loadEventEnd);
      }
      // Fallback cho trình duyệt cũ (performance.timing đã lỗi thời).
      var t = performance.timing;
      if (t && t.loadEventEnd > 0 && t.navigationStart > 0) {
        return Math.round(t.loadEventEnd - t.navigationStart);
      }
    } catch (_) { /* không đo được thì để null */ }
    return null;
  }

  function startSampling() {
    if (sampling) return;
    sampling = true;
    // KHÔNG đọc loadMs ở đây: startSampling chạy ngay trong sự kiện
    // load nên loadEventEnd vẫn là 0 (sự kiện chưa kết thúc) — đọc ở
    // finishSampling (10s sau) thì số mới đúng.
    var frames = 0;
    var bucketStart = performance.now();
    var elapsed = 0;
    function tick(now) {
      frames += 1;
      elapsed = now - bucketStart;
      if (elapsed >= 1000) {
        // Bucket > 2s nghĩa là tab đã bị ẩn giữa chừng (rAF dừng) —
        // bỏ bucket này, không tính vào trung bình.
        if (elapsed <= 2000) buckets.push((frames / elapsed) * 1000);
        frames = 0;
        bucketStart = now;
      }
      if (buckets.length < SAMPLE_SEC) {
        requestAnimationFrame(tick);
      } else {
        finishSampling();
      }
    }
    requestAnimationFrame(tick);
  }

  function finishSampling() {
    sampling = false;
    if (!buckets.length) { report = null; return; }
    loadMs = readLoadMs(); // đọc lúc này thì loadEventEnd đã có số thật
    var sum = 0, min = Infinity;
    for (var i = 0; i < buckets.length; i++) {
      sum += buckets[i];
      if (buckets[i] < min) min = buckets[i];
    }
    report = {
      type: 'perf',
      loadMs: (typeof loadMs === 'number' && loadMs >= 0 && loadMs <= MAX_LOAD_MS)
        ? loadMs : null,
      fpsAvg: Math.round((sum / buckets.length) * 10) / 10,
      fpsMin: Math.round(min * 10) / 10,
      sampleSec: buckets.length,
      // Có renderer thật thì WebGL đang chạy; null trong headless VM
      // hoặc khi buildWorld lỗi (backlog #24) — đó đúng là tín hiệu cần đếm.
      webgl: !!(window.__game && window.__game.renderer),
    };
    flush();
  }

  function flush() {
    if (sent || !report || !joined) return false;
    if (typeof window.__sendWS !== 'function') return false;
    window.__sendWS(report);
    sent = true;
    return true;
  }

  // Game.js gọi khi đã vào phòng ('joined'): lúc này WS chắc chắn mở
  // nên báo cáo không bị sendWS nuốt mất.
  function onJoined() {
    joined = true;
    flush();
  }

  if (document.readyState === 'complete') startSampling();
  else window.addEventListener('load', startSampling);

  window.__perf = {
    flush: flush,
    onJoined: onJoined,
    get report() { return report; },
    get sent() { return sent; },
    get joined() { return joined; },
    SAMPLE_SEC: SAMPLE_SEC,
  };
})();
