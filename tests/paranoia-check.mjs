// Do false positive cua WAF theo Paranoia Level (muc 9.5 cua ke hoach).
// Gui cac request HOP LE; moi ma 403 la mot false positive cua WAF.
//   docker compose up -d waf          (sau khi doi BLOCKING_PARANOIA trong docker-compose.yml)
//   node tests/paranoia-check.mjs
const BASE = process.env.BASE_URL || 'http://localhost:8080';

const legit = [
  ['GET  /health', 'GET', '/health'],
  ['GET  /login.html', 'GET', '/login.html'],
  ['GET  /js/api.js', 'GET', '/js/api.js'],
  ['GET  /api/grades/me', 'GET', '/api/grades/me'],
  ['GET  /api/courses/mine', 'GET', '/api/courses/mine'],
  ['POST login mat khau co @', 'POST', '/api/auth/login', { username: 'gv01', password: 'Gv01@2026demo' }],
  ['POST login mat khau co ky tu dac biet', 'POST', '/api/auth/login', { username: 'gv01', password: 'A#b$c%d&e*1!' }],
  ['POST otp 6 so', 'POST', '/api/auth/mfa/verify', { otp: '123456' }],
  ['PUT  diem + ly do tieng Viet', 'PUT', '/api/grades/1', { score: 8.5, reason: 'Nhap diem cuoi ky hoc phan' }],
  ['PUT  ly do co dau nhay', 'PUT', '/api/grades/1', { score: 7, reason: "Sinh vien bo sung bai 'thuc hanh 3'" }],
  ['PUT  ly do co dau ;', 'PUT', '/api/grades/1', { score: 7, reason: 'Cham lai bai 2; cong 0.5 diem' }],
  ['PUT  ly do co ngoac', 'PUT', '/api/grades/1', { score: 9, reason: 'Diem thi (lan 2) sau phuc khao' }],
  ['PUT  ly do co dau gach ngang', 'PUT', '/api/grades/1', { score: 6, reason: 'Thieu bai -- da nop bu' }],
  ['PUT  ly do co dau tieng Viet', 'PUT', '/api/grades/1', { score: 8, reason: 'Điểm cuối kỳ môn bảo mật' }],
  ['POST logout', 'POST', '/api/auth/logout', {}],
];

const rows = [];
for (const [name, method, path, body] of legit) {
  const r = await fetch(BASE + path, {
    method,
    headers: { 'content-type': 'application/json', 'user-agent': 'Mozilla/5.0 (sg-normal-browser)' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  rows.push({ request: name, status: r.status, falsePositive: r.status === 403 ? 'CO' : '' });
}
console.table(rows);
const fp = rows.filter((r) => r.falsePositive === 'CO');
console.log(`Tong ${rows.length} request hop le, ${fp.length} bi WAF chan (false positive).`);
for (const r of fp) console.log(`  - ${r.request}`);
