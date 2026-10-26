# Kế hoạch Đồ án Bảo mật – SecureGrade

Oct 26, 2026 · @HieuDepTrai

## 1. Đề tài được chọn

**Chọn Hướng 1 – Security. Đề tài: "SecureGrade – Hệ thống quản lý điểm sinh viên chống chiếm quyền tài khoản và giả mạo dữ liệu đầu vào".** Prototype là một web app nhỏ chạy bằng Docker Compose (1 lệnh), không cần phần cứng, AI hay cloud trả phí.

Giả định khi lập kế hoạch: nhóm 3–4 người, khoảng 3 tuần. Không đủ dữ liệu về deadline và số thành viên thực tế → điều chỉnh mục 14 nếu khác.

### 1.1 Vì sao đây là phương án dễ và nhanh nhất

- Tài sản rõ ràng, ai cũng hiểu: bảng điểm (tính toàn vẹn) và tài khoản giảng viên/admin (đặc quyền).
- Động cơ tấn công tự nhiên: sinh viên muốn sửa điểm, kẻ phishing chiếm tài khoản giảng viên.
- Mọi tấn công đều demo được bằng công cụ miễn phí (Postman, curl, script Node), không cần Kali.
- Cơ chế bảo vệ đều có thư viện sẵn, mỗi cơ chế chỉ 20–80 dòng code.
- Phân vùng mạng làm thật bằng Docker network, chứng minh được DB không ra Internet.

### 1.2 So sánh nhanh các phương án

| Phương án | Độ khó | Thời gian ước tính | Rủi ro chính | Kết luận |
| --- | --- | --- | --- | --- |
| A. Web quản lý điểm + MFA/JWT/RBAC/WAF trên Docker (Hướng 1) | Thấp – Trung bình | 2–3 tuần | Thấp, toàn bộ là kỹ thuật quen thuộc | **Đề xuất** |
| B. Chia sẻ hồ sơ cá nhân có consent, mã hóa trường (Hướng 2) | Trung bình | 3–4 tuần | Phần phân tích pháp lý/consent dài, khó demo "tấn công" | Chỉ chọn nếu giảng viên ưu tiên Privacy |
| C. Phát hiện ảnh/video/giọng nói giả mạo bằng AI | Cao | > 4 tuần | Model sai, khó giải thích cơ chế kiểm chứng | Không chọn |
| D. IoT ESP32 + MQTT TLS + xác thực thiết bị | Cao | > 4 tuần | Phụ thuộc phần cứng, debug mất thời gian | Không chọn |

### 1.3 Mapping yêu cầu đề bài → thành phần đồ án

| Yêu cầu của đề | Đáp ứng trong SecureGrade | Bước |
| --- | --- | --- |
| Bài toán cụ thể, đối tượng rõ ràng | Quản lý điểm học phần; 3 vai trò: Sinh viên, Giảng viên, Admin | 1, 10 |
| Tài sản và rủi ro chính | Bảng điểm, tài khoản đặc quyền, secret (JWT key, TOTP seed), audit log | 10 |
| Kiến trúc và luồng dữ liệu | 3 vùng mạng Docker: Edge (WAF) → App → Data, bảng Allowed Flows | 2, 1 |
| Cơ chế bảo mật phù hợp rủi ro | bcrypt, MFA TOTP, JWT ngắn hạn + thu hồi, RBAC + ownership, step-up MFA, WAF OWASP CRS, rate limit, DB least privilege, audit hash-chain | 2–6 |
| ≥ 1 tình huống đầu vào bị giả mạo/đánh cắp/sai ngữ cảnh | 6 kịch bản: phishing lấy mật khẩu GV, JWT giả role, IDOR, token bị đánh cắp, SQLi, sửa điểm trực tiếp trong DB | 8 |
| Prototype/mô phỏng | `docker compose up` dựng toàn bộ hệ thống | 1–7 |
| Test case bình thường + rủi ro | \~18 test case, có script tự động và bảng kết quả | 8 |
| Trade-off ngắn hạn/dài hạn | MFA/step-up vs tiện lợi; token ngắn vs UX; WAF paranoia vs false positive; tự log vs SIEM | 10 |

Trục phân tích xuyên suốt báo cáo: **ASSET → RISK → CONTROL → DETECT → RECOVER**. Mỗi cơ chế code ra phải trỏ ngược về được một rủi ro cụ thể trong ma trận rủi ro.

## 2. Kiến trúc mục tiêu và phạm vi

**Hệ thống gồm 3 container nằm trên 3 Docker network tách biệt; chỉ WAF được publish port, App và DB không có đường ra/vào Internet.** Đây là bản thu nhỏ của mô hình Internet → DMZ/WAF → App → Database.

&#91;embedded content: kiến trúc phân vùng · 3 zone, 4 luồng được phép, 2 luồng bị chặn\]

Mũi tên xám là luồng được phép F1–F4, đường đỏ đứt là luồng bị chặn D1, D2; kẻ tấn công cũng chỉ vào được qua WAF, sau đó vẫn phải qua mọi lớp kiểm chứng của app.

### 2.1 Phân vùng mạng

| Zone | Docker network | Container | Publish port | Egress Internet |
| --- | --- | --- | --- | --- |
| Edge / DMZ | `net_public` + `net_app` | `waf` (ModSecurity v3 + OWASP CRS v4, nginx) | 8080 → host | Có (chỉ WAF) |
| App | `net_app` (internal) + `net_data` (internal) | `app` (Node.js/Express: API + giao diện tĩnh) | Không | Không |
| Data | `net_data` (internal) | `db` (PostgreSQL 16) | Không | Không |

`internal: true` trong Docker Compose chặn mọi kết nối ra ngoài của network đó. Container chỉ nằm trên network internal thì cũng không publish port ra host được, vì vậy WAF cần thêm `net_public`.

### 2.2 Allowed Flows (mặc định từ chối tất cả, chỉ mở các luồng sau)

| ID | Nguồn | Đích | Giao thức/Port | Mục đích | Kiểm soát áp dụng |
| --- | --- | --- | --- | --- | --- |
| F1 | Client (Internet) | `waf:8080` | HTTP (lab), HTTPS (production) | Truy cập web/API | OWASP CRS, rate limit ở app |
| F2 | `waf` | `app:3000` | HTTP nội bộ | Chuyển tiếp request đã lọc | Chỉ qua `net_app` internal |
| F3 | `app` | `db:5432` | PostgreSQL | Truy vấn nghiệp vụ | User `app_user` least privilege |
| F4 | Người vận hành trên máy host | `db` qua `docker compose exec` | Socket nội bộ container | Backup, restore, điều tra | Chỉ người có quyền trên host |

| ID | Luồng bị chặn | Cơ chế chặn | Cách chứng minh (Bước 1) |
| --- | --- | --- | --- |
| D1 | Internet → `app:3000` | `app` không có `ports` | `curl localhost:3000` → refused |
| D2 | Internet → `db:5432` | `db` không có `ports` | Kết nối 5432 từ host → refused |
| D3 | `waf` → `db` | `waf` không thuộc `net_data` | Không phân giải được tên `db` từ `waf` |
| D4 | `app` → Internet (exfiltration, reverse shell) | `net_app`, `net_data` là internal | `fetch('https://example.com')` trong `app` → lỗi |
| D5 | `db` → bất kỳ đâu ngoài `app` | Chỉ thuộc `net_data` | – |

### 2.3 Tech stack

| Thành phần | Công nghệ | Lý do chọn |
| --- | --- | --- |
| WAF / reverse proxy | Docker image `owasp/modsecurity-crs:nginx` | WAF thật, cấu hình bằng biến môi trường, không phải viết rule |
| Backend + UI | Node.js LTS, Express, ESM (`"type": "module"`) | Ít boilerplate hơn Spring Boot, mỗi cơ chế bảo mật là 1 middleware |
| Xác thực | `bcryptjs`, `jsonwebtoken`, `otplib` (v13), `qrcode`, `cookie-parser` | Thư viện phổ biến; `bcryptjs` thuần JS nên không lỗi build trên Windows |
| Hardening | `helmet`, `express-rate-limit` | Security headers, CSP, chống brute force |
| Database | `postgres:16-alpine`, driver `pg` | Quen thuộc, hỗ trợ phân quyền chi tiết theo bảng |
| Giao diện | HTML + vanilla JS tĩnh do Express phục vụ | Không cần build React; trọng tâm đồ án là bảo mật |
| Kiểm thử | Postman + script Node (`fetch` có sẵn) | Chạy lại được, xuất bảng PASS/FAIL |
| Sơ đồ | draw.io, PlantUML | Kiến trúc bằng draw.io; sequence, ERD, use case bằng PlantUML |

Nếu cả nhóm chỉ quen Java: thay `app` bằng Spring Boot + Spring Security, giữ nguyên WAF/DB/kiến trúc. Thời gian code tăng khoảng 30–50% (ước tính).

### 2.4 Phạm vi prototype

| Trong phạm vi | Ngoài phạm vi (chỉ phân tích trong báo cáo) |
| --- | --- |
| Đăng nhập, MFA TOTP bắt buộc, khóa tài khoản | HTTPS với chứng chỉ thật, HSTS |
| JWT ngắn hạn + session server-side + thu hồi | SSO/OAuth2, WebAuthn/passkey |
| RBAC 3 vai trò + kiểm tra ownership | SIEM thật (Wazuh, ELK) |
| Nhập/sửa điểm có step-up OTP, xem điểm | High availability, load balancing |
| Audit log hash-chain, cảnh báo theo rule, kiểm tra toàn vẹn | Gửi cảnh báo qua email/SMS/chat |
| WAF, rate limit, security headers, DB least privilege | Quản lý secret bằng Vault/HSM |
| Backup/restore, thu hồi phiên, reset MFA | Giao diện đẹp, mobile app |

## 3. Bước 0 – Cài đặt phần mềm (1–2 giờ)

**Mỗi thành viên cài 6 phần mềm bắt buộc và chạy được `docker run hello-world`; máy cần tối thiểu 8 GB RAM và 10 GB ổ trống.** Máy yếu hơn: dùng chung 1 máy mạnh để chạy Docker, các máy khác chỉ code và push Git.

### 3.1 Danh sách phần mềm

| # | Phần mềm | Bắt buộc | Dùng để | Tải tại | Lệnh kiểm tra |
| --- | --- | --- | --- | --- | --- |
| 1 | Git | Có | Quản lý mã nguồn nhóm | git-scm.com | `git --version` |
| 2 | Node.js bản LTS (≥ 22) kèm npm | Có | Chạy script test, sinh secret | nodejs.org | `node -v` và `npm -v` |
| 3 | Docker Desktop (Windows dùng WSL2 backend) | Có | Chạy WAF, App, DB | docker.com/products/docker-desktop | `docker --version` và `docker compose version` |
| 4 | VS Code | Có | Viết code | code.visualstudio.com | Mở được thư mục project |
| 5 | Postman (hoặc extension Thunder Client) | Có | Gọi API, demo tấn công | postman.com/downloads | Gửi được 1 request GET |
| 6 | App authenticator trên điện thoại (Google Authenticator hoặc Microsoft Authenticator) | Có | Quét QR, sinh mã TOTP | App Store / CH Play | Quét thử 1 mã QR |
| 7 | draw.io Desktop | Có (người vẽ sơ đồ) | Sơ đồ kiến trúc, DFD | drawio.com | Mở được file `.drawio` |
| 8 | VS Code extension: Docker, PlantUML | Khuyến nghị | Xem container, vẽ sequence/ERD | VS Code Marketplace | Preview được file `.puml` |
| 9 | OBS Studio | Khuyến nghị | Quay video demo dự phòng | obsproject.com | Quay thử 10 giây |
| 10 | Burp Suite Community | Tuỳ chọn | Chặn/sửa request trực tiếp khi demo | portswigger.net | Mở được Proxy tab |

Không cài PostgreSQL lên máy thật. DB chạy trong container và truy cập bằng `docker compose exec db psql`, đúng với thiết kế không mở cổng DB.

### 3.2 Thứ tự cài trên Windows

1. Mở PowerShell bằng quyền Administrator, chạy `wsl --install`, khởi động lại máy.
2. Cài Docker Desktop, khi được hỏi thì chọn "Use WSL 2 instead of Hyper-V". Mở Docker Desktop, đợi biểu tượng chuyển sang trạng thái chạy.
3. Cài Git. Tại bước "Configuring the line ending conversions" chọn "Checkout as-is, commit Unix-style" để file `.sh` không bị CRLF.
4. Cài Node.js LTS (bộ cài `.msi`), giữ mặc định.
5. Cài VS Code, Postman, draw.io.
6. Mở terminal mới và chạy khối lệnh kiểm tra ở mục 3.3.

macOS: cài Docker Desktop bản Apple Silicon hoặc Intel đúng chip, các phần còn lại tải bộ cài thường hoặc dùng Homebrew.

### 3.3 Kiểm tra môi trường

