'use strict';
/**
 * Trống Hội & Cầu Khỉ — game server (số vòng KHÔNG giới hạn, seeded, scale 456).
 * Node.js + WebSocket (ws), không framework. Vừa phục vụ file client tĩnh,
 * vừa làm game server có thẩm quyền cho chế độ multiplayer.
 *
 * Luật ràng buộc:
 * - Trống = chạy, chiêng = đứng yên tuyệt đối. Server quyết định nhịp và loại.
 * - CHIA TEAM chỉ để chia lượt, không có team thắng/thua, không xếp hạng team.
 * - Cầu Khỉ: ván yếu random phía server (seeded), rớt là loại cá nhân.
 * - Kéo Co Nhịp là trò đồng đội DUY NHẤT có loại theo đội (luật đã chốt, xem dưới).
 * - Chat: tối đa 120 ký tự (kiểm tra TRƯỚC khi cắt), chống spam 2 giây/tin.
 * - Seed = hash(roomCode + matchId + round). Mọi random gameplay dùng seeded RNG.
 *
 * GIAO THỨC WebSocket (JSON, trường `type`) — giữ nguyên các type cũ:
 *   Client -> Server (cũ): list, create, join, start, pos, chat, bridge, replay
 *   Server -> Client (cũ): welcome, rooms, joined, players, playerPos, phase,
 *     drum, eliminated, turn, bridgeUpdate, ranking, chat, error
 *   MỚI — Client -> Server:
 *     input {dx, dz, jump}        : di chuyển theo input, server tính vị trí
 *                                   (tốc độ tối đa 9 u/s, kẹp trong sân).
 *                                   pos chỉ còn dùng cho R1/R2 tương thích;
 *                                   ở vòng 3-6 server KHÔNG tin pos.
 *     tug {power}                 : Kéo Co — gõ theo nhịp trống (tối đa 1/300ms).
 *     trace {score}               : Nặn Tò He — điểm tương đồng 0-100 do client
 *                                   tính (server kiểm tra 0-100 + hệ số khó seeded).
 *     trace {points:[[x,y],...]}  : Nặn Tò He — server tự chấm theo khoảng cách
 *                                   tới mẫu (ưu tiên hơn score nếu có points).
 *     oanquan {pit}               : Ô Ăn Quan — chọn ô (0-11), server kiểm tra
 *                                   lượt + ô của mình (chỉ ô dân bên mình:
 *                                   bên 0 = ô 1-5, bên 1 = ô 7-11; ô quan 0/6
 *                                   không được rải) + tính rải/cướp quân.
 *     hop {}                      : Nhảy Bao Bố — nhảy theo vạch nhịp của server.
 *     reconnect {token}           : quay lại đúng slot trong 30 giây ân hạn.
 *     economy {action, ...}       : ủy quyền cho server/economy.js nếu có,
 *                                   chưa có thì trả lỗi 'Economy chưa sẵn sàng.'
 *     QC — Client -> Server (FR-46, chỉ phòng QC):
 *     create {qc:true, startRound:1+, noElim:bool} : tạo phòng QC, bốc
 *                                   bản xem trước vòng 3-5 ngay lúc tạo.
 *     qcSkip {round:1+}             : host nhảy thẳng tới vòng đó giữa trận
 *                                   (vòng 2 đi qua CHIA TEAM, lượt xáo theo
 *                                   seed vì không có thời gian về đích V1).
 *                                   Không giới hạn ở vòng 6 — nhảy được tới
 *                                   vòng 7, 8, ... để test các vòng sau.
 *     QC — Server -> Client: joined/phase 'team' kèm {qc, startRound,
 *     noElim, plan:[{round,game,name,timeLimit}]}; phòng QC không thưởng
 *     Hội Xu / XP (recordMatchPlayed / awardRoundSurvived / awardWin /
 *     recordChatSent đều bị chặn) và economy bị từ chối trong phòng QC.
 *   MỚI — Server -> Client:
 *     reconnectToken {token}      : gửi kèm `joined`, dùng để reconnect.
 *     roundStart {round, game, name, timeLimit, seed}
 *     roundEnd {round, game, survivors, eliminated:[ids]}
 *     tick {t, players:[{id,x,z,alive}]} : snapshot 15Hz, AOI 40 đơn vị
 *                                   (+ leader / người giữ cờ luôn gửi).
 *     tugState {sidePower:[a,b], threshold, timeLeft}
 *     traceTarget {shape, points} : mẫu Nặn Tò He (1 trong 6 hình seeded).
 *     blind {blind, goatId}       : Bịt Mắt — true = người đi tìm (tối màn hình),
 *                                   goatId = id dê của nhóm mình (người tìm
 *                                   dùng để vẽ ánh dê phát sáng + la bàn theo
 *                                   vị trí thật; dê nhận blind:false + goatId
 *                                   là id của chính mình).
 *     cue {dir, dist}             : Bịt Mắt — gợi ý âm thanh mỗi 2s cho người tìm
 *                                   (dự phòng khi dê ngoài AOI 40 của tick).
 *     caught {goatId, seekerId}   : Bịt Mắt — dê bị bắt.
 *     flag {holderId}             : Rồng Rắn — ai đang giữ cờ.
 *     oanquanState {board, turnId, scores, sides}
 *                                   sides = {playerId: 0|1} — bên của mỗi người
 *                                   (0 = ô 1-5, 1 = ô 7-11), client dùng để
 *                                   chỉ cho bấm ô bên mình.
 *     hopState {progress:{id: n}, beatPhase}
 *     tugResult / traceResult      : (thông qua roundEnd + players)
 *   HTTP: GET /health -> {ok:true, rooms, players, uptime}
 *         GET /        -> client/index.html (file tĩnh như cũ)
 *
 * ĐƯỜNG LOẠI (games.scaledTargets, KHÔNG GIỚI HẠN SỐ VÒNG — Sudo 2026-11-06):
 * tỉ lệ giữ lại áp theo chu kỳ (0.614, 0.536, 0.467, 0.343, 0.25, 0.167)
 * cho tới khi chỉ còn 1 người thắng; 456 người thì đúng đường loại
 * 456 -> 280 -> 150 -> 70 -> 24 -> 6 -> 1 (thường 6 vòng), nhưng một trận
 * có thể dài hơn nếu người chơi đều chơi tốt. Mỗi vòng đều có mục tiêu
 * giữ lại (roundTarget, là đích để các trò xếp hạng cắt về) và bị CẮT ÉP
 * TỐI THIỂU 1 người nếu luật riêng của trò chưa loại ai — không vòng nào
 * kết thúc mà không loại ai (trừ khi chỉ còn 1 người). Rồng Rắn Cướp Cờ KHÔNG còn cố định ở vòng 6: nó chỉ
 * là vòng CHUNG KẾT khi lúc bắt đầu vòng chỉ còn <= 6 người sống.
 * KÉO CO — LUẬT ĐÃ CHỐT: nếu số người lúc bắt đầu R3 >= 24 thì đội thua bị
 * loại toàn bộ; nếu < 24 thì chỉ loại 2 người đóng góp thấp nhất của đội thua
 * (hoặc toàn bộ đội thua nếu đội đó <= 2 người).
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const WebSocket = require('ws');
const games = require('./games');

let economy = null;
try { economy = require('./economy'); } catch (e) { economy = null; }
function econSafe(fn) { if (!economy) return; try { fn(economy); } catch (e) { logEvent('error', { kind: 'economy_hook', message: String(e && e.message) }); } }

// Analytics tối thiểu P3-06 (cycle 20, bước 1): đếm tổng hợp, không lưu
// tên người chơi hay nội dung chat. analyticsSafe bọc giống econSafe để
// analytics hỏng không bao giờ làm chết trận.
const analytics = require('./analytics');
function analyticsSafe(fn) { try { return fn(analytics); } catch (e) { logEvent('error', { kind: 'analytics_hook', message: String(e && e.message) }); return null; } }

const PORT = Number(process.env.PORT || 3000);
const CLIENT_DIR = path.join(__dirname, '..', 'client');
const START_Z = 35;
const FINISH_Z = -35;
const MAX_PLAYERS_PER_ROOM = 456;
const SUB_ARENA_SIZE = 57;
const TICK_MS = 66; // ~15 Hz
const MAX_SPEED = 9; // units / second
const ARENA_X = 20;
const ARENA_Z_MIN = -40;
const ARENA_Z_MAX = 40;
const RECONNECT_GRACE_MS = 30000;
// Timer trận tổng P1-07 (giây): server là nguồn chuẩn; client chỉ hiển thị.
// Mặc định lấy từ games.MATCH_TIME_LIMIT (30 phút); đổi bằng env khi test.
// Phòng QC được miễn (matchDeadline = 0).
const MATCH_TIME_LIMIT_S = Number(process.env.MATCH_TIME_LIMIT_S || games.MATCH_TIME_LIMIT);
const BANNED_WORDS = [
  'fuck', 'shit', 'bitch', 'dick', 'pussy', 'cunt', 'whore',
  'dm', 'dcm', 'dit', 'lon', 'cac', 'buoi', 'du ma', 'duma', 'clgt', 'vcl',
  'đm', 'đcm', 'địt', 'lồn', 'cặc', 'buồi', 'đụ', 'đù má',
];
const STARTED_AT = Date.now();

function logEvent(event, data) {
  try {
    console.log(JSON.stringify(Object.assign({ ts: new Date().toISOString(), event }, data || {})));
  } catch (e) { /* never crash on logging */ }
}

// P3-05 (cycle 19, bước 1): lỗi chết người phải để lại 1 dòng log có cấu
// trúc rồi thoát với mã != 0 để supervisor (server/supervisor.js) chạy
// lại server — trước đây crash là chết lặng, không dòng log nào, không ai
// chạy lại. Không try/catch ở đây: exit(1) là hành vi cố ý.
process.on('uncaughtException', (err) => {
  logEvent('fatal', {
    kind: 'uncaught_exception',
    message: String(err && err.message),
    stack: String(err && err.stack || '').split('\n').slice(0, 5).join(' | '),
  });
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  logEvent('fatal', {
    kind: 'unhandled_rejection',
    message: String(reason && reason.message ? reason.message : reason),
  });
  process.exit(1);
});

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
};

function serveStatic(req, res) {
  // P3-05 (cycle 19, bước 1): access log có cấu trúc — 1 dòng JSON mỗi
  // request (method, path, status, ms). Dùng res 'finish' nên cả /health,
  // 403, 404 đều được ghi; logEvent không bao giờ throw.
  const reqStartedAt = Date.now();
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  res.on('finish', () => {
    logEvent('http_request', { method: req.method, path: urlPath, status: res.statusCode, ms: Date.now() - reqStartedAt });
  });
  if (urlPath === '/health') {
    let players = 0;
    for (const r of rooms.values()) players += r.players.size;
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true, rooms: rooms.size, players, uptime: Math.floor((Date.now() - STARTED_AT) / 1000), pid: process.pid, startedAt: new Date(STARTED_AT).toISOString() }));
    return;
  }
  // P3-06 (cycle 20, bước 1): số đếm tổng hợp + tỉ lệ KPI-01/03/04/05.
  // Chỉ số tổng hợp, không có tên người chơi hay nội dung chat.
  // TODO (bước sau): chỉ cho admin/host xem khi mở public.
  if (urlPath === '/analytics') {
    const data = analyticsSafe(() => analytics.summary());
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(data || { totals: {}, kpi: {}, liveMatches: 0 }));
    return;
  }
  let p = urlPath === '/' ? '/index.html' : urlPath;
  const safe = path.normalize(p).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(CLIENT_DIR, safe);
  if (!filePath.startsWith(CLIENT_DIR)) { res.writeHead(403); res.end('Forbidden'); return; }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer(serveStatic);
const wss = new WebSocket.Server({ server });

let nextPlayerId = 1;
let nextMatchId = 1;
const rooms = new Map(); // code -> room
const clients = new Map(); // ws -> { id, name, roomCode, posCount, posWindowStart, joinCount, joinWindowStart }
const reconnectTokens = new Map(); // token -> { roomCode, playerId, expiresAt, timeout }

function randomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[crypto.randomInt(chars.length)];
  return rooms.has(code) ? randomCode() : code;
}
function makeReconnectToken() { return crypto.randomBytes(16).toString('hex'); }
function send(ws, obj) { try { if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj)); } catch (e) {} }
function broadcast(room, obj, exceptWs) {
  for (const p of room.players.values()) {
    if (p.ws && p.ws !== exceptWs) send(p.ws, obj);
  }
}
// P3-07 (cycle 18): lọc tên người chơi — server là nguồn chuẩn; client kiểm
// trước bằng cùng luật để báo ngay (xem client/js/game.js validatePlayerName).
// Luật ĐÃ QUYẾT (BRD §6): tối đa 24 ký tự (khớp maxlength của ô nhập);
// phải có ít nhất 1 chữ cái/chữ số; ký tự đặc biệt tối đa 3 và không 3 cái
// liên tiếp (emoji cũng tính là ký tự đặc biệt); từ cấm kiểm cả dạng bỏ dấu
// để chống lách bằng dấu tổ hợp/ký tự zero-width.
const NAME_MAX_LEN = 24;
const NAME_MAX_SPECIALS = 3;
function stripDiacritics(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
}
function validateName(raw) {
  const name = String(raw == null ? '' : raw)
    .normalize('NFC')
    .replace(/[\u0000-\u001f\u007f\u200b-\u200d\ufeff]/g, '')
    .trim();
  if (!name) return { ok: true, name: 'Người chơi' };
  if (name.length > NAME_MAX_LEN) return { ok: false, reason: 'Tên tối đa 24 ký tự.' };
  if (!/[\p{L}\p{N}]/u.test(name)) return { ok: false, reason: 'Tên phải có ít nhất một chữ cái hoặc chữ số.' };
  let specials = 0, run = 0;
  for (const ch of name) {
    if (/[\p{L}\p{N} ]/u.test(ch)) { run = 0; continue; }
    specials++; run++;
    if (run >= 3) return { ok: false, reason: 'Tên không được có 3 ký tự đặc biệt liên tiếp.' };
  }
  if (specials > NAME_MAX_SPECIALS) return { ok: false, reason: 'Tên có quá nhiều ký tự đặc biệt (tối đa 3 ký tự như - _ .).' };
  const lower = name.toLowerCase();
  const plain = stripDiacritics(lower);
  for (const w of BANNED_WORDS) {
    if (w && (lower.includes(w) || plain.includes(stripDiacritics(w)))) return { ok: false, reason: 'Tên chứa từ không phù hợp.' };
  }
  return { ok: true, name };
}
function rateLimitPos(info) {
  const now = Date.now();
  if (now - info.posWindowStart >= 1000) { info.posWindowStart = now; info.posCount = 0; }
  info.posCount++;
  return info.posCount <= 30;
}
function rateLimitJoin(info) {
  const now = Date.now();
  if (now - info.joinWindowStart >= 60000) { info.joinWindowStart = now; info.joinCount = 0; }
  info.joinCount++;
  return info.joinCount <= 5;
}
function publicPlayers(room) {
  return [...room.players.values()].map((p) => ({
    id: p.id, name: p.name, isHost: p.isHost, alive: p.alive,
    team: p.team, x: p.x, z: p.z, finished: p.finished, finishTime: p.finishTime,
    spectator: p.spectator, bridgeStep: p.bridgeStep,
    tugSide: p.tugSide != null ? p.tugSide : undefined,
    disconnected: !p.ws,
  }));
}
function roomSummary(room) {
  return { code: room.code, count: room.players.size, phase: room.phase, qc: !!room.qc };
}
// Trạng thái trận cho người vào giữa trận (khán giả / reconnect, P1-07):
// HUD của họ phải hiện đúng vòng + trò đang chơi và đúng đồng hồ (tổng +
// vòng) thay vì mặc định vòng 1 / 0:00. Trả null khi đang ở sảnh (chưa có
// trận) để client bỏ qua.
function matchStateForClient(room) {
  if (!room || room.phase === 'lobby' || !room.matchStart) return null;
  return {
    round: room.round, roundGame: room.roundGame, roundName: room.roundName,
    matchElapsed: Date.now() - room.matchStart,
    matchTimeLimit: room.qc ? 0 : MATCH_TIME_LIMIT_S,
    roundTimeLimit: room.roundTimeLimit || 0,
    roundEndsIn: room.roundDeadline ? Math.max(0, room.roundDeadline - Date.now()) : 0,
  };
}
function broadcastLobbyList() {
  const list = [...rooms.values()].filter((r) => r.phase === 'lobby').map(roomSummary);
  for (const [ws, info] of clients.entries()) {
    if (!info.roomCode) send(ws, { type: 'rooms', rooms: list });
  }
}
function makeRoom() {
  const room = {
    code: randomCode(), players: new Map(), phase: 'lobby',
    drumState: 'drum', phaseEnd: 0, startedAt: 0, matchStart: 0,
    bridges: {}, ranking: [], recentEliminations: [], matchId: 0, round: 0, roundPlan: [],
    roundGame: null, roundName: null, roundSeed: '', roundSeedNum: 0,
    // CHẾ ĐỘ QC (test-only, xem BRD FR-46): phòng QC cho phép nhảy thẳng tới
    // vòng bất kỳ; trận QC không thưởng Hội Xu / XP và không tính vào BXH.
    qc: false, qcStartRound: 1, qcNoElim: false,
    roundDeadline: 0, roundTimeLimit: 0, roundState: null, roundStartCount: 0,
    matchDeadline: 0, // P1-07: hết giờ tổng thì trận kết thúc có kết quả (0 = QC, miễn)
    subArenas: [], targets: [], inputQueue: [],
  };
  rooms.set(room.code, room);
  // P3-06 bước 2 (KPI-02, cycle 23): ghi lúc tạo phòng để đo thời gian
  // lấp đầy tới 20 người (tạo phòng + tràn phòng đầy 456 đều qua đây).
  analyticsSafe((a) => a.recordRoomCreated(room));
  return room;
}
function makePlayer(id, name, ws, isHost) {
  return {
    id, name, ws, isHost, alive: true, finished: false, finishTime: null,
    spectator: false, team: null, x: 0, z: START_Z, gongX: 0, gongZ: START_Z,
    bridgeStep: 0, round2Finished: false, lastChat: 0, lastPosAt: 0,
    lastTugAt: 0, tugPower: 0, tugSide: null, traceScore: null,
    hopProgress: 0, hopStumbles: 0, hopFinished: false, hopFinishTime: null,
    oanquanScore: 0, flags: 0, disconnectedAt: 0, reconnectToken: null,
    inputQueue: [],
  };
}
function roundSeedStr(room, round) { return room.code + ':' + room.matchId + ':R' + round; }

// Trò của vòng n (1-based), quyết định TẠI LÚC BẮT ĐẦU VÒNG đó vì số vòng
// không giới hạn và trò phụ thuộc vào số người còn sống (Sudo 2026-11-06):
// - Vòng 1 Trống Hội, vòng 2 Cầu Khỉ: cố định.
// - Từ vòng 3: nếu lúc bắt đầu vòng chỉ còn <= 6 người sống thì vòng đó là
//   Rồng Rắn Cướp Cờ (CHUNG KẾT, mục tiêu giữ 1 người); ngược lại bốc từ
//   kho 5 trò theo chu kỳ có seed (games.drawPoolCycle): không lặp trong
//   một chu kỳ, hết kho thì xáo lại chu kỳ mới, không lặp liền kề qua biên
//   chu kỳ. Seed theo phòng + matchId nên mọi client/server đều bốc giống nhau.
function roundEntryFor(room, n, aliveCount) {
  if (n === 1) return { round: 1, game: 'trong-hoi', name: games.ROUND_NAMES['trong-hoi'], timeLimit: games.ROUND_TIME_LIMITS['trong-hoi'] };
  if (n === 2) return { round: 2, game: 'cau-khi', name: games.ROUND_NAMES['cau-khi'], timeLimit: games.ROUND_TIME_LIMITS['cau-khi'] };
  if (aliveCount <= 6) return { round: n, game: 'rong-ran', name: games.ROUND_NAMES['rong-ran'], timeLimit: games.ROUND_TIME_LIMITS['rong-ran'] };
  const idx = (n - 3) % games.ROUND_POOL.length;
  const cycle = Math.floor((n - 3) / games.ROUND_POOL.length);
  const order = games.drawPoolCycle(room.code + ':' + room.matchId, cycle);
  const game = games.ROUND_POOL[order[idx]];
  return { round: n, game, name: games.ROUND_NAMES[game], timeLimit: games.ROUND_TIME_LIMITS[game] };
}

// Bản xem trước kế hoạch (chỉ để hiển thị ở sảnh QC): vòng 1-2 cố định +
// 3 trò đầu của chu kỳ kho đầu tiên. KHÔNG phải kế hoạch cố định của cả
// trận — trò thật của vòng >= 3 do roundEntryFor quyết tại lúc bắt đầu vòng.
function buildRoundPlan(room) {
  const order = games.drawPoolCycle(room.code + ':' + room.matchId, 0);
  const mid = order.slice(0, 3).map((i) => games.ROUND_POOL[i]);
  const plan = [
    { round: 1, game: 'trong-hoi', name: games.ROUND_NAMES['trong-hoi'], timeLimit: games.ROUND_TIME_LIMITS['trong-hoi'] },
    { round: 2, game: 'cau-khi', name: games.ROUND_NAMES['cau-khi'], timeLimit: games.ROUND_TIME_LIMITS['cau-khi'] },
    { round: 3, game: mid[0], name: games.ROUND_NAMES[mid[0]], timeLimit: games.ROUND_TIME_LIMITS[mid[0]] },
    { round: 4, game: mid[1], name: games.ROUND_NAMES[mid[1]], timeLimit: games.ROUND_TIME_LIMITS[mid[1]] },
    { round: 5, game: mid[2], name: games.ROUND_NAMES[mid[2]], timeLimit: games.ROUND_TIME_LIMITS[mid[2]] },
  ];
  room.roundPlan = plan;
  return plan;
}

function assignTeams(room) {
  const survivors = [...room.players.values()]
    .filter((p) => p.alive && p.finished)
    .sort((a, b) => (a.finishTime || 0) - (b.finishTime || 0));
  const teamCount = Math.min(3, Math.max(1, survivors.length));
  const bridges = {};
  const rng = games.mulberry32(room.roundSeedNum || games.hashSeed(roundSeedStr(room, 2)));
  survivors.forEach((p, i) => {
    const team = i % teamCount;
    p.team = team;
    p.bridgeStep = 0;
    p.round2Finished = false;
    if (!bridges[team]) {
      bridges[team] = {
        weak: Array.from({ length: 9 }, () => (rng() < 0.5 ? 0 : 1)),
        broken: Array.from({ length: 9 }, () => false),
        queue: [], leader: null, turnStartedAt: 0,
      };
    }
    bridges[team].queue.push(p.id);
  });
  room.bridges = bridges;
  // Thứ tự đi cầu trong mỗi đội là NGƯỢC thứ tự về đích vòng 1: người về
  // đích chậm nhất đi đầu, nhanh nhất đi cuối. Đi cuối là an toàn nhất
  // (đã biết ván nào chắc nhờ người đi trước) nên đó là phần thưởng cho
  // người nhanh nhất vòng 1 — chứ không phải hình phạt như khi đi đầu.
  // Chỉ đảo thứ tự lượt trong đội; cách chia đội (cân bằng, i % teamCount)
  // và ván yếu (đã bốc ở trên) không đổi. Mỗi cầu có đúng số lượt bằng số
  // thành viên của nó — không có lượt thừa, không ai ké cầu đã lộ hết ván.
  for (const team of Object.keys(bridges)) bridges[team].queue.reverse();
  for (const team of Object.keys(bridges)) advanceLeader(room, Number(team));
  return survivors;
}
function advanceLeader(room, team) {
  const b = room.bridges[team];
  if (!b) return;
  const next = b.queue.find((id) => {
    const p = room.players.get(id);
    return p && p.alive && !p.round2Finished;
  });
  b.leader = next || null;
  // Đồng hồ lượt 30 giây chạy từ lúc lượt bắt đầu (kể cả lượt mới sau khi
  // người trước qua cầu xong hay bị loại). Hết giờ thì tick sẽ loại leader.
  b.turnStartedAt = b.leader ? Date.now() : 0;
  sendTurn(room, team);
}
// Gửi lượt của một đội kèm thời điểm hết lượt để client hiện đếm ngược.
function sendTurn(room, team) {
  const b = room.bridges[team];
  if (!b) return;
  broadcast(room, {
    type: 'turn', team,
    leaderId: b.leader,
    turnEndsAt: b.leader ? b.turnStartedAt + games.R2_TURN_TIME_LIMIT * 1000 : null,
    turnLimit: games.R2_TURN_TIME_LIMIT,
  });
}
// Bảng xếp hạng trực tiếp cho khán giả (P1-09, cycle 8): trạng thái gọn
// nhẹ — số người còn lại, người đã về đích theo thứ tự, 5 người vừa bị
// loại gần nhất (kèm vòng + lý do). Không gửi toàn bộ danh sách người
// chơi (phòng đông 456 người sẽ nặng).
function leaderboardState(room) {
  return {
    round: room.round,
    roundName: room.roundName || null,
    aliveCount: [...room.players.values()].filter((p) => p.alive && !p.spectator).length,
    finished: room.ranking.map((r) => ({ id: r.id, name: r.name, team: r.team, time: r.time })),
    eliminated: room.recentEliminations.slice(),
  };
}
// Gộp nhiều lần gọi trong cùng 1 tick (vòng kết thúc loại hàng loạt) thành
// 1 lần broadcast, để không spam 456 client × N lần loại. setImmediate nên
// tin tới sau sự kiện gốc 1 nhịp — khán giả vẫn thấy cập nhật gần như ngay.
function broadcastLeaderboard(room) {
  if (room._lbScheduled) return;
  room._lbScheduled = true;
  setImmediate(() => {
    room._lbScheduled = false;
    if (!room || room.phase === 'finished') return;
    broadcast(room, { type: 'leaderboard', ...leaderboardState(room) });
  });
}
function eliminatePlayer(room, player, reason) {
  if (!player.alive) return false;
  // QC "Không loại (chỉ test giao diện)": chặn mọi lần loại do server gọi.
  // Vòng vẫn kết thúc được nhờ deadline từng vòng; chỉ là không ai chết.
  if (room.qc && room.qcNoElim) {
    logEvent('qc_noelim_blocked', { room: room.code, matchId: room.matchId, playerId: player.id, name: player.name, reason });
    return false;
  }
  player.alive = false; player.spectator = true;
  // P3-06: ghi nhận người bị loại (mẫu số KPI-04).
  analyticsSafe((a) => a.recordElimination(room, player.id));
  logEvent('elimination', { room: room.code, matchId: room.matchId, round: room.round, playerId: player.id, name: player.name, reason });
  broadcast(room, { type: 'eliminated', id: player.id, reason });
  // Bảng trực tiếp (P1-09): ghi lại người vừa bị loại (mới nhất trước,
  // tối đa 5) để khán giả thấy ngay, không phải chờ hết vòng.
  room.recentEliminations.unshift({ id: player.id, name: player.name, round: room.round, reason });
  if (room.recentEliminations.length > 5) room.recentEliminations.length = 5;
  broadcastLeaderboard(room);
  return true;
}
function finishRound2Player(room, player) {
  player.round2Finished = true;
  player.finishTime = Date.now() - room.matchStart;
  room.ranking.push({ id: player.id, name: player.name, team: player.team, time: player.finishTime });
  broadcast(room, { type: 'ranking', ranking: room.ranking });
  broadcastLeaderboard(room);
  advanceLeader(room, player.team);
  const anyoneLeft = [...room.players.values()].some((p) => p.alive && !p.round2Finished);
  if (!anyoneLeft) endRound(room, 2, 'all-finished');
}

