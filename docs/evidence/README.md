# Bằng chứng kiểm thử — SecureGrade

Toàn bộ output trong thư mục này được chạy lại từ đầu trên **DB sạch**
(`docker compose down -v && docker compose up -d --build`) ngày **26/10/2026**.

Môi trường đo: Windows 11, Docker Desktop 29.3.1, Node.js 22 (container) / 24 (host),
PostgreSQL 16-alpine, ModSecurity 3.0.17 + OWASP CRS 4.30.0, WAF ở Paranoia Level 1.

| File | Nội dung | Dùng cho chương/mục nào của báo cáo |
| --- | --- | --- |
| [`01-docker-compose-ps.txt`](01-docker-compose-ps.txt) | 3 container, chỉ `waf` publish port 8080 | 4.1 Phân vùng mạng |
| [`02-luong-bi-chan-D1-D3-D4.txt`](02-luong-bi-chan-D1-D3-D4.txt) | F1 = 200; D1 refused; D3 không resolve được `db`; D4 egress bị chặn (`EAI_AGAIN`) | 4.3 Luồng bị chặn |
| [`03-luong-bi-chan-D2.txt`](03-luong-bi-chan-D2.txt) | D2 kiểm chứng 3 bước, kèm cảnh báo về PostgreSQL 17 cài sẵn trên host | 4.3 và **4.3.1** |
| [`04-waf-chan-tan-cong.txt`](04-waf-chan-tan-cong.txt) | SQLi 403, XSS 403, scanner UA 403, path traversal 400; danh sách rule CRS đã khớp | 6.5 Rule WAF, TC19, TC20 |
| [`05-security-headers.txt`](05-security-headers.txt) | CSP, nosniff, X-Frame-Options, không có `X-Powered-By`; chỉ nhận JSON (chặn 2 lớp) | 5.10 Hardening |
| [`06-least-privilege.txt`](06-least-privilege.txt) | 5 lệnh phá hoại bị `permission denied`, 2 lệnh `SELECT` chạy được — 7/7 đúng kỳ vọng | 5.2, TC23 |
| [`07-run-tests-output.txt`](07-run-tests-output.txt) | **25/25 PASS** — bảng `console.table` đầy đủ | 6.2 Bộ test case |
| [`08-defense-in-depth.txt`](08-defense-in-depth.txt) | 3 payload SQLi gửi từ bên trong container, bỏ qua WAF → 401, bảng `grades` còn nguyên | 6.4 Defense-in-Depth |
| [`09-audit-hash-chain.txt`](09-audit-hash-chain.txt) | 12 dòng đầu của chuỗi hash (`prev_hash` nối tiếp `hash`), một dòng `GRADE_UPDATE` đầy đủ, thống kê theo severity | 5.6, 5.8 |
| [`10-waf-paranoia-level.txt`](10-waf-paranoia-level.txt) | PL1 = **0/15** false positive, PL2 = **1/15**; cả hai chặn 3/3 payload tấn công | 7.2 Trade-off T5 |
| [`11-backup-restore-rto.txt`](11-backup-restore-rto.txt) | Diễn tập backup → xoá điểm → restore; **RTO = 5 giây**, dữ liệu đúng sau restore | 7.3 Trade-off T7 |

## Cách chạy lại toàn bộ

```bash
docker compose down -v && docker compose up -d --build   # chờ ~20 giây
cd tests && npm install && node run-tests.mjs            # 07
node tests/check-d2.mjs                                  # 03
node tests/check-least-privilege.mjs                     # 06
node tests/paranoia-check.mjs                            # 10
sh scripts/backup.sh && sh scripts/restore.sh backups/<file>.dump   # 11
```

Trước mỗi phép đo cần nhiều lần đăng nhập, chạy `docker compose restart app` để reset bộ
đếm rate limit (nằm trong RAM) — nếu không, request hợp lệ sẽ trả 429 thay vì đi tới WAF.

## Ảnh chụp màn hình giao diện

Thư mục [`screenshots/`](screenshots) — chụp ở 1280×800, ngày 26/10/2026.

