// In ma OTP hien tai cua mot tai khoan, doc mfa_secret thang tu DB.
//
//   node scripts/otp.mjs gv01
//   node scripts/otp.mjs            -> in cho ca 6 tai khoan demo
//
// Dung khi tong duyet demo ma khong co dien thoai ben canh, hoac khi may
// chieu khong tien giơ dien thoai len. Day chinh la luong F4 trong bao cao:
// nguoi van hanh co quyen tren DB thi doc duoc mfa_secret -> day la mot han
// che da ghi nhan o muc 8.2 (mfa_secret luu dang ro), khong phai lo hong moi.
//
// Luu y: moi ma chi dung duoc MOT lan trong 90 giay (chong replay). Neu vua
// dung ma nay de dang nhap thi phai cho sang chu ky 30 giay sau moi sua diem.
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const { generate } = createRequire(path.join(ROOT, 'app', 'package.json'))('otplib');

const sql = (q) => execFileSync('docker', [
  'compose', 'exec', '-T', 'db', 'psql', '-U', 'postgres', '-d', 'securegrade',
  '-tAF', '\t', '-c', q,
], { cwd: ROOT, stdio: ['ignore', 'pipe', 'inherit'] }).toString().trim();

const who = process.argv[2];
const rows = sql(
  `SELECT username, mfa_enabled, COALESCE(mfa_secret, '') FROM users`
  + (who ? ` WHERE username = '${who.replace(/'/g, "''")}'` : '')
  + ` ORDER BY id`,
).split('\n').filter(Boolean).map((l) => l.split('\t'));

if (!rows.length) {
  console.error(`Khong co tai khoan nao ten "${who}".`);
  process.exit(1);
}

// Dem nguoc toi khi ma doi, de biet con bao lau truoc khi phai nhap lai
const left = 30 - (Math.floor(Date.now() / 1000) % 30);
console.log(`Ma con hieu luc ${left} giay nua.\n`);

for (const [username, enabled, secret] of rows) {
  if (!secret) {
    console.log(`${username.padEnd(6)}  chua co mfa_secret - dang nhap mot lan de hien ma QR`);
    continue;
  }
  const code = await generate({ secret });
  const note = enabled === 't' ? '' : '  (chua bat MFA: nhap ma nay o trang QR de bat)';
  console.log(`${username.padEnd(6)}  ${code}${note}`);
}
