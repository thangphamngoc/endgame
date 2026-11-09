# Tài liệu kiến trúc — Trống Hội & Cầu Khỉ

> Phạm vi: tài liệu này mô tả kiến trúc của **bản demo trong repo `trong-hoi-cau-khi/`**
> (đọc từ code thật tại thời điểm viết: `server/server.js` 376 dòng,
> `client/js/game.js` 1.039 dòng, `package.json` chỉ phụ thuộc `ws`).
> Những mục ghi **(dự kiến)** là kiến trúc mục tiêu cho tầm nhìn đầy đủ,
> **chưa có trong bản demo** — không được đọc là đã triển khai.
> Mọi con số hiệu năng chưa đo đều ghi rõ là **ước tính / mục tiêu**, không phải số đo thực tế.

## 1. Tổng quan hệ thống

Trò chơi là một ứng dụng web chạy trên trình duyệt, gồm một client 3D và một
game server có thẩm quyền (authoritative) giao tiếp qua WebSocket. Cùng một
server vừa phục vụ file tĩnh của client, vừa điều hành các phòng multiplayer.
Chế độ chơi đơn chạy hoàn toàn ở client, không cần server (chỉ cần mở trang
qua server cho tiện).

```
                    ┌─────────────────────────────────────────────┐
                    │              TRÌNH DUYỆT NGƯỜI CHƠI         │
                    │                                             │
                    │  client/index.html                          │
                    │    ├─ HUD, panel chat, panel du lịch        │
                    │    ├─ Minimap (canvas 2D)                   │
                    │    ├─ Joystick ảo + nút NHẢY (mobile)      │
                    │    └─ client/js/game.js                    │
                    │         ├─ Three.js 0.158.0 (CDN cdnjs)    │
                    │         ├─ Render voxel: đảo, đình, cầu,   │
                    │         │   cây, chim, cá, khỉ, thuyền      │
                    │         ├─ Bot (chỉ chế độ chơi đơn)       │
                    │         ├─ Camera, spectator, du lịch      │
                    │         └─ WebSocket client (JSON)          │
                    └───────────┬───────────────┬─────────────────┘
                                │ HTTP (file    │ WebSocket JSON
                                │ tĩnh)         │ (ws:// hoặc wss://
                                │               │  cùng host)
                    ┌───────────┴───────────────┴─────────────────┐
                    │        NODE.JS SERVER (server/server.js)    │
                    │        http.createServer + ws               │
                    │                                             │
                    │  ┌─ Static file server: phục vụ client/    │
                    │  │   (index.html, js, css; chặn path        │
                    │  │   traversal, MIME giới hạn)              │
                    │  └─ Game server (authoritative):            │
                    │       ├─ rooms: Map<code, room> (RAM)      │
                    │       ├─ clients: Map<ws, info> (RAM)      │
                    │       ├─ Nhịp trống/chiêng (setInterval     │
                    │       │   200 ms kiểm tra phaseEnd)         │
                    │       ├─ Loại người chơi, chia team,       │
                    │       │   ván yếu, lượt cầu, xếp hạng       │
                    │       └─ Chat: giới hạn 120 ký tự,         │
                    │           chống spam 2 giây/tin             │
                    └─────────────────────────────────────────────┘
                                │
                    ┌───────────┴───────────────────────────────┐
                    │  CDN BÊN NGOÀI (phụ thuộc lúc chạy)        │
                    │  cdnjs — three.js 0.158.0 (three.min.js)   │
                    │  → Client cần Internet; không có bản       │
                    │    Three.js đóng gói sẵn trong repo.       │
                    └─────────────────────────────────────────────┘
```

**Không có trong hệ thống hiện tại:** không có cơ sở dữ liệu (trạng thái
phòng nằm trong RAM và mất khi server tắt; riêng dữ liệu kinh tế lưu
JSON `data/economy.json` — xem §7.5), không có hệ thống tài khoản /
đăng nhập, không có hàng đợi xử lý nền, không có cache, không có dịch vụ
phân tích (analytics) hay giám sát.

## 2. Luồng một trận đấu (match flow)

```
Menu / Lobby
  │  nhập tên → [Chơi đơn] hoặc [Tạo phòng / Vào phòng bằng mã 6 ký tự]
  │  (xem danh sách phòng đang mở; vào giữa trận = khán giả)
  ▼
Lobby (phase = 'lobby')
  │  chủ phòng bấm BẮT ĐẦU (cần ≥ 2 người)
  │  hoặc phòng tự bắt đầu khi đủ 20 người
  ▼
Countdown (phase = 'countdown', ~3,2 giây)
  │  server reset trạng thái người chơi, phát vị trí xuất phát (z = 35)
  ▼
Vòng 1 — Trống Hội (phase = 'round1')
  │  server đổi nhịp trống/chiêng theo phaseEnd ngẫu nhiên:
  │    trống 2,5–5,0 giây; chiêng 2,0–4,0 giây
  │  client gửi vị trí (pos) → server kiểm tra di chuyển lúc chiêng
  │  về đích (z ≤ -35) = qua vòng; hết người còn sống chưa về đích
  │  → chuyển sang CHIA TEAM
  ▼
CHIA TEAM (phase = 'team', ~5,5 giây)
  │  server chia người sống sót thành tối đa 3 team, mỗi team một cầu,
  │  ván yếu random riêng từng cầu, chọn người dẫn đầu từng team
  ▼
Vòng 2 — Cầu Khỉ Sương Mù (phase = 'round2')
  │  chỉ người dẫn đầu được bước ván (bridge/step, bridge/jumpGap)
  │  ván yếu → vỡ → loại cá nhân; qua hết 9 bước → ghi thời gian
  │  hết người còn sống chưa qua cầu → kết thúc trận
  ▼
Kết thúc (phase = 'finished')
  │  server phát bảng xếp hạng cá nhân theo thời gian về đích
  │  người chơi bấm Chơi lại → phòng về lobby
  │
  ├─ Nhánh song song, mọi lúc: người bị loại → Khán giả
  │   (4 góc nhìn: Toàn cảnh / Theo dõi / Sát vai / Tự do)
  │   hoặc Du lịch Hạ Long (bay tới đảo, xem chi tiết + câu chuyện)
  └─ Nhánh song song, mọi lúc: Chat phòng (Enter mở/gửi, Esc đóng)
```

