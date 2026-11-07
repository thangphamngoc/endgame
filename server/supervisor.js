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
 * Test: SUPERVISOR_CHILD_SCRIPT=<file .js> để chạy 1 script con khác
 * thay cho server thật (xem hidden_files/p3-05-supervisor-test.js).
 * Giới hạn: chưa có cảnh báo khi server chết (cần kênh báo cho Sudo —
 * còn nợ quyết định); chưa rotate log file (log đang ra stdout, việc
 * gom/rotate thuộc về nơi chạy, vd. systemd/journald).
 */
const { spawn } = require('child_process');
const path = require('path');

const CHILD_SCRIPT = process.env.SUPERVISOR_CHILD_SCRIPT || path.join(__dirname, 'server.js');
const STABLE_MS = Number(process.env.SUPERVISOR_STABLE_MS || 60000);
const MAX_DELAY_MS = Number(process.env.SUPERVISOR_MAX_DELAY_MS || 10000);

function logEvent(event, data) {
  try {
    console.log(JSON.stringify(Object.assign({ ts: new Date().toISOString(), event }, data || {})));
  } catch (e) { /* never crash on logging */ }
}

let child = null;
let shuttingDown = false;
let restarts = 0;
let stableTimer = null;

function startChild() {
  child = spawn(process.execPath, [CHILD_SCRIPT], { stdio: 'inherit' });
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
      process.exit(0);
      return;
    }
    if (code === 0) {
      logEvent('supervisor_child_exit_clean', { uptimeMs });
      process.exit(0);
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
  if (child && child.exitCode === null) {
    try { child.kill('SIGTERM'); } catch (e) { /* already dead */ }
    // Con có 2s để tắt có trật tự (server.js gracefulShutdown); quá thì ép.
    setTimeout(() => { try { if (child.exitCode === null) child.kill('SIGKILL'); } catch (e) {} }, 2000).unref();
    // supervisor_child_exit handler sẽ process.exit(0) khi con thoát.
    setTimeout(() => process.exit(0), 3000).unref();
  } else {
    process.exit(0);
  }
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

logEvent('supervisor_start', { script: path.basename(CHILD_SCRIPT), stableMs: STABLE_MS, maxDelayMs: MAX_DELAY_MS });
startChild();
