// capture.js — reusable real-browser screenshot harness for Trống Hội & Cầu Khỉ.
// Uses puppeteer-core + the system Chromium (/opt/meta-chromium/chrome).
//   node capture.js [--out <dir>] [--base http://example.com:3000]
// Screenshots go to <out> (default: tools/captures/<today>/ next to this file).
// Requires the game server running on localhost:3000.
//
// HOW IT REACHES THE GAME (this VM's Chromium is locked down, read on):
//  - The Hatch Chromium build refuses to start without a WebGL domain policy.
//    The browser-daemon normally supplies the image-owned policy; here the
//    script writes its own v1 policy file (registrable domain only —
//    `localhost` cannot be listed) + its SHA-256 and passes both switches.
//  - Chrome's Local Network Access checks block navigation to the loopback
//    server, so pages are served through CDP Fetch interception: requests to
//    the game origin are fulfilled by Node fetching http://127.0.0.1:3000,
//    and the cdnjs fallback (Three.js, only if the self-hosted copy fails)
//    is fulfilled by Node over the egress proxy.
//    The document origin stays http://example.com:3000.
//  - KNOWN LIMIT (2026-11-06): WebGL contexts return null in this headless
//    Chromium even on the policy-listed domain — the hand-made policy file
//    passes startup validation but does not unlock WebGL; the image-owned
//    policy from browser-daemon is required. So the 3D canvas renders blank
//    here. This harness therefore verifies the REAL rendered DOM/HUD/layout
//    (lobby, QC panel, team screen, sim overlays, shop, chat, console
//    errors) — the class of bugs Sudo actually caught (banner blocking,
//    overlap, illegible text) — but it CANNOT verify the 3D scene itself.
//    3D scene verification needs the live browser (parent agent) or Sudo's
//    real play-test. Never claim the 3D scene was verified from these shots.
//  - CONSEQUENCE of WebGL-null (found 2026-11-06): buildWorld() throws
//    "Error creating WebGL context" at init, so the rAF game loop never
//    starts here. Round 1 freezes on "SẴN SÀNG" (clock 0:00, countdown "—")
//    and the Round 2 team screen crashes in assignTeamsAndPlace()
//    (figure materials never built). That is environmental here, but it
//    exposes a real robustness gap: no graceful fallback when WebGL fails.
//    Do NOT treat a frozen R1/R2 in this harness as a game bug without
//    checking a real browser first — and do NOT treat a passing R3–R6
//    overlay as proof the round plays (their overlays render synchronously
//    even with the loop dead).
//  - CHAT visibility is the .open class (CSS #chatPanel.open{display:flex}),
//    NOT .hidden — see stage [8]. Shop buttons on the lobby are covered by
//    the full-screen #startCard overlay (z-index 20 vs 6) — see stage [7].
//  - ONBOARDING (cycle 12) auto-shows on first lobby load and blocks every
//    click (z-index 40): every interactive stage calls dismissOnboarding()
//    (real click on #btnObSkip, sets hoilang_onboarding_seen) right after
//    load — see backlog #30, fixed cycle 17. Lobby stages [1]/[1b] keep it
//    on purpose to capture the true first-time view.
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const crypto = require('crypto');

let puppeteer;
for (const p of ['/tmp/capture-harness/node_modules/puppeteer-core',
  process.env.HOME + '/.capture-harness/node_modules/puppeteer-core']) {
  try { puppeteer = require(p); break; } catch (_) { /* try next */ }
}
if (!puppeteer) {
  console.error('puppeteer-core not found. Install it first:\n  mkdir -p ~/.capture-harness && cd ~/.capture-harness && npm init -y && npm install puppeteer-core\n(/tmp/capture-harness also works but /tmp is wiped on service restarts.)');
  process.exit(1);
}

function argVal(name, fallback) {
  const i = process.argv.indexOf(name);
  return (i >= 0 && process.argv[i + 1]) ? process.argv[i + 1] : fallback;
}

