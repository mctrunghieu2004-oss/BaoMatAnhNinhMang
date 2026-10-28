// Bo test case TC01-TC24 (muc 11.2 cua ke hoach).
// Chay tren may host, goi API qua WAF, in bang PASS/FAIL.
//   docker compose down -v && docker compose up -d --build   (doi ~20 giay)
//   cd tests && npm install && node run-tests.mjs
import { generate } from 'otplib';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const BASE = process.env.BASE_URL || 'http://localhost:8080';
const APP_DB_PASSWORD = /APP_DB_PASSWORD=(.*)/.exec(fs.readFileSync(path.join(ROOT, '.env'), 'utf8'))[1].trim();
const PW = (u) => ({ admin: 'Admin@2026demo', gv01: 'Gv01@2026demo', gv02: 'Gv02@2026demo',
                     sv01: 'Sv01@2026demo', sv02: 'Sv02@2026demo', sv03: 'Sv03@2026demo' }[u]);

// Moi Client = 1 "trinh duyet" co cookie + User-Agent rieng
class Client {
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

// Nguoi chay test co quyen van hanh (luong F4) nen doc duoc secret tu DB
const psql = (sql) => execSync(
  `docker compose exec -T db psql -U postgres -d securegrade -tAc "${sql.replace(/\s+/g, ' ').trim()}"`,
  { cwd: ROOT, stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
const secretOf = (u) => psql(`SELECT mfa_secret FROM users WHERE username = '${u}'`);

// Bo dem rate limit nam trong RAM cua app => restart de moi nhom test bat dau sach
async function restartApp() {
  execSync('docker compose restart app', { cwd: ROOT, stdio: 'pipe' });
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(`${BASE}/health`)).ok) return; } catch { /* chua san sang */ }
    await sleep(1000);
  }
  throw new Error('app khong khoi dong lai duoc');
}

// Lay OTP chua tung dung cho user do. Server chap nhan lech +-30 giay nen
// cua so ke tiep cung hop le => thuong khong phai cho 30 giay.
const used = new Map();
async function otp(username, secret) {
  const seen = used.get(username) ?? new Set();
  used.set(username, seen);
  for (let i = 0; i < 40; i++) {
    for (const off of [0, 30]) {
      const t = await generate({ secret, epoch: Math.floor(Date.now() / 1000) + off });
      if (!seen.has(t)) { seen.add(t); return t; }
    }
    await sleep(31_000 - (Date.now() % 30_000));
  }
  throw new Error(`khong lay duoc OTP moi cho ${username}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const results = [];
const check = (id, ok, note = '') => {
  results.push({ id, result: ok ? 'PASS' : 'FAIL', note });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${id} ${note}`);
};
const auditHas = (action) =>
  psql(`SELECT count(*) FROM audit_log WHERE action = '${action}'`) !== '0';

// Dang nhap day du: password -> (enroll lan dau | verify) -> phien mfa_verified
async function loginFull(username, { ua } = {}) {
  const c = new Client(ua);
  let login = await c.call('POST', '/api/auth/login', { username, password: PW(username) });
  if (login.status === 429) {                       // het quota rate limit: reset roi thu lai
    await restartApp();
    login = await c.call('POST', '/api/auth/login', { username, password: PW(username) });
  }
  if (login.status !== 200) throw new Error(`login ${username}: ${login.status} ${login.data.error}`);
  if (login.data.next === 'MFA_ENROLL') {
    const setup = await c.call('POST', '/api/auth/mfa/setup', {});
    if (setup.status !== 200) throw new Error(`setup ${username}: ${setup.status}`);
    const secret = secretOf(username);
    const r = await c.call('POST', '/api/auth/mfa/enable', { otp: await otp(username, secret) });
    if (r.status !== 200) throw new Error(`enable ${username}: ${r.status} ${r.data.error}`);
    return { client: c, secret, enrolled: true };
  }
  const secret = secretOf(username);
  const r = await c.call('POST', '/api/auth/mfa/verify', { otp: await otp(username, secret) });
  if (r.status !== 200) throw new Error(`verify ${username}: ${r.status} ${r.data.error}`);
  return { client: c, secret, enrolled: false };
}

