# Hướng dẫn tổng duyệt demo — SecureGrade

Kịch bản trình bày (ai nói gì, bao nhiêu giây) nằm ở cuối [`SLIDE.md`](SLIDE.md).
File này là **bản thao tác**: gõ gì, chờ gì, thấy gì. Làm đúng thứ tự từ trên xuống.

Dữ liệu demo hiện có:

| Lớp | Giảng viên | enrollment | Sinh viên | Điểm |
| --- | --- | --- | --- | --- |
| SEC401 | `gv01` | 1 | `sv01` | 8.50 |
| SEC401 | `gv01` | 3 | `sv02` | 8.75 |
| SEC401 | `gv01` | 5 | `sv03` | chưa có |
| NET301 | `gv02` | 2, 4, 6 | `sv01`, `sv02`, `sv03` | chưa có |

Mật khẩu: `admin` → `Admin@2026demo`, `gv01` → `Gv01@2026demo`, tương tự cho các tài
khoản còn lại (viết hoa chữ đầu + `@2026demo`).

---

## A. Chuẩn bị — làm trước 30 phút

### A1. Khởi động

```bash
docker compose up -d
```

Chờ khoảng 20 giây rồi kiểm tra — phải thấy đúng 3 container, chỉ `waf` có cột PORTS:

```bash
docker compose ps
curl -i http://localhost:8080/health
```

### A2. Lấy mã OTP

Hai cách, chọn một:

**Cách 1 — điện thoại (dùng khi trình bày thật).** Đăng nhập lần đầu từng tài khoản
`sv01`, `gv01`, `gv02`, `admin`, quét mã QR bằng Google Authenticator / Microsoft
Authenticator, nhập mã 6 số để hoàn tất.

**Cách 2 — lấy mã từ máy (dùng khi tổng duyệt, hoặc dự phòng khi điện thoại hỏng).**

```bash
node scripts/otp.mjs          # in mã của cả 6 tài khoản
node scripts/otp.mjs gv01     # chỉ một tài khoản
```

Script đọc `mfa_secret` thẳng từ DB. Đây chính là luồng F4 trong báo cáo, và cũng là
hạn chế đã ghi ở mục 8.2 (`mfa_secret` lưu dạng rõ) — nếu thầy hỏi, trả lời đúng như
vậy, đừng nói đây là "cửa hậu".

**Mỗi mã chỉ dùng được một lần trong 90 giây** — kể cả khi request bị từ chối.
Thử sai một lần là phải lấy mã mới, đừng dán lại mã cũ. Vừa dùng mã để đăng nhập thì phải chờ
sang chu kỳ 30 giây sau mới sửa được điểm. Script có in số giây còn lại.

### A3. Bật MFA cho `gv02` — bắt buộc, nếu không kịch bản KB1 không chạy được

Hiện `gv02` chưa bật MFA. Đăng nhập `gv02` / `Gv02@2026demo` → trang hiện mã QR →
chạy `node scripts/otp.mjs gv02` → nhập mã in ra → MFA bật xong. Đăng xuất.

### A4. Mở sẵn

- Trình duyệt thường — dùng cho `gv01`
- **Tab ẩn danh** — dùng cho kẻ tấn công (phải khác cửa sổ thường, vì fingerprint
  tính theo User-Agent + IP)
- Một tab nữa cho `admin`
- Terminal đã `cd` vào thư mục dự án
- Slide mở sẵn ở Slide 8 (DEMO)

### A5. Chốt chặn cuối

```bash
docker compose restart app
```

Reset bộ đếm rate limit (10 lần đăng nhập / 15 phút / IP). **Nếu bỏ qua bước này mà
trước đó đã thử đăng nhập nhiều lần, giữa buổi demo sẽ nhận 429 thay vì đăng nhập
được.** Đây là lỗi dễ làm hỏng demo nhất.

---

## B. Chạy demo (9 phút 30)

### B1 · 0:00–1:00 — Phân vùng mạng (Terminal)

```bash
docker compose ps
curl -i http://localhost:8080/health
curl -i http://localhost:3000/health
docker compose exec app node -e "fetch('https://example.com').then(()=>console.log('FAIL')).catch(e=>console.log('bi chan:', e.cause?.code))"
```

