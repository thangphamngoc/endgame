# Đối chiếu giao diện artifact ↔ repo — Trống Hội & Cầu Khỉ

> Tài liệu này đối chiếu **giao diện người chơi trong bản artifact** (file
> export HTML) với **giao diện trong repo** `trong-hoi-cau-khi/`, để trả lời
> một câu duy nhất: *cái gì trong artifact đã có trong repo, cái gì đã đổi,
> cái gì còn thiếu.*
>
> **Nguồn chân lý (source of truth):**
> `~/workspace/your_files/prototype-game-3d-1-vong/prototype-game-3d-1-vong.html`
> — file HTML tự chứa duy nhất, tiêu đề
> *"Trống Hội & Cầu Khỉ — Prototype 3D 2 Vòng"*, 4.164 dòng, 1.398.333 byte.
> Three.js được nhúng thẳng trong file (2 khối `<script>`, 1 khối
> `<style>`, không dùng CDN), tài nguyên nhúng kèm: 1 (Three.js);
> **0 tài nguyên cục bộ chưa giải quyết**. Tham chiếu ngoài duy nhất là
> stylesheet Google Fonts (Be Vietnam Pro) — chỉ là font chữ, không phải
> tài nguyên game. Đã kiểm bằng cách đọc trực tiếp file export (body/style/
> game tách ra tại `/tmp/artifact-body.html`, `/tmp/artifact-style.css`,
> `/tmp/artifact-game.js`) và đối chiếu với code repo tại thời điểm
> 2026-11-05 (`client/index.html` 157 dòng, `client/css/style.css` 128 dòng,
> `client/js/game.js` 1.237 dòng, `client/js/rounds.js` 943 dòng,
> `client/js/shop.js` 306 dòng, `server/server.js` 1.145 dòng).
>
> **Nói thẳng:** giao diện trong repo được **viết lại (rebuilt) từ bản
> export nói trên — không sao chép mã nguồn artifact**. Không có mã nguồn
> artifact nào được đưa vào repo; mọi hàm repo đều viết mới theo cùng
> đặc tả giao diện. Ngược lại, **repo giữ toàn bộ hệ thống mà artifact
> không có**: trận 6 vòng, multiplayer WebSocket với server có thẩm quyền,
> kinh tế trong game (shop/pass/giải đấu/quà tặng, stub thanh toán),
> Docker — artifact chỉ là **prototype chơi đơn 2 vòng, 60 bot, không
> mạng** (0 lần xuất hiện `WebSocket` trong mã artifact).
>
> Trạng thái trong bảng dưới:
> **Ported** = có trong repo, hành vi tương đương (id/tên có thể khác);
> **Adapted** = có trong repo nhưng đổi hành vi/phạm vi;
> **Missing** = artifact có, repo chưa có;
> **Repo-only** = repo có, artifact không có (không phải parity, ghi để
> khỏi nhầm là "thiếu trong artifact").

## 1. Bảng đối chiếu theo nhóm UI

### 1.1. HUD (thanh trạng thái trong trận)

| # | Artifact UI | Repo tương đương | Trạng thái | Ghi chú |
|---|---|---|---|---|
| H-01 | `#hud` + `#statePlate` (chấm `#stateDot` + `#hudState` + `#stateSub`: "CHUẨN BỊ / TRỐNG ĐÁNH / CHIÊNG VANG" + dòng phụ) | `#hud` + `#hud-drum` (`game.js` `onServerMessage`/`updateSingle`: "TRỐNG ĐÁNH — Chạy đi!" / "CHIÊNG VANG — Đứng yên!" / "TỚI LƯỢT BẠN — chọn ván!") | Adapted | Chấm màu trạng thái và dòng phụ (`#stateSub`, vd "Chờ người về đích… sắp sang Cầu Khỉ") bị bỏ; trạng thái chỉ còn là một dòng chữ trong HUD. |
| H-02 | `#hudStats`: 4 ô `#hudRound` (1/2), `#hudTime`, `#hudAlive` (61), `#hudDist` ("ĐÃ ĐI", mét) | `#hud-round` ("VÒNG 1/6 — Trống Hội", `game.js:1116`/`1186`), `#hud-time`, `#hud-alive` (`updateAliveHUD`), `#progress` + `#progress-fill` | Adapted | Vòng hiển thị dạng x/6 kèm tên vòng (phục vụ luồng 6 vòng). **Ô "ĐÃ ĐI" (số mét đã chạy) bị bỏ** — repo chỉ có thanh tiến độ, không có con số mét. |
| H-03 | `#progressWrap` + `#progressTrack`/`#progressFill` + nhãn `#progStartLabel` "VẠCH XUẤT PHÁT" / `#progEndLabel` "ĐÍCH — SÂN ĐÌNH" | `#progress` + `#progress-fill` (`client/index.html`) | Adapted | Thanh tiến độ giữ nguyên; **hai nhãn đầu/cuối bị bỏ**. |
| H-04 | `#phaseBanner` (banner lớn giữa màn hình mỗi lần đổi trống/chiêng, `showBanner(text, isGong, ms)`, hiện ~1,1 giây) + body class `freeze-danger` (nhuộm đỏ khi chiêng) | Không có phần tử tương đương; chỉ có `#hud-drum` đổi chữ + `#toast` cho sự kiện | Missing | Trống/chiêng đổi nhịp trong repo **không có phản hồi hình ảnh lớn** — chỉ một dòng chữ nhỏ trong HUD. Đây là một trong các gap lớn nhất về cảm giác chơi (xem §3). |
| H-05 | `#countdown` (chữ lớn "SẴN SÀNG / 3 / 2 / 1", mỗi bước kèm `drumHit`) | Không có phần tử tương đương; chỉ `toast('Đếm ngược… Trống sắp đánh!')` (`game.js:350`) và phase `countdown` phía server (~3,2 giây, `server.js:280`) | Missing | Repo có đếm ngược về mặt trạng thái nhưng **không hiển thị số đếm** cho người chơi. |
| H-06 | `#vignette` (lớp phủ toàn màn hình) | Không có | Missing | Chỉ là lớp phủ hiệu ứng; chưa port. |
| H-07 | `#hudAlive` đếm 61 người (1 người + 60 bot) | `#hud-alive` đếm người sống trong phòng (`updateAliveHUD`, `game.js:298`) | Ported | Cùng ý nghĩa; con số theo phòng thật thay vì cố định 61. |

