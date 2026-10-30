# Kịch bản thuyết trình — lời nói từng slide

Đây là **lời nói**, viết sẵn để đọc thành tiếng khi tập. Lúc trình bày thật thì **đừng đọc
thuộc lòng** — nắm ý chính in đậm, nói bằng giọng của mình.

- Thời lượng: **7 phút nói** (mục tiêu 6:05, dư ~1 phút) + **~3 phút demo**
- Slide: `docs/SLIDE.pptx` — **ẩn slide 4 và 7** trước khi trình bày (chuột phải → Hide Slide)
- Demo: chi tiết thao tác ở [`KICH_BAN_7P.md`](KICH_BAN_7P.md), lệnh ở [`LENH_DEMO.txt`](LENH_DEMO.txt)
- Nhóm nhiều người: chia theo cột **Người nói** gợi ý bên dưới; một người thì nói hết

| Phần | Slide | Thời gian | Người nói gợi ý |
| --- | --- | --- | --- |
| Mở đầu, mục lục, bài toán | 1, 2, 3 | 1:10 | TV1 |
| Thiết kế | 5, 6, 8 | 2:40 | TV2 |
| Demo | 9 + màn hình | 0:05 + ~3:00 | TV3 thao tác, TV2 hoặc TV3 nói |
| Kết quả, đánh giá | 10, 11, 12, 13 | 2:10 | TV4 |

---

## Slide 1 — Trang bìa · 15 giây

> Em xin chào thầy. Nhóm em trình bày đồ án **SecureGrade — hệ thống nhập điểm chống giả mạo
> đầu vào**, theo hướng 1: thiết kế hệ thống an toàn.
>
> Câu hỏi xuyên suốt bài của nhóm là: **hệ thống dựa vào đâu để tin một thông tin?**

*Không đọc tên từng thành viên, đã có trên slide.*

---

## Slide 2 — Nội dung · 10 giây

> Bài của nhóm em đi theo bảy phần: từ bài toán, qua thiết kế, rồi chứng minh bằng **demo
> trực tiếp** và bộ test, cuối cùng là hạn chế và kết luận.

*Đừng đọc từng dòng. Chỉ tay vào dòng 05 màu đỏ khi nói "demo trực tiếp".*

---

## Slide 3 — Bài toán · 45 giây

> Điểm số quyết định học bổng, cảnh báo học vụ, xét tốt nghiệp — nên với bài toán này, **toàn
> vẹn quan trọng hơn bảo mật hay sẵn sàng**. Một điểm bị sửa mà không ai phát hiện là thiệt hại
> không sửa được.
>
> Cổng vào duy nhất để sửa điểm là tài khoản giảng viên. Và tình huống thực tế hiện nay là giảng
> viên bị lừa qua phishing hay chiêu ClickFix: kẻ tấn công có được mật khẩu, thậm chí có luôn
> cookie phiên đang đăng nhập.
>
> Ngoài ra còn một tác nhân mà phần lớn hệ thống bỏ qua: **người bên trong có quyền vào thẳng
> database**.
>
> Vậy câu hỏi đặt ra: **mật khẩu đúng có nghĩa là đúng người không?**

*Dừng một nhịp sau câu hỏi. Đây là câu móc của cả bài.*

---

## Slide 4 — ẨN

*Chỉ mở nếu thầy hỏi "tài sản nào quan trọng nhất". Nội dung đã gộp một câu về insider vào slide 3.*

---

## Slide 5 — Kiến trúc phân vùng · 50 giây

> Hệ thống chia ba vùng mạng tách biệt bằng Docker: vùng Edge có WAF, vùng App, và vùng Data
> chứa database.
>
> **Chỉ có WAF mở cổng ra ngoài.** App và database không mở cổng nào, nên mọi request bắt buộc
> phải đi qua bộ lọc của WAF.
>
> Điểm quan trọng nhất là luồng D4 trên sơ đồ: **app không gọi được ra Internet**. Hệ quả là kể
> cả khi kẻ tấn công thực thi được mã trong app, họ cũng không gửi được dữ liệu ra ngoài.
>
> Tất cả các luồng bị chặn này nhóm đều đã kiểm chứng bằng lệnh, không chỉ vẽ trên giấy.

*Chỉ tay vào sơ đồ: WAF → App → DB, rồi chỉ vào mũi tên đỏ D4.*

---