```bash
git --version
node -v
npm -v
docker --version
docker compose version
docker run --rm hello-world
# Sinh thử 1 secret ngẫu nhiên (dùng cho JWT_SECRET ở Bước 1)
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 3.4 Thiết lập làm việc nhóm

1. Trưởng nhóm tạo repo **private** trên GitHub tên `securegrade`, mời các thành viên.
2. Mỗi thành viên: `git config --global user.name "..."` và `git config --global user.email "..."`.
3. Quy ước branch: `main` luôn chạy được; mỗi bước làm trên branch `step-N-<tên>`, merge qua Pull Request.
4. Bật 2FA cho tài khoản GitHub của cả nhóm (chính là một control đáng nhắc trong báo cáo).

### 3.5 Đầu ra và tiêu chí hoàn thành

- [ ] Mọi thành viên chạy được `docker run --rm hello-world`.
- [ ] Mọi thành viên clone được repo và push được 1 commit thử.
- [ ] Điện thoại của người demo đã cài app authenticator và bật tự động đồng bộ giờ (TOTP sai nếu lệch giờ).

## 4. Bước 1 – Khởi tạo project và hạ tầng phân vùng (0,5 ngày)

**Kết thúc bước này, `docker compose up` dựng đủ 3 container và chứng minh được 5 luồng bị chặn D1–D5.** App mới chỉ có endpoint `/health`.

### 4.1 Cấu trúc thư mục

```text
securegrade/
├─ docker-compose.yml
├─ .env.example          # mẫu biến môi trường, KHÔNG chứa secret thật
├─ .gitignore
├─ .gitattributes
├─ db/init/              # chạy tự động khi volume DB trống
│  ├─ 01_schema.sql
│  ├─ 02_roles.sh
│  └─ 03_seed.sql
├─ app/
│  ├─ Dockerfile
│  ├─ package.json
│  ├─ src/
│  │  ├─ server.js
│  │  ├─ config.js
│  │  ├─ db.js
│  │  ├─ middleware/        # auth.js, rbac.js, stepUp.js, limits.js
│  │  ├─ routes/            # auth.js, grades.js, admin.js
│  │  └─ services/          # audit.js, detect.js, integrity.js, otp.js
│  └─ public/                # login.html, mfa.html, student.html, lecturer.html, admin.html, js/, css/
├─ tests/                    # run-tests.mjs, attacks/*.mjs
├─ scripts/                  # backup.sh, restore.sh
└─ docs/                     # sơ đồ .drawio/.puml, báo cáo, slide
```

### 4.2 Các file cấu hình

`.gitignore`

```text
.env
node_modules/
backups/
```

`.gitattributes` (tránh lỗi script `.sh` bị CRLF trên Windows, lỗi rất hay gặp)

```text
*.sh text eol=lf
```

`.env.example` (copy thành `.env` rồi thay giá trị; sinh secret bằng lệnh ở mục 3.3)

```text
POSTGRES_PASSWORD=doi_mat_khau_superuser
APP_DB_PASSWORD=doi_mat_khau_app_user
JWT_SECRET=dan_chuoi_hex_96_ky_tu_vao_day
```

`docker-compose.yml`

```yaml
services:
  waf:
    image: owasp/modsecurity-crs:nginx
    environment:
      BACKEND: http://app:3000
      PORT: "8080"
      MODSEC_RULE_ENGINE: "On"          # On = chặn; DetectionOnly = chỉ ghi log
      BLOCKING_PARANOIA: "1"
      ALLOWED_METHODS: "GET HEAD POST OPTIONS PUT"  # CRS mặc định không cho PUT
      MODSEC_AUDIT_LOG: /dev/stdout
    ports:
      - "8080:8080"                     # CỔNG DUY NHẤT mở ra host
    networks: [net_public, net_app]
    depends_on: [app]

  app:
    build: ./app
    environment:                        # truyền từng biến, KHÔNG dùng env_file
      NODE_ENV: production
      PORT: "3000"
      DATABASE_URL: postgres://app_user:${APP_DB_PASSWORD}@db:5432/securegrade
      JWT_SECRET: ${JWT_SECRET}
      TOTP_ISSUER: SecureGrade
    networks: [net_app, net_data]       # không có "ports" => Internet không gọi trực tiếp được
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: securegrade
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      APP_DB_PASSWORD: ${APP_DB_PASSWORD}   # chỉ dùng cho script 02_roles.sh
    volumes:
      - db_data:/var/lib/postgresql/data
      - ./db/init:/docker-entrypoint-initdb.d:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -h 127.0.0.1 -U postgres -d securegrade"]
      interval: 5s
      timeout: 3s
      retries: 10
    networks: [net_data]

networks:
  net_public: {}
  net_app:
    internal: true
  net_data:
    internal: true

volumes:
  db_data:
```

Lý do không dùng `env_file: .env` cho `app`: nếu dùng, `POSTGRES_PASSWORD` của superuser cũng lọt vào app, vi phạm least privilege.

`app/Dockerfile`

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src
COPY public ./public
USER node
EXPOSE 3000
CMD ["node", "src/server.js"]
```

`USER node` chạy app bằng user thường thay vì root, giảm thiệt hại nếu app bị RCE.

### 4.3 Khởi tạo app tối thiểu

```bash
cd app
npm init -y
npm pkg set type=module
npm install express pg bcryptjs jsonwebtoken otplib qrcode cookie-parser helmet express-rate-limit
mkdir -p src public
```

Lệnh `npm install` tạo `package-lock.json`; file này bắt buộc để `npm ci` trong Dockerfile chạy được.

`app/src/server.js` (bản khởi đầu)

```js
import express from 'express';

const app = express();
app.disable('x-powered-by');
app.get('/health', (req, res) => res.json({ status: 'ok' }));

const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`app listening on ${port}`));
```

Tạo 3 file rỗng `db/init/01_schema.sql`, `02_roles.sh`, `03_seed.sql` (điền ở Bước 2).

### 4.4 Chạy và kiểm tra phân vùng

```bash
cp .env.example .env        # rồi sửa 3 giá trị trong .env
docker compose up -d --build
docker compose ps           # chỉ waf có cột PORTS = 0.0.0.0:8080->8080

# F1: đi qua WAF -> 200
curl -i http://localhost:8080/health

# D1: gọi thẳng app -> phải báo connection refused
curl -i http://localhost:3000/health

# D2: cổng DB từ host -> phải thất bại
#   PowerShell: Test-NetConnection localhost -Port 5432   (TcpTestSucceeded : False)
#   macOS/Linux: nc -zv localhost 5432

# D3: WAF không nhìn thấy DB
docker compose exec waf getent hosts db || echo "D3 OK: waf khong thay db"

# D4: app không ra được Internet
docker compose exec app node -e "fetch('https://example.com').then(()=>console.log('D4 FAIL: egress mo')).catch(()=>console.log('D4 OK: egress bi chan'))"

# WAF hoạt động: payload SQLi -> 403
curl -i -G http://localhost:8080/health --data-urlencode "id=1' OR '1'='1"
```

Chụp màn hình kết quả từng lệnh, lưu vào `docs/evidence/step1/` để dùng cho báo cáo và bảng Allowed Flows.

### 4.5 Lỗi thường gặp

| Triệu chứng | Nguyên nhân khả năng cao | Cách xử lý |
| --- | --- | --- |
| `localhost:8080` trả 502 | App chưa chạy hoặc sai `BACKEND` | `docker compose logs app`, kiểm tra tên service là `app` |
| Log WAF báo không resolve được `app` | nginx cần resolver | Thêm `RESOLVERS: 127.0.0.11` (DNS nội bộ Docker) vào `waf` – chưa kiểm chứng trên image này, chỉ làm khi gặp lỗi |
| Request `PUT` bị 403 | `ALLOWED_METHODS` thiếu `PUT` | Sửa biến môi trường như trên |
| Cổng 8080 bị chiếm | Phần mềm khác đang dùng | Đổi thành `"8081:8080"` |
| `npm ci` lỗi khi build | Thiếu `package-lock.json` | Chạy `npm install` trong `app/` rồi build lại |

### 4.6 Tiêu chí hoàn thành

- [ ] 6 lệnh kiểm tra ở 4.4 cho đúng kết quả kỳ vọng, có ảnh chụp.
- [ ] `.env` không nằm trong Git (`git status` không thấy).
- [ ] Commit: `step-1: infra + segmentation`.

## 5. Bước 2 – Database và phân quyền least privilege (0,5 ngày)

**App kết nối bằng `app_user`, user này không được DELETE, không được sửa `audit_log` và không có quyền DDL.** Vì vậy kể cả khi app bị SQL injection, kẻ tấn công cũng không xóa được dấu vết.

### 5.1 Ma trận quyền của `app_user`

| Bảng | SELECT | INSERT | UPDATE | DELETE | Lý do |
| --- | --- | --- | --- | --- | --- |
| `users` | Có | Có | Có | Không | Cập nhật MFA, số lần sai, khóa tài khoản |
| `sessions` | Có | Có | Có | Không | Thu hồi bằng `revoked_at`, không xóa |
| `courses`, `enrollments` | Có | Không | Không | Không | Dữ liệu danh mục do phòng đào tạo quản lý |
| `grades` | Có | Có | Có | Không | Không cho xóa điểm qua app |
| `audit_log` | Có | Có | Không | Không | Append-only: không sửa, không xóa log |

### 5.2 `db/init/01_schema.sql`

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id              SERIAL PRIMARY KEY,
  username        VARCHAR(50)  UNIQUE NOT NULL,
  full_name       VARCHAR(100) NOT NULL,
  role            VARCHAR(10)  NOT NULL CHECK (role IN ('STUDENT','LECTURER','ADMIN')),
  password_hash   TEXT         NOT NULL,
  mfa_secret      TEXT,
  mfa_enabled     BOOLEAN      NOT NULL DEFAULT FALSE,
  last_otp        VARCHAR(10),            -- chống dùng lại OTP
  last_otp_at     TIMESTAMPTZ,
  failed_attempts INT          NOT NULL DEFAULT 0,
  mfa_failed      INT          NOT NULL DEFAULT 0,
  locked_until    TIMESTAMPTZ,
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE courses (
  id          SERIAL PRIMARY KEY,
  code        VARCHAR(20)  UNIQUE NOT NULL,
  name        VARCHAR(100) NOT NULL,
  lecturer_id INT NOT NULL REFERENCES users(id)
);

CREATE TABLE enrollments (
  id         SERIAL PRIMARY KEY,
  course_id  INT NOT NULL REFERENCES courses(id),
  student_id INT NOT NULL REFERENCES users(id),
  UNIQUE (course_id, student_id)
);

CREATE TABLE grades (
  enrollment_id INT PRIMARY KEY REFERENCES enrollments(id),
  score         NUMERIC(4,2) NOT NULL CHECK (score >= 0 AND score <= 10),
  updated_by    INT NOT NULL REFERENCES users(id),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       INT  NOT NULL REFERENCES users(id),
  fingerprint   CHAR(64) NOT NULL,          -- SHA-256(User-Agent + IP)
  mfa_verified  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ NOT NULL,
  revoked_at    TIMESTAMPTZ,
  revoke_reason TEXT
);

CREATE TABLE audit_log (
  id        BIGSERIAL PRIMARY KEY,
  ts        TIMESTAMPTZ NOT NULL,           -- app tự điền để đưa vào hash
  actor_id  INT,
  action    VARCHAR(40) NOT NULL,
  target    VARCHAR(100),
  detail    TEXT,                            -- chuỗi JSON gốc, KHÔNG dùng JSONB
  ip        VARCHAR(64),
  severity  VARCHAR(10) NOT NULL DEFAULT 'INFO',
  prev_hash CHAR(64) NOT NULL,
  hash      CHAR(64) NOT NULL
);
CREATE INDEX idx_audit_action_ts ON audit_log(action, ts);
CREATE INDEX idx_audit_target ON audit_log(target);
```

`detail` dùng `TEXT` thay vì `JSONB` vì JSONB tự sắp xếp lại key; chuỗi đọc ra khác chuỗi đã hash làm hỏng kiểm tra hash-chain ở Bước 5.

### 5.3 `db/init/02_roles.sh`

```bash
#!/bin/sh
set -e
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  CREATE ROLE app_user LOGIN PASSWORD '${APP_DB_PASSWORD}';
  REVOKE ALL ON DATABASE securegrade FROM PUBLIC;
  GRANT CONNECT ON DATABASE securegrade TO app_user;
  REVOKE ALL ON SCHEMA public FROM PUBLIC;
  GRANT USAGE ON SCHEMA public TO app_user;
  GRANT SELECT, INSERT, UPDATE ON users, sessions, grades TO app_user;
  GRANT SELECT ON courses, enrollments TO app_user;
  GRANT SELECT, INSERT ON audit_log TO app_user;
  GRANT USAGE ON SEQUENCE audit_log_id_seq TO app_user;
EOSQL
```

`APP_DB_PASSWORD` chỉ dùng chữ và số; dấu `'` trong mật khẩu làm hỏng câu lệnh SQL.

### 5.4 `db/init/03_seed.sql`

```sql
-- crypt(..., gen_salt('bf', 12)) của pgcrypto sinh hash bcrypt, bcryptjs đọc được
INSERT INTO users (username, full_name, role, password_hash) VALUES
 ('admin', 'Quản trị viên',  'ADMIN',    crypt('Admin@2026demo', gen_salt('bf', 12))),
 ('gv01',  'Giảng viên 01',  'LECTURER', crypt('Gv01@2026demo',  gen_salt('bf', 12))),
 ('gv02',  'Giảng viên 02',  'LECTURER', crypt('Gv02@2026demo',  gen_salt('bf', 12))),
 ('sv01',  'Sinh viên 01',   'STUDENT',  crypt('Sv01@2026demo',  gen_salt('bf', 12))),
 ('sv02',  'Sinh viên 02',   'STUDENT',  crypt('Sv02@2026demo',  gen_salt('bf', 12))),
 ('sv03',  'Sinh viên 03',   'STUDENT',  crypt('Sv03@2026demo',  gen_salt('bf', 12)));

INSERT INTO courses (code, name, lecturer_id) VALUES
 ('SEC401', 'Bảo mật mạng máy tính', (SELECT id FROM users WHERE username = 'gv01')),
 ('NET301', 'Mạng máy tính',         (SELECT id FROM users WHERE username = 'gv02'));

INSERT INTO enrollments (course_id, student_id)
SELECT c.id, u.id FROM courses c CROSS JOIN users u
WHERE u.role = 'STUDENT';
-- Không seed điểm: mọi điểm phải đi qua app để có audit, nếu không sẽ bị báo vi phạm toàn vẹn.
```

