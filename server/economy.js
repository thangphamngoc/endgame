'use strict';
/**
 * economy.js — Kinh tế trong game "Trống Hội & Cầu Khỉ" (BẢN DEMO / STUB).
 *
 * - Tiền tệ duy nhất kiếm được trong game là Hội Xu (xu): chỉ mua đồ
 *   trang trí (cosmetic). Không mua chỉ số, không mua lợi thế trận đấu.
 * - Tiền thật là STUB ONLY: không có xử lý thanh toán thật, không gọi
 *   cổng thanh toán nào. Mọi nút "tiền thật" đều trả về
 *   { ok: true, stub: true } kèm thông báo demo và chỉ mở khóa thử
 *   trong bản demo. Xem docs/BRD.md §10 (MONETIZATION).
 * - Cấm: pay-to-win, cá cược/đặt tiền vào kết quả trận, loot box
 *   (hộp quà ngẫu nhiên trả phí), bán chỉ số.
 *
 * Cách server.js tích hợp (workstream server sở hữu server.js):
 *   const economy = (() => { try { return require('./economy'); } catch (e) { return null; } })();
 *   // trong ws.on('message'), trước các if (msg.type === ...) khác:
 *   if (msg.type === 'economy' && economy) {
 *     economy.handle(room, player, msg,
 *       (obj) => send(ws, obj),            // send: gửi riêng cho người này
 *       (obj) => broadcast(room, obj));    // broadcast: gửi cả phòng
 *     return;
 *   }
 *   // Hook kiếm xu/XP (gọi ở đúng chỗ trong server.js):
 *   //   economy.awardRoundSurvived(player.id, player.name)  // qua 1 vòng
 *   //   economy.awardWin(player.id, player.name)            // thắng trận
 *   //   economy.recordMatchPlayed(player.id, player.name)   // bắt đầu trận
 *   //   economy.recordChatSent(player.id, player.name)      // gửi 1 chat
 *   //   economy.awardTournamentWinner(tournamentId, winnerId)
 *   //   economy.economyEvent(room, player) — xem dưới.
 * handle() cũng chấp nhận send/broadcast dạng thô của server
 * (send(ws, obj) / broadcast(room, obj, exceptWs)) và tự điều chỉnh.
 *
 * Lưu trữ: JSON tại data/economy.json (tạo thư mục data/ nếu chưa có).
 * Toàn bộ trạng thái nằm trong RAM (Map) và được ghi ra file mỗi khi đổi.
 * Đây là bản demo: không dùng cho production (cần database + xác thực
 * tài khoản trước khi mở public — xem docs/ARCHITECTURE.md §7.5).
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'economy.json');

// STUB thật/tiền thật: bật/tắt qua biến môi trường. Dù tắt hay bật,
// KHÔNG BAO GIỜ có xử lý thanh toán thật trong module này.
const ECONOMY_STUB = process.env.ECONOMY_STUB !== 'false';
const STUB_MESSAGE = 'Thanh toán thật chưa bật — đây là bản demo, Pass đã mở khóa thử.';

/* ------------------------------------------------------------------ */
/* Catalogue — toàn đồ trang trí (cosmetic), không chỉ số, không buff  */
/* ------------------------------------------------------------------ */

