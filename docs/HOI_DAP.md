# Bộ câu hỏi thầy có thể hỏi — và cách trả lời

Mỗi câu có **câu trả lời ngắn** (nói trong 20–30 giây) và chỗ tra trong báo cáo. Đọc kỹ các câu
có dấu ⭐ — khả năng bị hỏi cao nhất.

**Nguyên tắc trả lời:**
- Trả lời thẳng vào câu hỏi trong câu đầu tiên, giải thích sau.
- Có số liệu thì nói số liệu.
- **Không biết thì nói không biết**, rồi nói mình sẽ kiểm tra bằng cách nào. Bịa trước mặt thầy
  bảo mật là mất điểm nhanh nhất.
- Câu hỏi về điểm yếu: **thừa nhận, rồi nói hướng khắc phục**. Nhóm đã ghi hạn chế trong báo
  cáo mục 8.2 — dẫn chiếu vào đó cho thấy nhóm biết từ trước.

---

## A. Tổng quan bài toán

### ⭐ A1. Vì sao chọn đề tài nhập điểm?
Điểm số là tài sản **cần toàn vẹn** rất rõ ràng: sai một điểm ảnh hưởng học bổng, tốt nghiệp, và
không có cách sửa nếu không phát hiện. Đồng thời có tình huống đầu vào bị giả mạo rất thực tế:
giảng viên bị phishing hoặc nhiễm malware. Đủ cụ thể để làm prototype trong một học kỳ.

### A2. Hệ thống ưu tiên C, I hay A?
**Integrity cao nhất**, rồi Confidentiality, rồi Availability. Hệ quả thiết kế: khi nghi phiên bị
đánh cắp, hệ thống **chủ động đá người dùng ra** — chấp nhận giảm sẵn sàng để giữ toàn vẹn.
*(Báo cáo 2.1)*

### ⭐ A3. Đề bài nói "không phải mọi thông tin đều đáng tin" — đồ án thể hiện thế nào?
Bảng ở slide 5 / báo cáo 4.7: liệt kê từng thông tin hệ thống nhận — mật khẩu, token, vai trò,
cookie, mã sinh viên, OTP, và cả dữ liệu trong DB — kèm cách kiểm chứng từng cái. Điểm khác biệt
là dòng cuối: **không tin cả database của chính mình**.

### A4. Tình huống "đầu vào bị giả mạo / đánh cắp / dùng sai ngữ cảnh" cụ thể là gì?
Có đủ cả bốn: **giả mạo** token (KB3), **chỉnh sửa** mã sinh viên trên URL (KB4), **đánh cắp**
cookie (KB2), **dùng sai ngữ cảnh** — cookie dùng ở máy khác (KB2), và dữ liệu bị **sửa sau khi
lưu** (KB6).

### A5. Ai là người dùng? Ai là kẻ tấn công?
Dùng: sinh viên (xem điểm mình), giảng viên (nhập điểm lớp mình), admin (giám sát, xử lý sự cố —
**không được sửa điểm**). Tấn công: sinh viên muốn sửa điểm, kẻ phishing bên ngoài, malware trên
máy giảng viên, insider có quyền DB, bot dò mật khẩu. *(Báo cáo 3.2)*

---

## B. Xác thực và phiên

### ⭐ B1. Có mật khẩu giảng viên rồi thì sao?
Vẫn bị chặn ở OTP — mã nằm trên điện thoại, thiết bị khác. Sai OTP 3 lần thì tài khoản bị khoá và
sinh cảnh báo `MFA_FAIL_THRESHOLD` mức HIGH, nội dung "mật khẩu đúng nhưng OTP sai liên tục — nghi
lộ mật khẩu". Tức là việc thử đó **có ý nghĩa điều tra**, không chỉ bị chặn. *(KB1, TC09)*

### B2. Sao dùng TOTP mà không dùng OTP qua SMS hay email?
SMS bị tấn công đổi SIM, email có thể đã bị chiếm cùng lúc với mật khẩu. TOTP sinh ngay trên điện
thoại, không truyền qua mạng. Nhược điểm vẫn có — câu B3.

