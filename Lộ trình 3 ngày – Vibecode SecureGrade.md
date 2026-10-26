# Lộ trình 3 ngày – Vibecode SecureGrade

Oct 26, 2026 · @HieuDepTrai

## Cách làm và lịch

**Toàn bộ code đã có sẵn trong bản kế hoạch; việc của bạn là đưa từng bước cho AI viết vào repo, chạy lệnh kiểm tra, chụp bằng chứng, commit.** Làm đủ 3 ngày thứ 3, 4, 5; tối nay (thứ 2) làm giai đoạn 0–2 để không mất ngày 1 vào việc cài đặt. Thứ 6 sáng chỉ chạy thử demo, không viết code mới.

| Mốc | Việc | Đầu ra kiểm chứng được |
| --- | --- | --- |
| Tối thứ 2 (≈3 giờ) | GĐ0 cài đặt + CLAUDE.md; GĐ1 hạ tầng 3 vùng mạng; GĐ2 DB + least privilege | `docker compose up` chạy; D1–D5 bị chặn; 4 lệnh vi phạm quyền DB bị từ chối |
| Ngày 1 – thứ 3 | GĐ3 đăng nhập + MFA + JWT/session; GĐ4 RBAC + step-up OTP + sửa điểm | Đăng nhập 2 bước chạy; sinh viên không xem được điểm người khác |
| Ngày 2 – thứ 4 | GĐ5 audit hash-chain + cảnh báo; GĐ6 rate limit + WAF; GĐ7 giao diện tối thiểu | Có log, phát hiện sửa điểm trực tiếp trong DB; thao tác được qua trình duyệt |
| Ngày 3 – thứ 5 | GĐ8 test case + script tấn công; GĐ9 backup/restore; GĐ10 báo cáo, slide, kịch bản demo | Bảng PASS/FAIL; ảnh bằng chứng; file báo cáo và slide hoàn chỉnh |
| Thứ 6 sáng | Chạy thử demo 1 lần từ `docker compose down -v` | Video dự phòng đã quay |

### Quy tắc vibecode cho đồ án này

1. **Dùng Claude Code (hoặc Cursor) mở thẳng thư mục repo**, để AI tự tạo/sửa file. Không copy-paste từng đoạn qua khung chat.
2. **Mỗi prompt chỉ làm 1 giai đoạn.** Prompt dài nhiều giai đoạn làm AI tự đổi thiết kế và bạn khó bắt lỗi.
3. **Luôn trỏ về kế hoạch:** "làm đúng mục X của `docs/KE_HOACH.md`, không đổi tên file, không đổi kiến trúc". Kế hoạch đã có thiết kế đã kiểm tra; AI tự nghĩ thiết kế khác dễ làm mất ý đồ bảo mật.
4. **Chạy lệnh kiểm tra ngay sau mỗi giai đoạn**, dán nguyên văn lỗi cho AI nếu sai. Chưa qua kiểm tra thì không sang giai đoạn sau.
5. **Commit sau mỗi giai đoạn qua kiểm tra.** Hỏng thì `git reset --hard` về commit trước, không sửa chồng sửa.
6. **Không để AI tự thêm tính năng ngoài phạm vi** (đăng ký, quên mật khẩu, đổi theme…). Mỗi tính năng thừa là thêm lỗi và thêm thứ phải giải thích khi bảo vệ.
7. **Chụp ảnh kết quả ngay khi chạy**, lưu `docs/evidence/<giai-đoạn>/`. Báo cáo ở GĐ10 dùng chính các ảnh này.

### Tiêu chí "xong" của cả đồ án

- [ ] `docker compose down -v && docker compose up -d --build` dựng lại từ trống mà không sửa tay.
- [ ] Chạy `node tests/run-tests.mjs` ra bảng PASS/FAIL, ít nhất 18 case đạt.
- [ ] 3 kịch bản demo chạy được liên tục không lỗi: phishing lấy mật khẩu GV, giả JWT/IDOR, sửa điểm trực tiếp trong DB.
- [ ] Báo cáo, slide, video demo dự phòng đã có.

## Giai đoạn 0 – Cài đặt và chuẩn bị "bộ nhớ" cho AI (tối thứ 2, ≈1 giờ)

**Chỉ cần 5 thứ để bắt đầu: Docker Desktop, Node.js LTS, Git, VS Code, app authenticator trên điện thoại.** Postman, draw.io, OBS cài sau khi cần (ngày 3).

### 0.1 Cài phần mềm (làm đúng thứ tự)

