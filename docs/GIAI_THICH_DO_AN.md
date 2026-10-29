# SecureGrade — đồ án của nhóm mình là gì

File này viết cho **thành viên trong nhóm**, để ai cũng nắm được bài có gì, đang làm gì, và trả
lời được khi thầy hỏi. Đọc theo thứ tự từ trên xuống, khoảng 20 phút.

- Phần 1–3: hiểu bài bằng lời thường, **ai cũng đọc**
- Phần 4–7: kỹ thuật, đọc để trả lời được câu hỏi của thầy
- Phần 8–9: file nào ở đâu, chạy thế nào, còn việc gì

---

## 1. Đề bài yêu cầu gì

Môn **Bảo mật mạng máy tính và hệ thống**, đồ án cuối kỳ. Nhóm chọn **Hướng 1 — Security:
thiết kế một hệ thống an toàn.**

Đề bài muốn trả lời 5 câu, và đây là câu trả lời của nhóm mình:

| Đề bài hỏi | Nhóm trả lời |
| --- | --- |
| Bảo vệ tài sản gì? | **Bảng điểm** của sinh viên, tài khoản giảng viên/admin, các khoá bí mật, nhật ký hệ thống |
| Ai dùng, ai tấn công? | Dùng: sinh viên, giảng viên, admin. Tấn công: sinh viên muốn sửa điểm, kẻ phishing, malware trên máy giảng viên, **người bên trong có quyền database**, bot dò mật khẩu |
| Rủi ro gì? | 12 rủi ro, 6 kịch bản tấn công cụ thể (mục 5) |
| Bảo vệ bằng gì? | 12 lớp kiểm chứng độc lập cho mỗi lần sửa điểm (mục 6) |
| Đầu vào bị giả mạo, tài khoản bị chiếm thì sao? | Đây là trọng tâm — mục 4 |

Đề bài còn nhấn mạnh một câu: **"Không phải mọi thông tin mà hệ thống nhận được đều đáng tin
cậy."** Cả đồ án xoay quanh câu này.

Sản phẩm phải nộp: báo cáo, sơ đồ kiến trúc + các sơ đồ cần thiết, prototype (code chạy được),
bộ test case + kết quả, slide + demo.

---

## 2. Giải thích cho người không học bảo mật

Hình dung **phòng đào tạo của trường**, nơi giảng viên đến nộp bảng điểm.

**Cách làm ngây thơ:** ai đưa đúng mật khẩu thì cho vào sửa điểm. Vấn đề: mật khẩu có thể bị lừa
lấy mất qua email giả. Người cầm mật khẩu chưa chắc là giảng viên.

**SecureGrade làm như phòng đào tạo cẩn thận:**

1. **Chỉ có một cửa vào, có bảo vệ soát người** — đó là WAF. Không có cửa sau.
2. **Vào cửa phải có cả chìa khoá lẫn thẻ** — mật khẩu cộng mã 6 số trên điện thoại (OTP). Lấy
   được mật khẩu mà không có điện thoại thì không vào được.
3. **Đã vào rồi, muốn sửa điểm vẫn phải đưa thẻ lần nữa** — nhập lại OTP mỗi lần sửa (step-up).
4. **Thẻ ra vào gắn với người cầm** — nếu ai đó nhặt được thẻ của giảng viên rồi dùng ở chỗ khác,
   bảo vệ nhận ra là người lạ, thu thẻ, và báo cho quản lý.
5. **Giảng viên chỉ sửa được điểm lớp mình dạy** — không sửa được lớp khác.
6. **Mọi lần sửa đều ghi vào sổ, các trang sổ được khâu dính vào nhau** — xé một trang là biết
   ngay. Nhân viên văn phòng chỉ được **viết thêm** vào sổ, không được tẩy xoá.
7. **Hệ thống còn tự kiểm tra: điểm trong tủ có khớp với sổ không** — nếu ai đó có chìa khoá tủ
   lén sửa điểm mà không ghi sổ, lần kiểm tra sau sẽ phát hiện.

Điểm 7 là thứ đặc biệt nhất: **hệ thống không tin cả cái tủ của chính nó.**

---

## 3. Tóm tắt một câu cho từng phần

- **Bài toán:** điểm số cần toàn vẹn; cổng vào là tài khoản giảng viên; mật khẩu đúng chưa chắc đúng người.
- **Kiến trúc:** 3 vùng mạng, chỉ WAF mở cổng, app và DB không ra được Internet.
- **Cơ chế chính:** MFA, step-up OTP, fingerprint phiên, kiểm tra quyền sở hữu, log nối chuỗi hash, quyền DB tối thiểu.
- **Chứng minh:** 25/25 test case PASS, demo trực tiếp 2 kịch bản tấn công.
- **Trade-off:** 3 quyết định có số đo thật (1 sửa/30 giây · 0/15 chặn oan · khôi phục 5–6 giây).
- **Hạn chế:** chạy HTTP trong lab, OTP không chống phishing thời gian thực, superuser DB vẫn tính lại được chuỗi hash.