### ⭐ B3. TOTP có bị phishing được không?
**Có**, với phishing thời gian thực (AiTM): trang giả nhận mật khẩu và OTP rồi chuyển tiếp ngay
sang trang thật trong 30 giây. Nhóm ghi rõ trong hạn chế (8.2). Hướng đúng là **passkey/WebAuthn**
vì khoá gắn với tên miền của trang, trang giả không dùng được.

### B4. Kẻ tấn công nhìn trộm được OTP rồi dùng lại thì sao?
Mỗi mã chỉ dùng được **một lần trong 90 giây**, kể cả khi request bị từ chối. Hệ thống lưu
`last_otp` và `last_otp_at`. Dùng lại → `MFA_FAIL_REPLAY` / `STEP_UP_FAIL_REPLAY`. *(TC10)*

### B5. Mất điện thoại thì sao?
Admin reset MFA cho tài khoản đó (có nút trong tab Người dùng, bản thân thao tác đó cũng phải nhập
OTP của admin). Giảng viên đăng nhập lại và quét mã QR mới. Đây là chi phí của T1.

### B6. Lưu mật khẩu thế nào?
bcrypt, cost 12. Khi tên đăng nhập không tồn tại, hệ thống vẫn so với một hash giả (`DUMMY_HASH`)
để **thời gian trả lời bằng nhau**, và luôn trả cùng một thông báo `INVALID_CREDENTIALS` — kẻ tấn
công không dò được tài khoản nào tồn tại.

### B7. Chống dò mật khẩu thế nào?
Hai lớp: **rate limit** 10 lần đăng nhập / 15 phút / IP (request thứ 11 trả 429, TC08), và **khoá
tài khoản** sau 5 lần sai mật khẩu (TC07).

### B8. Kẻ xấu cố tình nhập sai để khoá tài khoản giảng viên thì sao?
Đúng, đó là một rủi ro từ chối dịch vụ của cơ chế khoá. Khoá chỉ 15 phút, admin mở khoá được ngay,
và việc đó sinh `ACCOUNT_LOCKED` để biết bị nhắm. Hướng tốt hơn là khoá theo cặp tài khoản + IP
thay vì khoá toàn bộ tài khoản. *Đây là câu khó — nói thẳng là có rủi ro.*

### ⭐ B9. Vì sao JWT rồi mà vẫn lưu phiên trong database?
JWT thuần **không thu hồi được** trước khi hết hạn. Nhóm thêm `sid` trỏ tới bảng `sessions`: thu
hồi chỉ cần đánh dấu một dòng, **hiệu lực ngay request kế tiếp** — đây là thứ cho phép đá kẻ tấn
công ra ở KB2. Đổi lại mất tính stateless, thêm một truy vấn mỗi request (trade-off T3).

### B10. Sao dùng HS256 mà không dùng RS256?
Chỉ có **một** dịch vụ vừa ký vừa kiểm token, nên khoá đối xứng là đủ và đơn giản. RS256 cần khi
có nhiều dịch vụ chỉ kiểm mà không được ký. Quan trọng hơn là **cố định thuật toán**
(`algorithms: ['HS256']`) để chặn tấn công `alg: none`, và khoá ≥ 64 ký tự — app từ chối khởi
động nếu khoá ngắn hơn.

### B11. Lộ `JWT_SECRET` thì sao?
Kẻ tấn công ký được token hợp lệ, nhưng token phải chứa `sid` **có trong bảng `sessions`**. Token
có chữ ký đúng mà `sid` không tồn tại → hệ thống ghi `SESSION_UNKNOWN` mức CRITICAL, coi là **dấu
hiệu lộ khoá**. Xử lý: chạy `scripts/rotate-secrets.mjs` đổi khoá.