1. Windows: mở PowerShell quyền Administrator, chạy `wsl --install`, khởi động lại máy. macOS bỏ qua bước này.
2. Cài Docker Desktop, chọn WSL 2 backend, mở lên đợi trạng thái "running".
3. Cài Git. Tại mục line ending chọn "Checkout as-is, commit Unix-style" (tránh lỗi file `.sh` bị CRLF).
4. Cài Node.js LTS (≥ 22), VS Code.
5. Cài app Google/Microsoft Authenticator trên điện thoại, bật đồng bộ giờ tự động (lệch giờ thì OTP sai).
6. Cài công cụ vibecode: Claude Code (theo hướng dẫn cài đang dùng của bạn) hoặc Cursor. Đăng nhập xong, mở được thư mục dự án.

Kiểm tra (phải ra phiên bản, không lỗi):

```bash
git --version
node -v
docker --version
docker compose version
docker run --rm hello-world
```

### 0.2 Tạo repo và đưa kế hoạch vào

```bash
mkdir securegrade && cd securegrade
git init
mkdir -p docs/evidence
# lưu bản kế hoạch thành docs/KE_HOACH.md (tải file .md đã đính kèm, đổi tên)
```

File `docs/KE_HOACH.md` là nguồn sự thật: chứa kiến trúc, schema, code mẫu từng bước. Mọi prompt bên dưới đều trỏ vào file này.

### 0.3 Tạo `CLAUDE.md` ở gốc repo

AI đọc file này mỗi lần mở phiên mới, nên ràng buộc được nó không đổi thiết kế. Dán nguyên nội dung dưới đây:

```markdown
# SecureGrade – quy tắc cho AI

Nguồn sự thật: docs/KE_HOACH.md. Khi code, đọc mục tương ứng trước rồi làm đúng theo đó.

## Ràng buộc
- Chỉ làm đúng giai đoạn được yêu cầu. Không thêm tính năng, không đổi tên file/thư mục.
- Không đổi kiến trúc: 3 container (waf, app, db), 3 network (net_public, net_app internal, net_data internal). Chỉ waf có `ports`.
- Stack: Node 22 + Express (ESM), pg, bcryptjs, jsonwebtoken, otplib v13, qrcode, cookie-parser, helmet, express-rate-limit. PostgreSQL 16. UI là HTML + vanilla JS, không dùng framework.
- SQL luôn dùng tham số $1,$2; không nối chuỗi.
- Role lấy từ DB, không tin claim trong token. Không log mật khẩu, OTP, JWT, mfa_secret.
- app_user không được DELETE và không được UPDATE audit_log. Không nới quyền để code chạy.
- app KHÔNG dùng env_file; truyền từng biến môi trường trong docker-compose.yml.
- Secret chỉ nằm trong .env (đã gitignore). Không hard-code secret.

## Quy trình
- Sau khi code xong, in ra các lệnh kiểm tra tương ứng trong kế hoạch để người dùng chạy. Không tự tuyên bố "xong" khi chưa chạy được.
- Ghi chú không chắc chắn (ví dụ tham số tolerance của otplib v13) thay vì đoán.
```

### 0.4 Prompt mở đầu phiên

```text
Đọc CLAUDE.md và docs/KE_HOACH.md. Tóm tắt cho tôi trong 10 dòng: kiến trúc, 10 bước, và những chỗ kế hoạch ghi là "chưa xác minh". Chưa viết code.
```

Nếu bản tóm tắt sai kiến trúc, sửa `CLAUDE.md` trước khi sang bước sau.

- [ ] 5 lệnh kiểm tra ở 0.1 đều chạy.
- [ ] `CLAUDE.md` và `docs/KE_HOACH.md` nằm trong repo; commit: `step-0: setup`.

## Giai đoạn 1 và 2 – Hạ tầng phân vùng và Database (tối thứ 2, ≈2 giờ)

**Kết thúc: `docker compose up` chạy 3 container, 5 luồng bị chặn D1–D5 được chứng minh, `app_user` không xóa/sửa được log.** Đây là nền cho toàn bộ phần "Defense-in-Depth" của báo cáo.

### Giai đoạn 1 – Docker Compose, WAF, app `/health`

Prompt:

```text
Làm Bước 1 (mục 4) trong docs/KE_HOACH.md. Tạo: docker-compose.yml, .env.example, .gitignore, .gitattributes, app/Dockerfile, app/package.json (type=module) cùng các dependency đã liệt kê, app/src/server.js chỉ có /health, và 3 file rỗng db/init/01_schema.sql, 02_roles.sh, 03_seed.sql. Chạy npm install trong app/ để có package-lock.json. Sau đó sinh .env từ .env.example với 3 giá trị ngẫu nhiên (JWT_SECRET 96 ký tự hex; mật khẩu DB chỉ dùng chữ và số). Không đổi gì ngoài mục 4.
```

