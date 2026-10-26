// Kiem chung ma tran quyen cua app_user (TC23).
//   node tests/check-least-privilege.mjs
// Doc mat khau tu .env, khong truyen secret qua dong lenh.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const pw = /APP_DB_PASSWORD=(.*)/.exec(fs.readFileSync(path.join(ROOT, '.env'), 'utf8'))[1].trim();

const cases = [
  ['DELETE FROM audit_log',                       'TU CHOI'],
  ["UPDATE audit_log SET action = 'x'",           'TU CHOI'],
  ['DELETE FROM grades',                          'TU CHOI'],
  ['DROP TABLE grades',                           'TU CHOI'],
  ['INSERT INTO courses (code, name, lecturer_id) VALUES (\'X\',\'X\',1)', 'TU CHOI'],
  ['SELECT count(*) FROM users',                  'CHAY DUOC'],
  ['SELECT count(*) FROM audit_log',              'CHAY DUOC'],
];

const run = (sql) => execFileSync('docker', [
  'compose', 'exec', '-T', '-e', `PGPASSWORD=${pw}`, 'db',
  'psql', '-U', 'app_user', '-h', '127.0.0.1', '-d', 'securegrade',
  '-v', 'ON_ERROR_STOP=1', '-tAc', sql,
], { cwd: ROOT, stdio: 'pipe' });

let ok = 0;
for (const [sql, expect] of cases) {
  let actual, detail;
  try {
    detail = run(sql).toString().trim();
    actual = 'CHAY DUOC';
  } catch (e) {
    actual = 'TU CHOI';
    detail = (e.stderr?.toString() ?? '').split('\n').find((l) => l.includes('ERROR')) ?? '';
  }
  const pass = actual === expect;
  if (pass) ok++;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${sql.padEnd(62)} -> ${actual.padEnd(10)} ${detail}`);
}
console.log(`\n${ok}/${cases.length} dung ky vong`);
process.exit(ok === cases.length ? 0 : 1);