### B12. Vì sao không tin vai trò ghi trong token?
Token do server ký nên bình thường không sửa được — nhưng nếu khoá lộ hoặc có lỗi kiểm chữ ký, vai
trò trong token là thứ đầu tiên bị sửa. Nhóm **đọc lại vai trò từ bảng `users` mỗi request**. Token
chỉ dùng để tìm phiên. *(Zero Trust, báo cáo 2.3)*

---

## C. Đánh cắp cookie và fingerprint

### ⭐ C1. HttpOnly rồi thì sao còn bị đánh cắp cookie?
HttpOnly chặn **JavaScript trên trang** đọc cookie — tức là chống XSS. Nhưng malware chạy trên máy
đọc thẳng file profile của trình duyệt trên ổ đĩa, HttpOnly không có tác dụng. Đó là lý do cần lớp
fingerprint ở phía server.

### ⭐ C2. Fingerprint là gì, tính thế nào?
`SHA-256(User-Agent + IP)`, lưu lúc đăng nhập, tính lại và so ở mỗi request. Lệch → thu hồi phiên,
ghi `SESSION_CONTEXT_MISMATCH` mức CRITICAL.

### ⭐ C3. Kẻ tấn công giả đúng User-Agent và IP thì sao?
Thì fingerprint khớp, đọc được dữ liệu. Nhưng **sửa điểm vẫn phải nhập OTP mới** (step-up), mà OTP
nằm trên điện thoại giảng viên. Fingerprint để **phát hiện**, step-up để **chặn** — hai lớp độc
lập. *(TC15)*

### C4. Đổi Wi-Fi sang 4G có bị đăng xuất oan không?
Có — IP đổi thì fingerprint lệch. Đó là false positive đã ghi nhận ở trade-off T4. Chấp nhận vì
phiên chỉ 15 phút. Dài hạn: gắn phiên với thiết bị bằng khoá mật mã, hoặc đánh giá rủi ro theo ngữ
cảnh thay vì so cứng.

### ⭐ C5. Hệ thống đứng sau WAF, vậy IP app nhìn thấy có phải IP thật không?
Câu khó, **trả lời thật**: app đặt `trust proxy = 1` để lấy IP từ header `X-Forwarded-For` mà WAF
gửi. Nhưng nhóm **chưa kiểm chứng** WAF có luôn gửi header đó hay không — nếu không, IP app thấy
luôn là IP của container WAF, và fingerprint thực chất chỉ còn dựa vào User-Agent. Đã ghi ở hạn chế
8.2. Demo KB2 vẫn đúng vì curl có User-Agent khác trình duyệt.

### C6. Chống CSRF thế nào?
Cookie `SameSite=Strict` — trình duyệt không gửi cookie khi request đến từ trang khác. Thêm vào đó
API chỉ nhận `application/json`, form HTML từ trang khác không gửi được kiểu này (trả 415).

### C7. Sao phiên chỉ 15 phút?
Giới hạn thời gian kẻ tấn công dùng được cookie đánh cắp. Phiên trước khi nhập OTP còn ngắn hơn:
5 phút.

---

## D. Phân quyền và đầu vào

### ⭐ D1. Giảng viên đổi mã trên URL để sửa điểm lớp khác (IDOR) thì sao?
Server kiểm tra giảng viên có **dạy lớp chứa sinh viên đó** không, trong cùng transaction với việc
ghi điểm. Không phải → 403. Kể cả OTP đúng, tài khoản thật cũng bị chặn. Ghi `ACCESS_DENIED_IDOR`;
3 lần trong 5 phút → `ALERT_IDOR_BURST`. *(KB4, TC16, TC17)*

### D2. Vì sao lỗi IDOR chỉ trả `FORBIDDEN` chung chung?
Cố ý: không cho kẻ tấn công biết mã đó có tồn tại hay không. Tên thật của sự kiện nằm trong audit
log cho admin xem.

### ⭐ D3. Vì sao admin không được sửa điểm?
**Tách quyền** (separation of duties): người giám sát không được là người sửa. Nếu admin vừa sửa
điểm vừa xem log, chiếm được tài khoản admin là làm được mọi thứ và tự che giấu được.

