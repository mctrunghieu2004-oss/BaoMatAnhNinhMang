// Sinh lai secret trong .env va dong bo voi database dang chay.
//   node scripts/rotate-secrets.mjs
//
// Dung khi:
//   - .env bi mat hoac bi ghi de (app bao "JWT_SECRET missing or too short")
//   - Nghi lo JWT_SECRET: thay secret moi -> moi token cu mat hieu luc ngay
//     (runbook muc E cua bao cao)
//
// Giu nguyen du lieu trong DB. Chi doi mat khau cua role app_user cho khop
// voi .env moi, nen khong can xoa volume va khong mat audit log.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const ENV = path.join(ROOT, '.env');

// Mat khau DB chi dung chu va so: dau nháy don lam hong script 02_roles.sh
const hex = (n) => crypto.randomBytes(n).toString('hex');
const next = {
  POSTGRES_PASSWORD: hex(12),
  APP_DB_PASSWORD: hex(12),
  JWT_SECRET: hex(48),          // 96 ky tu, vuot nguong 64 cua config.js
};

if (fs.existsSync(ENV)) {
  fs.copyFileSync(ENV, `${ENV}.bak`);
  console.log('Da sao luu .env cu -> .env.bak');
}
fs.writeFileSync(ENV, Object.entries(next).map(([k, v]) => `${k}=${v}`).join('\n') + '\n');
console.log('Da ghi .env moi:');
for (const [k, v] of Object.entries(next)) console.log(`  ${k} = ${v.length} ky tu`);

// Doi mat khau app_user trong DB cho khop. Dua SQL qua stdin voi bien :'pw'
// (psql chi thay the bien trong file/stdin, khong thay the trong tham so -c).
const psql = (role, pw) => execFileSync('docker', [
  'compose', 'exec', '-T', 'db', 'psql', '-U', 'postgres', '-d', 'securegrade',
  '-v', 'ON_ERROR_STOP=1', '-v', `pw=${pw}`, '-f', '-',
], { cwd: ROOT, input: `ALTER ROLE ${role} PASSWORD :'pw';\n`, stdio: ['pipe', 'pipe', 'inherit'] })
  .toString().trim();

try {
  psql('app_user', next.APP_DB_PASSWORD);
  psql('postgres', next.POSTGRES_PASSWORD);
  console.log('Da dong bo mat khau app_user va postgres trong DB.');
} catch {
  console.log('\nKHONG dong bo duoc voi DB (container db chua chay?).');
  console.log('Neu DB chua tung khoi tao, chi can: docker compose down -v && docker compose up -d --build');
  process.exit(1);
}

console.log('\nBuoc tiep theo: docker compose up -d app');
console.log('Moi phien dang nhap cu se mat hieu luc vi JWT_SECRET da doi.');
