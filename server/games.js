'use strict';
/**
 * games.js — seeded RNG + elimination curve + round pool for Trống Hội & Cầu Khỉ.
 * Vietnamese folk identity only. No Squid Game / Minecraft assets or names.
 */

// FNV-1a 32-bit hash of a string -> unsigned 32-bit int.
function hashSeed(seedStr) {
  const s = String(seedStr);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// mulberry32 PRNG: deterministic given a 32-bit seed.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}

// Draw `count` distinct rounds from the pool, seeded. Each at most once per match.
function pickRounds(seed, poolSize, count) {
  const rng = mulberry32(typeof seed === 'number' ? seed : hashSeed(seed));
  const pool = [];
  for (let i = 0; i < poolSize; i++) pool.push(i);
  return shuffle(pool, rng).slice(0, count);
}

const ELIMINATION_CURVE = [456, 280, 150, 70, 24, 6, 1];
// Ratios between successive curve entries.
const CURVE_RATIOS = [0.614, 0.536, 0.467, 0.343, 0.25, 0.167];

/**
 * scaledTargets(n) -> [t1..t6]: survivors to keep after each of the 6 rounds.
 * - Applies curve ratios sequentially.
 * - Each round (while >2 remain) eliminates at least 1.
 * - When only 1-2 remain, no forced cut (target stays) except the final
 *   round, whose target is always 1, so a small room still ends with 1 winner.
 */
function scaledTargets(n) {
  const targets = [];
  let cur = Math.max(1, Math.floor(n));
  for (let i = 0; i < 6; i++) {
    if (i === 5) { targets.push(1); cur = 1; continue; }
    if (cur <= 2) { targets.push(cur); continue; }
    const next = Math.round(cur * CURVE_RATIOS[i]);
    cur = Math.max(1, Math.min(cur - 1, next));
    targets.push(cur);
  }
  return targets;
}

const ROUND_POOL = ['keo-co', 'to-he', 'bit-mat', 'o-an-quan', 'nhay-bao-bo'];
const ROUND_NAMES = {
  'trong-hoi': 'Trống Hội',
  'cau-khi': 'Cầu Khỉ Sương Mù',
  'keo-co': 'Kéo Co Nhịp',
  'to-he': 'Nặn Tò He',
  'bit-mat': 'Bịt Mắt Bắt Dê',
  'o-an-quan': 'Ô Ăn Quan',
  'nhay-bao-bo': 'Nhảy Bao Bố',
  'rong-ran': 'Rồng Rắn Cướp Cờ',
};
const ROUND_TIME_LIMITS = {
  'trong-hoi': 120,
  'cau-khi': 180,
  'keo-co': 60,
  'to-he': 60,
  'bit-mat': 60,
  'o-an-quan': 90,
  'nhay-bao-bo': 60,
  'rong-ran': 120,
};
// Vòng 2 — Cầu Khỉ: giới hạn MỖI LƯỢT đi cầu (một người qua hết 9 bước),
// không phải chỉ giới hạn cả vòng. DECIDED 2026-11-05 (tạm, QC lật được):
// 30 giây/lượt — 9 bước, ~3 giây suy nghĩ mỗi bước, đủ để nghĩ nhưng
// không đủ để đứng chờ cho cầu lộ hết ván rồi mới đi. Lượt không bắt đầu
// và lượt đi quá chậm là một: đồng hồ chạy từ lúc lượt bắt đầu, hết giờ
// thì người đó bị loại và lượt chuyển cho người tiếp theo. Xem BRD §9.4 OD-09.
const R2_TURN_TIME_LIMIT = 30;

// Tracing targets for Nặn Tò He: points in a 0..100 x 0..100 box.
const TRACE_SHAPES = {
  star: { name: 'Ngôi sao', points: [[50,5],[61,38],[95,38],[68,59],[79,92],[50,71],[21,92],[32,59],[5,38],[39,38]] },
  flower: { name: 'Bông hoa', points: [[50,10],[62,30],[85,25],[70,45],[88,62],[60,58],[50,90],[40,58],[12,62],[30,45],[15,25],[38,30]] },
  fish: { name: 'Con cá', points: [[10,50],[30,30],[60,25],[85,50],[60,75],[30,70],[15,60],[25,50]] },
  bird: { name: 'Con chim', points: [[15,60],[35,35],[55,30],[75,45],[90,30],[70,55],[55,75],[35,70],[20,75]] },
  lotus: { name: 'Hoa sen', points: [[50,5],[65,30],[90,20],[75,50],[95,70],[60,65],[50,95],[40,65],[5,70],[25,50],[10,20],[35,30]] },
  drum: { name: 'Trống hội', points: [[30,20],[70,20],[78,35],[78,65],[70,80],[30,80],[22,65],[22,35]] },
};
const TRACE_SHAPE_KEYS = Object.keys(TRACE_SHAPES);

module.exports = {
  mulberry32, hashSeed, shuffle, pickRounds,
  ELIMINATION_CURVE, CURVE_RATIOS, scaledTargets,
  ROUND_POOL, ROUND_NAMES, ROUND_TIME_LIMITS, R2_TURN_TIME_LIMIT,
  TRACE_SHAPES, TRACE_SHAPE_KEYS,
};