**Lưu ý về thời gian chờ vòng 1:** theo code hiện tại, vòng 1 kết thúc khi
không còn người chơi nào đang sống mà chưa về đích (`checkRound1End`). Nghĩa
là nếu còn một người chơi đứng yên mãi ở vạch xuất phát, vòng 1 sẽ không tự
kết thúc. Đây là một lỗ hổng logic cần sửa ở Phase 1 (thêm giới hạn thời gian
vòng 1 — xem `docs/PLAN.md`, task P1-02).

## 3. Stack hiện tại và giới hạn

| Thành phần | Hiện tại (demo) | Giới hạn đã biết |
|---|---|---|
| Runtime server | Node.js ≥ 18, `node server/server.js`, không framework | Một tiến trình duy nhất, một CPU; tắt là mất toàn bộ phòng |
| Realtime | Thư viện `ws` (v8.18.0), WebSocket JSON, cùng host (`ws://`/`wss://` theo giao thức trang) | Không có heartbeat/reconnect; mất kết nối = rời phòng; không có nén hay chia kênh |
| Client | HTML + CSS + JS thuần, không build step, không bundler | Three.js 0.158.0 tải từ CDN cdnjs — cần Internet; CDN lỗi là game không chạy |
| Render | Three.js, `MeshLambertMaterial`, hình khối `BoxGeometry` (voxel), sương `Fog(0x9db8c6, 90, 420)` | Không có instancing cho đảo xa (260 silhouette là 260 mesh riêng — xem §7); chưa đo FPS trên máy yếu |
| Trạng thái | In-memory: `Map` phòng và client trong RAM | Không bền vững (không lưu trữ), không chia sẻ giữa nhiều server, không khôi phục sau restart |
| Dữ liệu | Không có database; kinh tế lưu JSON `data/economy.json` (xem §7.5) | Không có lịch sử trận, bảng xếp hạng lâu dài, tài khoản, hay phân tích |
| Bảo mật | Chặn path traversal khi phục vụ file tĩnh; giới hạn tên 30 ký tự, chat 120 ký tự, spam 2 giây | Không có xác thực, không có giới hạn tốc độ (rate limit) cho pos/join, không có log kiểm toán |
| Triển khai | `npm install` → `npm start`, cổng mặc định 3000, biến môi trường `PORT` | Không có TLS, reverse proxy, health check, log tập trung, hay giám sát — xem §9 |

## 4. Server có thẩm quyền — server quyết gì, client chỉ làm gì

Nguyên tắc: **server là nguồn chân lý (source of truth) trong multiplayer;
client không tự quyết kết quả trận đấu.** Chế độ chơi đơn là ngoại lệ: toàn
bộ logic chạy ở client vì không có đối thủ thật (bot được ghi rõ là bot).

| Quyết định | Server quyết | Client chỉ |
|---|---|---|
| Nhịp trống/chiêng | Đổi trạng thái theo `phaseEnd` ngẫu nhiên; phát `drum` cho cả phòng | Hiển thị trạng thái, phát âm thanh theo trạng thái nhận được |
| Người chơi có di chuyển lúc chiêng không | So vị trí `pos` với vị trí lúc chiêng vang (`gongX/gongZ`), ngưỡng lệch 0,6; cờ `jumped` cũng bị loại | Gửi vị trí hiện tại; không tự loại mình |
| Về đích vòng 1 | Kiểm tra `z ≤ -35`, ghi `finishTime` | Hiển thị tiến độ, phát hiệu ứng về đích |
| Chia team | Xếp người sống sót theo `finishTime`, chia tròn đều tối đa 3 team, tạo cầu + ván yếu riêng từng team, chọn leader | Hiển thị màn hình CHIA TEAM, màu áo/vòng theo team |
| Ván yếu | Random `weak[9]` (0/1) riêng từng cầu, từng trận; chỉ server biết | Hiển thị ván nứt/vỡ khi server báo `bridgeUpdate` |
| Lượt đi trên cầu | Chỉ `leader` được `step`/`jumpGap`; người khác nhận lỗi "Chưa tới lượt" | Chặn thao tác ở giao diện khi chưa tới lượt (phòng thủ thêm, không thay server) |
| Xếp hạng | Ghi thời gian về đích vòng 2, phát `ranking`, kết thúc trận | Hiển thị bảng xếp hạng |
| Chat | Cắt 120 ký tự, chặn spam < 2 giây/tin, phát cho cả phòng kèm tên/team/giờ | Hiển thị bong bóng trên đầu + panel; không tự thêm tin của người khác |
| Chủ phòng / leader | Chuyển host cho người đầu tiên còn lại khi host rời phòng; chuyển leader khi leader rời phòng | Hiển thị badge chủ phòng, tên leader |
| Người vào giữa trận | Cho vào làm khán giả (`spectator: true`), không được chơi | Hiển thị chế độ khán giả |

