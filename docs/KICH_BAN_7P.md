# Kịch bản 7 phút nói + 3 phút demo

Bản gốc ([`SLIDE.md`](SLIDE.md) và [`HUONG_DAN_DEMO.md`](HUONG_DAN_DEMO.md)) dựng cho
10 phút nói và 9 phút 30 demo. File này là bản đã cắt cho khung 7 + 3–5 phút.

Nguyên tắc cắt: giữ những gì **không ai khác có**, bỏ những gì **bộ test đã chứng minh
thay**. Thứ bị bỏ không mất — nó nằm ở slide ẩn và ở mục "nếu thầy hỏi" cuối file.

---

## Phần 1 — Nói (mục tiêu 6:05, dư 55 giây)

Ẩn **slide 4** và **slide 7** trước khi trình bày: trong PowerPoint, chuột phải vào
slide ở khung bên trái → **Hide Slide**. Slide vẫn nằm trong file, vẫn mở được khi hỏi
đáp, chỉ không chạy trong lượt trình chiếu.

| # | Slide | Giây | Chỉ nói đúng một ý này |
| --- | --- | --- | --- |
| 1 | Trang bìa | 15 | Tên đề tài + "câu hỏi của đồ án là: hệ thống dựa vào đâu để tin một thông tin" |
| 2 | Nội dung (mục lục) | 10 | Một câu cho cả bài: bài toán → thiết kế → demo và test → hạn chế, kết luận. **Đừng đọc từng dòng** |
| 3 | Bài toán | 45 | Điểm là tài sản toàn vẹn → cổng vào duy nhất là tài khoản GV → **mật khẩu đúng có nghĩa là đúng người không?** |
| ~~4~~ | ~~Tài sản~~ | — | **Ẩn.** Gộp một câu vào slide 3: *"tác nhân nguy hiểm nhất là insider có quyền DB — phần lớn đồ án bỏ qua"* |
| 5 | Kiến trúc | 50 | 3 zone · chỉ WAF có port · **D4: app không gọi được ra Internet, nên có RCE cũng không exfiltrate được** |
| 6 | Không tin mặc định | 70 | Đọc 5 dòng bảng. Dừng ở dòng cuối. Chèn một câu: *"cụ thể hoá thành 12 lớp kiểm chứng, một request sửa điểm phải qua hết"* |
| ~~7~~ | ~~Pipeline 12 lớp~~ | — | **Ẩn.** Đã nói bằng một câu ở slide 6 |
| 8 | Top 5 rủi ro | 40 | Lướt 4 dòng đầu, **dừng ở R08** — insider, hash-chain, TC22–TC24 |
| 9 | DEMO | 5 | "Chuyển sang màn hình live" |
| — | *(demo ~3 phút)* | — | *tính vào ngân sách demo, không tính vào 7 phút* |
| 10 | Kết quả | 25 | 25/25 · 6 bình thường + 19 tấn công · phủ KB1–KB6 |
| 11 | Trade-off | 50 | **Slide ghi điểm.** Ba con số: 1 sửa/30 giây · PL1 0/15 chặn oan · RTO 5–6 giây |
| 12 | Hạn chế | 25 | Đọc nhanh 2 dòng: TOTP không chống AiTM → Passkey; superuser DB vẫn tính lại được hash-chain |
| 13 | Kết luận | 30 | Bốn câu, dừng sau câu 3 |

**Đừng đọc slide.** Chữ trên slide để thầy đọc, bạn nói phần không có trên slide.

Ba chỗ dễ vỡ ngân sách nhất: slide 6 (dễ sa đà giải thích từng dòng), slide 11 (dễ kể
quá trình đo), slide 12 (dễ xin lỗi dài dòng). Ba slide này bấm giờ riêng khi tổng duyệt.

---

## Phần 2 — Demo chính: 2 cảnh, mục tiêu 2:50

Bản 4 cảnh (lượt tập 29/10 mất ~4 phút) **quá dày**: mỗi cảnh ~60 giây, thầy chưa đọc kịp
kết quả cảnh này đã sang cảnh khác. Làm nhanh hơn không giải quyết được, nên bỏ bớt cảnh và
chuyển thao tác dài ra khỏi sân khấu.

