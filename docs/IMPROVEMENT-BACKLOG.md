# Backlog cải tiến liên tục — Trống Hội & Cầu Khỉ

> Vòng lặp PO: mỗi 15 phút đánh giá 1 task, code + kiểm thử + chạy lại server.
> Quy tắc: không hỏi Sudo giữa chừng (quyền tự quyết đã có từ 2026-11-05);
> quyết định tạm ghi vào BRD dạng ĐÃ QUYẾT để QC/Sudo lật lại được.
> Không push mù lên GitHub: mỗi cycle thử push 1 lần, hết hạn duyệt thì để
> code ở local, cycle sau đẩy gộp. Không merge, không đẩy main.
> Dừng vòng lặp khi backlog hết VÀ 2 cycle liên tiếp không tìm được cải tiến
> nào đáng làm — khi đó báo Sudo và tắt cron.

## Hàng đợi (ưu tiên từ trên xuống)

| # | Task | Nguồn | Cỡ | Trạng thái |
|---|---|---|---|---|
| 1 | Nối economy vào server + client (M-03/M-04): server dispatch `economy`, hook +10 xu/vòng, +50 xu/thắng, nhiệm vụ ngày; client thêm `#shop-panel`, `#pass-panel`, `#tournament-panel`, `#gift-panel`, `#wallet-hud`, expose `window.__sendWS`, chuyển message economy vào `HoiShop.onMessage` | PLAN M-03/M-04 Dự kiến | M | ✅ Xong — cycle 1, 2026-11-06 ~12:15 |
| 2 | Bịt Mắt multi: server gửi `goatId` cho người tìm (hiệu ứng dê phát sáng), la bàn theo hướng camera thay vì hướng thế giới tuyệt đối (`__game` đã lộ camera/renderer) | Ghi chú worker sim 2026-11-06 | S | ✅ Xong — cycle 2, 2026-11-06 ~13:39 |
| 3 | Ô Ăn Quan: siết luật chỉ được bấm ô của mình (server + overlay cùng lúc); viền vàng ô 0–5 là luật thật, không còn là gợi ý | Ghi chú worker sim 2026-11-06 | S | ✅ Xong — cycle 3, 2026-11-06 ~13:47 |
| 4 | Nhảy Bao Bố multi: server broadcast `hopState` theo thời gian thực để thanh tiến độ hiện đúng, không còn đếm nhảy local | Ghi chú worker sim 2026-11-06 | S | Chờ |
| 5 | Xung đột fog: fog sân làng 150/720 ở `startRoundCommon`/`startRoundLocal` vs sim Bịt Mắt tự lưu/khôi phục fog; fog Vòng 2 (16/130) bị sim Nhảy Bao Bố nới 60/420 rồi trả lại — chuẩn hoá 1 nơi duy nhất quản fog theo vòng | Ghi chú worker sim 2026-11-06 | S | Chờ |
| 6 | Dọn code chết P1-10: nhánh chat `length > 120` không bao giờ chạy + TODO trong code | PLAN P1-10 | S | Chờ |
| 7 | Bảng xếp hạng trực tiếp cho khán giả (P1-09): ai đang dẫn đầu, ai vừa bị loại, cập nhật theo sự kiện | PLAN P1-09 | S | Chờ |
| 8 | Timer trận tổng + HUD (P1-07): HUD hiện đúng vòng/trò đang chơi (không "/6" nữa — OD-11), hết giờ tổng thì trận kết thúc có kết quả | PLAN P1-07 | S | Chờ |
| 9 | Onboarding người mới (P4-02): màn hình hướng dẫn luật trước trận đầu, gợi ý phím | PLAN P4-02 | M | Chờ |
| 10 | Polish mobile (P4-03): joystick, nút bấm, chữ, hiệu năng; kiểm layout 360px bằng đo thật | PLAN P4-03 | M | Chờ |
| 11 | Self-host Three.js + fallback CDN (P2-09): tắt CDN thì game vẫn tải được | PLAN P2-09 | S | Chờ |
| 12 | Lọc tên người chơi + ký tự đặc biệt (P3-07) | PLAN P3-07 | S | Chờ |
| 13 | Health/log/giám sát (P3-05): `/health` đã có; thêm log cấu trúc + tự khởi động lại khi crash | PLAN P3-05 | M | Chờ |
| 14 | Analytics tối thiểu (P3-06): số trận, người chơi, tỉ lệ hoàn thành, tỉ lệ dùng chat/du lịch | PLAN P3-06 | M | Chờ |
| 15 | Thêm 3 đảo du lịch mới có câu chuyện nhãn nguồn (P4-01) | PLAN P4-01 | M | Chờ |
| 16 | Sự kiện theo mùa — Tết/lễ hội: chủ đề + trò biến thể (P4-06) | PLAN P4-06 | M | Chờ |
| 17 | Load test phòng đông (P2-07): bot mô phỏng 100/200/456 client, đo FPS/độ trễ/CPU/RAM — chỉ sau khi P2-01..P2-04 xong; hiện tại scale 456 CHƯA load-test, không bịa số | PLAN P2-07 | L | Chờ (chặn bởi scale) |
| 18 | Docker build-test thật (M-05 ghi "chưa kiểm bằng Docker — chỉ kiểm npm start + curl") | PLAN M-05 | S | Chờ |
| 19 | Economy ở chế độ chơi đơn: hiện chỉ có ở multiplayer (server giữ ví). Chơi đơn không có server nên ví luôn 0, shop không mua được — cần profile local (localStorage) hoặc server local mô phỏng, và ghi rõ xu chơi đơn có đồng bộ lên server không | Phát hiện cycle 1 | M | Chờ |