// Chia sân con vòng 1 (~57 người/sân). Tách riêng để QC nhảy lại vòng 1
// giữa trận cũng dựng lại được sân con, không chỉ lúc bắt đầu trận.
function buildSubArenas(room) {
  const starters = [...room.players.values()].filter((p) => !p.spectator);
  room.subArenas = [];
  const seedNum = games.hashSeed(room.code + ':' + room.matchId + ':R1');
  const rng = games.mulberry32(seedNum);
  for (let i = 0; i < starters.length; i += SUB_ARENA_SIZE) {
    const ids = starters.slice(i, i + SUB_ARENA_SIZE).map((p) => p.id);
    room.subArenas.push({
      id: room.subArenas.length, playerIds: ids,
      drumState: 'drum', phaseEnd: Date.now() + 3200 + Math.floor(rng() * 1500),
      rng: games.mulberry32(seedNum + room.subArenas.length * 7919),
    });
  }
  if (room.subArenas.length === 0) room.subArenas.push({ id: 0, playerIds: [], drumState: 'drum', phaseEnd: Date.now() + 4000, rng: games.mulberry32(seedNum) });
  return rng;
}

// QC: nhảy thẳng tới vòng n (không giới hạn ở 6) giữa trận hoặc lúc bắt đầu trận.
// - Vòng 2 đi qua bước CHIA TEAM như thường (assignTeams + 5,5 giây màn
//   team rồi mới startRound(2)); vì không có thời gian về đích vòng 1 nên
//   thứ tự lượt được xáo trộn theo seed của trận (finishTime giả bốc từ
//   seeded RNG), assignTeams đảo ngược như thường — thứ tự cuối cùng vẫn là
//   một thứ tự xáo trộn theo seed, client ghi rõ điều này trên màn team.
// - Vòng 3+: startRound(n) tự khởi tạo trạng thái riêng của vòng đó
//   (trò do roundEntryFor quyết theo số người còn sống — nhảy tới vòng
//   có <= 6 người sống là vào thẳng chung kết Rồng Rắn).
//   (Kéo Co chia đội, Tò He chọn hình, Bịt Mắt rải vị trí + chia nhóm,
//   Ô Ăn Quan dựng bàn, chung kết đặt cờ) nên không còn trạng thái vòng 1.
// - Người đã bị loại trước đó vẫn là khán giả (không hồi sinh); người còn
//   sống được reset trạng thái theo vòng (hết finished/bridgeStep/điểm).
function qcJumpToRound(room, n) {
  n = Math.max(1, Math.min(20, Number(n) || 1));
  if (room.phase === 'finished' || room.phase === 'lobby') return false;
  for (const p of room.players.values()) {
    p.finished = false; p.bridgeStep = 0; p.round2Finished = false;
    p.tugSide = null; p.tugPower = 0; p.traceScore = null;
    p.hopProgress = 0; p.hopStumbles = 0; p.hopFinished = false; p.hopFinishTime = null;
    p.oanquanScore = 0; p.inputQueue = [];
  }
  room.bridges = {};
  room.roundState = null;
  if (n === 1) { buildSubArenas(room); startRound(room, 1); return true; }
  if (n === 2) {
    const rng = games.mulberry32(games.hashSeed(room.code + ':' + room.matchId + ':qc'));
    const alive = survivorsOf(room);
    alive.forEach((p) => { p.finished = true; p.finishTime = Math.floor(rng() * 100000); });
    room.roundSeed = roundSeedStr(room, 2);
    room.roundSeedNum = games.hashSeed(room.roundSeed);
    room.phase = 'team';
    const teamSurvivors = assignTeams(room);
    const teamQueues = {};
    for (const team of Object.keys(room.bridges)) teamQueues[team] = room.bridges[team].queue.slice();
    broadcast(room, {
      type: 'phase', phase: 'team',
      teams: teamSurvivors.map((p) => ({ id: p.id, name: p.name, team: p.team })),
      queues: teamQueues, players: publicPlayers(room), qc: true,
    });
    for (const team of Object.keys(room.bridges)) {
      const b = room.bridges[team];
      if (b) sendTurn(room, Number(team));
    }
    setTimeout(() => {
      if (room.phase !== 'team') return;
      startRound(room, 2);
    }, 5500);
    logEvent('qc_jump', { room: room.code, matchId: room.matchId, toRound: 2 });
    return true;
  }
  startRound(room, n);
  logEvent('qc_jump', { room: room.code, matchId: room.matchId, toRound: n });
  return true;
}

function startMatch(room) {
  room.phase = 'countdown';
  // Phòng QC: matchId + roundPlan đã chốt lúc tạo phòng (để host thấy đúng
  // tên các vòng 3-5 đã bốc trước khi bắt đầu) — không bốc lại ở đây.
  if (!room.qc) { room.matchId = nextMatchId++; buildRoundPlan(room); }
  room.matchStart = Date.now();
  // Timer trận tổng P1-07: phòng thường có deadline, phòng QC miễn (0).
  room.matchDeadline = room.qc ? 0 : room.matchStart + MATCH_TIME_LIMIT_S * 1000;
  room.ranking = [];
  room.recentEliminations = [];
  room.targets = games.scaledTargets([...room.players.values()].filter((p) => !p.spectator).length || 1);
  const starters = [...room.players.values()].filter((p) => !p.spectator);
  // Shard Round 1 into sub-arenas of ~57 players.
  const rng = buildSubArenas(room);
  for (const p of room.players.values()) {
    p.alive = true; p.finished = false; p.finishTime = null; p.spectator = false;
    p.team = null; p.bridgeStep = 0; p.round2Finished = false;
    p.tugPower = 0; p.tugSide = null; p.traceScore = null;
    p.hopProgress = 0; p.hopStumbles = 0; p.hopFinished = false; p.hopFinishTime = null;
    p.oanquanScore = 0; p.flags = 0; p.inputQueue = [];
    p.x = (rng() * 16 - 8); p.z = START_Z; p.gongX = p.x; p.gongZ = p.z;
  }
  logEvent('match_start', { room: room.code, matchId: room.matchId, players: starters.length, targets: room.targets, plan: room.roundPlan.map((r) => r.game), qc: !!room.qc, qcStartRound: room.qcStartRound });
  // P3-06: ghi nhận trận bắt đầu (trận QC tách riêng, không vào mẫu số KPI).
  analyticsSafe((a) => a.recordMatchStart(room));
  // Trận QC không ghi "đã chơi trận" vào kinh tế (không thưởng, không XP).
  if (!room.qc) starters.forEach((pl) => econSafe((ec) => ec.recordMatchPlayed(pl.id, pl.name)));
  broadcast(room, { type: 'phase', phase: 'countdown', players: publicPlayers(room) });
  setTimeout(() => {
    if (room.phase !== 'countdown') return;
    // Phòng QC bắt đầu ở vòng đã chọn thay vì vòng 1.
    if (room.qc && room.qcStartRound > 1) { qcJumpToRound(room, room.qcStartRound); broadcastLobbyList(); return; }
    startRound(room, 1);
    broadcastLobbyList();
  }, 3200);
}

// ---- Ô Ăn Quan: luật ô của mình (ĐÃ QUYẾT, cycle 3, 2026-11-06) ----
// Bên chia theo chẵn/lẻ của vị trí trong turnOrder (xếp theo id): bên 0
// đi ô dân 1-5, bên 1 đi ô dân 7-11; lượt đi xen kẽ hai bên vì turnOrder
// đi lần lượt. Ô quan 0 và 6 KHÔNG ai được rải (luật cổ truyền; server
// vốn đã không cho ăn ô quan). Viền vàng ô 0-5 ở client là luật thật:
// chỉ ô bên mình mới bấm được — server chặn, overlay/sim khóa nút.
const OANQUAN_PITS = { 0: [1, 2, 3, 4, 5], 1: [7, 8, 9, 10, 11] };
function oanquanSideOf(st, playerId) {
  if (st.sides && st.sides[playerId] != null) return st.sides[playerId];
  return st.turnOrder.indexOf(playerId) % 2 === 0 ? 0 : 1;
}
function oanquanPitsOf(st, playerId) { return OANQUAN_PITS[oanquanSideOf(st, playerId)]; }
function oanquanHasMove(st, playerId) {
  return oanquanPitsOf(st, playerId).some((i) => st.board[i] > 0);
}
// Chuyển lượt tới người sống tiếp theo còn nước đi hợp lệ. Trả false
// nếu đi hết một vòng turnOrder mà không ai còn nước đi (vòng kết thúc).
function oanquanAdvance(room) {
  const st = room.roundState;
  if (!st) return false;
  const n = st.turnOrder.length;
  for (let step = 0; step < n; step++) {
    st.turnIdx++;
    const nid = st.turnOrder[st.turnIdx % n];
    const np = room.players.get(nid);
    if (np && np.alive && oanquanHasMove(st, nid)) return true;
  }
  return false;
}
function oanquanStateMsg(room) {
  const st = room.roundState;
  return {
    type: 'oanquanState', board: st.board,
    turnId: st.turnOrder[st.turnIdx % st.turnOrder.length] || null,
    scores: st.scores, sides: st.sides,
  };
}

// ---- Nhảy Bao Bố: tin tiến độ thời gian thực (ĐÃ QUYẾT, cycle 4, 2026-11-06) ----
// Server là nguồn chuẩn duy nhất của tiến độ nhảy: broadcast hopState sau
// MỖI cú nhảy (kể cả vấp) + tick 500ms trong lúc vòng chạy, để thanh tiến
// độ + vạch nhịp của mọi người hiện đúng theo số server chấm. Trước đây
// chỉ broadcast khi có người về đích nên thanh đứng yên cả vòng.
function hopStateMsg(room) {
  const st = room.roundState || {};
  const beatInterval = st.beatInterval || 1000;
  const phase = (Date.now() - (st.beatStart || Date.now())) % beatInterval;
  return {
    type: 'hopState',
    progress: Object.fromEntries(survivorsOf(room).map((p) => [p.id, p.hopProgress || 0])),
    beatPhase: phase,
  };
}

