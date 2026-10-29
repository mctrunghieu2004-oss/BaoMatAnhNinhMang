# Demo SecureGrade — từng bước, làm gì, vì sao

Tài liệu này ghi lại đúng trình tự đã tổng duyệt ngày 29/10/2026, kèm lý do của từng bước.
Đọc để **hiểu**, còn lúc demo thì dán lệnh từ [`LENH_DEMO.txt`](LENH_DEMO.txt).

**Demo chính hiện là bản 3 phút, 2 cảnh** (D1 rút gọn + D3 + D4, bỏ D2, cookie copy sẵn trước
giờ). File này vẫn giải thích đủ cả 4 cảnh vì bản 4 cảnh là phương án dự phòng, và vì D2 là
nền tảng để hiểu D4.

Kịch bản thời gian: [`KICH_BAN_7P.md`](KICH_BAN_7P.md). Bản đầy đủ 9 phút 30 có thêm KB1, KB3,
KB4, KB5: [`HUONG_DAN_DEMO.md`](HUONG_DAN_DEMO.md).

---

## Bức tranh chung: demo này chứng minh điều gì

Câu hỏi của cả đồ án: **hệ thống dựa vào đâu để tin một thông tin?**

Demo trả lời bằng bốn cảnh, mỗi cảnh phá một giả định "dễ tin" thường gặp:

| Cảnh | Giả định sai thường gặp | Hệ thống trả lời |
| --- | --- | --- |
| D1 Phân vùng | "Có tường lửa ở ngoài là đủ" | App và DB không có đường vào, cũng không có đường ra Internet |
| D2 Sửa điểm hợp lệ | "Đăng nhập rồi thì làm gì cũng được" | Sửa điểm phải nhập lại OTP, và mọi thay đổi đều có dấu vết |
| D3 Đánh cắp cookie | "Có cookie hợp lệ là đúng người" | Cookie bị dùng ở nơi khác thì vô dụng, và phiên gốc bị huỷ |
| D4 Insider sửa DB | "Dữ liệu trong DB của mình thì đúng" | Hệ thống không tin cả DB của chính nó |

D3 và D4 là hai cảnh **phân biệt đồ án này** với một bài "làm web có đăng nhập". Nếu thiếu
thời gian, giữ hai cảnh này.

---

## Phần A — Chuẩn bị (không tính giờ)

### A1. Khởi động hệ thống

```powershell
docker compose up -d
```

**Làm gì:** dựng 3 container `waf`, `app`, `db` theo `docker-compose.yml`.

**Vì sao chờ ~20 giây:** `db` phải báo *healthy* thì `app` mới khởi động, rồi `waf` mới nhận
request. Gọi sớm sẽ gặp lỗi 502.

### A2. Đưa hệ thống về trạng thái chuẩn

```powershell
node scripts/reset-demo.mjs
```

**Làm gì:** ba việc, mất ~15 giây.

1. Mở khoá mọi tài khoản, xoá bộ đếm sai mật khẩu và sai OTP
2. Restart `app` để xoá bộ đếm rate limit
3. Đưa điểm `sv01` (enrollment 1) về **8.50 qua app**

**Vì sao cần — đây là bài học của buổi tập:**

- Lúc kiểm tra, điểm `sv01` đang là **10** do một lần thử trước đó. Nếu demo D4 chạy lệnh
  "sửa thành 10" thì **không có gì thay đổi**, màn quan trọng nhất không chứng minh được gì.
- Rate limit là **10 lần đăng nhập / 15 phút / IP**, giữ trong RAM của app. Tập vài lượt là
  chạm giới hạn, vào demo thật sẽ nhận `429 TOO_MANY_REQUESTS`.
- Sau mỗi lượt D4, DB đang ở trạng thái "bị phá". Không reset thì tab Kiểm tra toàn vẹn báo
  đỏ ngay từ đầu lượt sau.