Mật khẩu trên chỉ dùng cho demo, ghi rõ trong báo cáo.

### 5.5 `app/src/db.js`

```js
import pg from 'pg';

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
});
```

Mọi truy vấn dùng tham số `$1, $2...` (parameterized query), không bao giờ nối chuỗi SQL.

### 5.6 Chạy và kiểm tra

Script trong `db/init` chỉ chạy khi volume DB trống, nên mỗi lần sửa phải xóa volume.

```bash
docker compose down -v
docker compose up -d --build
docker compose exec db psql -U postgres -d securegrade -c "\dt"
docker compose exec db psql -U postgres -d securegrade -c "SELECT username, role, left(password_hash, 7) FROM users"

# Chứng minh least privilege (kỳ vọng: permission denied / must be owner)
docker compose exec db psql -U app_user -d securegrade -c "DELETE FROM audit_log"
docker compose exec db psql -U app_user -d securegrade -c "UPDATE audit_log SET action = 'x'"
docker compose exec db psql -U app_user -d securegrade -c "DELETE FROM grades"
docker compose exec db psql -U app_user -d securegrade -c "DROP TABLE grades"
# Kỳ vọng: chạy được
docker compose exec db psql -U app_user -d securegrade -c "SELECT count(*) FROM users"
```

Nếu `psql -U app_user` hỏi mật khẩu, thêm `-h 127.0.0.1` và nhập `APP_DB_PASSWORD`.

### 5.7 ERD (PlantUML, lưu `docs/erd.puml`)

```text
@startuml
hide circle
entity users { *id : serial
  username, full_name, role
  password_hash, mfa_secret, mfa_enabled
  last_otp, failed_attempts, locked_until }
entity courses { *id : serial
  code, name
  lecturer_id : FK }
entity enrollments { *id : serial
  course_id : FK
  student_id : FK }
entity grades { *enrollment_id : PK, FK
  score, updated_by : FK, updated_at }
entity sessions { *id : uuid
  user_id : FK, fingerprint, mfa_verified
  expires_at, revoked_at }
entity audit_log { *id : bigserial
  ts, actor_id, action, target, detail
  severity, prev_hash, hash }
users ||--o{ courses : "dạy"
users ||--o{ enrollments : "học"
courses ||--o{ enrollments
enrollments ||--o| grades
users ||--o{ sessions
users ||--o{ audit_log : "actor"
@enduml
```

### 5.8 Tiêu chí hoàn thành

- [ ] 6 bảng tồn tại, 6 user seed có hash bắt đầu `$2a$`.
- [ ] 4 lệnh vi phạm quyền bị từ chối, có ảnh chụp (dùng cho TC23).
- [ ] Commit: `step-2: schema + least privilege`.

## 6. Bước 3 – Xác thực: mật khẩu + MFA TOTP + JWT gắn session (2 ngày)

**Mật khẩu đúng chỉ cho một token "pre-MFA" sống 5 phút; chỉ sau khi OTP đúng mới có token đầy đủ sống 15 phút, và mọi token đều phải khớp một session còn hiệu lực trong DB.** Đây là cơ chế chính chặn kịch bản phishing/ClickFix lấy được mật khẩu giảng viên.

### 6.1 Luồng đăng nhập

1. `POST /api/auth/login` với `username`, `password`. Rate limit 10 lần/15 phút/IP. Sai 5 lần liên tiếp → khóa 15 phút.
2. Đúng mật khẩu → tạo session `mfa_verified = false` (5 phút), set cookie `sg_token`. Trả `next = MFA_ENROLL` (lần đầu) hoặc `MFA_VERIFY`.
3. Lần đầu: `POST /api/auth/mfa/setup` trả ảnh QR → quét bằng app authenticator → `POST /api/auth/mfa/enable` với OTP.
4. Các lần sau: `POST /api/auth/mfa/verify` với OTP. Sai 3 lần → khóa + cảnh báo "mật khẩu đúng nhưng OTP sai: nghi lộ mật khẩu".
5. OTP đúng → thu hồi session pre-MFA, tạo session mới `mfa_verified = true` (15 phút). Đổi session ID chống session fixation.
6. Mọi request sau đó đi qua middleware `requireAuth` (mục 6.5).

### 6.2 Bảng API xác thực

| Method | Path | Yêu cầu | Kết quả thành công | Lỗi chính |
| --- | --- | --- | --- | --- |
| POST | `/api/auth/login` | Không | 200, cookie pre-MFA, `next` | 400, 401 `INVALID_CREDENTIALS`, 423 `ACCOUNT_LOCKED`, 429 |
| POST | `/api/auth/mfa/setup` | Pre-MFA, chưa bật MFA | 200, `qr` (data URL) | 409 nếu đã bật |
| POST | `/api/auth/mfa/enable` | Pre-MFA | 200, cookie đầy đủ | 401 `OTP_INVALID` |
| POST | `/api/auth/mfa/verify` | Pre-MFA, đã bật MFA | 200, cookie đầy đủ | 401 `OTP_INVALID`/`OTP_REPLAY`, 423 |
| POST | `/api/auth/logout` | Đã đăng nhập | 200, session bị thu hồi | – |
| GET | `/api/me` | Đã đăng nhập | `id`, `username`, `role` | 401 |

### 6.3 `app/src/config.js`

```js
export const config = {
  jwtSecret: process.env.JWT_SECRET,
  issuer: 'securegrade',
  audience: 'securegrade-web',
  totpIssuer: process.env.TOTP_ISSUER || 'SecureGrade',
  preMfaTtlSec: 300,
  sessionTtlSec: 900,
  maxLoginFail: 5,
  maxMfaFail: 3,
  lockMinutes: 15,
};
if (!config.jwtSecret || config.jwtSecret.length < 64) {
  throw new Error('JWT_SECRET missing or too short'); // fail-safe: không chạy với secret yếu
}
```

### 6.4 `app/src/services/otp.js` (otplib v13: API bất đồng bộ, `verify` trả object có `valid`)

```js
import { generateSecret, generateURI, verify } from 'otplib';
import QRCode from 'qrcode';
import crypto from 'node:crypto';
import { pool } from '../db.js';

export const newSecret = () => generateSecret();

export async function qrFor(username, secret, issuer) {
  const uri = generateURI({ issuer, label: username, secret });
  return QRCode.toDataURL(uri);
}

// Trả về 'OK' | 'INVALID' | 'REPLAY'
export async function checkOtp(user, token) {
  token = String(token ?? '');
  if (!/^\d{6}$/.test(token)) return 'INVALID';
  const recent = user.last_otp_at && Date.now() - new Date(user.last_otp_at).getTime() < 90_000;
  if (user.last_otp === token && recent) return 'REPLAY';
  const { valid } = await verify({ secret: user.mfa_secret, token });
  if (!valid) return 'INVALID';
  await pool.query('UPDATE users SET last_otp = $1, last_otp_at = now() WHERE id = $2', [token, user.id]);
  return 'OK';
}

// Gắn phiên với ngữ cảnh thiết bị: dùng token ở thiết bị khác => bị thu hồi
export const fingerprint = (req) =>
  crypto.createHash('sha256').update(`${req.get('user-agent') || ''}|${req.ip}`).digest('hex');
```

Chưa xác minh tên tham số độ lệch thời gian (tolerance) của `verify` trong otplib v13; dùng mặc định, nếu OTP hay bị từ chối do lệch giờ thì tra API Reference của otplib.

### 6.5 `app/src/middleware/auth.js` – "không tin token chỉ vì nó trông hợp lệ"

```js
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { pool } from '../db.js';
import { fingerprint } from '../services/otp.js';
import { logEvent } from '../services/audit.js';

const deny = (res, code, error) => res.status(code).json({ error });
const UUID = /^[0-9a-f-]{36}$/i;

export function requireAuth({ allowPreMfa = false } = {}) {
  return async (req, res, next) => {
    const token = req.cookies?.sg_token;
    if (!token) return deny(res, 401, 'NO_TOKEN');

    let claims;                                   // Lớp 1: chữ ký + thuật toán + iss/aud/exp
    try {
      claims = jwt.verify(token, config.jwtSecret, {
        algorithms: ['HS256'], issuer: config.issuer, audience: config.audience,
      });
    } catch (e) {
      await logEvent({ action: 'JWT_INVALID', detail: { reason: e.message }, ip: req.ip, severity: 'HIGH' });
      return deny(res, 401, 'INVALID_TOKEN');
    }
    if (!UUID.test(claims.sid ?? '')) return deny(res, 401, 'INVALID_TOKEN');

    const { rows } = await pool.query(           // Lớp 2: session phải tồn tại trong DB
      `SELECT s.*, u.username, u.role, u.is_active, u.mfa_secret, u.last_otp, u.last_otp_at
         FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = $1`, [claims.sid]);
    const s = rows[0];
    if (!s || String(s.user_id) !== claims.sub) {
      await logEvent({ action: 'SESSION_UNKNOWN', detail: { sid: claims.sid }, ip: req.ip, severity: 'CRITICAL' });
      return deny(res, 401, 'INVALID_SESSION');  // chữ ký đúng mà sid lạ => nghi lộ JWT_SECRET
    }
    if (s.revoked_at) return deny(res, 401, 'SESSION_REVOKED');
    if (new Date(s.expires_at) < new Date()) return deny(res, 401, 'SESSION_EXPIRED');
    if (!s.is_active) return deny(res, 403, 'ACCOUNT_DISABLED');

    if (s.fingerprint !== fingerprint(req)) {    // Lớp 3: đúng ngữ cảnh thiết bị
      await pool.query(`UPDATE sessions SET revoked_at = now(), revoke_reason = 'CONTEXT_MISMATCH' WHERE id = $1`, [s.id]);
      await logEvent({ actorId: s.user_id, action: 'SESSION_CONTEXT_MISMATCH', target: `session:${s.id}`,
                       detail: { ua: req.get('user-agent') }, ip: req.ip, severity: 'CRITICAL' });
      return deny(res, 401, 'SESSION_CONTEXT_MISMATCH');
    }
    if (!s.mfa_verified && !allowPreMfa) return deny(res, 401, 'MFA_REQUIRED');  // Lớp 4

    // Role lấy từ DB, KHÔNG lấy từ claim trong token
    req.user = { id: s.user_id, username: s.username, role: s.role, mfaVerified: s.mfa_verified,
                 sessionId: s.id, mfa_secret: s.mfa_secret, last_otp: s.last_otp, last_otp_at: s.last_otp_at };
    next();
  };
}
```

### 6.6 `app/src/routes/auth.js` – các điểm bắt buộc phải có

```js
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { loginLimiter } from '../middleware/limits.js';
import { newSecret, qrFor, checkOtp, fingerprint } from '../services/otp.js';
import { logEvent } from '../services/audit.js';

export const router = Router();
const DUMMY_HASH = bcrypt.hashSync('timing-equalizer', 12); // chống dò username qua thời gian phản hồi

async function issueSession(req, res, userId, mfaVerified) {
  const ttl = mfaVerified ? config.sessionTtlSec : config.preMfaTtlSec;
  const { rows } = await pool.query(
    `INSERT INTO sessions (user_id, fingerprint, mfa_verified, expires_at)
     VALUES ($1, $2, $3, now() + make_interval(secs => $4)) RETURNING id`,
    [userId, fingerprint(req), mfaVerified, ttl]);
  const token = jwt.sign({ sid: rows[0].id, mfa: mfaVerified }, config.jwtSecret, {
    algorithm: 'HS256', expiresIn: ttl, subject: String(userId),
    issuer: config.issuer, audience: config.audience,
  });
  res.cookie('sg_token', token, { httpOnly: true, sameSite: 'strict', secure: false, // true khi có HTTPS
                                   maxAge: ttl * 1000, path: '/' });
}

const revoke = (sid, reason) =>
  pool.query('UPDATE sessions SET revoked_at = now(), revoke_reason = $2 WHERE id = $1', [sid, reason]);

router.post('/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body ?? {};
  if (typeof username !== 'string' || typeof password !== 'string' || username.length > 50 || password.length > 128)
    return res.status(400).json({ error: 'INVALID_INPUT' });

  const { rows: [user] } = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
  const ok = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);

  if (user?.locked_until && new Date(user.locked_until) > new Date()) {
    await logEvent({ actorId: user.id, action: 'LOGIN_WHILE_LOCKED', ip: req.ip, severity: 'WARN' });
    return res.status(423).json({ error: 'ACCOUNT_LOCKED' });
  }
  if (!user || !ok || !user.is_active) {
    if (user) {
      const { rows: [u] } = await pool.query(
        `UPDATE users SET failed_attempts = failed_attempts + 1,
           locked_until = CASE WHEN failed_attempts + 1 >= $2 THEN now() + make_interval(mins => $3) END
         WHERE id = $1 RETURNING failed_attempts`, [user.id, config.maxLoginFail, config.lockMinutes]);
      const locked = u.failed_attempts >= config.maxLoginFail;
      await logEvent({ actorId: user.id, action: locked ? 'ACCOUNT_LOCKED' : 'LOGIN_FAIL',
                       ip: req.ip, severity: locked ? 'HIGH' : 'WARN' });
    } else {
      await logEvent({ action: 'LOGIN_FAIL_UNKNOWN_USER', detail: { username }, ip: req.ip, severity: 'WARN' });
    }
    return res.status(401).json({ error: 'INVALID_CREDENTIALS' }); // cùng 1 thông báo cho mọi trường hợp
  }

  await pool.query('UPDATE users SET failed_attempts = 0 WHERE id = $1', [user.id]);
  await issueSession(req, res, user.id, false);
  await logEvent({ actorId: user.id, action: 'LOGIN_PASSWORD_OK', ip: req.ip });
  res.json({ next: user.mfa_enabled ? 'MFA_VERIFY' : 'MFA_ENROLL' });
});

router.post('/mfa/verify', requireAuth({ allowPreMfa: true }), async (req, res) => {
  const result = await checkOtp(req.user, req.body?.otp);
  if (result !== 'OK') {
    const { rows: [u] } = await pool.query(
      `UPDATE users SET mfa_failed = mfa_failed + 1,
         locked_until = CASE WHEN mfa_failed + 1 >= $2 THEN now() + make_interval(mins => $3) END
       WHERE id = $1 RETURNING mfa_failed`, [req.user.id, config.maxMfaFail, config.lockMinutes]);
    const suspect = u.mfa_failed >= config.maxMfaFail;
    await logEvent({ actorId: req.user.id, action: suspect ? 'MFA_FAIL_THRESHOLD' : `MFA_FAIL_${result}`,
                     detail: suspect ? { note: 'Password dung nhung OTP sai lien tuc - nghi lo mat khau' } : null,
                     ip: req.ip, severity: suspect ? 'HIGH' : 'WARN' });
    if (suspect) await revoke(req.user.sessionId, 'MFA_FAIL_THRESHOLD');
    return res.status(suspect ? 423 : 401).json({ error: suspect ? 'ACCOUNT_LOCKED' : `OTP_${result}` });
  }
  await pool.query('UPDATE users SET mfa_failed = 0 WHERE id = $1', [req.user.id]);
  await revoke(req.user.sessionId, 'UPGRADED');        // chống session fixation
  await issueSession(req, res, req.user.id, true);
  await logEvent({ actorId: req.user.id, action: 'LOGIN_SUCCESS', ip: req.ip });
  res.json({ ok: true, role: req.user.role });
});

// /mfa/setup: nếu user đã bật MFA => 409; ngược lại newSecret() -> UPDATE users.mfa_secret -> trả { qr: await qrFor(...) }
// /mfa/enable: checkOtp(user với secret vừa lưu) === 'OK' -> mfa_enabled = true -> log MFA_ENROLLED -> revoke + issueSession(true)
// /logout: revoke(req.user.sessionId, 'LOGOUT') + res.clearCookie('sg_token')
```

