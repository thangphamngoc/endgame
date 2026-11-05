# Trống Hội & Cầu Khỉ

Trò chơi sinh tồn dân gian Việt Nam chạy trên trình duyệt, phong cách voxel khối vuông.
Không dùng bất kỳ tài sản, tên gọi hay hình ảnh nào của Squid Game / Trò chơi con mực,
cũng không dùng tài sản hay tên gọi của Minecraft. Đây là bản code độc lập, viết mới
hoàn toàn để mở bằng VS Code hoặc bất kỳ IDE nào và chạy bằng Node.js.

## Cách chạy

```bash
cd trong-hoi-cau-khi
npm install
npm start
```

Mở trình duyệt tại `http://localhost:3000` (cổng mặc định, đổi bằng biến môi trường `PORT`).

- Chế độ **Chơi đơn**: không cần mạng ngoài, chơi ngay với 60 bot.
  Bot luôn được ghi rõ là bot, không bao giờ giả làm người thật.
- Chế độ **Multiplayer**: nhập tên, tạo phòng hoặc nhập mã phòng 6 ký tự để vào phòng.
  Chủ phòng bấm bắt đầu khi có ít nhất 2 người, hoặc phòng tự bắt đầu khi đủ 20 người.
  Server là nơi quyết định nhịp trống/chiêng, ai bị loại, ván yếu và lượt đi.

## Điều khiển

- Di chuyển: `WASD` hoặc phím mũi tên. Xoay camera: kéo chuột.
- Nhảy: `Space`. Trên điện thoại: joystick ảo góc trái và nút `NHẢY`.
- Chat: `Enter` để mở ô chat và gửi, `Esc` để đóng. Khi đang gõ chat, phím `WASD`
  không làm nhân vật di chuyển.
- Khán giả (sau khi bị loại): 4 góc nhìn Toàn cảnh / Theo dõi / Sát vai / Tự do
  (phím `1`–`4` hoặc `C`), chuyển người bằng nút Trước/Sau, `Tab` hoặc phím mũi tên.
- Du lịch: khi đang ở sảnh hoặc đã bị loại, bấm `Du lịch Hạ Long`, bấm đảo trong
  danh sách, bấm chấm đảo trên minimap, hoặc bấm trực tiếp đảo trong thế giới 3D
  để camera bay tới và xem chi tiết + câu chuyện của đảo đó. Cuộn chuột hoặc nút
  `+`/`-` để zoom, bấm đúp để zoom nhanh, nút `Quay lại toàn cảnh` / `Quay lại trận`.

## Luật chơi (ràng buộc)

### Vòng 1 — Trống Hội

Trống đánh thì được chạy, chiêng vang thì phải đứng yên tuyệt đối. Nhịp trống/chiêng
ngẫu nhiên hoàn toàn mỗi trận. Di chuyển hoặc nhảy trong lúc chiêng là bị loại ngay
và chuyển thành khán giả. Về tới vạch đích là qua vòng.

### Giữa vòng — CHIA TEAM

Người sống sót được chia cân bằng thành tối đa 3 team màu Đỏ / Vàng / Xanh lá,
mỗi team một cầu riêng song song, đi theo lượt, chỉ người dẫn đầu của team mới được
bước lên cầu, server chặn người chưa tới lượt.

**Chia team chỉ để đỡ loạn và phối hợp. Không có team thắng, không có team thua,
không có xếp hạng theo team.** Rớt khỏi cầu là loại cá nhân đó thôi, đồng đội còn
lại tiếp tục lượt của mình. Xếp hạng chung cuộc chỉ tính theo cá nhân, theo thời
gian về đích.

### Vòng 2 — Cầu Khỉ Sương Mù

Mỗi cầu có 9 bước, mỗi bước 2 tấm ván, tấm yếu được random lại mỗi trận cho từng
cầu riêng. Bước vào tấm yếu thì ván nứt rồi vỡ, rơi xuống biển là bị loại. Tấm ván
đã vỡ để lại khoảng trống, phải nhảy qua bằng `Space`. Qua hết cầu tới đảo cuối là
thắng, xếp hạng theo thời gian về đích của từng người.

## Du lịch Hạ Long

Người bị loại có thể đi du lịch vịnh thay vì chỉ xem trận. Danh sách gồm Đảo Hội
Làng và các đảo: Hòn Trống Mái, Đảo Ti Tốp, Hòn Đỉnh Hương, Hòn Con Cóc, Đảo Soi
Sim, Đảo Khỉ. Mỗi đảo có hình dáng, cây cối, chim thú và một câu chuyện riêng,
ghi rõ nhãn: truyền thuyết dân gian / chuyện lịch sử thật / chuyện trong game.

Trong giao diện du lịch có ghi rõ: vịnh Hạ Long thật có 1.969 hòn đảo đá vôi trên
khoảng 1.553 km². Trong game chỉ có một số đảo được dựng chi tiết, còn lại là
hàng trăm silhouette đảo xa tới chân trời — **không** tuyên bố rằng game đã dựng
chi tiết cả 1.969 đảo.

Đảo xa dùng màu đá xám, cây xanh và sương xanh xám, không bị trắng xóa. Chỉ đảo
đang xem mới được dựng chi tiết đầy đủ, các đảo khác giữ dạng silhouette nhẹ máy.

## Chat

Tin nhắn hiện thành bong bóng trên đầu người gửi khoảng 5 giây, đi theo nhân vật,
đồng thời hiện trong panel chat kèm tên người gửi, màu team và giờ gửi. Giới hạn
120 ký tự, chống spam 2 giây/tin. Chat multiplayer đi qua server tới mọi người
trong phòng. Chat của bot trong chế độ chơi đơn luôn ghi rõ `· BOT`.