**Điểm yếu đã biết của cơ chế hiện tại (cần sửa trước khi mở rộng):**

- Server tin vị trí `pos` do client gửi mà không giới hạn tốc độ di chuyển
  (một client gian lận có thể gửi vị trí nhảy thẳng tới đích trong lúc trống
  — cần kiểm tra tốc độ tối đa mỗi tick, xem `docs/PLAN.md` P3-03).
- Nhịp trống/chiêng chạy bằng `setInterval` 200 ms, không phải vòng lặp
  tick cố định; độ chính xác nhịp phụ thuộc event loop.
- `chat` có một kiểm tra chết: code cắt chuỗi về tối đa 120 ký tự trước rồi
  mới kiểm tra `length > 120`, nên nhánh báo lỗi đó không bao giờ chạy
  (không ảnh hưởng hành vi, chỉ cần dọn code).
- Không có cơ chế chống người chơi cố tình đứng yên ở vòng 1 để trận không
  bao giờ kết thúc (xem §2).

## 5. Giao thức WebSocket (JSON)

Mọi message đều là JSON với trường `type`. Không có mã hóa, không có phiên
bản giao thức, không có số thứ tự message (sequence number) trong bản demo.

### 5.1. Client → Server (đã có trong code)

| `type` | Trường | Server làm gì |
|---|---|---|
| `list` | — | Trả `rooms` (phòng đang ở lobby) |
| `create` | `name` (tối đa 30 ký tự) | Tạo phòng mã 6 ký tự (bảng chữ cái không chứa I, O, 0, 1 để tránh nhầm), người tạo là host; trả `joined` |
| `join` | `name`, `code` | Vào phòng lobby; nếu phòng không ở lobby thì vào làm khán giả; đủ 20 người thì tự bắt đầu |
| `start` | — | Chỉ host, chỉ ở lobby, cần ≥ 2 người → `startMatch` |
| `pos` | `x`, `z`, `jumped` | Cập nhật vị trí; kiểm tra di chuyển lúc chiêng và về đích (vòng 1); phát `playerPos` cho người khác |
| `chat` | `text` | Cắt 120 ký tự, chặn spam 2 giây, phát `chat` cho cả phòng |
| `bridge` | `action`: `step` \| `jumpGap`, `plank`: 0 \| 1 | Chỉ leader, chỉ vòng 2; `step` chọn ván, `jumpGap` nhảy qua khoảng trống do ván đã vỡ |
| `replay` | — | Chỉ khi trận đã kết thúc: reset phòng về lobby |

### 5.2. Server → Client (đã có trong code)

| `type` | Trường chính | Khi nào gửi |
|---|---|---|
| `welcome` | `id` | Ngay khi kết nối WebSocket |
| `rooms` | `rooms: [{code, count, phase}]` | Trả lời `list`; phát cho người chưa vào phòng khi danh sách phòng lobby thay đổi |
| `joined` | `code`, `isHost`, `players`, `spectator?`, `phase?` | Sau `create`/`join` thành công |
| `players` | `players: [publicPlayer]` | Danh sách người chơi thay đổi (vào/ra, về đích, bị loại, đổi leader...) |
| `playerPos` | `id`, `x`, `z`, `alive`, `team` | Khi một người chơi gửi `pos` (phát cho mọi người khác trong phòng) |
| `phase` | `phase`, `players?`, `teams?`, `drum?`, `ranking?` | Đổi giai đoạn: `countdown`, `round1`, `team`, `round2`, `finished`, `lobby` (sau replay) |
| `drum` | `drum`: `drum` \| `gong` | Khi server đổi nhịp trống/chiêng |
| `eliminated` | `id`, `reason` | Khi một người chơi bị loại |
| `turn` | `team`, `leaderId` | Khi leader của một team thay đổi |
| `bridgeUpdate` | `team`, `step`, `broken`, `playerId?`, `bridgeStep?` | Khi có người bước ván (vỡ hay không) |
| `ranking` | `ranking: [{id, name, team, time}]` | Khi có người về đích vòng 2 (cập nhật dần) và khi kết thúc |
| `chat` | `senderId`, `name`, `team`, `text`, `time` (giờ `vi-VN`, HH:mm) | Khi có tin nhắn hợp lệ |
| `error` | `message` | Lỗi thao tác (không tìm thấy phòng, chưa tới lượt, spam chat, chưa vào phòng...) |

`publicPlayer` (đối tượng người chơi công khai trong các message `players` /
`joined` / `phase`): `id`, `name`, `isHost`, `alive`, `team`, `x`, `z`,
`finished`, `finishTime`, `spectator`, `bridgeStep`. Không có vị trí tuyệt
đối nhạy cảm nào khác; không có token hay thông tin tài khoản (vì không có
tài khoản).

### 5.4. Giao thức economy (đã làm ở module riêng, chưa nối vào server.js)

Message `{type:'economy', action, ...}` do `server/economy.js`
(`handle(room, player, msg, send, broadcast)`) xử lý và trả về
`{type:'economy', ok, action, ...}`. Server.js **chưa nối** (workstream
server sở hữu việc nối — xem PLAN M-03); client `shop.js` gửi qua
`window.__sendWS` nếu có, không mở kết nối mới.

