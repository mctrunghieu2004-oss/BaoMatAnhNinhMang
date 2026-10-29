// Dua he thong ve trang thai chuan truoc moi luot demo / tong duyet.
//
//   node scripts/reset-demo.mjs
//
// Lam 3 viec:
//   1. Mo khoa moi tai khoan, xoa bo dem sai mat khau / sai OTP
//   2. Restart app de reset bo dem rate limit (10 login / 15 phut / IP)
//   3. Dua diem enrollment 1 (sv01 - SEC401) ve 8.50 QUA APP, khong sua thang DB
//
// Buoc 3 phai di qua app chu khong phai UPDATE thang vao DB: neu sua thang DB
// thi diem va audit log lech nhau, tab "Kiem tra toan ven" bao vi pham ngay
// truoc khi demo bat dau, va man KB6 mat sach tinh bat ngo.

import { execSync, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const BASE = process.env.BASE_URL || 'http://localhost:8080';
const { generate } = createRequire(path.join(ROOT, 'app', 'package.json'))('otplib');

const DIEM_CHUAN = '8.50';
const ENROLLMENT = 1;

const psql = (sql) => execFileSync('docker', [
  'compose', 'exec', '-T', 'db', 'psql', '-U', 'postgres', '-d', 'securegrade',
  '-tAc', sql.replace(/\s+/g, ' ').trim(),
], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class Client {
  constructor(ua = 'sg-reset') { this.ua = ua; this.cookie = ''; }
  async call(method, p, body, headers = {}) {
    const r = await fetch(BASE + p, {
      method,
      headers: { 'content-type': 'application/json', 'user-agent': this.ua, cookie: this.cookie, ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const c = r.headers.getSetCookie().find((x) => x.startsWith('sg_token='));
    if (c) this.cookie = c.split(';')[0];
    return { status: r.status, data: await r.json().catch(() => ({})) };
  }
}

// Moi ma OTP chi dung duoc mot lan trong 90 giay, ke ca khi request bi tu choi.
// Server chap nhan lech +-30 giay nen cua so ke tiep cung hop le => thuong
// khong phai cho het 30 giay giua hai lan dung.
const daDung = new Set();
async function otpMoi(secret) {
  for (let i = 0; i < 10; i++) {
    for (const off of [0, 30]) {
      const t = await generate({ secret, epoch: Math.floor(Date.now() / 1000) + off });
      if (!daDung.has(t)) { daDung.add(t); return t; }
    }
    await sleep(31_000 - (Date.now() % 30_000));
  }
  throw new Error('khong lay duoc OTP moi cho gv01');
}

async function choHealth() {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(`${BASE}/health`)).ok) return; } catch { /* chua san sang */ }
    await sleep(1000);
  }
  throw new Error('app khong tra loi /health');
}

const buoc = (n, s) => console.log(`[${n}/4] ${s}`);

buoc(1, 'Mo khoa tai khoan, xoa bo dem sai mat khau va sai OTP');
psql(`UPDATE users SET locked_until = NULL, failed_attempts = 0, mfa_failed = 0,
      last_otp = NULL, last_otp_at = NULL`);

buoc(2, 'Restart app de reset bo dem rate limit');
execSync('docker compose restart app', { cwd: ROOT, stdio: 'pipe' });
await choHealth();

buoc(3, `Dua diem enrollment ${ENROLLMENT} ve ${DIEM_CHUAN} qua app`);
const hienTai = psql(`SELECT score FROM grades WHERE enrollment_id = ${ENROLLMENT}`);
if (hienTai === DIEM_CHUAN) {
  console.log(`      da la ${DIEM_CHUAN}, khong phai sua`);
} else {
  const secret = psql(`SELECT mfa_secret FROM users WHERE username = 'gv01'`);
  if (!secret) throw new Error('gv01 chua bat MFA — dang nhap mot lan tren trinh duyet de quet QR truoc');

  const gv = new Client();
  const dn = await gv.call('POST', '/api/auth/login', { username: 'gv01', password: 'Gv01@2026demo' });
  if (dn.status !== 200) throw new Error(`login gv01: ${dn.status} ${dn.data.error}`);
  const xm = await gv.call('POST', '/api/auth/mfa/verify', { otp: await otpMoi(secret) });
  if (xm.status !== 200) throw new Error(`verify gv01: ${xm.status} ${xm.data.error}`);

  const r = await gv.call('PUT', `/api/grades/${ENROLLMENT}`,
    { score: Number(DIEM_CHUAN), reason: 'Khoi phuc diem chuan truoc buoi demo' },
    { 'x-otp': await otpMoi(secret) });
  if (r.status !== 200) throw new Error(`sua diem: ${r.status} ${r.data.error}`);
  console.log(`      ${hienTai} -> ${DIEM_CHUAN}`);
}

buoc(4, 'Kiem tra lai');
const diem = psql(`SELECT g.enrollment_id || ' = ' || g.score FROM grades g ORDER BY 1`);
const khoa = psql(`SELECT count(*) FROM users WHERE locked_until > now()`);
console.log(`      diem: ${diem.split('\n').join('  |  ')}`);
console.log(`      tai khoan dang bi khoa: ${khoa}`);
console.log('\nSan sang demo. Mo tab admin -> "Kiem tra toan ven" de xac nhan sach.');