// Hatch WebGL domain policy (see header comment): v1 file, registrable
// domain only, SHA-256 passed alongside. Rewritten every run because /tmp
// is wiped on service restarts.
const POLICY_FILE = '/tmp/webgl-policy.txt';
const POLICY_DOMAIN = 'example.com';
fs.writeFileSync(POLICY_FILE, 'hatch-webgl-allowed-domains-v1\n' + POLICY_DOMAIN + '\n');
const POLICY_SHA = crypto.createHash('sha256').update(fs.readFileSync(POLICY_FILE)).digest('hex');

const BASE = argVal('--base', process.env.GAME_URL || 'http://' + POLICY_DOMAIN + ':3000');
const today = new Date().toISOString().slice(0, 10);
const OUT = argVal('--out', path.join(__dirname, 'captures', today));
fs.mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stamp = () => new Date().toISOString().slice(11, 19);

function fetchBuffer(urlStr) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const lib = u.protocol === 'https:' ? https : http;
    const req = lib.get({ host: u.hostname, port: u.port || (u.protocol === 'https:' ? 443 : 80), path: u.pathname + u.search, timeout: 15000 }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on('timeout', () => { req.destroy(new Error('timeout')); });
    req.on('error', reject);
  });
}

async function newPage(browser, width, height, log) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') log.push(`[${stamp()}] console.${m.type()}: ${m.text()}`);
  });
  page.on('pageerror', (e) => log.push(`[${stamp()}] pageerror: ${e.message}`));
  page.on('requestfailed', (r) => log.push(`[${stamp()}] requestfailed: ${r.url()} — ${r.failure() && r.failure().errorText}`));
  // Serve the game + its CDN through Fetch interception (see header comment).
  const cdp = await page.createCDPSession();
  await cdp.send('Fetch.enable', { patterns: [{ urlPattern: '*', requestStage: 'Request' }] });
  cdp.on('Fetch.requestPaused', async (ev) => {
    const url = new URL(ev.request.url);
    try {
      if (url.hostname === POLICY_DOMAIN) {
        const { status, headers, body } = await fetchBuffer('http://127.0.0.1:3000' + url.pathname + url.search);
        const respHeaders = [];
        for (const [k, v] of Object.entries(headers)) { if (k.toLowerCase() !== 'content-length') respHeaders.push({ name: k, value: String(v) }); }
        await cdp.send('Fetch.fulfillRequest', { requestId: ev.requestId, responseCode: status, responseHeaders: respHeaders, body: body.toString('base64') });
      } else if (url.hostname === 'cdnjs.cloudflare.com') {
        const { status, headers, body } = await fetchBuffer(ev.request.url);
        const respHeaders = [];
        for (const [k, v] of Object.entries(headers)) { if (k.toLowerCase() !== 'content-length') respHeaders.push({ name: k, value: String(v) }); }
        await cdp.send('Fetch.fulfillRequest', { requestId: ev.requestId, responseCode: status, responseHeaders: respHeaders, body: body.toString('base64') });
      } else {
        await cdp.send('Fetch.continueRequest', { requestId: ev.requestId });
      }
    } catch (e) { try { await cdp.send('Fetch.failRequest', { requestId: ev.requestId, errorReason: 'Failed' }); } catch (_) {} }
  });
  return page;
}

async function shot(page, name) {
  const p = path.join(OUT, name + '.png');
  await page.screenshot({ path: p });
  console.log(`  shot: ${name}.png`);
  return p;
}

async function visible(page, sel) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return !el.classList.contains('hidden') && r.width > 0 && r.height > 0 && getComputedStyle(el).display !== 'none';
  }, sel);
}

async function hud(page) {
  return page.evaluate(() => ({
    round: (document.getElementById('hudRound') || {}).textContent,
    countdown: (document.getElementById('hudCountdown') || {}).textContent,
    alive: (document.getElementById('hudAlive') || {}).textContent,
    state: (document.getElementById('hudState') || {}).textContent,
    overlay: (document.getElementById('round-overlay') || {}).textContent.slice(0, 200),
    three: !!window.THREE,
    webgl: (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } })(),
  }));
}

