# SecureGrade

Hệ thống nhập điểm chống giả mạo đầu vào — đồ án cuối kỳ **Bảo mật mạng máy tính và hệ
thống**, Hướng 1 (thiết kế hệ thống an toàn).

> **Trạng thái: prototype đã chạy và kiểm thử xong — 25/25 test case PASS.**
> Báo cáo, 8 sơ đồ và slide đã viết sẵn. Việc còn lại là render sơ đồ, chụp ảnh bằng chứng
> và tổng duyệt demo (xem [Việc còn lại](#việc-còn-lại) ở cuối file).

| Tài liệu | File |
| --- | --- |
| Báo cáo đồ án (8 chương) | [`docs/BAO_CAO.md`](docs/BAO_CAO.md) — bản Word: `docs/BAO_CAO.docx` |
| Slide + kịch bản demo 9'30 | [`docs/SLIDE.md`](docs/SLIDE.md) — bản PowerPoint: `docs/SLIDE.pptx` |
| 8 sơ đồ (PlantUML) | [`docs/diagrams/`](docs/diagrams) |
| **Hướng dẫn tổng duyệt demo** | [`docs/HUONG_DAN_DEMO.md`](docs/HUONG_DAN_DEMO.md) |
| Bằng chứng kiểm thử (11 file) | [`docs/evidence/`](docs/evidence/README.md) |
| Đề bài | [`docs/DE_BAI.md`](docs/DE_BAI.md) |
| Kế hoạch gốc | [`docs/KE_HOACH.md`](docs/KE_HOACH.md) |

---

## 1. Chạy hệ thống

Yêu cầu: **Docker Desktop** (WSL2 backend trên Windows) và **Node.js ≥ 20** để chạy test.

```bash
cp .env.example .env
```

Sinh 3 giá trị cho `.env` (`JWT_SECRET` phải ≥ 64 ký tự, nếu không app từ chối khởi động):

```bash
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(48).toString('hex'))"
node -e "console.log('POSTGRES_PASSWORD=' + require('crypto').randomBytes(12).toString('hex'))"
node -e "console.log('APP_DB_PASSWORD=' + require('crypto').randomBytes(12).toString('hex'))"
```

`APP_DB_PASSWORD` chỉ dùng chữ và số — dấu `'` trong mật khẩu làm hỏng script
`db/init/02_roles.sh`.

```bash
docker compose up -d --build
```

Mở **http://localhost:8080** và đăng nhập. Lần đầu mỗi tài khoản sẽ hiện mã QR — quét bằng
Google Authenticator hoặc Microsoft Authenticator rồi nhập mã 6 số.

### Tài khoản demo

| Username | Mật khẩu | Vai trò |
| --- | --- | --- |
| `admin` | `Admin@2026demo` | ADMIN — cảnh báo, audit, kiểm tra toàn vẹn, phản ứng sự cố |
| `gv01` | `Gv01@2026demo` | LECTURER — lớp SEC401 |
| `gv02` | `Gv02@2026demo` | LECTURER — lớp NET301 |
| `sv01` `sv02` `sv03` | `Sv01@2026demo` … | STUDENT |

---

## 2. Kiểm chứng phân vùng mạng (D1–D4)

```bash
docker compose ps                 # chỉ waf có cột PORTS = 0.0.0.0:8080->8080
curl -i http://localhost:8080/health          # F1: 200
curl -i http://localhost:3000/health          # D1: connection refused
docker compose exec waf getent hosts db       # D3: không phân giải được
docker compose exec app node -e "fetch('https://example.com').then(()=>console.log('D4 FAIL')).catch(()=>console.log('D4 OK: egress bi chan'))"
curl -i -G http://localhost:8080/health --data-urlencode "id=1' OR '1'='1"   # WAF: 403
```

D2 (DB không truy cập được từ host):

```bash
docker compose port db 5432     # không có ánh xạ port nào
node tests/check-d2.mjs         # thử kết nối thật vào DB securegrade -> bị từ chối
```

Đừng chỉ dùng `Test-NetConnection localhost -Port 5432` để kết luận: nếu máy có cài sẵn
PostgreSQL cho Windows thì cổng 5432 vẫn LISTENING, nhưng đó là server khác. Chi tiết ở
mục 4.3.1 của báo cáo và `docs/evidence/03-luong-bi-chan-D2.txt`.

---

## 3. Chạy bộ test case

```bash
docker compose down -v && docker compose up -d --build
# chờ ~20 giây cho db init xong
cd tests && npm install && node run-tests.mjs
```

Script in bảng PASS/FAIL cho 25 test case và thoát với mã 1 nếu có FAIL. Script tự
`docker compose restart app` trước mỗi nhóm test cần nhiều lần đăng nhập, vì bộ đếm rate
limit nằm trong RAM.

### Đo false positive của WAF theo Paranoia Level

```bash
node tests/paranoia-check.mjs                      # đo ở mức hiện tại
# đổi BLOCKING_PARANOIA trong docker-compose.yml rồi:
docker compose up -d waf && node tests/paranoia-check.mjs
```

Kết quả đã đo: **PL1 = 0/15** false positive, **PL2 = 1/15** (lý do sửa điểm chứa dấu
`--`). Chi tiết ở chương 7 của báo cáo.

### Chứng minh Defense-in-Depth (bỏ qua WAF)

```bash
docker compose cp tests/attacks/sqli-direct.mjs app:/tmp/sqli-direct.mjs
docker compose exec app node /tmp/sqli-direct.mjs          # Git Bash: thêm MSYS_NO_PATHCONV=1
docker compose exec db psql -U postgres -d securegrade -tAc "SELECT count(*) FROM grades"
```

### Giả mạo JWT

```bash
node tests/attacks/forge-jwt.mjs <giá trị cookie sg_token>
curl -i http://localhost:8080/api/me -H "Cookie: sg_token=<TAMPERED hoặc ALG_NONE>"
```

---

## 4. Backup và restore

```bash
sh scripts/backup.sh                                  # tạo backups/sg_<timestamp>.dump
sh scripts/restore.sh backups/sg_20261026_165051.dump
```

RTO đo được trong diễn tập: **5–6 giây** (2 lần đo). Sau restore, gọi `/api/admin/integrity` để xác nhận
dữ liệu sạch.

---

## 5. Cấu trúc repo

```text
docker-compose.yml        3 service, 3 network (2 internal), 1 volume
db/init/                  01_schema.sql · 02_roles.sh (least privilege) · 03_seed.sql
app/src/
  server.js               pipeline middleware
  config.js               fail-safe: từ chối khởi động nếu JWT_SECRET < 64 ký tự
  middleware/             auth.js (4 lớp kiểm chứng token) · rbac.js · stepUp.js · limits.js
  routes/                 auth.js · grades.js · admin.js
  services/               otp.js · audit.js (hash-chain) · integrity.js · detect.js
app/public/               5 trang HTML + js/ (ESM, không inline script vì CSP) + css/
tests/                    run-tests.mjs (25 TC) · paranoia-check.mjs · attacks/
scripts/                  backup.sh · restore.sh
docs/                     BAO_CAO.md · SLIDE.md · diagrams/ · evidence/
```

---

## 6. Những cơ chế bảo mật chính

| Cơ chế | File |
| --- | --- |
| Phân vùng 3 zone, 2 network `internal` | `docker-compose.yml` |
| WAF ModSecurity v3 + OWASP CRS v4 (PL1) | `docker-compose.yml` (service `waf`) |
| DB least privilege (`audit_log` append-only) | `db/init/02_roles.sh` |
| MFA TOTP bắt buộc + chống replay OTP 90 giây | `app/src/services/otp.js` |
| JWT HS256 cố định `alg` + session server-side + fingerprint | `app/src/middleware/auth.js` |
| RBAC (role đọc từ DB, không từ claim) | `app/src/middleware/rbac.js` |
| Step-up OTP cho thao tác nhạy cảm | `app/src/middleware/stepUp.js` |
| Ownership chống IDOR + audit cùng transaction | `app/src/routes/grades.js` |
| Audit log hash-chain | `app/src/services/audit.js` |
| Kiểm tra toàn vẹn (chain + đối chiếu điểm với log) | `app/src/services/integrity.js` |
| Rule tương quan 60 giây | `app/src/services/detect.js` |
| Rate limit, security headers, chỉ nhận JSON | `app/src/middleware/limits.js`, `app/src/server.js` |
| Phản ứng sự cố: revoke sessions / reset MFA / unlock | `app/src/routes/admin.js` |

---

## 7. Việc còn lại

Code, test, 8 sơ đồ PNG, 11 file bằng chứng và 10 ảnh giao diện đã xong; ảnh đã được
chèn sẵn vào `docs/BAO_CAO.md`. Còn **ba việc**, cả ba đều cần có mặt bạn:

1. **Điền thông tin nhóm** — bảng ở đầu `docs/BAO_CAO.md` và Slide 1 của `docs/SLIDE.md`
   đang để trống: GVHD, tên nhóm, họ tên + MSSV từng thành viên, ngày nộp.
2. **Chuyển báo cáo + slide sang định dạng nộp** (~60 phút) — `docs/BAO_CAO.md` sang
   Word/Google Docs rồi xuất PDF; `docs/SLIDE.md` dán sang PowerPoint theo từng slide.
   Sơ đồ 06 (pipeline, 409×3031) để nguyên làm hình cả trang trong phụ lục D, đừng
   đưa lên slide — slide 6 đã có bản rút gọn dạng chữ.
3. **Tổng duyệt demo 2 lần** (~40 phút) — theo kịch bản cuối `docs/SLIDE.md`, làm đúng
   checklist "Chuẩn bị trước demo 30 phút", và quay video OBS dự phòng.

Kịch bản demo đang chia vai TV1–TV4; nếu nhóm ít hơn 4 người thì gộp vai lại.

**Sơ đồ**: `docs/diagrams/*.puml` là **bản đặc tả** để vẽ bằng draw.io, không phải ảnh
đã render. Mỗi file ghi đủ thành phần, nhãn, quan hệ và có ghi chú bố cục ở đầu file;
bảng màu chung ở `_style.puml`. Vẽ xong xuất PNG đúng tên file tương ứng
(ví dụ `01-kien-truc-phan-vung.png`) vào cùng thư mục — báo cáo đã trỏ sẵn tới các tên này
nên không phải sửa gì thêm.

### Xuất lại file nộp

Sau khi sửa báo cáo/slide, hoặc sau khi vẽ xong sơ đồ và để PNG vào `docs/diagrams/`:

```bash
pip install pypandoc-binary
python scripts/export-docs.py
```

Script sinh lại `docs/BAO_CAO.docx` (khổ A4, lề 2,5cm — lề trái 3cm để đóng gáy) và
`docs/SLIDE.pptx`. Không cần cài pandoc riêng. Mở bằng Word rồi **File → Export →
Create PDF** để ra bản PDF nộp.

Ghi chú về bản `.pptx`: ghi chú người nói nằm trong **ô Notes** của từng slide
(View → Notes Page), không hiện trên màn chiếu. Kịch bản demo không được đưa vào
slide vì đó là kịch bản tổng duyệt — xem ở cuối `docs/SLIDE.md`.

### Checklist nộp bài

- [ ] Báo cáo PDF, đủ 8 chương
- [ ] 8 sơ đồ PNG + file nguồn `.puml`
- [ ] Source code (không chứa `.env`, `node_modules`, `backups/`)
- [ ] Bộ test case + kết quả 25/25 + thư mục `docs/evidence/`
- [ ] Slide 12 trang + video demo dự phòng