- **Bỏ D2 (sửa điểm hợp lệ)** — nói bằng một câu trước KB6. Step-up OTP đã có ở slide 6 và TC15.
- **Bỏ `curl` cổng 3000 ở D1** — chỉ giữ `docker compose ps`.
- **Copy cookie trước khi bấm giờ** — bước DevTools mất ~40 giây và là chỗ đã bị đứng lúc tập.

| Cảnh | Nội dung | Thời gian |
| --- | --- | --- |
| 0 | `docker compose ps` | 0:00–0:15 |
| 1 | **KB2** — cookie bị đánh cắp | 0:15–1:15 |
| 2 | **KB6** — insider sửa thẳng DB | 1:15–2:35 |
| 3 | Câu chốt | 2:35–2:50 |

Còn dư ~1 phút so với 3–5 phút thầy cho. **Dùng phần dư để đi chậm**, không để nhồi thêm cảnh.

### Trước khi bấm giờ (không tính giờ)

- [ ] `docker compose up -d`, chờ ~20 giây, rồi **`node scripts/reset-demo.mjs`**
- [ ] Cửa sổ **ẩn danh** (Ctrl+Shift+N): `admin` đã đăng nhập, mở sẵn tab **Cảnh báo**
- [ ] Cửa sổ **thường**: `gv01` đã đăng nhập, mở bảng SEC401
- [ ] **Copy cookie gv01 vào biến `$c` ngay bây giờ** (F12 → Application → Cookies →
      `sg_token` → Cookie Value → Ctrl+A, Ctrl+C, rồi `$c = "..."` trong PowerShell)
- [ ] Từ lúc đăng nhập gv01 đến lúc chạy cảnh 1 **không quá 15 phút** (phiên hết hạn)
- [ ] Terminal bên trái màn hình (`Win + ←`), cửa sổ admin bên phải (`Win + →`)
- [ ] Chữ terminal phóng to (`Ctrl` + `+`) tới cỡ cuối phòng đọc được
- [ ] `docs/LENH_DEMO.txt` mở sẵn để dán

**`$c` chỉ dùng được một lần:** cảnh 1 thu hồi luôn phiên gv01. Tập lại thì phải đăng nhập
gv01 và copy cookie lại.

### Sáu nguyên tắc để thầy theo kịp

1. `cls` trước mỗi lệnh — màn hình chỉ còn đúng kết quả đang nói.
2. Chạy lệnh xong **dừng 3 giây**, chỉ tay vào dòng kết quả, rồi mới nói.
3. Mỗi cảnh **một câu**, nói sau khi thao tác xong, không nói lúc đang gõ.
4. Không `Alt+Tab` — hai cửa sổ đã xếp cạnh nhau.
5. Chỉ vào **dòng trên cùng** của tab Cảnh báo và đọc giờ; bảng còn dòng của các lượt tập.
6. Có sự cố thì nói "em chuyển sang video dự phòng", không sửa lỗi trước mặt thầy.

### Cảnh 0 · 0:00–0:15 — Phân vùng

```powershell
cls
docker compose ps
```

Chỉ vào cột PORTS: `waf` có `->`, `app` và `db` thì không.

> *"Chỉ có một cửa vào là WAF, app và database không mở cổng ra ngoài."*

### Cảnh 1 · 0:15–1:15 — KB2: cookie bị đánh cắp

> *"Giả sử máy giảng viên nhiễm infostealer, malware đã lấy được cookie phiên đang đăng
> nhập — em đã cất nó vào biến `$c`. Giờ em là kẻ tấn công, dùng cookie đó từ máy khác."*

```powershell
cls
curl.exe -s http://localhost:8080/api/me -H "Cookie: sg_token=$c"
```

→ `{"error":"SESSION_CONTEXT_MISMATCH"}` — **dừng 3 giây**.

1. Sang cửa sổ **gv01**, bấm chọn lại lớp → **bị đá ra trang đăng nhập**
2. Cửa sổ **admin**, tab **Cảnh báo** (bấm lại tab) → dòng **CRITICAL** trên cùng

> *"Cookie đúng, chữ ký đúng, nhưng dùng ở ngữ cảnh khác lúc đăng nhập nên bị từ chối. Phiên
> gốc bị thu hồi luôn — chính giảng viên bị đá ra, đó là tín hiệu để báo sự cố."*

