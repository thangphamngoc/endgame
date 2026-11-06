# Tài liệu yêu cầu nghiệp vụ (BRD) — Trống Hội & Cầu Khỉ

> Sản phẩm: trò chơi sinh tồn dân gian Việt Nam chạy trên trình duyệt.
> Chủ sở hữu sản phẩm (Product Owner): Sudo.
> Trạng thái tài liệu: bản đầu tiên, viết từ tầm nhìn gốc và bản demo hiện có
> trong repo `trong-hoi-cau-khi/`.
> **Quy ước đọc:** mục ghi **(Đã có trong demo)** là tính năng đã có trong
> code hiện tại; mục ghi **(Dự kiến)** là kế hoạch, chưa triển khai, cần Sudo
> duyệt trước khi làm. Mọi chỉ tiêu KPI trong tài liệu này đều là **mục tiêu
> đề xuất, chưa đo, chưa đạt** — không được đọc là kết quả thực tế.

## 1. Bối cảnh và tầm nhìn

### 1.1. Bối cảnh

Trò chơi lấy cảm hứng từ format "nhiều người chơi cùng vào một trận, vượt
qua các thử thách dân gian, loại dần tới còn một người thắng" — format mà
bộ phim *Squid Game* đã phổ biến, nhưng bản thân format này được ghép từ
các trò chơi dân gian có từ trước. Sudo muốn một phiên bản mang bản sắc Việt:
trò chơi dân gian Việt Nam (trống hội, cầu khỉ, kéo co, nặn tò he, bịt mắt
bắt dê...), bối cảnh hội làng và vịnh Hạ Long, chơi được ngay trên trình
duyệt, nhiều người chơi thật cùng một trận.

### 1.2. Tầm nhìn

> Một trò chơi trình duyệt 3D, nơi hàng trăm người chơi cùng vào một trận
> sinh tồn dân gian Việt Nam, loại dần qua các vòng thử thách cho tới còn
> một người thắng; người bị loại vẫn ở lại xem trận hoặc đi du lịch vịnh
> Hạ Long trong game; chơi được ngay, không cần cài đặt, không cần tài khoản
> ở giai đoạn đầu.

### 1.3. Nguyên tắc bản sắc và bản quyền (ràng buộc, không thay đổi nếu không có quyết định mới của Sudo)

- **Chỉ dùng bản sắc dân gian Việt Nam:** trống hội, cầu khỉ, hội làng,
  vịnh Hạ Long, áo bà ba, nón lá, đình làng.
- **Không dùng bất kỳ tài sản, tên gọi, trang phục, âm nhạc hay hình ảnh nào
  của Squid Game / Trò chơi con mực** (không lính hồng, không búp bê, không
  áo xanh đánh số, không kẹo dalgona, không logo con mực).
- **Không dùng tài sản, tên, logo hay nhân vật của Minecraft.** Phong cách
  voxel khối vuông dùng trong game là phong cách chung, không sao chép
  texture, nhân vật hay quái của Minecraft.
- **Thông tin địa lý/lịch sử thật phải ghi rõ nguồn và nhãn:** câu chuyện
  đảo gắn nhãn "Truyền thuyết dân gian" (có thể có nhiều dị bản),
  "Chuyện lịch sử thật" (ví dụ Ti Tốp 1962) hoặc "Chuyện trong game" (hư cấu).
  Không tuyên bố game đã dựng chi tiết cả 1.969 đảo Hạ Long — trong game chỉ
  một số đảo được dựng chi tiết, còn lại là silhouette đảo xa.
- **Chia team chỉ để chia lượt:** theo quyết định của Sudo ngày 2026-11-04,
  chia team để đỡ loạn và phối hợp; rớt khỏi cầu là loại cá nhân đó, không
  có team thắng/thua, không có xếp hạng theo team. Mọi thiết kế vòng 2 và
  xếp hạng phải tuân thủ luật này.

## 2. Mục tiêu và chỉ tiêu thành công (KPI đề xuất)

Tất cả các số dưới đây là **mục tiêu đề xuất, chưa đo, cần Sudo duyệt**.
Hiện tại chưa có hệ thống đo (analytics) trong game, nên chưa có số thực tế
nào để đối chiếu.

| # | Chỉ tiêu (đề xuất) | Mục tiêu đề xuất | Đo bằng gì (dự kiến) |
|---|---|---|---|
| KPI-01 | Tỉ lệ trận hoàn thành (trận tới được vòng 2 và có người thắng) | ≥ 80% số trận bắt đầu | Log trận (cần làm ở Phase 3) |
| KPI-02 | Thời gian lấp đầy phòng | Phòng 20 người đủ trong ≤ 5 phút (giờ cao điểm) | Log phòng (cần làm) |
| KPI-03 | Tỉ lệ người chơi dùng chat trong trận | ≥ 30% người chơi gửi ít nhất 1 tin/trận | Log chat (đếm tin, không lưu nội dung dài hạn) |
| KPI-04 | Tỉ lệ người bị loại dùng du lịch | ≥ 40% người bị loại mở Du lịch Hạ Long ít nhất 1 lần | Log sự kiện du lịch (cần làm) |
| KPI-05 | Tỉ lệ người chơi quay lại chơi trận tiếp theo trong cùng phiên | ≥ 50% bấm Chơi lại sau khi trận kết thúc | Log sự kiện replay (cần làm) |
| KPI-06 | Hiệu năng | ≥ 30 FPS trên điện thoại tầm trung; tải trang đầu ≤ ~5 giây trên 4G (ước tính, cần đo) | Đo thủ công + đo tự động ở Phase 2 |
| KPI-07 | Ổn định phòng | < 5% trận bị kẹt/không kết thúc (do lỗi, không do người chơi) | Log trận + báo lỗi (cần làm) |
| KPI-08 | An toàn chat | 0 vụ việc nội dung xấu không được xử lý sau khi có tố cáo (khi có tính năng tố cáo) | Dashboard kiểm duyệt (Phase 3) |

**Mục tiêu kinh doanh (ĐÃ QUYẾT 2026-11-05):** mô hình kinh tế là
**chỉ bán đồ trang trí (cosmetic-only) bằng Hội Xu**, lõi trận sinh tồn
hoàn toàn miễn phí, tiền thật chỉ là **stub demo** (chưa bật thanh toán
thật). Chi tiết xem §10. Các chỉ tiêu doanh thu chưa đặt — cần Sudo duyệt
sau khi có số người chơi thật.

## 3. Các bên liên quan (stakeholders)