### D4. Chống SQL injection thế nào?
Ba lớp độc lập: WAF chặn payload đã biết; **query tham số hoá** (không ghép chuỗi SQL); `app_user`
chỉ có quyền tối thiểu. Nhóm đã chứng minh: **bỏ qua hoàn toàn WAF**, bắn thẳng vào app từ mạng nội
bộ, payload vẫn không có tác dụng, số dòng bảng điểm không đổi. *(KB5, báo cáo 6.4)*

### D5. Chống XSS thế nào?
WAF; giao diện hiển thị dữ liệu bằng `textContent` thay vì `innerHTML`; CSP chỉ cho chạy script
cùng nguồn, không có script inline; cookie HttpOnly. *(TC20)*

### D6. Kiểm tra điểm đầu vào thế nào?
Số trong 0–10, tối đa 2 chữ số thập phân; lý do 5–200 ký tự. Sai → 400 và ghi `INPUT_REJECTED`.

---

## E. Audit log và toàn vẹn dữ liệu

### ⭐ E1. Hash-chain hoạt động thế nào?
Mỗi dòng log lưu hash của dòng trước, rồi tính hash của chính nó từ tất cả các trường:
`SHA256(prev_hash | ts | actor_id | action | target | detail | ip | severity)`. Sửa một dòng → hash
dòng đó không khớp, và `prev_hash` dòng sau không khớp → biết **chính xác vị trí** bị can thiệp.
*(TC24)*

### ⭐ E2. Trong demo, sửa điểm thẳng DB mà chuỗi hash không đứt — vậy sao phát hiện được?
Vì kẻ tấn công **chưa đụng vào log**. Có **hai phép kiểm tra độc lập**:
- **Đối chiếu điểm với log**: điểm trong bảng `grades` phải bằng giá trị mới nhất của dòng
  `GRADE_UPDATE` → bắt **sửa điểm không sửa log** (đây là cái demo cho thấy)
- **Chuỗi hash** → bắt **sửa log để che giấu**

### ⭐ E3. Superuser sửa cả điểm lẫn log, rồi tính lại toàn bộ chuỗi hash thì sao?
**Không phát hiện được** bằng hash-chain nội bộ — nhóm đã ghi rõ ở hạn chế 8.2. Giảm thiểu: tab
Kiểm tra toàn vẹn hiện **hash cuối (anchor)**, admin chép ra ngoài hệ thống mỗi ngày rồi so lại —
chuỗi bị tính lại sẽ cho hash cuối khác. Giải pháp đúng là đẩy log sang SIEM hoặc WORM storage, nơi
superuser của DB không sửa được.

### E4. Vì sao ghi log cùng transaction với điểm?
Để không tồn tại trạng thái "điểm đã đổi mà không có log". Hai thao tác cùng thành công hoặc cùng
rollback. Đây cũng là tiền đề của phép đối chiếu điểm với log.

### E5. Vì sao cột `detail` là TEXT mà không phải JSONB?
JSONB sắp xếp lại thứ tự khoá khi lưu. Chuỗi đọc ra khác chuỗi lúc tính hash → kiểm tra sẽ báo đứt
chuỗi **sai**. TEXT giữ nguyên từng byte.

### E6. Hai request ghi log cùng lúc thì chuỗi có bị rẽ nhánh không?
Không — ghi log dùng `pg_advisory_xact_lock(42)` để tuần tự hoá: request sau phải chờ request trước
commit xong mới đọc `prev_hash`.

### ⭐ E7. App bị chiếm quyền hoàn toàn thì có xoá log được không?
Không. App kết nối DB bằng `app_user`, chỉ có quyền đọc và thêm trên `audit_log`, không có sửa,
không có xoá. Demo đã cho thấy `permission denied`. *(TC23: 4 lệnh phá hoại đều bị từ chối, lệnh
đọc vẫn chạy)*

### E8. Admin có xoá log được không?
Qua giao diện thì không — không có chức năng đó, và app cũng không có quyền. Chỉ superuser `postgres`
xoá được, và việc đó làm đứt chuỗi hash.