---

## 4. Trọng tâm: hệ thống dựa vào đâu để tin một thông tin

Đây là bảng quan trọng nhất của đồ án (slide 5, báo cáo mục 4.7). Học thuộc ý của bảng này.

| Thông tin hệ thống nhận | Vì sao không tin ngay | Kiểm chứng bằng |
| --- | --- | --- |
| Mật khẩu | Có thể bị phishing, ClickFix, đoán | bcrypt + OTP từ thiết bị khác |
| Token JWT trong cookie | Có thể bị sửa nội dung, đổi thuật toán | Chữ ký + mã phiên phải có trong DB |
| Vai trò (`role`) ghi trong token | Người dùng tự sửa được | **Không dùng** — đọc lại từ bảng `users` mỗi request |
| Cookie phiên hợp lệ | Có thể bị malware đánh cắp | Fingerprint + nhập lại OTP khi sửa điểm |
| Mã `enrollmentId` trình duyệt gửi | Đổi số để xem/sửa của người khác (IDOR) | Kiểm tra giảng viên có dạy lớp đó |
| Điểm, lý do sửa | Giá trị ngoài miền, mã độc | Kiểm tra miền 0–10, query tham số hoá, WAF |
| Mã OTP | Bị nhìn trộm rồi dùng lại | Mỗi mã dùng một lần trong 90 giây |
| **Dữ liệu đang nằm trong DB** | Insider sửa thẳng | Chuỗi hash của log + đối chiếu điểm với log |

---

## 5. Sáu kịch bản tấn công

| KB | Kịch bản | Kẻ tấn công có gì | Hệ thống xử lý | Cảnh báo | Test |
| --- | --- | --- | --- | --- | --- |
| **KB1** | Phishing lấy mật khẩu giảng viên | Mật khẩu thật | Thiếu OTP → không vào được; sai OTP 3 lần → khoá | `MFA_FAIL_THRESHOLD` (HIGH) | TC09 |
| **KB2** | Malware lấy cookie phiên đang đăng nhập | Cookie hợp lệ | Fingerprint lệch → từ chối + **thu hồi phiên gốc** | `SESSION_CONTEXT_MISMATCH` (CRITICAL) | TC14, TC15 |
| **KB3** | Sinh viên sửa token thành admin | Token bị sửa, `alg=none` | Chữ ký sai → từ chối; role đọc từ DB | `JWT_INVALID` (HIGH) | TC11, TC12 |
| **KB4** | Giảng viên đổi mã để sửa điểm lớp khác (IDOR) | Tài khoản thật, OTP thật | Không phải chủ sở hữu → 403 | `ACCESS_DENIED_IDOR` (HIGH) | TC16, TC17 |
| **KB5** | SQL injection / XSS qua ô nhập | Payload độc | WAF chặn; **bỏ qua WAF** vẫn bị query tham số hoá chặn | Log WAF | TC19, TC20 |
| **KB6** | Insider sửa điểm thẳng trong DB, xoá log | Quyền database | Đối chiếu điểm với log → lệch; `app_user` không có quyền xoá log | `INTEGRITY_VIOLATION` (CRITICAL) | TC22–TC24 |

**Demo trực tiếp chỉ chạy KB2 và KB6** — hai cái phân biệt đồ án mình với một bài "làm web có
đăng nhập". Bốn cái còn lại nằm trong bộ test tự động.

---

## 6. Kiến trúc và 12 lớp kiểm chứng

### 6.1 Ba vùng mạng (sơ đồ 01)

```
Internet ──► [ WAF :8080 ] ──► [ App :3000 ] ──► [ PostgreSQL :5432 ]
             Zone Edge          Zone App           Zone Data
             mở cổng ra ngoài   KHÔNG mở cổng      KHÔNG mở cổng
                                KHÔNG ra Internet  KHÔNG ra Internet
```

- `waf`: nginx + ModSecurity v3 + OWASP CRS v4.30, Paranoia Level 1
- `app`: Node.js 22, Express 5
- `db`: PostgreSQL 16

Lớp mạng làm bằng Docker Compose: `net_public`, `net_app` (internal), `net_data` (internal).

### 6.2 Mười hai lớp — một request sửa điểm phải qua hết (sơ đồ 06)