### 1.2. Thẻ bắt đầu / chia team / kết thúc

| # | Artifact UI | Repo tương đương | Trạng thái | Ghi chú |
|---|---|---|---|---|
| C-01 | `#startCard` (overlay): tiêu đề "TRỐNG HỘI", mô tả 2 vòng, khối `.rules`, `#btnStart` "BẮT ĐẦU CHƠI", `#btnStartTour` "DU LỊCH HẠ LONG TRƯỚC", khối `.ctrls` hướng dẫn phím | `#menu` (`client/index.html`): tiêu đề, phụ đề liệt kê 6 vòng, `#player-name`, `#btn-single` "CHƠI ĐƠN (60 BOT)", `#btn-multi` "MULTIPLAYER THẬT", `#multi-box` (tạo/vào phòng, xem phòng, `#btn-start`), `#btn-tour-lobby`, `#btn-shop` / `#btn-pass` / `#btn-tournament` | Adapted | Từ overlay toàn màn hình thành panel menu; **mở rộng lớn cho multiplayer** (nhập tên, mã phòng 6 ký tự, danh sách phòng) **và kinh tế** (3 nút shop/pass/giải đấu) — những thứ artifact không có. Nội dung luật trong `.rules` được rút gọn thành một dòng ghi chú trong menu. |
| C-02 | `#teamCard` (overlay): "CHIA TEAM — VÒNG 2", `#teamCols` (3 cột liệt kê thành viên từng đội), `#btnTeamGo` "VÀO CẦU NGAY", tự chuyển sau vài giây | `#team-screen` (`client/index.html` + `game.js` `showTeamScreenSingle`/`localStartRound2`): `#team-list`, `#btn-to-bridge` "Vào cầu ngay" | Adapted | Cùng nội dung và nút; khác ở chỗ repo dùng panel thường thay vì overlay, và **panel này được tái dùng làm màn hình xếp hạng cuối trận** (`showRanking`, `game.js:477` — xem C-03). |
| C-03 | `#endCard` (overlay): `#endTitle` / `#endText`, `#endBoard` (bảng `buildBoard()` xếp theo hạng + thời gian), `.resultGrid` 3 ô `#endRank` / `#endAlive` / `#endTime`, `#btnAgain` "CHƠI LẠI" | Không có overlay kết thúc riêng. `showRanking(ranking)` vẽ bảng xếp hạng vào lại `#team-screen`/`#team-list` và đổi `#btn-to-bridge` thành "Chơi lại từ vòng 1"; nút `#btn-replay` nằm trong panel khán giả | Adapted | Bảng xếp hạng còn (theo thời gian cá nhân, đúng luật). **Mất 3 ô kết quả cá nhân** (hạng của bạn / người còn lại / thời gian) — hạng và thời gian chỉ còn đọc được trong từng dòng của bảng, không có ô riêng. **Mất hiệu ứng confetti** (`burstConfetti` khi về đích/thắng, artifact `game.js:1480,2234,2484`) — repo không có confetti. |
| C-04 | `#errBox` (bẫy lỗi toàn cục: `window.onerror` / `unhandledrejection` hiện lỗi JS lên màn hình) | Không có; lỗi game chỉ hiện qua `#toast` (vd toast khi chưa tải được Three.js, `game.js:793`) | Missing | Chỉ phục vụ dev/debug; chưa port. |

### 1.3. Khán giả (spectator)

| # | Artifact UI | Repo tương đương | Trạng thái | Ghi chú |
|---|---|---|---|---|
| S-01 | `#specBanner`: tiêu đề "Bạn đã bị loại — chế độ khán giả", 4 nút `[data-specmode]` Toàn cảnh / Theo dõi / Sát vai / Tự do (mặc định Theo dõi), `#btnSpecPrev` / `#specTargetName` / `#btnSpecNext`, `#btnZoomOut` / `#btnZoomIn`, `#btnTour` "DU LỊCH HẠ LONG", `.specHint` (phím 1–4/C, Tab, kéo chuột, cuộn chuột) | `#spectator` (`client/index.html` + `game.js` `buildSpectatorList`/`watchedPerson`/`updateWatchedName`/`updateCamera`): 4 nút `.spec-view` (`data-view`), `#btn-prev-person` / `#watched-name` / `#btn-next-person`, `#btn-zoom-out` / `#btn-zoom-in`, `#btn-tour` "Du lịch Hạ Long", **`#btn-replay` "Chơi lại từ vòng 1" (mới)** | Ported | Đầy đủ 4 góc + chuyển người + zoom + du lịch. Khác nhỏ: dòng gợi ý phím (`.specHint`) không còn trong panel (luật phím vẫn ghi trong README); repo thêm nút Chơi lại ngay trong panel khán giả. |
| S-02 | `setSpecMode` / `cycleSpecTarget` / `updateSpecUI` (artifact `game.js:1562–1603`) | `document.querySelectorAll('.spec-view')` (`game.js:822`) + `buildSpectatorList` / `watchedPerson` (`game.js:317–326`) | Ported | Cùng hành vi; repo chuyển người xem qua danh sách người sống. |