### Cảnh 2 · 1:15–2:35 — KB6: insider sửa thẳng DB

> *"Điểm 8.5 của sinh viên 01 đã được nhập qua app, có OTP, có dòng log. Giờ em là người có
> quyền quản trị database, sửa thẳng không qua app."*

1. Cửa sổ admin → tab **Kiểm tra toàn vẹn** → chỉ dòng *"Điểm lệch so với log: không có"*

```powershell
cls
docker compose exec db psql -U postgres -d securegrade -c "UPDATE grades SET score = 10 WHERE enrollment_id = 1"
```

2. Bấm lại tab **Kiểm tra toàn vẹn** → `enrollment 1: DB=10 / log=8.5` — **dừng 3 giây**

> *"Không có dòng log nào được ghi, nhưng hệ thống vẫn biết: điểm trong DB không khớp với
> lần sửa hợp lệ cuối cùng."*

```powershell
cls
docker compose exec db psql -U app_user -d securegrade -c "DELETE FROM audit_log WHERE id = 1"
```

→ `permission denied for table audit_log`

> *"Còn tài khoản mà ứng dụng dùng thì không có quyền xoá log — kể cả khi app bị chiếm quyền
> hoàn toàn, kẻ tấn công cũng không xoá được dấu vết."*

### Cảnh 3 · 2:35–2:50 — Chốt

> *"Hệ thống không tin cả database của chính nó. Bốn kịch bản tấn công còn lại nằm trong bộ
> test tự động, 25 trên 25 PASS, em chạy được ngay nếu thầy muốn xem."*

---

## Phần 2b — Phương án dự phòng: bản 4 cảnh (~4 phút)

Dùng khi thầy cho đủ 5 phút **và** muốn xem cả luồng sửa điểm hợp lệ. Đây là bản đã tập ngày
29/10. Ở bản này `admin` cũng phải ở **cửa sổ ẩn danh**, không phải tab cùng cửa sổ.

### D1 · 0:00–0:25 — Phân vùng (Terminal)

```bash
docker compose ps
curl.exe -i http://localhost:3000/health
```

Thấy: chỉ `waf` có cột PORTS · **connection refused**.

> *Một cửa vào duy nhất. App và DB không có đường ra Internet.*

### D2 · 0:25–1:10 — Sửa điểm hợp lệ (Trình duyệt)

`gv01` → **Sửa** ở `sv02` (enrollment 3, chưa có điểm) → `9.0` → lý do
`Cham lai bai thi cuoi ky` → **OTP mới** → Lưu.
Mở tab admin → **Audit log** → chỉ vào dòng `GRADE_UPDATE` vừa sinh.

> Dùng `sv02` chứ không phải `sv03`: `sv03` đã có điểm 9.00 từ lần chạy trước, sửa một ô
> đã có sẵn thì không thấy rõ là vừa nhập mới.

> *Ô OTP này là step-up, không phải đăng nhập lại. Và điểm vừa đổi đã có một dòng log
> ghi cùng transaction — không tồn tại trạng thái điểm đổi mà không có log.*

### D3 · 1:10–2:20 — KB2: đánh cắp cookie (DevTools + Terminal)

1. Cửa sổ `gv01`: **F12 → Application → Cookies** → copy `sg_token`
2. Terminal:

```bash
curl.exe -i http://localhost:8080/api/me -H "Cookie: sg_token=<DAN_VAO_DAY>"
```

→ **401 `SESSION_CONTEXT_MISMATCH`**

3. Quay lại cửa sổ `gv01`, bấm thao tác bất kỳ → **bị đăng xuất**
4. Tab admin → **Cảnh báo** → dòng **CRITICAL**

> *Infostealer lấy được cookie vẫn không dùng được, vì phiên gắn với ngữ cảnh. Và phiên
> gốc bị thu hồi luôn — kẻ tấn công vừa dùng cookie thì chính giảng viên bị đá ra, đó
> là tín hiệu để báo sự cố.*

### D4 · 2:20–3:45 — KB6: insider sửa thẳng DB (Terminal + Admin)

```bash
docker compose exec db psql -U postgres -d securegrade -c "UPDATE grades SET score = 10 WHERE enrollment_id = 1"
```

Tab admin → **Kiểm tra toàn vẹn** → `enrollment 1: DB=10 / log=8.50`.