function startRound(room, n) {
  const aliveAtStart = survivorsOf(room).length;
  const plan = roundEntryFor(room, n, aliveAtStart);
  room.roundPlan[n - 1] = plan; // ghi lại trò thật của vòng (kế hoạch xem trước chỉ tới vòng 5)
  room.round = n;
  room.roundGame = plan.game;
  room.roundName = plan.name;
  // P3-06: vòng >= 2 nghĩa là trận đã tới được vòng 2 (KPI-01).
  if (n >= 2) analyticsSafe((a) => a.recordRoundStart(room, n));
  room.roundTimeLimit = plan.timeLimit;
  room.isFinal = plan.game === 'rong-ran';
  room.roundTarget = room.isFinal ? 1
    : (room.targets[n - 1] != null ? room.targets[n - 1] : games.nextTarget(aliveAtStart, n, false));
  room.roundSeed = roundSeedStr(room, n);
  room.roundSeedNum = games.hashSeed(room.roundSeed);
  room.roundDeadline = Date.now() + plan.timeLimit * 1000;
  room.roundStartCount = [...room.players.values()].filter((p) => p.alive && !p.spectator).length;
  const phaseName = 'round' + n;
  room.phase = phaseName;
  const rng = games.mulberry32(room.roundSeedNum);
  let state = {};
  if (plan.game === 'trong-hoi') {
    room.drumState = 'drum';
    for (const a of room.subArenas) {
      a.drumState = 'drum';
      a.phaseEnd = Date.now() + 2500 + Math.floor(rng() * 2500);
    }
    state = { drum: 'drum' };
  } else if (plan.game === 'cau-khi') {
    // assignTeams is called by endRound(1) before startRound(2); keep bridges if present.
    // Đưa vị trí server của người sống sót về đúng bệ cầu của đội mình — nếu không
    // vị trí server vẫn kẹt ở vạch đích vòng 1 (z≈-35) trong khi client đã dịch
    // tới cầu (z≈-95), mọi pos/input sau đó đều bị coi là teleport / kẹp về sân cũ.
    for (const p of room.players.values()) {
      if (p.alive && !p.spectator && p.team !== null && p.team !== undefined) {
        p.x = [-11, 0, 11][p.team] || 0; p.z = -95; p.gongX = p.x; p.gongZ = p.z;
      }
    }
    // Đồng hồ lượt 30 giây chỉ chạy từ khi vòng 2 bắt đầu — 5,5 giây màn
    // chia team trước đó không được ăn vào thời gian của người đi đầu.
    for (const team of Object.keys(room.bridges || {})) {
      const b = room.bridges[team];
      if (b && b.leader) { b.turnStartedAt = Date.now(); sendTurn(room, Number(team)); }
    }
    state = { bridges: Object.keys(room.bridges || {}).length };
  } else if (plan.game === 'keo-co') {
    const alive = games.shuffle([...room.players.values()].filter((p) => p.alive && !p.spectator), rng);
    const half = Math.ceil(alive.length / 2);
    alive.forEach((p, i) => { p.tugSide = i < half ? 0 : 1; p.tugPower = 0; p.lastTugAt = 0; });
    state = { sidePower: [0, 0], threshold: 120, beatInterval: 800, beatStart: Date.now(), lastBroadcast: 0 };
  } else if (plan.game === 'to-he') {
    const shapeKey = games.TRACE_SHAPE_KEYS[Math.floor(rng() * games.TRACE_SHAPE_KEYS.length)];
    state = { shape: shapeKey, points: games.TRACE_SHAPES[shapeKey].points };
    for (const p of room.players.values()) if (p.alive) p.traceScore = null;
  } else if (plan.game === 'bit-mat') {
    // Scatter players across the arena so the goat is not caught instantly
    // (everyone ends R1/R2 bunched at the finish line).
    for (const p of room.players.values()) {
      if (p.alive && !p.spectator) { p.x = Math.round((rng() * 30 - 15) * 10) / 10; p.z = Math.round((rng() * 60 - 30) * 10) / 10; p.gongX = p.x; p.gongZ = p.z; }
    }
    const alive = games.shuffle([...room.players.values()].filter((p) => p.alive && !p.spectator), rng);
    const groups = [];
    for (let i = 0; i < alive.length; i += 6) {
      const members = alive.slice(i, i + 6);
      const goat = members[0];
      groups.push({ goatId: goat.id, seekerIds: members.slice(1).map((p) => p.id), caught: false, caughtBy: null });
    }
    state = { groups, lastCue: 0 };
    // Tell seekers they are blind, goats they can see. Both get the goatId:
    // seekers need it to draw the glowing goat + camera-relative compass
    // from the goat's live position (tick AOI 40); the 2s cue stays as the
    // fallback when the goat is outside the seeker's AOI.
    for (const g of groups) {
      const goat = room.players.get(g.goatId);
      if (goat && goat.ws) send(goat.ws, { type: 'blind', blind: false, goatId: g.goatId });
      for (const sid of g.seekerIds) {
        const s = room.players.get(sid);
        if (s && s.ws) send(s.ws, { type: 'blind', blind: true, goatId: g.goatId });
      }
    }
  } else if (plan.game === 'o-an-quan') {
    const alive = [...room.players.values()].filter((p) => p.alive && !p.spectator).sort((a, b) => a.id - b.id);
    for (const p of alive) p.oanquanScore = 0;
    const sides = {};
    alive.forEach((p, i) => { sides[p.id] = i % 2; });
    state = {
      board: [10, 5, 5, 5, 5, 5, 10, 5, 5, 5, 5, 5],
      turnOrder: alive.map((p) => p.id), turnIdx: 0, turnsTaken: {}, scores: {}, sides,
    };
    for (const p of alive) { state.turnsTaken[p.id] = 0; state.scores[p.id] = 0; }
  } else if (plan.game === 'nhay-bao-bo') {
    for (const p of room.players.values()) if (p.alive) { p.hopProgress = 0; p.hopStumbles = 0; p.hopFinished = false; p.hopFinishTime = null; }
    state = { beatInterval: 1000, beatStart: Date.now(), finishOrder: [], finishLine: 20 };
  } else if (plan.game === 'rong-ran') {
    // Fair flag race: everyone back on the start line.
    for (const p of room.players.values()) {
      if (p.alive && !p.spectator) { p.x = Math.round((rng() * 16 - 8) * 10) / 10; p.z = START_Z; }
    }
    state = { flag: { x: 0, z: 0, holderId: null }, flagTouchOrder: [], flagTouchTime: {} };
  }
  // Vòng 3–6 chơi trong sân làng (sim đặt đạo cụ ở z 0..35) — sau vòng 2
  // mọi người đang ở cuối cầu nên phải đưa đội hình về sân, giống như
  // Bịt Mắt (rải) và Rồng Rắn (về vạch xuất phát) đã làm. Nếu không, vị trí
  // server (dùng để chấm bắt dê / cướp cờ) ở một nơi, sim ở một nơi.
  if (plan.game === 'keo-co' || plan.game === 'to-he' || plan.game === 'o-an-quan' || plan.game === 'nhay-bao-bo') {
    for (const p of room.players.values()) {
      if (p.alive && !p.spectator) { p.x = Math.round((rng() * 26 - 13) * 10) / 10; p.z = Math.round((28 + rng() * 10) * 10) / 10; p.gongX = p.x; p.gongZ = p.z; }
    }
  }
  room.roundState = state;
  logEvent('round_start', { room: room.code, matchId: room.matchId, round: n, game: plan.game, timeLimit: plan.timeLimit, seed: room.roundSeed, players: room.roundStartCount });
  broadcast(room, { type: 'roundStart', round: n, game: plan.game, name: plan.name, timeLimit: plan.timeLimit, seed: room.roundSeed, target: room.roundTarget, isFinal: room.isFinal, matchTimeLimit: room.qc ? 0 : MATCH_TIME_LIMIT_S });
  broadcast(room, { type: 'phase', phase: phaseName, game: plan.game, name: plan.name, players: publicPlayers(room) });
  if (plan.game === 'to-he') {
    broadcast(room, { type: 'traceTarget', shape: state.shape, points: state.points });
  }
  if (plan.game === 'o-an-quan') {
    broadcast(room, oanquanStateMsg(room));
  }
}

function survivorsOf(room) {
  return [...room.players.values()].filter((p) => p.alive && !p.spectator);
}
function cutToTarget(room, rankedIds, target, reason) {
  // rankedIds: best-first. Keep first `target`, eliminate the rest.
  const keep = new Set(rankedIds.slice(0, Math.max(0, target)));
  const eliminated = [];
  for (const p of survivorsOf(room)) {
    if (!keep.has(p.id)) { eliminatePlayer(room, p, reason); eliminated.push(p.id); }
  }
  return eliminated;
}

// Xếp người sống từ TỆ NHẤT tới TỐT NHẤT theo trò đang chơi — dùng cho
// xếp người sống từ tệ nhất tới tốt nhất (dùng cho cắt ép tối thiểu).
function rankWorstFirst(room, game, alive) {
  const st = room.roundState || {};
  const arr = alive.slice();
  if (game === 'trong-hoi') {
    return arr.sort((a, b) => (a.finished === b.finished ? (b.finishTime || 0) - (a.finishTime || 0) : (a.finished ? 1 : -1)));
  }
  if (game === 'cau-khi') {
    return arr.sort((a, b) => (a.round2Finished === b.round2Finished ? (b.finishTime || 0) - (a.finishTime || 0) : (a.round2Finished ? 1 : -1)));
  }
  if (game === 'keo-co') {
    const sp = st.sidePower || [0, 0];
    const winnerSide = sp[0] === sp[1] ? null : (sp[0] > sp[1] ? 0 : 1);
    return arr.sort((a, b) => {
      const aLoser = winnerSide !== null && a.tugSide === 1 - winnerSide ? 0 : 1;
      const bLoser = winnerSide !== null && b.tugSide === 1 - winnerSide ? 0 : 1;
      return aLoser - bLoser || (a.tugPower || 0) - (b.tugPower || 0);
    });
  }
  if (game === 'to-he') return arr.sort((a, b) => (a.traceScore || 0) - (b.traceScore || 0));
  if (game === 'bit-mat') {
    const goats = (st.groups || []).map((g) => room.players.get(g.goatId)).filter(Boolean);
    const dist = (p) => {
      if (!goats.length) return 999;
      return Math.min(...goats.map((g) => Math.hypot(p.x - g.x, p.z - g.z)));
    };
    return arr.sort((a, b) => dist(b) - dist(a)); // xa dê nhất = tệ nhất
  }
  if (game === 'o-an-quan') return arr.sort((a, b) => (a.oanquanScore || 0) - (b.oanquanScore || 0));
  if (game === 'nhay-bao-bo') {
    return arr.sort((a, b) => (a.hopFinished === b.hopFinished ? (a.hopProgress || 0) - (b.hopProgress || 0) : (a.hopFinished ? 1 : -1)));
  }
  if (game === 'rong-ran') {
    const holder = st.flag && st.flag.holderId;
    return arr.sort((a, b) => {
      if (a.id === holder) return 1;
      if (b.id === holder) return -1;
      return Math.hypot(b.x, b.z) - Math.hypot(a.x, a.z); // xa cờ nhất = tệ nhất
    });
  }
  return arr;
}

// CẮT ÉP TỐI THIỂU — bảo đảm mỗi vòng loại ít nhất 1 người (Sudo
// 2026-11-06: nếu mọi người đều chơi tốt thì 6 vòng không thể loại hết
// xuống 1 người, nên số vòng không cố định). Lưu ý: cắt ép CHỈ bảo đảm
// tối thiểu 1 người, KHÔNG ép về đúng mục tiêu tỉ lệ — mục tiêu
// (roundTarget) là đích để các trò xếp hạng (Trống Hội, Cầu Khỉ, Tò He,
// Ô Ăn Quan, Nhảy Bao Bố) cắt về, còn Kéo Co / Bịt Mắt loại theo luật
// riêng của trò (có thể ít hơn mục tiêu) và trận sẽ dài thêm vòng sau.
// Nếu ép đúng mục tiêu thì kỹ năng chơi tốt hay dở không còn ý nghĩa và
// trận không bao giờ qua được vòng 6 — trái với yêu cầu của Sudo.
// Ở phòng QC "Không loại", eliminatePlayer chặn loại nên hàm này không làm
// gì — vòng chung kết QC vẫn kết thúc trận (xem cuối endRound).
function ensureAtLeastOneElimination(room, game, alreadyEliminated) {
  if (alreadyEliminated > 0) return [];
  const alive = survivorsOf(room);
  if (alive.length <= 1) return [];
  const worst = rankWorstFirst(room, game, alive)[0];
  if (!worst) return [];
  if (eliminatePlayer(room, worst, 'Cắt tối thiểu — tệ nhất vòng ' + (games.ROUND_NAMES[game] || game))) return [worst.id];
  return [];
}