Sau khi AI xong, tự chạy và chụp ảnh từng lệnh (các lệnh nằm ở mục 4.4 của kế hoạch):

| Lệnh | Kỳ vọng | Chứng minh |
| --- | --- | --- |
| `docker compose ps` | Chỉ `waf` có `0.0.0.0:8080->8080` | Chỉ một cổng mở |
| `curl -i http://localhost:8080/health` | 200 | F1, F2 hoạt động |
| `curl -i http://localhost:3000/health` | Connection refused | D1 |
| `Test-NetConnection localhost -Port 5432` (Windows) hoặc `nc -zv localhost 5432` | Thất bại | D2 |
| `docker compose exec waf getent hosts db` | Không ra gì | D3 |
| `docker compose exec app node -e "fetch('https://example.com').then(()=>console.log('FAIL')).catch(()=>console.log('OK'))"` | In `OK` | D4 |
| `curl -i -G http://localhost:8080/health --data-urlencode "id=1' OR '1'='1"` | 403 | WAF chặn SQLi |

Nếu lỗi, dán nguyên văn `docker compose logs <service>` cho AI. Lỗi thường gặp: 502 (app chưa lên), cổng 8080 bị chiếm (đổi `8081:8080`), `npm ci` thiếu lock file. Nếu WAF báo không resolve được `app`, thêm `RESOLVERS: 127.0.0.11` vào `waf` (kế hoạch ghi là chưa kiểm chứng, chỉ làm khi gặp lỗi).

- [ ] 7 lệnh trên đều ra đúng kỳ vọng, ảnh lưu `docs/evidence/step1/`.
- [ ] `git status` không thấy `.env`. Commit: `step-1: infra + segmentation`.

### Giai đoạn 2 – Schema, `app_user` least privilege, seed

Prompt:

```text
Làm Bước 2 (mục 5) trong docs/KE_HOACH.md: điền db/init/01_schema.sql, 02_roles.sh, 03_seed.sql và tạo app/src/db.js đúng như kế hoạch (audit_log.detail là TEXT, không JSONB; không seed điểm). Giữ 02_roles.sh ở dạng LF. Tạo docs/erd.puml từ mục 5.7. Sau đó chạy docker compose down -v rồi up lại và báo kết quả 4 lệnh vi phạm quyền.
```

Chạy từng lệnh ở mục 5.6 và chụp ảnh:

```bash
docker compose down -v
docker compose up -d --build
docker compose exec db psql -U postgres -d securegrade -c "\dt"
docker compose exec db psql -U postgres -d securegrade -c "SELECT username, role, left(password_hash, 7) FROM users"
# 4 lệnh dưới đây phải bị từ chối (permission denied / must be owner)
docker compose exec db psql -U app_user -d securegrade -c "DELETE FROM audit_log"
docker compose exec db psql -U app_user -d securegrade -c "UPDATE audit_log SET action = 'x'"
docker compose exec db psql -U app_user -d securegrade -c "DELETE FROM grades"
docker compose exec db psql -U app_user -d securegrade -c "DROP TABLE grades"
```

Nếu `psql -U app_user` hỏi mật khẩu, thêm `-h 127.0.0.1` và nhập `APP_DB_PASSWORD`. Script trong `db/init` chỉ chạy khi volume trống, nên sửa xong phải `down -v`.

- [ ] 6 bảng tồn tại, 6 user seed có hash bắt đầu `$2a$`.
- [ ] 4 lệnh vi phạm bị từ chối, ảnh lưu `docs/evidence/step2/` (dùng cho TC23). Commit: `step-2: schema + least privilege`.

## Ngày 1 (thứ 3) – Xác thực và phân quyền

**Kết thúc ngày: đăng nhập 2 bước hoạt động, cookie phải khớp session và thiết bị, sửa điểm phải qua 4 cổng.** Đây là phần lõi chặn kịch bản phishing/ClickFix: lấy được mật khẩu và cookie vẫn không đủ để sửa điểm. Chia làm sáng (GĐ3) và chiều (GĐ4).

### Giai đoạn 3 – Đăng nhập + MFA TOTP + JWT gắn session (≈4–5 giờ)

Phase này cần `logEvent` (của Giai đoạn 5), nên cho AI tạo trước bản audit đầy đủ ngay bây giờ. Việc này để code khỏi lỗi import; phần API admin và phát hiện để ngày 2.

Prompt 3a (nền):