### 1.4. Chat (panel + bong bóng)

| # | Artifact UI | Repo tương đương | Trạng thái | Ghi chú |
|---|---|---|---|---|
| CH-01 | `#btnChatToggle` ("CHAT" + `.chatDot`) | `#btn-chat-open` ("CHAT") | Ported | Chấm báo hiệu (`.chatDot`) không còn; nút mở/đóng tương đương. |
| CH-02 | `#chatPanel`: `.chatHead` (tiêu đề + `#btnChatBubbles` "ẨN BONG BÓNG" + `#btnChatClose`), `#chatMsgs`, `.chatQuick` (4 câu nhanh), `.chatInputRow` (`#chatInput` maxlength 120 + `#chatSend`), `#chatHint` | `#chat-panel`: `.chat-head` (`#btn-hide-bubbles`, `#btn-close-chat`), `#chat-log`, `.quick-row` (4 câu nhanh), `.chat-input-row` (`#chat-input` maxlength 120 + `#btn-send-chat`) | Ported | Cấu trúc 1–1. Khác nhỏ: **câu nhanh thứ 4 khác nhau** — artifact: "Đứng yên, chiêng kìa!" (hữu ích đúng lúc chiêng), repo: "Chờ mình với!". Cân nhắc khôi phục câu của artifact (xem §3). |
| CH-03 | `sendPlayerChat` / `sendChatFromInput`: giới hạn 120 ký tự, chống spam 2 giây/tin; `addChatMessage(name, colorCss, text, isBot)` hiện tên + màu áo/đội + giờ | `sendChat` / `addChat` (`game.js:582–612`): cắt 120 ký tự + toast khi quá, chặn < 2 giây + toast; server cũng cắt 120 ký tự và chặn spam 2 giây (`server.js` xử lý `msg.type === 'chat'`) | Ported | Cùng giới hạn. Khác về đường đi: **repo chat multiplayer đi qua server** (server phát lại cho cả phòng kèm tên/team/giờ, `server.js` message `chat`); artifact chat chỉ chạy local giữa người và bot. |
| CH-04 | `#bubbles` + `showBubble(fig, name, colorCss, text)` + `updateBubbles()`: bong bóng ~5 giây, đi theo nhân vật (chiếu 3D→2D mỗi khung hình) | `#labels` + `setTag(id, text, color, isBubble)` / `clearTag` / `updateTags()` (`game.js:105–121,1032`) + `window.__game.project` | Ported | Cùng 5 giây, cùng bám theo nhân vật. **Repo gộp thêm thẻ tên thường trực** (`.name-tag`) vào cùng lớp `#labels` — artifact không có thẻ tên trên đầu người chơi, chỉ có bong bóng chat. Đây là bổ sung của repo, không phải thiếu. |
| CH-05 | `addChatSystem(text)` (tin hệ thống trong panel chat) | Tin hệ thống đi qua `#toast` (`toast(msg)`, `game.js:64`) | Adapted | Tin hệ thống không vào panel chat nữa mà hiện dạng toast rồi tự ẩn. |
| CH-06 | `sendBotChat` / `updateChatBots`: bot chat, ghi rõ là bot | Bot chơi đơn chat qua cùng `addChat`/`sendChat`, nhãn `· BOT` (theo BRD FR-24) | Ported | Cùng quy tắc "bot luôn ghi rõ là bot". |

### 1.5. Du lịch Hạ Long (tour panel / danh sách đảo)

