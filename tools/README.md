# tools/ — capture harness

`capture.js` — real-browser screenshot harness (puppeteer-core + system
Chromium at `/opt/meta-chromium/chrome`, `--no-sandbox`, SwiftShader WebGL).
No stubbed DOM: every screenshot is a real rendered page.

Install once (persistent home dir — /tmp is wiped on service restarts, so do
NOT rely on /tmp alone):

```sh
mkdir -p ~/.capture-harness && cd ~/.capture-harness
npm init -y && npm install puppeteer-core
```

(The script also tries /tmp/capture-harness/node_modules first if present.)

## Known limits of this environment (2026-11-06)

- **WebGL is null in this headless Chromium** even on the policy-listed
  domain: the hand-made policy file passes startup validation but does not
  unlock WebGL; the image-owned policy from browser-daemon is required.
  The 3D canvas therefore renders blank here. This harness verifies the
  real rendered DOM/HUD/layout — never claim the 3D scene was verified
  from these shots; 3D needs the live browser or Sudo's play-test.
- **Local Network Access checks** block direct navigation to the loopback
  server, so pages are served through CDP Fetch interception (see the
  header comment in capture.js). The game origin stays
  http://example.com:3000; WebSocket handshakes to the server may also be
  LNA-blocked in this VM — multiplayer stages are best-effort here.
- **Three.js is self-hosted** (backlog #11, P2-09): `client/js/vendor/three.min.js`
  (r158, byte-identical to cdnjs 0.158.0) is served by the game server like
  any other static file; cdnjs is only the fallback when the local copy
  fails, and is fulfilled by Node over the egress proxy in that case.

Run (game server must be running at http://localhost:3000):

```sh
node tools/capture.js [--out <dir>] [--base http://localhost:3000]
```

Default output: `tools/captures/<today>/` — screenshots per stage
(lobby desktop + mobile, QC panel, Round 1, team screen, Round 2 bridge,
QC jumps to rounds 3–6, shop, chat) plus `console-log.json` (console
errors + failed requests) and `results.json` (HUD/DOM state per stage).

**Standing rule (from 2026-11-06, Sudo's catch): every improvement cycle
must re-run this harness for the screens its change touches and judge the
screenshots by eye — DOM state alone is not verification.**

## Lessons learned (2026-11-06, first run)

- WebGL-null freezes the game flow: `buildWorld()` throws, the rAF loop
  never starts, Round 1 sticks on "SẴN SÀNG" and the Round 2 team screen
  crashes in `assignTeamsAndPlace()` (figure materials never built).
  Rounds 3–6 overlays still render (synchronous) — a passing sim overlay
  does NOT prove the round plays in this env.
- QC panel sits below the fold of the start card — the harness now
  scrolls `#qcSection` into view before shooting (first run's 02 shot was
  just the lobby again).
- Chat panel visibility is the `.open` class, not `.hidden` — measure
  computed `display`, not the class. (That check is what found the real
  bug: `openChat()` never adds `.open`, so the panel can never open.)
- A real mouse click can miss a visibly-rendered button when a
  full-screen overlay covers it — the harness now records
  `elementFromPoint` at the button centre for the shop stage. (That check
  is what found the `#startCard` overlay blocking the lobby shop buttons.)
- First run: `tools/captures/2026-11-06/` — lobby, QC (02b), R1, R3–R6
  sims, shop (07/07b/07c), chat retests (08b). Findings logged in
  `docs/IMPROVEMENT-BACKLOG.md` items #20–#27.
- Onboarding (cycle 12) auto-shows on first lobby load and blocks every
  click (z-index 40): from cycle 13 the QC/round stages only captured the
  onboarding step-1 screen. The harness now calls `dismissOnboarding()`
  (real click on `#btnObSkip`, sets `hoilang_onboarding_seen`) right after
  load in every interactive stage (QC panel, `startSingleQc`, rounds 1,
  shop, chat); lobby stages [1]/[1b] keep it on purpose to capture the
  true first-time view. (Backlog #30, fixed cycle 17.)