```text
Tạo app/src/config.js, app/src/services/otp.js, app/src/services/audit.js (lấy code mục 6.3, 6.4 và 8.2 trong docs/KE_HOACH.md), và app/src/middleware/auth.js (mục 6.5). Chưa tạo route. Giữ nguyên logic 4 lớp kiểm chứng token. Cuối cùng liệt kê các chỗ kế hoạch ghi là "chưa xác minh".
```

Prompt 3b (route):

```text
Làm app/src/routes/auth.js theo mục 6.1, 6.2 và 6.6, gắn vào server.js các route /api/auth/*, /api/me, thêm cookie-parser, express.json (giới hạn body nhỏ) và app.set('trust proxy', 1). Cookie sg_token: httpOnly, sameSite strict, secure=false khi chạy HTTP lab. Bắt buộc: pre-MFA 5 phút, session đầy đủ 15 phút, đổi session ID sau OTP đúng, khóa sau 5 lần sai mật khẩu và 3 lần sai OTP, không phân biệt "sai user" với "sai mật khẩu" trong thông báo lỗi.
```

Kiểm tra (mục 6.8): dùng Postman/Thunder Client, chạy 5 bước.

| Bước | Yêu cầu | Kỳ vọng |
| --- | --- | --- |
| 1 | `POST /api/auth/login` `{"username":"sv01","password":"Sv01@2026demo"}` | 200, `next = MFA_ENROLL`, có cookie `sg_token` |
| 2 | `POST /api/auth/mfa/setup` | Trả `qr`; dán chuỗi data URL vào thanh địa chỉ để hiện QR, quét bằng điện thoại |
| 3 | `POST /api/auth/mfa/enable` `{"otp":"<6 số>"}` | 200 |
| 4 | `GET /api/me` | 200, `role = STUDENT` |
| 5 | Copy cookie, gọi `/api/me` bằng `curl` (User-Agent khác) | 401 `SESSION_CONTEXT_MISMATCH`; gọi lại trong Postman: 401 `SESSION_REVOKED` |

Lưu ý khi test: bạn sẽ phải bật MFA cho cả `gv01`, `sv01`, `sv02`, `admin` (mỗi tài khoản quét một QR). Với demo, thêm tài khoản vào cùng app authenticator trên điện thoại; mỗi tài khoản là một dòng riêng. Ghi lại `mfa_secret` chỉ trong môi trường test, để script tự động sinh OTP ở ngày 3.

Lưu ý gỡ lỗi:

- OTP luôn sai: kiểm tra đồng bộ giờ điện thoại. Kế hoạch ghi chưa xác minh tham số tolerance của otplib v13, nên nếu lệch giờ nhẹ vẫn từ chối, tìm trong API Reference của otplib thay vì để AI đoán.
- Kiểm tra `req.ip`: nếu luôn là IP của container WAF thì WAF không gửi `X-Forwarded-For`; ghi kết quả vào phần hạn chế của báo cáo.

* [ ] 5 bước trên đều đúng. Sai mật khẩu 5 lần → 423; sai OTP 3 lần → 423.
* [ ] Ảnh lưu `docs/evidence/step3/`. Commit: `step-3: auth + mfa + session`.

### Giai đoạn 4 – RBAC, ownership, step-up OTP, API điểm (≈3 giờ)

**Sửa điểm phải qua 4 cổng: đúng vai trò LECTURER, đúng lớp mình dạy, dữ liệu hợp lệ, và OTP mới tại thời điểm sửa.** Admin không được sửa điểm (tách nhiệm vụ).

Prompt:

```text
Làm Bước 4 (mục 7): tạo middleware/rbac.js, middleware/stepUp.js, routes/grades.js và gắn vào server.js. Endpoint: GET /api/grades/me, GET /api/courses/mine, GET /api/courses/:id/grades, PUT /api/grades/:enrollmentId. PUT phải: requireAuth → requireRole('LECTURER') → requireStepUp (header X-OTP) → kiểm tra ownership bằng DB → validate score 0–10 tối đa 2 chữ số thập phân → ghi điểm cũ/mới + audit GRADE_UPDATE trong cùng một transaction có pg_advisory_xact_lock. student_id không nhận từ client. Ghi ACCESS_DENIED_IDOR khi sai lớp.
```

Kiểm tra (mục 7.7), dùng Postman:

1. `gv01` đăng nhập + OTP đầy đủ, `PUT /api/grades/<id enrollment SEC401>` `{"score":8.5}` kèm header `X-OTP` đúng → 200; không kèm → 401 `STEP_UP_REQUIRED`.
2. `gv01` sửa enrollment của lớp NET301 → 403 và có dòng `ACCESS_DENIED_IDOR` trong `audit_log`.
3. `sv01` gọi `/api/courses/1/grades` → 403.
4. Admin gọi `PUT /api/grades/...` → 403.