**Vì sao bước 3 phải đi qua app, không `UPDATE` thẳng DB:** nếu sửa thẳng DB thì điểm và
audit log lệch nhau, chính là trạng thái D4 dùng để bắt insider. Đi qua app thì app ghi điểm
và ghi log **trong cùng một transaction**, hai bên luôn khớp.

**Chạy khi nào:** trước mỗi lượt tập, và **lần cuối ngay trước khi vào phòng**.

### A3. Mở hai cửa sổ trình duyệt — phải khác loại

| Cửa sổ | Tài khoản | Mở sẵn ở đâu |
| --- | --- | --- |
| **Thường** | `gv01` / `Gv01@2026demo` | Bảng điểm lớp SEC401 |
| **Ẩn danh** (Ctrl+Shift+N) | `admin` / `Admin@2026demo` | Tab **Cảnh báo** |

**Vì sao phải khác loại cửa sổ — bẫy đã gặp:** trình duyệt chỉ giữ **một** cookie
`sg_token` cho `localhost:8080`. Hai tab cùng cửa sổ dùng chung cookie đó, đăng nhập người sau
**đè** lên người trước. Lúc tập, gv01 quay lại tải trang thì ra trang admin. Cửa sổ ẩn danh có
kho cookie riêng nên hai tài khoản không đè nhau.

Đây cũng chính là ý của D3: **cookie là thứ duy nhất server dùng để biết bạn là ai**. Ai cầm
cookie của ai thì được coi là người đó, trừ khi có thêm lớp kiểm tra.

### A4. Lấy mã OTP

Lúc thật dùng **điện thoại** (Google Authenticator / Microsoft Authenticator). Lúc tập, hoặc
khi điện thoại hỏng:

```powershell
node scripts/otp.mjs gv01
node scripts/otp.mjs admin
node scripts/otp.mjs          # cả 6 tài khoản
```

**Ba quy tắc của OTP — đều đã vấp lúc tập:**

1. **Mã sống 30 giây.** Script in số giây còn lại; dưới ~10 giây thì chờ mã mới.
2. **Mỗi mã dùng đúng một lần trong 90 giây, kể cả khi request bị từ chối.** Bấm Lưu hai lần,
   hoặc dán lại mã cũ, sẽ bị `STEP_UP_FAIL_REPLAY`. Đây là chống **tấn công phát lại**: kẻ
   nghe lén được một mã cũng không dùng lại được.
3. **Mã hết hạn không phải đăng nhập lại.** Phiên sau bước mật khẩu sống 5 phút, chỉ cần lấy
   mã mới.

**Vì sao script đọc được mã:** script đọc `mfa_secret` thẳng từ DB bằng quyền vận hành trên máy
host (luồng F4 trong báo cáo). Nó cũng là hạn chế đã ghi ở slide 11: `mfa_secret` đang lưu
dạng rõ. Thầy hỏi thì trả lời đúng vậy, đừng nói là "cửa hậu".

### A5. Chuẩn bị khác

- Mở sẵn [`LENH_DEMO.txt`](LENH_DEMO.txt) để dán, **không gõ** lệnh trước mặt thầy
- Terminal đã `cd D:\BaoMatAnNinhMang`
- Trong PowerShell luôn gõ **`curl.exe`**, không phải `curl` — xem bẫy ở D1

---

## D1 — Phân vùng mạng (mục tiêu 0:25)

### Lệnh

```powershell
docker compose ps
curl.exe -i http://localhost:3000/health
```

### Kết quả mong đợi

```
app   ...   3000/tcp
db    ...   5432/tcp
waf   ...   0.0.0.0:8080->8080/tcp
```

```
curl: (7) Failed to connect to localhost:3000 ... Could not connect to server
```

### Đọc kết quả thế nào

Cột **PORTS** có dấu **`->`** nghĩa là cổng đó được **ánh xạ ra máy host**, tức là từ ngoài vào
được. Chỉ `waf` có `->`. `app` và `db` chỉ hiện `3000/tcp`, `5432/tcp` — cổng mở **bên trong
mạng Docker**, không ra ngoài.