```bash
docker compose exec db psql -U app_user -d securegrade -c "DELETE FROM audit_log WHERE id = 1"
```

→ **permission denied**

> *Hệ thống không tin cả cơ sở dữ liệu của chính nó. Và ứng dụng không có quyền xoá dấu
> vết của chính nó — kể cả khi bị chiếm quyền hoàn toàn.*

Bỏ bước khôi phục điểm (bản gốc có) — không đủ thời gian, và không thêm ý gì mới.

### D5 · 3:45–4:00

> *Bốn kịch bản tấn công còn lại nằm trong bộ test tự động, 25/25 PASS — em chạy được
> ngay nếu thầy muốn xem.*

---

## Nếu thầy hỏi — mở ra trong 30 giây

| Thầy hỏi | Mở cái gì |
| --- | --- |
| "Tài sản nào quan trọng nhất?" | Bỏ ẩn **slide 4** |
| "12 lớp là những lớp nào?" | Bỏ ẩn **slide 7** |
| "Có mật khẩu rồi thì sao?" | **KB1** — tab ẩn danh, `gv02`, nhập OTP sai 3 lần → 423 + cảnh báo HIGH (~60s) |
| "Sửa JWT được không?" | **KB3** — `node tests/attacks/forge-jwt.mjs <cookie>` (~40s) |
| "Đổi ID trên URL thì sao?" | **KB4** — `PUT /api/grades/2` bằng cookie `gv01` → 403, audit ghi `ACCESS_DENIED_IDOR` (~40s) |
| "WAF thủng thì sao?" | **KB5** — `docker compose exec app node /tmp/sqli-direct.mjs` → vẫn 401, `grades` không đổi (~45s) |
| "Chạy cả bộ test xem?" | `cd tests && node run-tests.mjs` — **mất ~2 phút**, chỉ nhận nếu còn dư giờ |

Chi tiết từng lệnh: [`HUONG_DAN_DEMO.md`](HUONG_DAN_DEMO.md) mục B3, B5, B6.

---

## Ba bẫy đã gặp ở lượt duyệt đầu

1. **gv01 và admin phải ở hai cửa sổ khác nhau: thường và ẩn danh.** Hai tab cùng cửa sổ dùng
   chung một cookie `sg_token`, đăng nhập người sau đè lên người trước, tab cũ sẽ ra nhầm
   trang. Cookie của gv01 (để copy ở D3) phải lấy từ cửa sổ thường.
2. **Trong PowerShell gõ `curl.exe`, không phải `curl`.** `curl` trần bị đổi thành
   `Invoke-WebRequest`, nó hỏi `Uri:` và treo ở đó. Lệnh dán sẵn trong file text phải
   ghi `curl.exe`.
3. **OTP chỉ sống 30 giây và dùng một lần.** Đừng lấy mã trước khi con trỏ đã nằm trong ô
   nhập. Bấm Lưu hai lần hoặc dán lại mã cũ là bị `STEP_UP_FAIL_REPLAY`. Mã hết hạn thì
   phiên mật khẩu vẫn còn 5 phút, chỉ cần mã mới, không phải đăng nhập lại.

## Tổng duyệt

Bấm giờ **riêng hai phần**. Phần nói quá 6:30 thì cắt tiếp slide 12 xuống 15 giây.
Demo chính quá 3:30 nghĩa là đang nói lúc gõ hoặc đang tìm cửa sổ — sửa thói quen, đừng cắt cảnh.

**Giữa hai lượt duyệt phải chạy lại `node scripts/reset-demo.mjs`.** Bước D4 sửa thẳng
điểm trong DB và kịch bản 4 phút đã bỏ bước khôi phục, nên kết thúc lượt 1 hệ thống đang
ở trạng thái "vi phạm toàn vẹn". Vào lượt 2 mà không reset thì tab **Kiểm tra toàn ven**
đã báo đỏ từ đầu, và màn KB6 mất sạch tính bất ngờ. Chạy reset mất ~15 giây.

Cũng chạy nó **ngay trước khi vào phòng bảo vệ**, sau khi đã thử nghiệm xong mọi thứ.

Quay OBS ở lần duyệt thứ hai. Nếu hôm đó Docker không lên hoặc phòng máy chặn cổng
8080 thì phát video, vẫn kịp khung 5 phút.