| Bên | Vai trò | Nhu cầu chính |
|---|---|---|
| Người chơi | Vào phòng, chơi các vòng cho tới khi còn 1 người thắng, chat với người khác | Vào trận nhanh, luật rõ, không lag, không gặp gian lận |
| Chủ phòng (host) | Tạo phòng, bắt đầu trận | Tạo phòng dễ, bắt đầu khi đủ người, host rời thì có người thay |
| Khán giả / người bị loại | Xem tiếp trận sau khi bị loại | Có góc xem hay, biết ai đang dẫn đầu, không bị văng khỏi trận |
| Khách du lịch trong game (người bị loại) | Đi du lịch vịnh Hạ Long trong lúc chờ | Đảo đẹp, có chuyện để đọc, click/zoom vào đảo xa được |
| Sudo — Product Owner | Quyết định tầm nhìn, luật chơi, thứ tự ưu tiên | Tài liệu rõ ràng, demo chơi được, số liệu để quyết định |
| Đội dev (tương lai) | Triển khai các phase tiếp theo | Kiến trúc rõ (`docs/ARCHITECTURE.md`), task rõ (`docs/PLAN.md`), code đọc được |

## 4. Phạm vi

### 4.1. Phạm vi ĐÃ CÓ trong bản demo (Scope IN — đã làm)

- Lobby/phòng: tạo phòng mã 6 ký tự, vào phòng, xem danh sách phòng đang mở,
  chủ phòng bắt đầu (≥ 2 người), tự bắt đầu khi đủ 20 người, vào giữa trận
  làm khán giả, chuyển host khi host rời phòng.
- Vòng 1 Trống Hội: trống chạy, chiêng đứng yên tuyệt đối, nhịp random,
  server loại người di chuyển lúc chiêng, về đích qua vòng.
- CHIA TEAM giữa vòng: tối đa 3 team Đỏ/Vàng/Xanh lá, mỗi team một cầu riêng,
  đi theo lượt, chỉ leader được bước, server chặn người chưa tới lượt.
- Vòng 2 Cầu Khỉ Sương Mù: 9 bước, mỗi bước 2 ván, ván yếu random riêng
  từng cầu, ván yếu vỡ thì loại cá nhân, ván vỡ thành khoảng trống nhảy qua
  bằng Space, về đích xếp hạng cá nhân theo thời gian.
- Khán giả: 4 góc nhìn (Toàn cảnh / Theo dõi / Sát vai / Tự do), chuyển người xem.
- Du lịch Hạ Long: 7 đảo chi tiết (Đảo Hội Làng, Hòn Trống Mái, Đảo Ti Tốp,
  Hòn Đỉnh Hương, Hòn Con Cóc, Đảo Soi Sim, Đảo Khỉ), mỗi đảo có cây, chim
  thú, hình dáng và câu chuyện riêng có gắn nhãn; 260 silhouette đảo xa;
  click đảo trong 3D / chấm trên minimap / danh sách để bay-zoom tới xem
  chi tiết; nút quay lại toàn cảnh / quay lại trận.
- Chat: bong bóng trên đầu ~5 giây + panel chat (tên, màu team, giờ gửi),
  giới hạn 120 ký tự, chống spam 2 giây/tin, câu chat nhanh, ẩn bong bóng,
  ẩn panel; multiplayer qua server; bot chơi đơn ghi rõ `· BOT`.
- Minimap đảo, HUD (vòng, trạng thái trống/chiêng, thời gian, số người sống,
  tiến độ), điều khiển WASD/chuột/Space, joystick ảo + nút NHẢY trên mobile.
- Chơi đơn: 1 người + 60 bot, bot ghi rõ là bot, không giả làm người thật.

### 4.2. Phạm vi NGOÀI bản demo — chưa làm, cần quyết trước khi làm (Scope OUT)

- Quy mô 456 người/phòng, tách trận song song, chia nhỏ vòng đầu rồi gộp lại.
- Trận đầy đủ: số vòng không giới hạn, chỉ kết thúc khi còn 1 người thắng; kho thử thách 18–20 trò (xem §8).
- Tài khoản / đăng nhập, hồ sơ người chơi, bạn bè, mời chơi.
- Bảng xếp hạng lưu lâu dài, lịch sử trận, thống kê cá nhân.
- Giải thưởng tiền mặt, quảng cáo (chưa quyết — xem §10: giải thưởng
  trong game chỉ trả bằng Hội Xu, không đổi ra tiền mặt).
- Thanh toán thật (chưa bật — chỉ có stub demo, xem §10).
- Voice chat.
- Dashboard kiểm duyệt chat, tố cáo, mute, lọc từ (hiện chỉ có giới hạn
  ký tự, chống spam, ẩn chat ở client).
- Hosting production, tên miền, TLS, giám sát, analytics (xem
  `docs/ARCHITECTURE.md` §9).
- Bản dịch ngôn ngữ khác ngoài tiếng Việt.

## 5. User stories

### 5.1. Người chơi

- **US-P01:** Là người chơi, tôi muốn nhập tên và vào chơi ngay không cần
  đăng ký, để không mất thời gian trước khi chơi. *(Đã có trong demo)*
- **US-P02:** Là người chơi, tôi muốn biết rõ khi nào được chạy và khi nào
  phải đứng yên, để không bị loại oan. *(Đã có: HUD trạng thái trống/chiêng)*
- **US-P03:** Là người chơi, tôi muốn nhịp trống/chiêng không đoán trước được,
  để không ai học thuộc mẹo. *(Đã có: nhịp random mỗi trận)*
- **US-P04:** Là người chơi, tôi muốn biết mình còn bao xa tới đích và còn
  bao nhiêu người sống, để căn sức chạy. *(Đã có: HUD tiến độ + số người sống)*
- **US-P05:** Là người chơi, tôi muốn chat với người trong phòng trong lúc
  chơi, và thấy tin nhắn hiện trên đầu người gửi, để trận vui hơn.
  *(Đã có trong demo)*
- **US-P06:** Là người chơi, tôi muốn sau khi bị loại vẫn ở lại xem hoặc đi
  chơi chỗ khác trong game, thay vì bị văng ra ngoài. *(Đã có: khán giả + du lịch)*
- **US-P07 (dự kiến):** Là người chơi, tôi muốn chơi một trận đầy đủ cho tới khi còn 1 người thắng
  với nhiều thử thách khác nhau, để mỗi trận đều mới. *(Chưa có)*

### 5.2. Chủ phòng (host)

- **US-H01:** Là chủ phòng, tôi muốn tạo phòng và gửi mã phòng cho bạn,
  để bạn vào chung trận. *(Đã có)*
- **US-H02:** Là chủ phòng, tôi muốn bắt đầu trận khi đủ người, và phòng tự
  bắt đầu khi đủ 20 người nếu tôi quên bấm. *(Đã có)*
- **US-H03:** Là chủ phòng, tôi muốn nếu tôi rời phòng giữa chừng thì có
  người khác làm chủ phòng thay, để trận không bị kẹt. *(Đã có: chuyển host)*

### 5.3. Khán giả

- **US-S01:** Là khán giả, tôi muốn đổi góc xem (toàn cảnh, theo dõi, sát vai,
  tự do) và chuyển người đang xem, để theo dõi trận theo ý mình. *(Đã có)*
- **US-S02:** Là khán giả, tôi muốn biết ai đang dẫn đầu và ai vừa bị loại,
  để theo dõi trận. *(Đã có một phần: bảng xếp hạng chỉ hiện khi có người về
  đích vòng 2; chưa có bảng trực tiếp trong lúc xem — dự kiến cải thiện)*