| # | Artifact UI | Repo tương đương | Trạng thái | Ghi chú |
|---|---|---|---|---|
| T-01 | `#tourPanel`: `.tourTitle`, `.tourNote` (1.969 đảo / 1.553 km² + ghi rõ nhãn nguồn), `#tourList` (nút từng điểm đến), `#tourInfo` (`#tourInfoName` + `#tourInfoText`), hàng nút `#btnTourOverview` / `#btnTourZoomIn` / `#btnTourZoomOut`, `#btnTourBack` "QUAY LẠI TRẬN", `#btnTourAgain` "CHƠI LẠI — XẾP HÀNG TRẬN SAU" | `#tourism`: `.tour-head` (`#btn-close-tour` "Đóng"), `.note` (1.969 đảo / 1.553 km²), `#tour-list`, `#tour-detail`, `#btn-panorama` "Quay lại toàn cảnh", `#btn-back-match` "Quay lại trận" | Adapted | Cùng khung: danh sách + chi tiết + quay lại toàn cảnh/trận. **Thiếu nút "CHƠI LẠI — XẾP HÀNG TRẬN SAU"** trong panel du lịch (chơi lại trong repo nằm ở panel khán giả `#btn-replay` và màn hình xếp hạng). Zoom trong repo dùng cuộn chuột / nút +/− của panel khán giả thay vì nút zoom riêng trong panel tour. |
| T-02 | `POIS` — 8 điểm đến: 7 đảo + **"Cầu Khỉ Sương Mù"** (điểm ngắm 3 cầu song song, `icon: 'bridge'`) | `TOUR_ISLANDS` (`game.js:14–33`) — 7 đảo: Đảo Hội Làng, Hòn Trống Mái, Đảo Ti Tốp, Hòn Đỉnh Hương, Hòn Con Cóc, Đảo Soi Sim, Đảo Khỉ | Adapted | 7 đảo khớp 1–1 (tên, vị trí, nhãn nguồn: truyền thuyết / lịch sử thật / chuyện trong game). **Điểm ngắm cầu (POI thứ 8) chưa có trong danh sách tour của repo.** |
| T-03 | `flyToPOI(idx)` + `setTourInfo(name, text)` + `flyOverview()` | `focusIsland(idx, fromList)` (`game.js:623`) + `backToPanorama()` (`game.js:642`) / `backToMatch()` (`game.js:646`) | Ported | Cùng hành vi bay tới + hiện câu chuyện + quay lại. |
| T-04 | `activateExplore()` / `canExplore()` + `#exploreToast` (toast khi vào chế độ tham quan) | Vào tour qua `#btn-tour-lobby` (từ sảnh, `game.js:803`) hoặc `#btn-tour` (từ khán giả, `game.js:804`); mọi toast dùng chung `#toast` | Adapted | Không còn cổng kiểm tra riêng `canExplore` hay toast riêng cho tour; mọi thông báo gộp vào `#toast`. |
| T-05 | `buildDetailIsland(rec, seedIdx)` — đảo xa bất kỳ cũng dựng được chi tiết theo seed khi bay tới | `islandBase(island)` (`game.js:174`) chỉ dựng cho 7 đảo trong `TOUR_ISLANDS`; đảo xa chỉ là silhouette | Missing | Xem gap G-02 ở §3: repo chưa dựng chi tiết cho đảo xa ngoài 7 đảo đặt tên. |

### 1.6. Minimap

| # | Artifact UI | Repo tương đương | Trạng thái | Ghi chú |
|---|---|---|---|---|
| M-01 | `#minimapWrap`: `#minimapLabel` "BẢN ĐỒ · ĐẢO HỘI LÀNG", `#minimap` 168×168, `#minimapLegend` (chú giải Bạn / Đang xem), `#minimapHint` | `#minimap-box`: `.minimap-title` "VỊNH HẠ LONG · 1.969 ĐẢO", `#minimap` 190×190, `.minimap-note` "Bấm chấm đảo để bay tới xem chi tiết" | Ported | Khung tương đương; repo bỏ chú giải màu (dùng chấm vàng = bạn, trắng = bot, màu team = người khác, vòng tròn = người đang xem, `drawMinimap` `game.js:654`). |
| M-02 | `drawMinimap()` **hai chế độ**: vòng 1 vẽ đảo + đường chạy + đích; **vòng 2 vẽ bản đồ cầu** (3 cầu song song viền màu đội, từng bước ván, đảo cuối) | `drawMinimap()` (`game.js:654`) — **một chế độ duy nhất**: vẽ 7 đảo + chấm người chơi + vòng người đang xem | Adapted | **Bản đồ cầu vòng 2 chưa port** — khi chơi vòng 2, minimap repo vẫn là bản đồ đảo, không cho thấy cầu/ván. |
| M-03 | Bấm chấm đảo trên minimap → bay tới (`flyToPOI`) | Click `#minimap` → đảo gần nhất trong 22px thì `focusIsland` (`game.js`, sau `drawMinimap`) | Ported | Cùng hành vi, giới hạn ở 7 đảo đặt tên. |

### 1.7. Điều khiển (joystick, nhảy, camera)

| # | Artifact UI | Repo tương đương | Trạng thái | Ghi chú |
|---|---|---|---|---|
| K-01 | `#joyBase` + `#joyKnob` (joystick ảo, `joySet`/`joyReset`), `#btnJump` "NHẢY" | `#joystick` + `#joy-knob`, `#btn-jump` "NHẢY" (`game.js:777` trở đi; hiện/ẩn theo màn hình cảm ứng, `game.js:336–337`) | Ported | Cùng bộ điều khiển mobile. |
| K-02 | `inputVector()` / `updatePlayer(dt)`: WASD/mũi tên, Space nhảy, kéo chuột xoay, cuộn chuột zoom, bấm đúp zoom nhanh | `updatePlayerMovement(dt)` (`game.js:940`), phím Space qua `window.Rounds.onSpace`, kéo chuột xoay (`pointermove`), cuộn chuột zoom `camDist` 6–60 + bấm đúp zoom (`game.js:770–775`) | Ported | Cùng điều khiển. Khác: repo gửi input/vị trí lên server ở multiplayer (`sendWS`, `applyInput` phía server) thay vì tự quyết local. |
| K-03 | `updateCamera(dt)`: các mode menu / flyover / countdown / play / spectator / tour; tour dùng WASD dời điểm ngắm | `updateCamera(dt)` (`game.js:992`): `flyTo` lerp (`game.js:994–997`), `camDist`, góc khán giả qua `watchedPerson()` | Adapted | Camera chơi + khán giả + tour đã có. **Mode flyover (bay vòng ngắm đảo trước trận) chưa có** — xem §3 G-03. |

