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

## Còn thiếu: ảnh chụp màn hình

Các file ở đây là output terminal. Nếu bài nộp cần ảnh chụp màn hình giao diện, cần chụp
thêm bằng tay (chưa có trong thư mục này):

- [ ] Trang `login.html` và `mfa.html` lúc hiện mã QR
- [ ] Trang `lecturer.html` lúc mở dialog sửa điểm có ô OTP
- [ ] Trang `admin.html` tab **Cảnh báo** lúc có dòng `SESSION_CONTEXT_MISMATCH` (CRITICAL)
- [ ] Trang `admin.html` tab **Kiểm tra toàn vẹn** lúc phát hiện vi phạm
      (chạy `UPDATE grades SET score = 10 WHERE enrollment_id = 1` bằng `postgres` rồi mở tab này)
- [ ] DevTools Console trên các trang: không có lỗi vi phạm CSP
