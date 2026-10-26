# Slide thuyết trình — SecureGrade (12 slide, 10 phút kể cả demo)

Mỗi slide dưới đây là nội dung đã chốt, chỉ cần dán vào PowerPoint/Google Slides.
Quy ước: **tiêu đề** — nội dung hiển thị trên slide — *(ghi chú cho người nói)*.

---

## Slide 1 — Trang bìa

**SecureGrade — Hệ thống nhập điểm chống giả mạo đầu vào**

- Đồ án cuối kỳ: Bảo mật mạng máy tính và hệ thống
- Hướng 1: Thiết kế hệ thống an toàn
- Nhóm: *(điền tên 4 thành viên + MSSV)*

*(30 giây. Nói ngay câu chốt: "Câu hỏi của đồ án này là — hệ thống dựa vào đâu để tin một thông tin.")*

---

## Slide 2 — Bài toán

**Điểm số là tài sản cần toàn vẹn**

- Điểm quyết định học bổng, cảnh báo học vụ, tốt nghiệp
- Cổng vào duy nhất để sửa điểm: **tài khoản giảng viên**
- Tình huống thật: giảng viên bị phishing / ClickFix → kẻ tấn công có mật khẩu, hoặc có luôn cookie phiên đang đăng nhập
- Câu hỏi: **mật khẩu đúng có nghĩa là đúng người không?**

*(45 giây. Đây là cái móc của cả bài: đừng vội nói về kỹ thuật.)*

---

## Slide 3 — Tài sản và tác nhân đe dọa

**Bảo vệ cái gì, chống ai**

| Tài sản | Ưu tiên |
| --- | --- |
| A1 Bảng điểm | Integrity |
| A2 Tài khoản GV/Admin | Confidentiality |
| A4 Secret (JWT, TOTP seed, mật khẩu DB) | Confidentiality |
| A5 Audit log | Integrity |

Tác nhân: sinh viên có tài khoản hợp lệ · kẻ phishing bên ngoài · infostealer trên máy GV ·
**insider có quyền DB** · bot dò mật khẩu

*(45 giây. Nhấn vào dòng insider: hầu hết đồ án bỏ qua tác nhân này.)*

---

## Slide 4 — Kiến trúc phân vùng

**3 zone, 4 luồng được phép, 5 luồng bị chặn**

*(Chèn sơ đồ `01-kien-truc-phan-vung.png`)*

- Chỉ WAF publish port 8080; `app` và `db` **không có port, không có egress Internet**
- Đã chứng minh bằng lệnh: D1 refused · D2 refused · D3 không resolve được `db` ·
  **D4 `app` không gọi được ra Internet**

*(60 giây. Nói hệ quả của D4: có RCE trong app cũng không exfiltrate được dữ liệu.)*

---

## Slide 5 — "Không tin mặc định"

**Hệ thống dựa vào đâu để tin một thông tin**

| Thông tin | Kiểm chứng bằng |
| --- | --- |
| Mật khẩu | bcrypt + OTP từ **thiết bị khác** |
| Claim `role` trong JWT | **Không dùng** — đọc role từ bảng `users` |
| Cookie phiên hợp lệ | Fingerprint + step-up OTP khi sửa điểm |
| `enrollmentId` từ client | Truy vấn ownership |
| **Dữ liệu trong DB của chính mình** | Hash-chain + đối chiếu điểm với log |

*(75 giây. Dòng cuối là điểm nhấn: không tin cả DB của mình.)*

---

## Slide 6 — Pipeline 12 lớp kiểm chứng

**Một request sửa điểm phải qua 12 cổng**

WAF → Rate limit → Chữ ký JWT → Session trong DB → Fingerprint → MFA → RBAC →
**Step-up OTP** → Validation → **Ownership** → Parameterized query + quyền DB tối thiểu →
**Audit hash-chain cùng transaction**

- Mỗi lớp độc lập: lớp trước thủng thì lớp sau vẫn giữ
- Audit nằm **cùng transaction** với điểm → không có trạng thái "điểm đổi mà không có log"