---

## F. Mạng và hạ tầng

### ⭐ F1. Vì sao chia ba vùng mạng?
- **Một cửa vào duy nhất** là WAF — không ai gọi thẳng vào app để né bộ lọc.
- App và DB **không ra được Internet** — có lỗ hổng thực thi mã trong app cũng không gửi dữ liệu ra
  ngoài được.
- WAF không cùng mạng với DB — chiếm WAF cũng không chạm được DB.

### F2. Kiểm chứng phân vùng thế nào?
Bằng lệnh, ghi trong `docs/evidence/`: gọi thẳng cổng 3000 và 5432 bị từ chối, WAF không phân giải
được tên `db`, app gọi ra Internet bị chặn. Có lần suýt ghi kết luận sai vì một PostgreSQL khác cài
sẵn trên máy chiếm cổng 5432 — báo cáo 4.3.1 ghi lại cách nhóm phát hiện và kiểm chứng lại.

### F3. Sao không dùng HTTPS?
Prototype chạy `localhost` trong lab. Đây là hạn chế đã nêu (T8, 8.2): trên mạng thật, cookie và OTP
có thể bị nghe lén. Thêm HTTPS + HSTS + cookie `secure` là việc cấu hình, không đổi thiết kế.

### F4. App chạy quyền root không?
Không — container app chạy bằng `USER node`.

---

## G. WAF

### ⭐ G1. Vì sao chọn Paranoia Level 1 chứ không phải 2?
Nhóm **đo**: 15 request hợp lệ (mật khẩu có ký tự đặc biệt, lý do tiếng Việt có dấu, có dấu nháy,
dấu `;`, dấu `--`). PL1 chặn oan **0/15**, PL2 chặn oan **1/15** — lý do "Thieu bai -- da nop bu" bị
tưởng là comment SQL. PL2 **không chặn thêm** payload tấn công nào trong bộ đo. Nên chọn PL1.
*(Báo cáo 7.2)*

### G2. Bộ đo 15 request có đủ không?
Không đủ để kết luận tổng quát — nhóm ghi ở hạn chế 8.2. Kết luận chỉ đúng với tập đo đó. Hướng mở
rộng: chạy bộ test chính thức của CRS. Hướng dài hạn: viết rule ngoại lệ cho trường `reason` rồi
nâng lên PL2.

### G3. WAF chặn theo cơ chế nào?
OWASP CRS v4 **cộng điểm bất thường**: mỗi luật khớp cộng điểm theo mức nghiêm trọng, tổng ≥ 5 thì
luật 949110 chặn. Ví dụ SQLi khớp luật 942100.

---

## H. Kiểm thử và trade-off

### ⭐ H1. 25 test case gồm những gì?
6 test luồng bình thường + 19 test tấn công, phủ đủ KB1–KB6. Chạy tự động bằng
`node tests/run-tests.mjs`, chạy lại được nhiều lần (tự dọn trạng thái trước khi chạy). Mỗi rủi ro
trong ma trận trỏ tới ít nhất một test, trừ R09 là rủi ro cấu hình.

### ⭐ H2. Trade-off quan trọng nhất là gì?
**Step-up OTP mỗi lần sửa điểm (T2).** Được: cookie bị đánh cắp không sửa được điểm. Mất: mỗi mã
chỉ dùng một lần, mã đổi mỗi 30 giây → **tối đa khoảng 1 lần sửa / 30 giây**. Nhập điểm cả lớp 50
người sẽ rất chậm. Ngắn hạn chấp nhận cho prototype; dài hạn chuyển sang "sudo mode" — xác thực một
lần, được sửa trong 5 phút.

### H3. RTO 5–6 giây có ý nghĩa gì?
Đó là thời gian từ lúc chạy khôi phục đến lúc hệ thống phục vụ lại, đo 2 lần sau khi giả lập xoá
sạch bảng điểm. Con số của **môi trường lab, dữ liệu rất nhỏ** — nó chứng minh **quy trình khôi
phục chạy được và đã diễn tập**, không phải cam kết SLA. RPO là 24 giờ vì sao lưu hằng ngày.