function endRound(room, n, reason) {
  if (room.round !== n || room.phase === 'finished' || room.phase === 'lobby') return;
  const game = room.roundGame;
  const isFinal = game === 'rong-ran';
  const target = isFinal ? 1
    : (room.targets[n - 1] != null ? room.targets[n - 1] : games.nextTarget(room.roundStartCount, n, false));
  let eliminated = [];
  if (game === 'trong-hoi') {
    // Non-finishers eliminated; finishers ranked per sub-arena, top N per arena advance.
    const perArena = Math.max(1, Math.ceil(target / Math.max(1, room.subArenas.length)));
    const keep = new Set();
    for (const arena of room.subArenas) {
      const finishers = arena.playerIds
        .map((id) => room.players.get(id))
        .filter((p) => p && p.alive && p.finished)
        .sort((a, b) => (a.finishTime || 0) - (b.finishTime || 0))
        .slice(0, perArena);
      for (const p of finishers) keep.add(p.id);
    }
    for (const p of survivorsOf(room)) {
      if (!keep.has(p.id)) {
        eliminatePlayer(room, p, p.finished ? 'Về đích chậm hơn top sân con' : 'Hết giờ vòng 1 — chưa về đích');
        eliminated.push(p.id);
      }
    }
  } else if (game === 'cau-khi') {
    const finishers = survivorsOf(room).filter((p) => p.round2Finished)
      .sort((a, b) => (a.finishTime || 0) - (b.finishTime || 0));
    const ranked = finishers.map((p) => p.id);
    // Non-finishers are eliminated too; cutToTarget covers them (not in ranked).
    eliminated = cutToTarget(room, ranked, target, 'Chưa qua cầu / về đích chậm');
  } else if (game === 'keo-co') {
    const st = room.roundState || {};
    const sidePower = st.sidePower || [0, 0];
    const winnerSide = sidePower[0] === sidePower[1] ? null : (sidePower[0] > sidePower[1] ? 0 : 1);
    const alive = survivorsOf(room);
    if (winnerSide === null) {
      // Tie: eliminate lowest contributor overall (1 player) to keep the match moving.
      const sorted = alive.slice().sort((a, b) => (a.tugPower || 0) - (b.tugPower || 0));
      if (sorted.length > 1 && sorted[0]) { eliminatePlayer(room, sorted[0], 'Kéo Co hòa — đóng góp thấp nhất'); eliminated.push(sorted[0].id); }
    } else {
      const loserSide = 1 - winnerSide;
      const losers = alive.filter((p) => p.tugSide === loserSide);
      if (room.roundStartCount >= 24) {
        for (const p of losers) { eliminatePlayer(room, p, 'Kéo Co — đội thua bị loại'); eliminated.push(p.id); }
      } else if (losers.length <= 2) {
        for (const p of losers) { eliminatePlayer(room, p, 'Kéo Co — đội thua bị loại'); eliminated.push(p.id); }
      } else {
        const bottom = losers.slice().sort((a, b) => (a.tugPower || 0) - (b.tugPower || 0)).slice(0, 2);
        for (const p of bottom) { eliminatePlayer(room, p, 'Kéo Co — đóng góp thấp nhất đội thua'); eliminated.push(p.id); }
      }
    }
  } else if (game === 'to-he') {
    const ranked = survivorsOf(room).slice()
      .sort((a, b) => (b.traceScore || 0) - (a.traceScore || 0)).map((p) => p.id);
    eliminated = cutToTarget(room, ranked, target, 'Nặn Tò He — điểm thấp');
  } else if (game === 'bit-mat') {
    const st = room.roundState || {};
    // Goats already caught were eliminated when caught. At timeout, eliminate
    // farthest seekers (slowest) until the target is met.
    const alive = survivorsOf(room);
    if (alive.length > target) {
      const goatPos = {};
      for (const g of (st.groups || [])) {
        const goat = room.players.get(g.goatId);
        if (goat) goatPos[g.goatId] = goat;
      }
      const scored = alive.map((p) => {
        // Distance to the nearest goat still in play (or any goat).
        let best = Infinity;
        for (const g of (st.groups || [])) {
          const goat = room.players.get(g.goatId);
          if (!goat) continue;
          const d = Math.hypot(p.x - goat.x, p.z - goat.z);
          if (d < best) best = d;
        }
        return { p, d: best === Infinity ? 999 : best };
      }).sort((a, b) => b.d - a.d); // farthest first = slowest
      const need = alive.length - target;
      for (const s of scored.slice(0, need)) { eliminatePlayer(room, s.p, 'Bịt Mắt — tìm chậm nhất'); eliminated.push(s.p.id); }
    }
  } else if (game === 'o-an-quan') {
    const ranked = survivorsOf(room).slice()
      .sort((a, b) => (b.oanquanScore || 0) - (a.oanquanScore || 0)).map((p) => p.id);
    eliminated = cutToTarget(room, ranked, target, 'Ô Ăn Quan — điểm thấp');
  } else if (game === 'nhay-bao-bo') {
    const st = room.roundState || {};
    const order = (st.finishOrder || []).slice();
    const rest = survivorsOf(room).filter((p) => !order.includes(p.id))
      .sort((a, b) => (b.hopProgress || 0) - (a.hopProgress || 0)).map((p) => p.id);
    eliminated = cutToTarget(room, order.concat(rest), target, 'Nhảy Bao Bố — về đích chậm');
  } else if (game === 'rong-ran') {
    // Final is decided by flag/base, handled in endMatch path; timeout falls through here.
    const st = room.roundState || {};
    const holder = st.flag && st.flag.holderId ? room.players.get(st.flag.holderId) : null;
    if (holder && holder.alive) {
      // Winner is the holder; everyone else is ranked behind.
      for (const p of survivorsOf(room)) if (p.id !== holder.id) { eliminatePlayer(room, p, 'Rồng Rắn — không cướp được cờ'); eliminated.push(p.id); }
    } else {
      const ranked = survivorsOf(room).slice()
        .sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z)).map((p) => p.id);
      eliminated = cutToTarget(room, ranked, 1, 'Rồng Rắn — xa cờ nhất');
    }
  }
  // Cắt ép tối thiểu: nếu luật riêng của trò chưa loại ai ở vòng này
  // (vd số người sống đã bằng đúng mục tiêu, hoặc Kéo Co hòa mà không ai
  // bị loại), loại người tệ nhất — không vòng nào kết thúc mà không loại ai.
  eliminated = eliminated.concat(ensureAtLeastOneElimination(room, game, eliminated.length));
  const survivors = survivorsOf(room).map((p) => p.id);
  // Trận QC không thưởng Hội Xu / XP cho việc sống sót qua vòng.
  // Đẩy ví mới về client ngay (không thì HUD ví vẫn hiện số cũ cho tới
  // khi người chơi mở shop và shop.js tự hỏi lại getProfile).
  if (!room.qc) survivorsOf(room).forEach((pl) => {
    let res = null;
    econSafe((ec) => { res = ec.awardRoundSurvived(pl.id, pl.name); });
    if (res && res.profile && pl.ws) send(pl.ws, { type: 'economy', action: 'earned', reason: 'roundSurvived', amount: 10, profile: res.profile });
  });
  logEvent('round_end', { room: room.code, matchId: room.matchId, round: n, game, reason, survivors: survivors.length, eliminated: eliminated.length, target, isFinal });
  // Báo luôn vòng tiếp theo (trò đã bốc theo số người còn sống) để client
  // hiện được tên vòng sau mà không cần đoán — số vòng không giới hạn nên
  // không còn khái niệm "vòng 6 là vòng cuối" để suy ra.
  const nextEntry = (survivors.length > 1 && !isFinal) ? roundEntryFor(room, n + 1, survivors.length) : null;
  broadcast(room, { type: 'roundEnd', round: n, game, survivors, eliminated,
    nextRound: nextEntry ? nextEntry.round : null, nextGame: nextEntry ? nextEntry.game : null, nextName: nextEntry ? nextEntry.name : null });
  broadcast(room, { type: 'players', players: publicPlayers(room) });
  broadcastLeaderboard(room);
  room.roundDeadline = 0;
  // KHÔNG còn điều kiện n >= 6: trận chỉ kết thúc khi còn 1 người, hoặc
  // khi vừa xong vòng chung kết Rồng Rắn (kể cả phòng QC "Không loại",
  // nơi không ai chết được — chung kết là điểm dừng của trận test).
  if (survivors.length <= 1 || isFinal) { endMatch(room); return; }
  if (n === 1) {
    room.phase = 'team';
    const teamSurvivors = assignTeams(room);
    // Gửi kèm thứ tự lượt của từng đội (ngược thứ tự về đích vòng 1) để
    // client hiển thị được (ai đi đầu, bạn ở vị trí mấy) thay vì chỉ danh
    // sách theo đội.
    const teamQueues = {};
    for (const team of Object.keys(room.bridges)) teamQueues[team] = room.bridges[team].queue.slice();
    broadcast(room, {
      type: 'phase', phase: 'team',
      teams: teamSurvivors.map((p) => ({ id: p.id, name: p.name, team: p.team })),
      queues: teamQueues,
      players: publicPlayers(room),
    });
    // Gửi lại lượt của từng đội SAU khi client đã biết mình thuộc đội nào
    // (assignTeams đã gửi 'turn' trước tin 'team', lúc đó client chưa biết team
    // của mình nên không khớp được lượt với đội của mình).
    for (const team of Object.keys(room.bridges)) {
      const b = room.bridges[team];
      if (b) sendTurn(room, Number(team));
    }
    setTimeout(() => {
      if (room.phase !== 'team') return;
      startRound(room, 2);
    }, 5500);
    return;
  }
  startRound(room, n + 1);
}

function endMatch(room, reason) {
  if (room.phase === 'finished') return;
  room.phase = 'finished';
  room.roundDeadline = 0;
  room.matchDeadline = 0;
  // Winner: last survivor, or flag holder, or fastest ranking entry.
  let winner = survivorsOf(room)[0] || null;
  if (reason === 'match-timeout') {
    // P1-07 — hết giờ tổng: trận kết thúc có kết quả, xếp theo tiến độ
    // vòng hiện tại (tốt nhất trước): rankWorstFirst trả về tệ → tốt nên
    // đảo lại. Người dẫn đầu vòng hiện tại thắng, kể cả khi còn nhiều
    // người sống; không loại ai thêm, chỉ xếp hạng.
    const ranked = rankWorstFirst(room, room.roundGame, survivorsOf(room)).reverse();
    if (ranked.length) {
      winner = ranked[0];
      room.ranking = ranked.map((p) => ({ id: p.id, name: p.name, team: p.team, time: Date.now() - room.matchStart }));
    }
  }
  if (!winner && room.ranking.length) {
    const top = room.ranking[0];
    winner = room.players.get(top.id) || null;
  }
  if (winner && !room.ranking.some((r) => r.id === winner.id)) {
    room.ranking.unshift({ id: winner.id, name: winner.name, team: winner.team, time: Date.now() - room.matchStart });
  }
  if (winner && !room.qc) {
    let res = null;
    econSafe((ec) => { res = ec.awardWin(winner.id, winner.name); });
    if (res && res.profile && winner.ws) send(winner.ws, { type: 'economy', action: 'earned', reason: 'win', amount: 50, profile: res.profile });
  }
  logEvent('match_end', { room: room.code, matchId: room.matchId, winnerId: winner ? winner.id : null, ranking: room.ranking.length, reason: reason || 'last-standing' });
  // P3-06: chốt số đếm của trận (trận QC tách riêng, không vào KPI).
  analyticsSafe((a) => a.recordMatchEnd(room, reason, winner));
  broadcast(room, { type: 'phase', phase: 'finished', ranking: room.ranking, winnerId: winner ? winner.id : null, reason: reason || undefined });
  broadcastLobbyList();
}

function checkRound1End(room) {
  if (room.phase !== 'round1') return;
  const active = [...room.players.values()].filter((p) => p.alive && !p.finished && !p.spectator);
  if (active.length === 0) endRound(room, 1, 'all-finished');
}
function checkRound2End(room) {
  if (room.phase !== 'round2') return;
  const anyoneLeft = [...room.players.values()].some((p) => p.alive && !p.round2Finished && !p.spectator);
  if (!anyoneLeft) endRound(room, 2, 'all-finished');
}