| `action` (client → server) | Trường | Server làm gì |
|---|---|---|
| `getProfile` / `wallet` | — | Trả hồ sơ công khai (ví, inventory, pass, tour, nhiệm vụ) |
| `shop` | — | Trả catalogue + sticker |
| `buy` | `itemId` | Trừ xu, thêm vào inventory; từ chối khi thiếu xu / đã có / chỉ nhận qua Pass |
| `equip` / `unequip` | `itemId` / `slot` | **Kiểm tra sở hữu trước** rồi mới đổi `cosmetics`; chưa mua thì từ chối |
| `useEmote` | `itemId` | Kiểm tra sở hữu rồi phát `emoteUsed` cho cả phòng |
| `quest` / `claimQuest` | `questId` | Nhận +20 xu nếu đủ điều kiện, 1 lần/ngày |
| `quests` | — | Trả danh sách nhiệm vụ + tiến độ hôm nay |
| `buyPass` | — | **STUB:** trả `{ok:true, stub:true}`, mở khóa thử track trả phí |
| `pass` | — | Trả cấp/XP/thưởng Pass |
| `createTournament` | `name`, `brand`, `prizePoolXu` | Kiểm duyệt tên, trừ giải thưởng khỏi ví chủ hội, tạo giải |
| `listTournaments` | — | Trả các giải đấu |
| `tournamentWin` | `tournamentId`, `winnerId` | Chỉ chủ hội: chuyển giải (xu) cho người thắng |
| `cheer` | `toPlayerId` | Người nhận +5 xu (1 lần/60 giây/cặp) |
| `gift` | `toPlayerId`, `stickerId` | Người gửi trả xu sticker, người nhận +5 xu |
| `buyTourPass` | `pay`: `xu` \| `stub` | Mua vé tour bằng 500 xu, hoặc **STUB** tiền thật (mở khóa thử) |

Server → client (economy): `economy` trả lời riêng cho người gửi; các
sự kiện `cosmeticsChanged`, `emoteUsed`, `tournamentCreated`,
`tournamentFinished`, `cheered`, `giftSent` phát cho cả phòng.
Client phải chuyển message `economy` vào `window.HoiShop.onMessage(msg)`
(workstream client sở hữu — PLAN M-04).

| Thêm mới (dự kiến) | Vì sao cần |
|---|---|
| `protocolVersion` trong `welcome` và mọi message | Để client/server cũ–mới không lệch nhau khi nâng cấp |
| `seq` (số thứ tự) + `ack` | Phát hiện message mất/thừa khi mạng chập chờn |
| `heartbeat` / `ping`–`pong` | Phát hiện kết nối chết, dọn phòng rác, hỗ trợ reconnect |
| `reconnect` với `playerToken` | Cho người chơi rớt mạng quay lại đúng nhân vật (hiện tại rớt mạng = mất slot) |
| `tick` / `state` (snapshot 15 Hz, xem §7) | Thay cho việc phát từng `playerPos` rời rạc; nền tảng cho AOI và phòng lớn |
| `seed` (seed random theo phòng–vòng) | Để ván yếu, nhịp trống và biến thể thử thách có thể tái tạo/kiểm chứng, chống gian lận |
| `report` (tố cáo) + `mute` | Kiểm duyệt chat khi mở rộng (hiện chỉ có ẩn chat ở client) |
| `matchResult` (kết quả trận đầy đủ) | Lưu lịch sử trận khi có database |

## 6. Máy trạng thái (state machines)

### 6.1. Vòng đời phòng (room lifecycle)

```
lobby ──start (host, ≥2) / đủ 20 người──▶ countdown (3,2s) ──▶ round1
  ▲                                                              │
  │                                                              │ hết người sống
  │                                                              │ chưa về đích
  │                                                              ▼
  └────────────── replay (chỉ khi finished) ◀── finished ◀── round2
                                      ▲                              │
                                      │  hết người sống chưa qua cầu │
                                      │                              │
                                 team (5,5s) ◀──────────────────────┘
                                      (tự động sang round2 sau 5,5s)
```

Phòng bị xóa khỏi bộ nhớ khi người cuối cùng rời phòng (`players.size === 0`).
Không có trạng thái "phòng tạm dừng" hay "phòng chờ quá lâu tự hủy" trong
bản demo — một phòng lobby bỏ trống vẫn nằm trong danh sách cho tới khi có
người vào rồi rời hết.

### 6.2. Vòng đời người chơi (player lifecycle)

```
chưa vào phòng ──create/join──▶ lobby (alive, chưa chơi)
      │                              │
      │ vào giữa trận                │ startMatch
      ▼                              ▼
spectator ─────────────────────▶ round1: alive, chưa về đích
                                     │  di chuyển lúc chiêng → eliminated
                                     │  về đích (z ≤ -35) → finished (vòng 1)
                                     ▼
                              team: chờ lượt (đã có team + cầu)
                                     │
                                     ▼
                              round2: leader → bước ván
                                     │  ván yếu → eliminated
                                     │  qua 9 bước → round2Finished, ghi ranking
                                     ▼
                              finished / spectator (xem tiếp hoặc du lịch)
```

Người chơi rời mạng (`close`): bị xóa khỏi phòng; nếu là host thì host
chuyển cho người đầu tiên còn lại; nếu là leader cầu thì leader chuyển cho
người tiếp theo trong hàng đợi còn sống. Không có cơ chế quay lại trận.

### 6.3. Vòng đời nhịp trống/chiêng và cầu

- **Nhịp trống/chiêng:** `drum` (2,5–5,0 giây) ⇄ `gong` (2,0–4,0 giây),
  đổi khi tới `phaseEnd`; khi chuyển sang `gong`, server chụp nhanh vị trí
  của mọi người chơi (`gongX/gongZ`) làm mốc đứng yên.