`/mfa/setup`, `/mfa/enable`, `/logout` viết theo đúng mẫu của `/mfa/verify` (comment cuối đoạn code). Express 5 tự chuyển lỗi trong handler `async` tới error handler; nếu nhóm cài Express 4 phải bọc `try/catch`.

Trước khi làm Bước 5, tạo `services/audit.js` tạm thời: `export async function logEvent(e) { console.log('[AUDIT]', JSON.stringify(e)); }`.

### 6.7 Tuỳ chọn (nếu còn thời gian): mã hóa `mfa_secret` khi lưu

TOTP seed lưu dạng rõ thì ai đọc được DB sẽ sinh được OTP. Mã hóa AES-256-GCM bằng khóa `MFA_ENC_KEY` (32 byte hex, đặt trong `.env` và truyền riêng cho `app`):

```js
import crypto from 'node:crypto';
const key = Buffer.from(process.env.MFA_ENC_KEY, 'hex');
export function enc(plain) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
  return [iv, c.getAuthTag(), ct].map((b) => b.toString('base64')).join('.');
}
export function dec(blob) {
  const [iv, tag, ct] = blob.split('.').map((s) => Buffer.from(s, 'base64'));
  const d = crypto.createDecipheriv('aes-256-gcm', key, iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(ct), d.final()]).toString('utf8');
}
```

### 6.8 Kiểm tra bằng Postman

1. `POST http://localhost:8080/api/auth/login`, body JSON `{"username":"sv01","password":"Sv01@2026demo"}` → 200, `next = MFA_ENROLL`, có cookie `sg_token`.
2. `POST /api/auth/mfa/setup` → copy chuỗi `qr` dán vào thanh địa chỉ trình duyệt để hiện QR → quét bằng điện thoại.
3. `POST /api/auth/mfa/enable` với `{"otp":"<6 số>"}` → 200.
4. `GET /api/me` → 200, `role = STUDENT`.
5. Dán cookie vào `curl` (User-Agent khác Postman) gọi `/api/me` → 401 `SESSION_CONTEXT_MISMATCH`; gọi lại trong Postman → 401 `SESSION_REVOKED`.

Kiểm tra thêm: log `req.ip` trong 1 request thử. Nếu luôn là IP của container WAF thì WAF không gửi `X-Forwarded-For`; khi đó fingerprint chỉ còn phụ thuộc User-Agent và rate limit tính chung cho mọi client. Ghi đúng kết quả này vào báo cáo (phần hạn chế).

### 6.9 Tiêu chí hoàn thành

- [ ] 5 bước ở 6.8 cho đúng kết quả.
- [ ] Sai mật khẩu 5 lần → 423; sai OTP 3 lần → 423.
- [ ] Commit: `step-3: auth + mfa + session`.

## 7. Bước 4 – Phân quyền RBAC, kiểm tra ownership, API điểm và step-up MFA (1,5 ngày)

**Sửa điểm phải qua 4 cổng: đúng vai trò LECTURER, đúng lớp mình dạy, dữ liệu hợp lệ, và một OTP mới ngay tại thời điểm sửa.** Cổng thứ 4 khiến cookie bị đánh cắp vẫn không đủ để sửa điểm. Admin không có quyền sửa điểm (tách nhiệm vụ – separation of duties).

### 7.1 Bảng API nghiệp vụ

| Method | Path | Vai trò | Kiểm soát bổ sung |
| --- | --- | --- | --- |
| GET | `/api/grades/me` | STUDENT | `student_id` lấy từ session, không nhận từ client |
| GET | `/api/courses/mine` | LECTURER | Chỉ lớp có `lecturer_id` = người gọi |
| GET | `/api/courses/:id/grades` | LECTURER, ADMIN | LECTURER phải là người dạy lớp đó |
| PUT | `/api/grades/:enrollmentId` | LECTURER | Ownership + validate + header `X-OTP` + audit cũ/mới trong cùng transaction |
| GET | `/api/admin/*` | ADMIN | Xem Bước 5 và Bước 9 |

### 7.2 `app/src/middleware/rbac.js`

```js
import { logEvent } from '../services/audit.js';

export const requireRole = (...roles) => async (req, res, next) => {
  if (roles.includes(req.user.role)) return next();
  await logEvent({ actorId: req.user.id, action: 'ACCESS_DENIED_ROLE', target: req.originalUrl,
                   ip: req.ip, severity: 'HIGH' });
  res.status(403).json({ error: 'FORBIDDEN' });
};
```

### 7.3 `app/src/middleware/stepUp.js`

```js
import { checkOtp } from '../services/otp.js';
import { logEvent } from '../services/audit.js';

export async function requireStepUp(req, res, next) {
  const result = await checkOtp(req.user, req.get('x-otp'));
  if (result === 'OK') return next();
  await logEvent({ actorId: req.user.id, action: `STEP_UP_FAIL_${result}`, target: req.originalUrl,
                   ip: req.ip, severity: 'HIGH' });
  res.status(401).json({ error: 'STEP_UP_REQUIRED' });
}
```

### 7.4 `app/src/routes/grades.js` – endpoint sửa điểm

```js
import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { requireStepUp } from '../middleware/stepUp.js';
import { logEvent } from '../services/audit.js';

export const router = Router();
const twoDecimals = (n) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-9;

router.put('/grades/:enrollmentId', requireAuth(), requireRole('LECTURER'), requireStepUp, async (req, res) => {
  const enrollmentId = Number(req.params.enrollmentId);
  const { score, reason } = req.body ?? {};
  const valid = Number.isInteger(enrollmentId) && typeof score === 'number' && Number.isFinite(score)
    && score >= 0 && score <= 10 && twoDecimals(score)
    && typeof reason === 'string' && reason.trim().length >= 5 && reason.length <= 200;
  if (!valid) {
    await logEvent({ actorId: req.user.id, action: 'INPUT_REJECTED', target: `enrollment:${req.params.enrollmentId}`,
                     detail: { score, reasonLength: reason?.length }, ip: req.ip, severity: 'WARN' });
    return res.status(400).json({ error: 'INVALID_INPUT' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(1, $1)', [enrollmentId]); // tuần tự hóa theo enrollment
    const { rows: [row] } = await client.query(
      `SELECT c.lecturer_id, g.score AS old_score
         FROM enrollments e JOIN courses c ON c.id = e.course_id
         LEFT JOIN grades g ON g.enrollment_id = e.id
        WHERE e.id = $1`, [enrollmentId]);

    if (!row || row.lecturer_id !== req.user.id) {        // KIỂM TRA OWNERSHIP (chống IDOR)
      await client.query('ROLLBACK');
      await logEvent({ actorId: req.user.id, action: 'ACCESS_DENIED_IDOR', target: `enrollment:${enrollmentId}`,
                       ip: req.ip, severity: 'HIGH' });     // log NGOÀI transaction đã rollback
      return res.status(row ? 403 : 404).json({ error: row ? 'FORBIDDEN' : 'NOT_FOUND' });
    }

    await client.query(
      `INSERT INTO grades (enrollment_id, score, updated_by) VALUES ($1, $2, $3)
       ON CONFLICT (enrollment_id) DO UPDATE
         SET score = EXCLUDED.score, updated_by = EXCLUDED.updated_by, updated_at = now()`,
      [enrollmentId, score, req.user.id]);
    await logEvent({ client, actorId: req.user.id, action: 'GRADE_UPDATE', target: `enrollment:${enrollmentId}`,
                     detail: { old: row.old_score === null ? null : Number(row.old_score), new: score, reason },
                     ip: req.ip });                         // audit cùng transaction: có điểm thì chắc chắn có log
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
});
```

Các endpoint `GET` viết tương tự, nguyên tắc: mọi điều kiện lọc theo người dùng đều lấy từ `req.user.id`; với `/courses/:id/grades`, so `courses.lecturer_id` với `req.user.id` trước khi trả dữ liệu, sai thì log `ACCESS_DENIED_IDOR` và trả 403. Driver `pg` trả kiểu `NUMERIC` dạng chuỗi (`"8.50"`), nên chuyển bằng `Number()` trước khi so sánh.

`SELECT ... FOR UPDATE` không dùng được ở đây vì `app_user` chỉ có quyền SELECT trên `enrollments`; `pg_advisory_xact_lock` thay thế mà không cần nới quyền.

### 7.5 Pipeline kiểm chứng cho request sửa điểm (thứ tự thực thi)

1. WAF (OWASP CRS): chặn payload SQLi/XSS/path traversal đã biết.
2. Rate limit: chặn dò quét tốc độ cao.
3. JWT: chữ ký HS256, `alg` cố định, `iss`, `aud`, `exp`.
4. Session trong DB: tồn tại, chưa thu hồi, chưa hết hạn, đúng `sub`.
5. Fingerprint: cùng User-Agent + IP lúc đăng nhập.
6. MFA đã xác minh trong phiên.
7. RBAC: role đọc từ DB.
8. Step-up OTP: mã mới, chưa từng dùng.
9. Validation: kiểu dữ liệu, miền giá trị 0–10, độ dài `reason`.
10. Ownership: giảng viên phải dạy lớp chứa `enrollmentId`.
11. Parameterized query + quyền DB tối thiểu.
12. Audit hash-chain trong cùng transaction.

### 7.6 Hệ thống dựa vào đâu để tin một thông tin

Đây là bảng trả lời trực tiếp "Điểm quan trọng của đồ án"; đưa nguyên vào báo cáo và slide.

| Thông tin nhận được | Vì sao không tin mặc định | Kiểm chứng bằng | Từ chối khi |
| --- | --- | --- | --- |
| Mật khẩu | Có thể bị phishing, ClickFix, đoán | bcrypt + OTP từ thiết bị riêng | OTP sai, tài khoản khóa |
| JWT trong cookie | Có thể bị sửa payload, đổi `alg`, ký bằng key đoán | Chữ ký + `iss/aud/exp` + `sid` có trong DB | Bất kỳ bước nào sai |
| Claim `role` | Client tự sửa được nếu tin token | Không dùng; đọc role từ bảng `users` | – |
| Cookie phiên hợp lệ | Có thể bị infostealer đánh cắp | Fingerprint + step-up OTP cho thao tác nhạy cảm | Khác ngữ cảnh, thiếu OTP |
| `enrollmentId`, `courseId` | Client đổi số để truy cập dữ liệu người khác (IDOR) | Truy vấn ownership | Không phải chủ sở hữu |
| `score`, `reason` | Giá trị ngoài miền, payload injection | Validation + parameterized query + WAF + `textContent` ở UI | Sai kiểu, ngoài 0–10 |
| OTP | Có thể bị nhìn trộm rồi dùng lại (replay) | `last_otp` trong 90 giây | Trùng mã vừa dùng |
| IP / `X-Forwarded-For` | Client tự điền header được | `trust proxy = 1`: chỉ tin 1 hop (WAF) | – |
| Dữ liệu đang nằm trong DB | Insider hoặc kẻ chiếm DB sửa trực tiếp | Hash-chain audit + đối chiếu điểm với log | Hash đứt hoặc điểm lệch log |

### 7.7 Tiêu chí hoàn thành

- [ ] GV01 sửa điểm lớp SEC401 kèm `X-OTP` đúng → 200; không kèm → 401.
- [ ] GV01 sửa enrollment của lớp NET301 → 403 và có dòng `ACCESS_DENIED_IDOR`.
- [ ] SV01 gọi `/api/courses/1/grades` → 403.
- [ ] Commit: `step-4: rbac + ownership + step-up`.