// ---- movement (server-authoritative, input-based) ----
function applyInput(room, player, dx, dz, jump) {
  const len = Math.hypot(dx, dz);
  if (len > 1.0001) { dx /= len; dz /= len; }
  const step = MAX_SPEED * (TICK_MS / 1000);
  let nx = player.x + dx * step;
  let nz = player.z + dz * step;
  if (room.phase === 'round2' && player.team !== null && player.team !== undefined) {
    // Trên cầu: kẹp trong làn cầu của đội mình, không kẹp về sân vòng 1.
    const bx = [-11, 0, 11][player.team] || 0;
    nx = Math.max(bx - 5.4, Math.min(bx + 5.4, nx));
    nz = Math.max(-145, Math.min(-87.5, nz));
  } else {
    nx = Math.max(-ARENA_X, Math.min(ARENA_X, nx));
    nz = Math.max(ARENA_Z_MIN, Math.min(ARENA_Z_MAX, nz));
  }
  const moved = Math.hypot(nx - player.x, nz - player.z);
  player.x = nx; player.z = nz;
  if (room.phase === 'round1' && player.alive && !player.finished) {
    const arena = room.subArenas.find((a) => a.playerIds.includes(player.id)) || room.subArenas[0];
    const drum = arena ? arena.drumState : room.drumState;
    if (drum === 'gong' && (moved > 0.01 || jump)) {
      eliminatePlayer(room, player, 'Di chuyển trong lúc chiêng');
      broadcast(room, { type: 'players', players: publicPlayers(room) });
      checkRound1End(room);
      return;
    }
    if (nz <= FINISH_Z) {
      player.finished = true;
      player.finishTime = Date.now() - room.matchStart;
      broadcast(room, { type: 'players', players: publicPlayers(room) });
      checkRound1End(room);
    }
  }
  if (room.roundGame === 'rong-ran') checkFlag(room, player);
  if (room.roundGame === 'bit-mat') checkGoatCaught(room, player);
}
function checkFlag(room, player) {
  const st = room.roundState;
  if (!st || !st.flag) return;
  const d = Math.hypot(player.x - st.flag.x, player.z - st.flag.z);
  if (!st.flag.holderId && d < 2 && player.alive) {
    st.flag.holderId = player.id;
    st.flagTouchOrder.push(player.id);
    st.flagTouchTime[player.id] = Date.now() - room.matchStart;
    broadcast(room, { type: 'flag', holderId: player.id });
  }
  if (st.flag.holderId === player.id && player.z <= -30) {
    // Holder reached own base (finish line) -> wins the match.
    for (const p of survivorsOf(room)) {
      if (p.id !== player.id) { eliminatePlayer(room, p, 'Rồng Rắn — không cướp được cờ'); }
    }
    room.ranking = [{ id: player.id, name: player.name, team: player.team, time: Date.now() - room.matchStart }]
      .concat(survivorsOf(room).filter((p) => p.id !== player.id).map((p) => ({ id: p.id, name: p.name, team: p.team, time: 0 })));
    broadcast(room, { type: 'roundEnd', round: room.round, game: 'rong-ran', survivors: [player.id], eliminated: survivorsOf(room).filter((p) => p.id !== player.id).map((p) => p.id) });
    endMatch(room);
  }
}
function checkGoatCaught(room, seeker) {
  const st = room.roundState;
  if (!st || !st.groups) return;
  for (const g of st.groups) {
    if (g.caught) continue;
    if (!g.seekerIds.includes(seeker.id)) continue;
    const goat = room.players.get(g.goatId);
    if (!goat || !goat.alive) continue;
    if (Math.hypot(seeker.x - goat.x, seeker.z - goat.z) < 2) {
      g.caught = true; g.caughtBy = seeker.id;
      eliminatePlayer(room, goat, 'Bịt Mắt — dê bị bắt');
      broadcast(room, { type: 'caught', goatId: goat.id, seekerId: seeker.id });
      broadcast(room, { type: 'players', players: publicPlayers(room) });
      if (st.groups.every((x) => x.caught)) endRound(room, room.round, 'all-goats-caught');
      return;
    }
  }
}
function traceScoreFromPoints(points, targetPoints) {
  if (!Array.isArray(points) || points.length === 0) return null;
  let total = 0; let count = 0;
  for (const pt of points) {
    const x = Number(pt[0] != null ? pt[0] : pt.x);
    const y = Number(pt[1] != null ? pt[1] : pt.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    let best = Infinity;
    for (const tp of targetPoints) {
      const d = Math.hypot(x - tp[0], y - tp[1]);
      if (d < best) best = d;
    }
    total += best; count++;
  }
  if (!count) return null;
  const avg = total / count;
  return Math.max(0, Math.min(100, Math.round(100 - avg * 1.2)));
}

function removePlayerFromRoom(room, playerId, reason) {
  const player = room.players.get(playerId);
  if (!player) return;
  const wasLeader = room.bridges && Object.values(room.bridges).some((b) => b.leader === playerId);
  const wasHost = player.isHost;
  room.players.delete(playerId);
  if (room.players.size === 0) { rooms.delete(room.code); analyticsSafe((a) => a.dropMatch(room)); broadcastLobbyList(); return; }
  if (wasHost) {
    const first = [...room.players.values()].find((p) => p.ws);
    if (first) first.isHost = true;
  }
  if (wasLeader) {
    for (const team of Object.keys(room.bridges || {})) {
      if (room.bridges[team].leader === playerId) advanceLeader(room, Number(team));
    }
  }
  if (room.phase === 'round1') checkRound1End(room);
  if (room.phase === 'round2') checkRound2End(room);
  broadcast(room, { type: 'players', players: publicPlayers(room) });
  broadcastLobbyList();
  logEvent('player_left', { room: room.code, playerId, reason: reason || 'disconnect-timeout' });
}

wss.on('connection', (ws) => {
  const id = nextPlayerId++;
  clients.set(ws, { id, name: '', roomCode: null, posCount: 0, posWindowStart: Date.now(), joinCount: 0, joinWindowStart: Date.now() });
  send(ws, { type: 'welcome', id });

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch (e) { logEvent('error', { kind: 'bad_json', clientId: id }); return; }
    const info = clients.get(ws);
    if (!info) return;
    if (!msg || typeof msg.type !== 'string') return;

    // Reconnect (before room checks — the old ws is gone).
    if (msg.type === 'reconnect') {
      const token = String(msg.token || '');
      const rec = reconnectTokens.get(token);
      if (!rec || rec.expiresAt < Date.now()) { send(ws, { type: 'error', message: 'Mã reconnect đã hết hạn.' }); return; }
      const room = rooms.get(rec.roomCode);
      const player = room && room.players.get(rec.playerId);
      if (!room || !player) { send(ws, { type: 'error', message: 'Không tìm thấy slot cũ.' }); return; }
      clearTimeout(rec.timeout);
      reconnectTokens.delete(token);
      player.ws = ws; player.disconnectedAt = 0; player.reconnectToken = null;
      info.roomCode = room.code; info.name = player.name;
      const newToken = makeReconnectToken();
      player.reconnectToken = newToken;
      reconnectTokens.set(newToken, { roomCode: room.code, playerId: player.id, expiresAt: Date.now() + RECONNECT_GRACE_MS, timeout: null });
      send(ws, { type: 'reconnectToken', token: newToken });
      send(ws, { type: 'joined', code: room.code, isHost: player.isHost, players: publicPlayers(room), phase: room.phase, reconnected: true, match: matchStateForClient(room) });
      broadcast(room, { type: 'players', players: publicPlayers(room) }, ws);
      logEvent('reconnect', { room: room.code, playerId: player.id });
      return;
    }

    if (msg.type === 'list') {
      send(ws, { type: 'rooms', rooms: [...rooms.values()].filter((r) => r.phase === 'lobby').map(roomSummary) });
      return;
    }
    if (msg.type === 'create') {
      if (!rateLimitJoin(info)) { send(ws, { type: 'error', message: 'Tạo/vào phòng quá nhanh, thử lại sau 1 phút.' }); return; }
      const v = validateName(msg.name);
      if (!v.ok) { send(ws, { type: 'error', message: v.reason }); return; }
      const room = makeRoom();
      // CHẾ ĐỘ QC (FR-46): host chọn vòng bắt đầu (không giới hạn ở 6) + có/không loại.
      // Bản xem trước vòng 3-5 bốc NGAY lúc tạo phòng để host thấy đúng
      // tên trò đã bốc trước khi bắt đầu (startMatch không bốc lại); trò
      // thật của vòng >= 3 do roundEntryFor quyết lúc bắt đầu vòng.
      room.qc = msg.qc === true;
      room.qcStartRound = room.qc ? Math.max(1, Math.min(20, Number(msg.startRound) || 1)) : 1;
      room.qcNoElim = room.qc && msg.noElim === true;
      if (room.qc) { room.matchId = nextMatchId++; buildRoundPlan(room); }
      info.name = v.name; info.roomCode = room.code;
      const player = makePlayer(id, v.name, ws, true);
      player.reconnectToken = makeReconnectToken();
      reconnectTokens.set(player.reconnectToken, { roomCode: room.code, playerId: id, expiresAt: Date.now() + RECONNECT_GRACE_MS, timeout: null });
      room.players.set(id, player);
      // P3-06 bước 2 (KPI-02): chủ phòng là người đầu tiên vào sảnh chờ.
      analyticsSafe((a) => a.recordLobbyJoin(room));
      send(ws, { type: 'reconnectToken', token: player.reconnectToken });
      send(ws, { type: 'joined', code: room.code, isHost: true, players: publicPlayers(room),
        qc: room.qc, startRound: room.qcStartRound, noElim: room.qcNoElim,
        plan: room.qc ? room.roundPlan : undefined });
      broadcastLobbyList();
      return;
    }
    if (msg.type === 'join') {
      if (!rateLimitJoin(info)) { send(ws, { type: 'error', message: 'Tạo/vào phòng quá nhanh, thử lại sau 1 phút.' }); return; }
      const v = validateName(msg.name);
      if (!v.ok) { send(ws, { type: 'error', message: v.reason }); return; }
      const code = String(msg.code || '').toUpperCase().trim();
      let room = rooms.get(code);
      if (!room) { send(ws, { type: 'error', message: 'Không tìm thấy phòng ' + code }); return; }
      // Lobby queue / split: a full lobby (456) spills into a new parallel room.
      if (room.phase === 'lobby' && room.players.size >= MAX_PLAYERS_PER_ROOM) {
        room = makeRoom();
        send(ws, { type: 'info', message: 'Phòng ' + code + ' đã đủ 456 người, bạn được xếp vào phòng mới ' + room.code });
      }
      info.name = v.name; info.roomCode = room.code;
      const player = makePlayer(id, v.name, ws, room.players.size === 0);
      player.reconnectToken = makeReconnectToken();
      reconnectTokens.set(player.reconnectToken, { roomCode: room.code, playerId: id, expiresAt: Date.now() + RECONNECT_GRACE_MS, timeout: null });
      if (room.phase !== 'lobby') {
        player.alive = false; player.spectator = true;
        room.players.set(id, player);
        send(ws, { type: 'reconnectToken', token: player.reconnectToken });
        send(ws, { type: 'joined', code: room.code, isHost: false, spectator: true, players: publicPlayers(room), phase: room.phase,
          qc: room.qc, startRound: room.qcStartRound, noElim: room.qcNoElim, plan: room.qc ? room.roundPlan : undefined, match: matchStateForClient(room) });
        // Vào giữa trận làm khán giả: gửi ngay bảng hiện tại để không phải
        // chờ sự kiện loại/về đích tiếp theo mới thấy.
        send(ws, { type: 'leaderboard', ...leaderboardState(room) });
        return;
      }
      room.players.set(id, player);
      // P3-06 bước 2 (KPI-02): lần đầu phòng đạt 20 người thì chốt thời
      // gian lấp đầy (nhánh này chỉ chạy khi phòng đang ở sảnh chờ).
      analyticsSafe((a) => a.recordLobbyJoin(room));
      broadcast(room, { type: 'players', players: publicPlayers(room) });
      send(ws, { type: 'reconnectToken', token: player.reconnectToken });
      send(ws, { type: 'joined', code: room.code, isHost: player.isHost, players: publicPlayers(room),
        qc: room.qc, startRound: room.qcStartRound, noElim: room.qcNoElim, plan: room.qc ? room.roundPlan : undefined });
      if (room.players.size >= MAX_PLAYERS_PER_ROOM) startMatch(room);
      broadcastLobbyList();
      return;
    }

    const room = info.roomCode ? rooms.get(info.roomCode) : null;
    if (!room) { send(ws, { type: 'error', message: 'Bạn chưa vào phòng.' }); return; }
    const player = room.players.get(id);
    if (!player) return;
    player.ws = ws; // keep ws fresh after reconnect-style reuse

    if (msg.type === 'start') {
      if (!player.isHost) { send(ws, { type: 'error', message: 'Chỉ chủ phòng mới bắt đầu được.' }); return; }
      if (room.phase !== 'lobby') return;
      if (room.players.size < 2) { send(ws, { type: 'error', message: 'Cần ít nhất 2 người mới bắt đầu.' }); return; }
      startMatch(room);
      return;
    }
    if (msg.type === 'economy') {
      // Phòng QC không dùng Hội Xu (không mua/bán/trang bị bằng xu test).
      if (room.qc) { send(ws, { type: 'error', message: 'Chế độ QC: không dùng Hội Xu trong trận test.' }); return; }
      if (economy && typeof economy.handle === 'function') {
        try { economy.handle(room, player, msg, (o) => send(ws, o), (o) => broadcast(room, o)); }
        catch (e) { logEvent('error', { kind: 'economy', message: String(e && e.message) }); send(ws, { type: 'error', message: 'Economy lỗi, thử lại sau.' }); }
      } else {
        send(ws, { type: 'error', message: 'Economy chưa sẵn sàng.' });
      }
      return;
    }
    if (msg.type === 'input') {
      if (!rateLimitPos(info)) return;
      const dx = Number(msg.dx), dz = Number(msg.dz);
      if (!Number.isFinite(dx) || !Number.isFinite(dz)) return;
      if (Math.hypot(dx, dz) > 1.5) { player.flags++; logEvent('error', { kind: 'bad_input', room: room.code, playerId: id, dx, dz }); return; }
      player.inputQueue.push({ dx, dz, jump: !!msg.jump });
      if (player.inputQueue.length > 30) player.inputQueue.splice(0, player.inputQueue.length - 30);
      return;
    }
    if (msg.type === 'pos') {
      if (!rateLimitPos(info)) return;
      // Rounds 3-6: do NOT trust raw pos for movement (input only).
      if (room.round >= 3 && room.phase !== 'lobby' && room.phase !== 'finished') return;
      const x = Number(msg.x), z = Number(msg.z);
      if (!Number.isFinite(x) || !Number.isFinite(z)) return;
      const now = Date.now();
      const moved = Math.hypot(x - player.x, z - player.z);
      // Teleport check: >12 units in one update is impossible at 9 u/s.
      if (moved > 12 && now - player.lastPosAt < 5000) {
        player.flags++;
        logEvent('error', { kind: 'teleport', room: room.code, playerId: id, moved: Math.round(moved * 100) / 100, flags: player.flags });
        send(ws, { type: 'error', message: 'Di chuyển quá nhanh, vị trí bị từ chối.' });
        return;
      }
      player.lastPosAt = now;
      player.x = x; player.z = z;
      if (room.phase === 'round1' && player.alive && !player.finished) {
        const arena = room.subArenas.find((a) => a.playerIds.includes(player.id)) || room.subArenas[0];
        const drum = arena ? arena.drumState : room.drumState;
        if (drum === 'gong') {
          if (Math.hypot(x - player.gongX, z - player.gongZ) > 0.6 || msg.jumped) {
            eliminatePlayer(room, player, 'Di chuyển trong lúc chiêng');
            broadcast(room, { type: 'players', players: publicPlayers(room) });
            checkRound1End(room);
          }
        }
        if (z <= FINISH_Z) {
          player.finished = true;
          player.finishTime = Date.now() - room.matchStart;
          broadcast(room, { type: 'players', players: publicPlayers(room) });
          checkRound1End(room);
        }
      }
      if (room.phase === 'round2') {
        // pos in R2 is display-only; bridge steps are authoritative via 'bridge'.
      }
      broadcast(room, { type: 'playerPos', id: player.id, x, z, alive: player.alive, team: player.team }, ws);
      return;
    }
    if (msg.type === 'chat') {
      // FIX (dead check): validate length BEFORE slicing.
      const rawText = String(msg.text || '').trim();
      if (!rawText) return;
      if (rawText.length > 120) { send(ws, { type: 'error', message: 'Tin nhắn tối đa 120 ký tự.' }); return; }
      const now = Date.now();
      if (now - player.lastChat < 2000) { send(ws, { type: 'error', message: 'Gửi chậm lại một chút (2 giây/tin).' }); return; }
      player.lastChat = now;
      if (!room.qc) econSafe((ec) => ec.recordChatSent(player.id, player.name));
      // P3-06: đếm người gửi chat (chỉ đếm, không lưu nội dung).
      analyticsSafe((a) => a.recordChat(room, player.id));
      broadcast(room, {
        type: 'chat', senderId: player.id, name: player.name,
        team: player.team, text: rawText, time: new Date(now).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      });
      return;
    }
    if (msg.type === 'bridge') {
      if (room.phase !== 'round2' || !player.alive || player.round2Finished) return;
      const bridge = room.bridges[player.team];
      if (!bridge || bridge.leader !== player.id) {
        send(ws, { type: 'error', message: 'Chưa tới lượt của bạn.' }); return;
      }
      const step = player.bridgeStep;
      if (step >= 9) return;
      if (bridge.broken[step]) {
        if (msg.action === 'jumpGap') {
          player.bridgeStep++;
          if (player.bridgeStep >= 9) finishRound2Player(room, player);
          else broadcast(room, { type: 'players', players: publicPlayers(room) });
        }
        return;
      }
      if (msg.action === 'step') {
        const plank = Number(msg.plank) === 1 ? 1 : 0;
        if (bridge.weak[step] === plank) {
          bridge.broken[step] = true;
          eliminatePlayer(room, player, 'Bước vào ván yếu, rơi khỏi cầu');
          broadcast(room, { type: 'bridgeUpdate', team: player.team, step, broken: true, plank });
          broadcast(room, { type: 'players', players: publicPlayers(room) });
          advanceLeader(room, player.team);
          checkRound2End(room);
        } else {
          player.bridgeStep++;
          broadcast(room, { type: 'bridgeUpdate', team: player.team, step, broken: false, playerId: player.id, bridgeStep: player.bridgeStep });
          if (player.bridgeStep >= 9) finishRound2Player(room, player);
          else broadcast(room, { type: 'players', players: publicPlayers(room) });
        }
      }
      return;
    }
    if (msg.type === 'tug') {
      if (room.roundGame !== 'keo-co' || !player.alive || player.tugSide == null) return;
      const now = Date.now();
      if (now - player.lastTugAt < 300) return; // max 1 per 300ms
      player.lastTugAt = now;
      const st = room.roundState || {};
      let power = Number(msg.power);
      if (!Number.isFinite(power) || power <= 0) power = 1;
      power = Math.min(5, power);
      const beatInterval = st.beatInterval || 800;
      const beatStart = st.beatStart || now;
      const phase = (now - beatStart) % beatInterval;
      const distToBeat = Math.min(phase, beatInterval - phase);
      if (distToBeat <= 150) power *= 2; // rhythm bonus
      player.tugPower = (player.tugPower || 0) + power;
      st.sidePower = st.sidePower || [0, 0];
      st.sidePower[player.tugSide] += power;
      if (st.sidePower[player.tugSide] >= (st.threshold || 120)) {
        endRound(room, room.round, 'tug-threshold');
      }
      return;
    }
    if (msg.type === 'trace') {
      if (room.roundGame !== 'to-he' || !player.alive) return;
      const st = room.roundState || {};
      let score = null;
      if (Array.isArray(msg.points)) {
        score = traceScoreFromPoints(msg.points, st.points || []);
      } else if (msg.score != null) {
        const s = Number(msg.score);
        if (!Number.isFinite(s) || s < 0 || s > 100) { send(ws, { type: 'error', message: 'Điểm trace phải trong 0-100.' }); return; }
        // Seeded difficulty modifier, deterministic per player.
        const mod = 0.9 + (games.hashSeed(room.roundSeed + ':' + player.id) % 21) / 100;
        score = Math.max(0, Math.min(100, Math.round(s * mod)));
      }
      if (score == null) return;
      player.traceScore = score;
      send(ws, { type: 'traceResult', score });
      const alive = survivorsOf(room);
      if (alive.length && alive.every((p) => p.traceScore != null)) endRound(room, room.round, 'all-traced');
      return;
    }
    if (msg.type === 'oanquan') {
      if (room.roundGame !== 'o-an-quan' || !player.alive) return;
      const st = room.roundState;
      if (!st) return;
      const turnId = st.turnOrder[st.turnIdx % st.turnOrder.length];
      if (turnId !== player.id) { send(ws, { type: 'error', message: 'Chưa tới lượt của bạn.' }); return; }
      const pit = Number(msg.pit);
      if (!Number.isInteger(pit) || pit < 0 || pit > 11) return;
      // Siết luật ô của mình (cycle 3): chỉ được rải ô dân bên mình
      // (bên 0: 1-5, bên 1: 7-11); ô quan 0/6 và ô đối thủ đều bị chặn.
      const ownPits = oanquanPitsOf(st, player.id);
      if (ownPits.indexOf(pit) < 0) {
        send(ws, { type: 'error', message: 'Chỉ được bấm ô bên mình (ô ' + ownPits[0] + '-' + ownPits[ownPits.length - 1] + ').' });
        return;
      }
      if (st.board[pit] <= 0) { send(ws, { type: 'error', message: 'Ô trống, chọn ô khác.' }); return; }
      let stones = st.board[pit];
      st.board[pit] = 0;
      let idx = pit;
      while (stones > 0) { idx = (idx + 1) % 12; st.board[idx]++; stones--; }
      // Capture: landed on a pit that now holds exactly 1 stone, next pit has stones.
      if (st.board[idx] === 1) {
        const cap = (idx + 1) % 12;
        if (cap !== 0 && cap !== 6 && st.board[cap] > 0) {
          const gained = st.board[cap];
          st.board[cap] = 0;
          player.oanquanScore += gained;
          st.scores[player.id] = player.oanquanScore;
        }
      }
      st.turnsTaken[player.id] = (st.turnsTaken[player.id] || 0) + 1;
      // Chuyển lượt tới người sống tiếp theo còn nước đi; nếu không ai
      // còn nước đi thì vòng kết thúc (tránh kẹt khi một bên hết quân).
      const hasNext = oanquanAdvance(room);
      broadcast(room, oanquanStateMsg(room));
      const allDone = st.turnOrder.every((pid) => (st.turnsTaken[pid] || 0) >= 3);
      const boardEmpty = st.board.reduce((a, b) => a + b, 0) <= 2;
      if (!hasNext || allDone || boardEmpty) endRound(room, room.round, !hasNext ? 'no-legal-moves' : (allDone ? 'all-turns-done' : 'board-empty'));
      return;
    }
    if (msg.type === 'hop') {
      if (room.roundGame !== 'nhay-bao-bo' || !player.alive || player.hopFinished) return;
      const st = room.roundState || {};
      const now = Date.now();
      const beatInterval = st.beatInterval || 1000;
      const phase = (now - (st.beatStart || now)) % beatInterval;
      const distToBeat = Math.min(phase, beatInterval - phase);
      if (distToBeat <= 200) {
        player.hopProgress = (player.hopProgress || 0) + 1;
      } else {
        player.hopProgress = Math.max(0, (player.hopProgress || 0) - 0.5);
        player.hopStumbles = (player.hopStumbles || 0) + 1;
      }
      if (player.hopProgress >= (st.finishLine || 20)) {
        player.hopFinished = true;
        player.hopFinishTime = Date.now() - room.matchStart;
        st.finishOrder = st.finishOrder || [];
        st.finishOrder.push(player.id);
      }
      // Broadcast sau MỖI cú nhảy (kể cả vấp, kể cả về đích) — xem hopStateMsg.
      broadcast(room, hopStateMsg(room));
      if (player.hopFinished) {
        const target = room.targets[room.round - 1] || 1;
        if (st.finishOrder.length >= target) endRound(room, room.round, 'hop-target-reached');
      }
      return;
    }
    if (msg.type === 'qcSkip') {
      // Nhảy vòng giữa trận trong chế độ QC (host bấm trên thanh QC).
      if (!room.qc) { send(ws, { type: 'error', message: 'Chỉ phòng QC mới nhảy vòng được.' }); return; }
      if (!player.isHost) { send(ws, { type: 'error', message: 'Chỉ chủ phòng mới nhảy vòng trong chế độ QC.' }); return; }
      const n = Math.max(1, Math.min(20, Number(msg.round) || 1));
      if (!qcJumpToRound(room, n)) { send(ws, { type: 'error', message: 'Chưa nhảy vòng được (trận đã kết thúc hoặc đang ở sảnh).' }); return; }
      return;
    }
    if (msg.type === 'tour') {
      // P3-06 (KPI-04): client báo khi mở du lịch; chỉ đếm khi người đó
      // đã bị loại (mở từ sảnh chờ / còn sống thì không tính).
      if (!room || !player || player.alive) return;
      analyticsSafe((a) => a.recordTour(room, player.id));
      return;
    }
    if (msg.type === 'perf') {
      // P3-06 (KPI-06): client báo FPS + thời gian tải trang sau khi đã
      // vào phòng; 1 báo cáo mỗi kết nối. Chưa vào phòng thì bỏ (không
      // quy được về phòng thường hay QC). Phòng QC chỉ đếm riêng.
      if (ws.__perfReported) return;
      ws.__perfReported = true;
      if (!room) return;
      analyticsSafe((a) => a.recordPerf(room, msg));
      return;
    }
    if (msg.type === 'report') {
      // P3-06 (KPI-08, bước 5, cycle 27): người chơi tố cáo tin chat
      // của người khác trong cùng phòng. Không lưu tên hay nội dung —
      // analytics chỉ giữ id tạm + lý do + thời gian (xem analytics.js).
      // Chống spam: mỗi người tố cáo mỗi người khác tối đa 1 lần/trận,
      // tối đa 5 tố cáo/trận. Host nhận 'reportReceived' để xử lý.
      const target = room.players.get(msg.targetId);
      if (!target) { send(ws, { type: 'error', message: 'Không tìm thấy người chơi này trong phòng.' }); return; }
      if (msg.targetId === player.id) { send(ws, { type: 'error', message: 'Không tố cáo chính mình được.' }); return; }
      const reason = String(msg.reason || '');
      if (analytics.REPORT_REASONS.indexOf(reason) < 0) { send(ws, { type: 'error', message: 'Lý do tố cáo không hợp lệ.' }); return; }
      if (!player.__reportKeys) player.__reportKeys = new Set();
      const rkey = (room.code || '') + ':' + (room.matchStart || 0) + ':' + msg.targetId;
      if (player.__reportKeys.has(rkey)) { send(ws, { type: 'error', message: 'Bạn đã tố cáo người này trong trận này rồi.' }); return; }
      if (player.__reportKeys.size >= 5) { send(ws, { type: 'error', message: 'Bạn đã tố cáo tối đa 5 lần trong trận này.' }); return; }
      player.__reportKeys.add(rkey);
      const rep = analyticsSafe((a) => a.recordReport(room, player.id, msg.targetId, reason));
      if (!rep) { send(ws, { type: 'error', message: 'Không ghi được tố cáo, thử lại sau.' }); return; }
      send(ws, { type: 'reportAck', reportId: rep.id, targetName: target.name });
      const host = [...room.players.values()].find((p) => p.isHost && p.ws && p.id !== player.id);
      if (host) send(host.ws, { type: 'reportReceived', reportId: rep.id, reason });
      return;
    }
    if (msg.type === 'report-resolve') {
      // P3-06 (KPI-08, bước 5): chỉ chủ phòng đánh dấu 1 tố cáo đã xử
      // lý (xử lý thật — mute/danh sách kiểm duyệt — là bước 6).
      if (!player.isHost) { send(ws, { type: 'error', message: 'Chỉ chủ phòng mới xử lý tố cáo được.' }); return; }
      const rep = analyticsSafe((a) => a.resolveReport(msg.reportId));
      if (!rep) { send(ws, { type: 'error', message: 'Không tìm thấy tố cáo này hoặc đã xử lý rồi.' }); return; }
      broadcast(room, { type: 'reportResolved', reportId: rep.id });
      return;
    }
    if (msg.type === 'replay') {
      if (room.phase !== 'finished') return;
      // P3-06 (KPI-05): đếm lượt chơi lại của trận vừa kết thúc.
      analyticsSafe((a) => a.recordReplay(room));
      room.phase = 'lobby'; room.ranking = []; room.bridges = {}; room.round = 0; room.roundPlan = [];
      room.subArenas = []; room.roundDeadline = 0;
      for (const p of room.players.values()) {
        p.alive = true; p.finished = false; p.finishTime = null; p.spectator = false;
        p.team = null; p.bridgeStep = 0; p.round2Finished = false; p.x = 0; p.z = START_Z;
        p.tugPower = 0; p.tugSide = null; p.traceScore = null; p.hopProgress = 0; p.hopFinished = false;
      }
      broadcast(room, { type: 'phase', phase: 'lobby', players: publicPlayers(room) });
      broadcastLobbyList();
      return;
    }
  });

  ws.on('close', () => {
    const info = clients.get(ws);
    clients.delete(ws);
    if (!info || !info.roomCode) return;
    const room = rooms.get(info.roomCode);
    if (!room) return;
    const player = room.players.get(info.id);
    if (!player) return;
    // Reconnect grace: keep the slot 30s instead of deleting immediately.
    player.ws = null;
    player.disconnectedAt = Date.now();
    const token = player.reconnectToken;
    if (token && reconnectTokens.has(token)) {
      const rec = reconnectTokens.get(token);
      rec.expiresAt = Date.now() + RECONNECT_GRACE_MS;
      if (rec.timeout) clearTimeout(rec.timeout);
      rec.timeout = setTimeout(() => {
        reconnectTokens.delete(token);
        const r = rooms.get(info.roomCode);
        if (r && r.players.get(info.id) && !r.players.get(info.id).ws) {
          removePlayerFromRoom(r, info.id, 'reconnect-expired');
        }
      }, RECONNECT_GRACE_MS);
      reconnectTokens.set(token, rec);
    } else {
      // No token (should not happen) — remove after grace anyway.
      setTimeout(() => {
        const r = rooms.get(info.roomCode);
        if (r && r.players.get(info.id) && !r.players.get(info.id).ws) removePlayerFromRoom(r, info.id, 'reconnect-expired');
      }, RECONNECT_GRACE_MS);
    }
    broadcast(room, { type: 'players', players: publicPlayers(room) });
  });
});