- **Cầu (mỗi team một cầu):** `weak[9]` random 0/1 khi chia team;
  `broken[9]` ban đầu `false`; `queue` là hàng đợi người chơi của team theo
  thứ tự về đích vòng 1; `leader` là người đầu hàng đợi còn sống và chưa qua
  cầu. Mỗi bước: leader chọn ván → ván chắc thì `bridgeStep++`, ván yếu thì
  `broken[step] = true` và leader bị loại, leader chuyển cho người tiếp theo.
  Ván đã vỡ chỉ còn đi tiếp bằng `jumpGap`.

## 7. Mô hình dữ liệu

Toàn bộ dữ liệu hiện tại nằm trong RAM của một tiến trình Node.js duy nhất.

### 7.1. Room (phòng)

| Trường | Kiểu / ghi chú |
|---|---|
| `code` | Chuỗi 6 ký tự, duy nhất trong server |
| `players` | `Map<playerId, player>` |
| `phase` | `lobby` \| `countdown` \| `round1` \| `team` \| `round2` \| `finished` |
| `drumState` | `drum` \| `gong` (chỉ có ý nghĩa ở `round1`) |
| `phaseEnd` | Timestamp đổi nhịp tiếp theo |
| `startedAt` / `matchStart` | Timestamp bắt đầu trận (tính `finishTime`) |
| `bridges` | `teamIndex → { weak[9], broken[9], queue[ids], leader }` |
| `ranking` | Mảng `{id, name, team, time}` theo thứ tự về đích vòng 2 |

### 7.2. Player (người chơi)

| Trường | Kiểu / ghi chú |
|---|---|
| `id` | Số tăng dần toàn server (`nextPlayerId`) |
| `name` | Tối đa 30 ký tự, do người chơi nhập, không kiểm duyệt nội dung trong demo |
| `ws` | Kết nối WebSocket (không lưu trữ lâu dài) |
| `isHost` | Boolean — chủ phòng |
| `alive` / `finished` / `spectator` | Trạng thái sống / về đích vòng 1 / khán giả |
| `finishTime` | Thời gian từ `matchStart` tới khi về đích (ms) |
| `team` | `null` hoặc 0/1/2 (Đỏ/Vàng/Xanh lá) |
| `x`, `z` | Vị trí hiện tại (đơn vị thế giới game); `gongX/gongZ` là vị trí lúc chiêng vang |
| `bridgeStep` | Bước cầu hiện tại (0–9) |
| `round2Finished` | Đã qua hết cầu vòng 2 |
| `lastChat` | Timestamp tin nhắn cuối (chống spam 2 giây) |

### 7.3. Chat message (tin nhắn — chỉ tồn tại trong lúc phát)

| Trường | Kiểu / ghi chú |
|---|---|
| `senderId`, `name`, `team` | Người gửi (team dùng để tô màu tên) |
| `text` | Tối đa 120 ký tự (server cắt trước khi phát) |
| `time` | Giờ gửi dạng `HH:mm` (giờ địa phương của server) |

Tin nhắn **không được lưu trữ**: server phát xong là quên; client giữ lịch
sử trong panel chat cho tới khi tải lại trang. Muốn lưu lịch sử hay kiểm
duyệt sau này thì cần database + bảng `chat_messages` (xem §7.4).

### 7.5. Dữ liệu kinh tế — `server/economy.js` + `data/economy.json` (bản stub)

Kinh tế trong game (BRD §10) là module riêng, không nằm trong state trận
đấu. Toàn bộ nằm trong RAM (`Map` profiles/tournaments) và ghi ra file
JSON mỗi khi đổi. Đây là bản demo: chưa có database, chưa có tài khoản —
một `playerId` chỉ là id phiên chơi hiện tại, chưa gắn với người dùng
lâu dài.

| Thực thể | Trường chính | Ghi chú |
|---|---|---|
| Profile (hồ sơ người chơi) | `id`, `name`, `xu`, `inventory:[itemIds]`, `pass:{tier, level, xp, claimedLevels}`, `cosmetics:{skin, hat, banner, bubble}`, `tournamentsCreated:[]`, `giftsReceived:[]`, `tourPass:{owned, via}`, `quests:{date, playMatch, surviveRounds, chats, claimed}` | `xu` = Hội Xu; `inventory` chỉ chứa id món đã mua/nhận thưởng |
| Shop catalogue | `CATALOGUE` (~16 món + 3 món chỉ nhận qua Pass), `STICKERS` (3 sticker) | Toàn cosmetic; giá bằng xu; `price:null` = chỉ nhận qua Pass, không bán |
| Pass | `XP_PER_LEVEL=500`, `MAX_PASS_LEVEL=20`, `PASS_REWARDS` (cấp 2/5/8/10/12/15/18/20, mỗi cấp 1 món free + 1 món paid) | XP: 100/vòng sống sót, 500/thắng trận |
| Tournament (giải đấu Chủ Hội) | `id`, `name`, `brand`, `hostId`, `hostName`, `prizePoolXu`, `status: open\|finished`, `winnerId`, `createdAt` | Giải thưởng bằng xu, trừ khỏi ví chủ hội lúc tạo, chuyển cho người thắng lúc trao giải; không đổi ra tiền mặt |
| Gift / cheer | `giftsReceived:[{kind: cheer\|sticker, fromId, fromName, xu:5, at}]` | Cheer miễn phí, giới hạn 1 lần/60 giây/cặp; sticker 10/20/30 xu |
| Tour pass | `tourPass:{owned, via: xu\|stub}` | Vé Du Lịch Hạ Long 500 xu hoặc stub tiền thật; chỉ mở nội dung du lịch |