const enrollmentOf = (course, student) => Number(psql(
  `SELECT e.id FROM enrollments e JOIN courses c ON c.id = e.course_id JOIN users u ON u.id = e.student_id
    WHERE c.code = '${course}' AND u.username = '${student}'`));

// ---------------------------------------------------------------- TC01-TC03
// Don trang thai truoc khi chay, de bo test chay lai duoc tren DB da co du lieu
// thay vi bat buoc phai "docker compose down -v" truoc moi lan.
// TC07/TC09 co chu dich khoa tai khoan, nen lan chay sau se gap ACCOUNT_LOCKED.
// last_otp cung phai xoa: lan chay truoc vua dung mot ma, lan nay gap lai
// ma cua cung chu ky 30 giay se bi tu choi OTP_REPLAY.
psql(`UPDATE users SET locked_until = NULL, failed_attempts = 0, mfa_failed = 0,
      last_otp = NULL, last_otp_at = NULL`);
// Rieng sv01: TC01 kiem tra lan dau bat MFA nen phai o trang thai chua enroll.
psql(`UPDATE users SET mfa_enabled = FALSE, mfa_secret = NULL WHERE username = 'sv01'`);
const sv01 = await loginFull('sv01');
check('TC01', sv01.enrolled && auditHas('MFA_ENROLLED'), 'sv01 bat MFA lan dau');

const sv01b = new Client();
await sv01b.call('POST', '/api/auth/login', { username: 'sv01', password: PW('sv01') });
const preMfa = await sv01b.call('GET', '/api/grades/me');
check('TC13', preMfa.status === 401 && preMfa.data.error === 'MFA_REQUIRED', 'token pre-MFA bi tu choi');

const sv01c = await loginFull('sv01');
check('TC02', auditHas('LOGIN_SUCCESS'), 'dang nhap lan sau bang OTP');

const mine = await sv01c.client.call('GET', '/api/grades/me');
check('TC03', mine.status === 200 && Array.isArray(mine.data) && mine.data.length === 2,
  `SV xem duoc ${mine.data.length} mon cua chinh minh`);

const sec401 = Number(psql("SELECT id FROM courses WHERE code = 'SEC401'"));
const net301 = Number(psql("SELECT id FROM courses WHERE code = 'NET301'"));
const r17 = await sv01c.client.call('GET', `/api/courses/${sec401}/grades`);
check('TC17', r17.status === 403 && auditHas('ACCESS_DENIED_ROLE'), 'SV xem bang diem ca lop -> 403');

// ---------------------------------------------------------------- TC04, TC10, TC15, TC16, TC18
const gv01 = await loginFull('gv01');
const enr = enrollmentOf('SEC401', 'sv01');
const enrOther = enrollmentOf('NET301', 'sv01');

const otp04 = await otp('gv01', gv01.secret);
const r04 = await gv01.client.call('PUT', `/api/grades/${enr}`,
  { score: 8.5, reason: 'Nhap diem cuoi ky' }, { 'x-otp': otp04 });
check('TC04', r04.status === 200 && psql(`SELECT score FROM grades WHERE enrollment_id = ${enr}`) === '8.50',
  'GV nhap diem lop minh + step-up OTP');

const r10 = await gv01.client.call('PUT', `/api/grades/${enr}`,
  { score: 9, reason: 'Thu dung lai OTP' }, { 'x-otp': otp04 });
check('TC10', r10.status === 401 && auditHas('STEP_UP_FAIL_REPLAY'), 'dung lai OTP vua dung -> tu choi');

const r15 = await gv01.client.call('PUT', `/api/grades/${enr}`, { score: 9, reason: 'Khong kem OTP' });
check('TC15', r15.status === 401 && r15.data.error === 'STEP_UP_REQUIRED', 'phien hop le nhung thieu OTP');

const r16 = await gv01.client.call('PUT', `/api/grades/${enrOther}`,
  { score: 10, reason: 'Sua diem lop nguoi khac' }, { 'x-otp': await otp('gv01', gv01.secret) });
check('TC16', r16.status === 403 && auditHas('ACCESS_DENIED_IDOR'), 'GV sua diem lop khong phai cua minh');

