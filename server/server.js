'use strict';
/**
 * Trống Hội & Cầu Khỉ — game server.
 * Node.js + WebSocket (ws), không framework. Vừa phục vụ file client tĩnh,
 * vừa làm game server có thẩm quyền cho chế độ multiplayer.
 *
 * Luật ràng buộc:
 * - Trống = chạy, chiêng = đứng yên tuyệt đối. Server quyết định nhịp và loại.
 * - CHIA TEAM chỉ để chia lượt, không có team thắng/thua, không xếp hạng team.
 * - Cầu Khỉ: ván yếu random phía server, rớt là loại cá nhân.
 * - Chat: tối đa 120 ký tự, chống spam 2 giây/tin, qua server tới cả phòng.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const PORT = Number(process.env.PORT || 3000);
const CLIENT_DIR = path.join(__dirname, '..', 'client');
const START_Z = 35;
const FINISH_Z = -35;
const TEAM_COLORS = ['#e53935', '#f9a825', '#43a047'];
const TEAM_NAMES = ['Đỏ', 'Vàng', 'Xanh lá'];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
};

function serveStatic(req, res) {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  const safe = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(CLIENT_DIR, safe);
  if (!filePath.startsWith(CLIENT_DIR)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer(serveStatic);
const wss = new WebSocket.Server({ server });

let nextPlayerId = 1;
const rooms = new Map(); // code -> room
const clients = new Map(); // ws -> { id, name, roomCode }

function randomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return rooms.has(code) ? randomCode() : code;
}
function randInt(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }
function send(ws, obj) { try { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj)); } catch (e) {} }
function broadcast(room, obj, exceptWs) {
  for (const p of room.players.values()) {
    if (p.ws && p.ws !== exceptWs) send(p.ws, obj);
  }
}
function publicPlayers(room) {
  return [...room.players.values()].map((p) => ({
    id: p.id, name: p.name, isHost: p.isHost, alive: p.alive,
    team: p.team, x: p.x, z: p.z, finished: p.finished, finishTime: p.finishTime,
    spectator: p.spectator, bridgeStep: p.bridgeStep,
  }));
}
function roomSummary(room) {
  return { code: room.code, count: room.players.size, phase: room.phase };
}
function broadcastLobbyList() {
  const list = [...rooms.values()]
    .filter((r) => r.phase === 'lobby')
    .map(roomSummary);
  for (const [ws, info] of clients.entries()) {
    if (!info.roomCode) send(ws, { type: 'rooms', rooms: list });
  }
}
function makeRoom() {
  const room = {
    code: randomCode(), players: new Map(), phase: 'lobby',
    drumState: 'drum', phaseEnd: 0, startedAt: 0, matchStart: 0,
    bridges: {}, // teamIndex -> { weak: [9], broken: [false x9], queue: [ids], leader: id|null }
    ranking: [],
  };
  rooms.set(room.code, room);
  return room;
}
function assignTeams(room) {
  const survivors = [...room.players.values()]
    .filter((p) => p.alive && p.finished)
    .sort((a, b) => (a.finishTime || 0) - (b.finishTime || 0));
  const teamCount = Math.min(3, Math.max(1, survivors.length));
  const bridges = {};
  survivors.forEach((p, i) => {
    const team = i % teamCount;
    p.team = team;
    p.bridgeStep = 0;
    p.round2Finished = false;
    if (!bridges[team]) {
      bridges[team] = {
        weak: Array.from({ length: 9 }, () => randInt(0, 1)),
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
function finishRound2Player(room, player) {
  player.round2Finished = true;
  player.finishTime = Date.now() - room.matchStart;
  room.ranking.push({ id: player.id, name: player.name, team: player.team, time: player.finishTime });
  broadcast(room, { type: 'ranking', ranking: room.ranking });
  advanceLeader(room, player.team);
  const anyoneLeft = [...room.players.values()].some((p) => p.alive && !p.round2Finished);
  if (!anyoneLeft) endMatch(room);
}
function endMatch(room) {
  room.phase = 'finished';
  broadcast(room, { type: 'phase', phase: 'finished', ranking: room.ranking });
  broadcastLobbyList();
}
function startMatch(room) {
  room.phase = 'countdown';
  room.matchStart = Date.now();
  room.ranking = [];
  for (const p of room.players.values()) {
    p.alive = true; p.finished = false; p.finishTime = null; p.spectator = false;
    p.team = null; p.bridgeStep = 0; p.round2Finished = false;
    p.x = randInt(-8, 8); p.z = START_Z; p.gongX = p.x; p.gongZ = p.z;
  }
  broadcast(room, { type: 'phase', phase: 'countdown', players: publicPlayers(room) });
  setTimeout(() => {
    if (room.phase !== 'countdown') return;
    room.phase = 'round1';
    room.drumState = 'drum';
    room.phaseEnd = Date.now() + randInt(2500, 5000);
    broadcast(room, { type: 'phase', phase: 'round1', drum: 'drum', players: publicPlayers(room) });
    broadcastLobbyList();
  }, 3200);
}
function checkRound1End(room) {
  if (room.phase !== 'round1') return;
  const active = [...room.players.values()].filter((p) => p.alive && !p.finished);
  if (active.length === 0) {
    room.phase = 'team';
    const survivors = assignTeams(room);
    broadcast(room, {
      type: 'phase', phase: 'team',
      teams: survivors.map((p) => ({ id: p.id, name: p.name, team: p.team })),
      players: publicPlayers(room),
    });
    // Sau màn hình CHIA TEAM, client sẽ chờ lệnh round2 từ server sau 5.5 giây.
    setTimeout(() => {
      if (room.phase !== 'team') return;
      room.phase = 'round2';
      broadcast(room, { type: 'phase', phase: 'round2', players: publicPlayers(room) });
    }, 5500);
  }
}

wss.on('connection', (ws) => {
  const id = nextPlayerId++;
  clients.set(ws, { id, name: '', roomCode: null });
  send(ws, { type: 'welcome', id });

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch (e) { return; }
    const info = clients.get(ws);
    if (!info) return;

    if (msg.type === 'list') {
      send(ws, { type: 'rooms', rooms: [...rooms.values()].filter((r) => r.phase === 'lobby').map(roomSummary) });
      return;
    }
    if (msg.type === 'create') {
      const room = makeRoom();
      info.name = String(msg.name || 'Người chơi').slice(0, 30);
      info.roomCode = room.code;
      const player = { id, name: info.name, ws, isHost: true, alive: true, finished: false, finishTime: null, spectator: false, team: null, x: 0, z: START_Z, gongX: 0, gongZ: START_Z, bridgeStep: 0, round2Finished: false, lastChat: 0 };
      room.players.set(id, player);
      send(ws, { type: 'joined', code: room.code, isHost: true, players: publicPlayers(room) });
      broadcastLobbyList();
      return;
    }
    if (msg.type === 'join') {
      const code = String(msg.code || '').toUpperCase().trim();
      const room = rooms.get(code);
      if (!room) { send(ws, { type: 'error', message: 'Không tìm thấy phòng ' + code }); return; }
      if (room.phase !== 'lobby') {
        // Vào giữa trận chỉ được làm khán giả.
        info.name = String(msg.name || 'Khán giả').slice(0, 30);
        info.roomCode = code;
        const player = { id, name: info.name, ws, isHost: false, alive: false, finished: false, finishTime: null, spectator: true, team: null, x: 0, z: START_Z, gongX: 0, gongZ: START_Z, bridgeStep: 0, round2Finished: false, lastChat: 0 };
        room.players.set(id, player);
        send(ws, { type: 'joined', code, isHost: false, spectator: true, players: publicPlayers(room), phase: room.phase });
        return;
      }
      info.name = String(msg.name || 'Người chơi').slice(0, 30);
      info.roomCode = code;
      const player = { id, name: info.name, ws, isHost: room.players.size === 0, alive: true, finished: false, finishTime: null, spectator: false, team: null, x: 0, z: START_Z, gongX: 0, gongZ: START_Z, bridgeStep: 0, round2Finished: false, lastChat: 0 };
      room.players.set(id, player);
      broadcast(room, { type: 'players', players: publicPlayers(room) });
      send(ws, { type: 'joined', code, isHost: player.isHost, players: publicPlayers(room) });
      if (room.players.size >= 20) startMatch(room);
      broadcastLobbyList();
      return;
    }

    const room = info.roomCode ? rooms.get(info.roomCode) : null;
    if (!room) { send(ws, { type: 'error', message: 'Bạn chưa vào phòng.' }); return; }
    const player = room.players.get(id);
    if (!player) return;

    if (msg.type === 'start') {
      if (!player.isHost) { send(ws, { type: 'error', message: 'Chỉ chủ phòng mới bắt đầu được.' }); return; }
      if (room.phase !== 'lobby') return;
      if (room.players.size < 2) { send(ws, { type: 'error', message: 'Cần ít nhất 2 người mới bắt đầu.' }); return; }
      startMatch(room);
      return;
    }
    if (msg.type === 'pos') {
      const x = Number(msg.x), z = Number(msg.z);
      if (!Number.isFinite(x) || !Number.isFinite(z)) return;
      const moved = Math.hypot(x - player.x, z - player.z);
      player.x = x; player.z = z;
      if (room.phase === 'round1' && player.alive && !player.finished) {
        if (room.drumState === 'gong') {
          // Đứng yên tuyệt đối trong lúc chiêng: lệch khỏi vị trí lúc chiêng vang là loại.
          if (Math.hypot(x - player.gongX, z - player.gongZ) > 0.6 || msg.jumped) {
            player.alive = false; player.spectator = true;
            broadcast(room, { type: 'eliminated', id: player.id, reason: 'Di chuyển trong lúc chiêng' });
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
      broadcast(room, { type: 'playerPos', id: player.id, x, z, alive: player.alive, team: player.team }, ws);
      return;
    }
    if (msg.type === 'chat') {
      const text = String(msg.text || '').trim().slice(0, 120);
      if (!text) return;
      if (text.length > 120) { send(ws, { type: 'error', message: 'Tin nhắn tối đa 120 ký tự.' }); return; }
      const now = Date.now();
      if (now - player.lastChat < 2000) { send(ws, { type: 'error', message: 'Gửi chậm lại một chút (2 giây/tin).' }); return; }
      player.lastChat = now;
      broadcast(room, {
        type: 'chat', senderId: player.id, name: player.name,
        team: player.team, text, time: new Date(now).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
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
        // Khoảng trống do ván đã vỡ: chỉ nhảy qua mới được đi tiếp.
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
          player.alive = false; player.spectator = true;
          broadcast(room, { type: 'eliminated', id: player.id, reason: 'Bước vào ván yếu, rơi khỏi cầu' });
          broadcast(room, { type: 'bridgeUpdate', team: player.team, step, broken: true });
          broadcast(room, { type: 'players', players: publicPlayers(room) });
          advanceLeader(room, player.team);
          const anyoneLeft = [...room.players.values()].some((p) => p.alive && !p.round2Finished);
          if (!anyoneLeft) endMatch(room);
        } else {
          player.bridgeStep++;
          broadcast(room, { type: 'bridgeUpdate', team: player.team, step, broken: false, playerId: player.id, bridgeStep: player.bridgeStep });
          if (player.bridgeStep >= 9) finishRound2Player(room, player);
          else broadcast(room, { type: 'players', players: publicPlayers(room) });
        }
      }
      return;
    }
    if (msg.type === 'replay') {
      if (room.phase !== 'finished') return;
      room.phase = 'lobby'; room.ranking = []; room.bridges = {};
      for (const p of room.players.values()) {
        p.alive = true; p.finished = false; p.finishTime = null; p.spectator = false;
        p.team = null; p.bridgeStep = 0; p.round2Finished = false; p.x = 0; p.z = START_Z;
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
    const wasLeader = room.bridges && Object.values(room.bridges).some((b) => b.leader === info.id);
    const wasHost = room.players.get(info.id)?.isHost;
    room.players.delete(info.id);
    if (room.players.size === 0) { rooms.delete(room.code); broadcastLobbyList(); return; }
    if (wasHost) {
      const first = [...room.players.values()][0];
      first.isHost = true;
    }
    if (wasLeader) {
      for (const team of Object.keys(room.bridges)) {
        if (room.bridges[team].leader === info.id) advanceLeader(room, Number(team));
      }
    }
    broadcast(room, { type: 'players', players: publicPlayers(room) });
    broadcastLobbyList();
  });
});

// Vòng lặp nhịp trống/chiêng của server, kiểm tra mỗi 200ms.
setInterval(() => {
  const now = Date.now();
  for (const room of rooms.values()) {
    if (room.phase !== 'round1') continue;
    if (now >= room.phaseEnd) {
      room.drumState = room.drumState === 'drum' ? 'gong' : 'drum';
      room.phaseEnd = now + (room.drumState === 'drum' ? randInt(2500, 5000) : randInt(2000, 4000));
      if (room.drumState === 'gong') {
        for (const p of room.players.values()) { p.gongX = p.x; p.gongZ = p.z; }
      }
      broadcast(room, { type: 'drum', drum: room.drumState });
    }
  }
}, 200);

server.listen(PORT, () => {
  console.log('Trống Hội & Cầu Khỉ chạy tại http://localhost:' + PORT);
  console.log('Chế độ chơi đơn không cần server, nhưng mở qua địa chỉ trên là tiện nhất.');
});