### H4. Tám trade-off còn lại là gì?
T1 MFA bắt buộc · T2 step-up mỗi lần sửa · T3 phiên trong DB · T4 fingerprint (đăng xuất oan) ·
T5 WAF PL1 · T6 hash-chain tự làm thay SIEM · T7 backup hằng ngày · T8 HTTP trong lab. Ba cái có số
đo thật: T2, T5, T7. *(Báo cáo 7.1)*

---

## I. Hạn chế và mở rộng

### ⭐ I1. Hạn chế lớn nhất của hệ thống là gì?
Hai điểm: **OTP không chống phishing thời gian thực** (→ passkey), và **superuser DB tính lại được
chuỗi hash** (→ SIEM/WORM). Ngoài ra: HTTP, `mfa_secret` lưu dạng rõ, rate limit lưu trong RAM.
*(Báo cáo 8.2)*

### I2. `mfa_secret` lưu dạng rõ — ai đọc được DB thì sinh được OTP?
Đúng. Nhóm đã thiết kế phương án mã hoá AES-256-GCM với khoá `MFA_ENC_KEY` nằm ngoài DB, nhưng chưa
bật trong prototype vì cắt phạm vi, và vì script test tự động cần đọc secret. Script `otp.mjs` dùng
khi tập demo cũng dựa vào điều này — **không phải cửa hậu**, mà là hạn chế đã ghi.

### I3. Đưa lên dùng thật cho cả trường thì cần làm gì thêm?
HTTPS; passkey thay TOTP; sudo mode thay step-up từng lần; đẩy log ra SIEM; rate limit dùng Redis
khi chạy nhiều instance; cache phiên; sao lưu liên tục (PITR) thay vì hằng ngày; kiểm tải.

### I4. Nếu làm lại, nhóm sẽ làm khác gì?
Gợi ý trả lời: kiểm chứng sớm việc WAF gửi IP thật (câu C5), và đo trade-off với bộ dữ liệu lớn hơn.
*Câu mở — trả lời theo ý của nhóm.*

---

## J. Về demo

### J1. Vì sao demo chỉ có hai kịch bản?
Hai kịch bản này phân biệt đồ án với một bài web có đăng nhập thông thường: **cookie bị đánh cắp**
và **insider sửa DB**. Bốn kịch bản còn lại có trong bộ test tự động, chạy được ngay nếu thầy muốn.

### J2. Mã OTP trong demo lấy từ đâu?
Từ app authenticator trên điện thoại. Lúc tập nhóm dùng `scripts/otp.mjs` đọc secret từ DB bằng
quyền vận hành trên máy chủ — liên quan hạn chế I2.

### J3. Cookie trong demo lấy từ đâu?
Copy từ DevTools của trình duyệt giảng viên trước khi demo, **đóng vai malware** đã đánh cắp nó.
Làm trước để không mất thời gian trình diễn, không ảnh hưởng tính đúng: cookie vẫn là cookie thật
của phiên đang sống.

### J4. Bảng cảnh báo có dòng cũ, là sao?
Đó là dòng của các lượt tập trước. Log chỉ cho ghi thêm, **không xoá được — đó là chủ ý thiết kế**.
Nhìn cột thời điểm để thấy dòng vừa sinh.

---

## Khi bị hỏi câu không biết

Nói:

> *"Phần này nhóm em chưa kiểm chứng. Nếu kiểm tra, em sẽ làm bằng cách [...]."*

Ví dụ: thầy hỏi hiệu năng khi 1.000 giảng viên nhập điểm cùng lúc → *"Nhóm chưa đo tải. Em dự đoán
điểm nghẽn là khoá `pg_advisory_xact_lock` khi ghi log tuần tự, và truy vấn phiên ở mỗi request. Để
kiểm tra em sẽ dùng công cụ bắn tải như k6."*

Trả lời như vậy cho thấy nhóm **hiểu hệ thống**, kể cả chỗ chưa làm.