### 5.4. Khách du lịch trong game (người bị loại đi du lịch)

- **US-T01:** Là người bị loại, tôi muốn bấm vào một đảo xa và bay tới xem
  chi tiết đảo đó, thay vì chỉ nhìn silhouette mờ. *(Đã có)*
- **US-T02:** Là người bị loại, tôi muốn mỗi đảo có một câu chuyện riêng để
  đọc, và biết đâu là truyền thuyết, đâu là chuyện thật, đâu là chuyện
  trong game. *(Đã có: nhãn từng đảo)*
- **US-T03:** Là người bị loại, tôi muốn quay lại xem trận bất cứ lúc nào,
  để không bỏ lỡ đoạn hay. *(Đã có: nút Quay lại trận)*

## 6. Yêu cầu chức năng (FR)

Trạng thái: **Đã có** = có trong code demo hiện tại; **Một phần** = có một
phần, còn thiếu mục liệt kê; **Dự kiến** = chưa làm.

| ID | Yêu cầu | Tiêu chí chấp nhận | Trạng thái |
|---|---|---|---|
| FR-01 | Tạo phòng bằng mã 6 ký tự | Tạo được phòng, mã duy nhất, người tạo là host | Đã có |
| FR-02 | Xem danh sách phòng đang mở | Liệt kê phòng ở lobby kèm số người và giai đoạn | Đã có |
| FR-03 | Vào phòng bằng mã | Nhập mã đúng thì vào phòng; sai mã báo lỗi rõ | Đã có |
| FR-04 | Chủ phòng bắt đầu trận | Chỉ host bắt đầu được; cần ≥ 2 người; dưới 2 người báo lỗi | Đã có |
| FR-05 | Phòng tự bắt đầu khi đủ 20 người | Đủ 20 người thì tự đếm ngược, không cần host bấm | Đã có |
| FR-06 | Vào giữa trận làm khán giả | Người vào sau khi trận bắt đầu chỉ xem, không chơi | Đã có |
| FR-07 | Chuyển host khi host rời phòng | Host mới là người còn lại đầu tiên; trận không kẹt | Đã có |
| FR-08 | Vòng 1: trống chạy, chiêng đứng yên | HUD hiển thị đúng trạng thái; nhịp random mỗi trận, không lặp pattern cố định | Đã có |
| FR-09 | Loại người di chuyển lúc chiêng | Di chuyển hoặc nhảy lúc chiêng → bị loại ngay, chuyển khán giả; người đứng yên không bị loại | Đã có |
| FR-10 | Về đích vòng 1 | Tới vạch đích thì qua vòng, ghi thời gian về đích | Đã có |
| FR-11 | Giới hạn thời gian vòng 1 (120 giây) | Vòng 1 tự kết thúc khi hết 120 giây dù còn người đứng yên (quy tắc kết thúc rõ) | Đã có (server tick endRound timeout; QC có thể lật lại con số 120 giây sau play-test) |
| FR-12 | CHIA TEAM cân bằng, tối đa 3 team | Người sống sót chia đều theo thứ tự về đích; màu áo/vòng theo team | Đã có |
| FR-13 | Mỗi team một cầu riêng, ván yếu riêng | Ván yếu random riêng từng cầu, từng trận | Đã có |
| FR-14 | Chỉ leader được bước cầu | Người chưa tới lượt bị server chặn và báo "Chưa tới lượt" | Đã có |
| FR-15 | Ván yếu vỡ → loại cá nhân | Bước ván yếu thì ván vỡ, người đó bị loại, leader chuyển cho người tiếp theo | Đã có |
| FR-16 | Nhảy qua khoảng trống do ván vỡ | Ván đã vỡ chỉ đi tiếp được bằng nhảy (Space / jumpGap) | Đã có |
| FR-17 | Xếp hạng cá nhân theo thời gian về đích vòng 2 | Bảng xếp hạng cập nhật dần, không có xếp hạng team | Đã có |
| FR-18 | Chơi lại từ đầu | Sau khi trận kết thúc, phòng về lobby và chơi lại được | Đã có |
| FR-19 | Khán giả 4 góc nhìn + chuyển người | Đổi góc mượt, chuyển người trước/sau được, hiển thị tên người đang xem | Đã có |
| FR-20 | Du lịch Hạ Long 7 đảo chi tiết | Mỗi đảo có hình dáng, cây, chim thú, câu chuyện riêng có nhãn | Đã có |
| FR-21 | Click/zoom đảo xa ra chi tiết | Bấm đảo trong 3D, chấm minimap hoặc danh sách → bay tới, đảo hiện chi tiết; chỉ đảo đang xem dựng chi tiết | Đã có |
| FR-22 | Chat bong bóng + panel | Tin hiện bong bóng trên đầu ~5 giây theo nhân vật và trong panel kèm tên/màu team/giờ | Đã có |
| FR-23 | Giới hạn chat | Tối đa 120 ký tự, chống spam 2 giây/tin, câu chat nhanh, ẩn bong bóng/panel được | Đã có |
| FR-24 | Bot chơi đơn ghi rõ là bot | Bot luôn có nhãn `· BOT`, không giả làm người thật | Đã có |
| FR-25 | Minimap đảo + HUD đầy đủ | Minimap vẽ đúng đảo, đường chạy, đích, chấm người chơi; HUD có vòng, trống/chiêng, thời gian, số người sống, tiến độ | Đã có |
| FR-26 | Điều khiển mobile | Joystick ảo + nút NHẢY dùng được, không tràn màn hình | Đã có (chưa play-test kỹ trên máy thật) |
| FR-27 | Phòng 456 người, tự bắt đầu khi đủ 456 | Đủ 456 người thì tự bắt đầu; quá 456 thì tách trận mới | Dự kiến |
| FR-28 | Chia nhỏ vòng 1 thành sân con ~57 người rồi gộp | Vòng 1 chia sân con, mỗi sân lấy top N, gộp lại chơi vòng sau | Dự kiến |
| FR-29 | Trận đầy đủ (số vòng không giới hạn, OD-11), kho 18–20 trò | Vòng 1–2 cố định; từ vòng 3 bốc theo chu kỳ kho 5 trò, không lặp trong chu kỳ; chung kết Rồng Rắn chỉ khi ≤ 6 người sống lúc bắt đầu vòng; mỗi vòng loại ít nhất 1 người | Đã làm (PR #3, nhánh feat/reverse-team-order) |
| FR-30 | Tài khoản / đăng nhập | Người chơi có hồ sơ, lịch sử trận | Dự kiến |
| FR-31 | Bảng xếp hạng lưu lâu dài | Xếp hạng theo mùa/tuần, xem lại được sau khi tắt game | Dự kiến |
| FR-32 | Kiểm duyệt chat (tố cáo, mute, lọc) | Người chơi tố cáo được, host/mod mute được, từ xấu bị lọc | Dự kiến |
| FR-33 | Voice chat | Nói chuyện bằng giọng nói trong phòng | Dự kiến (chưa quyết có làm không) |
| FR-34 | Ví Hội Xu | Mỗi người chơi có ví Hội Xu; số dư hiện ở HUD (#wallet-hud); xu kiếm được cộng ngay sau sự kiện trận đấu | Đã làm (bản stub) — `server/economy.js` (kiếm xu +10/vòng, +50/thắng, +20/nhiệm vụ ngày, +5/cheer) + `client/js/shop.js` (`window.HoiWallet.set`); HUD #wallet-hud và nối WebSocket do workstream client/server sở hữu, chưa xong |
| FR-35 | Shop đồ trang trí | Shop có ~16 món cosmetic mua bằng xu (áo bà ba 3 màu, nón lá, cờ team, bong bóng chat, emote, đồ trang trí đảo); mua xong vào inventory | Đã làm (bản stub) — catalogue trong `economy.js` + giao diện trong `shop.js` (#shop-panel); container #shop-panel do workstream client sở hữu, chưa xong |
| FR-36 | Kiểm tra sở hữu khi trang bị/dùng | Server từ chối trang bị/dùng món chưa sở hữu, dù client khai đã có | Đã làm (bản stub) — `economy.js` `equipItem`/`useEmote` kiểm tra inventory mỗi lần |
| FR-37 | Hội Làng Pass (free + paid) | XP 100/vòng sống sót, 500/thắng trận; cấp 1–20; mỗi cấp có thưởng track miễn phí và track trả phí (toàn cosmetic) | Đã làm (bản stub) — `economy.js` (XP, cấp, thưởng) + `shop.js` (#pass-panel); mua Pass trả phí là stub demo, xem FR-41 |
| FR-38 | Chủ Hội — tạo giải đấu riêng | Tạo phòng giải đấu có tên thương hiệu; giải thưởng trả bằng Hội Xu từ ví chủ hội; người thắng nhận toàn bộ giải bằng xu | Đã làm (bản stub) — `economy.js` `createTournament`/`awardTournamentWinner` + `shop.js` (#tournament-panel); container do workstream client sở hữu, chưa xong |
| FR-39 | Cổ vũ & tặng sticker | Khán giả cổ vũ miễn phí (người nhận +5 xu, giới hạn 1 lần/60 giây/cặp) hoặc tặng sticker trả xu (10/20/30 xu, người nhận +5 xu) | Đã làm (bản stub) — `economy.js` `cheer`/`giftSticker` + `shop.js` (#gift-panel); container do workstream client sở hữu, chưa xong |
| FR-40 | Vé Du Lịch Hạ Long | Vé tour cao cấp cho người bị loại: thêm câu chuyện đảo, tuyến tour cao cấp, huy hiệu lưu niệm; mua bằng 500 xu hoặc stub tiền thật; không ảnh hưởng kết quả trận | Đã làm (bản stub) — `economy.js` `buyTourPass` + nút trong `shop.js` (#gift-panel) |
| FR-41 | Stub checkout tiền thật | Mọi mua bằng tiền thật (Pass trả phí, Vé Du Lịch) trả về `{ok:true, stub:true}` + thông báo demo, không gọi cổng thanh toán; nút ghi rõ "(Demo — chưa thanh toán thật)" | Đã làm (bản stub) — `economy.js` `buyPass`/`buyTourPass(pay:'stub')` + nhãn stub trong `shop.js` và docs |
| FR-42 | Nhiệm vụ ngày | 3 nhiệm vụ/ngày, mỗi nhiệm vụ +20 xu: chơi 1 trận, sống sót 2 vòng, gửi 5 chat; mỗi nhiệm vụ nhận 1 lần/ngày | Đã làm (bản stub) — `economy.js` (tiến độ + nhận thưởng); tiến độ chỉ tăng khi server.js gọi các hook `recordMatchPlayed`/`awardRoundSurvived`/`recordChatSent` — workstream server chưa nối hook, nên tiến độ hiện chưa tăng trong game thật |
| FR-43 | Lưu trữ kinh tế | Hồ sơ (ví, inventory, pass, tour) lưu bền vững qua restart server | Đã làm (bản stub) — JSON `data/economy.json` (RAM + ghi file mỗi lần đổi); chưa phải database production (xem ARCHITECTURE §7.5) |
| FR-44 | Kiểm duyệt tên shop / giải đấu | Tên giải đấu/thương hiệu bị từ chối khi trống, quá 40 ký tự hoặc chứa từ cấm | Đã làm (bản stub) — `economy.js` `validateTournamentText` |
| FR-45 | Không pay-to-win / không cá cược / không loot box | Không món nào mua bằng tiền/xu cho chỉ số hay lợi thế trận đấu; không đặt tiền vào kết quả trận; không hộp quà ngẫu nhiên trả phí | Đã làm (bản stub) — catalogue toàn cosmetic; giải thưởng chỉ bằng xu, không đổi ra tiền mặt; xem §10 |
| FR-46 | Chế độ QC — nhảy thẳng tới vòng bất kỳ để test | Nút CHẾ ĐỘ QC trên thẻ bắt đầu + `?qc=1` mở panel chọn vòng 1–8 (nhảy được qua vòng 6); chơi đơn vào thẳng vòng với số người sống theo đường loại co giãn từ 61 người, tính bằng cùng tỉ lệ chu kỳ (V1: 61 · V2: 37 · V3: 20 · V4: 9 · V5: 3 · V6: 2, tối thiểu 2 người để test được cờ và các vòng sau vòng 6 vẫn có bot); multiplayer: host tạo phòng QC, cả phòng cùng bắt đầu ở vòng đã chọn, tên vòng 3–5 đã bốc hiện sau khi tạo phòng, phòng hiện dấu [QC]; nhảy Vòng 2 qua CHIA TEAM, thứ tự lượt xáo theo seed (không có thời gian về đích V1), đồng hồ lượt 30 giây vẫn áp dụng; thanh QC trong lúc chơi cho nhảy vòng / sang vòng sau (không dừng ở vòng 6) / chơi lại vòng này (multi chỉ host); tuỳ chọn "Không loại (chỉ test giao diện)" tắt mặc định; trận QC không thưởng Hội Xu / XP Pass, không tính BXH, economy bị chặn trong phòng QC; người chơi vẫn bị loại bình thường trong vòng đã chọn | Đã làm — `client/index.html` (#qcSection, #qcBar) + `client/js/game.js` (qcJumpSingle/qcSetupSingle/qcSkipTo, qcAliveForRound) + `server/server.js` (phòng qc/qcStartRound/qcNoElim, qcJumpToRound, qcSkip, chặn hook kinh tế) — PR #3, nhánh feat/reverse-team-order |

## 7. Yêu cầu phi chức năng (NFR)

| ID | Yêu cầu | Mục tiêu (đề xuất / ước tính, chưa đo) | Trạng thái |
|---|---|---|---|
| NFR-01 | Hiệu năng render | ≥ 30 FPS trên điện thoại tầm trung ở chế độ chơi; đảo xa dùng instancing khi mở rộng | Một phần (chưa đo FPS thực tế) |
| NFR-02 | Thời gian tải trang đầu | ≤ ~5 giây trên mạng 4G (ước tính) | Chưa đo |
| NFR-03 | Quy mô phòng | Demo: 20 người/phòng. Mục tiêu: 456 người/phòng | Demo đạt 20; 456 là dự kiến |
| NFR-04 | Độ trễ điều khiển | Nhấn phím → nhân vật phản hồi dưới ~100 ms trên mạng thường (ước tính) | Chưa đo |
| NFR-05 | Tương thích trình duyệt | Chạy trên Chrome, Safari, Firefox, Edge bản mới, cả desktop và mobile | Một phần (chưa test đủ trình duyệt) |
| NFR-06 | Phụ thuộc mạng | Cần Internet vì Three.js qua CDN; chơi đơn vẫn cần tải trang lần đầu | Đã biết; dự kiến self-host Three.js ở Phase 3 |
| NFR-07 | Bảo mật / chống gian lận | Server quyết mọi kết quả; client không tự quyết loại/xếp hạng; kiểm tra tốc độ di chuyển | Một phần (server chưa kiểm tra tốc độ di chuyển — xem ARCHITECTURE §4) |
| NFR-08 | An toàn chat | Giới hạn ký tự + spam; ẩn chat; bot ghi rõ là bot | Đã có (cơ bản); kiểm duyệt đầy đủ là dự kiến |
| NFR-09 | Đọc được tiếng Việt | Chữ tiếng Việt có dấu đọc rõ trên mọi panel, nút, HUD, bong bóng chat; không dùng font pixel làm mất dấu | Đã có |
| NFR-10 | Tuân thủ bản quyền | Không có tài sản/tên Squid Game hay Minecraft; thông tin thật gắn nhãn nguồn | Đã có (cần rà lại mỗi khi thêm nội dung mới) |
| NFR-11 | Khả dụng (accessibility) | Nút đủ lớn trên mobile, tương phản chữ/nền đủ đọc, không chỉ dùng màu để truyền luật (có chữ kèm theo) | Một phần |
| NFR-12 | Ổn định | Trận không kẹt do lỗi server; rớt mạng có cơ chế quay lại (dự kiến) | Một phần (chưa có reconnect) |

## 8. Tầm nhìn đầy đủ: kho thử thách và đường loại (chưa triển khai)

> **Mục này là tầm nhìn gốc, KHÔNG phải mô tả bản demo.**
> Bản demo hiện tại chỉ có 2 trò: Trống Hội và Cầu Khỉ Sương Mù.
> Mọi trò khác dưới đây đều là **dự kiến**, chưa có code.

### 8.1. Kho thử thách dự kiến (18–20 trò; mỗi trận bốc theo chu kỳ, số vòng không giới hạn)

Nguyên tắc thiết kế kho trò, theo tầm nhìn gốc:

- Mọi trò đều là trò dân gian Việt Nam hoặc biến thể dân gian, không sao
  chép trò của phim/game thương mại.
- Không có đáp án cố định để học thuộc: mỗi trận random nhịp, vị trí, biến
  thể; nhiều trò có biến thể riêng theo từng người chơi.
- Trò thiên về kỹ năng (quan sát, nhịp, phối hợp, phản xạ) hơn là may rủi
  thuần túy; yếu tố may rủi chỉ làm gia vị, không quyết định toàn bộ.

| # | Trò (dự kiến) | Ý tưởng luật (dự kiến, cần thiết kế chi tiết ở Phase 1) | Vòng gợi ý |
|---|---|---|---|
| 1 | **Trống Hội** | Trống chạy, chiêng đứng yên; nhịp random. | 1 — đã có |
| 2 | **Cầu Khỉ Sương Mù** | Cầu 9 bước, mỗi bước 2 ván, ván yếu random; đi theo lượt từng team. | 2 — đã có |
| 3 | **Kéo Co Nhịp** | Hai đội kéo co theo nhịp trống: bấm đúng nhịp thì kéo mạnh, lệch nhịp thì mất lực; đội thua bị loại theo luật **ĐÃ QUYẾT (OD-02, 2026-11-05)**: trận đủ người (≥ 24 người lúc bắt đầu vòng 3) thì cả đội thua bị loại; phòng nhỏ (< 24 người) thì chỉ 2 người đóng góp yếu nhất của đội thua bị loại (đội thua chỉ còn ≤ 2 người thì loại hết). | 3 (dự kiến) |
| 4 | **Nặn Tò He** | Vẽ/nặn theo mẫu hiện ra trong thời gian giới hạn; chấm theo độ giống mẫu (mẫu random mỗi trận, không học thuộc được). | 3–4 (dự kiến) |
| 5 | **Bịt Mắt Bắt Dê** | Một người bịt mắt (góc nhìn hạn chế) đi bắt "dê" di chuyển; người còn lại né tránh trong khu vực giới hạn. | 4 (dự kiến) |
| 6 | **Rồng Rắn Cướp Cờ** | Chung kết: hai đội rồng rắn tranh cờ ở giữa sân; cướp được cờ và mang về đích thì thắng. Chỉ là chung kết khi ≤ 6 người sống lúc bắt đầu vòng (OD-11) — không cố định ở vòng 6. | Chung kết (khi ≤ 6 người sống) |
| 7–20 | Kho mở rộng (dự kiến, chưa chốt tên) | Cần Sudo chốt danh sách: các trò dân gian khác có thể đưa vào kho để đủ 18–20 trò (ví dụ: ô ăn quan, nhảy bao bố, đi cà kheo, chọi gà... — chỉ là gợi ý, chưa quyết). Mỗi trò cần thiết kế luật chống học thuộc riêng. | Xoay vòng |

**Cơ chế chọn trò mỗi trận — ĐÃ QUYẾT, OD-11 (Sudo 2026-11-06, số vòng
không giới hạn):** vòng 1 Trống Hội và vòng 2 Cầu Khỉ cố định. Từ vòng 3,
mỗi vòng bốc 1 trò từ kho 5 trò (Kéo Co, Tò He, Bịt Mắt, Ô Ăn Quan, Nhảy
Bao Bố) theo chu kỳ có seed: không lặp trong một chu kỳ, hết kho thì xáo
lại chu kỳ mới, không lặp liền kề qua biên chu kỳ. Rồng Rắn Cướp Cờ không
còn cố định ở vòng 6: nó chỉ là vòng chung kết khi lúc bắt đầu vòng chỉ
còn ≤ 6 người sống; nếu một vòng kết thúc với đúng 1 người sống thì trận
kết thúc ngay, không cần chung kết. Biến thể (nhịp, vị trí, mẫu) random
theo seed của phòng–vòng. Mục tiêu: hai trận liên tiếp không giống nhau
hoàn toàn, và số vòng phụ thuộc vào số người còn lại.

### 8.2. Đường loại (456 → 1) — tỉ lệ giữ lại theo chu kỳ, số vòng không giới hạn

Đường loại dưới đây là **mục tiêu giữ lại theo tỉ lệ**, không phải cam kết
cứng từng vòng. Tỉ lệ giữ lại áp theo chu kỳ (0.614, 0.536, 0.467, 0.343,
0.25, 0.167) cho tới khi còn 1 người. Phòng 456 người chơi đúng mục tiêu
thì đi theo sơ đồ dưới (6 vòng); phòng nhỏ đi ít vòng hơn; và một trận có
thể dài hơn nếu người chơi đều chơi tốt (Kéo Co / Bịt Mắt loại theo luật
riêng, có thể ít hơn mục tiêu) — xem OD-11.

```
456 người vào trận
  │ Vòng 1 — Trống Hội (chia sân con ~57 người, lấy top mỗi sân)
  ▼
~280 người còn lại
  │ Vòng 2 — Cầu Khỉ Sương Mù (chia team, đi theo lượt)
  ▼
~150 người còn lại
  │ Vòng 3 — (trò kho, dự kiến: Kéo Co Nhịp)
  ▼
~70 người còn lại
  │ Vòng 4 — (trò kho, dự kiến: Nặn Tò He)
  ▼
~24 người còn lại
  │ Vòng 5 — (trò kho, dự kiến: Bịt Mắt Bắt Dê)
  ▼
~6 người còn lại
  │ Vòng 6 — Rồng Rắn Cướp Cờ (chung kết)
  ▼
1 người thắng
```

- Tổng thời gian mục tiêu: ~25–35 phút/trận cho phòng đủ người (ước tính,
  chưa đo); trận dài hơn nếu người chơi đều chơi tốt và các vòng loại ít người.
- Người bị loại ở bất kỳ vòng nào cũng chuyển sang khán giả hoặc du lịch,
  không bị văng khỏi trận.
- Khi chưa đủ 456 người (phòng nhỏ), đường loại co giãn theo số người thực
  tế (mục tiêu tính từ số người lúc bắt đầu trận, `games.scaledTargets`).
- **Bảo đảm kết thúc:** mỗi vòng còn > 1 người đều loại ít nhất 1 người
  (cắt ép tối thiểu theo xếp hạng/điểm của trò đó — `server.js`
  `ensureAtLeastOneElimination`; các trò xếp hạng Trống Hội / Cầu Khỉ /
  Tò He / Ô Ăn Quan / Nhảy Bao Bố cắt về đúng mục tiêu tỉ lệ). Giới hạn
  xấu nhất: N−1 vòng từ N người (mỗi vòng chỉ loại đúng 1); thường 6–8
  vòng với phòng đủ người vì hầu hết các vòng cắt về đúng mục tiêu.

## 9. Giả định, phụ thuộc, rủi ro và quyết định mở

### 9.1. Giả định

- A-01: Người chơi dùng trình duyệt hiện đại, có Internet (vì Three.js qua CDN).
- A-02: Sudo là người quyết cuối về luật chơi, danh sách trò và mô hình
  kinh doanh (nếu có).
- A-03: Giai đoạn đầu không cần tài khoản; người chơi chấp nhận vào bằng tên
  tự chọn và mã phòng.
- A-04: Nội dung du lịch Hạ Long dùng tên và câu chuyện đã gắn nhãn nguồn;
  không cần xin phép thêm vì là thông tin chung và chuyện dân gian/hư cấu
  trong game.
- A-05: Đội dev (nếu có) làm việc trên repo `trong-hoi-cau-khi/`, theo task
  trong `docs/PLAN.md`.

### 9.2. Phụ thuộc

- D-01: CDN cdnjs cho Three.js 0.158.0 — nếu CDN lỗi, game không chạy.
- D-02: Node.js ≥ 18 và thư viện `ws` — server chỉ chạy được khi có môi
  trường Node.js.
- D-03: Quyết định của Sudo về danh sách trò, mô hình giải thưởng/kinh doanh
  và ngân sách hosting — các phase sau phụ thuộc vào các quyết định này.
- D-04: Play-test thật của Sudo và người chơi thật — nhiều mục trong
  `docs/PLAN.md` không thể coi là xong nếu chưa play-test.

### 9.3. Rủi ro chính

| Rủi ro | Ảnh hưởng nếu xảy ra | Giảm thiểu |
|---|---|---|
| Phòng 456 người lag / server quá tải | Trận không chơi được ở quy mô mục tiêu | Làm theo lộ trình Phase 2 (AOI, tick, load test) thay vì nhảy thẳng lên 456 |
| Gian lận vị trí (client gửi vị trí giả) | Người chơi gian lận thắng, mất công bằng | Server tính vị trí từ input + giới hạn tốc độ (Phase 3) |
| Chat bị lạm dụng khi mở public | Ảnh hưởng người chơi, rủi ro uy tín | Tố cáo/mute/lọc + dashboard kiểm duyệt trước khi mở rộng (Phase 3) |
| Nhầm lẫn bản quyền (vô tình dùng yếu tố Squid Game/Minecraft) | Rủi ro pháp lý và uy tín | Rà lại nội dung mỗi lần thêm trò/đảo mới; giữ checklist bản quyền |
| Thông tin đảo/lịch sử sai | Người chơi hiểu sai về Hạ Long | Gắn nhãn nguồn; chỉ dùng thông tin đã kiểm chứng cho nhãn "chuyện lịch sử thật" |
| Trận kẹt (vòng 1 không kết thúc) | Người chơi phải tải lại, bỏ trận | Thêm giới hạn thời gian vòng 1 ở Phase 1 (FR-11) |
| CDN Three.js lỗi | Game không tải được | Self-host Three.js ở Phase 3 |

### 9.4. Quyết định mở — cần Sudo quyết

| # | Quyết định | Vì sao cần | Chặn phase nào |
|---|---|---|---|
| OD-01 | Chốt danh sách 18–20 trò trong kho và 6 trò mỗi trận chọn như thế nào | Phase 1 không thiết kế được trò mới nếu chưa có danh sách | Phase 1 |
| OD-02 | Luật loại ở trò đồng đội (ví dụ Kéo Co): loại cả đội hay chỉ người yếu nhất? | **ĐÃ QUYẾT 2026-11-05:** trận đủ người (≥ 24 người lúc bắt đầu vòng 3) thì đội thua bị loại toàn bộ; phòng nhỏ (< 24 người) thì chỉ 2 người đóng góp yếu nhất của đội thua bị loại (đội thua chỉ còn ≤ 2 người thì loại hết). Giới hạn vòng 1 chốt 120 giây (FR-11; QC có thể lật lại con số sau play-test). | Phase 1 |
| OD-03 | Có giải thưởng / tiền / mô hình kinh doanh không? Nếu có thì hình thức nào? | **ĐÃ QUYẾT 2026-11-05:** kinh tế chỉ bán đồ trang trí (cosmetic-only) bằng Hội Xu; lõi trận miễn phí; tiền thật chỉ là stub demo (chưa bật thanh toán thật). Chi tiết §10; triển khai stub FR-34..FR-45. | Phase 1 (thiết kế) và Phase 3 (triển khai) |
| OD-04 | Ngân sách hosting và mức chịu tải mục tiêu (bao nhiêu phòng song song?) | Quyết định kiến trúc production (một server hay nhiều server) | Phase 2–3 |
| OD-05 | Chính sách kiểm duyệt chat: mức độ lọc, ai mute, xử lý tố cáo trong bao lâu? | Cần trước khi mở public | Phase 3 |
| OD-06 | Có làm voice chat không? | Voice chat tốn nhiều công sức và rủi ro kiểm duyệt | Phase 4 (hoặc không làm) |
| OD-07 | Mục tiêu người chơi đồng thời đầu tiên sau khi ra mắt (ví dụ 50 / 200 / 456)? | Quyết định mức độ đầu tư vào scale ở Phase 2 | Phase 2 |
| OD-08 | Có làm tài khoản / đăng nhập không, hay giữ chơi bằng tên tự chọn? | Ảnh hưởng bảng xếp hạng, lịch sử, chống gian lận | Phase 1–3 |
| OD-09 | Đếm ngược lượt qua cầu vòng 2 là bao lâu? | **ĐÃ QUYẾT (tạm) 2026-11-05 — Muse chọn theo chỉ đạo "thấy phương án nào hợp lý thì triển khai", QC có thể lật:** 30 giây/lượt — một người qua hết 9 bước cầu. Lý do: 9 bước × ~3 giây suy nghĩ mỗi bước, đủ để nghĩ nhưng không đủ để đứng chờ cho cầu lộ hết ván rồi mới đi; lượt không bắt đầu và lượt đi quá chậm là một (đồng hồ chạy từ lúc lượt bắt đầu, hết giờ thì bị loại, lượt chuyển người tiếp theo). Áp cả 2 chế độ: server ép ở multi (server/server.js, tick kiểm tra turnStartedAt), client ép ở chơi đơn (game.js r2Turn; bot cũng chịu cùng luật, tốc độ bot qua cầu đã tăng lên 2.4–3.7 để qua hết trong ~10–15 giây). Mọi vòng đều hiện đếm ngược trên HUD (ô ĐẾM NGƯỢC cạnh ô VÒNG, đỏ khi ≤ 10 giây); vòng 2 hiện đếm ngược theo lượt, các vòng còn lại hiện đếm ngược cả vòng (vòng 1: 120 giây; vòng 2 cả vòng multi: 180 giây; các vòng sau theo games.js ROUND_TIME_LIMITS). Panel team vòng 2 thu gọn thành dải 2 dòng ở mép trên (không che giữa màn hình, không chặn bấm ván) sau khi Sudo báo banner "qua cầu 0/0" chắn màn hình. | Phase 1 (đã triển khai ở PR #3, nhánh feat/reverse-team-order) |
| OD-10 | Chế độ QC nhảy vòng: số người sống khi vào thẳng vòng sau là bao nhiêu, và nhảy Vòng 2 thì thứ tự lượt tính sao? | **ĐÃ QUYẾT 2026-11-05 — theo yêu cầu của Sudo ("cần chế độ cho admin để QC test, chọn vòng để chơi luôn, không thì test rất lâu"):** chơi đơn vào thẳng vòng với số người sống theo đường loại co giãn từ 61 người (V1: 61 · V2: 37 · V3: 20 · V4: 9 · V5: 3 · V6: 2 — tối thiểu 2 người để còn test được cờ, thay vì 1 theo đường cong); nhảy Vòng 2 qua CHIA TEAM như thường nhưng thứ tự lượt xáo trộn theo seed của trận vì không có thời gian về đích Vòng 1 (ghi rõ trên màn team). Trận QC không thưởng Hội Xu / XP Pass, không tính BXH; tuỳ chọn "Không loại" tắt mặc định, chỉ để test giao diện. **Cập nhật OD-11 (2026-11-06):** số người sống tính bằng cùng tỉ lệ chu kỳ cho mọi vòng (không hardcode bảng 6 vòng), panel QC có nút tới V8 và "VÒNG SAU" nhảy được qua vòng 6. | Phase 1 (đã triển khai ở PR #3, nhánh feat/reverse-team-order) |
| OD-11 | Số vòng chơi có giới hạn ở 6 không? | **ĐÃ QUYẾT 2026-11-06 — theo yêu cầu của Sudo ("không giới hạn số vòng chơi, số vòng phụ thuộc vào số người còn lại; ví dụ mọi người đều chơi tốt thì 6 vòng không thể loại hết chỉ còn 1 được"):** KHÔNG giới hạn số vòng. Trận chỉ kết thúc khi còn 1 người thắng. Vòng 1–2 cố định; từ vòng 3 bốc theo chu kỳ kho 5 trò (không lặp trong chu kỳ, hết kho xáo lại chu kỳ mới, không lặp liền kề qua biên); Rồng Rắn là chung kết chỉ khi ≤ 6 người sống lúc bắt đầu vòng; một vòng kết thúc với đúng 1 người sống thì trận kết thúc ngay. Mỗi vòng loại ít nhất 1 người (cắt ép tối thiểu theo xếp hạng/điểm của trò; các trò xếp hạng cắt về đúng mục tiêu tỉ lệ chu kỳ 0.614, 0.536, 0.467, 0.343, 0.25, 0.167). HUD hiện "VÒNG x" không có "/6" và hiện mục tiêu giữ lại của vòng. Thường 6–8 vòng với phòng đủ người; giới hạn xấu nhất N−1 vòng từ N người. QC: nhảy được qua vòng 6, số người sống tính bằng cùng tỉ lệ chu kỳ. | Phase 1 (đã triển khai ở PR #3, nhánh feat/reverse-team-order) |

## 10. Kinh tế trong game (MONETIZATION) — ĐÃ QUYẾT 2026-11-05

> Trạng thái: mô hình **đã quyết** (OD-03). Bản stub triển khai trong
> `server/economy.js` + `client/js/shop.js` (FR-34..FR-45). Tiền thật
> **chưa bật** — mọi checkout tiền thật chỉ là stub demo, không xử lý
> thanh toán thật. Mở thanh toán thật sau này cần quyết định mới của Sudo
> + cổng thanh toán + tài khoản/kiểm duyệt (xem §10.6).

### 10.1. Nguyên tắc

- **Lõi trận sinh tồn hoàn toàn miễn phí.** Vào phòng, chơi 2 vòng (mục
  tiêu, chat, khán giả, du lịch Hạ Long — không mất tiền, không
  cần tài khoản ở giai đoạn đầu.
- **Không pay-to-win:** không món nào mua bằng tiền hay xu cho chỉ số,
  tốc độ, sức mạnh, ván chắc, lượt đi thêm hay bất kỳ lợi thế nào trong
  trận đấu.
- **Không cá cược / không đặt tiền vào kết quả:** không ai được đặt tiền
  (thật hay xu) vào việc ai thắng/thua một trận.
- **Không loot box:** không bán hộp quà ngẫu nhiên trả phí; mọi món trong
  shop ghi rõ giá và nội dung trước khi mua.
- **Không bán chỉ số:** shop chỉ bán đồ trang trí (cosmetic).
- **Bản sắc dân gian Việt Nam:** áo bà ba, nón lá, khăn đóng, trống hội,
  hoa sen, đèn lồng, cây đa — không dùng tài sản/tên Squid Game hay
  Minecraft.

### 10.2. Hội Xu — tiền tệ trong game

| Kiếm xu | Mức |
|---|---|
| Sống sót 1 vòng | +10 xu |
| Thắng trận | +50 xu |
| Nhiệm vụ ngày (mỗi nhiệm vụ 1 lần/ngày) | +20 xu |
| Được người khác cổ vũ / tặng sticker | +5 xu |

Nhiệm vụ ngày (3 nhiệm vụ, xem FR-42): chơi 1 trận; sống sót 2 vòng;
gửi 5 tin chat. Xu chỉ tiêu trong game (shop, giải thưởng giải đấu, vé
tour). **Xu không đổi ra tiền mặt, không rút được.**

### 10.3. Shop đồ trang trí (cosmetic-only)

Catalogue trong `server/economy.js` (~16 món + 3 món chỉ nhận qua Pass):

- Skin áo bà ba Đỏ/Xanh/Vàng (150 xu) — **chỉ là biến thể màu, không
  khác chỉ số**.
- Nón lá (trắng 100 xu, hoa sen 200 xu), khăn đóng (180 xu).
- Cờ team: Trống Hội / Cầu Khỉ (120 xu), Hạ Long (200 xu).
- Bong bóng chat lá tre (80 xu), hoa sen (150 xu).
- Emote: vẫy tay (60 xu), đánh trống (100 xu), reo hò (100 xu).
- Trang trí đảo: đèn lồng đình (250 xu), cây đa đầu làng (300 xu).

Server kiểm tra sở hữu mỗi lần trang bị/dùng (FR-36): client khai đã có
món chưa mua thì bị từ chối.

### 10.4. Hội Làng Pass — track miễn phí + track trả phí

- XP: 100 XP/vòng sống sót, 500 XP khi thắng trận. Cấp 1–20 (500 XP/cấp).
- Mỗi cấp có thưởng track miễn phí và track trả phí (toàn đồ trang trí,
  xem `PASS_REWARDS` trong `economy.js`); lên cấp tự nhận thưởng track
  miễn phí, thưởng track trả phí chỉ nhận khi đã mở Pass trả phí.
- Mở Pass trả phí hiện là **STUB checkout**: `buyPass` trả về
  `{ok:true, stub:true, message:'Thanh toán thật chưa bật — đây là bản
  demo, Pass đã mở khóa thử.'}` và mở khóa thử trong demo. Nút mua trong
  giao diện ghi rõ "(Demo — chưa thanh toán thật)".

### 10.5. Chủ Hội (giải đấu riêng) + cổ vũ / tặng quà + Vé Du Lịch

- **Chủ Hội:** người chơi tạo giải đấu có tên thương hiệu (tên bị kiểm
  duyệt: trống/quá 40 ký tự/chứa từ cấm thì từ chối). Giải thưởng trả bằng
  Hội Xu từ ví của chủ hội; người thắng nhận toàn bộ giải bằng Hội Xu.
  Giải thưởng **không đổi ra tiền mặt**.
- **Cổ vũ / tặng quà (khán giả):** cổ vũ miễn phí, người nhận +5 xu
  (giới hạn 1 lần/60 giây cho mỗi cặp người cổ vũ–người nhận). Sticker
  trả xu (Hoa Sen 10 xu, Trống Hội 20 xu, Cá Chép Vàng 30 xu): người gửi
  trả tiền sticker, người nhận +5 xu.
- **Vé Du Lịch Hạ Long** (500 xu, hoặc stub tiền thật): mở thêm câu
  chuyện đảo, tuyến tour cao cấp và huy hiệu lưu niệm cho người bị loại
  đi du lịch. **Không ảnh hưởng kết quả trận đấu.**

### 10.6. Bảng dòng tiền (money flow) — tiền thật STUB so với Hội Xu

| Dòng | Dạng | Trạng thái hiện tại |
|---|---|---|
| Chơi trận, chat, khán giả, du lịch cơ bản | Miễn phí | Đã có trong demo |
| Kiếm Hội Xu (vòng, thắng, nhiệm vụ, cheer) | Xu (tiền trong game) | Đã làm (bản stub) — `economy.js` |
| Mua đồ trang trí bằng xu | Xu → cosmetic | Đã làm (bản stub) |
| Hội Làng Pass track miễn phí | XP chơi game → cosmetic | Đã làm (bản stub) |
| Hội Làng Pass track trả phí | **Tiền thật → STUB** | **Stub demo** — chưa có cổng thanh toán, chưa thu tiền thật |
| Vé Du Lịch Hạ Long bằng tiền thật | **Tiền thật → STUB** | **Stub demo** — như trên |
| Giải thưởng giải đấu Chủ Hội | Xu (ví chủ hội → ví người thắng) | Đã làm (bản stub); không đổi ra tiền mặt |
| Sticker tặng khán giả | Xu (ví người tặng → người nhận +5 xu) | Đã làm (bản stub) |
| Đổi xu ra tiền mặt / rút tiền | — | **Không có, không làm** |
| Đặt cược vào kết quả trận | — | **Cấm, không làm** |
| Loot box trả phí | — | **Cấm, không làm** |

Mở thanh toán thật sau này (chưa quyết) cần, theo thứ tự: (1) Sudo chốt
cổng thanh toán + giá tiền thật; (2) tài khoản/đăng nhập để gắn giao dịch
với người dùng; (3) lưu giao dịch bền vững (database, không phải JSON);
(4) đối soát/hoàn tiền và kiểm duyệt; (5) lật `ECONOMY_STUB=false` và gỡ
nhãn stub khỏi UI/docs. **Không được lật cờ stub khi chưa có 5 điều trên.**

### 10.7. Điều cấm (ràng buộc)

| Cấm | Vì sao |
|---|---|
| Pay-to-win (bán chỉ số/lợi thế trận) | Phá công bằng — luật chơi đã chốt |
| Cá cược / đặt tiền vào kết quả trận | Rủi ro pháp lý, phá trải nghiệm |
| Loot box (hộp quà ngẫu nhiên trả phí) | Người mua không biết mình nhận gì |
| Đổi Hội Xu ra tiền mặt | Biến game thành kênh tiền tệ |
| Thanh toán thật không ghi rõ là demo | Người chơi tưởng đã trả tiền thật |

---
*Tài liệu liên quan: [ARCHITECTURE.md](./ARCHITECTURE.md) (kiến trúc và đường
mở rộng kỹ thuật), [PLAN.md](./PLAN.md) (kế hoạch task theo phase),
[README.md](../README.md) (mô tả bản demo — README chỉ mô tả demo, tầm nhìn
đầy đủ nằm ở BRD và PLAN).*