## Kinh tế trong game (demo)

Lõi trận sinh tồn hoàn toàn **miễn phí**. Tiền trong game là **Hội Xu**,
chỉ mua đồ trang trí — không mua chỉ số, không pay-to-win, không cá cược,
không loot box:

- Kiếm xu: +10 xu mỗi vòng sống sót, +50 xu khi thắng trận, +20 xu mỗi
  nhiệm vụ ngày (chơi 1 trận, sống sót 2 vòng, gửi 5 chat), +5 xu mỗi
  lượt được cổ vũ.
- **Shop**: áo bà ba 3 màu (chỉ đổi màu, không đổi chỉ số), nón lá, khăn
  đóng, cờ team, bong bóng chat, emote, đồ trang trí đảo. Server kiểm tra
  sở hữu mỗi lần trang bị — chưa mua thì không dùng được.
- **Hội Làng Pass**: cấp 1–20 theo XP chơi game (100 XP/vòng, 500 XP khi
  thắng), thưởng track miễn phí và track trả phí toàn đồ trang trí.
- **Chủ Hội**: tạo giải đấu riêng có tên thương hiệu, giải thưởng trả bằng
  Hội Xu từ ví chủ hội, người thắng nhận giải bằng xu (không đổi ra tiền
  mặt). Khán giả cổ vũ miễn phí hoặc tặng sticker bằng xu.
- **Vé Du Lịch Hạ Long**: mở thêm câu chuyện đảo, tuyến tour cao cấp và
  huy hiệu lưu niệm cho người bị loại — không ảnh hưởng kết quả trận.

**Thanh toán thật chưa bật: mọi nút tiền thật đều là bản demo có ghi rõ
"(Demo — chưa thanh toán thật)"**, trả về stub và chỉ mở khóa thử trong
bản demo, không xử lý tiền thật. Chi tiết: [docs/BRD.md §10](./docs/BRD.md).

> Lưu ý tích hợp (đang chờ workstream khác): `server/economy.js` và
> `client/js/shop.js` đã viết xong, nhưng `server.js` chưa nối economy
> vào và `index.html` chưa có các panel shop/pass/giải đấu/quà tặng —
> kinh tế chưa chạy được trong game cho tới khi hai việc nối đó xong
> (xem `docs/PLAN.md` M-03, M-04).

## Kiến trúc

```
trong-hoi-cau-khi/
  package.json            # chỉ phụ thuộc ws
  server/server.js        # Node.js + WebSocket, không framework;
                          # vừa phục vụ file client, vừa làm game server
  server/economy.js       # kinh tế trong game (Hội Xu, shop, Pass,
                          # giải đấu, quà tặng, Vé Du Lịch) — bản stub,
                          # lưu JSON data/economy.json; server.js nối qua try-require
  client/index.html       # cấu trúc trang, HUD, panel chat, panel du lịch, minimap
  client/css/style.css    # giao diện voxel: góc vuông, viền dày, chữ Việt rõ
  client/js/game.js       # Three.js qua CDN, thế giới voxel, bot, camera, chat, du lịch
  client/js/shop.js       # giao diện shop/pass/giải đấu/quà tặng (window.HoiShop)
  Dockerfile              # node:20-alpine, non-root, cổng 3000
  docker-compose.yml      # service game, volume giữ data/economy.json
  .env.example            # PORT, NODE_ENV, ECONOMY_STUB=true, không secret
```

Server là nguồn chân lý cho: nhịp trống/chiêng, loại người chơi, chia team,
ván yếu, lượt đi trên cầu, chat và xếp hạng. Client không tự quyết các việc này
trong chế độ multiplayer.

## Lưu ý bản quyền

- Trò chơi lấy cảm hứng từ trò chơi dân gian Việt Nam (trống hội, cầu khỉ) và
  hình ảnh vịnh Hạ Long nói chung, không sao chép nhân vật, trang phục, âm nhạc,
  logo hay tài sản của bất kỳ phim hay game thương mại nào.
- Các câu chuyện gắn nhãn "truyền thuyết dân gian" là chuyện kể dân gian, có thể
  có nhiều dị bản; các câu chuyện gắn nhãn "chuyện trong game" là hư cấu trong
  thế giới game, không phải sự thật địa lý hay lịch sử.

## Tài liệu đầy đủ (kiến trúc, BRD, kế hoạch)

**README này chỉ mô tả bản demo trong repo** (2 vòng, phòng tối đa 20 người
tự bắt đầu, chơi đơn 60 bot, du lịch 7 đảo, chat phòng). Tầm nhìn đầy đủ —
trận 456 người, 6 vòng, kho 18–20 trò, đường loại tới 1 người thắng, và kế
hoạch triển khai production — nằm trong ba tài liệu dưới `docs/`:

- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — tài liệu kiến trúc: luồng trận, server có thẩm quyền, giao thức WebSocket, máy trạng thái, mô hình dữ liệu, đường mở rộng lên 456 người, triển khai.
- [docs/BRD.md](./docs/BRD.md) — tài liệu yêu cầu nghiệp vụ: tầm nhìn, mục tiêu và KPI đề xuất, scope IN/OUT, user stories, yêu cầu chức năng FR-01…FR-33, kho thử thách và đường loại dự kiến, quyết định mở cần Sudo chốt.
- [docs/PLAN.md](./docs/PLAN.md) — kế hoạch task đầy đủ: bảng task theo phase 0–4, checklist play-test thật còn outstanding, Definition of Done, và những gì Sudo phải quyết trước mỗi phase.