## 8. Bước 5 – Audit log hash-chain, phát hiện và kiểm tra toàn vẹn (1,5 ngày)

**Mỗi dòng log chứa hash của dòng trước nó, nên sửa hoặc xóa bất kỳ dòng nào đều làm đứt chuỗi; đối chiếu điểm hiện tại với log phát hiện điểm bị sửa thẳng trong DB.** Đây là lớp DETECT cho cả tấn công từ ngoài và insider.

### 8.1 Danh mục sự kiện

| Action | Severity | Phát sinh khi | Phản ứng tự động |
| --- | --- | --- | --- |
| `LOGIN_PASSWORD_OK`, `LOGIN_SUCCESS`, `MFA_ENROLLED`, `GRADE_UPDATE` | INFO | Hoạt động bình thường | – |
| `LOGIN_FAIL`, `LOGIN_FAIL_UNKNOWN_USER`, `MFA_FAIL_INVALID`, `MFA_FAIL_REPLAY`, `INPUT_REJECTED`, `RATE_LIMITED` | WARN | Sai thông tin, dữ liệu lạ, vượt ngưỡng tốc độ | Đếm để khóa |
| `ACCOUNT_LOCKED` | HIGH | Sai mật khẩu 5 lần | Khóa 15 phút |
| `MFA_FAIL_THRESHOLD` | HIGH | Mật khẩu đúng nhưng sai OTP 3 lần | Khóa + cảnh báo nghi lộ mật khẩu |
| `JWT_INVALID` | HIGH | Token sai chữ ký, sai `alg`, hết hạn, sai `iss/aud` | 401 |
| `ACCESS_DENIED_ROLE`, `ACCESS_DENIED_IDOR`, `STEP_UP_FAIL_*` | HIGH | Truy cập ngoài quyền, thiếu OTP khi sửa điểm | 403/401 |
| `SESSION_CONTEXT_MISMATCH` | CRITICAL | Token dùng từ ngữ cảnh khác | Thu hồi phiên |
| `SESSION_UNKNOWN` | CRITICAL | Chữ ký đúng nhưng `sid` không tồn tại | Cảnh báo nghi lộ `JWT_SECRET` |
| `INTEGRITY_VIOLATION` | CRITICAL | Chuỗi hash đứt hoặc điểm lệch log | Kích hoạt quy trình RECOVER |
| `ALERT_IDOR_BURST`, `ALERT_MASS_GRADE_CHANGE` | HIGH | Rule tương quan chạy mỗi 60 giây (8.4) | Hiển thị trên dashboard admin |

### 8.2 `app/src/services/audit.js`

```js
import crypto from 'node:crypto';
import { pool } from '../db.js';

export const GENESIS = '0'.repeat(64);
const canonical = (e) =>
  [e.prev_hash, e.ts, e.actor_id ?? '', e.action, e.target ?? '', e.detail ?? '', e.ip ?? '', e.severity].join('|');
export const hashOf = (e) => crypto.createHash('sha256').update(canonical(e)).digest('hex');

export async function logEvent({ client, actorId = null, action, target = null, detail = null,
                                 ip = null, severity = 'INFO' }) {
  const own = !client;
  const db = client ?? (await pool.connect());
  try {
    if (own) await db.query('BEGIN');
    await db.query('SELECT pg_advisory_xact_lock(42)');      // ghi tuần tự => chuỗi không rẽ nhánh
    const { rows } = await db.query('SELECT hash FROM audit_log ORDER BY id DESC LIMIT 1');
    const e = { prev_hash: rows[0]?.hash ?? GENESIS, ts: new Date().toISOString(), actor_id: actorId,
                action, target, detail: detail === null ? null : JSON.stringify(detail), ip, severity };
    e.hash = hashOf(e);
    await db.query(
      `INSERT INTO audit_log (ts, actor_id, action, target, detail, ip, severity, prev_hash, hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [e.ts, e.actor_id, e.action, e.target, e.detail, e.ip, e.severity, e.prev_hash, e.hash]);
    if (own) await db.query('COMMIT');
    if (severity === 'HIGH' || severity === 'CRITICAL') console.warn(`[ALERT][${severity}] ${action} ${target ?? ''}`);
  } catch (err) {
    if (own) await db.query('ROLLBACK');
    throw err;
  } finally {
    if (own) db.release();
  }
}
```

Khóa advisory 1 tham số (`42`) và 2 tham số (`1, enrollmentId` ở Bước 4) thuộc hai không gian khóa khác nhau của PostgreSQL, không đụng nhau.

### 8.3 `app/src/services/integrity.js`

```js
import { pool } from '../db.js';
import { GENESIS, hashOf } from './audit.js';

export async function verifyChain() {
  const { rows } = await pool.query('SELECT * FROM audit_log ORDER BY id');
  let prev = GENESIS;
  const broken = [];
  for (const r of rows) {
    const e = { ...r, ts: new Date(r.ts).toISOString() };
    if (r.prev_hash !== prev || hashOf(e) !== r.hash) broken.push(r.id);
    prev = r.hash;
  }
  return { total: rows.length, broken, lastHash: prev };
}

// FULL JOIN: phát hiện cả điểm bị sửa, bị xóa, hoặc bị chèn thẳng vào DB (không có log)
export async function reconcileGrades() {
  const { rows } = await pool.query(`
    WITH last AS (
      SELECT DISTINCT ON (target) target, detail
        FROM audit_log WHERE action = 'GRADE_UPDATE'
       ORDER BY target, id DESC)
    SELECT coalesce(g.enrollment_id, split_part(l.target, ':', 2)::int) AS enrollment_id,
           g.score, l.detail AS last_detail
      FROM grades g FULL JOIN last l ON l.target = 'enrollment:' || g.enrollment_id`);
  return rows
    .map((r) => ({ enrollmentId: r.enrollment_id,
                   dbScore: r.score === null ? null : Number(r.score),
                   loggedScore: r.last_detail ? JSON.parse(r.last_detail).new : null }))
    .filter((x) => x.loggedScore !== x.dbScore);
}
```

`GET /api/admin/integrity` (ADMIN) gọi 2 hàm trên; có vi phạm thì ghi `INTEGRITY_VIOLATION` (CRITICAL) kèm danh sách `broken` và các điểm lệch.

### 8.4 Rule tương quan (`services/detect.js`, chạy `setInterval` 60 giây)

| Rule | Điều kiện | Sự kiện sinh ra |
| --- | --- | --- |
| R1 | ≥ 5 `LOGIN_FAIL` cùng tài khoản trong 15 phút | `ACCOUNT_LOCKED` (đã làm ở Bước 3) |
| R2 | ≥ 3 `MFA_FAIL_*` sau `LOGIN_PASSWORD_OK` | `MFA_FAIL_THRESHOLD` (đã làm ở Bước 3) |
| R3 | ≥ 3 `ACCESS_DENIED_IDOR` cùng người trong 5 phút | `ALERT_IDOR_BURST` |
| R4 | ≥ 15 `GRADE_UPDATE` cùng người trong 10 phút | `ALERT_MASS_GRADE_CHANGE` |
| R5 | Bất kỳ `SESSION_CONTEXT_MISMATCH`, `SESSION_UNKNOWN`, `INTEGRITY_VIOLATION` | Hiển thị ngay, không cần tương quan |

Ví dụ truy vấn R3 (trước khi ghi cảnh báo, kiểm tra 5 phút qua đã có `ALERT_IDOR_BURST` cho người đó chưa để tránh lặp):

```sql
SELECT actor_id, count(*) AS n
  FROM audit_log
 WHERE action = 'ACCESS_DENIED_IDOR' AND ts > now() - interval '5 minutes'
 GROUP BY actor_id
HAVING count(*) >= 3;
```

### 8.5 API admin cho DETECT

| Method | Path | Trả về |
| --- | --- | --- |
| GET | `/api/admin/alerts` | 100 sự kiện `HIGH`/`CRITICAL` mới nhất |
| GET | `/api/admin/audit?limit=100` | Log gần nhất, mới nhất trước |
| GET | `/api/admin/integrity` | `chain: {total, broken, lastHash}`, `grades: [lệch]` |

Hạn chế cần ghi vào báo cáo: superuser DB có thể tính lại toàn bộ chuỗi hash sau khi sửa. Giảm thiểu: mỗi ngày admin ghi `lastHash` ra ngoài hệ thống (anchor: file riêng, email, repo khác) và so lại khi kiểm tra. Dài hạn: đẩy log sang SIEM hoặc storage WORM.

### 8.6 Tiêu chí hoàn thành

- [ ] Sau 10 thao tác bất kỳ, `/api/admin/integrity` trả `broken = []`, `grades = []`.
- [ ] Chạy `UPDATE grades SET score = 10 WHERE enrollment_id = 1` bằng user `postgres` → integrity báo lệch đúng enrollment 1.
- [ ] Chạy `UPDATE audit_log SET action = 'X' WHERE id = 3` bằng user `postgres` → `broken` chứa id 3.
- [ ] Log console của `app` in dòng `[ALERT]` khi có sự kiện HIGH/CRITICAL.
- [ ] Commit: `step-5: audit chain + detect`.

## 9. Bước 6 – WAF, rate limit, security headers (0,5 ngày)

**WAF đã bật từ Bước 1; bước này thêm rate limit, header bảo mật, giới hạn body, chỉ nhận JSON, rồi chứng minh rằng nếu payload lọt qua WAF thì app vẫn an toàn.** Đây là bằng chứng trực tiếp cho Defense-in-Depth.

### 9.1 `app/src/middleware/limits.js`

```js
import rateLimit from 'express-rate-limit';
import { logEvent } from '../services/audit.js';

const onLimit = (name) => async (req, res, next, options) => {
  await logEvent({ action: 'RATE_LIMITED', target: name, ip: req.ip, severity: 'WARN' });
  res.status(options.statusCode).json({ error: 'TOO_MANY_REQUESTS' });
};
const common = { windowMs: 15 * 60 * 1000, standardHeaders: 'draft-7', legacyHeaders: false };

export const loginLimiter = rateLimit({ ...common, limit: 10, handler: onLimit('login') });
export const apiLimiter = rateLimit({ ...common, limit: 300, handler: onLimit('api') });
```

### 9.2 `app/src/server.js` (bản hoàn chỉnh, thay bản ở Bước 1)

```js
import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import './config.js';                                   // dừng ngay nếu thiếu JWT_SECRET
import { apiLimiter } from './middleware/limits.js';
import { router as authRouter } from './routes/auth.js';
import { router as gradeRouter } from './routes/grades.js';
import { router as adminRouter } from './routes/admin.js';
import { startDetectors } from './services/detect.js';

const app = express();
app.set('trust proxy', 1);                             // chỉ tin X-Forwarded-For từ 1 hop (WAF)
app.use(helmet());                                     // CSP, X-Frame-Options, nosniff, ẩn X-Powered-By...
app.use(express.json({ limit: '10kb' }));              // chặn body quá lớn
app.use(cookieParser());
app.use(express.static('public', { index: 'login.html' }));

app.use('/api', apiLimiter);
app.use('/api', (req, res, next) => {                  // request thay đổi dữ liệu phải là JSON
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && !req.is('application/json'))
    return res.status(415).json({ error: 'JSON_ONLY' });
  next();
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRouter);
app.use('/api', gradeRouter);
app.use('/api/admin', adminRouter);

app.use((err, req, res, next) => {                     // không lộ stack trace ra client
  console.error(err);
  res.status(500).json({ error: 'INTERNAL_ERROR' });
});

startDetectors();
const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`app listening on ${port}`));
```

CSRF: cookie `SameSite=Strict` + chỉ nhận `application/json` (form HTML của site khác không gửi được JSON mà không qua CORS preflight). CSP mặc định của `helmet` chặn inline script, nên giao diện ở Bước 7 phải đặt JS trong file riêng. Gọi `POST /api/auth/logout` cũng phải gửi header `Content-Type: application/json` và body `{}`.

### 9.3 Kiểm tra WAF

```bash
# SQLi trên query string -> 403
curl -i -G http://localhost:8080/api/grades/me --data-urlencode "q=1' UNION SELECT password_hash FROM users--"

# XSS trong body JSON -> 403
curl -i -X PUT http://localhost:8080/api/grades/1 -H "Content-Type: application/json" \
  -d '{"score":8,"reason":"<script>alert(document.cookie)</script>"}'

# Path traversal -> 403
curl -i --path-as-is "http://localhost:8080/../../etc/passwd"

# User-Agent của công cụ quét -> 403
curl -i -A "sqlmap/1.8" http://localhost:8080/health