Kết quả phải thấy: chỉ `waf` có PORTS · `200 OK` · **connection refused** · `bi chan:
EAI_AGAIN`.

> Nói: *chỉ có một cửa vào là WAF; app và DB không có đường ra Internet, nên có lỗ hổng
> thực thi mã trong app cũng không gửi được dữ liệu ra ngoài.*

### B2 · 1:00–2:30 — Luồng bình thường (Trình duyệt)

1. `sv01` đăng nhập + OTP → xem điểm. Chỉ thấy điểm của chính mình.
2. `gv01` đăng nhập + OTP → chọn lớp **SEC401** → bấm **Sửa** ở `sv03` (chưa có điểm)
   → nhập `9.0`, lý do `Cham lai bai thi cuoi ky`, **OTP mới** → Lưu.

> Nói: *mỗi thao tác để lại một dòng audit; ô OTP ở đây là step-up, không phải lặp lại
> đăng nhập.*

### B3 · 2:30–4:00 — KB1: có mật khẩu nhưng không có điện thoại (Tab ẩn danh)

Đăng nhập `gv02` / `Gv02@2026demo` → nhập OTP **sai** 3 lần (gõ `000000`).

Kết quả: lần 3 trả **423 ACCOUNT_LOCKED**. Mở tab admin → **Cảnh báo** → thấy
`MFA_FAIL_THRESHOLD` (HIGH).

> Nói: *mật khẩu đúng chưa chứng minh đúng người. Nội dung cảnh báo nói rõ: password
> đúng nhưng OTP sai liên tục — nghi lộ mật khẩu.*

### B4 · 4:00–5:30 — KB2: đánh cắp cookie phiên (DevTools)

1. Trong cửa sổ `gv01` đang đăng nhập: **F12 → Application → Cookies** → copy giá trị
   `sg_token`.
2. Sang **tab ẩn danh**, dán cookie đó vào rồi gọi API:

```bash
curl -i http://localhost:8080/api/me -H "Cookie: sg_token=<DAN_VAO_DAY>"
```

Kết quả: **401 `SESSION_CONTEXT_MISMATCH`**.

3. Quay lại cửa sổ `gv01`, bấm thao tác bất kỳ → bị đăng xuất (`SESSION_REVOKED`).
4. Tab admin → **Cảnh báo** → dòng **CRITICAL**.

> Nói: *infostealer lấy được cookie vẫn không dùng được, vì phiên gắn với ngữ cảnh.
> Và phiên gốc bị thu hồi luôn — tức là kẻ tấn công vừa dùng cookie thì chính giảng
> viên bị đá ra, đó là tín hiệu để người dùng báo sự cố.*

### B5 · 5:30–6:30 — KB3 giả mạo JWT và KB4 IDOR (Terminal)

```bash
node tests/attacks/forge-jwt.mjs <gia tri cookie sg_token>
curl -i http://localhost:8080/api/me -H "Cookie: sg_token=<TAMPERED>"
curl -i http://localhost:8080/api/me -H "Cookie: sg_token=<ALG_NONE>"
```

Cả hai trả **401 INVALID_TOKEN**.

KB4 — `gv01` sửa điểm lớp của `gv02` (enrollment 2 thuộc NET301), kèm OTP **đúng**:

```bash
curl -i -X PUT http://localhost:8080/api/grades/2 \
  -H "Content-Type: application/json" -H "Cookie: sg_token=<COOKIE_GV01>" \
  -H "X-OTP: <OTP_MOI>" -d '{"score":10,"reason":"Thu sua diem lop khac"}'
```

Kết quả: **403 `{"error":"FORBIDDEN"}`** — dù OTP đúng, dù là giảng viên thật.
Thân phản hồi cố tình nói trống — không lộ là enrollment này có tồn tại hay không.
Tên thật của sự kiện nằm trong audit log; mở tab **Audit log** ở trang admin sẽ thấy
`ACCESS_DENIED_IDOR` (HIGH), target `enrollment:2`. **Nên mở tab này ra cho thầy xem**,
vì đó mới là bằng chứng hệ thống đã nhận ra đây là IDOR chứ không phải lỗi thường.