Lệnh `curl.exe` thứ hai chứng minh điều đó bằng hành động: gọi thẳng vào app ở cổng 3000 thì
**không kết nối được**.

### Vì sao thiết kế vậy

Ba zone mạng tách biệt (`net_public`, `net_app`, `net_data`; hai mạng sau là `internal`):

- **Một cửa vào duy nhất** là WAF. Mọi request phải đi qua bộ lọc ModSecurity + OWASP CRS.
  Nếu app có cổng riêng, kẻ tấn công gọi thẳng vào app là WAF vô dụng.
- **App và DB không có đường ra Internet** (luồng D4 bị chặn). Hệ quả: kể cả kẻ tấn công thực
  thi được mã trong app (RCE), cũng **không gửi dữ liệu ra ngoài được**.

### Câu nói

> *"Chỉ có một cửa vào là WAF. App và DB không có đường ra Internet, nên có lỗ hổng thực thi mã
> trong app cũng không đánh cắp dữ liệu ra ngoài được."*

### Bẫy đã gặp

`curl` trần trong PowerShell bị đổi thành `Invoke-WebRequest`, nó hỏi `Uri:` rồi treo. Bấm
**Ctrl+C**, gõ lại bằng `curl.exe`.

Nếu lệnh thứ hai ra `200 OK`: **đừng vui**. Có lần một chương trình khác trên máy (Vite của dự
án khác) chiếm cổng 3000, curl kết nối được vào nó chứ không phải vào app. `docker compose ps`
mới là bằng chứng gốc.

---

## D2 — Sửa điểm hợp lệ (mục tiêu 0:25 → 1:10)

### Thao tác

Cửa sổ thường (gv01) → lớp **SEC401** → **Sửa** ở `sv02` → điền:

| Ô | Giá trị |
| --- | --- |
| Điểm | một số khác điểm hiện tại, ví dụ `7.5` |
| Lý do | `Cham lai bai thi cuoi ky` (ít nhất 5 ký tự) |
| Mã OTP mới (step-up) | lấy **lúc con trỏ đã nằm trong ô** |

→ **Lưu** đúng một lần → sang cửa sổ ẩn danh (admin) → tab **Audit log**.

### Kết quả mong đợi

Thông báo **"Đã lưu điểm"**. Ở Audit log, dòng trên cùng (hoặc gần trên cùng):

```
GRADE_UPDATE   2   enrollment:3   INFO   7b3c8d316a...
```

Cột cuối là **hash**. Chi tiết của dòng ghi `{"old": ..., "new": 7.5, "reason": "..."}`.

### Vì sao có ô OTP dù đã đăng nhập — step-up authentication

Đăng nhập đã nhập OTP rồi, sửa điểm vẫn bắt nhập lại. Lý do: **phiên đăng nhập có thể bị
chiếm** (D3 sẽ cho thấy). Thao tác nguy hiểm nhất của hệ thống — đổi điểm — phải chứng minh
**người đang ngồi đó có điện thoại của giảng viên ngay lúc này**, chứ không chỉ "đã từng đăng
nhập".

### Vì sao chọn sv02 chứ không phải sv03

`sv03` đã có điểm từ lần chạy trước. Chọn ô có giá trị mới khác giá trị cũ để dòng audit hiện
rõ `old → new`.

### Ý nghĩa của dòng audit

Ba thứ cùng lúc:

1. **Ai, sửa gì, từ bao nhiêu thành bao nhiêu, vì sao** — không chối được.
2. **Ghi cùng transaction với điểm.** Điểm đổi thì chắc chắn có log; ghi log lỗi thì điểm
   cũng không đổi. **Không tồn tại** trạng thái "điểm đã đổi mà không có dấu vết".
3. **Hash nối chuỗi:**
   `hash = SHA256(prev_hash | ts | actor_id | action | target | detail | ip | severity)`.
   Mỗi dòng chứa hash của dòng trước, giống blockchain thu nhỏ. Sửa một dòng cũ thì mọi dòng
   sau tính lại ra hash khác, đứt chuỗi.

### Câu nói