Để thấy log: `docker compose exec db psql -U postgres -d securegrade -c "SELECT id, action, severity FROM audit_log ORDER BY id DESC LIMIT 10"`.

- [ ] 4 kiểm tra trên đều đúng, ảnh lưu `docs/evidence/step4/`.
- [ ] Commit: `step-4: rbac + ownership + step-up`.

## Ngày 2 (thứ 4) – Phát hiện, làm cứng, giao diện

**Kết thúc ngày: sửa điểm trực tiếp trong DB bị phát hiện, WAF chặn 4 loại payload, và 3 vai trò thao tác được trên trình duyệt.** Thứ tự sáng–chiều–tối: GĐ5 (DETECT), GĐ6 (CONTROL ở biên), GĐ7 (UI).

### Giai đoạn 5 – Audit hash-chain, kiểm tra toàn vẹn, cảnh báo (≈4 giờ)

`audit.js` đã có từ ngày 1. Bây giờ thêm phần đối chiếu và luật.

Prompt:

```text
Làm Bước 5 (mục 8): kiểm tra audit.js đã khớp mục 8.2 (hash-chain, khóa advisory khi ghi). Tạo services/integrity.js (mục 8.3, có FULL JOIN để bắt điểm không có log), services/detect.js (rule R3, R4 mục 8.4, setInterval 60 giây, không ghi trùng cảnh báo trong cửa sổ), routes/admin.js với GET /api/admin/alerts, /audit, /integrity (mục 8.5; requireAuth + requireRole('ADMIN')). In dòng [ALERT] ra console khi có sự kiện HIGH/CRITICAL. Gắn vào server.js.
```

Kiểm tra (mục 8.6) – ba lệnh dưới đây là bằng chứng cho kịch bản KB6:

```bash
# 1. Sau ~10 thao tác bình thường: /api/admin/integrity phải trả broken = [] và grades = []

# 2. Sửa điểm trực tiếp trong DB -> integrity phải báo lệch đúng enrollment 1
docker compose exec db psql -U postgres -d securegrade -c "UPDATE grades SET score = 10 WHERE enrollment_id = 1"

# 3. Sửa 1 dòng log -> broken phải chứa id 3
docker compose exec db psql -U postgres -d securegrade -c "UPDATE audit_log SET action = 'X' WHERE id = 3"
```

Sau khi thử xong, `docker compose down -v` để lấy lại DB sạch (nhớ bật lại MFA cho các tài khoản). Để khỏi mất công đăng ký lại QR, có thể nhờ AI viết một script `scripts/seed-demo.mjs` tự bật MFA cho các user demo bằng `otplib` (đọc secret ở DB). Việc này tiết kiệm rất nhiều thời gian cho Ngày 3.

- [ ] 3 lệnh trên cho đúng kết quả, ảnh lưu `docs/evidence/step5/`.
- [ ] Console `app` in `[ALERT]` khi có sự kiện HIGH/CRITICAL. Commit: `step-5: audit chain + detect`.

### Giai đoạn 6 – Rate limit, security headers, WAF (≈2 giờ)

Prompt:

```text
Làm Bước 6 (mục 9): tạo middleware/limits.js (mục 9.1) và thay server.js bằng bản hoàn chỉnh ở mục 9.2, giữ các route đã có. Helmet với CSP chặt, ẩn X-Powered-By, trust proxy = 1, validation dữ liệu vào. Tạo tests/attacks/sqli-direct.mjs theo mục 9.4. Không đổi cấu hình WAF trừ khi test cần.
```

Chạy 4 lệnh ở mục 9.3 (SQLi, XSS trong body, path traversal, User-Agent `sqlmap`) → cả 4 phải 403. Trên Windows PowerShell dùng Git Bash hoặc Postman vì cú pháp `curl` khác bash. Tiếp theo:

```bash
docker compose logs waf | grep -i "modsecurity"      # ghi số rule id vào báo cáo
docker compose cp tests/attacks/sqli-direct.mjs app:/tmp/sqli-direct.mjs
docker compose exec app node /tmp/sqli-direct.mjs     # 3 payload -> 401, không lỗi SQL
docker compose exec db psql -U postgres -d securegrade -c "\dt"   # bảng grades còn nguyên
```