### 1.8. Bay tới đảo / đảo xa / thế giới 3D

| # | Artifact UI | Repo tương đương | Trạng thái | Ghi chú |
|---|---|---|---|---|
| W-01 | `#islandIntro` (màn hình giới thiệu "ĐẢO HỘI LÀNG — Vòng 1 · Trống Hội", "Chạm màn hình để vào trận ngay") + mode `flyover`: camera bay một vòng ngắm toàn cảnh đảo và vịnh trước khi đếm ngược (`startGame` → `G.mode = 'flyover'`, `beginCountdown()` khi chạm/bấm) | Không có màn giới thiệu đảo hay flyover; `#menu` phủ lên cảnh 3D tĩnh; bấm "CHƠI ĐƠN / MULTIPLAYER" là vào thẳng đếm ngược (`startSingle`, `game.js:341`) | Missing | Mất đoạn mở đầu điện ảnh của artifact. Repo cố ý vào trận nhanh hơn qua menu; nếu muốn giữ cảm giác artifact thì cần port flyover (xem §3 G-03). |
| W-02 | Click trực tiếp đảo trong 3D: `pickIslandAt` / `goPick` — bấm POI thì `flyToPOI`, **bấm đảo xa bất kỳ thì `flyToDistant(rec, seedIdx)` dựng chi tiết đảo đó theo seed** | Click 3D qua `Raycaster` (`game.js:752–770`): chỉ khớp `object.userData.tourIdx` (7 đảo đặt tên) → `focusIsland`; khớp `userData.bridge` thì gợi ý bước ván | Adapted | Click 7 đảo đặt tên đã có. **Click đảo xa silhouette chưa có** — silhouette không mang `tourIdx` nên bấm vào không làm gì (xem §3 G-02). |
| W-03 | Thế giới đảo chính: `buildKarsts`, `specialIslands` (Trống Mái đôi gà chọi, Ti Tốp núi nón + bãi lưỡi liềm + cầu tàu, Đỉnh Hương 3 chân, Con Cóc thấp bè 2 u mắt, Soi Sim đồi sim tím, Khỉ 2 mỏm + khỉ vẫy tay), `buildDinh` (sân đình), `lotusPond`, `fishPond`, `bambooBridge`, `islandGate`, `pier`, `foamRing`, `voxelScatter`, nhà mái ngói, thuyền, đèn lồng, cột cờ, bảng hiệu (`signBoard`/`dirSign`) | `buildWorld()` (`game.js:122`): biển trong suốt, đảo chính nhiều bậc, vành bãi cát, đường chạy + vạch xuất phát/đích, sân đình + trống hội, 6 nhà mái ngói, ao sen, hồ cá, thuyền, cây + tre; `buildTourIslands()` + `islandBase(island)` cho 7 đảo; `buildBridges()` (`game.js:492`) 3 cầu song song | Adapted | Đủ các yếu tố nhận diện (đình, trống, ao sen, hồ cá, nhà, thuyền, tre, bãi cát). Khác: repo dùng **một hàm dựng đảo chung** (`islandBase`) thay vì dựng riêng từng hình dáng đảo như artifact (đôi gà chọi, núi nón, lư hương 3 chân, cóc 2 u mắt…); độ đặc trưng hình dáng từng đảo thấp hơn artifact. |
| W-04 | `distantArchipelago()`: **370 silhouette** (3 lớp: 120 ở 380–470m, 130 ở 480–600m, 120 ở 610–760m), đá xám + chỏm cây xanh, sương xanh xám | `buildDistantSilhouettes()` (`game.js:229`): **260 silhouette** (góc + khoảng cách 260–420m ngẫu nhiên), hộp đá xám `0x607d8b` + chỏm cây xanh `0x2e7d32` | Adapted | Cùng nguyên tắc (đá xám, cây xanh, sương xanh xám, không trắng xóa; sương `Fog(0x9db8c6, 90, 420)` giữ nguyên). **Ít hơn 110 silhouette** và chỉ một dải khoảng cách thay vì 3 lớp chiều sâu. Cả hai đều ghi rõ đây là silhouette, không phải 1.969 đảo dựng chi tiết. |
| W-05 | `wildlife()`: khỉ (`monkey`), cua (`crab`), chim bay, bướm, cá nhảy; `updateWildlife(dt, t)` chuyển động liên tục | `buildAnimals()` (`game.js:240`) + cập nhật theo `userData` mỗi khung hình (`game.js:1067–1085`): chim bay vòng, khỉ Đảo Khỉ, cá, cua, bướm | Ported | Cùng các loài và chuyển động; repo giữ nguyên tắc "không con nào đứng yên như tượng". |
| W-06 | Dân làng voxel: `makeVillager` (tay/chân rời, `animateFigure` chạy/vẫy), `buildHost`, `burstConfetti` | `makeAvatar(shirtColor)` (`game.js:96`) + `createPerson` / `spawnBots` (`game.js:274–282`); animation người chơi qua `updateSingle`/`updatePlayerMovement` | Adapted | Nhân vật voxel còn; riêng hoạt ảnh dân làng chi tiết (tay chân rời, vẫy tay) và confetti của artifact chưa port đầy đủ — xem C-03. |

### 1.9. Âm thanh