## Đã xong trong vòng lặp

- **Cycle 3 — 2026-11-06 ~13:47, Ô Ăn Quan: siết luật chỉ bấm ô bên mình.** Bên chia theo chẵn/lẻ vị trí trong turnOrder (bên 0: ô 1–5, bên 1: ô 7–11); ô quan 0/6 không ai được rải. Server chặn nước sai bằng tin lỗi 'Chỉ được bấm ô bên mình (ô 1-5 / 7-11).', gửi `sides` {playerId: 0|1} trong mọi tin `oanquanState`, tự bỏ qua lượt của người hết nước đi và kết thúc vòng khi không ai còn nước đi (`no-legal-moves`). Overlay khóa nút ô không phải của mình (viền vàng `.oq-mine` = hàng của bạn theo đúng bên, ô đối thủ viền teal `.oq-foe`); bot chơi đơn chỉ rải ô 7–11. Sim 3D kiểm tra trước khi chuyển tiếp (không gửi thẳng WS cho ô sai bên — đường fallback cũ sẽ vòng qua luật overlay), hover chỉ sáng ô bên mình, viền/thẻ hàng đổi theo mySide. Quyết định ghi vào BRD §8.1 dạng ĐÃ QUYẾT. Kiểm thử: `node --check` qua hết 4 file đổi; server unit (vm, helper trích từ server.js) **13/13 PASS** (chia bên, hasMove, advance bỏ qua người hết nước/chết, state msg có sides); client VM (rounds.js) **19/19 PASS** (nút ô theo bên, bot chỉ rải 7–11, bảo toàn 70 quân, click ép ô đối thủ không gửi gì, sides lật bàn khi bên 1); sim VM **8/8 PASS** (click 3D ô mình gửi WS, ô đối thủ/quan/trống chỉ toast không gửi, hover đúng ô mình); test live WS phòng QC 7 người, Ô Ăn Quan rơi vào vòng 5, **20/20 PASS** (sides 4/3, ô đối thủ + ô quan 0/6 bị từ chối, ô mình được chấp nhận và lượt chuyển sang bên kia, sai lượt bị chặn, bảo toàn 70 quân). Server local đã khởi động lại từ code mới, `/health` 200, `GET /` 200, `/js/rounds.js` 200, `/js/sim/sim-oanquan.js` 200. Còn nợ Sudo test tay: cảm giác rải khi chỉ còn ô bên mình, mobile thật. Xem commit/push ở báo cáo cycle.