*(60 giây. Chỉ đọc 4 lớp in đậm, đừng đọc hết 12.)*

---

## Slide 7 — Top 5 rủi ro

**Rủi ro — kiểm soát — bằng chứng**

| ID | Rủi ro | PREVENT | DETECT | Test |
| --- | --- | --- | --- | --- |
| R01 | Phishing lộ mật khẩu | MFA TOTP | `MFA_FAIL_THRESHOLD` | TC09 |
| R02 | Đánh cắp cookie phiên | Fingerprint + step-up | `SESSION_CONTEXT_MISMATCH` | TC14, TC15 |
| R03 | Giả mạo JWT nâng quyền | Cố định HS256, role từ DB | `JWT_INVALID` | TC11, TC12 |
| R04 | IDOR | RBAC + ownership | `ACCESS_DENIED_IDOR` | TC16, TC17 |
| R08 | **Insider sửa DB, xoá log** | `audit_log` append-only | Hash-chain | TC22–TC24 |

*(45 giây.)*

---

## Slide 8 — DEMO

**Chuyển sang màn hình live**

*(Theo kịch bản demo ở mục dưới. Nếu máy lỗi: phát video OBS dự phòng.)*

---

## Slide 9 — Kết quả kiểm thử

**25/25 test case PASS**

- 6 test luồng bình thường + 19 test tấn công, chạy tự động: `node tests/run-tests.mjs`
- Bao phủ 6 kịch bản tấn công KB1–KB6
- Mỗi rủi ro trong ma trận đều trỏ tới ít nhất 1 test case

*(Chèn ảnh `console.table` của run-tests)*

*(30 giây.)*

---

## Slide 10 — Trade-off (có số đo)

**An toàn hơn phải trả bằng tiện lợi — và nhóm đã đo**

| Quyết định | Cái giá đo được | Nhóm chọn |
| --- | --- | --- |
| T2 Step-up OTP mỗi lần sửa điểm | OTP không dùng lại được → ~1 lần sửa / 30 giây | Giữ cho prototype, dài hạn dùng "sudo mode" 5 phút |
| T5 WAF Paranoia Level | **PL1: 0/15** request hợp lệ bị chặn oan · **PL2: 1/15** (lý do có dấu `--`), không chặn thêm payload nào | **PL1** |
| T7 Backup hằng ngày | RPO 24 giờ · **RTO đo được 5–6 giây** | Hằng ngày |

*(60 giây. Đây là slide ghi điểm: có số thật, không nói chung chung.)*

---

## Slide 11 — Hạn chế và hướng phát triển

**Biết mình chưa làm gì**

| Hạn chế | Hướng xử lý |
| --- | --- |
| HTTP trong lab | HTTPS + HSTS + cookie `secure` |
| TOTP không chống phishing thời gian thực (AiTM) | **Passkey/WebAuthn** (gắn với origin) |
| Superuser DB vẫn tính lại được hash-chain | SIEM + WORM storage; tạm thời: anchor `lastHash` ra ngoài |
| `mfa_secret` lưu dạng rõ | AES-256-GCM với `MFA_ENC_KEY` |
| RPO 24 giờ | PITR / WAL archiving |

*(45 giây.)*

---

## Slide 12 — Kết luận

**Bốn kết luận**

1. Mật khẩu bị đánh cắp là **không đủ** — và việc đó để lại cảnh báo có ý nghĩa điều tra
2. Cookie phiên bị đánh cắp là **không đủ** — fingerprint phát hiện, step-up OTP chặn
3. Hệ thống **không tin cả DB của chính mình** — hash-chain bắt được cả insider
4. Defense-in-Depth là thật: bỏ qua WAF, payload SQLi vẫn bị chặn

Xin cảm ơn — mời hỏi đáp.

---

# Kịch bản demo (9 phút 30)