// Áo Bà Ba Đỏ/Xanh/Vàng chỉ là biến thể MÀU, không khác chỉ số.
const CATALOGUE = [
  { id: 'skin-baba-do',    name: 'Áo Bà Ba Đỏ',    kind: 'skin',   price: 150, desc: 'Áo bà ba đỏ — chỉ đổi màu áo, không đổi chỉ số.' },
  { id: 'skin-baba-xanh',  name: 'Áo Bà Ba Xanh',  kind: 'skin',   price: 150, desc: 'Áo bà ba xanh — chỉ đổi màu áo, không đổi chỉ số.' },
  { id: 'skin-baba-vang',  name: 'Áo Bà Ba Vàng',  kind: 'skin',   price: 150, desc: 'Áo bà ba vàng — chỉ đổi màu áo, không đổi chỉ số.' },
  { id: 'hat-nonla-trang', name: 'Nón Lá Trắng',   kind: 'hat',    price: 100, desc: 'Nón lá trắng truyền thống.' },
  { id: 'hat-nonla-hoa',   name: 'Nón Lá Hoa Sen', kind: 'hat',    price: 200, desc: 'Nón lá thêu hoa sen.' },
  { id: 'hat-khan-dong',   name: 'Khăn Đóng',      kind: 'hat',    price: 180, desc: 'Khăn đóng hội làng.' },
  { id: 'banner-trong-hoi', name: 'Cờ Trống Hội',  kind: 'banner', price: 120, desc: 'Cờ hiệu trống hội treo sau lưng.' },
  { id: 'banner-cau-khi',  name: 'Cờ Cầu Khỉ',     kind: 'banner', price: 120, desc: 'Cờ hiệu cầu khỉ treo sau lưng.' },
  { id: 'banner-ha-long',  name: 'Cờ Hạ Long',     kind: 'banner', price: 200, desc: 'Cờ hiệu vịnh Hạ Long.' },
  { id: 'bubble-la-tre',   name: 'Bong Bóng Lá Tre', kind: 'bubble', price: 80, desc: 'Kiểu bong bóng chat lá tre.' },
  { id: 'bubble-hoa-sen',  name: 'Bong Bóng Hoa Sen', kind: 'bubble', price: 150, desc: 'Kiểu bong bóng chat hoa sen.' },
  { id: 'emote-wave',      name: 'Vẫy Tay',        kind: 'emote',  price: 60,  desc: 'Động tác vẫy tay chào.' },
  { id: 'emote-drum',      name: 'Đánh Trống',     kind: 'emote',  price: 100, desc: 'Động tác đánh trống hội.' },
  { id: 'emote-cheer',     name: 'Reo Hò',         kind: 'emote',  price: 100, desc: 'Động tác reo hò cổ vũ.' },
  { id: 'decor-den-long',  name: 'Đèn Lồng Đình',  kind: 'decor',  price: 250, desc: 'Đèn lồng trang trí đảo hội làng của bạn.' },
  { id: 'decor-cay-da',    name: 'Cây Đa Đầu Làng', kind: 'decor', price: 300, desc: 'Cây đa trang trí đảo hội làng của bạn.' },
  // Chỉ nhận qua Hội Làng Pass (không bán trực tiếp bằng xu).
  { id: 'skin-baba-tim',   name: 'Áo Bà Ba Tím (Pass)', kind: 'skin', price: null, desc: 'Thưởng Pass trả phí cấp 10 — chỉ đổi màu áo.' },
  { id: 'hat-nonla-vang',  name: 'Nón Lá Vàng (Pass)', kind: 'hat',  price: null, desc: 'Thưởng Pass trả phí cấp 20 — trang trí.' },
  { id: 'banner-hoi-lang', name: 'Cờ Hội Làng Vàng (Pass)', kind: 'banner', price: null, desc: 'Thưởng Pass miễn phí cấp 15 — trang trí.' },
];

const STICKERS = [
  { id: 'sticker-hoa-sen',   name: 'Hoa Sen',     price: 10, desc: 'Tặng một bông sen.' },
  { id: 'sticker-trong-hoi', name: 'Trống Hội',   price: 20, desc: 'Tặng một chiếc trống hội.' },
  { id: 'sticker-ca-chep',   name: 'Cá Chép Vàng', price: 30, desc: 'Tặng một chú cá chép vàng.' },
];

const QUESTS = [
  { id: 'play-match',    name: 'Chơi 1 trận',        reward: 20, desc: 'Chơi 1 trận bất kỳ.' },
  { id: 'survive-2',     name: 'Sống sót 2 vòng',    reward: 20, desc: 'Sống sót qua 2 vòng trong ngày.' },
  { id: 'chat-5',        name: 'Gửi 5 tin chat',     reward: 20, desc: 'Gửi 5 tin nhắn chat trong ngày.' },
];

const TOUR_PASS_PRICE_XU = 500;
const XP_PER_LEVEL = 500; // 500 XP = 1 cấp. Tối đa cấp 20.
const MAX_PASS_LEVEL = 20;

// Thưởng Pass theo cấp: mỗi cấp có thưởng track miễn phí và track trả phí.
// Thưởng toàn đồ trang trí (item trong CATALOGUE, kể cả item chỉ có qua Pass).
const PASS_REWARDS = [
  { level: 2,  free: 'emote-wave',      paid: 'bubble-la-tre' },
  { level: 5,  free: 'hat-nonla-trang', paid: 'banner-trong-hoi' },
  { level: 8,  free: 'emote-drum',      paid: 'skin-baba-do' },
  { level: 10, free: 'banner-cau-khi',  paid: 'skin-baba-tim' },
  { level: 12, free: 'bubble-hoa-sen', paid: 'hat-nonla-hoa' },
  { level: 15, free: 'banner-hoi-lang', paid: 'decor-den-long' },
  { level: 18, free: 'emote-cheer',     paid: 'skin-baba-xanh' },
  { level: 20, free: 'decor-cay-da',    paid: 'hat-nonla-vang' },
];

