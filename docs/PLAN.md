# Kế hoạch task — Trống Hội & Cầu Khỉ

> Cách đọc bảng task: **Ưu tiên** P0 = chặn đường chính, phải làm trước;
> P1 = quan trọng, làm ngay sau P0; P2 = làm sau khi P0/P1 xong.
> **Trạng thái:** `Đã có trong demo` / `Đang làm` / `Dự kiến`.
> **Cỡ (Size):** S = nhỏ (một buổi làm việc), M = vừa (vài buổi), L = lớn
> (nhiều buổi, cần chia nhỏ thêm khi bắt đầu). Cỡ là ước tính tương đối,
> **không phải cam kết số ngày**.
> Mỗi task có tiêu chí chấp nhận riêng — task chỉ coi là xong khi đạt tiêu
> chí đó **và** đã qua play-test thật nếu tiêu chí có ghi.
> Tài liệu này không thay code: khi làm task, đọc `docs/ARCHITECTURE.md`
> (kiến trúc) và `docs/BRD.md` (yêu cầu) trước.

## Phase 0 — Demo parity và tài liệu (đã xong phần lớn, trừ play-test thật)

Mục tiêu: bản demo trong repo chạy được, tài liệu đầy đủ, và Sudo chơi thử
thật để xác nhận cảm giác chơi trước khi làm thêm tính năng mới.

| ID | Task | Ưu tiên | Trạng thái | Phụ thuộc | Cỡ | Tiêu chí chấp nhận |
|---|---|---|---|---|---|---|
| P0-01 | Repo độc lập: client + server Node.js + `ws`, chạy bằng `npm start`, không build step | P0 | Đã có trong demo | — | — | `npm install && npm start` chạy, mở `localhost:3000` chơi được; `node --check` qua server và client |
| P0-02 | Vòng 1 Trống Hội + vòng 2 Cầu Khỉ + CHIA TEAM đúng luật đã chốt (team chỉ chia lượt, không team thắng/thua) | P0 | Đã có trong demo | P0-01 | — | Chơi đơn và multiplayer đều qua được 2 vòng; rớt cầu loại cá nhân; xếp hạng cá nhân theo thời gian |
| P0-03 | Du lịch Hạ Long: 7 đảo chi tiết + 260 silhouette đảo xa, click/zoom ra chi tiết, câu chuyện có nhãn | P0 | Đã có trong demo | P0-01 | — | Bấm đảo trong 3D/minimap/danh sách đều bay tới xem chi tiết; đảo xa không trắng xóa; chỉ đảo đang xem dựng chi tiết |
| P0-04 | Chat phòng: bong bóng trên đầu ~5 giây + panel, giới hạn 120 ký tự, chống spam 2 giây/tin, câu chat nhanh | P0 | Đã có trong demo | P0-01 | — | 2 người trong phòng thấy tin của nhau cả trên đầu và trong panel; tin 129 ký tự bị từ chối; bot ghi rõ `· BOT` |
| P0-05 | Khán giả 4 góc nhìn + minimap + HUD + điều khiển mobile | P0 | Đã có trong demo | P0-01 | — | Bị loại chuyển khán giả được; đổi góc/chuyển người được; minimap vẽ đúng đảo và chấm người chơi |
| P0-06 | Viết `docs/ARCHITECTURE.md` | P0 | Đã có | P0-01 | S | Mô tả đúng stack, giao thức và máy trạng thái của code hiện tại; mục dự kiến ghi rõ là dự kiến |
| P0-07 | Viết `docs/BRD.md` | P0 | Đã có | P0-01 | S | Có scope IN/OUT, FR có trạng thái, kho trò và đường loại ghi rõ là tầm nhìn chưa triển khai |
| P0-08 | Viết `docs/PLAN.md` (tài liệu này) + cập nhật README trỏ tới docs | P0 | Đã có | P0-06, P0-07 | S | README ghi rõ chỉ mô tả demo; PLAN có bảng task, checklist play-test, Definition of Done |
| P0-09 | **Play-test thật toàn bộ bản demo** (checklist ở §3) | P0 | Dự kiến | P0-01..P0-05 | M | Mọi mục trong checklist §3 đã thử bằng tay trên máy thật, có ghi chú kết quả; lỗi tìm được đã ghi thành task mới |

## Phase 1 — Cấu trúc trận đầy đủ (số vòng không giới hạn, đường loại, kho thử thách)