1. **WAF** — lọc payload tấn công đã biết
2. **Rate limit** — 10 lần đăng nhập / 300 request API mỗi 15 phút mỗi IP
3. **Chữ ký JWT** — HS256 cố định, kiểm `iss`, `aud`, `exp`
4. **Phiên trong DB** — còn tồn tại, chưa bị thu hồi, chưa hết hạn
5. **Fingerprint** — `SHA-256(User-Agent + IP)` khớp lúc đăng nhập
6. **MFA** — phiên đã xác minh OTP
7. **RBAC** — vai trò đọc từ DB; admin **không** được sửa điểm (tách quyền)
8. **Step-up OTP** — mã mới, chưa dùng trong 90 giây
9. **Validation** — điểm 0–10, tối đa 2 số lẻ, lý do 5–200 ký tự
10. **Ownership** — giảng viên phải dạy lớp đó
11. **Query tham số hoá + quyền DB tối thiểu**
12. **Ghi log hash-chain cùng transaction** với việc ghi điểm

**Nguyên lý:** mỗi lớp độc lập. Lớp trước thủng thì lớp sau vẫn giữ (Defense-in-Depth).

---

## 7. Các khái niệm kỹ thuật cần nắm

### MFA / TOTP
Mã 6 số trên điện thoại, đổi mỗi 30 giây, tính từ một khoá bí mật dùng chung giữa điện thoại và
server (chuẩn RFC 6238). Mật khẩu đi qua trình duyệt có thể bị malware đọc, nhưng mã nằm trên
**thiết bị khác**. Hệ thống còn chặn **dùng lại mã**: cùng một mã trong 90 giây bị từ chối.

### JWT và vì sao vẫn lưu phiên trong DB
JWT là token có chữ ký, chứa thông tin người dùng. Thông thường JWT không thu hồi được trước khi
hết hạn. Nhóm thêm mã phiên `sid` trỏ tới bảng `sessions`: muốn thu hồi chỉ cần đánh dấu dòng đó,
**hiệu lực ngay request kế tiếp**. Đổi lại mỗi request thêm một truy vấn DB.

### Fingerprint
Lúc đăng nhập, server lưu `SHA-256(User-Agent + IP)`. Mỗi request tính lại và so. Lệch → token
đang được dùng ở ngữ cảnh khác → thu hồi phiên, ghi CRITICAL. Nhược điểm: đổi Wi-Fi sang 4G hoặc
cập nhật trình duyệt có thể bị đăng xuất oan (trade-off T4).

### Step-up authentication
Đã đăng nhập rồi, làm việc nguy hiểm vẫn phải xác thực lại. Vì phiên có thể bị chiếm (KB2), nên
sửa điểm đòi **người đang ngồi đó có điện thoại của giảng viên ngay lúc này**.

### IDOR (Insecure Direct Object Reference)
Lỗ hổng đổi mã số trên URL để truy cập dữ liệu người khác, ví dụ `/api/grades/2` thay vì
`/api/grades/1`. Chặn bằng cách luôn kiểm tra quyền sở hữu ở server.

### Hash-chain audit log
Mỗi dòng log chứa hash của dòng trước:
`hash = SHA256(prev_hash | ts | actor_id | action | target | detail | ip | severity)`.
Sửa một dòng cũ → hash tính lại không khớp → biết **vị trí** bị can thiệp. Giống blockchain thu nhỏ.

Hai chi tiết hay bị hỏi:
- Cột `detail` kiểu `TEXT`, không phải `JSONB`: JSONB tự sắp xếp lại khoá, chuỗi đọc ra khác chuỗi
  đã băm → báo đứt chuỗi sai.
- Ghi log dùng khoá `pg_advisory_xact_lock(42)`: hai request cùng lúc không đọc cùng một
  `prev_hash`, chuỗi không bị rẽ nhánh.

### Đối chiếu điểm với log
Lấy điểm hiện tại trong bảng `grades`, so với giá trị `new` của dòng `GRADE_UPDATE` cuối cùng của
từng sinh viên (dùng `FULL JOIN` để bắt cả điểm bị sửa, bị xoá, bị chèn thẳng). Vì mọi thay đổi
hợp lệ đều ghi log cùng transaction, hai bên **luôn khớp** — lệch nghĩa là có người sửa ngoài app.

### Least privilege (quyền tối thiểu)
App kết nối DB bằng `app_user`, không phải `postgres`:

| Bảng | Đọc | Thêm | Sửa | Xoá |
| --- | --- | --- | --- | --- |
| `users`, `sessions`, `grades` | ✅ | ✅ | ✅ | ❌ |
| `courses`, `enrollments` | ✅ | ❌ | ❌ | ❌ |
| `audit_log` | ✅ | ✅ | ❌ | ❌ |