> *"Ô OTP này là step-up, không phải đăng nhập lại. Điểm vừa đổi đã có một dòng log ghi cùng
> transaction — không tồn tại trạng thái điểm đổi mà không có log."*

### Bẫy đã gặp

Lần đầu bị **"Cần mã OTP mới để sửa điểm"**, audit ghi `STEP_UP_FAIL_REPLAY`: mã gửi đi trùng
mã vừa dùng. Xoá sạch ô OTP, chờ mã mới, bấm Lưu **một lần**.

---

## D3 — KB2: Đánh cắp cookie phiên (mục tiêu 1:10 → 2:20)

### Kịch bản tấn công giả lập

Giảng viên bị nhiễm **infostealer** (malware đánh cắp thông tin, thường lây qua chiêu ClickFix).
Malware đọc file profile trình duyệt, lấy cookie phiên đang đăng nhập, gửi về cho kẻ tấn công.
Kẻ tấn công không cần mật khẩu, không cần điện thoại — đã có sẵn phiên đăng nhập.

### Thao tác 1 — Lấy cookie (đóng vai malware)

Cửa sổ **thường** (gv01) → **F12** → **Application** → **Cookies** → `http://localhost:8080` →
bấm dòng `sg_token` → khung **Cookie Value** bên dưới → **Ctrl+A**, **Ctrl+C**.

**Điều cần chỉ cho thầy trong bảng cookie:**

| Cột | Giá trị | Ý nghĩa |
| --- | --- | --- |
| HttpOnly | ✓ | JavaScript trên trang **không đọc được** cookie → chống XSS lấy cookie |
| SameSite | Strict | Trình duyệt **không gửi** cookie khi request đến từ trang khác → chống CSRF |

Và câu quan trọng: **HttpOnly chặn JavaScript, nhưng không chặn malware đọc file trên ổ đĩa.**
Đó là lý do cần thêm lớp kiểm tra ở phía server.

### Thao tác 2 — Dùng cookie từ "máy khác" (đóng vai kẻ tấn công)

```powershell
$c = "dán-cookie-vào-đây"
curl.exe -s http://localhost:8080/api/me -H "Cookie: sg_token=$c"
```

**Vì sao chia hai lệnh:** cookie dài ~280 ký tự. Dán vào giữa một dòng lệnh dài rất dễ sót dấu
`"`. Lệnh 1 chỉ cất cookie vào biến `$c` (không in gì là đúng), lệnh 2 **cố định**, dán sẵn
được.

**Vì sao `-s` thay vì `-i`:** `-i` in cả chục dòng header, thầy không kịp đọc. `-s` chỉ in
đúng một dòng JSON.

### Kết quả mong đợi

```json
{"error":"SESSION_CONTEXT_MISMATCH"}
```

(với `-i` thì thấy thêm dòng đầu `HTTP/1.1 401 Unauthorized`)

### Vì sao bị từ chối dù cookie hoàn toàn hợp lệ

Server kiểm tra lần lượt, cookie qua hết các lớp đầu:

1. Chữ ký JWT đúng ✓
2. Phiên còn trong DB, chưa hết hạn ✓
3. **Fingerprint khớp không?** ✗

**Fingerprint** = `SHA-256(User-Agent + IP)`, tính và lưu lúc đăng nhập. Trình duyệt gửi
User-Agent kiểu `Mozilla/5.0 ... Chrome/...`, còn curl gửi `curl/8.21.0`. Khác nhau → fingerprint
không khớp → server kết luận **cookie đang được dùng ở ngữ cảnh khác với lúc đăng nhập**.

### Thao tác 3 — Xem giảng viên bị đá ra

Cửa sổ thường (gv01) → bấm một thao tác bất kỳ (chọn lại lớp, hoặc Sửa → Lưu) → **bị đưa ra
trang đăng nhập**.

**Vì sao:** khi phát hiện fingerprint lệch, server **thu hồi luôn phiên gốc**
(`revoke_reason = CONTEXT_MISMATCH`), không chỉ từ chối request của kẻ tấn công. Đã kiểm tra
trong DB lúc tập: phiên bị thu hồi **đúng giây** chạy curl, không phải lúc bấm Lưu.