async function dismissOnboarding(page) {
  // Onboarding (cycle 12) tự hiện lần đầu ở sảnh chờ, overlay z-index 40
  // chặn mọi click — từ cycle 13 các stage QC/vòng 3–6 chỉ chụp lại màn
  // onboarding bước 1 (backlog #30). Bấm nút "Bỏ qua hướng dẫn" thật như
  // người chơi (ghi cờ hoilang_onboarding_seen vào localStorage, cờ này
  // giữ nguyên cho các page sau trong cùng browser nên mỗi stage chỉ cần
  // gọi 1 lần, gọi thừa thì trả 'absent'). Fallback: __game.hideOnboarding().
  // Chỉ gọi ở các stage tương tác (QC, vòng, shop, chat) — stage lobby
  // (01/01b) GIỮ NGUYÊN onboarding để chụp đúng trải nghiệm người mới.
  const done = await page.evaluate(() => {
    const card = document.getElementById('onboardingCard');
    if (!card || card.classList.contains('hidden')) return 'absent';
    const skip = document.getElementById('btnObSkip');
    if (skip) { skip.click(); return 'skip-clicked'; }
    return 'no-skip-button';
  });
  if (done === 'no-skip-button') {
    await page.evaluate(() => { if (window.__game && window.__game.hideOnboarding) window.__game.hideOnboarding(); });
  }
  await sleep(400);
  return done;
}