> Nói: *không tin claim trong token, và không tin ID do client gửi lên.*

### B6 · 6:30–7:15 — KB5: Defense-in-Depth (Terminal)

```bash
curl -i -G http://localhost:8080/health --data-urlencode "id=1' OR '1'='1"
```

→ **403**, WAF chặn (rule 942100).

Giờ **bỏ qua WAF hoàn toàn**, bắn thẳng vào app từ bên trong mạng nội bộ:

```bash
docker compose cp tests/attacks/sqli-direct.mjs app:/tmp/sqli-direct.mjs
docker compose exec app node /tmp/sqli-direct.mjs
docker compose exec db psql -U postgres -d securegrade -tAc "SELECT count(*) FROM grades"
```

→ vẫn **401**, số dòng `grades` **không đổi**.

> Nói: *đây là điểm quan trọng nhất của phần tấn công — WAF thủng thì lớp sau vẫn giữ.*

### B7 · 7:15–8:45 — KB6: insider sửa thẳng DB (Terminal + Admin)

```bash
docker compose exec db psql -U postgres -d securegrade -c "UPDATE grades SET score = 10 WHERE enrollment_id = 1"
```

Tab admin → **Kiểm tra toàn vẹn** → hiện `enrollment 1: DB=10 / log=8.50`.

Tiếp, thử xoá dấu vết bằng chính quyền của app:

```bash
docker compose exec db psql -U app_user -d securegrade -c "DELETE FROM audit_log WHERE id = 1"
```

→ **permission denied**.

Khôi phục: `gv01` vào app nhập lại `8.50` cho `sv01`, lý do `Khoi phuc sau su co toan ven`,
kèm OTP → bấm **Kiểm tra toàn vẹn** lại → sạch.

> Nói: *hệ thống không tin cả cơ sở dữ liệu của chính nó. Và ứng dụng không có quyền
> xoá dấu vết của chính nó — kể cả khi bị chiếm quyền hoàn toàn.*

### B8 · 8:45–9:30 — Kết quả (Slide 9–10)

Quay về slide: 25/25 PASS, bảng trade-off có số đo thật (PL1 0/15 false positive, RTO 5–6 giây).

---

## C. Sự cố giữa demo

| Hiện tượng | Nguyên nhân | Xử lý tại chỗ |
| --- | --- | --- |
| `429 TOO_MANY_REQUESTS` | Quá 10 lần đăng nhập / 15 phút | `docker compose restart app` (~3 giây) |
| `OTP_INVALID` dù mã mới | Mã đã dùng trong 90 giây | Chờ sang chu kỳ sau, lấy mã mới |
| `423 ACCOUNT_LOCKED` nhầm tài khoản | Sai OTP 3 lần | Tab admin → **Người dùng** → **Mở khoá** |
| Trang trắng / API lỗi 500 | `app` chết | `docker compose logs --tail 30 app` rồi `docker compose up -d app` |
| App không khởi động, log báo `JWT_SECRET missing or too short` | `.env` hỏng | `node scripts/rotate-secrets.mjs && docker compose up -d app` |
| Quên mất đã sửa điểm gì | — | Tab admin → **Audit log**, lọc `GRADE_UPDATE` |

**Dựng lại toàn bộ từ đầu** (mất hết audit log, chỉ làm khi hỏng nặng và còn thời gian):

```bash
docker compose down -v && docker compose up -d --build   # chờ ~20 giây
```

Sau đó phải đăng ký lại MFA cho cả 4 tài khoản demo.

---

## D. Tổng duyệt

Chạy trọn bộ **2 lần**, bấm giờ. Lần 1 để tìm chỗ vấp, lần 2 để chốt thời gian.

Quay màn hình bằng OBS ở lần 2 và giữ lại file — nếu hôm trình bày máy hỏng, Docker
không lên, hoặc mạng phòng máy chặn cổng 8080 thì phát video thay cho demo live.
Đây là thứ cứu cả bài thuyết trình, đừng bỏ.