## Slide 6 — Không tin mặc định · 70 giây

> Đây là slide trả lời trực tiếp câu hỏi của bài. Mỗi thông tin hệ thống nhận được, nhóm đặt câu
> hỏi: tin nó dựa vào đâu.
>
> **Mật khẩu** — không đủ, phải có thêm OTP từ một thiết bị khác.
>
> **Vai trò ghi trong token** — nhóm không dùng. Mỗi request đều đọc lại vai trò từ database,
> nên sinh viên sửa token thành admin cũng vô ích.
>
> **Cookie phiên hợp lệ** — vẫn chưa đủ. Hệ thống so ngữ cảnh lúc dùng với lúc đăng nhập, và sửa
> điểm thì phải nhập lại OTP.
>
> **Mã sinh viên do trình duyệt gửi lên** — phải kiểm tra giảng viên có thật sự dạy lớp đó không.
>
> Và dòng cuối, cũng là điểm khác biệt của đồ án: **hệ thống không tin cả dữ liệu trong
> database của chính nó.** Mọi thay đổi điểm đều có log nối chuỗi bằng hash, và điểm luôn được
> đối chiếu với log.
>
> Cụ thể hoá thành **12 lớp kiểm chứng** — một request sửa điểm phải đi qua hết.

*Đây là slide dài nhất. Đừng giải thích sâu từng dòng — thầy hỏi thì trả lời sau.*

---

## Slide 7 — ẨN

*Chỉ mở nếu thầy hỏi "12 lớp là những lớp nào". Đã nói bằng một câu ở slide 6.*

---

## Slide 8 — Top 5 rủi ro · 40 giây

> Nhóm phân tích 12 rủi ro, đây là năm rủi ro chính. Mỗi rủi ro có ba thứ: cách **ngăn chặn**,
> cách **phát hiện**, và **test case** chứng minh.
>
> Phishing lộ mật khẩu thì có MFA. Đánh cắp cookie thì có fingerprint và step-up OTP. Giả mạo
> token thì cố định thuật toán và đọc vai trò từ database. Đổi mã để xem dữ liệu người khác thì
> có kiểm tra quyền sở hữu.
>
> Em xin dừng ở dòng cuối, **R08: insider sửa database và xoá log**. Ngăn chặn bằng cách bảng
> log chỉ cho ghi thêm, không cho sửa hay xoá. Phát hiện bằng chuỗi hash. Phần demo sẽ cho thấy
> đúng điều này.

---

## Slide 9 — DEMO · 5 giây

> Em xin chuyển sang demo trực tiếp.

*Chuyển màn hình. Mọi thứ đã chuẩn bị sẵn từ trước — xem checklist trong `KICH_BAN_7P.md`.*

### Lời nói trong demo (~3 phút)

**Cảnh 0 — chạy `docker compose ps`:**

> Đây là ba container đang chạy. Thầy nhìn cột PORTS: chỉ có WAF có mũi tên ánh xạ ra ngoài.
> App và database không mở cổng nào.

**Cảnh 1 — trước khi chạy lệnh:**

> Giả sử máy giảng viên bị nhiễm malware đánh cắp thông tin. Malware đã lấy được cookie phiên
> đang đăng nhập, em đã cất vào biến này. Giờ em đóng vai kẻ tấn công, dùng cookie đó từ máy khác.

**Cảnh 1 — sau khi ra `SESSION_CONTEXT_MISMATCH` (dừng 3 giây trước khi nói):**

> Cookie đúng, chữ ký đúng, phiên còn hạn — nhưng bị từ chối, vì ngữ cảnh sử dụng khác với lúc
> đăng nhập.

**Cảnh 1 — sau khi giảng viên bị đá ra và chỉ dòng CRITICAL:**

> Không chỉ chặn kẻ tấn công: phiên gốc bị thu hồi luôn. Chính giảng viên bị đá ra — đó là tín
> hiệu để họ báo sự cố. Và bên quản trị nhận cảnh báo mức CRITICAL, ghi cả công cụ kẻ tấn công
> đã dùng.

**Cảnh 2 — trước khi sửa DB:**

> Điểm 8.5 của sinh viên 01 đã được nhập qua app, có OTP, có ghi log. Kiểm tra toàn vẹn lúc này
> đang sạch. Giờ em là người có quyền quản trị database, sửa thẳng điểm thành 10, không đi qua app.