Lệnh thứ hai chứng minh Defense-in-Depth: gọi thẳng app (bỏ qua WAF) mà SQLi vẫn thất bại nhờ parameterized query. Đo thêm bảng Paranoia Level (mục 9.5) để làm số liệu trade-off: chạy 6 test bình thường ở PL1 rồi PL2, ghi số request hợp lệ bị 403; sau đó quay về PL1. Nếu hết giờ, ghi "chưa đo" trong báo cáo, không tự điền số.

- [ ] 4 lệnh 9.3 đều 403; 9.4 trả 401 cho cả 3 payload.
- [ ] Response có `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, không có `X-Powered-By`. Commit: `step-6: waf + hardening`.

### Giai đoạn 7 – Giao diện tối thiểu (≈3 giờ)

**5 trang HTML tĩnh + JS thuần, đủ để demo luồng bình thường; mọi tấn công demo bằng Postman/curl.** Đây là phần AI làm tốt nhất, bạn chỉ cần ép nó theo quy tắc bảo mật phía client.

Prompt:

```text
Làm Bước 7 (mục 10): tạo public/js/api.js (mục 10.3) và 5 trang login, mfa, student, lecturer, admin (HTML + JS thuần, CSS đơn giản, tối đa 1 file css). Quy tắc bắt buộc: không onclick/inline script, JS nạp bằng <script type="module" src>; hiển thị dữ liệu bằng textContent, không innerHTML; không dùng localStorage cho token; ô OTP inputmode=numeric maxlength=6 autocomplete=one-time-code; không CDN. Trang lecturer: chọn lớp, bảng sinh viên, nút Sửa mở form gồm điểm, lý do, OTP. Trang admin: 3 tab Cảnh báo, Audit log, Toàn vẹn.
```

Kiểm tra trên trình duyệt qua `http://localhost:8080`: đi hết luồng SV, GV, Admin; DevTools Console không có lỗi CSP. Để thử XSS lưu trữ, tạm đặt `MODSEC_RULE_ENGINE: "DetectionOnly"`, nhập `reason` = `<img src=x onerror=alert(1)>`; trang GV phải hiển thị nguyên văn, không chạy script; sau đó đặt lại `On`.

- [ ] Luồng SV, GV, Admin chạy trên trình duyệt; không lỗi CSP.
- [ ] Ảnh màn hình mỗi trang lưu `docs/evidence/step7/`. Commit: `step-7: minimal ui`.

Nếu hết giờ ở ngày này, cắt theo thứ tự ở mục cuối: UI trang admin đơn giản hóa trước, đo PL2 sau.

## Ngày 3 (thứ 5) – Kiểm thử, phục hồi, báo cáo, demo

**Ngày này không thêm tính năng.** Sáng chạy 24 test case và chụp bằng chứng, trưa làm phục hồi và đo RTO, chiều và tối viết báo cáo, slide, tổng duyệt demo. Nếu code ở ngày 1–2 chưa xong, dừng ở đây và cắt phạm vi theo thứ tự ở mục cuối.

### Giai đoạn 8 – Test case và script tấn công (sáng, ≈4 giờ)

Prompt:

```text
Làm Bước 8 (mục 11): tạo tests/attacks/forge-jwt.mjs (mục 11.3) và tests/run-tests.mjs viết đủ 24 test case TC01–TC24 theo bảng 11.2 (khách hàng HTTP qua http://localhost:8080, class Client có cookie và User-Agent riêng, đọc mfa_secret bằng docker compose exec như khung mục 11.4). Tạo tests/package.json có otplib. Mỗi test in PASS/FAIL kèm ghi chú bằng console.table. Thứ tự: các test phá hủy (TC07 khóa sv03, TC09 khóa gv02, TC08 rate limit) chạy cuối cùng. Mỗi lần lấy OTP chờ sang cửa sổ 30 giây mới.
```

Chạy trên DB sạch:

```bash
docker compose down -v && docker compose up -d --build
# đợi ~20 giây, bật MFA sẵn cho user demo (scripts/seed-demo.mjs nếu bạn đã làm), rồi:
cd tests && npm install && node run-tests.mjs
```

Cả bộ chạy mất vài phút vì mỗi lần lấy OTP có thể đợi tới 30 giây. Test nào FAIL, dán dòng kết quả + log `docker compose logs app` cho AI và yêu cầu xác định nguyên nhân trước khi sửa: là test sai hay app sai. Tuyệt đối không để AI sửa ngưỡng để test "xanh".

Bằng chứng (mục 11.5): chụp `console.table` đầy đủ, chụp riêng response + dòng audit cho các case dùng để demo (TC09, TC14, TC16, TC22), lưu `docs/evidence/`. Cập nhật cột Kết quả bảng 11.2 bằng kết quả thật.

