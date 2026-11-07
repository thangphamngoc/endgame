'use strict';
/**
 * analytics.js — Analytics tối thiểu (P3-06, cycle 20 bước 1).
 *
 * Đếm ở phía server, KHÔNG lưu tên người chơi, KHÔNG lưu nội dung chat,
 * KHÔNG lưu tọa độ/vị trí. Chỉ lưu số đếm tổng hợp + tỉ lệ KPI trong
 * data/analytics.json (ghi lại mỗi khi 1 trận kết thúc / bắt đầu).
 *
 * KPI đo được ở bước 1 (định nghĩa theo BRD §2):
 *   KPI-01 hoàn thành = trận tới được vòng 2 VÀ có người thắng
 *          / trận đã kết thúc (trận QC không tính).
 *   KPI-03 dùng chat = người gửi ≥1 tin / người trong trận đã kết thúc.
 *   KPI-04 du lịch = người bị loại mở tour ≥1 lần / người bị loại
 *          trong trận đã kết thúc.
 *   KPI-05 chơi lại = trận có ≥1 lượt replay / trận đã kết thúc.
 * Chưa đo ở bước 1: KPI-02 (thời gian lấp đầy phòng — cần log lúc vào
 * phòng chờ), KPI-06 (FPS/tải trang — đo ở client), KPI-07 (trận kẹt —
 * cần đếm trận bỏ dở), KPI-08 (cần tính năng tố cáo).
 *
 * Cách server.js tích hợp:
 *   const analytics = require('./analytics');
 *   // startMatch:      analytics.recordMatchStart(room)
 *   // startRound n>=2: analytics.recordRoundStart(room, n)
 *   // eliminatePlayer: analytics.recordElimination(room, player.id)
 *   // chat:            analytics.recordChat(room, player.id)
 *   // msg 'tour':      analytics.recordTour(room, player.id) (chỉ khi
 *   //                  người đó đã bị loại — server tự kiểm tra alive)
 *   // replay:          analytics.recordReplay(room)
 *   // endMatch:        analytics.recordMatchEnd(room, reason, winner)
 *   // HTTP:            GET /analytics -> analytics.summary()
 *
 * Trận QC được ghi nhận riêng (qcMatchesStarted/Finished) và KHÔNG đưa
 * vào mẫu số KPI — giống cách economy miễn thưởng cho phòng QC.
 * Trận bỏ dở (phòng trống giữa chừng, server restart) không được tính
 * là "đã kết thúc": bản ghi trận đó bị hủy khi phòng bị xóa.
 *
 * Grace sau khi trận kết thúc (FLUSH_GRACE_MS): tour mở và replay đều
 * xảy ra TRÊN MÀN HÌNH KẾT THÚC, tức là SAU endMatch — nếu chốt số đếm
 * ngay lúc endMatch thì KPI-04/KPI-05 mất đúng những lượt đó (người bị
 * loại ở lượt cắt cuối cùng mở tour ngay sau khi trận kết thúc là trường
 * hợp thường gặp nhất). Vì vậy endMatch chỉ đánh dấu trận đã xong và
 * hẹn chốt số sau 30 giây; các sự kiện tour/replay/chat tới trong
 * khoảng đó vẫn được tính. /analytics trong 30 giây đó chưa thấy trận
 * này — chấp nhận được (số liệu tổng hợp, không phải realtime).
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'analytics.json');

function blankTotals() {
  return {
    matchesStarted: 0,
    matchesFinished: 0,
    matchesCompleted: 0, // tới vòng 2 + có người thắng (KPI-01)
    matchesReachedRound2: 0,
    playersTotal: 0, // số người bắt đầu trận (1 người chơi nhiều trận đếm nhiều lần)
    playersFinishedMatches: 0, // số người trong các trận đã kết thúc (mẫu số KPI-03)
    chatters: 0, // số người (theo trận) gửi >=1 tin trong trận đã kết thúc
    matchesWithChat: 0,
    eliminatedTotal: 0, // số người bị loại trong các trận đã kết thúc (mẫu số KPI-04)
    tourUsers: 0, // số người bị loại mở tour >=1 lần (theo trận)
    matchesWithReplay: 0,
    replaysTotal: 0,
    totalDurationMs: 0,
    qcMatchesStarted: 0,
    qcMatchesFinished: 0,
    updatedAt: null,
  };
}

let totals = blankTotals();
try {
  if (fs.existsSync(DATA_FILE)) {
    const loaded = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    if (loaded && typeof loaded === 'object') totals = Object.assign(blankTotals(), loaded);
  }
} catch (e) {
  console.error('[analytics] Không đọc được data/analytics.json, bắt đầu rỗng:', e.message);
}

function save() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    totals.updatedAt = new Date().toISOString();
    fs.writeFileSync(DATA_FILE, JSON.stringify(totals, null, 2), 'utf8');
  } catch (e) {
    console.error('[analytics] Không lưu được data/analytics.json:', e.message);
  }
}

// Bản ghi 1 trận đang chạy (chỉ trong RAM, không ghi file): key =
// room.code + ':' + matchStart để 2 trận liên tiếp cùng phòng không lẫn.
const liveMatches = new Map();

function matchKey(room) {
  return room.code + ':' + (room.matchStart || 0);
}

function recordMatchStart(room) {
  if (!room) return;
  const starters = [...room.players.values()].filter((p) => !p.spectator).length;
  liveMatches.set(matchKey(room), {
    matchId: room.matchId,
    qc: !!room.qc,
    players: starters,
    chatters: new Set(),
    eliminated: new Set(),
    tourUsers: new Set(),
    replays: 0,
    reachedRound2: false,
    startTime: room.matchStart || Date.now(),
  });
  if (room.qc) totals.qcMatchesStarted += 1;
  else {
    totals.matchesStarted += 1;
    totals.playersTotal += starters;
  }
  save();
}

function recordRoundStart(room, n) {
  const m = room && liveMatches.get(matchKey(room));
  if (!m) return;
  if (n >= 2) m.reachedRound2 = true;
}

function recordElimination(room, playerId) {
  const m = room && liveMatches.get(matchKey(room));
  if (!m || playerId == null) return;
  m.eliminated.add(playerId);
}

function recordChat(room, playerId) {
  const m = room && liveMatches.get(matchKey(room));
  if (!m || playerId == null) return;
  m.chatters.add(playerId);
}

function recordTour(room, playerId) {
  const m = room && liveMatches.get(matchKey(room));
  if (!m || playerId == null) return;
  // Chỉ đếm người đã bị loại (mở tour từ sảnh chờ không tính vào KPI-04).
  if (!m.eliminated.has(playerId)) return;
  m.tourUsers.add(playerId);
}

function recordReplay(room) {
  const m = room && liveMatches.get(matchKey(room));
  if (!m) return;
  m.replays += 1;
}

// Chốt số đếm của 1 trận vào totals (gọi sau grace — xem recordMatchEnd).
function flushMatch(key, m) {
  liveMatches.delete(key);
  const durationMs = Date.now() - m.startTime;
  if (m.qc) {
    totals.qcMatchesFinished += 1;
    save();
    return;
  }
  totals.matchesFinished += 1;
  totals.totalDurationMs += durationMs;
  totals.playersFinishedMatches += m.players;
  totals.chatters += m.chatters.size;
  if (m.chatters.size > 0) totals.matchesWithChat += 1;
  totals.eliminatedTotal += m.eliminated.size;
  totals.tourUsers += m.tourUsers.size;
  if (m.replays > 0) totals.matchesWithReplay += 1;
  totals.replaysTotal += m.replays;
  if (m.reachedRound2) totals.matchesReachedRound2 += 1;
  // KPI-01: trận tới được vòng 2 VÀ có người thắng.
  if (m.reachedRound2 && m.winner) totals.matchesCompleted += 1;
  save();
}

const FLUSH_GRACE_MS = 30000;

function recordMatchEnd(room, reason, winner) {
  const key = room && matchKey(room);
  const m = key && liveMatches.get(key);
  if (!m || m.endedAt) return;
  // Đánh dấu đã xong nhưng chưa chốt: tour/replay trên màn hình kết thúc
  // trong 30 giây sau vẫn được tính (xem ghi chú grace ở đầu file).
  m.endedAt = Date.now();
  m.endReason = reason;
  m.winner = !!winner;
  m.flushTimer = setTimeout(() => flushMatch(key, m), FLUSH_GRACE_MS);
  if (m.flushTimer && typeof m.flushTimer.unref === 'function') m.flushTimer.unref();
}

// Trận bỏ dở (phòng trống giữa chừng): hủy bản ghi, không tính vào
// "đã kết thúc" — xem ghi chú đầu file về KPI-07. Hủy cả timer chốt
// nếu trận đã kết thúc nhưng chưa qua grace.
function dropMatch(room) {
  if (!room) return;
  const m = liveMatches.get(matchKey(room));
  if (m && m.flushTimer) clearTimeout(m.flushTimer);
  liveMatches.delete(matchKey(room));
}

function rate(num, den) {
  if (!den) return null;
  return Math.round((num / den) * 10000) / 10000;
}

function summary() {
  return {
    totals: Object.assign({}, totals),
    kpi: {
      // KPI-01: tỉ lệ trận hoàn thành (mục tiêu đề xuất >= 0.8).
      completionRate: rate(totals.matchesCompleted, totals.matchesFinished),
      round2Rate: rate(totals.matchesReachedRound2, totals.matchesFinished),
      // KPI-03: tỉ lệ người chơi dùng chat (mục tiêu đề xuất >= 0.3).
      chatRate: rate(totals.chatters, totals.playersFinishedMatches),
      matchesWithChatRate: rate(totals.matchesWithChat, totals.matchesFinished),
      // KPI-04: tỉ lệ người bị loại dùng du lịch (mục tiêu >= 0.4).
      tourRate: rate(totals.tourUsers, totals.eliminatedTotal),
      // KPI-05: tỉ lệ trận có chơi lại (mục tiêu đề xuất >= 0.5).
      replayRate: rate(totals.matchesWithReplay, totals.matchesFinished),
      avgDurationSec: totals.matchesFinished
        ? Math.round(totals.totalDurationMs / totals.matchesFinished / 100) / 10
        : null,
      avgPlayersPerMatch: totals.matchesStarted
        ? Math.round((totals.playersTotal / totals.matchesStarted) * 10) / 10
        : null,
    },
    liveMatches: liveMatches.size,
  };
}

module.exports = {
  recordMatchStart,
  recordRoundStart,
  recordElimination,
  recordChat,
  recordTour,
  recordReplay,
  recordMatchEnd,
  dropMatch,
  summary,
  // Chỉ dùng cho test: chốt ngay mọi trận đang chờ grace.
  __flushAllForTest() {
    for (const [key, m] of [...liveMatches.entries()]) {
      if (m.flushTimer) { clearTimeout(m.flushTimer); m.flushTimer = null; }
      if (m.endedAt) flushMatch(key, m);
    }
  },
  // Chỉ dùng cho test: reset toàn bộ số đếm + trận đang chạy.
  __resetForTest() {
    for (const m of liveMatches.values()) if (m.flushTimer) clearTimeout(m.flushTimer);
    totals = blankTotals();
    liveMatches.clear();
    save();
  },
};