# Xem rule nào đã chặn (ghi số rule id vào báo cáo)
docker compose logs waf | grep -i "modsecurity"
```

Trên Windows PowerShell, dấu `\` xuống dòng và nháy đơn trong `-d` không hoạt động như bash; chạy các lệnh này trong Git Bash hoặc dùng Postman.

### 9.4 Chứng minh Defense-in-Depth: bỏ qua WAF vẫn an toàn

Tạo `tests/attacks/sqli-direct.mjs`, chạy **bên trong** container `app` (gọi thẳng `localhost:3000`, không qua WAF):

```js
const payloads = ["' OR '1'='1' --", "admin'--", "x'; DROP TABLE grades; --"];
for (const username of payloads) {
  const r = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password: 'x' }),
  });
  console.log(r.status, await r.text(), '<=', username); // kỳ vọng: 401 INVALID_CREDENTIALS, không có lỗi SQL
}
```

```bash
docker compose cp tests/attacks/sqli-direct.mjs app:/tmp/sqli-direct.mjs
docker compose exec app node /tmp/sqli-direct.mjs
docker compose exec db psql -U postgres -d securegrade -c "\dt"   # bảng grades vẫn còn
```

### 9.5 Đo trade-off Paranoia Level (số liệu cho chương Trade-off)

1. Chạy toàn bộ test case loại Normal ở Bước 8 với `BLOCKING_PARANOIA: "1"`, ghi số request hợp lệ bị 403 (false positive).
2. Đổi thành `"2"`, `docker compose up -d waf`, chạy lại. Thử thêm `reason` tiếng Việt có dấu nháy, ngoặc, dấu `;`.
3. Lập bảng: PL → số tấn công bị chặn / số false positive. Quay về PL1 cho bản demo.

### 9.6 Tiêu chí hoàn thành

- [ ] 4 lệnh ở 9.3 đều nhận 403, log WAF có rule id tương ứng.
- [ ] 9.4 trả 401 cho cả 3 payload, bảng `grades` còn nguyên.
- [ ] Response có header `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, không có `X-Powered-By`.
- [ ] Bảng số liệu PL1 vs PL2.
- [ ] Commit: `step-6: waf + hardening`.

## 10. Bước 7 – Giao diện tối thiểu (1 ngày, làm song song Bước 4–6)

**5 trang HTML tĩnh + JS thuần, đủ để demo luồng bình thường; mọi tấn công demo bằng Postman/curl.** Không dùng framework, không dùng thư viện CSS từ CDN (CSP của `helmet` sẽ chặn script ngoài).

### 10.1 Danh sách trang

| File | Chức năng | API gọi |
| --- | --- | --- |
| `login.html` | Form username/password, chuyển sang `mfa.html` theo `next` | `/api/auth/login` |
| `mfa.html` | `MFA_ENROLL`: hiện QR + ô nhập OTP; `MFA_VERIFY`: chỉ ô OTP; xong chuyển trang theo `role` | `/api/auth/mfa/*` |
| `student.html` | Bảng điểm của tôi | `/api/grades/me` |
| `lecturer.html` | Chọn lớp → bảng sinh viên → nút Sửa mở form: điểm, lý do, OTP | `/api/courses/mine`, `/api/courses/:id/grades`, `PUT /api/grades/:id` |
| `admin.html` | 3 tab: Cảnh báo, Audit log, Kiểm tra toàn vẹn; nút Thu hồi phiên, Reset MFA, Mở khóa | `/api/admin/*` |

Mọi trang có nút Đăng xuất và gọi `/api/me` khi tải; sai role thì chuyển về `login.html`. Việc chuyển trang chỉ là tiện lợi, quyền thật sự do server kiểm tra.

### 10.2 Quy tắc bảo mật phía client

- JS đặt trong file riêng `public/js/*.js`, nạp bằng `<script type="module" src="/js/login.js"></script>`; không có `onclick=` hay `<script>` inline.
- Hiển thị dữ liệu bằng `textContent`, không dùng `innerHTML` với dữ liệu từ server (chống stored XSS qua `reason`, `full_name`).
- Không lưu token vào `localStorage`; token chỉ nằm trong cookie HttpOnly.
- Ô OTP: `inputmode="numeric"`, `autocomplete="one-time-code"`, `maxlength="6"`.

### 10.3 `public/js/api.js` (dùng chung)

```js
const LOGOUT_ERRORS = ['NO_TOKEN', 'SESSION_REVOKED', 'SESSION_EXPIRED', 'SESSION_CONTEXT_MISMATCH', 'INVALID_TOKEN'];

export async function api(path, { method = 'GET', body, otp } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (otp) headers['X-OTP'] = otp;
  const r = await fetch(path, { method, headers, credentials: 'same-origin',
                                body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await r.json().catch(() => ({}));
  if (r.status === 401 && LOGOUT_ERRORS.includes(data.error)) location.href = '/login.html';
  return { status: r.status, data };
}

export function cell(text) {           // tạo ô bảng an toàn
  const td = document.createElement('td');
  td.textContent = text ?? '';
  return td;
}
```

### 10.4 Tiêu chí hoàn thành

- [ ] Đi hết luồng SV, GV, Admin trên trình duyệt qua `http://localhost:8080`.
- [ ] DevTools Console không có lỗi vi phạm CSP.
- [ ] Nhập `reason` = `<img src=x onerror=alert(1)>` (tạm hạ WAF về `DetectionOnly` để thử) → trang GV hiển thị nguyên văn, không chạy script.
- [ ] Commit: `step-7: minimal ui`.

## 11. Bước 8 – Kịch bản tấn công và bộ test case (1,5 ngày)

**6 kịch bản tấn công (KB1–KB6) và 24 test case: 6 bình thường, 18 tấn công; mỗi test case chỉ ra cơ chế chặn và bằng chứng log.** KB1 và KB2 là trục chính của phần demo.

### 11.1 Kịch bản tấn công

| KB | Kịch bản | Đầu vào bị giả mạo/đánh cắp | Chặn bằng (PREVENT) | Phát hiện (DETECT) | Phục hồi (RECOVER) |
| --- | --- | --- | --- | --- | --- |
| KB1 | Phishing/ClickFix: GV nhập mật khẩu vào trang giả, kẻ tấn công đăng nhập | Mật khẩu thật bị đánh cắp | MFA TOTP, khóa sau 3 OTP sai | `MFA_FAIL_THRESHOLD`: mật khẩu đúng + OTP sai | Đổi mật khẩu, mở khóa |
| KB2 | ClickFix cài infostealer, lấy cookie phiên của GV đang đăng nhập | Cookie/JWT hợp lệ bị đánh cắp | Fingerprint phiên, step-up OTP khi sửa điểm, TTL 15 phút | `SESSION_CONTEXT_MISMATCH` (CRITICAL) | Thu hồi mọi phiên, reset MFA |
| KB3 | SV sửa JWT để thành ADMIN | Token bị chỉnh sửa, `alg=none` | Kiểm chữ ký, cố định `HS256`, role lấy từ DB | `JWT_INVALID` (HIGH) | – |
| KB4 | IDOR: đổi `enrollmentId`/`courseId` để sửa/xem dữ liệu người khác | Tham số URL bị đổi | RBAC + ownership | `ACCESS_DENIED_*`, `ALERT_IDOR_BURST` | – |
| KB5 | SQLi/XSS qua ô nhập | Payload độc trong query/body | WAF CRS, validation, parameterized query, `textContent`, CSP | Log WAF, `INPUT_REJECTED` | – |
| KB6 | Insider/kẻ chiếm DB sửa điểm trực tiếp, xóa log | Dữ liệu lưu trữ bị sửa | `app_user` không có UPDATE/DELETE trên `audit_log` | Hash-chain + đối chiếu điểm → `INTEGRITY_VIOLATION` | Khôi phục điểm theo log hoặc backup |

### 11.2 Bộ test case

Tài khoản dùng cho test phá hủy: `sv03` (bị khóa ở TC07), `gv02` (bị khóa ở TC09). Chạy TC08 cuối cùng hoặc `docker compose restart app` sau đó, vì bộ đếm rate limit nằm trong RAM và sẽ chặn các lần đăng nhập khác.

| ID | Loại | Mô tả | Thực hiện | Kỳ vọng | Cơ chế | Kết quả |
| --- | --- | --- | --- | --- | --- | --- |
| TC01 | Bình thường | Đăng nhập lần đầu, bật MFA | `sv01`: login → setup → enable | 200, `next=MFA_ENROLL`, có `MFA_ENROLLED` | bcrypt, TOTP | Chưa chạy |
| TC02 | Bình thường | Đăng nhập lần sau | `sv01`: login → verify OTP | 200, `LOGIN_SUCCESS` | TOTP | Chưa chạy |
| TC03 | Bình thường | SV xem điểm của mình | `GET /api/grades/me` | 200, chỉ có môn của `sv01` | Ownership theo session | Chưa chạy |
| TC04 | Bình thường | GV nhập điểm lớp mình | `gv01`: `PUT /api/grades/:id` (lớp SEC401), score 8.5, reason, `X-OTP` | 200, `GRADE_UPDATE` có old/new | RBAC, ownership, step-up, audit | Chưa chạy |
| TC05 | Bình thường | Admin xem cảnh báo, kiểm tra toàn vẹn | `admin`: `/api/admin/alerts`, `/api/admin/integrity` | 200, `broken=[]`, `grades=[]` | RBAC, hash-chain | Chưa chạy |
| TC06 | Bình thường | Đăng xuất rồi dùng lại cookie cũ | logout → `GET /api/me` bằng cookie cũ | 401 `SESSION_REVOKED` | Session server-side | Chưa chạy |
| TC07 | Tấn công | Brute force mật khẩu | `sv03` sai 5 lần, lần 6 đúng | Lần 5 ghi `ACCOUNT_LOCKED`, lần 6 trả 423 | Lockout | Chưa chạy |
| TC08 | Tấn công | Brute force tốc độ cao | 11 request login trong 15 phút | Request 11 trả 429, có `RATE_LIMITED` | Rate limit | Chưa chạy |
| TC09 | Tấn công (KB1) | Có mật khẩu GV, không có điện thoại | `gv02`: login đúng → OTP sai 3 lần | 423, `MFA_FAIL_THRESHOLD` (HIGH) | MFA, rule R2 | Chưa chạy |
| TC10 | Tấn công | Dùng lại OTP vừa dùng | Gửi lại OTP của TC04 trong 90 giây | 401, `STEP_UP_FAIL_REPLAY` | `last_otp` | Chưa chạy |
| TC11 | Tấn công (KB3) | Sửa payload JWT, giữ chữ ký cũ | `forge-jwt.mjs` → bản TAMPERED | 401 `INVALID_TOKEN`, `JWT_INVALID` | Chữ ký HS256 | Chưa chạy |
| TC12 | Tấn công (KB3) | JWT `alg=none` | `forge-jwt.mjs` → bản ALG\_NONE | 401, `JWT_INVALID` | `algorithms: ['HS256']` | Chưa chạy |
| TC13 | Tấn công | Dùng token pre-MFA gọi API | Login đúng mật khẩu, bỏ qua OTP, `GET /api/grades/me` | 401 `MFA_REQUIRED` | Middleware lớp 4 | Chưa chạy |
| TC14 | Tấn công (KB2) | Cookie bị đánh cắp dùng ở thiết bị khác | Copy cookie `gv01` từ trình duyệt sang curl | 401 `SESSION_CONTEXT_MISMATCH`, phiên bị thu hồi, CRITICAL | Fingerprint | Chưa chạy |
| TC15 | Tấn công (KB2) | Phiên hợp lệ nhưng không có OTP | `gv01`: `PUT` điểm không có `X-OTP` | 401 `STEP_UP_REQUIRED` | Step-up | Chưa chạy |
| TC16 | Tấn công (KB4) | GV sửa điểm lớp người khác | `gv01`: `PUT` enrollment của NET301 kèm OTP đúng | 403, `ACCESS_DENIED_IDOR` | Ownership | Chưa chạy |
| TC17 | Tấn công (KB4) | SV xem bảng điểm cả lớp | `sv01`: `GET /api/courses/1/grades` | 403, `ACCESS_DENIED_ROLE` | RBAC | Chưa chạy |
| TC18 | Tấn công | Giá trị điểm giả mạo | score = 15, `"10"`, 7.123; reason rỗng | 400, `INPUT_REJECTED` | Validation + CHECK | Chưa chạy |
| TC19 | Tấn công (KB5) | SQLi qua WAF | Lệnh 1 ở mục 9.3 | 403 từ WAF | OWASP CRS | Chưa chạy |
| TC20 | Tấn công (KB5) | XSS trong `reason` | Lệnh 2 ở mục 9.3; thử thêm khi WAF ở DetectionOnly | 403; nếu lọt thì UI hiển thị nguyên văn | CRS, `textContent`, CSP | Chưa chạy |
| TC21 | Tấn công | Bỏ qua WAF, nối thẳng DB từ ngoài | `curl :3000`, nối `:5432` từ host | Connection refused | Segmentation | Chưa chạy |
| TC22 | Tấn công (KB6) | Insider sửa điểm trực tiếp trong DB | `postgres`: `UPDATE grades SET score = 10 ...` | `/integrity` báo lệch, `INTEGRITY_VIOLATION` | Đối chiếu log | Chưa chạy |
| TC23 | Tấn công (KB6) | Xóa dấu vết bằng quyền của app | `app_user`: `DELETE FROM audit_log` | `permission denied` | Least privilege | Chưa chạy |
| TC24 | Tấn công (KB6) | Sửa 1 dòng audit bằng superuser | `UPDATE audit_log ... WHERE id = 3` | `broken` chứa id 3 | Hash-chain | Chưa chạy |

### 11.3 Công cụ tấn công: `tests/attacks/forge-jwt.mjs`

```js
// Dùng: node tests/attacks/forge-jwt.mjs <JWT lấy từ cookie sg_token>
const [h, p, s] = process.argv[2].split('.');
const payload = JSON.parse(Buffer.from(p, 'base64url').toString());
payload.role = 'ADMIN';
payload.sub = '1';
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
console.log('TAMPERED:', [h, b64(payload), s].join('.'));
console.log('ALG_NONE:', [b64({ alg: 'none', typ: 'JWT' }), b64(payload), ''].join('.'));
```

```bash
curl -i http://localhost:8080/api/me -H "Cookie: sg_token=<TAMPERED hoặc ALG_NONE>"
```

### 11.4 Chạy tự động: `tests/run-tests.mjs`

Script chạy trên máy host (Node ≥ 20), gọi API qua WAF và in bảng PASS/FAIL. Các phần khung:

```js
import { generate } from 'otplib';
import { execSync } from 'node:child_process';

const BASE = 'http://localhost:8080';

class Client {                                   // mỗi Client = 1 "trình duyệt" có cookie + User-Agent riêng
  constructor(ua = 'sg-test-browser') { this.ua = ua; this.cookie = ''; }
  async call(method, path, body, headers = {}) {
    const r = await fetch(BASE + path, {
      method,
      headers: { 'content-type': 'application/json', 'user-agent': this.ua, cookie: this.cookie, ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const c = r.headers.getSetCookie().find((x) => x.startsWith('sg_token='));
    if (c) this.cookie = c.split(';')[0];
    return { status: r.status, data: await r.json().catch(() => ({})) };
  }
}

// Người chạy test có quyền vận hành (luồng F4) nên đọc được secret từ DB
const secretOf = (u) => execSync(
  `docker compose exec -T db psql -U postgres -d securegrade -tAc "SELECT mfa_secret FROM users WHERE username = '${u}'"`,
).toString().trim();

// Đợi sang cửa sổ 30 giây mới để không bị chặn OTP_REPLAY
async function freshOtp(secret) {
  await new Promise((r) => setTimeout(r, 30_000 - (Date.now() % 30_000) + 500));
  return generate({ secret });
}

const results = [];
const check = (id, ok, note = '') => results.push({ id, result: ok ? 'PASS' : 'FAIL', note });
// ... viết từng TC theo bảng 11.2, ví dụ TC13:
// const c = new Client(); await c.call('POST', '/api/auth/login', { username: 'sv01', password: 'Sv01@2026demo' });
// const r = await c.call('GET', '/api/grades/me'); check('TC13', r.status === 401 && r.data.error === 'MFA_REQUIRED');
console.table(results);
```

Chạy trên DB sạch: `docker compose down -v && docker compose up -d --build`, đợi 20 giây, rồi `node tests/run-tests.mjs`. Mỗi lần lấy OTP mất tới 30 giây nên cả bộ chạy vài phút. Script cần `npm install otplib` ở thư mục `tests/`.

### 11.5 Bằng chứng cho mỗi test case

- Ảnh chụp response (Postman hoặc terminal) + dòng audit tương ứng (`/api/admin/audit`).
- Lưu vào `docs/evidence/TCxx.png`; cập nhật cột Kết quả ở bảng 11.2.
- Output `console.table` của `run-tests.mjs` chụp lại làm phụ lục báo cáo.

## 12. Bước 9 – Phục hồi: thu hồi phiên, reset MFA, backup/restore (0,5 ngày)

**Admin có 3 thao tác phản ứng (thu hồi phiên, reset MFA, mở khóa), mỗi thao tác đều yêu cầu step-up OTP; dữ liệu khôi phục bằng `pg_dump`/`pg_restore` với RPO tối đa 24 giờ.** Nhóm phải diễn tập restore ít nhất 1 lần và ghi thời gian thực tế (RTO).

### 12.1 API phản ứng sự cố (ADMIN + step-up)

| Method | Path | Tác dụng | Sự kiện audit |
| --- | --- | --- | --- |
| POST | `/api/admin/users/:id/revoke-sessions` | `UPDATE sessions SET revoked_at = now(), revoke_reason = 'ADMIN_REVOKE' WHERE user_id = $1 AND revoked_at IS NULL` | `ADMIN_REVOKE_SESSIONS` |
| POST | `/api/admin/users/:id/reset-mfa` | `mfa_enabled = false`, `mfa_secret = NULL`, `last_otp = NULL` + thu hồi mọi phiên; người dùng quét QR mới ở lần đăng nhập tới | `ADMIN_RESET_MFA` |
| POST | `/api/admin/users/:id/unlock` | `failed_attempts = 0`, `mfa_failed = 0`, `locked_until = NULL` | `ADMIN_UNLOCK` |

Khai báo route: `router.post('/users/:id/revoke-sessions', requireAuth(), requireRole('ADMIN'), requireStepUp, handler)`. Đổi mật khẩu nằm ngoài phạm vi UI; người vận hành làm qua luồng F4:

```bash
docker compose exec db psql -U postgres -d securegrade -c \
  "UPDATE users SET password_hash = crypt('MatKhauTam@2026', gen_salt('bf', 12)) WHERE username = 'gv02'"
```

### 12.2 `scripts/backup.sh`

```bash
#!/bin/sh
set -e
TS=$(date +%Y%m%d_%H%M%S)
mkdir -p backups
docker compose exec -T db pg_dump -U postgres -Fc -f /tmp/sg.dump securegrade
docker compose cp db:/tmp/sg.dump "backups/sg_${TS}.dump"
echo "Backup: backups/sg_${TS}.dump"
```

Dump ghi vào file trong container rồi `docker compose cp` ra ngoài, không dùng `>` chuyển hướng: PowerShell có thể đổi encoding và làm hỏng file nhị phân.

### 12.3 `scripts/restore.sh`

```bash
#!/bin/sh
set -e
FILE="$1"                                   # ví dụ: backups/sg_20261110_0800.dump
docker compose stop app                     # ngừng ghi trong lúc restore
docker compose cp "$FILE" db:/tmp/restore.dump
docker compose exec -T db pg_restore -U postgres -d securegrade --clean --if-exists /tmp/restore.dump
docker compose start app
```

`pg_restore --clean` khôi phục cả quyền (GRANT) có trong dump. Sau restore: chạy `/api/admin/integrity`, ghi sự kiện `RESTORE_PERFORMED` kèm tên file và thời điểm backup.

### 12.4 Runbook theo sự cố

| Sự cố | Dấu hiệu | Xử lý theo thứ tự |
| --- | --- | --- |
| Nghi lộ mật khẩu (KB1) | `MFA_FAIL_THRESHOLD` | 1. Liên hệ GV xác nhận qua kênh khác. 2. Đổi mật khẩu (12.1). 3. `unlock`. 4. Kiểm tra GV có dùng chung mật khẩu ở hệ thống khác không. |
| Nghi đánh cắp phiên (KB2) | `SESSION_CONTEXT_MISMATCH` | 1. `revoke-sessions`. 2. `reset-mfa` nếu nghi máy nhiễm mã độc. 3. Yêu cầu GV quét mã độc, đổi mật khẩu từ máy sạch. 4. Lọc `GRADE_UPDATE` của GV trong 24 giờ qua, xác nhận từng thay đổi. |
| Điểm bị sửa ngoài app (KB6) | `INTEGRITY_VIOLATION` (grades) | 1. Chụp kết quả integrity làm bằng chứng. 2. GV chủ lớp nhập lại `loggedScore` qua app với lý do "Khôi phục sau sự cố toàn vẹn" (tạo dòng audit mới, chuỗi hash liền mạch). 3. Đổi `POSTGRES_PASSWORD`, rà soát ai có quyền trên host. |
| Log bị sửa (KB6) | `INTEGRITY_VIOLATION` (chain) | 1. So `lastHash` với anchor lưu ngoài. 2. Restore từ backup gần nhất trước thời điểm hỏng. 3. Đối chiếu thay đổi sau backup với GV. |
| Nghi lộ `JWT_SECRET` | `SESSION_UNKNOWN` | 1. Sinh secret mới trong `.env`. 2. `docker compose up -d app` (mọi token cũ mất hiệu lực ngay). 3. Thu hồi toàn bộ session trong DB. |

### 12.5 Diễn tập phục hồi (bắt buộc có số liệu)

1. Nhập 5 điểm hợp lệ → `sh scripts/backup.sh`.
2. Giả lập thảm họa: `docker compose exec db psql -U postgres -d securegrade -c "DELETE FROM grades"`.
3. Bấm giờ, chạy `sh scripts/restore.sh backups/<file>.dump`.
4. Chạy `/api/admin/integrity` → sạch. Ghi lại thời gian từ bước 3 đến khi hệ thống hoạt động lại = RTO đo được.

### 12.6 Tiêu chí hoàn thành

- [ ] 3 API phản ứng hoạt động và đều bị từ chối khi thiếu OTP.
- [ ] Diễn tập 12.5 thành công, có số đo RTO.
- [ ] Commit: `step-9: recover`.

## 13. Bước 10 – Báo cáo, sơ đồ, slide và demo (3 ngày, bắt đầu song song từ tuần 2)

**Báo cáo đi theo chuỗi ASSET → RISK → CONTROL → DETECT → RECOVER, mọi bảng dưới đây là bản nháp dùng được ngay; slide 12 trang và demo 9,5 phút xoay quanh câu chuyện "giảng viên bị phishing".** Viết báo cáo trong lúc code, không dồn về cuối.

### 13.1 Dàn ý báo cáo (30–40 trang)

| Chương | Nội dung | Lấy từ mục | Số trang |
| --- | --- | --- | --- |
| 1. Giới thiệu | Bối cảnh, bài toán, đối tượng, phạm vi, mục tiêu | 1, 2.4 | 3 |
| 2. Cơ sở lý thuyết | CIA, Defense-in-Depth, Zero Trust, Least Privilege, MFA/TOTP (RFC 6238), JWT (RFC 7519), OWASP Top 10, WAF/CRS, hash-chain | Slide bài 1–5 của môn | 5 |
| 3. Phân tích tài sản và rủi ro | Tài sản, tác nhân đe dọa, STRIDE, ma trận rủi ro | 13.2, 13.3 | 6 |
| 4. Thiết kế kiến trúc | Phân vùng, Allowed Flows, DFD, sequence, pipeline kiểm chứng, bảng "dựa vào đâu để tin" | 2, 7.5, 7.6 | 7 |
| 5. Hiện thực prototype | Công nghệ, cấu trúc, từng cơ chế kèm đoạn code ngắn | 4–10 | 6 |
| 6. Kịch bản tấn công và kiểm thử | KB1–KB6, 24 test case, kết quả, ảnh bằng chứng | 11 | 6 |
| 7. Phân tích trade-off | 8 quyết định, ngắn hạn/dài hạn, số liệu PL1/PL2 và RTO | 13.4, 9.5, 12.5 | 3 |
| 8. Kết luận | Kết quả, hạn chế, hướng phát triển | 2.4, 13.4 | 2 |
| Phụ lục | Hướng dẫn cài đặt, link repo, output `run-tests.mjs` | 3, 11.4 | – |

### 13.2 Tài sản và tác nhân đe dọa

| ID | Tài sản | Thuộc tính ưu tiên | Vì sao quan trọng |
| --- | --- | --- | --- |
| A1 | Bảng điểm | Integrity, Availability | Quyết định học bổng, cảnh báo học vụ, tốt nghiệp |
| A2 | Tài khoản giảng viên, admin | Confidentiality của thông tin xác thực | Là cổng duy nhất để sửa điểm |
| A3 | Thông tin cá nhân và điểm của sinh viên | Confidentiality | Quyền riêng tư của sinh viên |
| A4 | Secret: `JWT_SECRET`, TOTP seed, mật khẩu DB | Confidentiality | Lộ là mất toàn bộ lớp xác thực |
| A5 | Audit log | Integrity | Bằng chứng điều tra, chống chối bỏ |
| A6 | Dịch vụ web | Availability | Mùa nhập điểm có hạn chót |

Tác nhân: sinh viên muốn sửa điểm (có tài khoản hợp lệ), kẻ phishing bên ngoài, malware/infostealer trên máy giảng viên, insider có quyền trên host/DB, bot dò mật khẩu.

### 13.3 Ma trận rủi ro và kiểm soát (Risk & Control Matrix)

| ID | Tài sản | Mối đe dọa (STRIDE) | Khả năng | Tác động | Rủi ro | PREVENT | DETECT | RECOVER |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R01 | A2 | Phishing/ClickFix lộ mật khẩu (Spoofing) | Cao | Cao | Cao | MFA TOTP bắt buộc, khóa sau 3 OTP sai | `MFA_FAIL_THRESHOLD` | Đổi mật khẩu, mở khóa |
| R02 | A2 | Đánh cắp cookie phiên (Spoofing) | TB | Cao | Cao | HttpOnly, SameSite, TTL 15 phút, fingerprint, step-up | `SESSION_CONTEXT_MISMATCH` | Thu hồi phiên, reset MFA |
| R03 | A1 | Giả mạo JWT để nâng quyền (Elevation of Privilege) | TB | Cao | Cao | Chữ ký HS256, cố định `alg`, role đọc từ DB | `JWT_INVALID` | – |
| R04 | A1, A3 | IDOR xem/sửa dữ liệu người khác (Tampering, Information Disclosure) | Cao | Cao | Cao | RBAC + ownership | `ACCESS_DENIED_*`, `ALERT_IDOR_BURST` | – |
| R05 | A1 | SQL injection (Tampering) | TB | Cao | Cao | WAF CRS, parameterized query, least privilege | Log WAF | Restore |
| R06 | A3 | Stored XSS (Information Disclosure) | TB | TB | TB | WAF, `textContent`, CSP, HttpOnly | Log WAF | – |
| R07 | A2 | Brute force, credential stuffing (Spoofing) | Cao | TB | Cao | Rate limit, lockout, bcrypt cost 12 | `ACCOUNT_LOCKED`, `RATE_LIMITED` | Mở khóa |
| R08 | A1, A5 | Insider sửa điểm, xóa log trong DB (Tampering, Repudiation) | Thấp | Cao | TB | `app_user` append-only trên log, DB không mở cổng | Hash-chain, đối chiếu điểm | Khôi phục theo log/backup |
| R09 | A4 | Lộ secret qua Git hoặc biến môi trường (Information Disclosure) | TB | Cao | Cao | `.env` ngoài Git, không `env_file`, dừng app nếu secret ngắn | `SESSION_UNKNOWN` | Rotate secret |
| R10 | A6 | Flood API (Denial of Service) | TB | TB | TB | Rate limit, body ≤ 10 KB, WAF | `RATE_LIMITED` | Khởi động lại |
| R11 | A1 | Mất dữ liệu do lỗi hoặc ransomware | Thấp | Cao | TB | Phân vùng, app/DB không có egress | – | Backup/restore, RPO 24 giờ |
| R12 | A2 | Nhìn trộm rồi dùng lại OTP (Spoofing) | Thấp | TB | Thấp | Chặn OTP trùng trong 90 giây | `*_FAIL_REPLAY` | – |