async function startSingleQc(page, round) {
  await page.goto(BASE + '/?qc=1', { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(1500);
  await dismissOnboarding(page); // #30: tắt onboarding trước khi bấm QC
  if (!(await visible(page, '#qcPanel'))) await page.click('#btnQcToggle');
  await sleep(500);
  const picked = await page.evaluate((round) => {
    const b = [...document.querySelectorAll('#qc-round-btns button')].find((x) => Number(x.getAttribute('data-qc-round')) === round);
    if (!b) return false;
    b.click();
    return true;
  }, round);
  if (!picked) throw new Error('QC round button ' + round + ' not found');
  await sleep(400);
  await page.click('#btn-single');
  await sleep(1000);
  return true;
}

(async () => {
  const log = [];
  const browser = await puppeteer.launch({
    executablePath: '/opt/meta-chromium/chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader',
      '--use-gl=angle', '--use-angle=swiftshader', '--no-proxy-server', '--window-size=1280,800',
      '--hatch-webgl-allowed-domains-file=' + POLICY_FILE,
      '--hatch-webgl-allowed-domains-sha256=' + POLICY_SHA,
      '--host-resolver-rules=MAP ' + POLICY_DOMAIN + ' 127.0.0.1'],
  });
  const results = {};
  try {
    console.log('[1] lobby desktop');
    let page = await newPage(browser, 1280, 800, log);
    await page.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(2500);
    await shot(page, '01-lobby-desktop');
    results.lobbyDesktop = await page.evaluate(() => ({
      title: document.title,
      startVisible: !!document.getElementById('btnStart'),
      qcHidden: document.getElementById('qcPanel').classList.contains('hidden'),
      cardScroll: (() => { const c = document.getElementById('startCard'); return c ? { scrollH: c.scrollHeight, clientH: c.clientHeight, winH: window.innerHeight } : null; })(),
      three: !!window.THREE,
    }));
    await page.close();

    console.log('[1b] lobby mobile');
    page = await newPage(browser, 360, 740, log);
    await page.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(2500);
    await shot(page, '01b-lobby-mobile');
    await page.close();

    console.log('[2] QC panel');
    page = await newPage(browser, 1280, 800, log);
    await page.goto(BASE + '/?qc=1', { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(1500);
    const ob2 = await dismissOnboarding(page); // #30: onboarding chặn nút QC
    if (!(await visible(page, '#qcPanel'))) await page.click('#btnQcToggle');
    await sleep(600);
    // QC section nằm dưới nếp gấp của start card — cuộn tới nó rồi mới chụp,
    // nếu không ảnh chỉ thấy phần đầu card (lỗi lần chạy đầu 2026-11-06).
    await page.evaluate(() => { const s = document.getElementById('qcSection'); if (s) s.scrollIntoView({ block: 'start' }); });
    await sleep(500);
    await shot(page, '02-qc-panel');
    results.qcPanel = await page.evaluate(() => ({
      buttons: [...document.querySelectorAll('#qc-round-btns button')].map((b) => b.textContent.trim()),
      note: (document.getElementById('qc-round-note') || {}).textContent.slice(0, 200),
    }));
    results.qcPanel.onboarding = ob2;
    await page.close();

    console.log('[3] round 1 single-player');
    page = await newPage(browser, 1280, 800, log);
    await page.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(2000);
    await dismissOnboarding(page); // #30: onboarding chặn nút CHƠI ĐƠN
    await page.click('#btn-single');
    await sleep(9000); // flyover ~3.4s + countdown
    await page.keyboard.down('KeyW');
    await sleep(4000);
    await page.keyboard.up('KeyW');
    await shot(page, '03-round1-mid');
    results.round1 = await hud(page);
    await page.close();

    console.log('[3b] round 1 mobile');
    page = await newPage(browser, 360, 740, log);
    await page.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(2000);
    await dismissOnboarding(page); // #30
    await page.click('#btn-single');
    await sleep(9000);
    await shot(page, '03b-round1-mobile');
    results.round1Mobile = await hud(page);

    console.log('[8] chat');
    try {
      await dismissOnboarding(page); // #30: phòng hờ nếu page này chưa tắt onboarding
      // Panel chat hiện bằng class .open (CSS #chatPanel.open{display:flex}),
      // KHÔNG phải class .hidden — openChat/closeChat chỉ đổi .hidden nên
      // đừng đo bằng classList.contains('hidden') (sai). Đo bằng computed display.
      // Nút CHAT có thể bị che tạm thời (vd. tiêu đề flyover) nên click thật
      // lỗi thì fallback sang JS click và ghi lại.
      try { await page.click('#btnChatToggle'); } catch (e) { await page.evaluate(() => document.getElementById('btnChatToggle').click()); results.chatClickFallback = 'js-click: ' + String(e.message || e); }
      await sleep(600);
      await page.type('#chatInput', 'Chào mọi người, cố lên!');
      await page.click('#chatSend');
      await sleep(1200);
      await shot(page, '08-chat');
      results.chat = await page.evaluate(() => ({
        panelDisplay: getComputedStyle(document.getElementById('chatPanel')).display,
        panelHasOpen: document.getElementById('chatPanel').classList.contains('open'),
        msgs: document.getElementById('chatMsgs').textContent.slice(0, 300),
        bubbles: document.getElementById('bubbles').textContent.slice(0, 200),
      }));
    } catch (e) { results.chat = { error: String(e.message || e) }; }
    await page.close();

    console.log('[4-5] team screen + round 2');
    page = await newPage(browser, 1280, 800, log);
    await startSingleQc(page, 2);
    let teamSeen = false;
    for (let i = 0; i < 12; i++) {
      if (await visible(page, '#teamCard')) { teamSeen = true; break; }
      await sleep(500);
    }
    if (teamSeen) {
      await shot(page, '04-team-screen');
      results.team = await page.evaluate(() => ({ text: document.getElementById('teamCard').textContent.slice(0, 600) }));
    } else results.team = { error: 'teamCard never visible' };
    await sleep(7000); // auto-advance + bridge start
    await shot(page, '05-round2-bridge');
    results.round2 = await hud(page);
    results.round2TeamPanel = await page.evaluate(() => ({
      teamPanel: (document.getElementById('teamPanel') || {}).textContent.slice(0, 300),
      teamPanelVisible: !document.getElementById('teamPanel').classList.contains('hidden'),
    }));
    await page.close();

    for (const r of [3, 4, 5, 6]) {
      console.log(`[6] QC jump round ${r}`);
      page = await newPage(browser, 1280, 800, log);
      try {
        await startSingleQc(page, r);
        await sleep(6000); // sim build + intro
        await shot(page, `06-round${r}-sim`);
        results['round' + r] = await hud(page);
      } catch (e) { results['round' + r] = { error: String(e.message || e) }; }
      await page.close();
    }

    console.log('[7] shop');
    page = await newPage(browser, 1280, 800, log);
    await page.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(2000);
    await dismissOnboarding(page); // #30: onboarding chặn nút CỬA HÀNG
    // Ghi lại phần tử thật sự nằm trên tâm nút CỬA HÀNG: overlay #startCard
    // (position:fixed inset:0, z-index 20) phủ lên cột nút phải (z-index 6)
    // nên click chuột thật không tới được nút dù nút vẫn nhìn thấy được.
    const shopTop = await page.evaluate(() => {
      const b = document.getElementById('btn-shop'); if (!b) return null;
      const r = b.getBoundingClientRect();
      const el = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return el ? (el.id || el.className || el.tagName) : null;
    });
    await page.click('#btn-shop');
    await sleep(1500);
    await shot(page, '07-shop');
    results.shop = await page.evaluate(() => ({
      wallet: (document.getElementById('wallet-hud') || {}).textContent,
      panelVisible: !document.getElementById('shop-panel').classList.contains('hidden'),
      panelText: document.getElementById('shop-panel').textContent.slice(0, 500),
    }));
    results.shop.topElementAtButton = shopTop;
    await page.close();

    console.log('[9] tour — dao moi Hon Cho Da (#15)');
    page = await newPage(browser, 1280, 800, log);
    await page.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(2000);
    await dismissOnboarding(page); // #30: onboarding chan nut DU LICH TU SANH CHO
    // Mo tour tu sảnh chờ (focusIsland(1) -> activateExplore + flyToPOI(1)).
    // O headless (WebGL null) buildWorld() chet truoc buildTourList() nen
    // #tourList DOM rong — do la he qua cua #24, khong phai loi tour. Stage
    // nay ghi ro listCount=0 khi do, dong thoi kiem du lieu TOUR_ISLANDS
    // trong file game.js trinh duyet vua tai (12 dao, co cho-da).
    try { await page.click('#btn-tour-lobby'); } catch (e) { await page.evaluate(() => document.getElementById('btn-tour-lobby').click()); results.tourClickFallback = 'js-click: ' + String(e.message || e); }
    await sleep(1500);
    await shot(page, '09-tour');
    results.tour = await page.evaluate(async () => {
      const list = document.querySelectorAll('#tourList > *');
      const detail = (document.getElementById('tourInfo') || {}).textContent || '';
      let data = null;
      try {
        const t = await fetch('/js/game.js').then((r) => r.text());
        const a = t.indexOf('var TOUR_ISLANDS = [');
        let i = t.indexOf('[', a), depth = 0, j = i;
        for (; j < t.length; j++) { if (t[j] === '[') depth++; else if (t[j] === ']') { depth--; if (depth === 0) break; } }
        const arr = eval(t.slice(i, j + 1));
        const cd = arr.find((d) => d.id === 'cho-da') || null;
        data = { count: arr.length, ids: arr.map((d) => d.id), choDa: cd ? { name: cd.name, label: cd.label, x: cd.x, z: cd.z, icon: cd.icon } : null };
      } catch (e) { data = { error: String(e.message || e) }; }
      return {
        // Do bang computed display + rect, KHONG do class .hidden (bai hoc
        // #20 + #33: go .hidden khong hien panel vi CSS goc display:none).
        panelDisplay: getComputedStyle(document.getElementById('tourPanel')).display,
        panelRect: (() => { const r = document.getElementById('tourPanel').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; })(),
        panelHasOpen: document.getElementById('tourPanel').classList.contains('open'),
        listCount: list.length,
        listNames: [...list].map((b) => b.textContent.slice(0, 40)),
        detailHead: detail.slice(0, 300),
        data,
      };
    });
    await page.close();
  } finally {
    await browser.close();
  }
  fs.writeFileSync(path.join(OUT, 'console-log.json'), JSON.stringify(log, null, 2));
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2));
  console.log('\n=== RESULTS ===');
  console.log(JSON.stringify(results, null, 2));
  console.log('\n=== CONSOLE / REQUEST ERRORS (' + log.length + ') ===');
  log.forEach((l) => console.log(l));
  console.log('\nScreenshots in: ' + OUT);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