| # | Artifact UI | Repo tương đương | Trạng thái | Ghi chú |
|---|---|---|---|---|
| A-01 | WebAudio tổng hợp, không file nhạc: `ensureAudio`, `drumHit`, `gongHit`, `elimSound`, `startAmbient` (tiếng sóng/gió `loopNoise`), `birdChirp`, `splashSound`, `crackSound` (ván vỡ), `cheerSound`, `updateAmbient` (âm thanh theo vị trí) | **Không có** — `grep` toàn bộ `client/js/game.js` và `client/js/rounds.js` không có bất kỳ tham chiếu audio nào (`AudioContext`, `drumHit`, `sound` đều vắng) | Missing | **Gap lớn nhất.** Trống/chiêng — tín hiệu luật quan trọng nhất của vòng 1 — trong repo chỉ còn là chữ trên HUD, không có tiếng. Cần port trước các gap khác (xem §3 G-01). |

### 1.10. Luồng trận & mạng (repo mở rộng ngoài artifact)

| # | Nội dung | Repo | Trạng thái |
|---|---|---|---|
| N-01 | Multiplayer thật: tạo/vào phòng mã 6 ký tự, danh sách phòng, host bắt đầu (≥ 2 người), tự bắt đầu khi đủ người, vào giữa trận làm khán giả, chuyển host, reconnect token, rate-limit | `server/server.js` (`create`/`join`/`list`/`start`/`reconnect`, `MAX_PLAYERS_PER_ROOM = 456`, lobby đầy 456 thì tách phòng mới) + menu multiplayer trong `client/index.html` | Repo-only |
| N-02 | Server có thẩm quyền: nhịp trống/chiêng, loại người lúc chiêng, chia team, ván yếu, lượt cầu, xếp hạng — client không tự quyết | `server/server.js` (`startMatch`, `startRound`, `endRound`, `assignTeams`, `advanceLeader`, `eliminatePlayer`, `checkRound1End`/`checkRound2End`) | Repo-only |
| N-03 | Trận 6 vòng: vòng 1–2 cố định (Trống Hội, Cầu Khỉ), vòng 3–5 bốc 3 trong kho 5 trò, vòng 6 chung kết Rồng Rắn; seed theo phòng–vòng; đường loại co giãn 456→280→150→70→24→6→1 | `server/server.js` `buildRoundPlan` + `server/games.js` (`pickRounds`, `scaledTargets`, `ROUND_POOL`, `ROUND_TIME_LIMITS`) + `client/js/rounds.js` (`GAMES`: keo-co, to-he, bit-mat, o-an-quan, nhay-bao-bo, rong-ran) + `#round-overlay`, `#blind-overlay`, `#interstitial`, `#round-timer-wrap`/`#round-timer-fill`/`#hud-round-time` | Repo-only |
| N-04 | Kinh tế trong game: Hội Xu, shop đồ trang trí, Hội Làng Pass, Chủ Hội (giải đấu), cổ vũ/tặng sticker, Vé Du Lịch; tiền thật chỉ là stub demo | `server/economy.js` + `client/js/shop.js` (`window.HoiShop`, `window.HoiWallet`) + `#wallet-hud`, `#shop-panel`, `#pass-panel`, `#tournament-panel`, `#gift-panel` | Repo-only |
| N-05 | Đóng gói & chạy: `npm start` cổng 3000, Docker | `Dockerfile`, `docker-compose.yml`, `.env.example`, `package.json` (chỉ phụ thuộc `ws`) | Repo-only |

## 2. Những điểm repo đã làm đúng so với artifact

1. **Luật cốt lõi giữ nguyên:** trống chạy / chiêng đứng yên tuyệt đối, nhịp
   random mỗi trận; CHIA TEAM tối đa 3 đội, mỗi đội một cầu riêng, chỉ
   leader được bước, rớt cầu loại cá nhân, xếp hạng cá nhân theo thời gian —
   khớp cả chữ trong `#startCard`/`.rules` của artifact lẫn quyết định đã
   chốt của Sudo.
2. **Du lịch giữ nguyên tắc trung thực:** 1.969 đảo / 1.553 km² ghi đúng,
   không tuyên bố dựng chi tiết cả 1.969 đảo; mỗi đảo có nhãn nguồn
   (truyền thuyết / lịch sử thật / chuyện trong game); chỉ đảo đang xem
   dựng chi tiết.
3. **Chat giữ nguyên giới hạn:** 120 ký tự, chống spam 2 giây/tin, bong
   bóng ~5 giây bám theo người gửi, câu chat nhanh, nút ẩn bong bóng —
   và bot vẫn ghi rõ là bot.
4. **Đảo xa giữ nguyên tắc màu:** đá xám, cây xanh, sương xanh xám, không
   trắng xóa.
5. **Tên/id tiếng Việt giữ nguyên ý nghĩa** dù id kỹ thuật đổi
   (`#chatPanel` → `#chat-panel`, `#tourPanel` → `#tourism`,
   `#specBanner` → `#spectator`, `#joyBase` → `#joystick`…), nên việc
   đối chiếu và bảo trì không bị lạc.

## 3. Parity gap còn mở — việc cho code workers

Ưu tiên theo cảm giác chơi, không theo thứ tự bảng:

