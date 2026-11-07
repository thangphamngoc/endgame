'use strict';
/**
 * Supervisor — tự khởi động lại game server khi crash (P3-05, cycle 19).
 *
 * Chạy: `npm run supervise` (hoặc `node server/supervisor.js`).
 * - Spawn `node server/server.js` (cùng thư mục này); con kế thừa env
 *   (PORT, MATCH_TIME_LIMIT_S, ...) nên chạy y như `npm start`.
 * - Con thoát != 0 (crash: uncaughtException / unhandledRejection trong
 *   server.js ghi 1 dòng `fatal` rồi exit(1)) thì chạy lại sau delay
 *   backoff 1s, 2s, 4s, ... tối đa 10s; con sống ổn định đủ
 *   SUPERVISOR_STABLE_MS (mặc định 60s) thì reset bộ đếm về 0.
 * - Con thoát 0 (tắt có trật tự, ví dụ SIGTERM) thì KHÔNG chạy lại —
 *   supervisor thoát 0 theo.
 * - Supervisor nhận SIGTERM/SIGINT thì ghi log, gửi SIGTERM cho con,
 *   chờ con tắt rồi thoát 0.
 * - Mọi sự kiện đều là 1 dòng JSON qua stdout (cùng định dạng logEvent
 *   của server) để gom log được.
 *
 * Gom + xoay log file (P3-05, cycle 22 — backlog #13 bước 2):
 * - Đặt SUPERVISOR_LOG_FILE=<đường dẫn> để supervisor tự ghi mọi dòng log
 *   (của chính nó + stdout/stderr của server con) vào file đó thay vì
 *   stdout; không đặt thì hành vi cũ giữ nguyên (stdout, con inherit).
 * - Khi file vượt SUPERVISOR_LOG_MAX_BYTES (mặc định 5 MiB) thì xoay:
 *   file -> file.1, .1 -> .2, ... giữ SUPERVISOR_LOG_KEEP thế hệ
 *   (mặc định 3), thế hệ cũ nhất bị xóa; kiểm tra lúc khởi động, trước
 *   mỗi lần chạy lại con, và định kỳ SUPERVISOR_LOG_CHECK_MS (mặc định
 *   30s). Xoay xong ghi 1 dòng `supervisor_log_rotate` vào file mới.
 * - Mở file thất bại (sai đường dẫn, không có quyền) thì fallback về
 *   stdout và không crash — supervisor vẫn chạy, chỉ mất file log.
 * - Cách chạy khuyên dùng ở VM (không có systemd/journald):
 *   SUPERVISOR_LOG_FILE=~/workspace/endgame-server.log npm run supervise
 *
 * Test: SUPERVISOR_CHILD_SCRIPT=<file .js> để chạy 1 script con khác
 * thay cho server thật (xem hidden_files/p3-05-supervisor-test.js và
 * hidden_files/p3-05-log-rotate-test.js).
 * Giới hạn: chưa có cảnh báo khi server chết (cần kênh báo cho Sudo —
 * còn nợ quyết định).
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { rotateLogFile, needsRotation } = require('./log-rotate');

const CHILD_SCRIPT = process.env.SUPERVISOR_CHILD_SCRIPT || path.join(__dirname, 'server.js');
const STABLE_MS = Number(process.env.SUPERVISOR_STABLE_MS || 60000);
const MAX_DELAY_MS = Number(process.env.SUPERVISOR_MAX_DELAY_MS || 10000);
const LOG_FILE = process.env.SUPERVISOR_LOG_FILE || null;
const LOG_MAX_BYTES = Number(process.env.SUPERVISOR_LOG_MAX_BYTES || 5 * 1024 * 1024);
const LOG_KEEP = Number(process.env.SUPERVISOR_LOG_KEEP || 3);
const LOG_CHECK_MS = Number(process.env.SUPERVISOR_LOG_CHECK_MS || 30000);

// ---- Ghi log: ra file khi SUPERVISOR_LOG_FILE đặt được, còn không ra stdout ----
let logStream = null;
let logToFile = false;

function openLogStream() {
  if (!LOG_FILE) return false;
  try {
    logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });
    logStream.on('error', () => { logStream = null; logToFile = false; });
    logToFile = true;
    return true;
  } catch (e) {
    logStream = null;
    logToFile = false;
    return false;
  }
}

// Kiểm tra đồng bộ trước khi mở stream: createWriteStream báo lỗi mở
// file BẤT ĐỒNG BỘ (sự kiện 'error') nên không thể dựa vào nó để biết
// ngay từ đầu là file có mở được không — các dòng log đầu (supervisor_start)
// sẽ bị nuốt mất nếu chỉ trông vào handler đó. Kiểm tra trước: file (nếu
// có) phải là file thường ghi được, thư mục cha (nếu file chưa có) phải
// ghi được; không đạt thì fallback về stdout ngay từ đầu.
function logFileUsable() {
  if (!LOG_FILE) return false;
  try {
    if (fs.existsSync(LOG_FILE)) {
      if (!fs.statSync(LOG_FILE).isFile()) return false;
      fs.accessSync(LOG_FILE, fs.constants.W_OK);
    } else {
      fs.accessSync(path.dirname(LOG_FILE), fs.constants.W_OK);
    }
    return true;
  } catch (e) {
    return false;
  }
}

function writeLogLine(line) {
  if (logToFile && logStream) {
    try { logStream.write(line + '\n'); return; } catch (e) { /* fallback stdout */ }
  }
  try { console.log(line); } catch (e) { /* never crash on logging */ }
}