- [ ] Ít nhất 18/24 case PASS; case FAIL có ghi chú nguyên nhân, không ẩn.
- [ ] Commit: `step-8: tests + attacks`.

### Giai đoạn 9 – Phục hồi: thu hồi phiên, reset MFA, backup/restore (trưa, ≈2 giờ)

Prompt:

```text
Làm Bước 9 (mục 12): thêm vào routes/admin.js 3 endpoint POST /api/admin/users/:id/revoke-sessions, reset-mfa, unlock (requireAuth, requireRole('ADMIN'), requireStepUp), mỗi thao tác ghi audit ADMIN_REVOKE_SESSIONS, ADMIN_RESET_MFA, ADMIN_UNLOCK. Tạo scripts/backup.sh và scripts/restore.sh theo 12.2, 12.3 (file LF). Thêm ghi sự kiện RESTORE_PERFORMED sau restore nếu khả thi.
```

Diễn tập bắt buộc (12.5) và **bấm giờ thật**:

1. Nhập 5 điểm hợp lệ qua app, rồi `sh scripts/backup.sh`.
2. Giả lập thảm họa: `docker compose exec db psql -U postgres -d securegrade -c "DELETE FROM grades"`.
3. Bấm giờ, chạy `sh scripts/restore.sh backups/<file>.dump`.
4. Gọi `/api/admin/integrity`; thời gian từ bước 3 đến khi hệ thống hoạt động lại là RTO đo được; ghi số đó vào báo cáo.

- [ ] 3 API phản ứng đều bị từ chối khi thiếu OTP.
- [ ] Có số RTO đo thật. Commit: `step-9: recover`.

### Giai đoạn 10 – Báo cáo, sơ đồ, slide, demo (chiều và tối, ≈6 giờ)

**Bảng rủi ro, khách thể đe dọa, trade-off, dàn ý 8 chương, dàn ý 12 slide và kịch bản demo đã viết sẵn ở mục 13 của kế hoạch.** Việc của bạn là cho AI biến chúng thành văn bản học thuật, điền số liệu thật, chèn ảnh bằng chứng.

| Thời điểm | Việc | Đầu ra |
| --- | --- | --- |
| 13:00–14:00 | 8 sơ đồ (mục 13.5): kiến trúc ở draw.io, 7 sơ đồ còn lại ở PlantUML | 8 file PNG + file nguồn |
| 14:00–17:00 | Báo cáo 8 chương theo 13.1 | File PDF 30–40 trang |
| 17:00–19:00 | Slide 12 trang (13.6) + kịch bản nói | Slide + script |
| 19:00–21:00 | Tổng duyệt demo 2 lần, quay video OBS dự phòng | Video ≤ 10 phút |

