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
 * KPI-07 — bước 3 (cycle 24, 2026-11-07): "Trận bỏ dở" = trận đã bắt
 * đầu (recordMatchStart đã chạy) nhưng phòng bị xóa (dropMatch) trước
 * khi recordMatchEnd — mọi người rời phòng giữa trận, trận không có
 * kết quả. Đếm vào totals.matchesAbandoned (+ abandonedPlayersTotal =
 * số người trong các trận bỏ dở); phòng QC tách riêng
 * (qcMatchesAbandoned), không vào mẫu số KPI. abandonRate =
 * matchesAbandoned / (matchesFinished + matchesAbandoned) — tỉ lệ
 * trong số trận đã có kết cục; trận đang chạy chưa tính. Mục tiêu đề
 * xuất < 5% (BRD §2).
 *   Sửa kèm trong dropMatch: trận đã kết thúc (endedAt đã set, đang
 *   trong grace 30s) mà phòng bị xóa thì CHỐT NGAY số đếm như trận đã
 *   kết thúc (flushMatch) thay vì hủy timer — trước đây trận đó mất
 *   khỏi thống kê nếu mọi người rời phòng trong 30s sau màn hình kết
 *   thúc. Phòng chưa bắt đầu trận mà bị xóa: không tính bỏ dở (như
 *   KPI-02). dropMatch 2 lần trên cùng trận chỉ đếm 1 lần (bản ghi đã
 *   xóa khỏi liveMatches).
 *   Giới hạn: server restart giữa trận làm mất bản ghi RAM nên trận đó
 *   không đếm được vào bỏ dở — chỉ đếm được trận bỏ dở do phòng trống.
 *   "Bỏ dở" ở đây là mọi người rời phòng; trận kẹt do lỗi mà không ai
 *   rời thì không kẹt được lâu vì đã có deadline vòng + deadline trận
 *   tổng (P1-07) ép kết thúc có kết quả.
 * Chưa đo sau bước 3: KPI-06 (FPS/tải trang, đo ở client), KPI-08
 * (cần tính năng tố cáo).
 *
 * KPI-02 — bước 2 (cycle 23, 2026-11-07): "Phòng 20 người đủ trong
 * ≤ 5 phút (giờ cao điểm)" (BRD §2). Đo bằng liveRooms (chỉ RAM):
 *   recordRoomCreated(room) — lúc makeRoom (tạo phòng + tràn phòng đầy
 *     456 sang phòng mới đều đi qua makeRoom).
 *   recordLobbyJoin(room) — sau mỗi lần thêm người vào phòng đang ở
 *     sảnh chờ; lần đầu đạt 20 người (không tính khán giả) thì chốt
 *     filled20Ms = thời gian từ lúc tạo phòng tới lúc đủ 20.
 *   recordMatchStart(room) — chốt vào totals: roomsFilled20 (phòng đã
 *     đủ 20 trước khi bắt đầu), roomsFilled20Within5Min (đủ 20 trong
 *     ≤ 300000 ms), totalFill20Ms (tổng để tính trung bình),
 *     matchesStartedUnder20 (trận bắt đầu khi chưa đủ 20 người).
 * Quy ước ĐÃ QUYẾT: "đủ 20" tính theo LẦN ĐẦU đạt 20 — phòng đủ 20
 * rồi có người rời trước khi bắt đầu vẫn tính là đã đủ (thời gian lấp
 * đầy là thời gian tới lần đầu đủ, không phải số người lúc bắt đầu);
 * số người lúc bắt đầu đo riêng bằng matchesStartedUnder20.
 * Phòng QC không tính (giống KPI-01/03/04/05). Phòng bị xóa khi chưa
 * bắt đầu trận (dropMatch) thì bỏ bản ghi, không vào mẫu số.
 *
 * Cách server.js tích hợp (thêm ở bước 2):
 *   makeRoom:            analytics.recordRoomCreated(room)
 *   'create'/'join' lobby: analytics.recordLobbyJoin(room) sau khi
 *                          thêm người chơi vào room.players
 *   startMatch:          analytics.recordMatchStart(room) (đã có)
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
 * Từ bước 3 (cycle 24, KPI-07): trận bỏ dở được ĐẾM (xem dropMatch) —
 * chỉ trận bỏ dở do server restart vẫn không đếm được (mất bản ghi RAM).
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
    // KPI-02 (bước 2, cycle 23): lấp đầy phòng tới 20 người.
    roomsFilled20: 0, // phòng đã đủ 20 người trước khi bắt đầu trận
    roomsFilled20Within5Min: 0, // trong số đó, đủ 20 trong ≤ 5 phút
    totalFill20Ms: 0, // tổng thời gian tới lúc đủ 20 (để tính trung bình)
    matchesStartedUnder20: 0, // trận bắt đầu khi chưa đủ 20 người
    // KPI-07 (bước 3, cycle 24): trận bỏ dở.
    matchesAbandoned: 0, // trận đã bắt đầu nhưng phòng bị xóa trước khi kết thúc
    abandonedPlayersTotal: 0, // số người trong các trận bỏ dở
    qcMatchesAbandoned: 0,
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