const CHEER_REWARD_XU = 5;   // +5 xu cho người nhận mỗi lượt cổ vũ.
const CHEER_COOLDOWN_MS = 60 * 1000; // 1 người chỉ cổ vũ 1 người 1 lần/60 giây.

// Từ cấm tối thiểu cho tên giải đấu / thương hiệu (kiểm duyệt tên shop).
const BANNED_WORDS = ['địt', 'đụ', 'lồn', 'cặc', 'chết tiệt', 'fuck', 'shit', 'bitch'];

/* ------------------------------------------------------------------ */
/* State: profiles + tournaments, RAM + JSON                            */
/* ------------------------------------------------------------------ */

const profiles = new Map();    // playerId (string) -> profile
const tournaments = new Map(); // tournamentId -> tournament
let nextTournamentId = 1;
const cheerCooldown = new Map(); // `${fromId}:${toId}` -> timestamp

function todayStr() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

function sanitizeName(name) {
  if (typeof name !== 'string') return 'Khách';
  return name.trim().slice(0, 30) || 'Khách';
}

function newProfile(id, name) {
  return {
    id: String(id),
    name: sanitizeName(name),
    xu: 0,
    inventory: [],
    pass: { tier: 'free', level: 1, xp: 0, claimedLevels: [] },
    cosmetics: { skin: null, hat: null, banner: null, bubble: null },
    tournamentsCreated: [],
    giftsReceived: [],
    tourPass: { owned: false, via: null },
    quests: { date: todayStr(), playMatch: 0, surviveRounds: 0, chats: 0, claimed: [] },
  };
}

function getProfile(id, name) {
  const key = String(id);
  let p = profiles.get(key);
  if (!p) {
    p = newProfile(key, name);
    profiles.set(key, p);
  } else if (name) {
    p.name = sanitizeName(name);
  }
  // Reset nhiệm vụ ngày khi sang ngày mới.
  if (p.quests.date !== todayStr()) {
    p.quests = { date: todayStr(), playMatch: 0, surviveRounds: 0, chats: 0, claimed: [] };
  }
  return p;
}

function publicProfile(p) {
  return {
    id: p.id, name: p.name, xu: p.xu, inventory: [...p.inventory],
    pass: { ...p.pass, claimedLevels: [...p.pass.claimedLevels] },
    cosmetics: { ...p.cosmetics },
    tournamentsCreated: [...p.tournamentsCreated],
    giftsReceived: p.giftsReceived.slice(-20),
    tourPass: { ...p.tourPass },
    quests: { ...p.quests, claimed: [...p.quests.claimed] },
  };
}

function save() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const data = {
      savedAt: new Date().toISOString(),
      nextTournamentId,
      profiles: Object.fromEntries(profiles),
      tournaments: Object.fromEntries(tournaments),
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    // Lưu file lỗi thì game vẫn chạy bằng RAM; ghi log để server thấy.
    console.error('[economy] Không lưu được data/economy.json:', e.message);
  }
}

function load() {
  try {
    if (!fs.existsSync(DATA_FILE)) return;
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    nextTournamentId = data.nextTournamentId || 1;
    for (const [k, v] of Object.entries(data.profiles || {})) profiles.set(k, v);
    for (const [k, v] of Object.entries(data.tournaments || {})) tournaments.set(k, v);
  } catch (e) {
    console.error('[economy] Không đọc được data/economy.json, bắt đầu rỗng:', e.message);
  }
}
load();

/* ------------------------------------------------------------------ */
/* Helpers: XP / cấp Pass, kiểm duyệt tên                              */
/* ------------------------------------------------------------------ */

function levelForXp(xp) {
  return Math.min(MAX_PASS_LEVEL, 1 + Math.floor(Math.max(0, xp) / XP_PER_LEVEL));
}

function grantXp(p, amount) {
  p.pass.xp += amount;
  const newLevel = levelForXp(p.pass.xp);
  const granted = [];
  if (newLevel > p.pass.level) {
    // Lên cấp: tự nhận thưởng track miễn phí của các cấp mới đạt;
    // thưởng track trả phí chỉ nhận khi đã mở Pass trả phí.
    for (let lvl = p.pass.level + 1; lvl <= newLevel; lvl++) {
      const row = PASS_REWARDS.find((r) => r.level === lvl);
      if (!row) continue;
      if (row.free && !p.inventory.includes(row.free)) {
        p.inventory.push(row.free);
        granted.push({ level: lvl, track: 'free', itemId: row.free });
      }
      if (p.pass.tier === 'paid' && row.paid && !p.inventory.includes(row.paid)) {
        p.inventory.push(row.paid);
        granted.push({ level: lvl, track: 'paid', itemId: row.paid });
      }
      p.pass.claimedLevels.push(lvl);
    }
    p.pass.level = newLevel;
  }
  return granted;
}