File lưu: `data/economy.json` (`{savedAt, nextTournamentId, profiles,
tournaments}`), thư mục `data/` tạo tự động, đã thêm vào `.gitignore`
(dữ liệu ví người chơi không commit). Docker giữ file này qua volume
`economy-data` (xem §9.3).

**Điểm kiểm tra (validation points):** mọi mua/trang bị/dùng đều kiểm tra
ở server trong `economy.js` — đủ xu, đã sở hữu (khi trang bị/dùng),
tên giải đấu hợp lệ, chỉ chủ hội mới trao giải, cheer đúng cooldown.
Client không tự quyết số dư hay quyền sở hữu. Giới hạn đã biết: chưa có
xác thực nên `playerId` có thể bị giả mạo giữa các phiên — chấp nhận được
ở bản demo, phải sửa bằng tài khoản trước khi mở public (PLAN M-08).

### 7.6. Dữ liệu khi có database (dự kiến, chưa làm)

| Bảng (dự kiến) | Trường chính (dự kiến) |
|---|---|
| `matches` | `id`, `room_code`, `seed`, `started_at`, `ended_at`, `phase`, `winner_id` |
| `match_players` | `match_id`, `player_id`, `name`, `team`, `alive`, `finish_time_r1`, `finish_time_r2`, `rank` |
| `chat_messages` | `id`, `match_id`, `sender_id`, `name`, `team`, `text`, `created_at`, `flagged` |
| `rooms` (lâu dài) | `code`, `host_id`, `phase`, `created_at`, `last_activity_at` |

## 8. Đường mở rộng tới tầm nhìn đầy đủ (456 người)

Tầm nhìn đầy đủ (xem `docs/BRD.md` §8) là: phòng 456 người, đủ 456 thì tự
bắt đầu, 1.000 người vào thì tách thành nhiều trận song song, vòng đầu chia
nhỏ rồi gộp lại, số vòng không giới hạn (OD-11): trận chỉ kết thúc khi còn
1 người thắng, thường 6 vòng với phòng đủ người, trong ~25–35 phút.
**Bản demo hiện tại chưa làm được điều này** — nó chỉ là phòng tối đa 20
người tự bắt đầu, 2 vòng, không có chia nhỏ hay gộp lại. Dưới đây là những
gì phải thay đổi, theo thứ tự.

### 8.1. Chia phòng và chia nhỏ vòng đầu (sharding)

```
1.000 người chờ ──▶ chia theo 456 người/phòng ──▶ 2 phòng 456 + 88 chờ
Phòng 456 người:
  Vòng 1: chia thành 8 sân con × ~57 người (8 × 57 = 456)
          mỗi sân con chơi Trống Hội độc lập, cùng nhịp trống của phòng
       ──▶ mỗi sân lấy top N người sống sót (ví dụ 35/sân → 280 người)
  Gộp lại: 280 người chơi chung các vòng sau trong một sân lớn
```

Thay đổi cần làm ở server hiện tại:

- `rooms` phải tách thành `lobby` (chờ đủ người) và `match` (đang đấu),
  với hàng đợi chờ và logic chia 456 người/phòng.
- Thêm khái niệm **sub-arena** (sân con): một phòng chứa nhiều sân con,
  mỗi sân con có danh sách người chơi, nhịp trống và khu vực riêng.
- Thêm **seed theo phòng–vòng** (`seed = hash(roomCode + round)`): mọi
  random (nhịp trống, ván yếu, biến thể thử thách) phải sinh từ seed để
  có thể tái tạo và kiểm chứng, thay vì `Math.random()` rải rác như hiện tại.
- Thêm **giới hạn thời gian vòng 1** (hiện chưa có — xem §2) và quy tắc
  lấy top N mỗi sân con để gộp.

### 8.2. Đồng bộ theo vùng nhìn thấy (Area of Interest, AOI) — dự kiến

Hiện tại server phát **mọi** `playerPos` cho **mọi** người trong phòng.
Với 20 người thì ổn; với 456 người thì mỗi người nhận 455 vị trí mỗi lần
gửi — không chịu nổi.

- Chia sân thành các ô (grid cells); mỗi client chỉ nhận vị trí của người
  chơi trong các ô kề với mình (ví dụ 3×3 ô quanh vị trí của mình).
- Người chơi ở xa chỉ cần nhận vị trí thưa hơn (ví dụ 2–5 Hz) hoặc chỉ
  nhận khi vào gần.
- Tin nhắn chat và sự kiện loại người vẫn phát cho cả phòng (số lượng ít).

### 8.3. Vòng lặp tick cố định ~15 Hz (mục tiêu) — dự kiến

Hiện tại server dùng `setInterval` 200 ms chỉ để kiểm tra đổi nhịp; vị trí
người chơi được xử lý ngay khi message tới (không theo tick). Để mở rộng:

- Một vòng lặp tick cố định, mục tiêu ~15 Hz (mỗi tick ~66 ms — là mục
  tiêu, chưa đo): mỗi tick xử lý hàng đợi input, cập nhật vị trí, kiểm tra
  loại, rồi phát một snapshot gọn cho từng client.
- Client gửi input (hướng di chuyển, nhảy) thay vì gửi vị trí tuyệt đối;
  server tự tính vị trí từ input + tốc độ tối đa → chống gian lận dịch
  chuyển tức thời (hiện tại server tin vị trí client gửi — xem §4).
- Snapshot chỉ chứa người chơi trong vùng AOI của client đó.

### 8.4. Hiệu năng render — dự kiến

- **Instancing cho đảo xa:** hiện tại 260 silhouette đảo xa là 260 mesh
  riêng (mỗi mesh một draw call). Khi mở rộng mật độ đảo xa, cần gom
  thành `InstancedMesh` theo vài mẫu hình để giảm draw call.