| # | Gap | Mức | Việc cần làm |
|---|---|---|---|
| G-01 | **Không có âm thanh.** Artifact có trống, chiêng, tiếng loại, tiếng ván nứt, tiếng sóng/gió nền, chim hót, tiếng vỗ tay — repo im lặng hoàn toàn. | Cao | Port nhóm WebAudio của artifact sang một module `client/js/audio.js` (tổng hợp bằng WebAudio, không file nhạc): `drumHit`/`gongHit` theo message `drum` của server, `crackSound` khi `bridgeUpdate` báo vỡ, `splashSound` khi rơi, `cheerSound` khi về đích, ambient nền. Cần nút tắt tiếng; không tự phát tiếng trước khi người chơi tương tác (chính sách autoplay của trình duyệt). |
| G-02 | **Bấm đảo xa trong 3D không làm gì.** Artifact: bấm đảo xa bất kỳ → bay tới + dựng chi tiết theo seed (`flyToDistant` + `buildDetailIsland`). Repo: raycast chỉ khớp `userData.tourIdx` của 7 đảo đặt tên; 260 silhouette không mang `tourIdx`. | Cao | Gắn `userData` cho silhouette (seed + vị trí) và thêm `flyToDistant` phía client: bay tới rồi dựng chi tiết tạm cho đảo đó, đảo cũ quay lại silhouette khi rời đi (giữ nguyên tắc "chỉ đảo đang xem dựng chi tiết"). Lưu ý README hiện ghi "bấm trực tiếp đảo trong thế giới 3D" — câu này hiện chỉ đúng với 7 đảo đặt tên, cần sửa hoặc làm cho đúng. |
| G-03 | **Không có flyover / màn giới thiệu đảo.** Artifact mở đầu bằng camera bay vòng ngắm vịnh + splash `#islandIntro` rồi mới đếm ngược. Repo vào thẳng từ menu. | Trung bình | Thêm mode `flyover` cho `updateCamera`: khi bấm "CHƠI ĐƠN" thì bay một vòng ngắn quanh đảo rồi mới đếm ngược; thêm splash tên đảo/vòng như `#islandIntro`. Có thể làm sau G-01/G-02. |
| G-04 | **Không có banner giữa màn hình và không có số đếm ngược.** Đổi trống/chiêng và đếm ngược 3-2-1 trong repo chỉ là chữ nhỏ/toast. | Trung bình | Thêm `#phaseBanner` (banner lớn ~1,1 giây mỗi lần đổi nhịp, đỏ khi chiêng) và `#countdown` (số lớn 3-2-1) theo đúng artifact; dùng chung với G-01 (mỗi nhịp đếm kèm `drumHit`). |
| G-05 | **Không có ô kết quả cá nhân cuối trận và không có confetti.** `showRanking` chỉ liệt kê bảng; mất 3 ô hạng/thời gian/người còn lại và hiệu ứng ăn mừng. | Trung bình | Thêm overlay kết thúc riêng (tách khỏi `#team-screen` đang bị tái dùng) với 3 ô kết quả cá nhân + bảng xếp hạng + confetti khi thắng/về đích. |
| G-06 | **Không có panel tiến độ đội trực tiếp ở vòng 2.** Artifact `#teamPanel` (`tpRows`/`tpTurn`) cho thấy từng đội qua được mấy bước + ai đang tới lượt; repo chỉ hiện "Team của bạn: …" (`game.js:532`). | Trung bình | Thêm panel đội trực tiếp trong HUD vòng 2, cập nhật từ message `bridgeUpdate`/`turn` của server (số bước mỗi đội, leader hiện tại). |
| G-07 | **Minimap không có chế độ bản đồ cầu vòng 2.** Repo minimap luôn là bản đồ đảo. | Thấp | Thêm chế độ vẽ cầu (3 cầu song song viền màu đội, bước ván, đảo cuối) khi `phase === 'round2'`, theo đúng `drawMinimap()` của artifact. |
| G-08 | **Thiếu điểm ngắm cầu trong danh sách tour + thiếu nút chơi lại trong panel tour.** Artifact có POI "Cầu Khỉ Sương Mù" và nút "CHƠI LẠI — XẾP HÀNG TRẬN SAU". | Thấp | Thêm POI cầu vào `#tour-list` (bay tới điểm ngắm cầu) và nút chơi lại trong `#tourism` (dùng chung luồng `#btn-replay`). |
| G-09 | **Mất ô "ĐÃ ĐI" (số mét) trên HUD và hai nhãn đầu/cuối của thanh tiến độ.** | Thấp | Thêm lại số mét đã chạy (client tự tính từ `player` z) và hai nhãn "VẠCH XUẤT PHÁT / ĐÍCH" nếu còn chỗ trên mobile. |
| G-10 | **Câu chat nhanh thứ 4 khác artifact.** Repo: "Chờ mình với!"; artifact: "Đứng yên, chiêng kìa!" — câu của artifact hữu ích đúng lúc chiêng. | Thấp | Đổi câu thứ 4 trong `.quick-row` thành "Đứng yên, chiêng kìa!" (hoặc thêm thành câu thứ 5). |
| G-11 | **Thiếu bẫy lỗi toàn cục `#errBox`.** | Thấp | Thêm `window.onerror`/`unhandledrejection` hiện lỗi gọn lên màn hình (chỉ khi `NODE_ENV` dev hoặc có `?debug`), để play-test báo lỗi nhanh. |
| G-12 | **Hình dáng từng đảo ít đặc trưng hơn artifact** (repo dùng một `islandBase` chung; artifact dựng riêng đôi gà chọi / núi nón / lư hương 3 chân / cóc 2 u mắt / đồi sim tím / 2 mỏm khỉ). | Thấp | Khi có thời gian polish: thêm biến thể hình dáng theo `id` đảo trong `islandBase` (đỉnh bằng, khe hở, 3 chân, 2 u mắt…), không đổi vị trí/tên/câu chuyện. |