const r18 = await gv01.client.call('PUT', `/api/grades/${enr}`,
  { score: 15, reason: 'Diem ngoai mien gia tri' }, { 'x-otp': await otp('gv01', gv01.secret) });
check('TC18', r18.status === 400 && auditHas('INPUT_REJECTED'), 'score = 15 -> 400 INPUT_REJECTED');

// ---------------------------------------------------------------- TC14 (KB2)
const stolen = new Client('curl/8.0 (may cua ke tan cong)');
stolen.cookie = gv01.client.cookie;                       // cookie bi danh cap
const r14 = await stolen.call('GET', '/api/me');
check('TC14', r14.status === 401 && r14.data.error === 'SESSION_CONTEXT_MISMATCH' && auditHas('SESSION_CONTEXT_MISMATCH'),
  'cookie dung o thiet bi khac -> thu hoi phien');
const afterRevoke = await gv01.client.call('GET', '/api/me');
check('TC14b', afterRevoke.status === 401 && afterRevoke.data.error === 'SESSION_REVOKED',
  'phien goc cung bi thu hoi sau canh bao');

// ---------------------------------------------------------------- TC11, TC12 (KB3)
const victim = await loginFull('sv02');
const jwtOf = (c) => c.cookie.split('=')[1];
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const [h, p, s] = jwtOf(victim.client).split('.');
const payload = JSON.parse(Buffer.from(p, 'base64url').toString());
payload.role = 'ADMIN';
payload.sub = '1';
for (const [id, token] of [['TC11', [h, b64(payload), s].join('.')],
                           ['TC12', [b64({ alg: 'none', typ: 'JWT' }), b64(payload), ''].join('.')]]) {
  const atk = new Client();
  atk.cookie = `sg_token=${token}`;
  const r = await atk.call('GET', '/api/me');
  check(id, r.status === 401 && r.data.error === 'INVALID_TOKEN' && auditHas('JWT_INVALID'),
    id === 'TC11' ? 'sua payload JWT' : 'JWT alg=none');
}

// ---------------------------------------------------------------- TC06
const oldCookie = sv01c.client.cookie;                    // ke tan cong giu lai cookie truoc khi logout
const out = await sv01c.client.call('POST', '/api/auth/logout', {});
sv01c.client.cookie = oldCookie;                          // bo qua clearCookie, dung lai cookie cu
const afterLogout = await sv01c.client.call('GET', '/api/me');
check('TC06', out.status === 200 && afterLogout.status === 401 && afterLogout.data.error === 'SESSION_REVOKED',
  `logout=${out.status} ${out.data.error ?? ''} / sau do=${afterLogout.status} ${afterLogout.data.error ?? ''}`);

// ---------------------------------------------------------------- TC05, TC22, TC24 (KB6)
const admin = await loginFull('admin');
const int1 = await admin.client.call('GET', '/api/admin/integrity');
check('TC05', int1.status === 200 && int1.data.chain.broken.length === 0 && int1.data.grades.length === 0,
  `chuoi hash ${int1.data.chain.total} dong, khong vi pham`);

psql(`UPDATE grades SET score = 10 WHERE enrollment_id = ${enr}`);     // insider sua thang trong DB
const int2 = await admin.client.call('GET', '/api/admin/integrity');
check('TC22', int2.data.grades.some((g) => g.enrollmentId === enr && g.dbScore === 10 && g.loggedScore === 8.5),
  'sua diem thang trong DB -> phat hien lech so voi log');
psql(`UPDATE grades SET score = 8.5 WHERE enrollment_id = ${enr}`);    // tra lai hien trang

const target = psql("SELECT id FROM audit_log ORDER BY id LIMIT 1 OFFSET 2");
psql(`UPDATE audit_log SET action = 'X' WHERE id = ${target}`);        // sua 1 dong log bang superuser
const int3 = await admin.client.call('GET', '/api/admin/integrity');
check('TC24', int3.data.chain.broken.includes(Number(target)), `sua audit id ${target} -> dut chuoi hash`);
psql(`UPDATE audit_log SET action = 'LOGIN_PASSWORD_OK' WHERE id = ${target} AND action = 'X'`);