- **Chi tiết theo khoảng cách (LOD):** hiện tại đã có nguyên tắc "chỉ đảo
  đang xem mới dựng chi tiết" — cần giữ nguyên tắc này khi thêm đảo mới,
  và áp dụng tương tự cho cây/chim (chỉ cập nhật chuyển động của đảo gần).
- **Mục tiêu hiệu năng (chưa đo, cần đo ở Phase 2):** 30 FPS trở lên trên
  điện thoại tầm trung, thời gian tải trang đầu dưới ~5 giây trên mạng 4G
  (ước tính, cần đo thực tế).

### 8.5. Những gì KHÔNG cần thay ngay

- Giao thức JSON qua WebSocket có thể giữ nguyên ở Phase 1; chỉ thêm các
  message ở §5.3 khi cần.
- Client Three.js voxel hiện tại giữ nguyên phong cách; chỉ tối ưu
  instancing/LOD, không đổi engine.
- Luật CHIA TEAM và xếp hạng cá nhân giữ nguyên — mở rộng quy mô không
  đổi luật chơi.

## 9. Triển khai: hiện tại và mục tiêu

### 9.1. Hiện tại (demo)

```
Máy dev / VM của Muse
  $ npm install
  $ npm start            # node server/server.js, cổng 3000 (hoặc $PORT)
  → http://localhost:3000
```

- Chạy một tiến trình, phục vụ cả file tĩnh và WebSocket trên cùng cổng.
- Không có TLS (chạy `http`/`ws` thuần), không có reverse proxy, không có
  health check endpoint, không có log ngoài `console.log` lúc khởi động,
  không có tự khởi động lại khi crash.
- Dùng được cho: demo, chơi thử nội bộ, play-test với vài chục người.

### 9.3. Triển khai bằng Docker (đã làm — file sẵn, chưa kiểm bằng Docker)

```
$ docker compose up --build
  → http://localhost:3000
```

- `Dockerfile`: `node:20-alpine`, `npm install --omit=dev`, chạy bằng
  user không phải root, `EXPOSE 3000`, `CMD node server/server.js`.
- `docker-compose.yml`: service `game`, ports `3000:3000`,
  `restart: unless-stopped`, env `PORT`/`NODE_ENV`/`ECONOMY_STUB=true`,
  volume `economy-data` giữ `data/economy.json` khi container khởi động lại.
- `.env.example`: `PORT=3000`, `NODE_ENV=production`,
  `ECONOMY_STUB=true`, không có secret. Sao chép thành `.env` khi chạy
  (file `.env` thật đã có trong `.gitignore`, không commit).
- `.dockerignore`: loại `node_modules`, `.git`, `.env`, `data/`,
  `.DS_Store` khỏi context build.
- Chưa có trong build này: endpoint `/health` (vẫn là task P3-05, do
  workstream server sở hữu), TLS/reverse proxy, tên miền (vẫn là P3-02,
  cần Sudo chốt OD-04). File Docker mới chỉ là đóng gói chạy local —
  chưa kiểm bằng `docker build`/`docker compose up` trong build này
  (chỉ kiểm `npm start` + `curl /`); cần kiểm trước khi dùng để demo
  cho người ngoài.

### 9.4. Mục tiêu production (dự kiến, chưa làm)

```
Người chơi ──HTTPS/WSS──▶ Reverse proxy (TLS) ──▶ Node.js server (1..n)
                                                        │
                                              ┌─────────┴─────────┐
                                              │  Database (lưu   │
                                              │  trận, chat,     │
                                              │  bảng xếp hạng)  │
                                              └───────────────────┘
                                              ┌─────────┴─────────┐
                                              │  Log + giám sát  │
                                              │  (uptime, số     │
                                              │  phòng, lỗi)     │
                                              └───────────────────┘
```