function containsBannedWord(text) {
  const t = String(text || '').toLowerCase();
  return BANNED_WORDS.some((w) => t.includes(w));
}

function validateTournamentText(name, brand) {
  if (!name || typeof name !== 'string' || !name.trim()) return 'Tên giải đấu không được để trống.';
  if (name.trim().length > 40) return 'Tên giải đấu tối đa 40 ký tự.';
  if (brand && brand.length > 40) return 'Tên thương hiệu tối đa 40 ký tự.';
  if (containsBannedWord(name) || containsBannedWord(brand || '')) {
    return 'Tên giải đấu / thương hiệu chứa từ không được phép.';
  }
  return null;
}

function findItem(itemId) {
  return CATALOGUE.find((i) => i.id === itemId) || null;
}

/* ------------------------------------------------------------------ */
/* Lì xì Tết — #16 P4-06 bước 2b (cycle 36, 2026-11-08): lì xì Hội Xu  */
/* ở CHƠI NHIỀU NGƯỜI, y hệt mức chơi đơn ở client/js/local-economy.js */
/* (cycle 35): +8 xu/vòng sống sót, +20 xu/thắng, chỉ xu không XP.      */
/* Server tự tính mùa theo ngày ICT (UTC+7), KHÔNG tin mùa client gửi  */
/* (?season=tet của client chỉ đổi chủ đề/toast, không đổi thưởng —     */
/* chống cày xu bằng cách giả mùa). Cửa sổ Tết mirror client/js/       */
/* seasonal.js (nguồn chân lý về ngày đã kiểm chứng: Tết Hội Làng 2027 */
/* 30/01–10/02/2027); Sudo chốt lại ngày âm lịch mỗi năm trước khi mở.  */
/* Ghi đè để test/QC ngoài cửa sổ: HOI_SEASON_OVERRIDE=tet | none.      */
/* ------------------------------------------------------------------ */

const LIXI_XU_PER_ROUND = 8;
const LIXI_XU_PER_WIN = 20;
// Cửa sổ mùa (ngày dương cố định theo từng năm, xem seasonal.js).
const SEASONS = [
  { id: 'tet', start: '2027-01-30', end: '2027-02-10' },
];