Kể cả SQL injection thành công, kẻ tấn công chỉ có quyền của `app_user` → không xoá được log.

### WAF và OWASP CRS
CRS không chặn theo từng luật mà **cộng điểm bất thường**; tổng ≥ 5 thì chặn. Paranoia Level càng
cao càng nhạy nhưng càng dễ chặn oan. Nhóm đo và chọn PL1 (mục 7 của báo cáo).

### CIA
Confidentiality (bí mật), Integrity (toàn vẹn), Availability (sẵn sàng). Với bài này **Integrity
quan trọng nhất**, nên hệ thống sẵn sàng **chủ động đá người dùng ra** (giảm sẵn sàng) khi nghi
phiên bị đánh cắp.

### Zero Trust
"Không bao giờ tin, luôn kiểm chứng." Mỗi request được kiểm từ đầu, không có "đã vào trong thì tin".

---

## 8. Bản đồ thư mục

```
docker-compose.yml        3 container + 3 mạng
app/
  src/server.js           khởi động app, helmet, giới hạn body
  src/middleware/
    auth.js               lớp 3–6: JWT, phiên DB, fingerprint, MFA
    rbac.js               lớp 7: vai trò
    stepUp.js             lớp 8: OTP khi sửa điểm
    limits.js             lớp 2: rate limit
  src/routes/
    auth.js               đăng nhập, MFA
    grades.js             sửa điểm (lớp 9–12)
    admin.js              cảnh báo, audit, toàn vẹn, thu hồi phiên
  src/services/
    audit.js              ghi log hash-chain
    integrity.js          kiểm tra chuỗi hash + đối chiếu điểm
    detect.js             luật tương quan chạy mỗi 60 giây
    otp.js                kiểm OTP, chống dùng lại
  public/                 giao diện 5 trang
db/init/                  tạo bảng, phân quyền app_user, dữ liệu mẫu
tests/run-tests.mjs       25 test case
tests/attacks/            công cụ tấn công: forge-jwt, sqli-direct
scripts/
  otp.mjs                 in mã OTP hiện tại (dùng khi tập)
  reset-demo.mjs          đưa hệ thống về trạng thái chuẩn trước demo
  backup.sh, restore.sh   sao lưu / khôi phục
docs/
  BAO_CAO.md / .docx      báo cáo
  SLIDE.pptx              slide (dựng trên Canva)
  diagrams/               8 sơ đồ (vẽ tay bằng draw.io) + đặc tả .puml
  evidence/               11 file bằng chứng + 10 ảnh giao diện
  KICH_BAN_THUYET_TRINH.md  lời nói từng slide
  KICH_BAN_7P.md          thời gian + kịch bản demo 3 phút
  DEMO_GIAI_THICH.md      giải thích từng bước demo
  LENH_DEMO.txt           lệnh để dán khi demo
  HOI_DAP.md              câu hỏi thầy có thể hỏi + trả lời
```

### Chạy thử trên máy mình

```powershell
docker compose up -d
node scripts/reset-demo.mjs
cd tests; npm install; node run-tests.mjs; cd ..
```

Mở `http://localhost:8080`. Tài khoản: `gv01` / `Gv01@2026demo`, `admin` / `Admin@2026demo`,
`sv01` / `Sv01@2026demo` (tương tự cho `gv02`, `sv02`, `sv03`). Mã OTP lúc tập:
`node scripts/otp.mjs gv01`.

---

## 9. Đang ở đâu, còn gì

| Phần | Trạng thái |
| --- | --- |
| Code prototype | ✅ xong |
| 25 test case | ✅ 25/25 PASS |
| 8 sơ đồ | ✅ vẽ tay bằng draw.io |
| Báo cáo | ✅ nội dung xong; ⏳ điền thông tin nhóm + xuất PDF (hạn 2 tuần) |
| Slide | ✅ 12 trang; ⏳ điền tên nhóm ở trang bìa, ẩn slide 3 và 6 |
| Demo | ✅ đã tập 1 lượt (4 cảnh, ~4 phút); ⏳ tập bản 3 phút, quay OBS dự phòng |

**Việc cần cả nhóm:**
1. Mỗi người đọc file này + [`HOI_DAP.md`](HOI_DAP.md)
2. Thống nhất ai nói phần nào ([`KICH_BAN_THUYET_TRINH.md`](KICH_BAN_THUYET_TRINH.md) có gợi ý chia)
3. Tập cả bài ít nhất một lần cùng nhau, bấm giờ