| Hạng mục | Mục tiêu (dự kiến) |
|---|---|
| Hosting | Một VPS hoặc PaaS chạy Node.js; tên miền + TLS (Let's Encrypt hoặc tương đương) |
| Reverse proxy | Nginx/Caddy trước Node.js; phục vụ file tĩnh và chuyển WebSocket |
| Môi trường | `PORT`, `NODE_ENV`, cấu hình qua biến môi trường, không hard-code |
| Health check | Endpoint `/health` trả trạng thái server + số phòng đang mở (chưa có) |
| Logging | Log có cấu trúc (trận bắt đầu/kết thúc, lỗi), giữ lại theo ngày, không log nội dung chat đầy đủ |
| Giám sát | Cảnh báo khi server chết, khi số phòng tăng đột biến, khi lỗi WebSocket tăng |
| Khởi động lại | Process manager (systemd/PM2) tự khởi động lại khi crash |
| Backup | Sao lưu database theo lịch (khi có database) |
| Mở rộng ngang | Nhiều tiến trình server + chia sẻ trạng thái phòng qua Redis (hoặc tương đương) — chỉ khi vượt một server; chưa cần ở Phase 1–2 |

## 10. Rủi ro và đánh đổi

| Rủi ro / đánh đổi | Mức độ | Cách giảm (đã có / dự kiến) |
|---|---|---|
| Server tin vị trí client gửi → gian lận dịch chuyển | Cao (khi mở public) | Phase 3: server tính vị trí từ input + giới hạn tốc độ; kiểm tra tốc độ tối đa mỗi tick |
| Không có giới hạn thời gian vòng 1 → trận kẹt nếu có người đứng yên | Trung bình | Phase 1: thêm giới hạn thời gian vòng 1 + quy tắc kết thúc vòng |
| In-memory, một tiến trình → restart mất hết phòng | Trung bình (demo) / Cao (production) | Production: database + Redis; demo chấp nhận được |
| Three.js qua CDN → CDN lỗi hoặc mạng người chơi chặn CDN là game không chạy | Trung bình | Phase 3: đóng gói Three.js vào repo (self-host) hoặc fallback CDN dự phòng |
| Không có reconnect → rớt mạng là mất trận | Trung bình | Phase 2–3: `playerToken` + reconnect trong thời gian ân hạn |
| Chat không kiểm duyệt → spam/nội dung xấu khi mở public | Cao (khi mở public) | Hiện có: giới hạn 120 ký tự, 2 giây/tin, ẩn chat, ẩn bong bóng. Phase 3: tố cáo, mute, lọc từ, dashboard kiểm duyệt |
| Tên người chơi không kiểm duyệt | Thấp–trung bình | Phase 3: lọc tên, giới hạn ký tự đặc biệt |
| Đảo du lịch dùng tên/thông tin thật (Ti Tốp 1962) | Thấp | Đã gắn nhãn "Chuyện lịch sử thật" / "Truyền thuyết dân gian" / "Chuyện trong game"; không tuyên bố chi tiết 1.969 đảo |
| Hiệu năng đảo xa (260 mesh riêng) | Thấp (demo) / Trung bình (mở rộng) | Phase 2: InstancedMesh + LOD |

## 11. Nhật ký quyết định (decision log)

| # | Quyết định | Vì sao (lúc quyết) | Hệ quả / nợ kỹ thuật |
|---|---|---|---|
| D-01 | Dùng thư viện `ws` thay vì framework game server (Colyseus...) | Demo cần chạy nhanh, không build step, ít phụ thuộc | Phải tự làm tick, AOI, sharding, reconnect khi mở rộng |
| D-02 | Three.js qua CDN (cdnjs, 0.158.0) thay vì đóng gói vào repo | Không cần bundler, repo nhẹ, chạy ngay | Phụ thuộc mạng + CDN; cần self-host trước khi production |
| D-03 | Trạng thái phòng trong RAM, không database | Demo không cần lưu trữ lâu dài; đơn giản | Mất dữ liệu khi restart; không có lịch sử/bảng xếp hạng |
| D-04 | Server + file tĩnh cùng một tiến trình, cùng cổng | Chạy bằng một lệnh `npm start`, dễ demo | Khó tách scale riêng phần tĩnh và phần game sau này |
| D-05 | Random bằng `Math.random()` rải rác, chưa có seed | Đơn giản cho demo | Không tái tạo/kiểm chứng được trận; cần seed theo phòng–vòng ở Phase 1–2 |
| D-06 | Chat chỉ giới hạn ký tự + spam, không kiểm duyệt nội dung | Demo nội bộ, chưa mở public | Phải thêm tố cáo/mute/lọc trước khi mở rộng |
| D-07 | CHIA TEAM chỉ để chia lượt, không có team thắng/thua | Quyết định của Sudo (2026-11-04): chia team để đỡ loạn, rớt là loại cá nhân | Luật này ràng buộc mọi thiết kế vòng 2 và xếp hạng sau này — không đổi nếu không có quyết định mới của Sudo |
| D-08 | Đảo xa chỉ dựng chi tiết đảo đang xem | Giữ máy nhẹ, tránh render hàng trăm đảo chi tiết cùng lúc | Cần giữ nguyên tắc này khi thêm đảo/tour mới |
| D-09 | Tên phòng 6 ký tự, loại I/O/0/1 | Tránh nhầm lẫn khi đọc mã phòng | Không ảnh hưởng gì khác |
| D-10 | Kinh tế chỉ bán đồ trang trí (cosmetic-only), tiền thật là stub | Quyết định OD-03 của Sudo (2026-11-05, BRD §10): lõi trận miễn phí, không pay-to-win, không cá cược, không loot box | Tiền thật chưa thu được; mở thật cần cổng thanh toán + tài khoản + database (PLAN M-08) |
| D-11 | Lưu kinh tế bằng JSON `data/economy.json` thay vì database | Demo cần lưu ví/inventory qua restart mà không kéo database vào | Chưa bền vững cho production (không giao dịch, không xác thực); phải thay bằng database trước khi mở public |
| D-12 | Đóng gói bằng Docker (node:20-alpine, non-root, compose) | Chạy demo ở máy khác không cần cài Node thủ công | Chưa kiểm bằng Docker trong build này; chưa có `/health`, TLS hay tên miền |
| D-13 | Luật loại Kéo Co (OD-02): trận ≥ 24 người thì đội thua loại toàn bộ; phòng nhỏ (< 24) chỉ loại 2 người yếu nhất đội thua | Quyết định của Sudo (2026-11-05) | Cần thiết kế chi tiết ở P1-01 và cân bằng lại sau play-test |
| D-14 | Giới hạn vòng 1 chốt 120 giây (FR-11) | Quyết định cùng OD-02 (2026-11-05); sửa lỗ hổng trận kẹt | Con số 120 giây có thể bị QC lật lại sau play-test; code server.js tại thời điểm viết chưa có giới hạn này |

---
*Tài liệu liên quan: [BRD.md](./BRD.md) (yêu cầu nghiệp vụ và tầm nhìn đầy đủ),
[PLAN.md](./PLAN.md) (kế hoạch task theo phase), [README.md](../README.md)
(mô tả bản demo — README chỉ mô tả demo, tầm nhìn đầy đủ nằm ở BRD và PLAN).*