// KPI-02: bản ghi 1 phòng đang ở sảnh chờ (chỉ RAM, key = room.code):
// { createdAt, filled20Ms (null nếu chưa đủ 20), qc }. Xóa khi trận
// bắt đầu (recordMatchStart) hoặc phòng bị xóa (dropMatch).
const liveRooms = new Map();
const FILL_TARGET = 20;
const FILL_TARGET_MS = 5 * 60 * 1000; // 5 phút (mục tiêu BRD §2, KPI-02)

function recordRoomCreated(room) {
  if (!room || !room.code) return;
  liveRooms.set(room.code, { createdAt: Date.now(), filled20Ms: null, qc: !!room.qc });
}

function recordLobbyJoin(room) {
  if (!room || !room.code) return;
  const r = liveRooms.get(room.code);
  if (!r || r.filled20Ms != null) return;
  const n = room.players ? [...room.players.values()].filter((p) => !p.spectator).length : 0;
  if (n >= FILL_TARGET) r.filled20Ms = Date.now() - r.createdAt;
}

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
  // KPI-02: chốt số lấp đầy của phòng này rồi xóa bản ghi sảnh chờ.
  // Phòng QC không tính (giống các KPI khác).
  const lr = liveRooms.get(room.code);
  liveRooms.delete(room.code);
  if (room.qc) totals.qcMatchesStarted += 1;
  else {
    totals.matchesStarted += 1;
    totals.playersTotal += starters;
    if (starters < FILL_TARGET) totals.matchesStartedUnder20 += 1;
    if (lr && lr.filled20Ms != null) {
      totals.roomsFilled20 += 1;
      totals.totalFill20Ms += lr.filled20Ms;
      if (lr.filled20Ms <= FILL_TARGET_MS) totals.roomsFilled20Within5Min += 1;
    }
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

// Trận bỏ dở (phòng trống giữa chừng): đếm vào KPI-07 — xem ghi chú
// đầu file. Hủy cả timer chốt nếu trận đã kết thúc nhưng chưa qua
// grace: trận đó được CHỐT NGAY như trận đã kết thúc (flushMatch) thay
// vì bị hủy. Phòng chưa bắt đầu trận thì bỏ luôn bản ghi sảnh chờ
// (KPI-02) — không vào mẫu số. Gọi 2 lần trên cùng trận chỉ đếm 1 lần.
function dropMatch(room) {
  if (!room) return;
  liveRooms.delete(room.code);
  const key = matchKey(room);
  const m = liveMatches.get(key);
  if (!m) return;
  if (m.flushTimer) { clearTimeout(m.flushTimer); m.flushTimer = null; }
  if (m.endedAt) {
    flushMatch(key, m);
    return;
  }
  liveMatches.delete(key);
  if (m.qc) totals.qcMatchesAbandoned += 1;
  else {
    totals.matchesAbandoned += 1;
    totals.abandonedPlayersTotal += m.players;
  }
  save();
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
      // KPI-02: tỉ lệ phòng đủ 20 người trước khi bắt đầu (mẫu số =
      // trận đã bắt đầu, không tính QC); tỉ lệ đủ trong ≤ 5 phút tính
      // trên số phòng đã đủ 20; thời gian lấp đầy trung bình (giây).
      // Mục tiêu đề xuất: phòng 20 người đủ trong ≤ 5 phút (giờ cao điểm).
      fill20Rate: rate(totals.roomsFilled20, totals.matchesStarted),
      fill20Within5MinRate: rate(totals.roomsFilled20Within5Min, totals.roomsFilled20),
      avgFill20Sec: totals.roomsFilled20
        ? Math.round(totals.totalFill20Ms / totals.roomsFilled20 / 100) / 10
        : null,
      under20StartRate: rate(totals.matchesStartedUnder20, totals.matchesStarted),
      // KPI-03: tỉ lệ người chơi dùng chat (mục tiêu đề xuất >= 0.3).
      chatRate: rate(totals.chatters, totals.playersFinishedMatches),
      matchesWithChatRate: rate(totals.matchesWithChat, totals.matchesFinished),
      // KPI-04: tỉ lệ người bị loại dùng du lịch (mục tiêu >= 0.4).
      tourRate: rate(totals.tourUsers, totals.eliminatedTotal),
      // KPI-05: tỉ lệ trận có chơi lại (mục tiêu đề xuất >= 0.5).
      replayRate: rate(totals.matchesWithReplay, totals.matchesFinished),
      // KPI-07: tỉ lệ trận bỏ dở trong số trận đã có kết cục (đã kết thúc
      // + bỏ dở); trận đang chạy chưa tính. Mục tiêu đề xuất < 0.05.
      abandonRate: rate(totals.matchesAbandoned, totals.matchesFinished + totals.matchesAbandoned),
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
  recordRoomCreated,
  recordLobbyJoin,
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
    liveRooms.clear();
    save();
  },
};
