# Kịch bản 7 phút nói + 4 phút demo

Bản gốc ([`SLIDE.md`](SLIDE.md) và [`HUONG_DAN_DEMO.md`](HUONG_DAN_DEMO.md)) dựng cho
10 phút nói và 9 phút 30 demo. File này là bản đã cắt cho khung 7 + 3–5 phút.

Nguyên tắc cắt: giữ những gì **không ai khác có**, bỏ những gì **bộ test đã chứng minh
thay**. Thứ bị bỏ không mất — nó nằm ở slide ẩn và ở mục "nếu thầy hỏi" cuối file.

---

## Phần 1 — Nói (mục tiêu 5:55, dư 65 giây)

Ẩn **slide 3** và **slide 6** trước khi trình bày: trong PowerPoint, chuột phải vào
slide ở khung bên trái → **Hide Slide**. Slide vẫn nằm trong file, vẫn mở được khi hỏi
đáp, chỉ không chạy trong lượt trình chiếu.

| # | Slide | Giây | Chỉ nói đúng một ý này |
| --- | --- | --- | --- |
| 1 | Trang bìa | 15 | Tên đề tài + "câu hỏi của đồ án là: hệ thống dựa vào đâu để tin một thông tin" |
| 2 | Bài toán | 45 | Điểm là tài sản toàn vẹn → cổng vào duy nhất là tài khoản GV → **mật khẩu đúng có nghĩa là đúng người không?** |
| ~~3~~ | ~~Tài sản~~ | — | **Ẩn.** Gộp một câu vào slide 2: *"tác nhân nguy hiểm nhất là insider có quyền DB — phần lớn đồ án bỏ qua"* |
| 4 | Kiến trúc | 50 | 3 zone · chỉ WAF có port · **D4: app không gọi được ra Internet, nên có RCE cũng không exfiltrate được** |
| 5 | Không tin mặc định | 70 | Đọc 5 dòng bảng. Dừng ở dòng cuối. Chèn một câu: *"cụ thể hoá thành 12 lớp kiểm chứng, một request sửa điểm phải qua hết"* |
| ~~6~~ | ~~Pipeline 12 lớp~~ | — | **Ẩn.** Đã nói bằng một câu ở slide 5 |
| 7 | Top 5 rủi ro | 40 | Lướt 4 dòng đầu, **dừng ở R08** — insider, hash-chain, TC22–TC24 |
| 8 | DEMO | 5 | "Chuyển sang màn hình live" |
| — | *(demo 4 phút)* | — | *tính vào ngân sách demo, không tính vào 7 phút* |
| 9 | Kết quả | 25 | 25/25 · 6 bình thường + 19 tấn công · phủ KB1–KB6 |
| 10 | Trade-off | 50 | **Slide ghi điểm.** Ba con số: 1 sửa/30 giây · PL1 0/15 chặn oan · RTO 5–6 giây |
| 11 | Hạn chế | 25 | Đọc nhanh 2 dòng: TOTP không chống AiTM → Passkey; superuser DB vẫn tính lại được hash-chain |
| 12 | Kết luận | 30 | Bốn câu, dừng sau câu 3 |

**Đừng đọc slide.** Chữ trên slide để thầy đọc, bạn nói phần không có trên slide.

Ba chỗ dễ vỡ ngân sách nhất: slide 5 (dễ sa đà giải thích từng dòng), slide 10 (dễ kể
quá trình đo), slide 11 (dễ xin lỗi dài dòng). Ba slide này bấm giờ riêng khi tổng duyệt.

---

## Phần 2 — Demo (mục tiêu 3:55)

Bỏ KB1, KB3, KB4, KB5. Giữ **KB2** và **KB6** — hai cái này là thứ phân biệt đồ án
này với đồ án "làm web có đăng nhập".

### Trước khi bấm giờ

Mọi thứ dưới đây phải xong **trước khi bắt đầu nói**, không tính vào 4 phút:

- [ ] `docker compose up -d`, chờ ~20 giây, rồi **`node scripts/reset-demo.mjs`**
      (mở khoá tài khoản · reset rate limit · đưa điểm `enrollment 1` về 8.50 qua app)
- [ ] `gv01` **đã đăng nhập sẵn** ở cửa sổ thường, đang mở bảng điểm SEC401
- [ ] `admin` đã đăng nhập sẵn ở tab riêng, đang mở tab **Cảnh báo**
- [ ] Tab ẩn danh mở sẵn, trống
- [ ] Terminal đã `cd` vào thư mục dự án
- [ ] **Mở sẵn một file text chứa toàn bộ lệnh dưới đây** — demo thì dán, không gõ
- [ ] Điện thoại mở sẵn app authenticator, hoặc `node scripts/otp.mjs gv01` chạy sẵn ở terminal thứ hai

### D1 · 0:00–0:25 — Phân vùng (Terminal)

```bash
docker compose ps
curl -i http://localhost:3000/health
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
curl -i http://localhost:8080/api/me -H "Cookie: sg_token=<DAN_VAO_DAY>"
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
| "Tài sản nào quan trọng nhất?" | Bỏ ẩn **slide 3** |
| "12 lớp là những lớp nào?" | Bỏ ẩn **slide 6** |
| "Có mật khẩu rồi thì sao?" | **KB1** — tab ẩn danh, `gv02`, nhập OTP sai 3 lần → 423 + cảnh báo HIGH (~60s) |
| "Sửa JWT được không?" | **KB3** — `node tests/attacks/forge-jwt.mjs <cookie>` (~40s) |
| "Đổi ID trên URL thì sao?" | **KB4** — `PUT /api/grades/2` bằng cookie `gv01` → 403, audit ghi `ACCESS_DENIED_IDOR` (~40s) |
| "WAF thủng thì sao?" | **KB5** — `docker compose exec app node /tmp/sqli-direct.mjs` → vẫn 401, `grades` không đổi (~45s) |
| "Chạy cả bộ test xem?" | `cd tests && node run-tests.mjs` — **mất ~2 phút**, chỉ nhận nếu còn dư giờ |

Chi tiết từng lệnh: [`HUONG_DAN_DEMO.md`](HUONG_DAN_DEMO.md) mục B3, B5, B6.

---

## Tổng duyệt

Bấm giờ **riêng hai phần**. Phần nói quá 6:30 thì cắt tiếp slide 11 xuống 15 giây.
Phần demo quá 4:30 thì bỏ bước 4 của D3 (tab cảnh báo CRITICAL) — ý đã nói ở bước 2.

**Giữa hai lượt duyệt phải chạy lại `node scripts/reset-demo.mjs`.** Bước D4 sửa thẳng
điểm trong DB và kịch bản 4 phút đã bỏ bước khôi phục, nên kết thúc lượt 1 hệ thống đang
ở trạng thái "vi phạm toàn vẹn". Vào lượt 2 mà không reset thì tab **Kiểm tra toàn ven**
đã báo đỏ từ đầu, và màn KB6 mất sạch tính bất ngờ. Chạy reset mất ~15 giây.

Cũng chạy nó **ngay trước khi vào phòng bảo vệ**, sau khi đã thử nghiệm xong mọi thứ.

Quay OBS ở lần duyệt thứ hai. Nếu hôm đó Docker không lên hoặc phòng máy chặn cổng
8080 thì phát video, vẫn kịp khung 5 phút.