// ---------------------------------------------------------------- TC23 (least privilege)
const asAppUser = (sql) => execSync(
  `docker compose exec -T -e PGPASSWORD=${APP_DB_PASSWORD} db ` +
  `psql -U app_user -h 127.0.0.1 -d securegrade -v ON_ERROR_STOP=1 -c "${sql}"`,
  { cwd: ROOT, stdio: 'pipe' });
const refused = (sql) => { try { asAppUser(sql); return false; } catch { return true; } };
check('TC23', refused('DELETE FROM audit_log') && refused('UPDATE audit_log SET action = \'x\'')
           && refused('DELETE FROM grades') && refused('DROP TABLE grades')
           && !refused('SELECT count(*) FROM users'),
  'app_user bi tu choi 4 lenh pha hoai, van SELECT duoc');

// ---------------------------------------------------------------- TC19, TC20 (WAF)
const sqli = await fetch(`${BASE}/api/grades/me?q=${encodeURIComponent("1' UNION SELECT password_hash FROM users--")}`);
check('TC19', sqli.status === 403, `SQLi qua WAF -> ${sqli.status}`);
const xss = await fetch(`${BASE}/api/grades/1`, {
  method: 'PUT', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ score: 8, reason: '<script>alert(document.cookie)</script>' }) });
check('TC20', xss.status === 403, `XSS trong body -> ${xss.status}`);

// ---------------------------------------------------------------- TC21 (segmentation)
// Khong thu ket noi toi localhost:3000 nua. Mot tien trinh khac tren may co the
// dang chiem cong do (da gap: dev server Vite cua du an khac) -> ket noi thanh
// cong ma khong phai app cua minh, test bao FAIL oan. Cung loai bay voi
// PostgreSQL 17 cai san o muc 4.3.1 cua bao cao. Hoi thang Docker moi la bang
// chung dung: khong co anh xa port thi khong co duong vao tu host.
// Cot PORTS cua waf co dang "0.0.0.0:8080->8080/tcp"; cua app chi la "3000/tcp".
// Dau "->" chinh la anh xa ra host, khong co no thi khong vao duoc tu ngoai.
const ports = (svc) => execSync(`docker compose ps --format "{{.Ports}}" ${svc}`,
  { cwd: ROOT, stdio: 'pipe' }).toString().trim();
check('TC21', !ports('app').includes('->') && !ports('db').includes('->') && ports('waf').includes('->'),
  'chi waf anh xa port ra host, app va db thi khong');

// ---------------------------------------------------------------- TC09 (KB1): khoa gv02
await restartApp();
const gv02 = new Client();
await gv02.call('POST', '/api/auth/login', { username: 'gv02', password: PW('gv02') });
let mfaLocked = false;
for (let i = 0; i < 3; i++) {
  const r = await gv02.call('POST', '/api/auth/mfa/verify', { otp: '000000' });
  mfaLocked = r.status === 423;
}
check('TC09', mfaLocked && auditHas('MFA_FAIL_THRESHOLD'), 'mat khau dung + 3 lan OTP sai -> khoa, canh bao HIGH');

// ---------------------------------------------------------------- TC07: brute force sv03
await restartApp();
const bf = new Client();
let lockedStatus = 0;
for (let i = 0; i < 5; i++) await bf.call('POST', '/api/auth/login', { username: 'sv03', password: 'sai' });
lockedStatus = (await bf.call('POST', '/api/auth/login', { username: 'sv03', password: PW('sv03') })).status;
check('TC07', lockedStatus === 423 && auditHas('ACCOUNT_LOCKED'), 'sai 5 lan -> khoa, lan 6 dung mat khau van 423');

// ---------------------------------------------------------------- TC08: rate limit (chay cuoi cung)
await restartApp();
const rl = new Client();
let last = 0;
for (let i = 0; i < 12; i++) last = (await rl.call('POST', '/api/auth/login', { username: 'sv02', password: 'sai' })).status;
check('TC08', last === 429 && auditHas('RATE_LIMITED'), 'qua 10 lan login/15 phut -> 429');

console.table(results);
const failed = results.filter((r) => r.result === 'FAIL');
console.log(`\n${results.length - failed.length}/${results.length} PASS`);
process.exit(failed.length ? 1 : 0);