**Ý nghĩa:** cookie bị đánh cắp trở thành vô dụng với **cả hai bên**. Giảng viên bị đá ra là một
tín hiệu bất thường để họ báo sự cố.

### Thao tác 4 — Xem cảnh báo ở admin

Cửa sổ ẩn danh (admin) → tab **Cảnh báo** → dòng trên cùng:

```
CRITICAL   SESSION_CONTEXT_MISMATCH   2   session:...   {"ua":"curl/8.21.0"}
```

Ghi cả `ua` (User-Agent) của kẻ tấn công, tức là biết họ dùng công cụ gì.

### Nếu thầy hỏi: "Giả đúng User-Agent và IP thì sao?"

Thì fingerprint khớp, đọc được dữ liệu. Nhưng **muốn sửa điểm vẫn phải có OTP step-up** (D2), mà
OTP sinh ra từ điện thoại của giảng viên, malware trên máy tính không có. Đó là hai lớp độc lập:
fingerprint **phát hiện**, step-up OTP **chặn**.

### Câu nói

> *"Infostealer lấy được cookie vẫn không dùng được, vì phiên gắn với ngữ cảnh lúc đăng nhập.
> Phiên gốc bị thu hồi luôn — kẻ tấn công vừa dùng cookie thì chính giảng viên bị đá ra, đó là
> tín hiệu để báo sự cố."*

### Bẫy đã gặp

- Cookie phải lấy ở cửa sổ **thường** (gv01). Lấy nhầm cửa sổ admin là đang đánh cắp phiên admin.
- Tab Cảnh báo **giữ dòng của các lượt tập trước** (log không xoá được, đó là chủ ý). Chỉ vào
  **dòng trên cùng, nhìn cột thời điểm**, đừng nói "chỉ có một dòng CRITICAL".

---

## D4 — KB6: Insider sửa thẳng DB (mục tiêu 2:20 → 3:45)

### Kịch bản tấn công giả lập

Kẻ tấn công là **người bên trong** có quyền quản trị cơ sở dữ liệu (DBA, người vận hành máy
chủ). Họ **không đi qua app**, nên mọi lớp ở D2, D3 đều không có tác dụng. Đây là tác nhân mà
phần lớn đồ án bỏ qua.

### Thao tác 1 — Mở tab Kiểm tra toàn vẹn **trước**

Cửa sổ ẩn danh (admin) → tab **Kiểm tra toàn vẹn**:

```
So dong log            375
Dong bi dut chuoi hash khong co
Diem lech so voi log   khong co
```

**Vì sao mở trước:** để thầy thấy trạng thái **sạch** làm mốc so sánh. Không có mốc thì kết quả
sau không có ý nghĩa.

### Thao tác 2 — Sửa điểm thẳng trong DB

```powershell
docker compose exec db psql -U postgres -d securegrade -c "UPDATE grades SET score = 10 WHERE enrollment_id = 1"
```

Kết quả: `UPDATE 1`.

**Giải thích lệnh:** `docker compose exec db` chạy lệnh bên trong container DB; `-U postgres`
là **superuser** của PostgreSQL, quyền cao nhất; lệnh SQL đổi điểm `sv01` (enrollment 1) từ 8.50
thành 10. **Không có app nào được gọi, không có dòng audit nào được ghi.**

### Thao tác 3 — Kiểm tra lại

Tab **Kiểm tra toàn vẹn**, bấm lại để chạy mới:

```
Diem lech so voi log   enrollment 1: DB=10 / log=8.5
```

Đồng thời tab Cảnh báo có thêm dòng `CRITICAL INTEGRITY_VIOLATION`, chi tiết ghi
`{"enrollmentId":1, "dbScore":10, "loggedScore":8.5}`.