Rủi ro = kết hợp định tính Khả năng × Tác động; ghi rõ thang đo đã dùng trong báo cáo.

### 13.4 Phân tích trade-off

| ID | Quyết định | Được | Mất | Ngắn hạn | Dài hạn | Nhóm chọn |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | MFA TOTP bắt buộc cho mọi vai trò | Chặn KB1 | Thêm thao tác mỗi lần đăng nhập; mất điện thoại phải nhờ admin reset | Tốn công hỗ trợ giai đoạn đầu | TOTP vẫn bị phishing thời gian thực (AiTM); nên nâng lên passkey/WebAuthn | Bắt buộc |
| T2 | Step-up OTP cho mỗi lần sửa điểm | Cookie bị đánh cắp không sửa được điểm | OTP đổi mỗi 30 giây và không dùng lại được, nên tối đa 1 lần sửa/30 giây | Chấp nhận cho prototype | Chuyển sang "sudo mode" 5 phút hoặc nhập theo lô với 1 OTP | Prototype: mỗi request |
| T3 | JWT 15 phút + kiểm session trong DB mỗi request | Thu hồi phiên tức thì | Mất tính stateless, thêm 1 truy vấn/request | Không đáng kể ở quy mô lớp học | Cần cache (Redis) khi tải lớn | Giữ |
| T4 | Fingerprint User-Agent + IP | Phát hiện token bị đánh cắp | False positive khi đổi Wi-Fi/4G hoặc cập nhật trình duyệt | Ít ảnh hưởng vì phiên chỉ 15 phút | Chuyển sang phiên gắn thiết bị bằng khóa mật mã hoặc đánh giá rủi ro theo ngữ cảnh | Giữ, ghi nhận false positive |
| T5 | WAF Paranoia Level 1 thay vì 2 | Ít false positive | Bỏ lọt một số biến thể tấn công | Dùng số liệu đo ở 9.5 | Viết rule exclusion rồi nâng lên PL2 | PL1 |
| T6 | Audit hash-chain tự làm thay vì SIEM | Miễn phí, đủ chứng minh | Không tương quan đa nguồn; superuser vẫn tính lại được chuỗi | Đủ cho đồ án | SIEM (Wazuh) + lưu trữ WORM, chi phí vận hành cao | Hash-chain + anchor ngoài |
| T7 | Backup hằng ngày thay vì PITR | Đơn giản | RPO 24 giờ | Đủ | PITR/WAL archiving khi dữ liệu lớn | Hằng ngày |
| T8 | HTTP trong lab | Demo nhanh, không cần chứng chỉ | Cookie, OTP có thể bị nghe lén trên mạng | Chỉ chạy `localhost` | Bắt buộc HTTPS + HSTS + cookie `secure` | HTTP lab, nêu rõ hạn chế |

### 13.5 Danh sách sơ đồ cần vẽ

| # | Sơ đồ | Công cụ | Nội dung lấy từ |
| --- | --- | --- | --- |
| 1 | Kiến trúc phân vùng + Allowed Flows | draw.io | Mục 2 |
| 2 | DFD mức 1 có trust boundary | draw.io | Mục 2, 7.6 |
| 3 | Use case + misuse case (kẻ tấn công là actor) | PlantUML | 11.1 |
| 4 | Sequence đăng nhập + MFA | PlantUML | 6.1 |
| 5 | Sequence sửa điểm có step-up + audit | PlantUML | 7.4, 7.5 |
| 6 | Activity: pipeline kiểm chứng request | PlantUML | 7.5 |
| 7 | Sequence KB2: token bị đánh cắp bị phát hiện | PlantUML | 11.1 |
| 8 | ERD | PlantUML | 5.7 |

### 13.6 Dàn ý slide (12 slide, 10 phút kể cả demo)

1. Tên đề tài, nhóm.
2. Bài toán: điểm số là tài sản cần toàn vẹn; 1 tình huống giảng viên bị phishing.
3. Tài sản và tác nhân đe dọa (13.2).
4. Kiến trúc phân vùng + Allowed Flows.
5. "Không tin mặc định": bảng 7.6 rút gọn 5 dòng.
6. Pipeline 12 lớp kiểm chứng.
7. Top 5 rủi ro: R01, R02, R03, R04, R08.
8. Demo (chuyển sang màn hình live).
9. Kết quả kiểm thử: 24 test case, số Pass.
10. Trade-off T1, T2, T5 kèm số liệu.
11. Hạn chế và hướng phát triển: HTTPS, passkey, SIEM, quản lý secret.
12. Kết luận, hỏi đáp.

### 13.7 Kịch bản demo (9,5 phút)

| Thời điểm | Người làm | Màn hình | Thao tác | Ý chính cần nói |
| --- | --- | --- | --- | --- |
| 0:00–1:00 | TV1 | Terminal | `docker compose ps`; `curl :8080/health` 200; `curl :3000` refused | Chỉ có 1 cửa vào là WAF; App và DB không có đường ra Internet |
| 1:00–2:30 | TV2 | Trình duyệt | `sv01` đăng nhập + OTP, xem điểm; `gv01` nhập điểm kèm OTP | Luồng bình thường, mỗi thao tác đều để lại audit |
| 2:30–4:00 | TV3 | Tab ẩn danh + trang admin | KB1: có mật khẩu `gv02` nhưng không có điện thoại → sai OTP 3 lần → khóa; admin thấy cảnh báo HIGH | Mật khẩu đúng chưa chứng minh đúng người |
| 4:00–5:30 | TV3 | DevTools + Postman | KB2: copy cookie `gv01` sang Postman → 401 mismatch; tab GV bị đăng xuất; admin thấy CRITICAL | Infostealer lấy được cookie vẫn không dùng được, và không sửa được điểm nếu thiếu OTP |
| 5:30–6:30 | TV1 | Terminal | KB3: `forge-jwt.mjs` → 401; KB4: `gv01` sửa điểm lớp `gv02` → 403 | Không tin claim trong token, không tin ID do client gửi |
| 6:30–7:15 | TV1 | Terminal | KB5: SQLi → 403 từ WAF; `sqli-direct.mjs` bỏ qua WAF → vẫn 401 | Defense-in-Depth: WAF thủng thì lớp sau vẫn giữ |
| 7:15–8:45 | TV2 | Terminal + trang admin | KB6: `UPDATE grades` bằng `postgres` → integrity báo lệch → GV nhập lại → sạch | Phát hiện được cả người có quyền DB |
| 8:45–9:30 | TV4 | Slide 9–10 | Kết quả test và trade-off | An toàn hơn phải trả bằng tiện lợi, nhóm đã đo và chọn |

Chuẩn bị trước demo 30 phút:

- [ ] `docker compose down -v && docker compose up -d --build`.
- [ ] Đăng ký MFA sẵn cho `sv01`, `gv01`, `gv02`, `admin` trên điện thoại demo.
- [ ] Mở sẵn: trình duyệt thường (GV), tab ẩn danh (kẻ tấn công), tab admin, Postman, terminal với các lệnh đã gõ sẵn.
- [ ] Video OBS quay toàn bộ demo làm dự phòng nếu máy lỗi.

### 13.8 Tiêu chí hoàn thành

- [ ] Báo cáo đủ 8 chương, mỗi rủi ro trong 13.3 đều trỏ tới ít nhất 1 test case.
- [ ] 8 sơ đồ đã xuất PNG chèn vào báo cáo.
- [ ] Tổng duyệt demo 2 lần, mỗi lần ≤ 10 phút.

## 14. Phân công, lộ trình và checklist nộp bài

**Lộ trình 15 ngày làm việc, 5 mốc kiểm soát; tính năng đóng băng cuối ngày 10, 5 ngày cuối chỉ dành cho kiểm thử, báo cáo và tổng duyệt.** Nếu deadline gần hơn, cắt theo thứ tự ưu tiên ở mục 14.4 thay vì nén thời gian kiểm thử.

&#91;embedded content: lộ trình 15 ngày · 11 hạng mục, 5 mốc kiểm soát\]

Đường găng là Bước 0 → 6 rồi kiểm thử; giao diện và báo cáo chạy song song từ N6 nên không kéo dài tổng thời gian. G2 là mốc cảnh báo sớm: trễ G2 thì cắt phạm vi ngay theo 14.4.

### 14.1 Phân công (nhóm 4 người)

| Thành viên | Vai trò | Phụ trách | Phần demo |
| --- | --- | --- | --- |
| TV1 | Trưởng nhóm, backend xác thực | Bước 1, 3, 9; review mọi Pull Request | Hạ tầng, KB3, KB4, KB5 |
| TV2 | Backend nghiệp vụ và audit | Bước 2, 4, 5 | Luồng bình thường, KB6 |
| TV3 | Security tester, DevOps | Bước 6, 8: script tấn công, chạy test, thu bằng chứng | KB1, KB2 |
| TV4 | Giao diện và tài liệu | Bước 7, 10: sơ đồ, báo cáo, slide | Slide, trade-off |

Nhóm 3 người: TV2 nhận thêm Bước 7, TV3 nhận thêm slide; báo cáo mỗi người viết phần mình code.

### 14.2 Checklist nộp bài (đối chiếu mục 4 của đề)

- [ ] Báo cáo đồ án (PDF), đủ 8 chương theo 13.1.
- [ ] Sơ đồ kiến trúc và 7 sơ đồ còn lại (PNG + file nguồn `.drawio`, `.puml`).
- [ ] Source code: repo GitHub hoặc file `.zip`, kèm `README.md` hướng dẫn `docker compose up`; không chứa `.env`, `node_modules`.
- [ ] Bộ test case + kết quả: bảng 11.2 đã điền Kết quả, thư mục `docs/evidence/`, output `run-tests.mjs`.
- [ ] Slide thuyết trình 12 trang + video demo dự phòng.
- [ ] Kiểm tra đủ 4 câu hỏi Hướng 1 của đề: tài sản (13.2), tác nhân (13.2), rủi ro (13.3), cơ chế (Bước 3–6), xử lý đầu vào giả mạo/tài khoản bị chiếm (7.6, KB1–KB3).
- [ ] Trade-off có cả ngắn hạn và dài hạn (13.4), có ít nhất 2 số liệu đo thật (PL1/PL2, RTO).

### 14.3 Rủi ro của chính dự án

| Rủi ro | Dấu hiệu sớm | Phương án |
| --- | --- | --- |
| Máy thành viên không chạy nổi Docker | `docker run hello-world` lỗi hoặc rất chậm ở Bước 0 | Dùng 1 máy mạnh chung để chạy; máy yếu chỉ code |
| WAF chặn nhầm request hợp lệ | Test Normal trả 403 | Giữ PL1; tạm `DetectionOnly` để xem rule id, rồi điều chỉnh request hoặc thêm exclusion |
| OTP luôn báo sai | `OTP_INVALID` dù nhập đúng | Bật đồng bộ giờ tự động trên máy tính và điện thoại |
| Sửa SQL init mà DB không đổi | Bảng/quyền không như mới sửa | `docker compose down -v` rồi `up` lại |
| Script `.sh` lỗi `\r` trên Windows | `02_roles.sh` báo lỗi cú pháp | `.gitattributes` ở 4.2, lưu file dạng LF trong VS Code |
| Demo live hỏng | Container không lên trước giờ báo cáo | Phát video OBS quay sẵn |
| Trễ tiến độ | Qua mốc G2 mà MFA chưa chạy | Cắt phạm vi theo 14.4 |

### 14.4 Thứ tự cắt phạm vi khi thiếu thời gian

1. Bỏ mã hóa `mfa_secret` (6.7).
2. Bỏ rule tương quan R3, R4 (8.4); giữ cảnh báo theo severity.
3. Giao diện chỉ giữ trang login, MFA, giảng viên; phần admin dùng Postman.
4. Bỏ script tự động `run-tests.mjs`, chạy test bằng Postman Collection.
5. Không được cắt: MFA, session + fingerprint, step-up, ownership, audit hash-chain, phân vùng mạng, bảng 7.6, ma trận rủi ro, trade-off. Đây là phần chấm điểm cốt lõi theo đề.

## Nguồn tham khảo

- [coreruleset/coreruleset – tests/docker-compose.yml](https://github.com/coreruleset/coreruleset/blob/main/tests/docker-compose.yml): image `owasp/modsecurity-crs:nginx`, biến `BACKEND`, `PORT=8080`, `BLOCKING_PARANOIA`, `MODSEC_RULE_ENGINE`.
- [Railway – nginx ModSecurity WAF template](https://railway.com/deploy/nginx-modsecurity-waf.md): biến `ALLOWED_METHODS`, `MODSEC_AUDIT_LOG=/dev/stdout`.
- [Docker Hub – owasp/modsecurity-crs](https://hub.docker.com/r/owasp/modsecurity-crs): các biến thể tag nginx/apache.
- [otplib 13.5.0 README](https://cdn.jsdelivr.net/npm/otplib@13.5.0/README.md): API `generateSecret`, `generateURI`, `generate`, `verify` (async, trả `valid`).
- Đề bài: `Do_an_cuoi_ky_Bao_mat_mang_may_tinh_va_he_thong (1)` trong Project.