- **Cycle 2 — 2026-11-06 ~13:39, Bịt Mắt multi: goatId + la bàn theo camera.** Server gửi `goatId` trong tin `blind` cho cả người tìm (`blind:true`) và dê (`blind:false`, goatId là id chính mình); client `rounds.js` gắn dê qua `resolveGoat` (cả trường hợp blind tới trước `roundStart` qua `pendingBlindGoatId`). Mũi tên `#cue-arrow` + la bàn sim + pan tiếng dê xoay theo hướng CAMERA (góc tương đối = góc thế giới − yaw camera, cùng quy ước atan2(dx,−dz)); cue 2s của server giữ làm dự phòng khi dê ngoài AOI 40. Vị trí dê chỉ tin khi tươi (<1,5s, dấu `_posAt` từ tick 15Hz/`syncRemotePlayers` — `syncRemotePlayers` trước đây chỉ cập nhật `group.position` mà không cập nhật `x`/`z`, đã sửa). Ánh vàng nhấp nháy ở dê giờ vẽ được ở multi khi dê rất gần (<6, chắc chắn trong AOI). Quyết định ghi vào BRD §8.1 dạng ĐÃ QUYẾT. Kiểm thử: `node --check` qua hết 4 file đổi; harness vm `/tmp/bitmat-test.js` **17/17 PASS** (mũi tên/la bàn xoay đúng theo camera, shimmer hiện/tắt theo khoảng cách, cue fallback khi vị trí cũ, pending blind, blind:false, goatId lạ không vỡ); test live WS `/tmp/bitmat-live-test.js` phòng QC 7 người, Bịt Mắt rơi vào vòng 4, **13/13 PASS** (mọi blind đều có goatId là id thật, 2 nhóm dê 3+4, 5 người tìm, 15 cue/5s, tick mang vị trí dê). Server local đã khởi động lại từ code mới, `/health` 200, `GET /` 200, `/js/rounds.js` 200 (có `pendingBlindGoatId`). Còn nợ Sudo test tay: cảm giác tìm dê theo la bàn mới, độ chính xác khi dê ngoài AOI, mobile thật. Xem commit/push ở báo cáo cycle.

- **Cycle 1 — 2026-11-06 ~12:15, nối economy server+client (M-03/M-04).** Kiểm tra thấy phần nối tĩnh đã có từ các cycle trước (server dispatch `economy` + 4 hook, client đủ 4 panel + `#wallet-hud` + `js/shop.js` + `window.__sendWS` + route vào `HoiShop.onMessage`); lỗ hổng thật còn lại: hook cộng xu chỉ ghi `data/economy.json`, không đẩy ví mới về client nên HUD ví cũ tới khi mở shop. Sửa `server/server.js`: sau `awardRoundSurvived`/`awardWin` gửi ngay `{type:'economy', action:'earned', reason, amount, profile}` cho người được thưởng (trận QC vẫn không thưởng). Kiểm thử: `node --check` qua hết; trận thật 2 người trên server live (`/tmp/econ-test2.js`): **12/12 PASS** — qua vòng +10 xu đẩy về ví, thắng +50 xu (ví 60), `getProfile` đúng 60, nhiệm vụ play-match +20 (ví 80), mua Bong Bóng Lá Tre 80 xu thành công (ví 0), mua lại bị từ chối "đã sở hữu", trang bị đồ chưa mua bị server từ chối, người thua (0 xu) không mua được, 5 chat rồi nhận nhiệm vụ chat-5 +20 xu. Lưu ý test: phòng 2 người thì mục tiêu Vòng 1 là 1 nên trận kết thúc ngay sau Vòng 1; `economy.handle` trả lỗi không kèm `action` nên harness phải chấp nhận cả reply `ok:false`. Còn nợ Sudo test tay: cảm giác shop, layout mobile. Chưa đẩy GitHub trong cycle này nếu thẻ duyệt hết hạn (xem commit/push ở báo cáo cycle).


## Ghi chú PO

- Các mục "chưa xác minh bằng tay" (cảm giác chơi, 30 giây/lượt, mobile thật,
  multi nhiều người thật, scale 456) KHÔNG tự ghi là xong — chỉ Sudo chơi
  thử mới chốt được. Vòng lặp chỉ làm phần code + test tự động được.
- KPI (hoàn thành trận ≥80%, ≥30 FPS, tải ~5 giây, tick 15 Hz) là mục tiêu
  đề xuất, chưa đo — không ghi thành số đo thật.
- Repo dùng 260 silhouette đảo xa (370 là của bản artifact chơi đơn cũ).