Mục tiêu: từ demo 2 vòng lên thành trận đầy đủ theo tầm nhìn, nhưng **chưa**
cần scale 456 người — chơi tốt ở quy mô phòng hiện tại (20 người) trước.
Không bắt đầu Phase 1 cho tới khi Sudo chốt OD-01 và OD-02 trong BRD §9.4
(danh sách trò, luật loại ở trò đồng đội).

| ID | Task | Ưu tiên | Trạng thái | Phụ thuộc | Cỡ | Tiêu chí chấp nhận |
|---|---|---|---|---|---|---|
| P1-01 | Thiết kế chi tiết 4 trò mới: Kéo Co Nhịp, Nặn Tò He, Bịt Mắt Bắt Dê, Rồng Rắn Cướp Cờ (luật, cách chấm, chống học thuộc, biến thể theo người chơi) | P0 | Dự kiến | OD-01, OD-02 | L | Mỗi trò có tài liệu luật 1 trang: mục tiêu, cách chơi, cách loại, biến thể random, trường hợp biên; Sudo duyệt |
| P1-02 | Giới hạn thời gian vòng 1 (120 giây) + quy tắc kết thúc vòng (sửa lỗ hổng trận kẹt khi có người đứng yên) | P0 | Đang làm (workstream song song) — quyết định 120 giây đã chốt (BRD §9.4 OD-02); tại thời điểm viết tài liệu này code server.js chưa có giới hạn 120 giây, chỉ có nhịp trống/chiêng, nên chưa ghi "đã xong"; QC có thể lật lại con số 120 giây sau play-test | — | S | Hết 120 giây vòng 1 thì vòng tự kết thúc theo quy tắc đã công bố; không còn trường hợp trận kẹt vì một người đứng yên |
| P1-03 | Seed random theo phòng–vòng (thay `Math.random()` rải rác) cho nhịp trống, ván yếu, biến thể trò | P1 | Dự kiến | P1-01 | M | Cùng seed cho cùng kết quả random; trận khác seed thì khác kết quả; seed lưu trong dữ liệu trận |
| P1-04 | Cài 4 trò mới vào game (client + server), mỗi trò một module riêng | P0 | Dự kiến | P1-01, P1-03 | L | Chơi được cả 4 trò ở chế độ chơi đơn và multiplayer; luật loại đúng tài liệu P1-01 |
| P1-05 | Đường loại không giới hạn số vòng, co giãn theo số người thực tế (456 → 280 → 150 → 70 → 24 → 6 → 1 ở phòng đủ người chơi đúng mục tiêu; bảng co giãn cho phòng nhỏ; mỗi vòng loại ít nhất 1 người, chung kết Rồng Rắn chỉ khi ≤ 6 người sống) | P1 | Đã làm (PR #3) | P1-04 | M | Phòng 20 người có đường loại hợp lý tới 1 người thắng; phòng đủ 456 người theo đúng đường loại tầm nhìn; trận có thể dài hơn 6 vòng nếu người chơi đều chơi tốt (OD-11) |
| P1-06 | Chọn 6 trò mỗi trận từ kho (random theo seed, không lặp trận trước) + thứ tự trò random | P1 | Dự kiến | P1-03, P1-04 | M | Hai trận liên tiếp không giống hệt nhau; mỗi trận đủ 6 trò |
| P1-07 | Timer trận tổng + HUD theo vòng (hiển thị vòng hiện tại/tổng số vòng, trò hiện tại) | P1 | Đã làm (cycle 9, PR #3) | P1-05 | S | HUD luôn đúng vòng và trò đang chơi; hết giờ tổng thì trận kết thúc có kết quả |
| P1-08 | Cân bằng lại (play-test + chỉnh số): thời gian mỗi vòng, tỉ lệ loại mỗi vòng, độ khó ván yếu | P1 | Dự kiến | P1-04, P1-05 | M | Sau 5 trận play-test, tỉ lệ loại mỗi vòng gần mục tiêu trong BRD §8.2 (sai lệch ghi rõ lý do nếu chưa đạt) |
| P1-09 | Bảng xếp hạng trực tiếp trong lúc xem (khán giả thấy ai đang dẫn đầu, ai vừa bị loại) | P2 | Đã làm (cycle 8, PR #3) | P1-05 | S | Khán giả xem được bảng trực tiếp cập nhật theo sự kiện loại/về đích |
| P1-10 | Dọn code chết: kiểm tra chat `length > 120` không bao giờ chạy, và các TODO trong code | P2 | Xong (cycle 7) | — | S | Đã xoá 2 nhánh chết (sendChat length>120, bubblesHidden), repo hết TODO; `node --check` vẫn qua |

## Phase 2 — Scale lên 456 người

Mục tiêu: phòng 456 người chơi được mượt, 1.000 người chờ thì tách trận
song song. Không bắt đầu trước khi Phase 1 xong và Sudo chốt OD-04, OD-07
(ngân sách hosting, mục tiêu người chơi đồng thời).

| ID | Task | Ưu tiên | Trạng thái | Phụ thuộc | Cỡ | Tiêu chí chấp nhận |
|---|---|---|---|---|---|---|
| P2-01 | Hàng đợi lobby + chia phòng 456 người, 1.000 người chờ → tách trận song song | P0 | Dự kiến | P1-05 | L | 1.000 người chờ được chia đúng thành các phòng ≤ 456 người; phòng đủ 456 tự bắt đầu |
| P2-02 | Chia nhỏ vòng 1 thành sân con ~57 người, lấy top N mỗi sân rồi gộp lại | P0 | Dự kiến | P2-01 | L | Vòng 1 chạy song song ở các sân con; số người gộp đúng top N mỗi sân; người chơi thấy rõ mình ở sân nào |
| P2-03 | Vòng lặp tick cố định ~15 Hz (mục tiêu) thay cho xử lý message rời rạc | P0 | Dự kiến | P2-01 | L | Tick chạy ổn định ~15 Hz khi phòng đông (số đo thực tế ghi lại); kết quả trận không đổi so với trước |
| P2-04 | Đồng bộ theo vùng nhìn thấy (AOI): client chỉ nhận vị trí người chơi gần mình | P0 | Dự kiến | P2-03 | L | Phòng 456 người vẫn chơi được; băng thông mỗi client giảm rõ so với phát toàn bộ (số đo ghi lại) |
| P2-05 | Client gửi input (hướng + nhảy) thay vì vị trí tuyệt đối; server tính vị trí + giới hạn tốc độ | P1 | Dự kiến | P2-03 | M | Không thể gian lận bằng cách gửi vị trí nhảy thẳng tới đích; di chuyển bình thường không bị giật |
| P2-06 | Instancing đảo xa + LOD (chi tiết theo khoảng cách) cho cây/chim/đảo | P1 | Dự kiến | — | M | Số draw call giảm rõ so với 260 mesh riêng hiện tại (số đo ghi lại); đảo xa vẫn không trắng xóa |
| P2-07 | Load test phòng đông (bot mô phỏng nhiều client) + đo FPS / độ trễ / tải server | P0 | Dự kiến | P2-01..P2-04 | L | Có báo cáo số đo: FPS, độ trễ, CPU/RAM server ở 100 / 200 / 456 người (số đo thực tế, không ước tính) |
| P2-08 | Reconnect: người rớt mạng quay lại đúng nhân vật trong thời gian ân hạn | P1 | Dự kiến | P2-03 | M | Rớt mạng < 30 giây (đề xuất) thì vào lại đúng vị trí/trạng thái; quá hạn thì slot được giải phóng |
| P2-09 | Self-host Three.js (hết phụ thuộc CDN) + fallback nếu CDN lỗi | P2 | Xong (cycle 16, 2026-11-07) | — | S | Tắt mạng CDN thì game vẫn tải được (kiểm tra bằng cách chặn CDN khi test) |

## Phase 3 — Cứng hóa production và triển khai

Mục tiêu: đưa game lên production an toàn, đo được, xử lý được sự cố.
Không bắt đầu trước khi Sudo chốt OD-03, OD-04, OD-05 (mô hình kinh doanh,
ngân sách hosting, chính sách kiểm duyệt).

| ID | Task | Ưu tiên | Trạng thái | Phụ thuộc | Cỡ | Tiêu chí chấp nhận |
|---|---|---|---|---|---|---|
| P3-01 | Database: lưu trận, người chơi trong trận, tin nhắn chat, bảng xếp hạng | P0 | Dự kiến | P1-05 | L | Tắt server rồi bật lại vẫn xem được lịch sử trận và bảng xếp hạng |
| P3-02 | Hosting + tên miền + TLS + reverse proxy (Nginx/Caddy) | P0 | Dự kiến | OD-04 | M | Mở bằng `https://`, WebSocket chạy `wss://`, trang tải được từ mạng ngoài |
| P3-03 | Chống gian lận: kiểm tra tốc độ di chuyển, kiểm tra input hợp lệ, log hành vi bất thường | P0 | Dự kiến | P2-05 | M | Client gian lận (gửi vị trí/tốc độ bất thường) bị chặn hoặc bị loại; chơi bình thường không bị ảnh hưởng |
| P3-04 | Kiểm duyệt chat: tố cáo, mute, lọc từ, dashboard kiểm duyệt tối thiểu | P0 | Dự kiến | OD-05 | L | Người chơi tố cáo được; host/mod mute được; từ trong danh sách cấm không hiện cho người khác |
| P3-05 | Health check `/health` + log có cấu trúc + giám sát + cảnh báo + tự khởi động lại khi crash | P1 | Đã làm bước 1 (cycle 19, 2026-11-07: access log `http_request`, handler `fatal` + exit 1, tắt có trật tự `server_stop`, `/health` thêm `pid`/`startedAt`, supervisor `npm run supervise` backoff 1s→10s) + bước 2 (cycle 22, 2026-11-07: supervisor gom log vào file `SUPERVISOR_LOG_FILE` + xoay theo kích thước, mặc định 5 MiB giữ 3 thế hệ — còn lại: cảnh báo khi server chết, cần Sudo chọn kênh) | P3-02 | M | `/health` trả trạng thái + số phòng; server crash thì tự chạy lại; có cảnh báo khi server chết |
| P3-06 | Analytics tối thiểu: số trận, số người chơi, tỉ lệ hoàn thành, tỉ lệ dùng chat/du lịch (theo KPI trong BRD §2) | P1 | Đã làm bước 1 (cycle 20, 2026-11-07: `server/analytics.js` + `GET /analytics`, KPI-01/03/04/05, trận QC tách riêng, grace 30s sau khi trận kết thúc để tính tour/replay trên màn hình kết thúc) + bước 2 (cycle 23, 2026-11-07: KPI-02 lấp đầy phòng — `liveRooms`, đủ 20 người trong ≤ 5 phút, `fill20Rate`/`avgFill20Sec`/`under20StartRate` — còn lại: KPI-06 FPS/tải trang ở client, KPI-07 đếm trận bỏ dở, KPI-08 tố cáo, khóa admin cho `/analytics` khi mở public) + bước 3 (cycle 24, 2026-11-07: KPI-07 trận bỏ dở — `matchesAbandoned`/`abandonRate`, trận đã kết thúc mà phòng trống trong grace thì chốt ngay thay vì mất số — còn lại: KPI-06 FPS/tải trang ở client, KPI-08 tố cáo, khóa admin cho `/analytics` khi mở public) | P3-01 | M | Có số đo thật cho KPI-01..KPI-05 sau 1 tuần chạy (số đo thực tế, không ước tính) |
| P3-07 | Lọc tên người chơi + giới hạn ký tự đặc biệt | P2 | Đã làm (cycle 18, 2026-11-07) | — | S | Tên có từ cấm hoặc ký tự đặc biệt quá mức bị từ chối với thông báo rõ |
| P3-08 | Tài khoản / đăng nhập (chỉ làm nếu Sudo chốt OD-08 là làm) | P2 | Dự kiến | OD-08, P3-01 | L | Đăng nhập được, hồ sơ lưu lịch sử trận; chơi không đăng nhập vẫn được (khách) |

## Phase 3b — Kinh tế trong game (monetization, bản stub)

Mục tiêu: lõi trận miễn phí, chỉ bán đồ trang trí bằng Hội Xu; tiền thật
chỉ là stub demo (BRD §10, OD-03 đã quyết 2026-11-05). Phase này làm
xong phần stub; mở thanh toán thật là việc riêng sau này (M-08), cần
quyết định mới của Sudo.

| ID | Task | Ưu tiên | Trạng thái | Phụ thuộc | Cỡ | Tiêu chí chấp nhận |
|---|---|---|---|---|---|---|
| M-01 | Module kinh tế server `server/economy.js`: ví Hội Xu, shop cosmetic, kiểm tra sở hữu khi trang bị, Pass free+paid (XP/cấp/thưởng), giải đấu Chủ Hội, cheer/gift sticker, Vé Du Lịch, nhiệm vụ ngày, stub checkout, lưu JSON `data/economy.json` | P0 | Đã làm (bản stub) | — | M | `node --check` qua; kiếm xu đúng mức (+10/vòng, +50/thắng, +20/nhiệm vụ, +5/cheer); trang bị món chưa mua bị từ chối; mua Pass/vé bằng tiền thật trả về `stub:true`, không gọi cổng thanh toán |
| M-02 | Giao diện shop client `client/js/shop.js`: `window.HoiShop` + `window.HoiWallet.set`, vẽ shop/pass/giải đấu/quà tặng khi container có sẵn, thử lại 1 lần sau 2 giây nếu chưa có, mọi nút tiền thật ghi "(Demo — chưa thanh toán thật)" | P0 | Đã làm (bản stub) | M-01 | M | `node --check` qua; không mở WebSocket mới (dùng `window.__sendWS` nếu có); không crash khi container chưa tồn tại |
| M-03 | Nối economy vào `server/server.js`: try-require `economy.js`, dispatch `msg.type==='economy'` sang `economy.handle`, gọi hook kiếm xu/XP (`awardRoundSurvived`, `awardWin`, `recordMatchPlayed`, `recordChatSent`) ở đúng chỗ trong luồng trận; server đẩy ví mới về client ngay sau khi cộng xu (`{type:'economy', action:'earned', ...}`) | P0 | Đã làm (cycle 1, 2026-11-06) | M-01 | S | Chơi 1 trận thật: qua vòng +10 xu, thắng +50 xu, nhiệm vụ ngày tăng tiến độ; server vẫn chạy khi `economy.js` lỗi (try-require) |
| M-04 | Nối shop vào client: thêm container `#shop-panel`, `#pass-panel`, `#tournament-panel`, `#gift-panel` + `#wallet-hud` vào `index.html`, thêm thẻ `<script src="js/shop.js">`, expose `window.__sendWS`, chuyển message `{type:'economy'}` từ server vào `HoiShop.onMessage` | P0 | Đã làm (cycle 1, 2026-11-06 — đã có từ các cycle trước, cycle 1 kiểm chứng lại toàn bộ) | M-02 | S | Mở trang: shop vẽ được, mua/trang bị 1 món thật qua server, ví cập nhật; không mở 2 WebSocket |
| M-05 | Triển khai Docker: `Dockerfile` (node:20-alpine, non-root), `docker-compose.yml`, `.env.example` (`PORT`, `NODE_ENV`, `ECONOMY_STUB=true`, không secret), `.dockerignore`, `data/` vào `.gitignore` | P1 | Đã làm (bản stub) | — | S | `docker compose up` chạy được, mở `localhost:3000` chơi được (chưa kiểm bằng Docker trong build này — chỉ kiểm `npm start` + `curl /`) |
| M-06 | Cập nhật docs: BRD §10 monetization + FR-34..FR-45 + OD-02/OD-03 đã quyết; PLAN (tài liệu này); ARCHITECTURE §7.5 + §9 + decision log; README mục kinh tế demo | P1 | Đã làm (bản stub) | M-01, M-02 | S | Docs ghi đúng cái đã làm (stub) và cái chưa làm (M-08); không ghi "đã xong" cho việc của workstream khác |
| M-07 | Play-test tay toàn bộ luồng kinh tế: mua/trang bị, lên cấp Pass, tạo giải đấu + trao giải, cheer/gift, mua Vé Du Lịch, nhiệm vụ ngày qua ngày mới, restart server giữ ví | P1 | Dự kiến | M-03, M-04 | M | Checklist play-test kinh tế mới (ngay dưới đây) thử bằng tay, không còn lỗi P0/P1 mở |
| M-08 | Thanh toán thật (sau này, KHÔNG làm trong phase này): cổng thanh toán, giá tiền thật, tài khoản/đăng nhập, lưu giao dịch bằng database, đối soát/hoàn tiền, lật `ECONOMY_STUB=false` | P2 | Dự kiến (chặn bởi quyết định mới của Sudo) | OD-03 (tiền thật), P3-01, P3-08 | L | Thu được 1 giao dịch thật end-to-end trong môi trường test của cổng thanh toán; nhãn stub đã gỡ khỏi UI/docs |

#### Checklist play-test kinh tế (mới, cho M-07 — chưa làm)

- [ ] Mua 1 món bằng xu: ví trừ đúng giá, món vào inventory, mua lại báo đã sở hữu.
- [ ] Trang bị món chưa mua (gửi message tay): server từ chối, nhân vật không đổi đồ.
- [ ] Qua 1 vòng +10 xu, thắng trận +50 xu, XP tăng, lên cấp nhận thưởng Pass miễn phí.
- [ ] Mua Pass trả phí: trả về `stub:true`, không thu tiền thật, thưởng track trả phí của cấp đã đạt được mở.
- [ ] Tạo giải đấu: giải thưởng trừ khỏi ví chủ hội; trao giải cho người thắng, ví người thắng cộng đúng số xu; tạo giải tên cấm bị từ chối.
- [ ] Cheer 2 lần liên tiếp cùng người: lần 2 bị chặn (60 giây); tặng sticker trừ xu người gửi, người nhận +5 xu.
- [ ] Mua Vé Du Lịch bằng xu và bằng stub: đều mở tour cao cấp, không ảnh hưởng trận đấu.
- [ ] Nhiệm vụ ngày: đủ điều kiện thì nhận +20 xu, nhận lại trong ngày bị từ chối; sang ngày mới reset.
- [ ] Tắt server rồi bật lại: ví, inventory, Pass, giải đấu vẫn còn (đọc từ `data/economy.json`).

## Phase 4 — Hoàn thiện và tăng trưởng

Mục tiêu: game đẹp hơn, dễ chơi hơn cho người mới, và có thêm nội dung để
giữ người chơi quay lại. Chỉ làm sau khi Phase 3 xong và game đã chạy ổn
định trên production.

| ID | Task | Ưu tiên | Trạng thái | Phụ thuộc | Cỡ | Tiêu chí chấp nhận |
|---|---|---|---|---|---|---|
| P4-01 | Mở rộng du lịch: thêm đảo mới (từ danh sách tên thật theo hình dáng), thêm câu chuyện có nhãn nguồn | P2 | Đang làm (1/3 đảo xong cycle 21, 2026-11-07 — Hòn Chó Đá) | — | M | Thêm ít nhất 3 đảo mới, mỗi đảo có hình dáng, cây, chim thú, câu chuyện có nhãn; giữ nguyên tắc chỉ đảo đang xem dựng chi tiết |
| P4-02 | Onboarding người mới: màn hình hướng dẫn luật trước trận đầu, gợi ý phím | P1 | ✅ Xong — bước 1 cycle 12 (2026-11-07): overlay 3 bước tự hiện lần đầu + nút mở lại; bước 2 cycle 13 (2026-11-07): dải #roundHint theo từng vòng, tự ẩn 12s, bản chạm trên mobile, khán giả không thấy | P1-04 | M | Người chơi mới đọc xong hướng dẫn thì biết trống/chiêng, cầu, chat; tỉ lệ bỏ trận đầu giảm (đo sau khi có analytics) |
| P4-03 | Polish mobile: joystick, nút bấm, chữ, hiệu năng trên điện thoại tầm trung | P1 | Dự kiến (bước 1 xong cycle 14, 2026-11-07: joystick/NHẢY chỉ hiện trên cảm ứng; overlay Rồng Rắn + dê Bịt Mắt thành dải trên, không đè joystick — bước 2a xong cycle 15, 2026-11-07: HUD mobile 2 hàng, xếp chồng gợi ý/team/move-mode không đè nhau, tiêu đề flyover 1 dòng — còn lại: đo FPS/thời gian tải thật trên điện thoại tầm trung) | P0-09 | M | Chơi trọn một trận trên điện thoại tầm trung không tràn màn hình, ≥ 30 FPS (số đo thực tế) |
| P4-04 | Accessibility: tương phản, cỡ chữ, không chỉ dùng màu để truyền luật | P2 | Dự kiến | — | S | Mọi luật quan trọng đều có chữ kèm theo, không chỉ màu; nút đủ lớn trên mobile |
| P4-05 | Voice chat (chỉ làm nếu Sudo chốt OD-06 là làm) | P2 | Dự kiến | OD-06, P3-04 | L | Nói được trong phòng; có nút tắt tiếng từng người; kiểm duyệt voice theo chính sách đã chốt |
| P4-06 | Sự kiện theo mùa / chủ đề hội làng (ví dụ Tết, lễ hội) | P2 | Dự kiến | P1-06 | M | Ít nhất 1 sự kiện theo mùa chạy được: chủ đề, trò biến thể, thông báo trong game |

## 3. Checklist play-test thật — còn outstanding (chưa làm)

Checklist này lấy từ các mục chưa được kiểm chứng bằng tay trong quá trình
làm demo. **Không task Phase 1 nào được coi là "đã xong" nếu play-test
tìm ra lỗi mà lỗi đó chưa được sửa hoặc ghi thành task mới.** Mỗi mục ghi:
đã thử chưa, kết quả, lỗi (nếu có).

### 3.1. Chơi đơn (1 người + 60 bot)

- [ ] Cảm giác WASD / phím mũi tên: di chuyển mượt, không trễ, không trượt quá đà.
- [ ] Xoay camera bằng kéo chuột: mượt, không giật, không lộn ngược.
- [ ] Nhịp trống/chiêng: nghe rõ trống và chiêng, phân biệt được hai trạng thái.
- [ ] Thời điểm loại lúc chiêng: đứng yên thì không bị loại; nhích nhẹ hoặc nhảy lúc chiêng thì bị loại ngay.
- [ ] Về đích vòng 1: về đích thì qua vòng, hiện đúng màn hình CHIA TEAM.
- [ ] CHIA TEAM: team chia đều, màu áo/vòng đúng team, tên team hiện đúng.
- [ ] Cầu vòng 2: chỉ leader được bước; người chưa tới lượt bị chặn; ván yếu vỡ thì loại đúng người; ván vỡ thành khoảng trống nhảy qua được.
- [ ] Xếp hạng cuối trận: đúng người, đúng thời gian, không có xếp hạng team.
- [ ] Chơi lại: bấm Chơi lại thì về vòng 1 bình thường.
- [ ] Bot: bot di chuyển tự nhiên, không đi xuyên tường/đảo, nhãn `· BOT` luôn hiện.

### 3.2. Multiplayer (2 trình duyệt thật trở lên)

- [ ] Tạo phòng + vào phòng bằng mã 6 ký tự; xem danh sách phòng đang mở.
- [ ] Host bắt đầu (≥ 2 người); phòng tự bắt đầu khi đủ 20 người.
- [ ] 2+ người chơi thấy nhau di chuyển theo thời gian thực, không lag nặng.
- [ ] Chia team nhiều người sống sót: team chia đều, mỗi team một cầu, leader đúng người.
- [ ] Chặn lượt cùng team: người chưa tới lượt không bước được cầu, nhận thông báo rõ.
- [ ] Ván yếu trên cầu: ván yếu của team này không ảnh hưởng team khác; ván vỡ hiện đúng cho cả phòng.
- [ ] Người vào giữa trận: chỉ làm khán giả, không chơi được.
- [ ] Host rời phòng: host chuyển cho người còn lại, trận không kẹt.
- [ ] Người chơi rớt mạng: ghi rõ chuyện gì xảy ra (hiện tại là mất slot — cần ghi nhận để làm P2-08).

### 3.3. Chat

- [ ] Mở chat bằng Enter, gửi bằng Enter, đóng bằng Esc; đang gõ thì WASD không di chuyển nhân vật.
- [ ] Bong bóng chat hiện trên đầu người gửi ~5 giây và **đi theo nhân vật đang di chuyển** (chưa kiểm chứng bằng tay — mục quan trọng nhất của chat).
- [ ] Tin nhắn hiện trong panel kèm đúng tên, màu team, giờ gửi.
- [ ] Tin 129 ký tự bị từ chối (đã kiểm bằng test tự động, cần thử lại bằng tay).
- [ ] Gửi 2 tin cách nhau dưới 2 giây thì tin thứ hai bị chặn với thông báo rõ.
- [ ] Câu chat nhanh bấm là gửi; nút ẩn bong bóng và ẩn panel hoạt động.
- [ ] Chat dùng được ở sảnh, trong trận, khán giả và du lịch.

### 3.4. Du lịch và đảo xa

- [ ] Đảo xa không còn trắng xóa (đá xám, cây xanh, sương xanh xám).
- [ ] Bấm đảo xa trong 3D → camera bay mượt tới đảo, đảo hiện chi tiết đầy đủ (cây, chim thú, bãi cát, cầu tàu, biển tên, câu chuyện).
- [ ] Bấm chấm đảo trên minimap và bấm đảo trong danh sách du lịch cũng bay tới đúng đảo.
- [ ] Chỉ đảo đang xem dựng chi tiết; đảo trước quay lại dạng nhẹ.
- [ ] Zoom bằng cuộn chuột, nút +/−, bấm đúp zoom nhanh; nút Quay lại toàn cảnh và Quay lại trận hoạt động.
- [ ] Panel câu chuyện từng đảo đọc rõ, nhãn (truyền thuyết / lịch sử thật / chuyện trong game) đúng.
- [ ] Chim bay, bướm, cá nhảy, cua, khỉ ở Đảo Khỉ có chuyển động thật, không đứng yên như tượng.
- [ ] Số liệu 1.969 đảo / 1.553 km² hiển thị đúng, không tuyên bố dựng chi tiết cả 1.969 đảo.

### 3.5. Mobile và mạng

- [ ] Joystick ảo + nút NHẢY dùng được trên điện thoại thật; không tràn màn hình ngang.
- [ ] Chữ tiếng Việt có dấu đọc rõ trên điện thoại (HUD, panel, bong bóng chat).
- [ ] Chơi trọn một trận trên điện thoại tầm trung, ghi FPS cảm nhận và tình trạng giật (nếu có).
- [ ] Three.js tải được qua CDN trên mạng của Sudo (mở game ở mạng nhà/mạng 4G, không chỉ mạng dev).

## 4. Definition of Done (định nghĩa "xong" cho toàn bộ dự án)

Dự án chỉ coi là **xong** khi tất cả các điều sau đúng cùng lúc:

1. **Trận đầy đủ:** chơi được trận theo đường loại trong BRD §8.2 (số vòng
   không giới hạn, OD-11), từ lobby tới 1 người thắng, ở cả phòng nhỏ và
   phòng đủ 456 người; trận có thể dài hơn 6 vòng nếu người chơi đều chơi tốt.
2. **Đúng luật đã chốt:** CHIA TEAM chỉ chia lượt, không team thắng/thua;
   xếp hạng cá nhân theo thời gian; bot luôn ghi rõ là bot.
3. **Scale:** phòng 456 người chơi được với số đo load test (P2-07) đạt mục
   tiêu FPS/độ trễ đã chốt với Sudo.
4. **Ổn định:** tỉ lệ trận kẹt/không kết thúc do lỗi < 5% (KPI-07); rớt mạng
   có reconnect; server crash tự chạy lại.
5. **An toàn:** chat có tố cáo/mute/lọc; tên người chơi được lọc; không còn
   lỗ hổng gian lận vị trí đã biết.
6. **Production:** chạy trên tên miền thật với TLS, có health check, log,
   giám sát và analytics cho KPI-01..KPI-05.
7. **Tài liệu:** ARCHITECTURE, BRD và PLAN đều cập nhật theo code thực tế
   (không còn mục nào ghi "đã có" nhưng code chưa có, hay ngược lại).
8. **Play-test:** checklist §3 và checklist tương tự cho các tính năng mới
   đều đã thử bằng tay và không còn lỗi P0/P1 mở.

**Definition of Done cho bản demo (hiện tại):** chỉ gồm P0-01..P0-08
(code demo + 3 tài liệu này). P0-09 (play-test thật) **chưa xong**, nên
bản demo chưa được coi là xong hoàn toàn — xem §3.

## 5. Sudo phải quyết trước khi các phase sau bắt đầu

| Quyết định (mã trong BRD §9.4) | Cần trước phase | Nếu chưa quyết thì sao |
|---|---|---|
| OD-01: danh sách 18–20 trò trong kho | Phase 1 | Không thiết kế được trò mới (P1-01, P1-04 chặn) |
| OD-02: luật loại ở trò đồng đội | Phase 1 | **Đã quyết 2026-11-05:** trận ≥ 24 người lúc bắt đầu vòng 3 thì đội thua bị loại toàn bộ; phòng nhỏ (< 24) chỉ loại 2 người đóng góp yếu nhất đội thua (≤ 2 người thì loại hết). Giới hạn vòng 1 chốt 120 giây (P1-02 đang làm ở workstream song song; QC có thể lật lại con số sau play-test). |
| OD-03: mô hình kinh doanh / giải thưởng | Phase 1 (thiết kế) và Phase 3 (triển khai) | **Đã quyết 2026-11-05:** kinh tế chỉ bán đồ trang trí bằng Hội Xu, tiền thật chỉ là stub demo (BRD §10; stub M-01/M-02 đã làm). Mở thanh toán thật (M-08) vẫn chưa quyết và chưa làm. |
| OD-04: ngân sách hosting + mức chịu tải | Phase 2–3 | Không chọn được kiến trúc production (một server hay nhiều server) |
| OD-05: chính sách kiểm duyệt chat | Phase 3 | Không mở public được (rủi ro nội dung xấu) |
| OD-06: có làm voice chat không | Phase 4 | Mặc định là **không làm**; chỉ làm nếu Sudo chốt làm |
| OD-07: mục tiêu người chơi đồng thời đầu tiên | Phase 2 | Mặc định làm theo mục tiêu 456 người/phòng; nếu Sudo chỉ cần 50–100 người thì Phase 2 nhẹ đi nhiều |
| OD-08: có làm tài khoản / đăng nhập không | Phase 1–3 | Mặc định giữ chơi bằng tên tự chọn, không tài khoản; bảng xếp hạng chỉ lưu theo trận, không lưu theo người |

---
*Tài liệu liên quan: [ARCHITECTURE.md](./ARCHITECTURE.md) (kiến trúc và đường
mở rộng kỹ thuật), [BRD.md](./BRD.md) (yêu cầu nghiệp vụ và tầm nhìn đầy đủ),
[README.md](../README.md) (mô tả bản demo — README chỉ mô tả demo, tầm nhìn
đầy đủ nằm ở BRD và PLAN).*