// Ghi 1 chunk thô (stdout/stderr của server con) — con đã tự xuống dòng.
function writeLogChunk(chunk) {
  if (logToFile && logStream) {
    try { logStream.write(chunk); return; } catch (e) { /* fallback stdout */ }
  }
  try { process.stdout.write(chunk); } catch (e) { /* never crash on logging */ }
}

function logEvent(event, data) {
  try {
    writeLogLine(JSON.stringify(Object.assign({ ts: new Date().toISOString(), event }, data || {})));
  } catch (e) { /* never crash on logging */ }
}

// Xoay file log khi đã tới ngưỡng: đóng stream cũ, xoay, mở stream mới.
function maybeRotate() {
  if (!LOG_FILE || !logToFile || !logStream) return;
  if (!needsRotation(LOG_FILE, LOG_MAX_BYTES)) return;
  try { logStream.end(); } catch (e) { /* ignore */ }
  logStream = null;
  rotateLogFile(LOG_FILE, LOG_KEEP);
  openLogStream();
  logEvent('supervisor_log_rotate', { file: path.basename(LOG_FILE), keep: LOG_KEEP, maxBytes: LOG_MAX_BYTES });
}

let child = null;
let shuttingDown = false;
let restarts = 0;
let stableTimer = null;
let rotateTimer = null;

function startChild() {
  maybeRotate();
  if (logToFile) {
    child = spawn(process.execPath, [CHILD_SCRIPT], { stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.on('data', (d) => writeLogChunk(d));
    child.stderr.on('data', (d) => writeLogChunk(d));
  } else {
    child = spawn(process.execPath, [CHILD_SCRIPT], { stdio: 'inherit' });
  }
  const startedAt = Date.now();
  logEvent('supervisor_child_start', { script: path.basename(CHILD_SCRIPT), restarts });
  stableTimer = setTimeout(() => {
    if (restarts > 0) logEvent('supervisor_stable', { restartsBeforeReset: restarts });
    restarts = 0;
  }, STABLE_MS);
  if (stableTimer.unref) stableTimer.unref();
  child.on('exit', (code, signal) => {
    if (stableTimer) { clearTimeout(stableTimer); stableTimer = null; }
    const uptimeMs = Date.now() - startedAt;
    if (shuttingDown) {
      logEvent('supervisor_child_exit', { code, signal, uptimeMs });
      if (logStream) { try { logStream.end(); } catch (e) {} }
      // Cho stream kịp xả dòng cuối rồi thoát 0.
      setTimeout(() => process.exit(0), 100);
      return;
    }
    if (code === 0) {
      logEvent('supervisor_child_exit_clean', { uptimeMs });
      if (logStream) { try { logStream.end(); } catch (e) {} }
      setTimeout(() => process.exit(0), 100);
      return;
    }
    // Crash: chạy lại với backoff, tối đa MAX_DELAY_MS.
    restarts += 1;
    const delayMs = Math.min(1000 * Math.pow(2, restarts - 1), MAX_DELAY_MS);
    logEvent('supervisor_restart', { code, signal, uptimeMs, restarts, delayMs });
    setTimeout(() => { if (!shuttingDown) startChild(); }, delayMs);
  });
  child.on('error', (err) => {
    logEvent('supervisor_child_error', { message: String(err && err.message) });
  });
}

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logEvent('supervisor_stop', { signal });
  if (rotateTimer) { clearInterval(rotateTimer); rotateTimer = null; }
  if (child && child.exitCode === null) {
    try { child.kill('SIGTERM'); } catch (e) { /* already dead */ }
    // Con có 2s để tắt có trật tự (server.js gracefulShutdown); quá thì ép.
    setTimeout(() => { try { if (child.exitCode === null) child.kill('SIGKILL'); } catch (e) {} }, 2000).unref();
    // supervisor_child_exit handler sẽ process.exit(0) khi con thoát.
    setTimeout(() => process.exit(0), 3000).unref();
  } else {
    if (logStream) { try { logStream.end(); } catch (e) {} }
    setTimeout(() => process.exit(0), 100);
  }
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Khởi động: kiểm tra file dùng được không; xoay trước nếu file cũ đã
// quá ngưỡng, rồi mới mở stream. Mở lỗi thì fallback về stdout ngay.
let logFallback = false;
if (LOG_FILE) {
  if (!logFileUsable()) {
    logFallback = true;
  } else {
    if (needsRotation(LOG_FILE, LOG_MAX_BYTES)) rotateLogFile(LOG_FILE, LOG_KEEP);
    openLogStream();
    if (!logToFile) logFallback = true;
  }
}
if (logFallback) {
  try { console.log(JSON.stringify({ ts: new Date().toISOString(), event: 'supervisor_log_fallback', file: LOG_FILE, reason: 'cannot open log file, logging to stdout' })); } catch (e) {}
}
logEvent('supervisor_start', {
  script: path.basename(CHILD_SCRIPT),
  stableMs: STABLE_MS,
  maxDelayMs: MAX_DELAY_MS,
  logFile: LOG_FILE ? path.basename(LOG_FILE) : null,
  logMaxBytes: LOG_FILE ? LOG_MAX_BYTES : null,
  logKeep: LOG_FILE ? LOG_KEEP : null,
});
if (LOG_FILE && logToFile) {
  rotateTimer = setInterval(maybeRotate, LOG_CHECK_MS);
  if (rotateTimer.unref) rotateTimer.unref();
}
startChild();