| Ảnh | Nội dung | Dùng cho |
| --- | --- | --- |
| `01-dang-nhap.png` | Form đăng nhập | Slide 8, demo 1:00 |
| `02-mfa-enroll-ma-qr.png` | Mã QR lúc bật MFA lần đầu | 5.3, TC01, demo 1:00 |
| `03-giang-vien-bang-diem-lop.png` | GV chọn lớp, xem bảng điểm lớp mình dạy | 5.11, TC04 |
| `04-dialog-sua-diem-co-step-up-otp.png` | Dialog sửa điểm có ô **OTP step-up** | 5.5, trade-off T2, demo 2:30 |
| `05-luu-diem-thanh-cong.png` | Lưu điểm thành công, bảng cập nhật ngay | TC04 |
| `06-admin-tab-canh-bao-critical.png` | Tab Cảnh báo: `SESSION_CONTEXT_MISMATCH`, `INTEGRITY_VIOLATION` (CRITICAL), `MFA_FAIL_THRESHOLD`, `JWT_INVALID` (HIGH) | 5.8, KB1–KB3, demo 4:00 |
| `07-admin-phat-hien-vi-pham-toan-ven.png` | Tab Kiểm tra toàn vẹn **lúc phát hiện vi phạm**: `enrollment 3: DB=10 / log=8.75` | 5.7, KB6, TC22, demo 7:15 |
| `08-admin-tab-audit-log.png` | Tab Audit log với cột hash | 5.6 |
| `09-admin-tab-nguoi-dung-phan-ung-su-co.png` | Tab Người dùng + 3 nút phản ứng sự cố | 5.12, chương 12 Runbook |
| `10-sinh-vien-xem-diem.png` | SV chỉ thấy điểm của chính mình | TC03 |

**CSP:** suốt phiên chụp, DevTools Console không có lỗi vi phạm CSP nào. Chỉ có một dòng
404 cho `/favicon.ico` — không ảnh hưởng chức năng, và đó cũng là bằng chứng gián tiếp rằng
CSP `script-src 'self'` không chặn nhầm file JS nào của trang.

### Cách chụp lại bằng tay

Nếu cần chụp lại (ví dụ sau khi sửa giao diện), làm theo thứ tự sau. Trên Windows dùng
**Win + Shift + S** để chụp vùng màn hình, ảnh vào clipboard rồi dán vào Paint và lưu.

1. **Chuẩn bị**: `docker compose up -d` rồi mở http://localhost:8080.
   Nếu đã thử đăng nhập nhiều lần trước đó, chạy `docker compose restart app` để reset
   rate limit (10 lần đăng nhập / 15 phút).

2. **Ảnh 02 (mã QR)** — cần một tài khoản *chưa* bật MFA. Reset một tài khoản:

   ```bash
   docker compose exec db psql -U postgres -d securegrade -c "UPDATE users SET mfa_enabled = FALSE, mfa_secret = NULL, last_otp = NULL, locked_until = NULL WHERE username = 'sv03'"
   ```

   Đăng nhập `sv03` / `Sv03@2026demo` → trang MFA hiện QR → chụp.

3. **Ảnh 03–05 (giảng viên)** — đăng nhập `gv01` / `Gv01@2026demo`, nhập OTP từ điện thoại,
   chọn lớp SEC401, bấm **Sửa** ở một sinh viên, điền điểm + lý do + OTP mới, chụp trước
   khi bấm Lưu, rồi chụp sau khi Lưu.

4. **Ảnh 07 (phát hiện vi phạm toàn vẹn)** — giả lập insider sửa điểm thẳng trong DB:

   ```bash
   docker compose exec db psql -U postgres -d securegrade -c "UPDATE grades SET score = 10 WHERE enrollment_id = 3"
   ```

   Đăng nhập `admin` / `Admin@2026demo`, bấm tab **Kiểm tra toàn vẹn** → bảng hiện dòng
   `enrollment 3: DB=10 / log=8.75` → chụp. Sau đó trả lại hiện trạng:

   ```bash
   docker compose exec db psql -U postgres -d securegrade -c "UPDATE grades SET score = 8.75 WHERE enrollment_id = 3"
   ```

5. **Ảnh 06, 08, 09 (admin)** — vẫn trong phiên admin, bấm lần lượt các tab Cảnh báo,
   Audit log, Người dùng và chụp. Tab Cảnh báo chỉ có dòng CRITICAL nếu trước đó đã chạy
   `node tests/run-tests.mjs` (bộ test sinh ra các sự kiện này).

6. **Ảnh 10 (sinh viên)** — đăng nhập `sv01` / `Sv01@2026demo` + OTP.

**Lấy mã OTP khi không có điện thoại**: người vận hành đọc được secret từ DB (luồng F4):

```bash
docker compose exec db psql -U postgres -d securegrade -tAc "SELECT mfa_secret FROM users WHERE username='gv01'"
cd tests && node -e "import('otplib').then(async m => console.log(await m.generate({ secret: 'DAN_SECRET_VAO_DAY' })))"
```