// Ngày hiện tại theo giờ Việt Nam, dạng YYYY-MM-DD (so chuỗi là đủ).
function ictDateStr(now) {
  const d = (now instanceof Date) ? now : new Date(now || Date.now());
  return new Date(d.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

function detectSeason(now) {
  const ov = String(process.env.HOI_SEASON_OVERRIDE || '').trim().toLowerCase();
  if (ov === 'tet') return 'tet';
  if (ov === 'none' || ov === 'off' || ov === '0') return null;
  const today = ictDateStr(now);
  for (let i = 0; i < SEASONS.length; i++) {
    if (today >= SEASONS[i].start && today <= SEASONS[i].end) return SEASONS[i].id;
  }
  return null;
}

// opts.seasonId ghi đè rõ (phục vụ test), y hệt local-economy.js: có khóa
// seasonId thì lấy đúng giá trị đó (kể cả null = ép "không mùa"); mùa lạ
// (không có trong SEASONS) cũng thành null — không lì xì. Không có khóa
// thì detect theo ngày ICT (+ ghi đè env HOI_SEASON_OVERRIDE).
function seasonId(opts, now) {
  if (opts && Object.prototype.hasOwnProperty.call(opts, 'seasonId')) {
    const v = opts.seasonId;
    return (typeof v === 'string' && SEASONS.some((s) => s.id === v)) ? v : null;
  }
  return detectSeason(now);
}

function lixiFor(kind, sid) {
  if (sid !== 'tet') return 0;
  return kind === 'win' ? LIXI_XU_PER_WIN : LIXI_XU_PER_ROUND;
}

/* ------------------------------------------------------------------ */
/* Earn: xu + XP + tiến độ nhiệm vụ ngày                               */
/* ------------------------------------------------------------------ */

function awardRoundSurvived(playerId, name, opts) {
  const p = getProfile(playerId, name);
  const sid = seasonId(opts);
  const lixi = lixiFor('round', sid);
  p.xu += 10 + lixi; // +10 xu / vòng sống sót (+8 lì xì nếu mùa Tết)
  p.quests.surviveRounds += 1;
  const rewards = grantXp(p, 100); // 100 XP / vòng sống sót (lì xì không cộng XP)
  save();
  return { profile: publicProfile(p), rewards, lixi, seasonId: sid };
}

function awardWin(playerId, name, opts) {
  const p = getProfile(playerId, name);
  const sid = seasonId(opts);
  const lixi = lixiFor('win', sid);
  p.xu += 50 + lixi; // +50 xu khi thắng trận (+20 lì xì nếu mùa Tết)
  const rewards = grantXp(p, 500); // 500 XP / thắng trận (lì xì không cộng XP)
  save();
  return { profile: publicProfile(p), rewards, lixi, seasonId: sid };
}

function recordMatchPlayed(playerId, name) {
  const p = getProfile(playerId, name);
  p.quests.playMatch += 1;
  save();
  return publicProfile(p);
}

function recordChatSent(playerId, name) {
  const p = getProfile(playerId, name);
  p.quests.chats += 1;
  save();
  return publicProfile(p);
}

function claimDailyQuest(playerId, name, questId) {
  const p = getProfile(playerId, name);
  const quest = QUESTS.find((q) => q.id === questId);
  if (!quest) return { ok: false, error: 'Nhiệm vụ không tồn tại.' };
  if (p.quests.claimed.includes(questId)) return { ok: false, error: 'Đã nhận thưởng nhiệm vụ này hôm nay.' };
  const progress = { 'play-match': p.quests.playMatch, 'survive-2': p.quests.surviveRounds, 'chat-5': p.quests.chats }[questId] || 0;
  const need = { 'play-match': 1, 'survive-2': 2, 'chat-5': 5 }[questId];
  if (progress < need) return { ok: false, error: `Chưa đủ điều kiện (${progress}/${need}).` };
  p.quests.claimed.push(questId);
  p.xu += quest.reward; // +20 xu / nhiệm vụ ngày
  save();
  return { ok: true, reward: quest.reward, profile: publicProfile(p) };
}

/* ------------------------------------------------------------------ */
/* Spend: shop, trang bị (server kiểm tra sở hữu), Pass, tour, gift    */
/* ------------------------------------------------------------------ */

function buyItem(playerId, name, itemId) {
  const p = getProfile(playerId, name);
  const item = findItem(itemId);
  if (!item) return { ok: false, error: 'Vật phẩm không tồn tại.' };
  if (item.price === null || item.price === undefined) {
    return { ok: false, error: 'Vật phẩm này chỉ nhận qua Hội Làng Pass, không bán bằng xu.' };
  }
  if (p.inventory.includes(itemId)) return { ok: false, error: 'Bạn đã sở hữu vật phẩm này.' };
  if (p.xu < item.price) return { ok: false, error: `Không đủ Hội Xu (cần ${item.price} xu, bạn có ${p.xu} xu).` };
  p.xu -= item.price;
  p.inventory.push(itemId);
  save();
  return { ok: true, item, profile: publicProfile(p) };
}

// Server KIỂM TRA SỞ HỮU mỗi lần trang bị/dùng — client khai có mà
// thật ra chưa mua thì bị từ chối ở đây.
function equipItem(playerId, name, itemId) {
  const p = getProfile(playerId, name);
  const item = findItem(itemId);
  if (!item) return { ok: false, error: 'Vật phẩm không tồn tại.' };
  if (!p.inventory.includes(itemId)) {
    return { ok: false, error: 'Bạn chưa sở hữu vật phẩm này — hãy mua ở Shop trước.' };
  }
  const slot = item.kind === 'skin' ? 'skin' : item.kind === 'hat' ? 'hat'
    : item.kind === 'banner' ? 'banner' : item.kind === 'bubble' ? 'bubble' : null;
  if (!slot) return { ok: false, error: 'Vật phẩm này không trang bị được (emote/decor dùng kiểu khác).' };
  p.cosmetics[slot] = itemId;
  save();
  return { ok: true, cosmetics: { ...p.cosmetics }, profile: publicProfile(p) };
}

function unequipItem(playerId, name, slot) {
  const p = getProfile(playerId, name);
  if (!['skin', 'hat', 'banner', 'bubble'].includes(slot)) return { ok: false, error: 'Ô trang bị không hợp lệ.' };
  p.cosmetics[slot] = null;
  save();
  return { ok: true, cosmetics: { ...p.cosmetics }, profile: publicProfile(p) };
}

function useEmote(playerId, name, itemId) {
  const p = getProfile(playerId, name);
  const item = findItem(itemId);
  if (!item || item.kind !== 'emote') return { ok: false, error: 'Emote không tồn tại.' };
  if (!p.inventory.includes(itemId)) {
    return { ok: false, error: 'Bạn chưa sở hữu emote này — hãy mua ở Shop trước.' };
  }
  // Không trừ xu khi dùng; server chỉ cần xác nhận quyền dùng.
  return { ok: true, item, profile: publicProfile(p) };
}

// STUB checkout mua Pass trả phí: không xử lý tiền thật.
// Trả về stub:true và mở khóa thử trong bản demo.
function buyPass(playerId, name) {
  const p = getProfile(playerId, name);
  if (p.pass.tier === 'paid') return { ok: true, stub: ECONOMY_STUB, alreadyOwned: true, message: 'Bạn đã mở Pass trả phí.', profile: publicProfile(p) };
  p.pass.tier = 'paid';
  // Mở khóa thử: nhận bù thưởng track trả phí của các cấp đã đạt.
  const granted = [];
  for (const row of PASS_REWARDS) {
    if (row.level <= p.pass.level && row.paid && !p.inventory.includes(row.paid)) {
      p.inventory.push(row.paid);
      granted.push({ level: row.level, track: 'paid', itemId: row.paid });
    }
  }
  save();
  return { ok: true, stub: ECONOMY_STUB, message: STUB_MESSAGE, granted, profile: publicProfile(p) };
}

function createTournament(playerId, name, data) {
  const p = getProfile(playerId, name);
  const err = validateTournamentText(data && data.name, data && data.brand);
  if (err) return { ok: false, error: err };
  const prizePoolXu = Math.floor(Number(data && data.prizePoolXu) || 0);
  if (prizePoolXu < 0) return { ok: false, error: 'Giải thưởng không được âm.' };
  if (prizePoolXu > p.xu) return { ok: false, error: `Không đủ Hội Xu làm giải thưởng (cần ${prizePoolXu} xu, bạn có ${p.xu} xu).` };
  p.xu -= prizePoolXu; // Giải thưởng trả bằng Hội Xu từ ví của chủ hội.
  const id = `T${nextTournamentId++}`;
  const t = {
    id, name: data.name.trim(), brand: (data.brand || '').trim(),
    hostId: p.id, hostName: p.name, prizePoolXu,
    status: 'open', winnerId: null, createdAt: new Date().toISOString(),
  };
  tournaments.set(id, t);
  p.tournamentsCreated.push(id);
  save();
  return { ok: true, tournament: t, profile: publicProfile(p) };
}

function listTournaments() {
  return [...tournaments.values()].map((t) => ({ ...t }));
}

// Chủ hội công bố người thắng: giải thưởng (Hội Xu) chuyển cho người thắng.
// Chỉ chủ hội của giải đó mới được gọi. Không bao giờ đổi ra tiền mặt.
function awardTournamentWinner(tournamentId, winnerId, callerId) {
  const t = tournaments.get(String(tournamentId));
  if (!t) return { ok: false, error: 'Giải đấu không tồn tại.' };
  if (t.status !== 'open') return { ok: false, error: 'Giải đấu đã kết thúc.' };
  if (String(callerId) !== String(t.hostId)) return { ok: false, error: 'Chỉ chủ hội mới được công bố người thắng.' };
  const winner = getProfile(winnerId);
  winner.xu += t.prizePoolXu;
  t.status = 'finished';
  t.winnerId = String(winnerId);
  save();
  return { ok: true, tournament: { ...t }, winnerProfile: publicProfile(winner) };
}

// Cổ vũ miễn phí: người nhận +5 xu. Giới hạn 1 lần/60 giây cho mỗi cặp.
function cheer(playerId, name, toPlayerId) {
  const from = getProfile(playerId, name);
  const to = getProfile(toPlayerId);
  if (String(toPlayerId) === String(playerId)) return { ok: false, error: 'Không tự cổ vũ cho mình.' };
  const key = `${from.id}:${to.id}`;
  const now = Date.now();
  if (cheerCooldown.has(key) && now - cheerCooldown.get(key) < CHEER_COOLDOWN_MS) {
    return { ok: false, error: 'Bạn vừa cổ vũ người này rồi, chờ một lát nhé.' };
  }
  cheerCooldown.set(key, now);
  to.xu += CHEER_REWARD_XU;
  to.giftsReceived.push({ kind: 'cheer', fromId: from.id, fromName: from.name, xu: CHEER_REWARD_XU, at: new Date().toISOString() });
  save();
  return { ok: true, to: publicProfile(to), from: publicProfile(from) };
}

// Tặng sticker trả phí bằng xu: người gửi trả tiền sticker, người nhận +5 xu.
function giftSticker(playerId, name, toPlayerId, stickerId) {
  const from = getProfile(playerId, name);
  const to = getProfile(toPlayerId);
  const sticker = STICKERS.find((s) => s.id === stickerId);
  if (!sticker) return { ok: false, error: 'Sticker không tồn tại.' };
  if (String(toPlayerId) === String(playerId)) return { ok: false, error: 'Không tự tặng cho mình.' };
  if (from.xu < sticker.price) return { ok: false, error: `Không đủ Hội Xu (sticker ${sticker.price} xu, bạn có ${from.xu} xu).` };
  from.xu -= sticker.price;
  to.xu += CHEER_REWARD_XU;
  to.giftsReceived.push({ kind: 'sticker', stickerId, stickerName: sticker.name, fromId: from.id, fromName: from.name, xu: CHEER_REWARD_XU, at: new Date().toISOString() });
  save();
  return { ok: true, sticker, to: publicProfile(to), from: publicProfile(from) };
}

// Vé Du Lịch Hạ Long: mở khóa tour cao cấp (thêm câu chuyện đảo, tuyến
// tour cao cấp, huy hiệu lưu niệm). Chỉ là nội dung du lịch — không bao
// giờ ảnh hưởng kết quả trận đấu.
function buyTourPass(playerId, name, pay) {
  const p = getProfile(playerId, name);
  if (p.tourPass.owned) return { ok: true, alreadyOwned: true, message: 'Bạn đã có Vé Du Lịch Hạ Long.', profile: publicProfile(p) };
  if (pay === 'stub') {
    // STUB mua bằng tiền thật: không xử lý tiền thật, mở khóa thử demo.
    p.tourPass = { owned: true, via: 'stub' };
    save();
    return { ok: true, stub: ECONOMY_STUB, message: 'Thanh toán thật chưa bật — đây là bản demo, Vé Du Lịch đã mở khóa thử.', profile: publicProfile(p) };
  }
  if (p.xu < TOUR_PASS_PRICE_XU) return { ok: false, error: `Không đủ Hội Xu (vé ${TOUR_PASS_PRICE_XU} xu, bạn có ${p.xu} xu).` };
  p.xu -= TOUR_PASS_PRICE_XU;
  p.tourPass = { owned: true, via: 'xu' };
  save();
  return { ok: true, profile: publicProfile(p) };
}

/* ------------------------------------------------------------------ */
/* Dispatcher: server.js gọi economy.handle(...) khi msg.type==='economy' */
/* ------------------------------------------------------------------ */

function handle(room, player, msg, send, broadcast) {
  const playerId = (player && player.id !== undefined && player.id !== null)
    ? player.id : (msg.playerId || msg.id || 'guest');
  const playerName = (player && player.name) || msg.name || 'Khách';

  // send/broadcast có thể là dạng đã bọc ((obj) => ...) hoặc dạng thô
  // của server (send(ws, obj), broadcast(room, obj, exceptWs)).
  const reply = (obj) => {
    try {
      if (typeof send !== 'function') return;
      if (send.length >= 2 && player && player.ws) send(player.ws, obj);
      else send(obj);
    } catch (e) { /* bỏ qua lỗi gửi */ }
  };
  const emit = (obj, exceptWs) => {
    try {
      if (typeof broadcast !== 'function') return;
      if (broadcast.length >= 2 && room) broadcast(room, obj, exceptWs);
      else broadcast(obj);
    } catch (e) { /* bỏ qua lỗi gửi */ }
  };
  const ok = (extra) => reply(Object.assign({ type: 'economy', ok: true }, extra || {}));
  const fail = (error) => reply({ type: 'economy', ok: false, error: String(error || 'Lỗi không rõ.') });

  const action = msg.action;
  try {
    switch (action) {
      case 'getProfile':
      case 'wallet': {
        ok({ action, profile: publicProfile(getProfile(playerId, playerName)) });
        break;
      }
      case 'shop': {
        ok({ action, catalogue: CATALOGUE, stickers: STICKERS });
        break;
      }
      case 'buy': {
        const r = buyItem(playerId, playerName, msg.itemId);
        if (!r.ok) return fail(r.error);
        ok({ action, item: r.item, profile: r.profile });
        break;
      }
      case 'equip': {
        const r = equipItem(playerId, playerName, msg.itemId);
        if (!r.ok) return fail(r.error);
        ok({ action, cosmetics: r.cosmetics, profile: r.profile });
        emit({ type: 'economy', action: 'cosmeticsChanged', playerId: String(playerId), cosmetics: r.cosmetics });
        break;
      }
      case 'unequip': {
        const r = unequipItem(playerId, playerName, msg.slot);
        if (!r.ok) return fail(r.error);
        ok({ action, cosmetics: r.cosmetics, profile: r.profile });
        break;
      }
      case 'useEmote': {
        const r = useEmote(playerId, playerName, msg.itemId);
        if (!r.ok) return fail(r.error);
        ok({ action, item: r.item });
        emit({ type: 'economy', action: 'emoteUsed', playerId: String(playerId), playerName, itemId: msg.itemId });
        break;
      }
      case 'quest':
      case 'claimQuest': {
        const r = claimDailyQuest(playerId, playerName, msg.questId);
        if (!r.ok) return fail(r.error);
        ok({ action: 'claimQuest', reward: r.reward, profile: r.profile });
        break;
      }
      case 'quests': {
        ok({ action, quests: QUESTS, progress: publicProfile(getProfile(playerId, playerName)).quests });
        break;
      }
      case 'buyPass': {
        // STUB checkout — xem buyPass().
        const r = buyPass(playerId, playerName);
        ok({ action, stub: r.stub, message: r.message, alreadyOwned: !!r.alreadyOwned, granted: r.granted || [], profile: r.profile });
        break;
      }
      case 'pass': {
        const p = publicProfile(getProfile(playerId, playerName));
        ok({ action, pass: p.pass, rewards: PASS_REWARDS, xpPerLevel: XP_PER_LEVEL, maxLevel: MAX_PASS_LEVEL });
        break;
      }
      case 'createTournament': {
        const r = createTournament(playerId, playerName, msg);
        if (!r.ok) return fail(r.error);
        ok({ action, tournament: r.tournament, profile: r.profile });
        emit({ type: 'economy', action: 'tournamentCreated', tournament: r.tournament });
        break;
      }
      case 'listTournaments': {
        ok({ action, tournaments: listTournaments() });
        break;
      }
      case 'tournamentWin': {
        const r = awardTournamentWinner(msg.tournamentId, msg.winnerId, playerId);
        if (!r.ok) return fail(r.error);
        ok({ action, tournament: r.tournament, winnerProfile: r.winnerProfile });
        emit({ type: 'economy', action: 'tournamentFinished', tournament: r.tournament });
        break;
      }
      case 'cheer': {
        const r = cheer(playerId, playerName, msg.toPlayerId);
        if (!r.ok) return fail(r.error);
        ok({ action, to: r.to, from: r.from });
        emit({ type: 'economy', action: 'cheered', fromId: String(playerId), fromName: playerName, toPlayerId: String(msg.toPlayerId) });
        break;
      }
      case 'gift': {
        const r = giftSticker(playerId, playerName, msg.toPlayerId, msg.stickerId);
        if (!r.ok) return fail(r.error);
        ok({ action, sticker: r.sticker, to: r.to, from: r.from });
        emit({ type: 'economy', action: 'giftSent', fromId: String(playerId), fromName: playerName, toPlayerId: String(msg.toPlayerId), sticker: r.sticker });
        break;
      }
      case 'buyTourPass': {
        const r = buyTourPass(playerId, playerName, msg.pay);
        if (!r.ok) return fail(r.error);
        ok({ action, stub: !!r.stub, message: r.message, alreadyOwned: !!r.alreadyOwned, profile: r.profile });
        break;
      }
      default:
        fail(`Action economy không rõ: ${action}`);
    }
  } catch (e) {
    fail(e.message);
  }
}

module.exports = {
  handle,
  getProfile: (id, name) => publicProfile(getProfile(id, name)),
  getProfileInternal: getProfile,
  awardRoundSurvived,
  awardWin,
  recordMatchPlayed,
  recordChatSent,
  claimDailyQuest,
  buyItem,
  equipItem,
  unequipItem,
  useEmote,
  buyPass,
  createTournament,
  listTournaments,
  awardTournamentWinner,
  cheer,
  giftSticker,
  buyTourPass,
  CATALOGUE,
  STICKERS,
  QUESTS,
  PASS_REWARDS,
  TOUR_PASS_PRICE_XU,
  XP_PER_LEVEL,
  MAX_PASS_LEVEL,
  STUB_MESSAGE,
  ECONOMY_STUB,
  LIXI_XU_PER_ROUND,
  LIXI_XU_PER_WIN,
  SEASONS,
  detectSeason,
  seasonId,
  lixiFor,
  save,
};