// Fixed tick ~15 Hz: inputs, drum/gong, timers, cues, tug broadcast, AOI snapshot.
setInterval(() => {
  const now = Date.now();
  for (const room of rooms.values()) {
    // 1) Process queued inputs (server-authoritative movement).
    for (const p of room.players.values()) {
      if (!p.ws && p.alive) continue; // disconnected players don't move
      while (p.inputQueue && p.inputQueue.length) {
        const inp = p.inputQueue.shift();
        if (!p.alive || p.spectator) break;
        applyInput(room, p, inp.dx, inp.dz, inp.jump);
        if (!p.alive) break;
      }
    }
    // 2) Drum / gong per sub-arena (Round 1 only).
    if (room.phase === 'round1') {
      for (const arena of room.subArenas) {
        if (now >= arena.phaseEnd) {
          arena.drumState = arena.drumState === 'drum' ? 'gong' : 'drum';
          arena.phaseEnd = now + (arena.drumState === 'drum'
            ? 2500 + Math.floor(arena.rng() * 2500)
            : 2000 + Math.floor(arena.rng() * 2000));
          if (arena.drumState === 'gong') {
            for (const pid of arena.playerIds) {
              const p = room.players.get(pid);
              if (p) { p.gongX = p.x; p.gongZ = p.z; }
            }
          }
        }
      }
      if (room.subArenas[0]) room.drumState = room.subArenas[0].drumState;
      // Only broadcast on a flip (not every 66ms tick).
      if (room.lastDrumSent !== room.drumState) {
        room.lastDrumSent = room.drumState;
        broadcast(room, { type: 'drum', drum: room.drumState });
      }
      // Round 1 timeout.
      if (room.roundDeadline && now >= room.roundDeadline) endRound(room, 1, 'timeout');
    }
    // 3) Round timers (every round gets a deadline; no round stalls forever).
    if (room.roundDeadline && room.phase !== 'round1' && room.phase !== 'finished' && room.phase !== 'lobby' && room.phase !== 'countdown' && room.phase !== 'team') {
      if (now >= room.roundDeadline) { endRound(room, room.round, 'timeout'); continue; }
    }
    // 3a) Timer trận tổng (P1-07): hết giờ tổng thì trận kết thúc có kết
    // quả (xếp theo tiến độ vòng hiện tại) thay vì kẹt mãi. Phòng QC miễn
    // (matchDeadline = 0). Kiểm tra ở mọi phase trong trận, kể cả 'team'
    // (5,5 giây chia đội) và 'countdown', vì deadline tính từ lúc bắt đầu trận.
    if (room.matchDeadline && room.phase !== 'lobby' && room.phase !== 'finished' && now >= room.matchDeadline) {
      endMatch(room, 'match-timeout'); continue;
    }
    // 3b) Round 2 per-turn timer (30s): tới lượt mà không đi, hoặc đi quá
    // chậm không qua hết cầu trong 30 giây, thì bị loại và lượt chuyển cho
    // người tiếp theo trong đội. Đồng hồ chạy từ lúc lượt bắt đầu — lượt
    // không bắt đầu và lượt đi chậm là một. Deadline 180s của cả vòng vẫn
    // áp song song (mục 3) nên vòng không kẹt dù cả đội đứng yên.
    if (room.phase === 'round2' && room.roundGame === 'cau-khi') {
      for (const team of Object.keys(room.bridges || {})) {
        const b = room.bridges[team];
        if (!b || !b.leader || !b.turnStartedAt) continue;
        if (now < b.turnStartedAt + games.R2_TURN_TIME_LIMIT * 1000) continue;
        const leader = room.players.get(b.leader);
        if (!leader || !leader.alive || leader.round2Finished) continue;
        if (room.qc && room.qcNoElim) {
          // Không loại thì chỉ chuyển lượt cho người tiếp theo (tránh kẹt
          // ở một leader đứng yên mãi vì eliminatePlayer đã chặn loại).
          logEvent('turn_timeout_qc', { room: room.code, matchId: room.matchId, team: Number(team), playerId: leader.id, name: leader.name });
          advanceLeader(room, Number(team));
          continue;
        }
        eliminatePlayer(room, leader, 'Hết lượt qua cầu (30 giây) — đi chậm quá');
        logEvent('turn_timeout', { room: room.code, matchId: room.matchId, team: Number(team), playerId: leader.id, name: leader.name });
        advanceLeader(room, Number(team));
        checkRound2End(room);
        if (room.phase !== 'round2') break;
      }
    }
    // 4) Per-game tick work.
    if (room.roundGame === 'keo-co') {
      const st = room.roundState;
      if (st && now - (st.lastBroadcast || 0) >= 500) {
        st.lastBroadcast = now;
        broadcast(room, { type: 'tugState', sidePower: st.sidePower, threshold: st.threshold, timeLeft: Math.max(0, Math.ceil((room.roundDeadline - now) / 1000)) });
      }
    }
    if (room.roundGame === 'nhay-bao-bo' && room.phase.startsWith('round')) {
      // Vạch nhịp + tiến độ vẫn trôi đều ngay cả khi không ai bấm NHẢY
      // (cùng nhịp 500ms như tugState) — xem hopStateMsg.
      const st = room.roundState;
      if (st && now - (st.lastHopBroadcast || 0) >= 500) {
        st.lastHopBroadcast = now;
        broadcast(room, hopStateMsg(room));
      }
    }
    if (room.roundGame === 'bit-mat' && room.phase.startsWith('round')) {
      const st = room.roundState;
      if (st && now - (st.lastCue || 0) >= 2000) {
        st.lastCue = now;
        for (const g of st.groups || []) {
          if (g.caught) continue;
          const goat = room.players.get(g.goatId);
          if (!goat) continue;
          for (const sid of g.seekerIds) {
            const s = room.players.get(sid);
            if (!s || !s.ws || !s.alive) continue;
            const dx = goat.x - s.x, dz = goat.z - s.z;
            const dist = Math.hypot(dx, dz);
            const dir = Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 'east' : 'west') : (dz > 0 ? 'south' : 'north');
            send(s.ws, { type: 'cue', dir, dist: Math.round(dist * 10) / 10 });
          }
        }
      }
      // Goat must move: if a goat has not moved in 10s, warn (no auto-elimination;
      // seekers close in via cues). Movement is tracked via input/pos only.
    }
    if (room.roundGame === 'to-he' && room.phase.startsWith('round')) {
      const alive = survivorsOf(room);
      if (alive.length && alive.every((p) => p.traceScore != null)) endRound(room, room.round, 'all-traced');
    }
    // 5) AOI tick snapshot: only players within 40 units + leaders / flag holder.
    if (room.phase !== 'lobby' && room.phase !== 'finished') {
      const leaders = new Set();
      for (const b of Object.values(room.bridges || {})) if (b.leader) leaders.add(b.leader);
      if (room.roundState && room.roundState.flag && room.roundState.flag.holderId) leaders.add(room.roundState.flag.holderId);
      for (const p of room.players.values()) {
        if (!p.ws) continue;
        const nearby = [];
        for (const q of room.players.values()) {
          if (q.id === p.id) { nearby.push({ id: q.id, x: q.x, z: q.z, alive: q.alive }); continue; }
          if (leaders.has(q.id) || Math.hypot(q.x - p.x, q.z - p.z) <= 40) {
            nearby.push({ id: q.id, x: q.x, z: q.z, alive: q.alive });
          }
        }
        send(p.ws, { type: 'tick', t: now, players: nearby });
      }
    }
  }
}, TICK_MS);

server.listen(PORT, () => {
  logEvent('server_start', { port: PORT });
  console.log('Trống Hội & Cầu Khỉ chạy tại http://localhost:' + PORT);
  console.log('Chế độ chơi đơn không cần server, nhưng mở qua địa chỉ trên là tiện nhất.');
});

// P3-05 (cycle 19, bước 1): tắt có trật tự — ghi log rồi đóng WS + HTTP
// rồi mới thoát 0 (supervisor chỉ chạy lại khi exit != 0). setTimeout dự
// phòng: WS đang mở giữ server.close() treo thì vẫn thoát sau 2s.
let shuttingDown = false;
function gracefulShutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logEvent('server_stop', { signal });
  try { wss.close(); } catch (e) { /* already closed */ }
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 2000).unref();
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Hook CHỈ DÙNG CHO TEST (mặc định tắt): HOI_TEST_CRASH=1 thì tự throw 1
// lỗi uncaught sau 500ms để kiểm chứng đường fatal -> exit(1) thật.
if (process.env.HOI_TEST_CRASH === '1') {
  setTimeout(() => { throw new Error('HOI_TEST_CRASH'); }, 500);
}
