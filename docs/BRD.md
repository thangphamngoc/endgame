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
Hệ thống đo tối thiểu ở server đã có từ cycle 20 (P3-06 bước 1:
`GET /analytics` cho KPI-01/03/04/05) nhưng chưa có số thực tế nào vì
chưa có trận thật chạy qua — các tỉ lệ hiện là null cho tới khi có trận
đầu tiên kết thúc.

| # | Chỉ tiêu (đề xuất) | Mục tiêu đề xuất | Đo bằng gì (dự kiến) |
|---|---|---|---|
| KPI-01 | Tỉ lệ trận hoàn thành (trận tới được vòng 2 và có người thắng) | ≥ 80% số trận bắt đầu | Log trận — **đã có từ cycle 20 (P3-06 bước 1): `GET /analytics`, xem BRD §8.1** |
| KPI-02 | Thời gian lấp đầy phòng | Phòng 20 người đủ trong ≤ 5 phút (giờ cao điểm) | Log phòng — **đã có từ cycle 23 (P3-06 bước 2): `GET /analytics` cho `fill20Rate`/`fill20Within5MinRate`/`avgFill20Sec`/`under20StartRate`, xem BRD §8.1** |
| KPI-03 | Tỉ lệ người chơi dùng chat trong trận | ≥ 30% người chơi gửi ít nhất 1 tin/trận | Log chat (đếm tin, không lưu nội dung dài hạn) — **đã có từ cycle 20 (P3-06 bước 1)** |
| KPI-04 | Tỉ lệ người bị loại dùng du lịch | ≥ 40% người bị loại mở Du lịch Hạ Long ít nhất 1 lần | Log sự kiện du lịch — **đã có từ cycle 20 (P3-06 bước 1)** |
| KPI-05 | Tỉ lệ người chơi quay lại chơi trận tiếp theo trong cùng phiên | ≥ 50% bấm Chơi lại sau khi trận kết thúc | Log sự kiện replay — **đã có từ cycle 20 (P3-06 bước 1)** |
| KPI-06 | Hiệu năng | ≥ 30 FPS trên điện thoại tầm trung; tải trang đầu ≤ ~5 giây trên 4G (ước tính, cần đo) | Đo tự động ở client — **đã có từ cycle 26 (P3-06 bước 4): `GET /analytics` cho `avgFps`/`fpsAtLeast30Rate`/`avgLoadSec`/`loadWithin5sRate`/`noWebglRate`, xem BRD §8.1** |
| KPI-07 | Ổn định phòng | < 5% trận bị kẹt/không kết thúc (do lỗi, không do người chơi) | Log trận — **đã có từ cycle 24 (P3-06 bước 3): `GET /analytics` cho `matchesAbandoned`/`abandonRate`, xem BRD §8.1** |
| KPI-08 | An toàn chat | 0 vụ việc nội dung xấu không được xử lý sau khi có tố cáo (khi có tính năng tố cáo) | **Đã có bước 1 từ cycle 27 (P3-06 bước 5): gửi tố cáo từ chat + đếm qua `GET /analytics` (`reportsTotal`/`reportsPending`/`reportsByReason`/`reportsResolvedRate`), xem BRD §8.1** |

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
- Du lịch Hạ Long: 14 đảo chi tiết (Đảo Hội Làng, Hòn Trống Mái, Đảo Ti Tốp,
  Vịnh Tháp Đá, Đảo Yên Ngựa, Đảo Hang Vòm, Cầu Khỉ Sương Mù, Hòn Đỉnh Hương,
  Hòn Con Cóc, Đảo Soi Sim, Đảo Khỉ, Hòn Chó Đá, Hòn Cánh Buồm, Hòn Đầu Người — thêm cycle 34, P4-01
  bước 3/3, P4-01 HOÀN TẤT), mỗi đảo có cây, chim
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
  để theo dõi trận. *(Đã có: bảng trực tiếp `#leaderboard` trong banner khán
  giả, cập nhật theo sự kiện loại/về đích/hết vòng — cycle 8, 2026-11-06)*

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
| FR-32 | Kiểm duyệt chat (tố cáo, mute, lọc) | Người chơi tố cáo được, host/mod mute được, từ xấu bị lọc | Đã làm tố cáo + mute (cycle 27 bước 5 + cycle 31 bước 6, PR #3); còn lại: lọc từ xấu |
| FR-33 | Voice chat | Nói chuyện bằng giọng nói trong phòng | Dự kiến (chưa quyết có làm không) |
| FR-34 | Ví Hội Xu | Mỗi người chơi có ví Hội Xu; số dư hiện ở HUD (#wallet-hud); xu kiếm được cộng ngay sau sự kiện trận đấu | Đã làm (bản stub) — `server/economy.js` (kiếm xu +10/vòng, +50/thắng, +20/nhiệm vụ ngày, +5/cheer) + `client/js/shop.js` (`window.HoiWallet.set`); HUD #wallet-hud và nối WebSocket do workstream client/server sở hữu, chưa xong |
| FR-35 | Shop đồ trang trí | Shop có ~16 món cosmetic mua bằng xu (áo bà ba 3 màu, nón lá, cờ team, bong bóng chat, emote, đồ trang trí đảo); mua xong vào inventory | Đã làm (bản stub) — catalogue trong `economy.js` + giao diện trong `shop.js` (#shop-panel); container #shop-panel do workstream client sở hữu, chưa xong |
| FR-36 | Kiểm tra sở hữu khi trang bị/dùng | Server từ chối trang bị/dùng món chưa sở hữu, dù client khai đã có | Đã làm (bản stub) — `economy.js` `equipItem`/`useEmote` kiểm tra inventory mỗi lần |
| FR-37 | Hội Làng Pass (free + paid) | XP 100/vòng sống sót, 500/thắng trận; cấp 1–20; mỗi cấp có thưởng track miễn phí và track trả phí (toàn cosmetic) | Đã làm (bản stub) — `economy.js` (XP, cấp, thưởng) + `shop.js` (#pass-panel); mua Pass trả phí là stub demo, xem FR-41 |
| FR-38 | Chủ Hội — tạo giải đấu riêng | Tạo phòng giải đấu có tên thương hiệu; giải thưởng trả bằng Hội Xu từ ví chủ hội; người thắng nhận toàn bộ giải bằng xu | Đã làm (bản stub) — `economy.js` `createTournament`/`awardTournamentWinner` + `shop.js` (#tournament-panel); container do workstream client sở hữu, chưa xong |
| FR-39 | Cổ vũ & tặng sticker | Khán giả cổ vũ miễn phí (người nhận +5 xu, giới hạn 1 lần/60 giây/cặp) hoặc tặng sticker trả xu (10/20/30 xu, người nhận +5 xu) | Đã làm (bản stub) — `economy.js` `cheer`/`giftSticker` + `shop.js` (#gift-panel); container do workstream client sở hữu, chưa xong |
| FR-40 | Vé Du Lịch Hạ Long | Vé tour cao cấp cho người bị loại: thêm câu chuyện đảo, tuyến tour cao cấp, huy hiệu lưu niệm; mua bằng 500 xu hoặc stub tiền thật; không ảnh hưởng kết quả trận | Đã làm (bản stub) — `economy.js` `buyTourPass` + nút trong `shop.js` (#gift-panel) |
| FR-41 | Stub checkout tiền thật | Mọi mua bằng tiền thật (Pass trả phí, Vé Du Lịch) trả về `{ok:true, stub:true}` + thông báo demo, không gọi cổng thanh toán; nút ghi rõ "(Demo — chưa thanh toán thật)" | Đã làm (bản stub) — `economy.js` `buyPass`/`buyTourPass(pay:'stub')` + nhãn stub trong `shop.js` và docs |
| FR-42 | Nhiệm vụ ngày | 3 nhiệm vụ/ngày, mỗi nhiệm vụ +20 xu: chơi 1 trận, sống sót 2 vòng, gửi 5 chat; mỗi nhiệm vụ nhận 1 lần/ngày | Đã làm — `server/economy.js` (QUESTS + `claimDailyQuest` + action `quests`/`claimQuest`, hook `recordMatchPlayed`/`awardRoundSurvived`/`recordChatSent` đã nối ở `server.js`) + `client/js/shop.js` (mục "Nhiệm vụ ngày" trong panel Cửa hàng, hiện cả 2 chế độ — trước cycle 45 client chưa vẽ UI nên nhiệm vụ không xem/nhận được); chơi đơn: `client/js/local-economy.js` (cycle 45, 2026-11-08, backlog #19 bước 2 — tiến độ + nhận thưởng y hệt server, reset theo ngày UTC, trận QC không đếm) |
| FR-43 | Lưu trữ kinh tế | Hồ sơ (ví, inventory, pass, tour) lưu bền vững qua restart server | Đã làm (bản stub) — JSON `data/economy.json` (RAM + ghi file mỗi lần đổi); chưa phải database production (xem ARCHITECTURE §7.5) |
| FR-44 | Kiểm duyệt tên shop / giải đấu | Tên giải đấu/thương hiệu bị từ chối khi trống, quá 40 ký tự hoặc chứa từ cấm | Đã làm (bản stub) — `economy.js` `validateTournamentText` |
| FR-45 | Không pay-to-win / không cá cược / không loot box | Không món nào mua bằng tiền/xu cho chỉ số hay lợi thế trận đấu; không đặt tiền vào kết quả trận; không hộp quà ngẫu nhiên trả phí | Đã làm (bản stub) — catalogue toàn cosmetic; giải thưởng chỉ bằng xu, không đổi ra tiền mặt; xem §10 |
| FR-46 | Chế độ QC — nhảy thẳng tới vòng bất kỳ để test | Nút CHẾ ĐỘ QC trên thẻ bắt đầu + `?qc=1` mở panel chọn vòng 1–8 (nhảy được qua vòng 6); chơi đơn vào thẳng vòng với số người sống theo đường loại co giãn từ 61 người, tính bằng cùng tỉ lệ chu kỳ (V1: 61 · V2: 37 · V3: 20 · V4: 9 · V5: 3 · V6: 2, tối thiểu 2 người để test được cờ và các vòng sau vòng 6 vẫn có bot); multiplayer: host tạo phòng QC, cả phòng cùng bắt đầu ở vòng đã chọn, tên vòng 3–5 đã bốc hiện sau khi tạo phòng, phòng hiện dấu [QC]; nhảy Vòng 2 qua CHIA TEAM, thứ tự lượt xáo theo seed (không có thời gian về đích V1), đồng hồ lượt 30 giây vẫn áp dụng; thanh QC trong lúc chơi cho nhảy vòng / sang vòng sau (không dừng ở vòng 6) / chơi lại vòng này (multi chỉ host); tuỳ chọn "Không loại (chỉ test giao diện)" tắt mặc định; trận QC không thưởng Hội Xu / XP Pass, không tính BXH, economy bị chặn trong phòng QC; người chơi vẫn bị loại bình thường trong vòng đã chọn | Đã làm — `client/index.html` (#qcSection, #qcBar) + `client/js/game.js` (qcJumpSingle/qcSetupSingle/qcSkipTo, qcAliveForRound) + `server/server.js` (phòng qc/qcStartRound/qcNoElim, qcJumpToRound, qcSkip, chặn hook kinh tế) — PR #3, nhánh feat/reverse-team-order |
| FR-47 | Lọc tên người chơi + giới hạn ký tự đặc biệt (P3-07) | Tên rỗng thành "Người chơi"; tên quá 24 ký tự, không có chữ cái/chữ số, > 3 ký tự đặc biệt, 3 ký tự đặc biệt liên tiếp, hoặc chứa từ cấm đều bị từ chối với thông báo rõ (client báo ngay trước khi gửi, server kiểm lại và trả lỗi) | Đã làm (cycle 18, 2026-11-07) — ĐÃ QUYẾT: tối đa 24 ký tự, tối đa 3 ký tự đặc biệt, không 3 cái liên tiếp, kiểm từ cấm cả dạng bỏ dấu |
| FR-48 | Nút THOÁT GAME về màn chính (menu phải) | Nút THOÁT GAME (đỏ) cuối cột menu phải, bấm được trong lúc chơi và khi đang xem (khán giả/tour); người bị loại/khán giả thoát thẳng không hỏi; người còn sống trong trận thì hỏi xác nhận (rời trận = bị loại khỏi trận này, không thưởng vòng này); QC không hỏi; thoát xong về màn chính (startCard) với HUD/tour/spectator/sim đều tắt, multi đóng WS (server xóa slot sau 30s grace) | Đã làm (cycle 21, 2026-11-07) — ĐÃ QUYẾT: xem §8.1. Bổ sung cycle 50 (2026-11-08, backlog #35): màn kết thúc trận có nút THOÁT GAME riêng trong card (`#btnRankExit`, chỉ hiện chế độ ranking) vì overlay `#teamCard` che nút ở cột menu phải. Bổ sung cycle 51 (2026-11-09, backlog #38): sảnh chờ multi có phase riêng `'lobby'` (handler `'joined'` đặt, server gửi kèm trong tin `'joined'` ở cả 4 đường), `exitToMenu()` chỉ no-op khi `phase === 'menu'`; vào làm khán giả giữa trận thì phase `'spectator'`. |
| FR-49 | Sự kiện theo mùa (P4-06) | Ít nhất 1 sự kiện theo mùa chạy được: chủ đề, trò biến thể, thông báo trong game | Đã làm bước 1 (cycle 25, 2026-11-07): khung `client/js/seasonal.js` (đăng ký sự kiện, phát hiện theo ngày + ghi đè `?season=` / localStorage `hoilang_season`, `window.__seasonal` / `window.__season`) + sự kiện đầu tiên Tết Hội Làng 2027 (badge đỏ/vàng ở sảnh chờ `#seasonBadge`, tông đỏ/vàng, toast thông báo lúc bắt đầu trận) — ĐÃ QUYẾT: xem §8.1. Đã làm bước 2a (cycle 35, 2026-11-08): lì xì Hội Xu chơi đơn — mùa Tết thì +8 xu/vòng sống sót, +20 xu/thắng (chỉ xu, không XP; toast gộp "🧧 Lì xì Tết: +N Hội Xu!"). Đã làm bước 2b (cycle 36, 2026-11-08): lì xì Hội Xu chơi nhiều người (server tự tính mùa theo ngày ICT, không tin mùa client; +8 xu/vòng, +20 xu/thắng, chỉ xu không XP; message `earned` kèm `lixi` + `seasonId`, client toast riêng mỗi lần nhận). Đã làm bước 2c (cycle 39, 2026-11-08): trống Tết — vòng 1 tên "Trống Hội Tết" (đơn qua `tetRoundName` client, multi qua server tự tính mùa ICT + message `roundStart`), dải trống/chiêng "🧧 TRỐNG TẾT / CHIÊNG TẾT", nhịp trống chơi đơn tum–tum–TUM (0.42/0.42/0.84s) qua `nextTetBeat` trong `seasonal.js`. P4-06 HOÀN TẤT. |
| FR-50 | Kinh tế chơi đơn (ví local) | Chơi đơn/sảnh chờ: ví + đồ đã mua lưu localStorage trên máy người chơi, KHÔNG đồng bộ lên server; mức thưởng y hệt multi (+10 xu/vòng sống sót, thắng trận lấy cả Hũ Vàng (từ 100 xu), +100 XP/vòng, +500 XP/thắng, 500 XP/cấp, tối đa cấp 20); lên cấp tự nhận thưởng track miễn phí; shop mua/trang bị chạy local; giải đấu/cheer/tặng quà/vé tour chỉ có ở multi | Đã làm bước 1 (cycle 28, 2026-11-07) — ĐÃ QUYẾT: xem §10.2; bước 2 (cycle 45, 2026-11-08): nhiệm vụ ngày chơi đơn (xem §10.2); bước 3 (cycle 52, 2026-11-09): chuyển ví sang máy khác bằng mã sao lưu xuất/nhập (xem §10.2) — #19 HOÀN TẤT, không đồng bộ tự động lên server. |

## 7. Yêu cầu phi chức năng (NFR)

| ID | Yêu cầu | Mục tiêu (đề xuất / ước tính, chưa đo) | Trạng thái |
|---|---|---|---|
| NFR-01 | Hiệu năng render | ≥ 30 FPS trên điện thoại tầm trung ở chế độ chơi; đảo xa dùng instancing khi mở rộng | Đo tự động từ cycle 26 (KPI-06: `avgFps` qua `GET /analytics`); chưa có số trên điện thoại thật |
| NFR-02 | Thời gian tải trang đầu | ≤ ~5 giây trên mạng 4G (ước tính) | Đo tự động từ cycle 26 (KPI-06: `avgLoadSec`/`loadWithin5sRate` qua `GET /analytics`); chưa có số trên 4G thật |
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

**Hũ Vàng Hội Làng — ĐÃ QUYẾT, OD-12 (Sudo 2026-11-08, tiền thưởng top 1
tăng theo người bị loại, kiểu Squid Game):** hũ khởi đầu 100 Hội Xu (lễ
khai hội) + 10 xu mỗi lần có người bị loại; server làm chủ hũ, broadcast
`{type:'pot'}` mỗi lần loại; người thắng lấy tất cả, thay cho +50 xu
thắng cố định (hũ tối thiểu 100 nên luôn hơn; lì xì Tết +20 thắng vẫn
cộng thêm; chơi đơn ví local đổi theo). Tối đa trận 456 người: 100 +
455×10 = 4.650 xu; phòng 61 người: 700 xu; chơi đơn: bot bị loại cũng
cộng (tối đa 700 xu). Chỉ Hội Xu, không tiền thật, không đổi ra tiền,
không cược. Hiển thị: ô HUD "HŨ VÀNG" cập nhật trực tiếp (nhấp nháy vàng
+ tiếng xu khi tăng), hũ vàng 3D treo ở cổng hội trong sân làng (thấy lúc
flyover + giữa vòng), đồng xu bay từ người bị loại về hũ, màn giữa vòng +
màn kết thúc hiện số hũ to, khán giả cũng thấy hũ tăng. QC: hiện hũ nhưng
không trả thưởng. Chủ Hội (giải đấu) sau này: host đặt hũ khởi đầu riêng
(host-funded). Analytics: thêm `avgPot`/`maxPot`/`totalPotsPaid` vào
`GET /analytics`. Số tạm — chỉnh sau khi có số liệu trả thưởng thật. Làm
2 bước nếu 1 cycle không xuể: (1) server hũ + HUD + trả thưởng +
analytics — XONG cycle 41, 2026-11-08 (test hu-vang-test.js 40/40, probe
hu-vang-probe.js 17/17; sửa kèm: showRanking ẩn interstitial để bảng cuối
trận không bị màn "hết vòng" che — lỗi có từ trước, thấy ở ảnh probe);
(2) hũ 3D + xu bay + capture — XONG cycle 42, 2026-11-08 (test
hu-vang-3d-test.js 32/32, probe hu-vang-3d-probe.js 15/15): cổng hội gỗ ở
sân gạch trước đình (z=-46, giữa vạch đích -35 và đình -64), 2 trụ + xà
ngang + mái ngói đỏ + nóc vàng + biển "HỘI LÀNG" + 2 đèn lồng đỏ; hũ vàng
(thân trụ r1.5, vành torus, 7 đồng xu gò trên miệng) treo dưới xà bằng 2
dây, đung đưa nhẹ như con lắc (tắt khi reduced-motion); mỗi lần có người
bị loại, 5 đồng xu bay theo parabol từ chỗ người đó về miệng hũ (tối đa
60 xu bay cùng lúc); đống xu trong hũ to theo số hũ (0.7 ở 0 xu → 1.3 từ
2000 xu, không tràn miệng); chấm vàng Hũ Vàng trên minimap ở cổng.
Backlog #39 HOÀN TẤT.

**Bịt Mắt — ĐÃ QUYẾT (cycle 2, 2026-11-06):** server gửi `goatId` trong tin
`blind` cho cả người tìm (`blind:true`) lẫn dê (`blind:false`, goatId là id
của chính mình), để client người tìm biết dê là ai mà vẽ ánh dê phát sáng +
la bàn theo vị trí thật. Mũi tên `#cue-arrow` và la bàn sim xoay theo hướng
CAMERA (góc tương đối = góc thế giới trừ yaw camera, cùng quy ước
atan2(dx,-dz)), không theo hướng thế giới tuyệt đối. Tin `cue` 2s của server
giữ làm dự phòng khi dê ngoài AOI 40 của tick. Vị trí dê trên client chỉ
được tin khi tươi (<1,5s — tick 15Hz trong AOI 40, game.js đóng dấu `_posAt`;
`syncRemotePlayers` cũng đồng bộ `x`/`z` chứ không chỉ `group.position`).
Ánh vàng nhấp nháy ở dê chỉ hiện khi dê rất gần (<6 — chắc chắn trong AOI
nên vị trí tươi). Chưa đo bằng tay: cảm giác tìm dê theo la bàn mới,
độ chính xác khi dê ngoài AOI, mobile thật.

**Ô Ăn Quan — ĐÃ QUYẾT (cycle 3, 2026-11-06):** chỉ được rải ô dân bên
mình. Bên chia theo chẵn/lẻ vị trí trong turnOrder (xếp theo id): bên 0
đi ô 1–5, bên 1 đi ô 7–11; lượt đi xen kẽ hai bên. Ô quan 0 và 6 KHÔNG
ai được rải (luật cổ truyền; server vốn đã không cho ăn ô quan). Server
chặn nước sai bằng tin lỗi, gửi `sides` {playerId: 0|1} trong mọi tin
`oanquanState`; overlay khóa nút ô không phải của mình (viền vàng = hàng
của bạn theo đúng bên của bạn, ô đối thủ viền teal); sim 3D cũng kiểm tra
trước khi chuyển tiếp và không gửi thẳng WS cho ô sai bên. Ai hết nước đi
hợp lệ thì lượt tự bỏ qua; không ai còn nước đi thì vòng kết thúc
(`no-legal-moves`). Chưa đo bằng tay: cảm giác rải khi chỉ còn ô bên
mình, mobile thật.

**Nhảy Bao Bố — ĐÃ QUYẾT (cycle 4, 2026-11-06):** multiplayer chấm hoàn
toàn ở server; server broadcast tin `hopState` {progress: {playerId:
nhịp}, beatPhase} sau MỖI cú nhảy (kể cả vấp làm tụt 0,5 nhịp) và tick
500ms trong lúc vòng chạy, để thanh tiến độ + vạch nhịp của mọi người
hiện đúng theo số server chấm. Client không đếm nhảy local nữa: `#hop-fill`
+ `#hop-info` + `st.state.progress` lấy từ `hopState`; vạch nhịp nội suy
từ beatPhase của tin cuối (mốc thời gian nhận tin) để trôi mượt giữa các
tin; sim 3D hiện hạng theo `hopProgress` và nhảy theo tiến độ server.
Người chơi khác vẫn nhảy theo chuyển động x/z thật (sim không ghi đè z
theo tiến độ vì tick 15Hz sẽ ghi đè lại, gây giật hình). Chưa đo bằng
tay: cảm giác nhịp khi vạch nội suy, mobile thật.

**Chat panel — ĐÃ QUYẾT (cycle 5, 2026-11-06):** panel chat chỉ hiện qua
class `.open` (CSS `#chatPanel.open{display:flex}`), nhưng `openChat()` /
`closeChat()` trước đây chỉ đổi class `.hidden` nên panel không bao giờ
mở được (P0). Nay `openChat` thêm `.open` và gỡ `.hidden`, `closeChat`
gỡ `.open` và thêm `.hidden`, `toggleChat` và handler phím Esc lấy
`.open` làm nguồn tin đúng/sai duy nhất — giữ cả hai class đồng bộ vì
`.hidden{display:none!important}` sẽ thắng `.open` nếu còn sót. Chưa đo
bằng tay: cảm giác gõ chat trong trận thật, mobile thật.

**Fog (sương) — ĐÃ QUYẾT (cycle 6, 2026-11-06):** chỉ `game.js` sở hữu fog.
Bảng `FOG_PRESETS`: sân làng yard 150/720 + nền 0xffc98a (vòng 1 + vòng 3
trở đi), cầu bridge 16/130 + nền 0xe8c39a (vòng 2), Bịt Mắt blind 4/26 +
màu 0x1a2340 + nền 0x141b33, Nhảy Bao Bố hop 60/420 giữ nguyên màu/nền của
vòng. Đổi vòng luôn xoá override rồi áp preset theo vòng (vòng 2 = bridge,
còn lại = yard). Sim không chạm `scene.fog`: Bịt Mắt xin override `blind`
qua `__game.setFogOverride` khi là người tìm, gỡ qua
`__game.clearFogOverride('blind')` khi thành dê/teardown; Nhảy Bao Bố xin
override `hop` lúc build, gỡ lúc teardown. `clearFogOverride` chỉ gỡ đúng
tên đang giữ — lệnh gỡ cũ (teardown trễ sau khi đã đổi vòng) không đè fog
vòng mới. Giá trị hiệu dụng giữ nguyên như trước. Chưa đo bằng tay: cảm
giác sương/tối ở Bịt Mắt và tầm nhìn ở Nhảy Bao Bố trên trình duyệt thật,
mobile thật.

**Dọn code chết — ĐÃ QUYẾT (cycle 7, 2026-11-06):** xoá 2 nhánh chết trong
`client/js/game.js`, không đổi hành vi: (1) nhánh kiểm `length > 120`
trong `sendChat()` — mọi đường gọi đều đã bị chặn ở 120 ký tự từ trước
(input `#chatInput` có `maxlength="120"`, câu nhanh ngắn hơn nhiều),
giới hạn thật nằm ở `sendPlayerChat` (`.slice(0, 120)`, chơi đơn) và
server (từ chối tin > 120 ký tự, multi); (2) biến `bubblesHidden` trong
`showBubble()` — không bao giờ được gán `true`, cờ thật là `hideBubbles`
(nút ẨN/HIỆN BONG BÓNG bật/tắt). Quét toàn repo không còn TODO/FIXME/XXX/
HACK trong code JS. Chưa đo bằng tay: xác nhận không đổi hành vi chat
(gửi tin, bong bóng, nút ẩn/hiện) khi chơi thật.

**Bảng trực tiếp cho khán giả — ĐÃ QUYẾT (cycle 8, 2026-11-06):** server
phát tin `leaderboard` {round, roundName, aliveCount, finished (thứ tự về
đích + thời gian), eliminated (5 người mới nhất, kèm vòng + lý do)} sau
mỗi lần loại, mỗi lần về đích vòng 2, mỗi lần hết vòng; người vào giữa
trận làm khán giả nhận ngay 1 bản lúc join. Broadcast gộp bằng
`setImmediate` để vòng kết thúc loại hàng loạt không spam 456 client; bỏ
qua khi trận đã kết thúc (bảng cuối trận đi theo tin `phase: finished`).
Client: panel `#leaderboard` trong `#specBanner` (còn lại N người, DẪN
ĐẦU tối đa 5 + thời gian, VỪA BỊ LOẠI tối đa 5 + vòng/lý do); tin
`ranking` giữa trận chỉ cập nhật bảng, không gọi `showRanking()` chiếm
màn hình như trước. Banner khán giả `#specBanner` trước đây không bao
giờ hiện (CSS `display:none`, code chỉ gỡ class `.hidden`) — nay mọi
chỗ hiện/ẩn banner qua helper `setSpectatorBanner(show)` (set cả class
+ `style.display`). Chơi đơn không có server nên không có dữ liệu bảng
(panel giữ ẩn). Chưa đo bằng tay: cảm giác xem bảng trong trận thật đông
người, mobile thật.

**Timer trận tổng — ĐÃ QUYẾT (tạm, cycle 9, 2026-11-06 — P1-07, QC/Sudo
lật được sau play-test):** một trận tối đa **30 phút** (server
`games.MATCH_TIME_LIMIT`, đổi bằng env `MATCH_TIME_LIMIT_S` khi test/vận
hành). Cơ sở: trận dài nhất hợp lý = V1 120s + V2 180s + ~8 vòng giữa ×
90s + chung kết 120s ≈ 25 phút, nên 30 phút đủ chỗ cho phòng đông nhiều
vòng mà vẫn chặn được trận kẹt. Hết giờ tổng thì trận kết thúc **có kết
quả**: người dẫn đầu theo tiến độ vòng hiện tại thắng (server xếp người
sống bằng `rankWorstFirst` rồi đảo lại — về đích trước, điểm cao, gần
dê/cờ hơn thì đứng trước; hoà thì thứ tự vào phòng quyết định), nhận
+50 Hội Xu như thắng thường, bảng cuối trận kèm ghi chú "Hết giờ trận".
Phòng QC được miễn deadline (chỉ để test, nhảy vòng có thể kéo dài).
HUD: ô THỜI GIAN hiện thời gian **còn lại** của trận khi có giới hạn
(đỏ khi ≤ 60 giây, tooltip giữ số đã chơi / giới hạn); không giới hạn
(QC) thì hiện thời gian đã chơi như trước. Người vào giữa trận (khán giả
/ reconnect) nhận kèm trạng thái trận trong tin `joined` (`match`:
round, roundGame, roundName, matchElapsed, matchTimeLimit, roundEndsIn)
để HUD hiện đúng vòng + trò đang chơi và đúng đồng hồ, thay vì mặc định
vòng 1 / 0:00 như trước. Chơi đơn tự áp cùng giới hạn ở client
(`endMatchOnTimeoutIfNeeded`, gọi mỗi frame từ `updateHUD`; cả khi đang
xem với tư cách khán giả). Chưa đo bằng tay: ô THỜI GIAN đếm ngược trên
trình duyệt thật (VM: rAF chết do WebGL null nên ô đứng yên ở 0:00),
cảm giác hết giờ giữa trận đông người, mobile thật.

**Màn kết thúc trận tách khỏi màn chia team — ĐÃ QUYẾT (cycle 10,
2026-11-06 — backlog #28, QC/Sudo lật được sau play-test):** màn kết
thúc trận tái dùng overlay `#teamCard` nhưng chạy chế độ `ranking`
riêng: ẩn tiêu đề "CHIA TEAM — VÒNG 2", đoạn luật chia team và dòng
"Màn hình này tự chuyển sang vòng 2 sau vài giây.", hiện tiêu đề
"KẾT QUẢ TRẬN ĐẤU", bảng xếp hạng thành 1 cột rộng (`.rankRow`, hàng
đầu tô vàng `.first`) thay vì bị ép thành cột hẹp trong flex
`.teamCols`. Nút giữ nguyên hành vi "Chơi lại từ vòng 1" (phase
`finished` → bấm nút replay). Mỗi lần hiện màn CHIA TEAM (chơi đơn
`showTeamScreenSingle`, multi tin `phase: team`) đều gọi
`setTeamCardMode('team')` để gỡ chế độ ranking, tránh rò trạng thái
sang trận sau. `showRanking` + `setTeamCardMode` được lộ qua
`window.__game` để QC/probe gọi trực tiếp. Chưa đo bằng tay: cảm giác
đọc bảng cuối trận trên trình duyệt thật sau trận đông người, mobile thật.

**Khán giả vào giữa trận — ĐÃ QUYẾT (cycle 11, 2026-11-06 — backlog
#29, QC/Sudo lật được sau play-test):** người vào giữa trận làm khán
giả không bao giờ "Đang xem" chính mình. Handler `joined` đồng bộ danh
sách người chơi từ xa TRƯỚC khi vào chế độ khán giả (trước đây chọn mục
tiêu trước khi sync nên `remotePlayers` còn rỗng, chỉ có chính mình đã
chết để chọn). Dự phòng cuối của `specTargets()` và
`buildSpectatorList()` loại chính mình khi mình đã chết — chỉ khi trong
phòng thật sự chỉ còn mình mới trả về mình. `buildSpectatorList()` không
ghi đè `watchedId` khi camera đang theo một người còn sống hợp lệ, nên
tên trên banner luôn trùng với người camera đang theo. Tin `players`
đến sau (người rời phòng / reconnect) cũng chọn lại người dẫn đầu khi
mục tiêu đang xem đã chết/mất; mục tiêu đang xem tốt thì giữ nguyên.
Các hàm khán giả (`specLeader`, `specTargets`, `buildSpectatorList`,
`enterSpectator`, `setSpecTarget`, `watchedPerson`) được lộ qua
`window.__game` để QC/probe gọi trực tiếp. Chưa đo bằng tay: cảm giác
xem trận với tư cách khán giả vào giữa trận trên trình duyệt thật,
mobile thật.

**Onboarding người mới — ĐÃ QUYẾT (cycle 12, 2026-11-07 — backlog #9
bước 1, P4-02, QC/Sudo lật được sau play-test):** người chơi mới thấy
hướng dẫn 3 bước ngay lần đầu vào sảnh chờ (chỉ khi `phase === 'menu'`
và chưa từng xem): bước 1 Trống/Chiêng (trống chạy, chiêng đứng yên,
120 giây về đích), bước 2 Cầu Khỉ + CHIA TEAM (tối đa 3 đội, đi theo
lượt, ván chắc/yếu ngẫu nhiên, nhảy qua khoảng trống bằng Space),
bước 3 chat/khán giả/phím tắt (Enter chat, Esc đóng, 1–4 đổi góc khán
giả, Tab đổi người, WASD + Space, joystick mobile). Bỏ qua được ngay
(nút "Bỏ qua hướng dẫn" hoặc "ĐÃ HIỂU — VÀO CHƠI" ở bước cuối) và ghi
cờ `hoilang_onboarding_seen` vào localStorage — đã xem thì tải lại
không hiện lại; mở lại bất cứ lúc nào bằng nút "❓ HƯỚNG DẪN CHƠI (3
BƯỚC)" trong sảnh chờ. Overlay riêng `#onboardingCard` (z-index 40,
trên `#startCard`), không chặn nút kinh tế khi đã đóng. Các hàm
`showOnboarding` / `hideOnboarding` / `onboardingSeen` lộ qua
`window.__game` để QC/probe gọi trực tiếp. Chưa đo bằng tay: người mới
đọc xong có hiểu luật thật không, tỉ lệ bỏ trận đầu có giảm không (đo
sau khi có analytics P3-06), mobile thật. Còn lại của P4-02: gợi ý
phím theo từng vòng trong lúc chơi (bước 2).

**Gợi ý phím theo từng vòng — ĐÃ QUYẾT (cycle 13, 2026-11-07 — backlog #9
bước 2, P4-02, QC/Sudo lật được sau play-test):** lúc bắt đầu mỗi vòng,
người đang chơi thấy dải gợi ý `#roundHint` dưới HUD (1 câu ngắn: phím
chính + luật quyết định của vòng đó, 8 trò đều có text riêng; cảm ứng
hiện bản chạm — Joystick / nút NHẢY — thay cho WASD / Space). Dải tự
ẩn sau 12 giây, bấm ✕ đóng ngay; hết vòng, vào khán giả, hoặc về menu
thì ẩn theo. Khán giả vào giữa trận và người đã chết không thấy gợi ý
(`showRoundHint` chặn khi `player.alive === false`) vì không điều khiển
nhân vật nữa. Móc vào cả 3 đường bắt đầu vòng: `startRoundCommon`
(multi + chơi đơn vòng 1), `startRoundLocal` (chơi đơn vòng 3+ qua QC
nhảy vòng), `beginRound2Play` (chơi đơn vòng 2 qua màn CHIA TEAM — vòng
2 chơi đơn không đi qua `startRoundCommon`). Trên mobile ≤620px dải dạt
sang trái, chừa cột minimap ở góc phải (cùng cách `#teamPanel` làm), nếu
không minimap sẽ đè lên nửa phải gợi ý + nút ✕. Các hàm `showRoundHint`
/ `hideRoundHint` / `roundHintFor` lộ qua `window.__game`. Chưa đo bằng
tay: người mới có đọc gợi ý lúc vào vòng không, gợi ý có đủ rõ trên
mobile thật không, cảm giác 12 giây có vừa không.

**Nút chạm chỉ hiện trên thiết bị cảm ứng; overlay vòng cần di chuyển
không đè joystick — ĐÃ QUYẾT (cycle 14, 2026-11-07 — backlog #10 bước 1,
P4-03, QC/Sudo lật được sau play-test):** (1) Joystick + nút NHẢY chỉ
hiện khi đang chơi TRÊN THIẾT BỊ CẢM ỨNG — trước đây luật
`body.playing #joyBase{display:block}` không phân biệt thiết bị nên
desktop cũng hiện joystick giữa màn hình. Nay chỉ hai luật media còn
lại: `@media (pointer:coarse)` và `@media (pointer:fine)` kèm class
`touch` trên body (game.js gắn `body.touch` khi `isTouchDevice()` đúng,
để laptop cảm ứng vẫn thấy joystick). (2) Vòng mà người chơi phải di
chuyển nhưng overlay vẫn hiện cả vòng — Rồng Rắn chạy cờ, Bịt Mắt khi
làm dê — thì trên cảm ứng overlay chuyển thành dải gọn phía trên
(class `move-mode`, rounds.js `setOverlayMoveMode`/`moveModeFor`),
thay cho bottom-sheet `sim-mode` vốn đè lên joystick + nút NHẢY + nút
CHAT (đo thật ở 360px: sheet y 580–788 đè kín joystick y 656–780 và
nút NHẢY y 688–770, `elementFromPoint` tại tâm joystick trả về
overlay). Dải trên đặt dưới HUD/gợi ý (top 184px, mobile 226px — dời xuống ở
cycle 15 vì HUD mobile giờ 2 hàng, xem mục dưới),
chừa cột minimap bên phải (right 166px, mobile 160px — dời từ 150px ở
cycle 15 để chừa cả cột econBar, minimap mobile đo thật rộng 135px ở
right:6px), chỉ giữ tiêu đề + dòng trạng thái
(`#flag-status`; đoạn luật dài ẩn đi vì đã có trong `#roundHint`).
Desktop dùng bàn phím nên giữ nguyên bottom-sheet. Bịt Mắt: người tìm
không bị ảnh hưởng vì màn tối `pointer-events:none` nên joystick vẫn
bấm được; chỉ dê (panel dê hiện cả vòng) mới cần dải trên — đường tin
`blind` multi cập nhật `move-mode` theo vai (`blind:false` → dê →
bật, `blind:true` → người tìm → tắt), cả trường hợp `blind` tới trước
`roundStart` (`pendingBlind`). Chưa đo bằng tay: cảm giác chạy cờ /
chạy trốn bằng joystick trên điện thoại thật, dải trên có che tầm nhìn
3D không, laptop cảm ứng có thấy joystick đúng lúc không.

**HUD 2 hàng + xếp chồng các dải trên mobile 360px — ĐÃ QUYẾT (cycle 15,
2026-11-07 — backlog #10 bước 2a, P4-03, QC/Sudo lật được sau
play-test):** (1) HUD mobile thành 2 hàng vì 5 ô thống kê + dải trạng
thái không vừa 1 hàng 360px — đo thật trước sửa: dải trạng thái bị bóp
còn 22px (nội dung 191px tràn ra ngoài, chữ "VÒNG 1 — Trống Hội" đè
lên ô VÒNG), ô "ĐÃ ĐI" tràn phải tới 386px bị cắt, thanh tiến độ đè lên
nhãn các ô. Hàng 1: dải trạng thái chiếm hết chiều ngang; hàng 2: 5 ô
chia đều (`flex:1 1 0`, chữ số 13px + nhãn 8px, `white-space:nowrap` —
"VÒNG 1" ở 14px vẫn bị cắt, 13px mới vừa). (2) Toàn bộ dải dưới HUD
dời xuống theo HUD 2 hàng (mobile): tiến độ 114px, đồng hồ vòng
150px, gợi ý phím + minimap 162px, dải team 252px (dưới gợi ý — gợi ý
cao tối đa ~83px cho 4 dòng ở 204px, đo thật), dải move-mode 226px.
Dải team desktop dời 118px → 182px (dưới gợi ý desktop 122px, cao tối
đa ~50px cho 2 dòng). (3) Cột phải mobile chừa đủ chỗ cho minimap:
minimapWrap rộng 135px (nhãn "BẢN ĐỒ · ĐẢO HỘI LÀNG" dài hơn canvas
100px) ở right:6px nên cạnh trái ở x=219 — right:122px cũ cho gợi ý /
dải team chạm tới x=238, đè lên minimap 19px; nay gợi ý right:150px
(cạnh phải x=210), dải team + dải move-mode right:160px (cạnh phải
x=200, chừa cả cột econBar bắt đầu x=204). (4) Tiêu đề bay tổng quan
(`flyoverTitleEl`, game.js `ensureFlyoverEls`) co theo màn hình: cỡ
chữ `max(30, min(52, innerWidth × 0.11))` + `white-space:nowrap` +
top 28% ở ≤620px — trước đây 52px cố định làm "ĐẢO HỘI LÀNG" gãy 3
dòng ở 360px và đè lên cột kinh tế; nay 1 dòng (~40px, rộng ~329px),
kết thúc trước cột econBar (top 300px). Tiêu đề vẫn phủ lên góc trái
minimap trong vài giây bay tổng quan (chữ trắng trên nền tối, vẫn đọc
được) — chấp nhận, vì mọi tiêu đề căn giữa đủ đọc đều chạm tới góc đó
ở 360px. Chưa đo bằng tay: HUD 2 hàng có dễ đọc khi đang chạy không,
gợi ý 4 dòng có che tầm nhìn 3D không, cảm giác chơi trên điện thoại
thật, mobile thật.

**Three.js tự host + fallback CDN — ĐÃ QUYẾT (cycle 16, 2026-11-07 —
backlog #11, P2-09, QC/Sudo lật được sau play-test):** thư viện 3D
không còn phụ thuộc CDN khi tải trang. `client/js/vendor/three.min.js`
(r158, 651.651 byte, sha256 `3b3a1c97…d41d51`, đối chiếu byte-identical
với cdnjs 0.158.0) do chính server game phục vụ như file tĩnh; `index.html`
tải bản local trước, nếu `THREE` chưa định nghĩa thì fallback sang CDN
cdnjs cùng phiên bản bằng `document.write` đồng bộ (giữ thứ tự: game.js
vẫn chạy sau Three.js). `window.__threeSource` ghi `'local'` hoặc `'cdn'`
để QC/probe biết Three.js tới từ đâu. Nếu cả hai nguồn đều lỗi thì banner
`#threeLoadError` hiện rõ ("Không tải được thư viện 3D (Three.js) — kiểm
tra mạng rồi tải lại trang.") thay vì để game chết lặng; việc kiểm tra
đặt ở `DOMContentLoaded` (bản đầu kiểm tra ngay sau `document.write` đã
sai: script CDN chèn lúc parse chưa chạy xong lúc đó nên banner hiện cả
khi fallback thành công — probe bắt được, đã sửa). Chưa đo bằng tay:
tải trang trên trình duyệt thật khi mất mạng CDN, cảm giác tải có chậm
hơn không (bản local 652 KB do server mình phục vụ).

**Log có cấu trúc + tự khởi động lại khi crash — ĐÃ QUYẾT (cycle 19,
2026-11-07 — backlog #13, P3-05 bước 1, QC/Sudo lật được):** mọi sự kiện
server đều là 1 dòng JSON trên stdout qua `logEvent` (đã có từ trước cho
các sự kiện trận: `match_start`, `round_start`, `round_end`, `match_end`,
`elimination`...). Cycle này thêm: (a) access log — `http_request`
`{method, path, status, ms}` cho mọi request HTTP (kể cả `/health`, 403,
404), ghi ở `res 'finish'`; (b) lỗi chết người — `uncaughtException` /
`unhandledRejection` ghi 1 dòng `fatal` `{kind, message, stack}` rồi thoát
mã 1 (trước đây crash là chết lặng, không dòng log nào, không ai chạy
lại); (c) tắt có trật tự — SIGTERM/SIGINT ghi `server_stop`, đóng WS +
HTTP rồi thoát 0; (d) `/health` thêm `pid` + `startedAt` (ISO) để giám
sát biết process nào, chạy từ bao giờ; (e) supervisor mới
`server/supervisor.js` (`npm run supervise`): spawn `node server/server.js`,
con thoát != 0 thì chạy lại với backoff 1s/2s/4s... tối đa 10s, con sống
ổn định đủ 60s thì reset bộ đếm; con thoát 0 thì supervisor thoát 0 theo,
không chạy lại; supervisor nhận SIGTERM/SIGINT thì gửi SIGTERM cho con và
tắt sạch. Hook test `HOI_TEST_CRASH=1` (mặc định tắt) chỉ để kiểm chứng
đường fatal → exit(1) thật. Chưa làm (còn nợ): cảnh báo khi server chết
(cần Sudo chọn kênh báo — chat/email/webhook), gom/rotate log file (log
đang ra stdout, thuộc về nơi chạy, vd. systemd/journald). Chưa đo bằng
tay: hành vi restart trên máy host thật (chưa có host production), Sudo
chỉ cần biết `npm run supervise` là cách chạy khuyên dùng.

**Gom + xoay log file ở supervisor — ĐÃ QUYẾT (cycle 22, 2026-11-07 —
backlog #13, P3-05 bước 2, QC/Sudo lật được):** sửa lại quyết định ở
đoạn cycle 19 ("rotate thuộc về nơi chạy, vd. systemd/journald") — ở môi
trường triển khai hiện tại (VM, không có systemd/journald) thì supervisor
chính là nơi chạy, nên supervisor đảm nhiệm luôn việc gom + xoay khi được
giao file: đặt `SUPERVISOR_LOG_FILE=<đường dẫn>` thì mọi dòng log (của
supervisor lẫn stdout/stderr của server con) ghi vào file đó; không đặt
thì hành vi cũ giữ nguyên (stdout, con inherit). File vượt
`SUPERVISOR_LOG_MAX_BYTES` (mặc định 5 MiB) thì xoay giữ
`SUPERVISOR_LOG_KEEP` thế hệ (mặc định 3), thế hệ cũ nhất bị xóa; kiểm tra
lúc khởi động, trước mỗi lần chạy lại con, và định kỳ
`SUPERVISOR_LOG_CHECK_MS` (mặc định 30s); xoay xong ghi 1 dòng
`supervisor_log_rotate` vào file mới. Logic xoay tách riêng thành module
`server/log-rotate.js` (`rotateLogFile`/`needsRotation`, không bao giờ
throw) để test trực tiếp. Mở file lỗi (sai đường dẫn, không có quyền) thì
ghi `supervisor_log_fallback` rồi về stdout, không crash — lỗi này phải
kiểm tra đồng bộ trước khi mở vì `createWriteStream` báo lỗi bất đồng bộ,
bản đầu chỉ trông vào handler 'error' đã nuốt mất `supervisor_start`
(test bắt được, đã sửa). Chưa làm (còn nợ): cảnh báo khi server chết (cần
Sudo chọn kênh báo — chat/email/webhook). Chưa đo bằng tay: hành vi xoay
log trên máy host thật khi log phình nhanh (chỉ mới đo bằng con test nói
nhiều trong VM).

**Harness capture tắt onboarding trước mọi stage tương tác — ĐÃ QUYẾT
(cycle 17, 2026-11-07 — backlog #30, QC/Sudo lật được):** từ khi
onboarding tự hiện lần đầu ở sảnh chờ (cycle 12), overlay của nó
(z-index 40) chặn mọi click nên harness chỉ chụp lại màn onboarding bước 1
ở các stage QC/vòng 3–6. Nay `tools/capture.js` có helper
`dismissOnboarding(page)`: bấm nút "Bỏ qua hướng dẫn" (`#btnObSkip`) thật
như người chơi — ghi cờ `hoilang_onboarding_seen` vào localStorage nên các
page sau trong cùng browser không hiện lại — và fallback qua
`window.__game.hideOnboarding()` nếu không có nút. Helper được gọi sau
khi load trang ở mọi stage tương tác: QC panel, `startSingleQc` (team +
vòng 2–6), vòng 1 desktop/mobile, shop, chat; stage lobby (01/01b) GIỮ
NGUYÊN onboarding để chụp đúng trải nghiệm người mới. Đây là sửa harness,
không đổi hành vi game. Chưa đo bằng tay: không có — harness chỉ phục vụ
kiểm chứng, Sudo không cần test tay mục này.

**Analytics tối thiểu ở server — ĐÃ QUYẾT (cycle 20, 2026-11-07 —
backlog #14, P3-06 bước 1, QC/Sudo lật được):** module mới
`server/analytics.js` đếm tổng hợp, lưu `data/analytics.json`, xem qua
`GET /analytics` (chỉ số tổng hợp, chưa khóa admin — TODO khi mở
public). Không lưu tên người chơi, nội dung chat hay tọa độ. Đo được:
KPI-01 (trận tới vòng 2 + có người thắng / trận đã kết thúc), KPI-03
(người gửi ≥1 tin / người trong trận đã kết thúc), KPI-04 (người bị loại
mở tour ≥1 lần / người bị loại), KPI-05 (trận có ≥1 replay / trận đã kết
thúc). Trận QC ghi riêng (`qcMatchesStarted/Finished`), không vào mẫu số
KPI — giống cách economy miễn thưởng phòng QC. Tour mở và replay đều xảy
ra trên màn hình kết thúc (sau `endMatch`) nên số đếm chốt sau grace 30
giây kể từ khi trận kết thúc; `/analytics` trong 30 giây đó chưa thấy
trận này. Client gửi `{type:'tour'}` 1 lần mỗi lần mở tour
(`activateExplore()`), server chỉ đếm khi người đó đã bị loại — mở tour
từ sảnh chờ không tính.

**KPI-02 lấp đầy phòng — ĐÃ QUYẾT (cycle 23, 2026-11-07 — backlog #14,
P3-06 bước 2, QC/Sudo lật được):** `server/analytics.js` thêm `liveRooms`
(chỉ RAM, key = mã phòng): `recordRoomCreated` lúc `makeRoom` (tạo phòng
+ tràn phòng đầy 456 đều qua đây), `recordLobbyJoin` sau mỗi lần thêm
người vào phòng đang ở sảnh chờ — lần đầu đạt 20 người (không tính khán
giả) thì chốt `filled20Ms` = thời gian từ lúc tạo phòng tới lúc đủ 20.
`recordMatchStart` chốt vào totals: `roomsFilled20`, `roomsFilled20Within5Min`
(đủ 20 trong ≤ 5 phút), `totalFill20Ms`, `matchesStartedUnder20` (trận bắt
đầu khi chưa đủ 20). `GET /analytics` thêm `fill20Rate` (phòng đủ 20 /
trận đã bắt đầu), `fill20Within5MinRate` (đủ trong ≤ 5 phút / phòng đã đủ
20), `avgFill20Sec`, `under20StartRate`. Quy ước: "đủ 20" tính theo LẦN
ĐẦU đạt 20 — phòng đủ 20 rồi có người rời trước khi bắt đầu vẫn tính là
đã đủ (thời gian lấp đầy là thời gian tới lần đầu đủ); số người lúc bắt
đầu đo riêng bằng `matchesStartedUnder20`. Phòng QC không tính; phòng bị
xóa khi chưa bắt đầu trận (`dropMatch`) thì bỏ bản ghi, không vào mẫu số.

**Khóa admin cho `GET /analytics` — ĐÃ QUYẾT (cycle 32, 2026-11-07 —
backlog #14, P3-06 bước 7, QC/Sudo lật được):** token admin lấy từ env
`HOI_ADMIN_TOKEN` (không có secret trong repo; `.env.example` có dòng
mẫu đã comment, `.env` đã trong `.gitignore`). Khi đã đặt token:
`/analytics` chỉ trả số liệu khi request kèm đúng token qua query
`?token=...` hoặc header `Authorization: Bearer ...`; thiếu/sai ->
`403 {error:'forbidden'}` + 1 dòng log `analytics_denied` (không ghi
token vào log); so sánh bằng digest SHA-256 cố định độ dài
(`crypto.timingSafeEqual`) để tránh timing attack. Khi chưa đặt token:
`/analytics` vẫn mở như trước (mặc định dev local/QC, không vỡ luồng
chạy local) và server ghi 1 dòng cảnh báo `analytics_unprotected` lúc
khởi động. `/health` và `/` không bị khóa. Test 15/15 PASS
(`hidden_files/p3-06-analytics-admin-test.js`: 2 server thật cổng
3998/3999, đủ cả 2 đường token, 3 lần 403 đều ghi log, log không rò
token). P3-06 hoàn tất với bước này — không còn mục nào chờ. Chưa đo
bằng tay: Sudo đặt token thật khi deploy public rồi thử gọi
`/analytics` không token xem có 403 không.

**KPI-07 trận bỏ dở — ĐÃ QUYẾT (cycle 24, 2026-11-07 — backlog #14,
P3-06 bước 3, QC/Sudo lật được):** "bỏ dở" = trận đã bắt đầu
(`recordMatchStart` đã chạy) nhưng phòng bị xóa (`dropMatch`) trước khi
`recordMatchEnd` — mọi người rời phòng giữa trận, trận không có kết quả.
Đếm vào `totals.matchesAbandoned` (+ `abandonedPlayersTotal` = số người
trong các trận bỏ dở); phòng QC tách riêng (`qcMatchesAbandoned`), không
vào mẫu số KPI. `GET /analytics` thêm `abandonRate` =
`matchesAbandoned / (matchesFinished + matchesAbandoned)` — tỉ lệ trong
số trận đã có kết cục; trận đang chạy chưa tính. Mục tiêu đề xuất < 5%
(BRD §2). Sửa kèm trong `dropMatch`: trận đã kết thúc (đang trong grace
30s) mà phòng bị xóa thì chốt ngay số đếm như trận đã kết thúc thay vì
hủy timer — trước đây trận đó mất khỏi thống kê nếu mọi người rời phòng
trong 30s sau màn hình kết thúc. Phòng chưa bắt đầu trận mà bị xóa thì
không tính bỏ dở. `dropMatch` 2 lần trên cùng trận chỉ đếm 1 lần.
Giới hạn: server restart giữa trận làm mất bản ghi RAM nên trận đó không
đếm được vào bỏ dở — chỉ đếm được trận bỏ dở do phòng trống. "Bỏ dở" ở
đây là mọi người rời phòng; trận kẹt do lỗi mà không ai rời thì không
kẹt được lâu vì đã có deadline vòng + deadline trận tổng (P1-07) ép kết
thúc có kết quả.
Chưa đo bằng tay: số liệu chỉ có ý nghĩa sau khi có trận thật (hiện
totals đang rỗng); Sudo chơi thử vài trận rồi xem `GET /analytics` là
cách kiểm nhanh nhất.

**KPI-08 tố cáo chat — ĐÃ QUYẾT (cycle 27, 2026-11-07 — backlog #14,
P3-06 bước 5, QC/Sudo lật được):** gửi tố cáo từ panel chat: tin của
người khác trong trận multi có nút 🚩 (`#chatMsgs .cmReport`); tin của
mình và tin bot không có (không tố cáo được chính mình, bot không phải
người thật). Bấm 🚩 mở menu `#reportMenu` với 4 lý do cố định — `spam`
(Spam / quảng cáo), `xuc-pham` (Xúc phạm / chửi bậy), `gian-lan` (Gian
lận), `khac` (Khác) — phải khớp `REPORT_REASONS` ở
`server/analytics.js`; chọn 1 lý do là gửi ngay `{type:'report',
targetId, reason}`. Server kiểm tra: target phải có trong cùng phòng,
không được tố cáo chính mình, lý do phải thuộc danh sách; chống spam —
mỗi người tố cáo mỗi người khác tối đa 1 lần/trận, tối đa 5 tố cáo/trận
(khóa theo mã phòng + `matchStart` + target, lưu trên đối tượng người
chơi); vi phạm thì trả `{type:'error'}` với lý do rõ ràng, không đếm.
Tố cáo hợp lệ: người tố cáo nhận `{type:'reportAck', reportId}`, chủ
phòng (nếu khác người tố cáo) nhận `{type:'reportReceived', reportId,
reason}` + toast. Host đánh dấu đã xử lý bằng `{type:'report-resolve',
reportId}` (chỉ host; server trả lỗi nếu không phải host hoặc đã xử lý
rồi) — server broadcast `{type:'reportResolved', reportId}` cho cả
phòng. `analytics.recordReport`/`resolveReport` ghi vào `liveReports`
(chỉ RAM — restart server thì mất danh sách chờ xử lý, cùng họ với
`liveMatches`; số đếm totals đã ghi file nên còn) + đếm vào totals:
`reportsTotal`, `reportsResolved`, `reportsByReason`; phòng QC đếm
riêng (`qcReportsTotal`/`qcReportsResolved`), không vào mẫu số KPI.
`GET /analytics` thêm `reportsTotal`, `reportsPending` (=
`reportsTotal - reportsResolved`), `reportsByReason`,
`reportsResolvedRate`, `qcReportsTotal`. KHÔNG lưu tên người chơi hay
nội dung chat — bản ghi tố cáo chỉ có id, mã phòng, id tạm của người tố
cáo/bị tố cáo (id theo kết nối), lý do, thời gian. Chơi đơn không có WS
nên không tố cáo được (`reportPlayer` toast báo + `sendWS` tự no-op vì
`ws` null). Chưa đo bằng tay: số liệu chỉ có ý nghĩa sau khi có người
chơi thật tố cáo; Sudo chơi thử 2 người rồi xem `GET /analytics` là cách
kiểm nhanh nhất.

**KPI-08 bước 6, UI danh sách tố cáo + mute — ĐÃ QUYẾT (cycle 31,
2026-11-07 — backlog #14, P3-06 bước 6, QC/Sudo lật được):** chỉ chủ
phòng ở chế độ nhiều người mới thấy nút `TỐ CÁO` ở cột menu phải
(`#btn-reports`, ẩn với người thường/chơi đơn; có tố cáo chờ thì nút
đỏ + đếm số, ví dụ "TỐ CÁO (2)"). Bấm nút gửi `{type:'report-list'}`
và mở panel `#report-panel` (bắt đầu với class `.hidden` — không lặp
lỗi #20/#37); server trả `{type:'reportList', reports:[{id, targetId,
targetName, reason, at}]}` chỉ của phòng mình (người đã rời phòng thì
`targetName` null, client hiện "đã rời phòng"). Mỗi hàng: "#id · tên ·
lý do · giờ" + 2 nút — "Tắt chat"/"Bật lại chat" gửi
`{type:'mute', targetId, muted}` (chỉ host; server trả lỗi nếu không
phải host, mute chính mình, hoặc target không còn trong phòng; nút mute
bị vô hiệu với người đã rời phòng) và "Đã xử lý" gửi
`{type:'report-resolve'}` như bước 5. Mute có hiệu lực tới hết trận
(`room.__muted`, server chặn tin chat của người bị mute ở handler
`'chat'` trước khi ghi số liệu — tin bị chặn không đếm vào KPI chat;
replay xóa mute). Server broadcast `{type:'playerMuted', targetId,
targetName, muted}` cho cả phòng (người bị mute nhận toast riêng).
`reportReceived` nay gửi kèm `targetId` + `targetName` cho host để
panel cập nhật ngay khi có tố cáo mới mà không cần hỏi lại server —
chỉ trong message WS trực tiếp, KHÔNG lưu tên vào analytics (giữ chính
sách "không lưu tên" của cycle 27); `reportResolved` xóa hàng khỏi
panel ở mọi client. Chưa làm sau bước 6: khóa admin cho `/analytics`
khi mở public. Chưa đo bằng tay: Sudo chơi thử 2 người thật — 1 người
tố cáo, host mở panel, mute rồi xem người bị mute có gửi được tin
không + mở lại chat được không.

**Khóa admin cho `GET /analytics` — ĐÃ QUYẾT (cycle 32, 2026-11-07 —
backlog #14, P3-06 bước 7, QC/Sudo lật được):** xem BRD §2 (mục Khóa
admin cho `GET /analytics`): token từ env `HOI_ADMIN_TOKEN`; khi đã
đặt, `/analytics` chỉ trả số liệu với `?token=...` hoặc
`Authorization: Bearer ...` đúng, thiếu/sai -> `403
{error:'forbidden'}` + log `analytics_denied` (không ghi token); so
sánh bằng digest SHA-256 + `crypto.timingSafeEqual`. Khi chưa đặt,
`/analytics` mở như trước + server ghi cảnh báo
`analytics_unprotected` lúc khởi động; `/health` và `/` không bị khóa.
P3-06 hoàn tất với bước này.

**Nút THOÁT GAME ở sảnh chờ multi không thoát được — ĐÃ QUYẾT (cycle
31, 2026-11-07 — phát hiện khi kiểm probe G, backlog #38, QC/Sudo lật
được):** sau khi vào phòng multi, `phase` vẫn là `'menu'` (handler
`'joined'` không đặt phase sảnh chờ) nên `exitToMenu()` gặp điều kiện
`phase === 'menu'` là return luôn — nút THOÁT GAME ở sảnh chờ không làm
gì, người chơi kẹt trong phòng, chỉ còn cách tải lại trang. Sửa tối
thiểu: `exitToMenu()` chỉ no-op khi đang ở màn chính thật
(`phase === 'menu' && mode !== 'multi'`); ở sảnh chờ multi
(`mode === 'multi'`, phase vẫn `'menu'`) thì thoát bình thường, không
hỏi xác nhận (chưa vào trận). Không đổi `phase` thành `'lobby'` ở cycle
này vì `canExplore()` (cho phép du lịch từ sảnh), camera menu ở vòng
lặp animate và `exploreReturn.menu` đều đang dựa vào
`phase === 'menu'` — đổi phase cần sửa cả 3 chỗ, để lại cho backlog
#38 làm gọn sau. (Đã làm ở cycle 51, 2026-11-09 — xem mục "Sảnh chờ multi có phase riêng 'lobby'" trong §8.1.)

**KPI-06 hiệu năng ở client — ĐÃ QUYẾT (cycle 26, 2026-11-07 —
backlog #14, P3-06 bước 4, QC/Sudo lật được):** client mới
`client/js/perf.js` đo FPS trong 10 giây đầu sau khi trang tải xong
(trung bình + thấp nhất theo từng giây; bucket nào kéo dài > 2s do tab
bị ẩn thì bỏ, không tính vào trung bình) và thời gian tải trang đầu
(Navigation Timing: `loadEventEnd` — phải đọc SAU khi sự kiện load kết
thúc, đọc ngay trong handler load thì vẫn là 0) rồi gửi 1 báo cáo
`{type:'perf'}` sau khi vào phòng (`game.js` gọi `onJoined()` khi nhận
`'joined'`); server chỉ nhận 1 báo cáo mỗi kết nối WS và bỏ báo cáo gửi
trước khi vào phòng (không quy được về phòng thường hay QC).
`analytics.recordPerf` kiểm tra khoảng hợp lệ (FPS 0–240, loadMs
0–300000ms): fpsAvg ngoài khoảng thì bỏ cả báo cáo; loadMs ngoài khoảng
thì chỉ bỏ số tải trang, vẫn đếm FPS; fpsMin ngoài khoảng thì lấy bằng
fpsAvg. Phòng QC chỉ đếm riêng (`qcPerfReports`), không vào mẫu số KPI.
Chơi đơn không có WS nên không gửi — KPI-06 chỉ đo người chơi
multiplayer. `GET /analytics` thêm `avgFps`, `avgFpsMin`,
`fpsAtLeast30Rate` (fpsAvg ≥ 30 / báo cáo), `avgLoadSec`,
`loadWithin5sRate` (loadMs ≤ 5s / báo cáo có loadMs), `noWebglRate`
(renderer null — headless VM hoặc buildWorld lỗi, backlog #24). FPS đo
ở sảnh chờ (cảnh 3D đã chạy) chứ không phải giữa trận — chỉ là mẫu, mục
tiêu ≥ 30 FPS / tải ≤ ~5s vẫn là mục tiêu đề xuất (BRD §2), không thay
cho đo FPS/thời gian tải trên điện thoại thật (backlog #10). Chưa đo:
KPI-08 bước 6 (UI danh sách tố cáo + mute), khóa admin cho `/analytics`
khi mở public.
Chưa đo bằng tay: số liệu chỉ có ý nghĩa sau khi có người chơi thật
gửi báo cáo (hiện totals đang rỗng); Sudo chơi thử rồi xem
`GET /analytics` là cách kiểm nhanh nhất.

**Nút THOÁT GAME ở menu phải — ĐÃ QUYẾT (cycle 21, 2026-11-07 —
backlog #33, theo yêu cầu Sudo, QC/Sudo lật được):** nút `THOÁT GAME`
(`#btn-exit`, đỏ) cuối cột `#econBtns`, cùng hàng với 4 nút kinh tế.
Người bị loại/khán giả/người xem tour/người đã xong trận bấm là thoát
thẳng về màn chính, không hỏi. Người còn sống trong trận thì hỏi lại
bằng `confirm()` vì rời trận = bị loại khỏi trận này, không nhận thưởng
vòng này. Trận QC không hỏi (không thưởng, thoát tự do để test). Thoát
xong: sim vòng 3-6 dừng, mọi overlay/panel của trận ẩn, tour +
spectator + banner + chat tắt, fog về preset sân làng, phase về
'menu', startCard hiện lại. Multi gửi message 'leave' trước khi đóng WS
(cycle 49, backlog #34) nên server xóa slot ngay — người còn lại thấy
phòng trống lập tức, host chuyển ngay; đóng tab/rớt mạng đột ngột thì
vẫn giữ grace 30s để reconnect được. Chưa làm:
nút thoát trên màn hình kết thúc trận (overlay teamCard che cột menu,
backlog #35).
Chưa đo bằng tay: số liệu chỉ có ý nghĩa sau khi có trận thật (hiện
totals đang rỗng); Sudo chơi thử vài trận rồi xem `GET /analytics` là
cách kiểm nhanh nhất.

**Đảo du lịch mới Hòn Chó Đá — ĐÃ QUYẾT (cycle 21, 2026-11-07 —
backlog #15, P4-01 bước 1/3, QC/Sudo lật được):** thêm đảo thứ 12 vào
du lịch Hạ Long (P4-01 yêu cầu ít nhất 3 đảo mới; cycle này làm 1 đảo,
còn nợ 2 đảo cho cycle sau). Hòn Chó Đá là đảo đá thật trong vịnh, nhãn
nguồn "Tư liệu thật": hình dáng chó ngồi chồm hỗm, mõm hướng ra khơi;
câu chuyện ghi rõ phần nào là tư liệu (hình dáng thật) và phần nào là
truyền thuyết dân gian (chó trung thành đợi chủ đi biển). Vị trí
(-285, 245) ở góc tây nam vịnh, cách đảo gần nhất (Đảo Soi Sim) và dãy
núi đá vôi gần nhất đều trên 100 đơn vị — không chồng lấn. Đảo có đủ:
hình voxel riêng (thân ngồi thấp bè, ngực dựng, đầu ngẩng, mõm + chóp
mũi nhô hướng tây nam, hai tai, đuôi vểnh, bãi cát chân trước), cây/bụi/
dây leo/hoa trên lưng, đèn dấu đỏ, biển tên, thuyền neo gần bờ, đàn chim
bay vòng quanh, icon `dog` riêng trong danh sách tour. Danh sách tour,
proxy bấm 3D, chấm minimap và nút bay tới đều chạy theo dữ liệu
`TOUR_ISLANDS` nên đảo mới tự có đủ đường vào, không sửa riêng từng
chỗ. Chưa đo bằng tay: hình dáng voxel thật của đảo chỉ xem được trên
trình duyệt có WebGL (harness headless ở VM trả WebGL null nên canvas
trắng) — Sudo bay tới Hòn Chó Đá trên máy thật để chốt dáng chó có đọc
ra ngay không.

**Đảo du lịch mới Hòn Cánh Buồm — ĐÃ QUYẾT (cycle 33, 2026-11-07 —
backlog #15, P4-01 bước 2/3, QC/Sudo lật được):** thêm đảo thứ 13 vào
du lịch Hạ Long (P4-01 yêu cầu ít nhất 3 đảo mới; cycle này làm 1 đảo,
còn nợ 1 đảo cho cycle sau). Hòn Cánh Buồm là đảo đá thật trong vịnh, nhãn
nguồn "Tư liệu thật": hai khối đá vôi dựng đứng nhìn từ xa giống hệt hai
cánh buồm nâu đang rẽ sóng ra khơi (đã kiểm chứng qua Wikipedia Vịnh Hạ
Long); câu chuyện ghi rõ phần gợi nhớ thuyền buồm ba vách cánh dơi của ngư
dân Quảng Ninh xưa là liên tưởng, không phải tư liệu về bản thân đảo. Vị
trí (140, 210) ở phía đông vịnh, cách đảo gần nhất (Đảo Khỉ) ~165 đơn vị
và dãy núi đá vôi gần nhất 52 đơn vị — không chồng lấn. Đảo có đủ: hình
voxel riêng (hai buồm mỏng theo chiều gió, buồm lớn cao ~21 đứng trước,
buồm nhỏ cao ~15 đứng sau, cột buồm nhô trên đỉnh, bãi cát chân buồm),
cây/bụi/dây leo/hoa trên lưng, đèn dấu đỏ, biển tên, thuyền neo gần bờ,
đàn chim bay vòng quanh, icon `sail` riêng trong danh sách tour. Danh sách
tour, proxy bấm 3D, chấm minimap và nút bay tới đều chạy theo dữ liệu
`TOUR_ISLANDS` nên đảo mới tự có đủ đường vào, không sửa riêng từng
chỗ. Chưa đo bằng tay: hình dáng voxel thật của đảo chỉ xem được trên
trình duyệt có WebGL — Sudo bay tới Hòn Cánh Buồm trên máy thật để chốt
hai buồm có đọc ra ngay không; đồng thời chốt luôn nút danh sách tour
(không bấm được trong harness headless vì lỗi #24 làm danh sách rỗng).

**Đảo du lịch mới Hòn Đầu Người — ĐÃ QUYẾT (cycle 34, 2026-11-08 —
backlog #15, P4-01 bước 3/3, QC/Sudo lật được):** thêm đảo thứ 14 vào
du lịch Hạ Long — P4-01 yêu cầu ít nhất 3 đảo mới nay HOÀN TẤT (Hòn Chó
Đá cycle 21, Hòn Cánh Buồm cycle 33, Hòn Đầu Người cycle này). Hòn Đầu
Người là đảo đá thật trong vịnh, nhãn nguồn "Tư liệu thật": nhìn từ xa
giống hệt một cái đầu người đang hướng về đất liền, mũi to nhô ra, cằm
sát mặt nước, trên đỉnh lưa thưa cây như bờm tóc bay trong gió (đã kiểm
chứng qua Wikipedia Vịnh Hạ Long + 2 nguồn du lịch: cao khoảng 25m, gần
hang Luồn, cách bến tàu du lịch khoảng 13km, phía bắc đảo Bồ Hòn, cách
đảo Ti Tốp khoảng 1km); câu chuyện ghi rõ phần "lúc hoàng hôn thấy đầu
cô gái búi tóc sau gáy" là cảm nhận của du khách, không phải tư liệu về
bản thân đảo. Vị trí (200, -70) ở phía đông vịnh, gần Ti Tốp như ngoài
đời thật (cách Ti Tốp ~89 đơn vị), cách đảo nhỏ gần nhất ~66 đơn vị và
dãy núi đá vôi gần nhất 117 đơn vị — không chồng lấn. Đảo có đủ: hình
voxel riêng (khối đầu dựng cao ~18, trán nhô, mũi to nhô hướng tây, cằm
sát nước, búi tóc đá sau gáy, bãi cát dưới chân mũi), cây/bụi/dây leo/hoa
trên đỉnh như bờm tóc, đèn dấu đỏ, biển tên, thuyền neo gần bờ, đàn chim
bay vòng quanh, icon `head` riêng trong danh sách tour. Danh sách tour,
proxy bấm 3D, chấm minimap và nút bay tới đều chạy theo dữ liệu
`TOUR_ISLANDS` nên đảo mới tự có đủ đường vào, không sửa riêng từng
chỗ. Chưa đo bằng tay: hình dáng voxel thật của đảo chỉ xem được trên
trình duyệt có WebGL — Sudo bay tới Hòn Đầu Người trên máy thật để chốt
cái mũi + búi tóc có đọc ra ngay không; đồng thời chốt luôn nút danh
sách tour (không bấm được trong harness headless vì lỗi #24 làm danh
sách rỗng).

**Kinh tế chơi đơn (ví local) — ĐÃ QUYẾT (cycle 28, 2026-11-07 —
backlog #19 bước 1, QC/Sudo lật được):** chơi đơn không có server nên
ví + đồ đã mua lưu ở localStorage (`hoilang_local_profile_v1`),
KHÔNG đồng bộ lên server. Mức thưởng y hệt multi: +10 xu/vòng sống
sót, lấy cả Hũ Vàng khi là người sống sót duy nhất (khởi đầu 100 xu +
10 xu mỗi người bị loại), +100 XP/vòng, +500 XP/
thắng, 500 XP/cấp, tối đa cấp 20; lên cấp tự nhận thưởng track miễn
phí (track trả phí không mở vì tier local luôn free). Triển khai:
`client/js/local-economy.js` mới (`window.HoiLocalEconomy` — load/save
có fallback RAM khi localStorage bị chặn/dữ liệu hỏng, `handle()` trả
'handled' / 'server-only' / false); `shop.js` gọi `handle()` trước khi
gửi WS, action chỉ có ở multi (buyPass/giải đấu/cheer/gift/vé tour)
thì toast "chỉ có ở chế độ nhiều người" thay vì gửi WS vô ích; shop +
pass panel ghi chú ví local không đồng bộ; `game.js` cộng xu ở
`localRoundEnd` (chỉ khi người chơi còn sống, trận QC không thưởng) và
hỏi lại profile server khi `joined` multi để ví không còn hiện số dư
local. Nhiệm vụ ngày chơi đơn làm ở cycle 45 (xem mục riêng bên dưới);
chuyển ví sang máy khác bằng mã sao lưu làm ở cycle 52 (xem mục riêng
bên dưới) — #19 HOÀN TẤT.
Chưa đo bằng tay: mua/trang bị thật ở chơi đơn, ví giữ sau khi tải
lại trang, cảm giác số dư khi chuyển chơi đơn ↔ nhiều người.

**Panel Du lịch Hạ Long không bao giờ hiện — ĐÃ QUYẾT (cycle 21,
2026-11-07 — backlog #37, phát hiện khi kiểm #15, QC/Sudo lật được):**
`#tourPanel` có `display:none` trong CSS, `activateExplore()` chỉ gỡ
class `.hidden` — nhưng panel không hề có class `.hidden` từ đầu nên
lệnh gỡ là no-op và panel giữ nguyên 0×0. Bấm DU LỊCH (từ sảnh chờ hay
trong trận) vẫn bay camera + ghi tên/câu chuyện đảo vào `#tourInfo`,
chỉ là không ai nhìn thấy vì panel ẩn — toàn bộ du lịch (danh sách 12
đảo + câu chuyện) không tới được người chơi. Đây là cùng họ lỗi với
panel chat (#20, cycle 5) và banner khán giả: đo hiển thị bằng class
`.hidden` là sai, phải đo bằng computed display — stage capture tour
mới ([9]) nay đo đúng cách đó. Sửa theo đúng mẫu #20:
`#tourPanel.open{display:block}` trong CSS, `activateExplore()` thêm
`.open` khi mở, `exitTour()` gỡ `.open` khi đóng. Cùng lúc sửa ghi chú
`.note` trong panel: màu nâu đậm `#5a4632` (làm cho nền sáng) trên nền
tour tối đọc không ra — nay `#tourInfo .note` màu sáng `#aef2dd`.
Chưa đo bằng tay: danh sách 14 đảo trong panel chỉ hiện khi
`buildTourList()` chạy được, tức là trên trình duyệt có WebGL thật
(headless ở VM trả WebGL null nên danh sách trống trong ảnh chụp) —
Sudo mở tour trên máy thật để chốt danh sách hiện đủ 14 đảo.

**Sự kiện theo mùa — ĐÃ QUYẾT (cycle 25, 2026-11-07 — backlog #16,
P4-06 bước 1, QC/Sudo lật được):** khung sự kiện trong
`client/js/seasonal.js`: mỗi sự kiện có `id`, tên, badge, cửa sổ ngày
dương cố định theo từng năm (`start`/`end` dạng YYYY-MM-DD), thông báo
và class CSS riêng. Phát hiện theo thứ tự: ghi đè URL `?season=<id>` /
`?season=none` thắng localStorage `hoilang_season` (`<id>` / `none`),
thắng ngày hiện tại (so chuỗi ngày địa phương của trình duyệt — người
chơi ở múi giờ khác có thể lệch tối đa 1 ngày ở biên cửa sổ, chấp nhận
được vì chỉ là chủ đề trang trí, không ảnh hưởng luật chơi); giá trị lạ
thì bỏ qua, rơi về logic theo ngày. `applySeason()` gắn class mùa vào
`body` + điền badge `#seasonBadge` trong sảnh chờ; `announceSeason()`
gọi toast đúng 1 lần mỗi lần tải trang. Sự kiện đầu tiên: **Tết Hội
Làng 2027** — cửa sổ 30/01–10/02/2027 (mốc đã kiểm chứng qua web:
mùng 1 Tết Đinh Mùi thứ Bảy 06/02/2027, giao thừa tối 05/02/2027 vì
tháng Chạp chỉ 29 ngày, ông Công ông Táo 30/01/2027, nghỉ lễ chính
thức 04/02–10/02/2027 theo TB 11483/TB-BNV). Chủ đề: badge đỏ/vàng
\"🧧 TẾT HỘI LÀNG · 30/01 – 10/02/2027\" dưới tiêu đề sảnh chờ, viền
card + HUD chuyển tông đỏ/vàng; thông báo toast lúc bắt đầu trận
(\"🧧 Tết Hội Làng — làng đón Tết Đinh Mùi, từ 30/01 đến 10/02/2027!\").
Hai lỗi thật bắt được khi kiểm chứng: (a) hook áp chủ đề lần đầu đặt
trong nhánh `else` của `if (window.THREE)` trong `game.js` nên chỉ
chạy khi THREE lỗi — nay áp vô điều kiện trước khối `if/else` (script
nằm cuối body nên `#seasonBadge` đã có trong DOM); (b) toast mùa bị
toast flyover \"Bay tổng quan…\" ghi đè ngay (cùng dùng một `#toast`
3 giây) — nay `announceSeasonOnce()` trì hoãn 3.5 giây, toast mùa
hiện sau, trong lúc camera đang bay. Chưa làm (bước 2): trò biến thể
Tết (ví dụ lì xì Hội Xu, trống Tết) — P4-06 mới xong chủ đề + thông
báo. Chưa đo bằng tay: cảm giác chủ đề Tết trên trình duyệt thật
trong cửa sổ 30/01–10/02/2027 (ngoài cửa sổ chỉ test được bằng
`?season=tet`), Sudo chốt lại ngày âm lịch mỗi năm trước khi mở
(cửa sổ ghi bằng ngày dương cố định).

**Lì xì Hội Xu Tết ở chơi đơn — ĐÃ QUYẾT (cycle 35, 2026-11-08 — backlog
#16, P4-06 bước 2a, QC/Sudo lật được):** trò biến thể Tết đầu tiên là
lì xì Hội Xu, chỉ ở chơi đơn (ví local, `client/js/local-economy.js`):
khi mùa Tết đang chạy (`window.__season.id === 'tet'`), thưởng vòng
sống sót +10 xu cộng thêm lì xì 8 xu (thành +18), thắng trận lấy cả Hũ
Vàng cộng thêm lì xì 20 xu. Chỉ cộng XU, không cộng XP (tiến
độ Pass không đổi); trận QC không lì xì vì `localRoundEnd` chặn toàn
bộ thưởng khi `qcMode` (FR-46). Số 8/20: 8 là số phát, 20 là lì xì
thắng — nhỏ so với giá shop (60–300 xu) nên không phá cân bằng kinh
tế; chỉ là niềm vui trong 12 ngày Tết. `awardRoundSurvived()` /
`awardWin()` nhận thêm `opts.seasonId` ghi đè rõ (phục vụ test;
`null` nghĩa là ép "không mùa", như `?season=none`); không truyền
thì đọc `window.__season`; message `earned` gửi về shop mang thêm
`lixi` + `seasonId` nên ví HUD cập nhật ngay. `game.js` ở
`localRoundEnd` gộp lì xì cả vòng + thắng rồi toast 1 lần
("🧧 Lì xì Tết: +28 Hội Xu!" khi vừa qua vòng vừa thắng) để không bị
toast khác ghi đè. Đã làm bước 2b ở cycle 36 (lì xì multi, cộng vào ví
server — xem mục ĐÃ QUYẾT ngay sau). Đã làm bước 2c ở cycle 39
(trống Tết — xem mục ĐÃ QUYẾT sau mục lì xì multi). Một lỗi
thật bắt được khi kiểm chứng: lần đầu `seasonId()` chỉ coi chuỗi mới
là ghi đè nên `{seasonId:null}` vẫn rơi về `__season` (lì xì sai khi
đang Tết) — nay khóa `seasonId` có mặt trong opts là có hiệu lực, kể
cả null; test lần 1 rớt 1/23 vì lỗi này, đã sửa code rồi chạy lại đủ.
Chưa đo bằng tay: cảm giác lì xì Tết trên trình duyệt thật khi qua
vòng/thắng trong cửa sổ Tết (toast + ví HUD tăng), Sudo chốt lại ngày
âm lịch mỗi năm trước khi mở (như bước 1).

**Lì xì Hội Xu Tết ở chơi nhiều người — ĐÃ QUYẾT (cycle 36, 2026-11-08 —
backlog #16, P4-06 bước 2b, QC/Sudo lật được):** lì xì Tết nay có cả ở
chơi nhiều người (ví server, `server/economy.js`): khi mùa Tết đang chạy,
thưởng vòng sống sót +10 xu cộng thêm lì xì 8 xu (thành +18), thắng trận
lấy cả Hũ Vàng cộng thêm lì xì 20 xu — cùng mức chơi đơn (cycle 35).
Chỉ cộng XU, không cộng XP; trận QC không lì xì vì hook thưởng ở
`server.js` đã chặn toàn bộ khi `room.qc` (FR-46). Server tự tính mùa
theo ngày ICT (UTC+7), KHÔNG tin mùa client gửi: `?season=tet` của client
chỉ đổi chủ đề/toast, không đổi thưởng — chống cày xu bằng cách giả mùa.
Cửa sổ Tết mirror `client/js/seasonal.js` (30/01–10/02/2027, nguồn chân lý
về ngày đã kiểm chứng); ghi đè để test/QC ngoài cửa sổ bằng env
`HOI_SEASON_OVERRIDE=tet | none`. `awardRoundSurvived()`/`awardWin()`
nhận thêm `opts.seasonId` ghi đè rõ (y hệt chơi đơn; mùa lạ cũng thành
null — không lì xì), trả về thêm `lixi` + `seasonId`; message `earned`
server gửi kèm `amount` tổng (18/70), `lixi`, `seasonId` nên ví HUD cập
nhật ngay; `game.js` toast riêng mỗi lần nhận earned có lixi
("🧧 Lì xì Tết: +8 Hội Xu!" khi qua vòng, "+20 Hội Xu!" khi thắng — vòng
và thắng là 2 thời điểm khác nhau nên không gộp như chơi đơn). Người bị
loại ở vòng đó KHÔNG nhận thưởng vòng (đúng luật loại trừ: chỉ người sống
sót mới được thưởng). Đã làm bước 2c ở cycle 39 (trống Tết — xem mục
ĐÃ QUYẾT ngay sau).

**Trống Tết — ĐÃ QUYẾT (cycle 39, 2026-11-08 — backlog #16, P4-06
bước 2c, QC/Sudo lật được):** biến thể vòng 1 trong mùa Tết, cả chơi
đơn lẫn chơi nhiều người — chỉ đổi hiển thị + nhịp âm thanh, luật
không đổi (trống đánh thì chạy, chiêng vang thì đứng yên). (a) Tên
vòng thành **"Trống Hội Tết"**: chơi đơn qua `tetRoundName()` trong
`client/js/game.js` (áp ở `localNameForRound` vòng 1, `startRoundCommon`
— idempotent nên tên server gửi sẵn không bị cộng 2 lần — và dòng
flyover "VÒNG 1 — …"); chơi nhiều người qua `tetRoundName()` trong
`server/server.js` (`roundEntryFor` + `buildRoundPlan` vòng 1) — server
tự tính mùa theo ngày ICT qua `economy.detectSeason()` (giống lì xì
cycle 36, KHÔNG tin mùa client; ghi đè test/QC bằng env
`HOI_SEASON_OVERRIDE=tet | none`), tên đi theo message `roundStart`
(`name: plan.name`) nên HUD + interstitial + thanh QC đều hiện tên Tết.
(b) Dải trống/chiêng (`#hudState` qua `setPhaseUI()`, cả 2 chế độ):
"🧧 TRỐNG TẾT — Chạy đi!" / "🧧 CHIÊNG TẾT — Đứng yên!" khi mùa Tết;
handler tin `drum` của multi nay gọi `setPhaseUI()` thay vì ghi text
trực tiếp (trước đây 2 chỗ ghi cùng chuỗi — dễ lệch). (c) Nhịp trống
chơi đơn theo mẫu cố định **tum–tum–TUM** (0.42s, 0.42s, 0.84s; tiếng
thứ ba vol 1.0, 2 tiếng đầu vol 0.9) thay vì ngẫu nhiên 0.42–0.62s;
mỗi pha trống bắt đầu lại mẫu (`r1TetBeatIdx = 0` trong `startPhase`);
multi không có vòng lặp nhịp ở client (chỉ 1 tiếng trống mỗi lần đổi
pha theo tin `drum`) nên nhịp Tết chỉ có ở chơi đơn. Mẫu nhịp là hàm
thuần `nextTetBeat(idx)` trong `client/js/seasonal.js` (nguồn chân lý,
test được trong vm); `game.js` gọi qua `window.__seasonal` với bản dự
phòng cùng giá trị. P4-06 HOÀN TẤT sau bước này (chủ đề + lì xì đơn +
lì xì multi + trống Tết). Một lỗi thật bắt được khi kiểm chứng: probe
lần 1 chờ vòng 1 qua nút CHƠI ĐƠN thì kẹt mãi ở flyover — `animate()`
chết khi WebGL null (#24 đã biết) nên flyover không chạy hết; nay
probe nhảy QC thẳng vòng 1 qua `__game.qcJumpSingle(1)` (mới lộ trên
cầu nối `__game` cho mục đích này), còn nhịp trống trong headless vẫn
không log được vì `updateSingleR1` chỉ chạy theo từng frame của
`animate()` — mẫu nhịp đã kiểm trong vm thay cho probe. Chưa đo bằng
tay: nghe nhịp tum–tum–TUM + thấy tên/dải Tết trên trình duyệt thật
trong cửa sổ Tết (ngoài cửa sổ chỉ test được bằng `?season=tet` /
`HOI_SEASON_OVERRIDE=tet`); cảm giác trống Tết có đủ "Tết" không.

**HUD gọn 1 dòng ở mọi vòng — ĐÃ QUYẾT (cycle 37, 2026-11-08 — backlog
#22, QC/Sudo lật được):** dải trạng thái (`#hudState`) chỉ ghi TÊN trò
("Rồng Rắn Cướp Cờ", "Nhảy Bao Bố", "Bịt Mắt Bắt Dê", ...), ô VÒNG
(`#hudRound`) chỉ ghi số vòng ("VÒNG 5"), KHÔNG nối luật chơi hay tên
trò vào 2 ô này nữa. Trước đây sim vòng 3+ gọi `setHudDrum("Tên — luật")`
(chuỗi ~40 ký tự ở 19px) và `#hudRound` ghi "VÒNG 5 — Rồng Rắn Cướp
Cờ (CHUNG KẾT)" nên cả hai plate xuống 2 dòng, chữ tràn ra ngoài đè
lên thanh tiến độ, nhãn "ĐẾM NGƯỢC" cũng gãy 2 dòng (ảnh
06-round5/06-round6-sim.png, 2026-11-06). Luật chơi không mất: vẫn ở
overlay đầu vòng + dải gợi ý phím `#roundHint` + trạng thái riêng của
trò (vd. `#flag-status` ở Rồng Rắn); tên đầy đủ + CHUNG KẾT + mục tiêu
giữ lại của vòng chuyển vào `title` (tooltip) của ô VÒNG. CSS khóa
thêm để chuỗi dài sau này không bao giờ làm HUD cao lên đè thanh tiến
độ: `.stat b` / `.stat span` `white-space:nowrap` (ô tự rộng ra thay
vì cao lên), `#hudState` / `#stateSub` `nowrap` + `overflow:hidden` +
`text-overflow:ellipsis`, `#statePlate` `max-width:min(420px,52vw)`
(desktop; mobile giữ `flex:1 1 auto` không giới hạn). Đo thật:
desktop 1280×800 đáy HUD 70px < đỉnh thanh tiến độ 74px, mobile 360px
110px < 114px, không plate nào giao rect thanh tiến độ; nhét lại chuỗi
dài cũ vào `setHudDrum` thì plate vẫn 1 dòng, chữ cắt bằng "…". Chưa
đo bằng tay: cảm giác đọc HUD trên trình duyệt/điện thoại thật khi
đang chạy (tên trò ngắn có đủ rõ luật không — luật vẫn ở gợi ý phím
12 giây đầu vòng).
Hai lỗi thật bắt được khi kiểm chứng: (a) test lần 1 dùng WebSocket
global của Node (không có `.on`) — phải require `ws` từ repo
node_modules như các test live trước; (b) test live lần 1 bước theo poll
300ms để 1 người dính chiêng (broadcast 'gong' đến chậm hơn lệnh bước) —
nay bước theo sự kiện: burst 3 bước ngay khi nhận broadcast 'drum' mới
(lần chuyển sang chiêng tiếp theo luôn ≥2.5s sau); (c) test live lần 1
kiểm ví tuyệt đối 18 xu nhưng id người chơi là số tăng dần (1, 2, ...)
nên profile cũ trong `data/economy.json` (270 xu từ các cycle trước) làm
lệch — nay test ghi file economy rỗng trước mỗi lần chạy server live và
restore lại sau. Chưa đo bằng tay: cảm giác lì xì Tết ở multi trên trình
duyệt thật khi qua vòng/thắng trong cửa sổ Tết; Sudo chốt lại ngày âm
lịch mỗi năm trước khi mở (như bước 1).

**Card sảnh chờ 2 cột ở màn hình rộng + thấp, HUD ẩn ở sảnh chờ — ĐÃ QUYẾT (cycle 38, 2026-11-08 — backlog #23, QC/Sudo lật được):** ở 1280×800, card sảnh chờ 1 cột cao 1340px trong khi chỉ thấy 736px (92vh) nên nút CHƠI ĐƠN / CHƠI NHIỀU NGƯỜI (y 889–935) + mục QC (y 1011–1092) nằm dưới nếp gấp, phải cuộn trong card; dải HUD trên cùng hiện ngay từ lúc tải trang ("VÒNG 1 / ĐẾM NGƯỢC 0:00 / CÒN LẠI 61" — trạng thái trận chưa bắt đầu) nên card (top 32px) che mất nửa chip "VÒNG 1". Sửa: (a) nội dung card chia 2 cột `.lobby-cols` (trái: giới thiệu + luật; phải: nút chơi + tên/phòng + QC + phím tắt), chỉ bật ở `@media (min-width:1280px) and (max-height:860px)` với card rộng 900px — ngưỡng rộng 1280px (không phải 1100px) để mép phải card (x≈1090) không chồng cột nút kinh tế `#econBar` (x≈1098, z-index 21 khi sảnh chờ mở — cycle 30); ngoài dải này 2 div cột chỉ là block thường, layout 1 cột như cũ (mobile 360px không đổi); (b) `#hud` ẩn ngay lúc tải trang (chỉ ẩn `#hud`, minimap + nút CHAT giữ nguyên vì sảnh chờ vẫn dùng); `showHUD(true)` lúc bắt đầu trận gỡ `.hidden`, `showHUD(false)` lúc về menu gắn lại. Đo thật ở 1280×800: card scrollH 702 < clientH 728 (không cuộn), mọi nút + QC + phím tắt trên nếp gấp 800px, HUD hiện lại khi vào trận với ô VÒNG "VÒNG 1". Chưa đo bằng tay: cảm giác đọc card 2 cột trên trình duyệt thật ở 1280×800 (cột phải có chật không; nút CHƠI NHIỀU NGƯỜI gãy 2 dòng có khó chịu không).

**Fallback khi WebGL lỗi — ĐÃ QUYẾT (cycle 40, 2026-11-08 — backlog #24, QC/Sudo lật được):** trước đây `buildWorld()` tạo `new THREE.WebGLRenderer` không try/catch — trên trình duyệt/thiết bị không có WebGL (hoặc tắt tăng tốc phần cứng) lỗi là uncaught pageerror, `animate()` không bao giờ chạy, game đóng băng (Vòng 1 kẹt "SẴN SÀNG", Vòng 2 crash ở `assignTeamsAndPlace` vì figure chưa được tạo); và `buildTourList()` nằm cuối `buildWorld` nên danh sách tour rỗng (0 nút) — tour mất đường vào bằng danh sách. Sửa: (a) try/catch quanh renderer (kèm kiểm `renderer.getContext()` null), lỗi thì `buildWorld()` trả `false`, hiện banner `#webglError` ("Trình duyệt này không chạy được đồ họa 3D" + hướng dẫn bật tăng tốc phần cứng / cập nhật trình duyệt / driver, nút ĐÃ HIỂU để đóng) và vô hiệu hoá 5 nút vào trận (`btnStart`, `btn-single`, `btn-multi`, `btn-create`, `btn-join`); (b) `startApp()` mới gom 2 nhánh khởi động (THREE sẵn / chờ DOMContentLoaded): `buildTourList()` + `drawMinimap()` + chat luôn chạy kể cả khi WebGL lỗi, chỉ `buildPoiProxies()` + `animate()` chạy khi thế giới 3D dựng xong; `animate()` thêm guard `if (!renderer) return;` phòng thủ; `window.__game.webglFailed` lộ cờ cho probe/perf. Trận 3D vẫn không chơi được khi không có WebGL — đó là giới hạn thật, banner nói rõ, không giả vờ chạy được. Harness `tools/capture.js` thêm `dismissWebglError()` (bấm ĐÃ HIỂU thật) gọi kèm `dismissOnboarding()` ở mọi stage — ở headless VM này WebGL luôn null nên banner luôn hiện và chặn click; stage lobby cũng tắt banner (banner không thuộc UX trình duyệt thật, bản thân banner đã chụp riêng ở probe cycle 40). Đo thật ở headless (WebGL null): 0 pageerror lúc tải trang, tour list đủ 14 nút, chat + tour mở/đóng được. Chưa đo bằng tay: banner + nút bị vô hiệu trên trình duyệt thật không có WebGL (thiết bị cũ / tắt tăng tốc phần cứng).

**Nút kinh tế ở sảnh chờ — ĐÃ QUYẾT (cycle 30, 2026-11-07 — backlog #21,
QC/Sudo lật được):** cột nút phải (`#econBar`: CỬA HÀNG / VÉ MÙA / GIẢI
ĐẤU / QUÀ TẶNG / THOÁT GAME) phải bấm được bằng chuột thật ngay từ sảnh
chờ, không cần vào trận trước. Trước đây overlay `#startCard`
(`position:fixed; inset:0; z-index:20`) phủ lên cột nút (`z-index:6`)
nên `elementFromPoint` tại tâm nút trả về `startCard` — bấm chuột thật
không mở được shop dù nút vẫn nhìn thấy (chỉ bấm được bằng JS `.click()`).
Sửa bằng CSS, không đổi JS: `@media (min-width:900px){
#startCard:not(.hidden) ~ #econBar{z-index:21;} }` — `#startCard` ẩn/hiện
bằng class `.hidden` do `game.js` gắn/gỡ, `#econBar` là sibling sau nó
nên dùng được `~`. Cột nút nổi lên trên overlay sảnh chờ (z 21) nhưng vẫn
dưới panel shop (33), onboarding (40) và toast (40) nên onboarding vẫn
chặn đúng như thiết kế (người mới phải bấm "Bỏ qua hướng dẫn" / "ĐÃ HIỂU"
trước). Chỉ áp từ 900px trở lên: card sảnh chờ rộng tối đa 520px căn giữa
nên dưới ~884px cột nút bắt đầu chồng mép phải card — màn hẹp
(mobile/tablet) giữ nguyên trạng thái cũ (nút kinh tế vẫn bị overlay chặn
ở sảnh chờ, vào trận rồi mới bấm được), chờ sửa layout sảnh chờ ở #23/#31.
Không chọn `pointer-events:none` cho overlay: click sẽ xuyên qua vùng mờ
tới canvas 3D (bấm nhầm đảo → bay tour, kéo xoay camera) trong lúc card
sảnh chờ đang mở. Chưa đo bằng tay: bấm CỬA HÀNG thật ở sảnh chờ trên
trình duyệt/máy thật + cảm giác cột nút nổi trên nền mờ có rõ là bấm được

**Nhãn nút QC phải khớp đúng trò khi nhảy vòng — ĐÃ QUYẾT (cycle 43, 2026-11-08 — backlog #25, QC/Sudo lật được):** trước đây `localPoolCycle()` lấy seed từ `matchStartAt` — 0 lúc ở sảnh (nhãn V3/V4/V5 tính bằng seed 1) nhưng `Date.now()` lúc nhảy vòng (`qcJumpSingle` đặt lại `matchStartAt`) — nhãn và trò thật xáo kho khác nhau: panel QC ghi "V4 · Bịt Mắt Bắt Dê · 9 người" nhưng nhảy thẳng V4 lại vào "Ô Ăn Quan" (đo bằng `localRng` thật: seed 1 cho V4 = Bịt Mắt, seed `Date.now()` 1794123425898 cho V4 = Ô Ăn Quan). Sửa: seed riêng `localPoolSeed` cho việc bốc kho chơi đơn — cố định 1 lần/phiên QC ngay lần đầu nhãn hiện (`renderQcButtons`: `if (qcMode && !localPoolSeed) localPoolSeed = Date.now()`), trận thường bốc seed mới mỗi trận (`startSingle`: `if (!qcMode) localPoolSeed = Date.now()`), về menu reset seed + vẽ lại nhãn (`exitToMenu`); `qcJumpSingle` vẫn đặt lại `matchStartAt` (đồng hồ trận + seed xáo lượt V2) nhưng không còn ảnh hưởng bốc kho. Cùng lỗi ở multi: V6–V8 không có entry trong plan server (`buildRoundPlan` chỉ tới V5) nên trước đây rơi vào `localNameForRound` (seed local) — nay ghi "Vòng n · bốc từ kho" cho mọi vòng ≥ 3 chưa có plan, chỉ tin tên trong plan server gửi. Đo thật: test `hidden_files/qc-v4-label-test.js` 30/30 PASS (tái hiện lỗi cũ + nhãn == trò thật với 6 seed + renderQcButtons đơn/multi), probe trình duyệt thật `hidden_files/qc-v4-label-probe.js` 20/20 PASS (bấm thật V4 → vào đúng trò trong nhãn, nhảy giữa trận sang V3 vẫn khớp, về menu bốc seed mới rồi nhảy lại V4 vẫn khớp), ảnh `tools/captures/2026-11-08-cycle43/` đã đọc bằng mắt. Chưa đo bằng tay: bấm nút QC V4 trên trình duyệt thật rồi xem có vào đúng trò trong nhãn không (headless chỉ kiểm DOM/HUD).
không.
**Dải strip sim Ô Ăn Quan phải theo lượt thật, không chờ khung animate — ĐÃ QUYẾT (cycle 44, 2026-11-08 — backlog #26, QC/Sudo lật được):** trước đây dải strip của sim (điểm + lượt) chỉ cập nhật trong `update()` theo khung `animate()`; khi WebGL lỗi (`startApp` không gọi `animate` khi `buildWorld` false, #24) thì `Rounds.update` không bao giờ chạy nên strip kẹt ở chữ mặc định lúc `buildDom` là "Đang chờ lượt…" trong khi overlay (`oqRender`, vẽ đồng bộ) đã ghi "Tới lượt bạn" (ảnh 06-round4-sim.png, 2026-11-06). Gốc đã đo: strip là chữ mặc định, overlay là lượt thật — strip không sai luật, chỉ không được cập nhật. Sửa: tách `syncStrip(s)` trong `client/js/sim/sim-oanquan.js` — gọi ở cuối `build()` (strip bắt đầu đúng lượt thật), giữ ở `update()`, lộ `sync(st)` trên `window.RoundSims['o-an-quan']`; `oqRender()` trong `client/js/rounds.js` gọi `activeSim.sync(st)` (có guard, vì lúc `start` sim chưa build xong) mỗi lần vẽ lại lượt — `oqRender` là phễu duy nhất (start / sow / bot / `oanquanState` / resolve) nên mọi lần đổi lượt đều đồng bộ strip ngay, kể cả khi `animate` chết. Chữ trong strip giữ nguyên ("Tới lượt bạn…" / "Đối thủ đang đi…" / "Hết ván…"), chỉ sửa thời điểm cập nhật. Đo thật: test `hidden_files/oanquan-strip-test.js` 17/17 PASS (build đã đúng lượt không cần `update()`, `sync()` đổi lượt/điểm/hết ván không cần `update()`, `update()` vẫn đồng bộ như cũ, `sync()` an toàn khi chưa có phiên), probe trình duyệt thật `hidden_files/oanquan-strip-probe.js` 15/15 PASS (WebGL null, vào vòng strip "Tới lượt bạn" khớp overlay, bấm ô 3 thật thì strip đổi "Đối thủ đang đi…" ngay trước khi bot đi 700ms, bot đi xong strip về lại "Tới lượt bạn", 0 pageerror mới), ảnh `tools/captures/2026-11-08-cycle44/` đã đọc bằng mắt. Quan sát phụ (không sửa trong cycle này, thuộc #32): dải `#roundHint` (top 122px, z-index 7) nằm cùng dải với strip sim (top 118px, z-index 25) nên strip che nửa dải gợi ý phím trong 12s đầu vòng Ô Ăn Quan — ghi thêm vào #32. Chưa đo bằng tay: strip đổi lượt trên trình duyệt thật có WebGL (headless chỉ kiểm DOM).

**Font + favicon tự host, không còn request ra Google Fonts — ĐÃ QUYẾT (cycle 46, 2026-11-08 — backlog #27, QC/Sudo lật được):** trước đây mỗi lần tải trang trình duyệt xin `/favicon.ico` (không có file → 404) và tải CSS font từ `fonts.googleapis.com` (trong VM lỗi `ERR_SSL_PROTOCOL_ERROR`; trên máy chặn Google Fonts thì mất font chính, rơi về system-ui). Sửa: (a) font Be Vietnam Pro tự host — 8 file woff2 trong `client/fonts/` (4 trọng lượng 500/700/800/900 × 2 subset vietnamese+latin, tổng ~133KB, tải từ Google Fonts API ngày 2026-11-08, licence OFL), `@font-face` trong `client/css/fonts.css` mới với `unicode-range` y hệt bản Google trả để trình duyệt chỉ tải subset cần dùng; `index.html` bỏ 3 dòng preconnect/stylesheet Google, thêm `css/fonts.css` + `<link rel="icon" href="/favicon.ico">`; (b) favicon mới `client/favicon.ico` 32×32 (nền đỏ #d63c2f, trống vàng + 2 dùi trắng, vẽ bằng PIL); (c) `server/server.js` thêm MIME `.woff2: font/woff2`, `.woff: font/woff`, `.ico: image/x-icon`, `.svg: image/svg+xml` (trước đây các đuôi này rơi về `application/octet-stream`). Không còn request nào ra `fonts.googleapis.com` / `fonts.gstatic.com` — trang chạy được hoàn toàn offline (trừ fallback CDN Three.js khi file local lỗi, #11). Đo thật: probe trình duyệt thật `hidden_files/favicon-font-probe.js` 18/18 PASS (0 pageerror, 0 request Google Fonts, `/favicon.ico` + `/css/fonts.css` + 8 woff2 đều 200, `document.fonts.check` đủ 4 trọng lượng, canvas đo chữ Việt "Trống Hội" khác độ rộng fallback sans-serif nên font thật đã tải, 0 request ≥ 400), ảnh `tools/captures/2026-11-08-cycle46/01-lobby-font.png` đã đọc bằng mắt (tiêu đề + nút hiện đúng Be Vietnam Pro, dấu tiếng Việt đủ). Chưa đo bằng tay: favicon có hiện trên tab trình duyệt thật không; cảm giác font trên máy thật (headless chỉ kiểm DOM + độ rộng chữ).

**Dải team + dải gợi ý phím chừa cột minimap ở tablet 621–900px — ĐÃ QUYẾT (cycle 47, 2026-11-08 — backlog #31, QC/Sudo lật được):** trước đây ở dải tablet không có luật riêng: `#teamPanel` 600px căn giữa đè ngang lên minimap (đo thật: 800px chồng 3760px², 621px chồng 7285px², 700px chồng 6110px², 900px chồng 1410px²); `#roundHint` 640px căn giữa cũng có thể chạm minimap khi chữ dài. Sửa: thêm `@media (min-width:621px) and (max-width:900px)` — đặt SAU luật gốc `#roundHint` để left/transform/max-width trong này thắng luật gốc (cùng độ ưu tiên, luật sau thắng) — cả hai dải đều `left:6px; right:190px; transform:none; width:auto; max-width:none`, dạt sang trái chừa cột minimap như mobile (≤620px). MinimapWrap rộng ~170px ở right:10px (đo thật: nhãn "BẢN ĐỒ · ĐẢO HỘI LÀNG" + chú thích làm nó rộng hơn canvas 132px; cạnh trái x=vw-180) nên right:190px để hở 10px — lần sửa đầu right:168px tính theo 150px nên vẫn chồng 12px ngang (564px²), đã sửa lại. Top giữ nguyên như desktop (HUD 1 hàng ở dải này: gợi ý top 122px, team top 182px; team cao ~47px nên đáy ~229px, vẫn trên cột econBar bắt đầu top 336px). Đo thật: probe trình duyệt thật `hidden_files/team-panel-tablet-probe.js` 48/48 PASS (6 viewport 621/700/800/900/1280/360: teamPanel + roundHint đều không chồng minimap/cột econBar, nằm gọn trong viewport, 0 pageerror mới), ảnh `tools/captures/2026-11-08-cycle47/01-800-tablet-round2.png` + `01-621-tablet-round2.png` đã đọc bằng mắt (minimap hiện đủ, không dải nào chạm vào). Lưu ý đo: probe hiện 2 dải trực tiếp với nội dung thật của vòng 2 (không chạy flow vòng 2 thật) vì ở headless WebGL null, `assignTeamsAndPlace()` chạm `fig.userData.shirtMat` chưa được tạo nên crash — chỉ là đường probe, sản phẩm thật không gặp vì #24 đã vô hiệu hoá nút vào trận khi không có WebGL. Chưa đo bằng tay: nhìn dải team + gợi ý trên tablet thật ở vòng 2 (headless chỉ kiểm rect DOM; ảnh chụp ở sảnh chờ nên card sảnh che mất phần phải của 2 dải trong ảnh).

**Dải cue của sim không còn đè lên dải gợi ý phím #roundHint — ĐÃ QUYẾT (cycle 48, 2026-11-08 — backlog #32, QC/Sudo lật được):** trước đây cả 6 dải cue của sim đều ở top 118px, đúng vùng của #roundHint (desktop top 122px, đáy ~160px; mobile top 162px, đáy tới ~229px) trong 12 giây đầu vòng: Bịt Mắt / Rồng Rắn / Ô Ăn Quan / Kéo Co (z-index 25–33) đè lên gợi ý, còn Nặn Tò He / Nhảy Bao Bố (z-index 6 < 7) thì bị gợi ý che — cùng một họ lỗi, chỉ khác chiều đè. Sửa: dời cả 6 dải xuống dưới gợi ý + chừa cột minimap như #roundHint — desktop top 166px (đáy gợi ý ~160px); tablet 621–900px top 184px vì gợi ý xuống 2 dòng ở 621px (đáy ~177px) + `left:6px; right:190px`; mobile ≤620px top 236px (gợi ý đáy tối đa ~229px) + `left:6px; right:160px` (chừa cả minimap lẫn cột econBar mobile bắt đầu x=204px; luật hop cũ `width:calc(100vw - 170px)` chừa minimap thiếu ~18px ở dải 621–700px nên bỏ). Kéo theo 2 chỗ: (a) overlay di chuyển `#round-overlay.sim-mode.move-mode` (chỉ Rồng Rắn + Bịt Mắt làm dê, trên cảm ứng) phải nằm dưới dải cue — top 184px → 245px (cảm ứng, mọi bề rộng) và 226px → 328px (mobile ≤620px); (b) tấm overlay bottom-sheet `#round-overlay.sim-mode` trên mobile bị dải Ô Ăn Quan / Tò He (cao ~110–128px, đáy ~344–364px) chạm đỉnh (tấm bị đẩy lên tới y=346px ở màn 640px) nên giới hạn `max-height:max(150px,calc(100vh - 384px))` để đỉnh tấm luôn ≥ 372px, không phụ thuộc chiều cao màn hình; đồng thời thu chữ + đệm của 2 dải này trên mobile (Ô Ăn Quan 12px/padding 3px, Tò He padding 4px) cho dải gọn lại. Gợi ý Tò He rút ngắn 1 cụm ("bấm NỘP BÀI" → "NỘP BÀI", bản chạm bỏ cụm NỘP BÀI vì nút đã hiện trong overlay) để gợi ý mobile còn tối đa 3 dòng như các vòng khác (trước đây 4 dòng, đáy 245px). Đo thật: probe trình duyệt thật `hidden_files/roundhint-strip-probe.js` **176/176 PASS** (6 trò × 4 viewport 1280/800/621/360 + 2 trường hợp cảm ứng 360/800 cho Rồng Rắn: dải nằm dưới gợi ý, không đè minimap/cột econBar/overlay, 0 pageerror mới; lần chạy đầu 155/176 do 3 lỗi đo/sửa: gợi ý xuống 2 dòng ở 621px, dải mobile chạm tấm overlay, nhãn QC thiếu trò vì mỗi phiên QC chỉ hiện 2/5 trò kho ở V3–V4 — đã sửa đủ rồi chạy lại; Kéo Co mobile 360px phải thử 10 phiên QC mới gặp nhãn vì tỉ lệ hiện 2/5 mỗi phiên). Ảnh `tools/captures/2026-11-08-cycle48/360-o-an-quan.png` + `1280-rong-ran.png` + `800-rong-ran.png` + `touch-360-rong-ran.png` đã đọc bằng mắt (gợi ý + dải đều đọc đủ, minimap nguyên vẹn); capture full `tools/captures/2026-11-08-cycle48-full/` không hồi quy (ảnh 01/01b đã đọc bằng mắt — onboarding bước 1 đọc được cả desktop + mobile; results.json: cardScroll 800/800, chat flex, shop panelVisible, tour listCount 14; console-log.json chỉ còn 24 dòng #24 WebGL null). Lưu ý đo: dải Rồng Rắn trên ảnh headless hiện trống chữ vì chữ của dải chỉ được ghi trong `update()` của sim (chạy theo khung animate) mà animate chết theo #24 — trên trình duyệt thật chữ hiện sau ~1 khung hình, không phải lỗi sản phẩm; cảm giác đọc dải cue khi đang chơi thật + vị trí mới trên tablet/cảm ứng thật vẫn chỉ Sudo test tay mới chốt được. Chưa đo bằng tay: dải cue + gợi ý trên tablet thật ở vòng 3–5, trên điện thoại thật khi đang chơi Rồng Rắn (cảm ứng).

**Thoát chủ động xóa slot ngay bằng message 'leave' — ĐÃ QUYẾT (cycle 49, 2026-11-08 — backlog #34, QC/Sudo lật được):** trước đây thoát game chỉ đóng WS, server giữ slot 30 giây grace rồi mới xóa — người khác thấy phòng vẫn đầy, host rời thì host mới phải chờ 30 giây mới được chuyển. Mới: client `exitToMenu()` gửi `{type:'leave'}` trước khi đóng WS (chỉ khi `mode === 'multi'`; chơi đơn không gửi); server hủy reconnectToken của người rời (clear timeout + xóa khỏi `reconnectTokens`, `player.reconnectToken = null`, `info.roomCode = null` để handler 'close' chạy sau đó early-return) rồi gọi `removePlayerFromRoom(..., 'leave')` ngay — broadcast `players` mới lập tức, host chuyển ngay cho người còn WS, phòng hết người thì xóa khỏi danh sách. Đóng tab/rớt mạng đột ngột (không qua exitToMenu) vẫn giữ grace 30 giây để reconnect được; gửi 'leave' 2 lần thì lần 2 bỏ qua (player đã bị xóa), không crash; rời giữa vòng 1 thì `checkRound1End` chạy như khi hết grace. Đo thật: test `hidden_files/leave-message-test.js` **18/18 PASS** (live WS cổng 3996: rời sảnh chờ thì người còn lại thấy slot trống trong <2 giây, host chuyển ngay, reconnect bằng token cũ bị lỗi, cả 2 rời thì phòng biến khỏi list, đóng đột ngột thì slot vẫn còn sau 1.5 giây, leave 2 lần + leave giữa vòng 1 không crash); probe trình duyệt thật `hidden_files/leave-message-probe.js` **8/8 PASS** (bấm TẠO PHÒNG gửi create, vào sảnh multi, bấm THOÁT GAME gửi đúng 1 leave trước khi WS đóng rồi về màn chính, chơi đơn không gửi leave, 0 pageerror mới). Ảnh `tools/captures/2026-11-08-cycle49/01-leave-lobby.png` + `02-after-exit.png` đã đọc bằng mắt (sảnh chờ multi đúng + nút THOÁT GAME đỏ, về màn chính thấy toast "Đã thoát về màn chính."); capture full `tools/captures/2026-11-08-cycle49-full/` không hồi quy (ảnh 01/01b đã đọc bằng mắt; console-log.json chỉ còn 24 dòng #24 WebGL null). Chưa đo bằng tay: thoát thật trên trình duyệt thật rồi nhờ người khác vào phòng ngay xem slot có trống tức thì không; cảm giác thoát giữa trận (có hỏi confirm không).

**Nút THOÁT GAME riêng trên màn kết thúc trận — ĐÃ QUYẾT (cycle 50, 2026-11-08 — backlog #35, QC/Sudo lật được):** trước đây overlay `#teamCard` (z-index 20) che cột menu phải `#econBar` (z-index 6) nên nút THOÁT GAME ở đó không bấm được khi bảng xếp hạng cuối trận đang hiện — người chơi xong trận chỉ còn cách bấm "Chơi lại từ vòng 1". Đo thật ở trạng thái trận thật (sảnh chờ đã ẩn): `#econBar` về z-index 6 (luật cycle-30 chỉ nâng nó lên 21 khi `#startCard` còn hiện), `elementFromPoint` tại nút THOÁT GAME cột phải trả về `teamCard`. Mới: nút `#btnRankExit` "THOÁT GAME" trong card kết quả, ngay dưới nút chơi lại — chỉ hiện ở chế độ ranking (CSS `.rankOnly`: ẩn mặc định, `#teamCard.ranking .rankOnly{display:block}` căn giữa, chế độ team thì ẩn), màu đỏ sẫm `.bigBtn.danger` (#991b1b, như `.specBtn.danger`) để phân biệt với nút chơi lại đỏ tươi; bấm là `exitToMenu()` — phase `'finished'` không nằm trong diện hỏi xác nhận nên thoát thẳng về màn chính, multi gửi `'leave'` như thường (cycle 49). Không chọn cách nâng `#econBar` lên trên overlay như cycle 30: ở mobile 360px cột nút sẽ đè lên nửa phải bảng xếp hạng. Đo thật: probe trình duyệt thật `hidden_files/rank-exit-probe.js` **17/17 PASS** (desktop 1280×800 + mobile 360×640: nút hiện đúng chế độ, `elementFromPoint` tại tâm nút trả về chính nút, bấm thật bằng chuột thì phase về `'menu'`, teamCard ẩn, startCard hiện, toast "Đã thoát về màn chính.", 0 pageerror mới), ảnh `tools/captures/2026-11-08-cycle50/01-ranking-desktop.png` + `03-ranking-mobile.png` đã đọc bằng mắt. Chưa đo bằng tay: bấm THOÁT GAME trên màn kết thúc trận thật trên trình duyệt thật (sau 1 trận chơi đơn/multi thật); cảm giác 2 nút đỏ cạnh nhau có dễ bấm nhầm không.

**Sảnh chờ multi có phase riêng `'lobby'` — ĐÃ QUYẾT (cycle 51, 2026-11-09 — backlog #38, QC/Sudo lật được):** trước đây sau khi vào phòng multi, `phase` vẫn là `'menu'` (handler `'joined'` không đặt phase sảnh chờ) nên mọi chỗ dựa vào `phase === 'menu'` đều lẫn màn chính với sảnh chờ — cycle 31 chỉ sửa tối thiểu ở `exitToMenu()` (`phase === 'menu' && mode !== 'multi'`). Mới: (a) handler `'joined'` đặt `phase = 'lobby'` ngay sau `mode = 'multi'` (server cũng dùng `'lobby'` và gửi kèm trong tin `'joined'` — nhưng 2 đường create/join của server trước đây KHÔNG gửi `phase`, chỉ reconnect/khán giả có, đã thêm `phase: room.phase` vào cả 2); khối vào giữa trận ghi đè thành `'round*'` qua `startRoundCommon`, khối khán giả ghi đè thành `'spectator'`; (b) `canExplore()` thêm `phase === 'lobby'` để du lịch Hạ Long vẫn mở được từ sảnh chờ; (c) vòng lặp animate dùng chung nhánh camera menu cho `'lobby'` (quay chậm sau lưng đoàn người) và `updateCamera` không chạy ở lobby như ở menu — nếu không `updateCamera` (bám người chơi/khán giả) giành lại camera mỗi khung hình; (d) `exploreReturn.menu` vẫn chỉ true ở màn chính thật nên thoát tour từ sảnh chờ không hiện lại menu; (e) `exitToMenu()` gọn lại chỉ no-op khi `phase === 'menu'` (điều kiện `mode !== 'multi'` thừa từ cycle 31 đã bỏ). Kèm: vào làm khán giả giữa trận (phase team) thì phase là `'spectator'` thay vì kẹt ở `'lobby'` — camera khán giả theo người dẫn đầu được thay vì quay chậm kiểu menu. Đo thật: test `hidden_files/lobby-phase-test.js` **15/15 PASS** (tĩnh 10/10 + live WS cổng 3998: server gửi `phase: 'lobby'` trong tin `joined` ở cả create/join + list phòng); probe trình duyệt thật `hidden_files/lobby-phase-probe.js` **11/11 PASS** (3 trang: sảnh chờ phase lobby + menu ẩn + lobby-info ghi mã phòng; DU LỊCH từ sảnh chờ mở panel tour, thoát tour thì menu không hiện lại, phase vẫn lobby; THOÁT GAME ở sảnh chờ gửi đúng 1 leave, về màn chính, không hộp xác nhận; vào giữa trận vòng 1 thì phase round1; vào làm khán giả phase team thì phase spectator + banner hiện tên người còn sống; 0 pageerror mới cả 3 trang). Ảnh `tools/captures/2026-11-09-cycle51/01-lobby.png` + `02-tour-lobby.png` + `03-after-exit.png` đã đọc bằng mắt; capture full `tools/captures/2026-11-09-cycle51-full/` không hồi quy (ảnh 01/01b đã đọc bằng mắt; console-log.json chỉ còn 24 dòng #24 WebGL null). Chưa đo bằng tay: vào phòng multi thật trên trình duyệt thật rồi mở du lịch + thoát tour xem có ở lại sảnh chờ không; cảm giác camera quay chậm ở sảnh chờ (có phân biệt được với màn chính không).

**Chuyển ví chơi đơn sang máy khác bằng mã sao lưu — ĐÃ QUYẾT (cycle 52, 2026-11-09 — backlog #19 bước 3, QC/Sudo lật được):** không có hệ thống tài khoản nên không có đồng bộ tự động lên server — quyết định chống cày xu cycle 28 giữ nguyên (ví chơi đơn KHÔNG lên server, ví multi vẫn riêng). Thay vào đó là mã sao lưu xuất/nhập thủ công trong panel Cửa hàng (mục "Sao lưu ví chơi đơn", chỉ hiện khi kinh tế chạy local): `local-economy.js` xuất mã `HOI1.<base64url(JSON profile)>.<checksum>` (checksum lăn 8 ký tự hex, chỉ chống gõ sai — ai có mã cũng nhập được ví nên chỉ gửi mã cho chính mình); nhập mã sẽ THAY toàn bộ ví local trên máy đích (xu, đồ đã mua, cấp/XP Pass, cosmetics, nhiệm vụ ngày — không cộng dồn), mã sai định dạng/sai checksum/profile không hợp lệ đều bị từ chối và ví cũ giữ nguyên, profile thiếu `quests` thì migrate như profile cũ. `shop.js` vẽ mục sao lưu (textarea mã xuất + nút Lấy mã/Sao chép mã + ô nhập mã + nút Nhập), giữ mã xuất + thông báo chuyển ví trong biến module để vẽ lại panel không làm mất. Đo thật: test `hidden_files/wallet-transfer-test.js` **43/43 PASS** (vm: định dạng mã, round-trip khôi phục đủ, sửa 1 ký tự payload/checksum bị từ chối, 11 mã sai định dạng + profile không hợp lệ bị từ chối, nhập thay ví cũ, export/import qua `shop.send`, multi không chạy local); probe trình duyệt thật `hidden_files/wallet-transfer-probe.js` **12/12 PASS** (kiếm 30 xu, xuất mã HOI1. ra textarea, xóa localStorage + tải lại trang về 0 xu, nhập mã thật về lại 30 xu, nhập mã sửa 1 ký tự báo lỗi + ví giữ 30 xu, nút Sao chép mã báo kết quả, 0 pageerror mới), ảnh `tools/captures/2026-11-09-cycle52/01-export-code.png` + `02-imported.png` đã đọc bằng mắt (mục sao lưu + mã HOI1. đọc rõ, ví HUD 30 xu; nút "Nhập mã sao lưu" nằm sát mép dưới panel — panel cuộn được nên vẫn bấm được, chỉ cần cuộn xuống). Chưa đo bằng tay: copy mã từ máy này dán sang máy khác thật; cảm giác nhập mã trên điện thoại (mã dài ~300 ký tự).

**Toast không che cột nút menu phải ở màn hẹp — ĐÃ QUYẾT (cycle 53, 2026-11-09 — backlog #36, QC/Sudo lật được):** trước đây `#toast` ở `bottom:96px` căn giữa, màn hẹp thì đè lên cột `#econBar` trong 3s đầu trận (đo thật: 360×640 toast y450–544 đè GIẢI ĐẤU 1320px² + QUÀ TẶNG 2640px² + THOÁT GAME 1452px²; 621×600 đè VÉ MÙA 756px² + GIẢI ĐẤU 648px²; 700×500 đè CỬA HÀNG 168px²; 800×600 + 1280×800 không đè). Mới: màn ≤900px toast rời khỏi đáy màn hình, dock bên trái, chừa cột econBar — 621–900px: dải trên dưới HUD (`top:76px`, `left:6px right:200px`, cách minimap 20px, chữ 12px để text flyover còn 1 dòng ở 621px, không chạm `#roundHint` top 122px); ≤620px: dock dưới `#teamPanel` (`top:336px`, `left:6px right:166px`, cách econBar 16px, chữ 12px, toast ~63px, đáy ~399px, cách joystick ~97px ở màn 640px, ~17px ở màn 560px) — chỉ áp khi màn cao ≥560px, màn thấp hơn giữ luật cũ vì toast không chen vừa giữa `#teamPanel` (đáy 324px) và joystick (đỉnh vh−144px). Đánh đổi đã chấp nhận: ở ≤620px toast có thể che dải move-mode sim (top 328px, vòng Rồng Rắn / Bịt Mắt làm dê, cảm ứng) và đỉnh tấm bottom-sheet sim / panel chat nếu đang mở (đo thật: chồng dải move-mode 11844px² ở 360×640) — các lớp này đều là overlay tạm thời, toast cũng chỉ hiện 3s; ở 621–900px toast che phần trái thanh tiến độ + đồng hồ vòng trong 3s (cả hai đều `pointer-events:none`, quãng đường chạy còn hiện bằng số ở ô HUD "ĐÃ ĐI"). Toast KHÔNG bao giờ che nút econ, joystick, nút NHẢY, minimap, HUD, `#roundHint`, `#teamPanel` hay tiêu đề flyover; desktop >900px giữ nguyên. Đo thật: probe trình duyệt thật `hidden_files/toast-flyover-probe.js` **128/128 PASS** (7 viewport 360×640 touch/không chạm, 360×560, 621×600, 700×500, 800×600, 1280×800: toast hiện qua đường thật bấm CHƠI ĐƠN, không che nút econ nào, bấm thật được cả 5 nút, không che joystick/NHẢY/minimap/HUD/gợi ý/dải team/tiêu đề flyover, 0 pageerror mới), ảnh `tools/captures/2026-11-09-cycle53/01-360-mobile-touch-toast.png` + `01-621-tablet-toast.png` đã đọc bằng mắt (toast đọc rõ, 5 nút econ hiện đủ). Chưa đo bằng tay: cảm giác đọc toast ở vị trí mới trên điện thoại thật khi vào trận (có bị dải move-mode che khuất lúc đang chơi Rồng Rắn không).

**Nút NHẢY dời sang cạnh joystick — ĐÃ QUYẾT (cycle 54, 2026-11-09 — backlog #40, QC/Sudo lật được):** trước đây `#btnJump` (82×82, `right:20px bottom:30px`, z-index 8, chỉ hiện khi `body.playing` + thiết bị cảm ứng) đè lên cột `#econBar` (z-index 6) ở mọi màn cảm ứng lúc đang chơi — góc phải đã kín (minimap ~y118–303 + econBar y300/336–đáy màn hình) nên không còn chỗ trống ở đó. Đo thật trước sửa (probe `hidden_files/btn-jump-overlap-probe.js`): 360×640 NHẢY đè THOÁT GAME 2788px², `elementFromPoint` tại tâm THOÁT GAME trả về `btnJump` (bấm vào phần bị đè thì nhảy thay vì thoát); 621×600 đè GIẢI ĐẤU 2952px² + QUÀ TẶNG 3280px²; 700×500 đè CỬA HÀNG 2952px² + VÉ MÙA 3280px²; 800×600 đè GIẢI ĐẤU + QUÀ TẶNG; 1280×800 không đè. Mới: `#btnJump` dời sang ngay phải joystick (`left:146px bottom:30px`, 56×56, chữ 13px) — khe giữa joystick (hết x=142) và econBar (bắt đầu x=204 ở 360px) chỉ rộng 62px, là vị trí duy nhất ở hàng nút dưới cùng không chồng lên phần tử nào ở mọi viewport; nút 56px vẫn trên ngưỡng chạm tối thiểu 44px. Không dời lên trên joystick vì nút CHAT lúc chơi nằm ở đó (`body.playing #btnChatToggle bottom:152px`); không thu gọn econBar lúc chơi vì đó là thay đổi UX lớn hơn. Giữ nguyên z-index 8 và luật hiện/ẩn (chỉ `body.playing` + cảm ứng; khán giả vẫn ẩn). Đo thật sau sửa: probe **115/115 PASS** (5 viewport 360×640, 621×600, 700×500, 800×600, 1280×800 chạm: NHAY không che nút econ nào, không che joystick/nút CHAT/minimap, nằm gọn trong viewport, chữ NHẢY vừa nút, `elementFromPoint` tại tâm mỗi nút econ và tại tâm NHẢY đều trả về đúng nút, 0 pageerror mới), ảnh `tools/captures/2026-11-09-cycle54/01-360-mobile-touch-jump.png` + `01-621-tablet-touch-jump.png` đã đọc bằng mắt (NHẢY đỏ đọc rõ ngay phải joystick, THOÁT GAME hiện đủ). Chưa đo bằng tay: cảm giác bấm NHẢY bằng tay trái (cùng tay với joystick) trên điện thoại thật — nút nhỏ hơn trước (56px thay vì 82px) có dễ bấm nhầm joystick không; vị trí mới có vừa tầm ngón tay cái không.

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
| OD-12 | Tiền thưởng top 1 tính sao (có tăng theo người bị loại không)? | **ĐÃ QUYẾT 2026-11-08 — theo yêu cầu của Sudo (tiền thưởng top 1 như Squid Game, mỗi người thua tăng tiền thưởng, có hình ảnh tiền thưởng treo):** Hũ Vàng Hội Làng: khởi đầu 100 Hội Xu + 10 xu mỗi lần có người bị loại; server làm chủ, broadcast `{type:'pot'}`; người thắng lấy tất cả, thay cho +50 xu thắng cố định (lì xì Tết +20 thắng vẫn cộng thêm; chơi đơn ví local đổi theo). Tối đa trận 456 người: 4.650 xu. Chỉ Hội Xu, không tiền thật, không đổi ra tiền, không cược. Hiển thị: ô HUD "HŨ VÀNG", hũ vàng 3D treo ở cổng hội, đồng xu bay từ người bị loại về hũ, màn giữa vòng + màn kết thúc hiện số hũ to. QC: hiện hũ nhưng không trả thưởng. Số tạm — chỉnh sau khi có số liệu trả thưởng thật. Backlog #39. | ✅ HOÀN TẤT (cycle 41: server hũ + HUD + trả thưởng + analytics; cycle 42, 2026-11-08: hũ 3D treo cổng hội + xu bay + chấm vàng minimap) |

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
| Thắng trận | Lấy cả Hũ Vàng (khởi đầu 100 xu + 10 xu mỗi người bị loại; tối thiểu 100 xu) |
| Nhiệm vụ ngày (mỗi nhiệm vụ 1 lần/ngày) | +20 xu |
| Được người khác cổ vũ / tặng sticker | +5 xu |

Nhiệm vụ ngày (3 nhiệm vụ, xem FR-42): chơi 1 trận; sống sót 2 vòng;
gửi 5 tin chat. Xu chỉ tiêu trong game (shop, giải thưởng giải đấu, vé
tour). **Xu không đổi ra tiền mặt, không rút được.**

**Chơi đơn — ĐÃ QUYẾT (cycle 28, 2026-11-07 — backlog #19 bước 1):**
ví chơi đơn lưu ở localStorage (`hoilang_local_profile_v1`) trên trình
duyệt người chơi, KHÔNG đồng bộ lên server (chống cày xu chơi đơn rồi
mang sang multi). Mức thưởng y hệt multi (bảng trên + §10.4 XP). Shop
mua/trang bị chạy local; Pass hiển thị cấp/XP local, thưởng track miễn
phí tự nhận khi lên cấp; giải đấu / cổ vũ / tặng quà / vé tour chỉ có ở
multi (bấm ở chơi đơn thì báo rõ). Trận QC chơi đơn không thưởng.

**Nhiệm vụ ngày chơi đơn — ĐÃ QUYẾT (cycle 45, 2026-11-08 — backlog #19
bước 2):** 3 nhiệm vụ y hệt multi (chơi 1 trận / sống sót 2 vòng / gửi
5 tin chat; +20 xu mỗi nhiệm vụ, nhận 1 lần/ngày, reset theo ngày UTC).
Tiến độ đếm ở `game.js` (`startSingle` → `recordMatchPlayed`,
`awardRoundSurvived` → sống sót 1 vòng, `sendChat` trong trận đơn →
`recordChatSent`; trận QC không đếm). Panel Cửa hàng (`shop.js`) vẽ mục
"Nhiệm vụ ngày" để xem tiến độ + nhận thưởng — mục này hiện cả ở multi
(server đã có sẵn action `quests`/`claimQuest`, trước đây client chưa vẽ
UI nên không nhận được). Tiến độ đổi thì `local-economy.js` đẩy message
`quests` mới về shop để panel đang mở cập nhật ngay (panel mở từ sảnh
chờ vẫn mở khi trận bắt đầu vì `startSingle` không ẩn panel kinh tế).
Profile cũ (chưa có `quests`) migrate giữ nguyên xu/đồ/Pass.

**Chuyển ví sang máy khác bằng mã sao lưu — ĐÃ QUYẾT (cycle 52,
2026-11-09 — backlog #19 bước 3, QC/Sudo lật được):** không có hệ thống
tài khoản nên không có đồng bộ tự động lên server — quyết định chống cày
xu cycle 28 giữ nguyên (ví chơi đơn KHÔNG lên server, ví multi vẫn
riêng). Thay vào đó là mã sao lưu xuất/nhập thủ công trong panel Cửa hàng
(mục "Sao lưu ví chơi đơn", chỉ hiện khi kinh tế chạy local):
`local-economy.js` xuất mã `HOI1.<base64url(JSON profile)>.<checksum>`
(checksum lăn 8 ký tự hex, chỉ chống gõ sai — ai có mã cũng nhập được
ví nên chỉ gửi mã cho chính mình); nhập mã sẽ THAY toàn bộ ví local trên
máy đích (xu, đồ đã mua, cấp/XP Pass, cosmetics, nhiệm vụ ngày — không
cộng dồn), mã sai định dạng/sai checksum/profile không hợp lệ đều bị từ
chối và ví cũ giữ nguyên, profile thiếu `quests` thì migrate như profile
cũ. Đo thật: test `hidden_files/wallet-transfer-test.js` **43/43 PASS**
(vm: định dạng mã, round-trip khôi phục đủ, sửa 1 ký tự payload/checksum
bị từ chối, 11 mã sai định dạng + profile không hợp lệ bị từ chối, nhập
thay ví cũ, export/import qua `shop.send`, multi không chạy local);
probe trình duyệt thật `hidden_files/wallet-transfer-probe.js` **12/12
PASS** (kiếm 30 xu, xuất mã HOI1. ra textarea, xóa localStorage + tải lại
trang về 0 xu, nhập mã thật về lại 30 xu, nhập mã sửa 1 ký tự báo lỗi +
ví giữ 30 xu, nút Sao chép mã báo kết quả, 0 pageerror mới), ảnh
`tools/captures/2026-11-09-cycle52/01-export-code.png` +
`02-imported.png` đã đọc bằng mắt (mục sao lưu + mã HOI1. đọc rõ, ví HUD
30 xu; nút "Nhập mã sao lưu" nằm sát mép dưới panel — panel cuộn được
nên vẫn bấm được, chỉ cần cuộn xuống). Chưa đo bằng tay: copy mã từ máy
này dán sang máy khác thật; cảm giác nhập mã trên điện thoại (mã dài
~300 ký tự).

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
