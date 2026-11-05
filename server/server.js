'use strict';
/**
 * Trống Hội & Cầu Khỉ — game server (6 vòng, seeded, scale 456).
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
 *                                   lượt + tính rải/cướp quân.
 *     hop {}                      : Nhảy Bao Bố — nhảy theo vạch nhịp của server.
 *     reconnect {token}           : quay lại đúng slot trong 30 giây ân hạn.
 *     economy {action, ...}       : ủy quyền cho server/economy.js nếu có,
 *                                   chưa có thì trả lỗi 'Economy chưa sẵn sàng.'
 *   MỚI — Server -> Client:
 *     reconnectToken {token}      : gửi kèm `joined`, dùng để reconnect.
 *     roundStart {round, game, name, timeLimit, seed}
 *     roundEnd {round, game, survivors, eliminated:[ids]}
 *     tick {t, players:[{id,x,z,alive}]} : snapshot 15Hz, AOI 40 đơn vị
 *                                   (+ leader / người giữ cờ luôn gửi).
 *     tugState {sidePower:[a,b], threshold, timeLeft}
 *     traceTarget {shape, points} : mẫu Nặn Tò He (1 trong 6 hình seeded).
 *     blind {blind}               : Bịt Mắt — true = người đi tìm (tối màn hình).
 *     cue {dir, dist}             : Bịt Mắt — gợi ý âm thanh mỗi 2s cho người tìm.
 *     caught {goatId, seekerId}   : Bịt Mắt — dê bị bắt.
 *     flag {holderId}             : Rồng Rắn — ai đang giữ cờ.
 *     oanquanState {board, turnId, scores}
 *     hopState {progress:{id: n}, beatPhase}
 *     tugResult / traceResult      : (thông qua roundEnd + players)
 *   HTTP: GET /health -> {ok:true, rooms, players, uptime}
 *         GET /        -> client/index.html (file tĩnh như cũ)
 *
 * ĐƯỜNG LOẠI (games.scaledTargets): 456 -> 280 -> 150 -> 70 -> 24 -> 6 -> 1,
 * co giãn theo phòng nhỏ; khi chỉ còn 1-2 người thì không ép loại, trừ vòng
 * cuối luôn về 1 người thắng.
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

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
};

function serveStatic(req, res) {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  if (urlPath === '/health') {
    let players = 0;
    for (const r of rooms.values()) players += r.players.size;
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true, rooms: rooms.size, players, uptime: Math.floor((Date.now() - STARTED_AT) / 1000) }));
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
function validateName(raw) {
  let name = String(raw == null ? '' : raw).replace(/[\u0000-\u001f\u007f]/g, '').trim();
  if (!name) return { ok: true, name: 'Người chơi' };
  if (name.length > 30) name = name.slice(0, 30);
  const lower = name.toLowerCase();
  for (const w of BANNED_WORDS) {
    if (w && lower.includes(w)) return { ok: false, reason: 'Tên chứa từ không phù hợp.' };
  }
  if (!name) return { ok: true, name: 'Người chơi' };
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
  return { code: room.code, count: room.players.size, phase: room.phase };
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
    bridges: {}, ranking: [], matchId: 0, round: 0, roundPlan: [],
    roundGame: null, roundName: null, roundSeed: '', roundSeedNum: 0,
    roundDeadline: 0, roundTimeLimit: 0, roundState: null, roundStartCount: 0,
    subArenas: [], targets: [], inputQueue: [],
  };
  rooms.set(room.code, room);
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

function buildRoundPlan(room) {
  const seedNum = games.hashSeed(room.code + ':' + room.matchId);
  const picked = games.pickRounds(seedNum, games.ROUND_POOL.length, 3); // indices into ROUND_POOL
  const mid = picked.map((i) => games.ROUND_POOL[i]);
  const plan = [
    { round: 1, game: 'trong-hoi', name: games.ROUND_NAMES['trong-hoi'], timeLimit: games.ROUND_TIME_LIMITS['trong-hoi'] },
    { round: 2, game: 'cau-khi', name: games.ROUND_NAMES['cau-khi'], timeLimit: games.ROUND_TIME_LIMITS['cau-khi'] },
    { round: 3, game: mid[0], name: games.ROUND_NAMES[mid[0]], timeLimit: games.ROUND_TIME_LIMITS[mid[0]] },
    { round: 4, game: mid[1], name: games.ROUND_NAMES[mid[1]], timeLimit: games.ROUND_TIME_LIMITS[mid[1]] },
    { round: 5, game: mid[2], name: games.ROUND_NAMES[mid[2]], timeLimit: games.ROUND_TIME_LIMITS[mid[2]] },
    { round: 6, game: 'rong-ran', name: games.ROUND_NAMES['rong-ran'], timeLimit: games.ROUND_TIME_LIMITS['rong-ran'] },
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
        queue: [], leader: null,
      };
    }
    bridges[team].queue.push(p.id);
  });
  room.bridges = bridges;
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
  broadcast(room, { type: 'turn', team, leaderId: b.leader });
}
function eliminatePlayer(room, player, reason) {
  if (!player.alive) return;
  player.alive = false; player.spectator = true;
  logEvent('elimination', { room: room.code, matchId: room.matchId, round: room.round, playerId: player.id, name: player.name, reason });
  broadcast(room, { type: 'eliminated', id: player.id, reason });
}
function finishRound2Player(room, player) {
  player.round2Finished = true;
  player.finishTime = Date.now() - room.matchStart;
  room.ranking.push({ id: player.id, name: player.name, team: player.team, time: player.finishTime });
  broadcast(room, { type: 'ranking', ranking: room.ranking });
  advanceLeader(room, player.team);
  const anyoneLeft = [...room.players.values()].some((p) => p.alive && !p.round2Finished);
  if (!anyoneLeft) endRound(room, 2, 'all-finished');
}

function startMatch(room) {
  room.phase = 'countdown';
  room.matchId = nextMatchId++;
  room.matchStart = Date.now();
  room.ranking = [];
  room.targets = games.scaledTargets([...room.players.values()].filter((p) => !p.spectator).length || 1);
  buildRoundPlan(room);
  const starters = [...room.players.values()].filter((p) => !p.spectator);
  // Shard Round 1 into sub-arenas of ~57 players.
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
  for (const p of room.players.values()) {
    p.alive = true; p.finished = false; p.finishTime = null; p.spectator = false;
    p.team = null; p.bridgeStep = 0; p.round2Finished = false;
    p.tugPower = 0; p.tugSide = null; p.traceScore = null;
    p.hopProgress = 0; p.hopStumbles = 0; p.hopFinished = false; p.hopFinishTime = null;
    p.oanquanScore = 0; p.flags = 0; p.inputQueue = [];
    p.x = (rng() * 16 - 8); p.z = START_Z; p.gongX = p.x; p.gongZ = p.z;
  }
  logEvent('match_start', { room: room.code, matchId: room.matchId, players: starters.length, targets: room.targets, plan: room.roundPlan.map((r) => r.game) });
  starters.forEach((pl) => econSafe((ec) => ec.recordMatchPlayed(pl.id, pl.name)));
  broadcast(room, { type: 'phase', phase: 'countdown', players: publicPlayers(room) });
  setTimeout(() => {
    if (room.phase !== 'countdown') return;
    startRound(room, 1);
    broadcastLobbyList();
  }, 3200);
}

function startRound(room, n) {
  const plan = room.roundPlan[n - 1];
  if (!plan) { endMatch(room); return; }
  room.round = n;
  room.roundGame = plan.game;
  room.roundName = plan.name;
  room.roundTimeLimit = plan.timeLimit;
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
    // Tell seekers they are blind, goats they can see.
    for (const g of groups) {
      const goat = room.players.get(g.goatId);
      if (goat && goat.ws) send(goat.ws, { type: 'blind', blind: false });
      for (const sid of g.seekerIds) {
        const s = room.players.get(sid);
        if (s && s.ws) send(s.ws, { type: 'blind', blind: true });
      }
    }
  } else if (plan.game === 'o-an-quan') {
    const alive = [...room.players.values()].filter((p) => p.alive && !p.spectator).sort((a, b) => a.id - b.id);
    for (const p of alive) p.oanquanScore = 0;
    state = {
      board: [10, 5, 5, 5, 5, 5, 10, 5, 5, 5, 5, 5],
      turnOrder: alive.map((p) => p.id), turnIdx: 0, turnsTaken: {}, scores: {},
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
  room.roundState = state;
  logEvent('round_start', { room: room.code, matchId: room.matchId, round: n, game: plan.game, timeLimit: plan.timeLimit, seed: room.roundSeed, players: room.roundStartCount });
  broadcast(room, { type: 'roundStart', round: n, game: plan.game, name: plan.name, timeLimit: plan.timeLimit, seed: room.roundSeed });
  broadcast(room, { type: 'phase', phase: phaseName, game: plan.game, name: plan.name, players: publicPlayers(room) });
  if (plan.game === 'to-he') {
    broadcast(room, { type: 'traceTarget', shape: state.shape, points: state.points });
  }
  if (plan.game === 'o-an-quan') {
    broadcast(room, { type: 'oanquanState', board: state.board, turnId: state.turnOrder[0] || null, scores: state.scores });
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

function endRound(room, n, reason) {
  if (room.round !== n || room.phase === 'finished' || room.phase === 'lobby') return;
  const game = room.roundGame;
  const target = room.targets[n - 1] != null ? room.targets[n - 1] : 1;
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
  const survivors = survivorsOf(room).map((p) => p.id);
  survivorsOf(room).forEach((pl) => econSafe((ec) => ec.awardRoundSurvived(pl.id, pl.name)));
  logEvent('round_end', { room: room.code, matchId: room.matchId, round: n, game, reason, survivors: survivors.length, eliminated: eliminated.length });
  broadcast(room, { type: 'roundEnd', round: n, game, survivors, eliminated });
  broadcast(room, { type: 'players', players: publicPlayers(room) });
  room.roundDeadline = 0;
  if (survivors.length <= 1 || n >= 6) { endMatch(room); return; }
  if (n === 1) {
    room.phase = 'team';
    const teamSurvivors = assignTeams(room);
    broadcast(room, {
      type: 'phase', phase: 'team',
      teams: teamSurvivors.map((p) => ({ id: p.id, name: p.name, team: p.team })),
      players: publicPlayers(room),
    });
    // Gửi lại lượt của từng đội SAU khi client đã biết mình thuộc đội nào
    // (assignTeams đã gửi 'turn' trước tin 'team', lúc đó client chưa biết team
    // của mình nên không khớp được lượt với đội của mình).
    for (const team of Object.keys(room.bridges)) {
      const b = room.bridges[team];
      if (b) broadcast(room, { type: 'turn', team: Number(team), leaderId: b.leader });
    }
    setTimeout(() => {
      if (room.phase !== 'team') return;
      startRound(room, 2);
    }, 5500);
    return;
  }
  startRound(room, n + 1);
}

function endMatch(room) {
  if (room.phase === 'finished') return;
  room.phase = 'finished';
  room.roundDeadline = 0;
  // Winner: last survivor, or flag holder, or fastest ranking entry.
  let winner = survivorsOf(room)[0] || null;
  if (!winner && room.ranking.length) {
    const top = room.ranking[0];
    winner = room.players.get(top.id) || null;
  }
  if (winner && !room.ranking.some((r) => r.id === winner.id)) {
    room.ranking.unshift({ id: winner.id, name: winner.name, team: winner.team, time: Date.now() - room.matchStart });
  }
  if (winner) econSafe((ec) => ec.awardWin(winner.id, winner.name));
  logEvent('match_end', { room: room.code, matchId: room.matchId, winnerId: winner ? winner.id : null, ranking: room.ranking.length });
  broadcast(room, { type: 'phase', phase: 'finished', ranking: room.ranking, winnerId: winner ? winner.id : null });
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
  if (room.players.size === 0) { rooms.delete(room.code); broadcastLobbyList(); return; }
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
      send(ws, { type: 'joined', code: room.code, isHost: player.isHost, players: publicPlayers(room), phase: room.phase, reconnected: true });
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
      info.name = v.name; info.roomCode = room.code;
      const player = makePlayer(id, v.name, ws, true);
      player.reconnectToken = makeReconnectToken();
      reconnectTokens.set(player.reconnectToken, { roomCode: room.code, playerId: id, expiresAt: Date.now() + RECONNECT_GRACE_MS, timeout: null });
      room.players.set(id, player);
      send(ws, { type: 'reconnectToken', token: player.reconnectToken });
      send(ws, { type: 'joined', code: room.code, isHost: true, players: publicPlayers(room) });
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
        send(ws, { type: 'joined', code: room.code, isHost: false, spectator: true, players: publicPlayers(room), phase: room.phase });
        return;
      }
      room.players.set(id, player);
      broadcast(room, { type: 'players', players: publicPlayers(room) });
      send(ws, { type: 'reconnectToken', token: player.reconnectToken });
      send(ws, { type: 'joined', code: room.code, isHost: player.isHost, players: publicPlayers(room) });
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
      econSafe((ec) => ec.recordChatSent(player.id, player.name));
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
      // Side check: turn order alternates sides; pit must belong to player's side.
      const side = st.turnOrder.indexOf(player.id) % 2 === 0 ? [0, 1, 2, 3, 4, 5] : [6, 7, 8, 9, 10, 11];
      // Simpler ownership: first half of turn order plays pits 0-5, second half 6-11 is
      // too rigid for >2 players, so allow any non-empty pit except the two quan
      // pits when the player has not yet scored — but enforce non-empty + not quan
      // unless it is the only move. Keep validation: pit must be non-empty.
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
      st.turnIdx++;
      // Skip eliminated / finished players in turn order.
      let guard = 0;
      while (guard++ < st.turnOrder.length) {
        const nid = st.turnOrder[st.turnIdx % st.turnOrder.length];
        const np = room.players.get(nid);
        if (np && np.alive) break;
        st.turnIdx++;
      }
      broadcast(room, { type: 'oanquanState', board: st.board, turnId: st.turnOrder[st.turnIdx % st.turnOrder.length], scores: st.scores });
      const allDone = st.turnOrder.every((pid) => (st.turnsTaken[pid] || 0) >= 3);
      const boardEmpty = st.board.reduce((a, b) => a + b, 0) <= 2;
      if (allDone || boardEmpty) endRound(room, room.round, allDone ? 'all-turns-done' : 'board-empty');
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
        broadcast(room, { type: 'hopState', progress: Object.fromEntries(survivorsOf(room).map((p) => [p.id, p.hopProgress])), beatPhase: phase });
        const target = room.targets[room.round - 1] || 1;
        if (st.finishOrder.length >= target) endRound(room, room.round, 'hop-target-reached');
      }
      return;
    }
    if (msg.type === 'replay') {
      if (room.phase !== 'finished') return;
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
    // 4) Per-game tick work.
    if (room.roundGame === 'keo-co') {
      const st = room.roundState;
      if (st && now - (st.lastBroadcast || 0) >= 500) {
        st.lastBroadcast = now;
        broadcast(room, { type: 'tugState', sidePower: st.sidePower, threshold: st.threshold, timeLeft: Math.max(0, Math.ceil((room.roundDeadline - now) / 1000)) });
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