**Cảnh 2 — sau khi tab hiện `DB=10 / log=8.5` (dừng 3 giây):**

> Không có dòng log nào được ghi cho lần sửa này, nhưng hệ thống vẫn phát hiện: điểm trong
> database không khớp với lần sửa hợp lệ cuối cùng.

**Cảnh 2 — sau `permission denied`:**

> Và tài khoản database mà ứng dụng dùng thì không có quyền xoá log. Kể cả khi app bị chiếm quyền
> hoàn toàn, kẻ tấn công cũng không xoá được dấu vết.

**Cảnh 3 — chốt, quay lại slide:**

> Hệ thống không tin cả database của chính nó. Bốn kịch bản tấn công còn lại nằm trong bộ test tự
> động, em chạy được ngay nếu thầy muốn xem.

---

## Slide 10 — Kết quả kiểm thử · 25 giây

> Bộ test tự động có **25 test case, 25 trên 25 PASS**: 6 test cho luồng bình thường và 19 test
> tấn công, phủ đủ sáu kịch bản tấn công.
>
> Mỗi rủi ro trong ma trận đều trỏ tới ít nhất một test case. Bộ test chạy lại được bất kỳ lúc
> nào bằng một lệnh.

*Không đọc từng dòng trên màn hình.*

---

## Slide 11 — Trade-off có số đo · 50 giây

> An toàn hơn luôn phải trả bằng tiện lợi. Nhóm không đoán mà **đo** cái giá đó.
>
> **Step-up OTP mỗi lần sửa điểm**: mỗi mã chỉ dùng một lần, nên giảng viên chỉ sửa được khoảng
> **một điểm mỗi 30 giây**. Chấp nhận cho prototype, dài hạn chuyển sang chế độ xác thực 5 phút.
>
> **Mức độ nhạy của WAF**: ở mức 1, **0 trên 15** request hợp lệ bị chặn oan. Mức 2 chặn oan
> **1 trên 15** — một lý do sửa điểm có dấu hai gạch ngang bị tưởng là SQL — mà không chặn thêm
> được tấn công nào. Nên nhóm chọn mức 1.
>
> **Sao lưu hằng ngày**: chấp nhận mất tối đa 24 giờ dữ liệu, đổi lại thời gian khôi phục đo
> được chỉ **5 đến 6 giây**.

*Chỉ đọc kết quả, đừng kể quá trình đo.*

---

## Slide 12 — Hạn chế và hướng phát triển · 25 giây

> Nhóm cũng nêu rõ những gì chưa làm. Hai điểm quan trọng nhất:
>
> **OTP không chống được phishing thời gian thực**, khi trang giả chuyển tiếp luôn mã ngay lúc
> đó. Hướng đúng là passkey.
>
> Và **người có quyền cao nhất của database vẫn có thể tính lại toàn bộ chuỗi hash**. Hướng đúng
> là đẩy log ra hệ thống ngoài không sửa được.

*Nói thẳng, không xin lỗi.*

---

## Slide 13 — Kết luận · 30 giây

> Nhóm rút ra bốn kết luận.
>
> Một: **mật khẩu bị đánh cắp là không đủ** để sửa điểm — và việc thử đó để lại cảnh báo.
>
> Hai: **cookie bị đánh cắp cũng không đủ** — fingerprint phát hiện, OTP chặn.
>
> Ba: **hệ thống không tin cả database của chính mình** — bắt được cả người bên trong.
>
> *(dừng một nhịp)*
>
> Bốn: phòng thủ nhiều lớp là thật — bỏ qua WAF, tấn công SQL injection vẫn bị chặn.
>
> Em xin cảm ơn thầy, mời thầy đặt câu hỏi.

---

## Mẹo khi nói

- **Nhìn thầy, không nhìn màn hình.** Slide để thầy đọc, mình nói phần không có trên slide.
- **Ba slide dễ vượt giờ:** 5 (sa đà giải thích), 10 (kể quá trình đo), 11 (xin lỗi dài).
- **Lỡ quên:** nhìn tiêu đề slide, nói đúng câu in đậm đầu tiên, rồi chuyển.
- **Thầy ngắt giữa chừng để hỏi:** trả lời ngắn, rồi nói "em xin tiếp tục" — đừng để mất phần demo.
- Câu hỏi thường gặp và cách trả lời: [`HOI_DAP.md`](HOI_DAP.md).