| Thời điểm | Người làm | Màn hình | Thao tác | Ý chính cần nói |
| --- | --- | --- | --- | --- |
| 0:00–1:00 | TV1 | Terminal | `docker compose ps` → chỉ `waf` có PORTS · `curl :8080/health` → 200 · `curl :3000/health` → refused · `docker compose exec app node -e "fetch('https://example.com')..."` → egress bị chặn | Chỉ có **một** cửa vào là WAF; app và DB không có đường ra Internet |
| 1:00–2:30 | TV2 | Trình duyệt | `sv01` đăng nhập + OTP → xem điểm · `gv01` đăng nhập + OTP → chọn lớp SEC401 → sửa điểm kèm OTP | Luồng bình thường; mỗi thao tác để lại một dòng audit |
| 2:30–4:00 | TV3 | Tab ẩn danh + trang admin | **KB1**: có mật khẩu `gv02` nhưng không có điện thoại → nhập OTP sai 3 lần → 423 · trang admin thấy `MFA_FAIL_THRESHOLD` (HIGH) | Mật khẩu đúng chưa chứng minh đúng người. Chú ý nội dung cảnh báo: *"password đúng nhưng OTP sai liên tục — nghi lộ mật khẩu"* |
| 4:00–5:30 | TV3 | DevTools + Postman | **KB2**: copy cookie `gv01` từ DevTools sang Postman → 401 `SESSION_CONTEXT_MISMATCH` · tab GV bị đăng xuất ở request kế tiếp · admin thấy CRITICAL · thử `PUT` điểm không có `X-OTP` → 401 `STEP_UP_REQUIRED` | Infostealer lấy được cookie vẫn không dùng được; và nếu giả đúng được fingerprint thì vẫn thiếu OTP |
| 5:30–6:30 | TV1 | Terminal | **KB3**: `node tests/attacks/forge-jwt.mjs <token>` → gọi API với TAMPERED và ALG_NONE → 401 `INVALID_TOKEN` · **KB4**: `gv01` sửa điểm lớp `gv02` kèm OTP đúng → 403 `ACCESS_DENIED_IDOR` | Không tin claim trong token; không tin ID do client gửi |
| 6:30–7:15 | TV1 | Terminal | **KB5**: `curl -G :8080/health --data-urlencode "id=1' OR '1'='1"` → 403 (rule 942100) · `docker compose exec app node /tmp/sqli-direct.mjs` (bỏ qua WAF) → vẫn 401, bảng `grades` còn nguyên | Defense-in-Depth: WAF thủng thì lớp sau vẫn giữ |
| 7:15–8:45 | TV2 | Terminal + trang admin | **KB6**: `UPDATE grades SET score = 10` bằng `postgres` → tab "Kiểm tra toàn vẹn" báo `dbScore=10 / loggedScore=8.5` · `UPDATE audit_log ... WHERE id = 3` → `broken` chứa id 3 · `app_user` thử `DELETE FROM audit_log` → `permission denied` · GV nhập lại điểm qua app → integrity sạch | Phát hiện được cả người có quyền DB; và app không có quyền xoá dấu vết của chính nó |
| 8:45–9:30 | TV4 | Slide 9–10 | Kết quả 25/25 và bảng trade-off có số đo | An toàn hơn phải trả bằng tiện lợi — nhóm đã đo và đã chọn |

## Chuẩn bị trước demo 30 phút

- [ ] `docker compose down -v && docker compose up -d --build`, chờ ~20 giây
- [ ] Đăng ký MFA sẵn trên điện thoại demo cho `sv01`, `gv01`, `gv02`, `admin`
      (đăng nhập lần đầu → quét QR → nhập OTP)
- [ ] Nhập trước 1 điểm cho SEC401 để trang sinh viên không trống
- [ ] Mở sẵn: trình duyệt thường (GV), tab ẩn danh (kẻ tấn công), tab admin, Postman,
      terminal với các lệnh đã gõ sẵn
- [ ] **Quan trọng**: rate limit là 10 login / 15 phút / IP. Nếu đã thử nhiều lần trước
      demo thì chạy `docker compose restart app` để reset bộ đếm
- [ ] Quay video OBS toàn bộ demo làm dự phòng