Prompt sơ đồ (lặp lại cho từng sơ đồ #3–#8):

```text
Viết file PlantUML docs/seq-login-mfa.puml cho sơ đồ sequence đăng nhập + MFA dựa trên mục 6.1 trong docs/KE_HOACH.md. Actor: Client, WAF, App, DB. Hiển thị rõ pre-MFA session 5 phút, session đầy đủ 15 phút, nhánh sai OTP. Chỉ dùng cú pháp PlantUML hợp lệ.
```

Prompt viết báo cáo (mỗi lần 1 chương, dán tên chương và mục nguồn):

```text
Viết Chương 3 "Phân tích tài sản và rủi ro" của báo cáo đồ án môn Bảo mật mạng máy tính và hệ thống, định dạng Markdown, khoảng 6 trang, văn phong học thuật. Nguồn: mục 13.2, 13.3 trong docs/KE_HOACH.md và kết quả thật trong docs/evidence/. Chuỗi phân tích ASSET → RISK → CONTROL → DETECT → RECOVER. Mỗi rủi ro gắn một test case TCxx. Không bịa số liệu: chỗ thiếu để nguyên "[CẦN ĐIỀN: ...]".
```

Sau khi AI viết, tìm toàn bộ `[CẦN ĐIỀN` và điền bằng số đo thật: PL1/PL2, RTO, số test PASS. Đối chiếu mục 14.2 của kế hoạch làm checklist nộp bài.

Prompt slide:

```text
Từ mục 13.6 và 13.7 trong docs/KE_HOACH.md, soạn nội dung 12 slide (mỗi slide tối đa 5 dòng) và kịch bản nói cho từng slide, tổng ≤ 10 phút kể cả demo. Slide 5 dùng bảng 7.6 rút gọn 5 dòng. Slide 7 là top 5 rủi ro R01, R02, R03, R04, R08.
```

Nếu bạn muốn, có thể giao riêng việc dựng file slide (PowerPoint) cho một phiên khác; đây là việc ít rủi ro nhất để song song hóa.

- [ ] Báo cáo đủ 8 chương, mỗi rủi ro trỏ tới ít nhất 1 test case.
- [ ] 8 sơ đồ đã xuất PNG và chèn vào báo cáo.
- [ ] Tổng duyệt demo 2 lần, mỗi lần ≤ 10 phút; đã quay video dự phòng.

### Thứ 6 sáng – trước giờ báo cáo

Không viết code mới. Chỉ làm: `docker compose down -v && docker compose up -d --build`, bật MFA lại, đi một vòng demo đủ KB1, KB2, KB6. 30 phút trước giờ báo cáo, mở sẵn trình duyệt thường (GV), tab ẩn danh (kẻ tấn công), trang admin, Postman, terminal đã gõ sẵn lệnh, và video dự phòng sẵn sàng phát.

## Khi trễ tiến độ và khi AI làm sai

**Nếu cuối ngày 2 chưa xong GĐ7, cắt theo thứ tự dưới đây; bốn mục đầu cắt được, mục 5 không được cắt vì là phần chấm điểm cốt lõi.** Thứ tự lấy từ mục 14.4 của kế hoạch.

1. Bỏ mã hóa `mfa_secret` (mục 6.7, vốn là tùy chọn).
2. Bỏ rule tương quan R3, R4 (mục 8.4); giữ cảnh báo theo severity.
3. Giao diện chỉ giữ trang login, MFA, giảng viên; phần admin dùng Postman.
4. Bỏ `run-tests.mjs`, chạy test bằng Postman Collection và chụp ảnh tay.
5. **Không được cắt:** MFA, session + fingerprint, step-up, ownership, audit hash-chain, phân vùng mạng, bảng "dựa vào đâu để tin" (mục 7.6), ma trận rủi ro, trade-off.

### Khi AI làm sai hoặc lạc hướng

| Triệu chứng | Xử lý |
| --- | --- |
| AI đổi tên file, đổi thư mục, thêm thư viện lạ | `git diff`, hoàn tác bằng `git checkout -- <file>`, nhắc lại "chỉ sửa đúng file X, không đổi cấu trúc" |
| Code đổ lỗi nhiều chỗ sau 3 lần sửa | `git reset --hard` về commit của giai đoạn trước, mở phiên mới, dán lại prompt gốc kèm nguyên văn lỗi |
| AI nới quyền DB (`GRANT ALL`) hoặc bỏ `internal: true` để "cho chạy" | Từ chối. Yêu cầu tìm nguyên nhân lỗi thật; đây là phá chính mục tiêu bảo mật |
| AI sửa test cho "xanh" | Yêu cầu giữ nguyên kỳ vọng ở bảng 11.2, sửa code chứ không sửa ngưỡng |
| AI đề xuất API/tham số không chắc (đặc biệt otplib v13, biến môi trường của image WAF) | Bắt nó dẫn tài liệu chính thức hoặc chạy thử ngay; không chấp nhận đoán |
| Sau khi sửa `db/init/*` DB không đổi | `docker compose down -v` rồi `up` lại |
| `02_roles.sh` lỗi `\r` (Windows) | Lưu file LF trong VS Code, kiểm tra `.gitattributes` |
| OTP luôn sai | Đồng bộ giờ tự động trên máy tính và điện thoại |
| WAF chặn yêu cầu hợp lệ | Giữ PL1; tạm `DetectionOnly` để đọc rule id trong log WAF |

Mẫu prompt sửa lỗi dùng được cho mọi giai đoạn:

```text
Lệnh sau bị lỗi. Thực hiện đúng lệnh đó và đọc log liên quan, nêu nguyên nhân có khả năng cao nhất trước, rồi sửa tối thiểu. Không đổi kiến trúc, không hạ thấp bảo mật. Sau khi sửa, chạy lại lệnh đó.
<dán lệnh + output lỗi nguyên văn>
```

### Giả định của lộ trình

- Bạn làm chủ yếu một mình trong 3 ngày; khoảng giờ trên là ước tính, không đo. Nếu làm theo nhóm, chia theo mục 14.1 của kế hoạch.
- "3 ngày" được hiểu là thứ 3, 4, 5, vì hôm nay là thứ 2 (26/10/2026) và bạn báo cáo thứ 6. Không đủ dữ liệu để biết giờ báo cáo cụ thể của thứ 6; nếu báo cáo vào buổi sáng, dồn tối thiểu GĐ10 sang tối thứ 5.