### Ghi chú ngoài bảng — phát hiện khi đối chiếu (không phải parity UI)

- **Ghi chú tích hợp trong README đã lỗi thời.** Đoạn "Lưu ý tích hợp" trong
  `README.md` ghi "`server.js` chưa nối economy vào và `index.html` chưa có
  các panel shop/pass/giải đấu/quà tặng". Kiểm tra code hiện tại thấy **cả
  hai đều đã có**: `index.html` có `#wallet-hud`, `#shop-panel`,
  `#pass-panel`, `#tournament-panel`, `#gift-panel` và thẻ
  `<script src="js/shop.js">`; `server/server.js` có `try-require`
  `economy.js` (dòng 67–68) và dispatch `msg.type === 'economy'` sang
  `economy.handle` (dòng 778–781); `game.js` chuyển message `economy` vào
  `window.HoiShop.onMessage` (dòng 371) và expose `window.__sendWS` (dòng
  1229). **Phần còn thiếu thật của M-03 là các hook kiếm xu/XP**:
  `awardRoundSurvived` / `awardWin` / `recordMatchPlayed` /
  `recordChatSent` — **đã nối xong trong đợt làm lại giao diện này**:
  `server.js` gọi chúng khi bắt đầu trận, kết thúc vòng, kết thúc trận
  (thắng) và khi gửi chat, qua helper `econSafe` có try/catch. Ghi chú
  lỗi thời trong README cũng đã sửa theo. Còn lại là play-test M-07
  (kiểm tra xu/XP tăng thật trong game).

## 4. Phương pháp đối chiếu

1. Đọc file export `prototype-game-3d-1-vong.html` (4.164 dòng): tách
   body (156 dòng), style (373 dòng), game (3.622 dòng) và liệt kê toàn bộ
   `id`/`class` + hàm chính của artifact.
2. Đọc repo: `README.md`, `docs/BRD.md`, `docs/PLAN.md`,
   `docs/ARCHITECTURE.md`, rồi rà `client/index.html`,
   `client/css/style.css`, `client/js/game.js`, `client/js/rounds.js`,
   `client/js/shop.js`, `server/server.js` (+ `server/games.js`,
   `server/economy.js` để xác nhận phần repo-only).
3. Mỗi phần tử artifact được gán đúng một trạng thái Ported / Adapted /
   Missing; mỗi phần tử chỉ có ở repo được ghi Repo-only, không tính là
   gap của artifact.
4. Không sửa bất kỳ file code nào trong quá trình đối chiếu; không chạy
   game; các trạng thái "đã có" ở đây là **đọc từ code**, chưa qua
   play-test tay (xem `docs/PLAN.md` §3 checklist P0-09 vẫn outstanding).

## 5. Cập nhật sau đợt làm lại giao diện (nhánh feat/artifact-ui)

Các khoảng trống G-01–G-12 ở trên đã được lấp trong đợt này, kiểm tra bằng
`node --check` + smoke test stub DOM (`/tmp/smoke.js`, 11.705 frame, không lỗi)
và server smoke test (`GET /`, `/health`, các file JS/CSS đều 200):

- **G-01 (âm thanh): ĐÃ LẤP** — WebAudio trống/chiêng có reverb, sóng/gió/chim,
  splash/crack/cheer/elim đã port vào `client/js/game.js`.
- **G-02 (bấm đảo xa trong 3D): ĐÃ LẤP** — `flyToDistant` + `buildDetailIsland`,
  370 silhouette, chỉ 1 đảo chi tiết tại một thời điểm.
- **G-03/G-04 (flyover, banner/đếm ngược): ĐÃ LẤP** — flyover ~3,4 giây + đếm
  ngược 3-2-1; banner theo phase có sẵn trong HTML.
- **G-05/G-06 (end card, team-progress): ĐÃ LẤP** — `#endCard` và `#teamPanel`
  của artifact đã có trong `client/index.html`.
- **Nối id:** `game.js` có bảng `ID_ALIASES` dịch id kebab-case cũ sang id
  artifact, cộng khối lobby (`#player-name`, `#btn-single`, `#btn-multi`,
  `#multi-box`, `#btn-create`, `#room-code`, `#btn-join`, `#btn-list`,
  `#room-list`, `#lobby-info`, `#btn-tour-lobby`) và `#round-timer-wrap` /
  `#round-timer-fill` / `#hud-round-time`; class `playing` / `spectator` /
  `touring` trên `body` được đồng bộ mỗi frame. Mọi id tĩnh mà `game.js`
  tham chiếu đều có mặt trong HTML; các id còn lại của `rounds.js` /
  `shop.js` được tạo động bằng `innerHTML` trong chính các file đó.
- **Kinh tế:** các hook kiếm xu/XP (`recordMatchPlayed`,
  `awardRoundSurvived`, `awardWin`, `recordChatSent`) đã được nối trong
  `server/server.js` qua helper `econSafe`; ghi chú lỗi thời trong README
  đã sửa.
- **Còn chờ QC chơi thật trên trình duyệt:** cảm giác camera/flyover, bấm
  đảo xa, bong bóng chat theo nhân vật đang chạy, bố cục mobile, và scale
  456 người (chưa test tải).