**Cơ chế phát hiện:** hệ thống lấy điểm hiện tại trong bảng `grades`, so với giá trị `new` của
dòng `GRADE_UPDATE` cuối cùng trong audit log. Mọi thay đổi hợp lệ đều đi qua app và ghi log cùng
transaction (D2), nên **hai bên phải luôn khớp**. Lệch nghĩa là có ai sửa điểm mà không qua app.

**Vì sao chuỗi hash vẫn "không có dòng bị đứt":** kẻ tấn công **chưa đụng vào log**, chỉ sửa
điểm. Hai cơ chế bắt hai kiểu tấn công khác nhau:

| Kẻ tấn công làm gì | Cơ chế bắt |
| --- | --- |
| Sửa điểm, không sửa log | **Đối chiếu điểm với log** → lệch |
| Sửa log để che giấu | **Chuỗi hash** → đứt từ dòng bị sửa |
| Sửa cả hai cho khớp | Cần tính lại hash cả chuỗi — xem hạn chế bên dưới |

### Thao tác 4 — Thử xoá dấu vết bằng quyền của app

```powershell
docker compose exec db psql -U app_user -d securegrade -c "DELETE FROM audit_log WHERE id = 1"
```

Kết quả: `ERROR: permission denied for table audit_log`.

**Giải thích:** lần này dùng `-U app_user`, tài khoản **mà ứng dụng dùng để kết nối DB**. Nó
được cấp quyền tối thiểu (least privilege):

- `audit_log`: chỉ `SELECT` và `INSERT` — **không có** `UPDATE`, **không có** `DELETE`
- Mọi bảng: **không có** `DELETE`

**Ý nghĩa:** kể cả khi kẻ tấn công **chiếm hoàn toàn được app** (SQL injection, RCE), họ chỉ có
quyền của `app_user`, nên **không xoá được dấu vết của chính mình**. Log là append-only ở cấp DB,
không phụ thuộc vào code app có đúng hay không.

### Hạn chế — nói thẳng nếu thầy hỏi

Superuser `postgres` về lý thuyết **tính lại được toàn bộ chuỗi hash** sau khi sửa log, để chuỗi
trông như chưa từng bị đụng. Hướng xử lý (slide 11): gửi log ra hệ thống ngoài như SIEM, lưu
trên WORM storage (ghi một lần, không sửa được), tạm thời thì xuất `lastHash` (hash cuối) ra
ngoài làm mốc — tab Kiểm tra toàn vẹn hiện sẵn giá trị này ở dòng **Hash cuối (anchor)**.

### Câu nói

> *"Hệ thống không tin cả cơ sở dữ liệu của chính nó. Và ứng dụng không có quyền xoá dấu vết của
> chính nó — kể cả khi bị chiếm quyền hoàn toàn."*

### Sau D4

Hệ thống đang ở trạng thái "bị phá" (điểm sv01 = 10, log ghi 8.5). **Phải chạy lại
`node scripts/reset-demo.mjs`** trước lượt tiếp theo.

---

## Câu chốt cuối demo

> *"Bốn kịch bản tấn công còn lại nằm trong bộ test tự động, 25/25 PASS — em chạy được ngay nếu
> thầy muốn xem."*

---

## Kết quả tổng duyệt ngày 29/10/2026

| | Kết quả | Bằng chứng |
| --- | --- | --- |
| D1 | ✅ | Chỉ `waf` có `->`; `localhost:3000` từ chối kết nối |
| D2 | ✅ | `GRADE_UPDATE` id 366, `old: null → new: 9` |
| D3 | ✅ | `401 SESSION_CONTEXT_MISMATCH`; gv01 bị đá ra; CRITICAL id 375, 386 |
| D4 | ✅ | `DB=10 / log=8.5`; `INTEGRITY_VIOLATION` id 376; `DELETE` bị `permission denied` |
| Thời gian | ~4 phút | Làm một mình, chưa thành thạo; khung cho phép 3–5 phút |

Ba bẫy đã gặp: dùng chung cookie khi hai tài khoản cùng cửa sổ; `curl` bị PowerShell đổi thành
`Invoke-WebRequest`; OTP bị từ chối vì phát lại.
