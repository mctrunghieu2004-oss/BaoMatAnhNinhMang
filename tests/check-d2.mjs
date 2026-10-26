// Kiem chung luong D2: tu host co ket noi duoc vao DB cua container khong?
//   node tests/check-d2.mjs
//
// Luu y: tren may co cai san PostgreSQL cho Windows, cong 5432 van LISTENING,
// nhung do la server khac. Script nay thu ket noi dung vao database 'securegrade'
// de phan biet hai truong hop.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const ROOT = path.resolve(import.meta.dirname, '..');
const require = createRequire(path.join(ROOT, 'app', 'package.json'));
const pg = require('pg');

const env = Object.fromEntries(
  fs.readFileSync(path.join(ROOT, '.env'), 'utf8')
    .split('\n').filter((l) => l.includes('=')).map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }));

const targets = [
  ['app_user  -> securegrade', 'app_user', env.APP_DB_PASSWORD],
  ['postgres  -> securegrade', 'postgres', env.POSTGRES_PASSWORD],
];

for (const [label, user, password] of targets) {
  const client = new pg.Client({
    host: '127.0.0.1', port: 5432, database: 'securegrade',
    user, password, connectionTimeoutMillis: 5000,
  });
  try {
    await client.connect();
    const { rows } = await client.query('SELECT current_database(), count(*) FROM users');
    console.log(`${label} => KET NOI DUOC (!)`, rows[0]);
    await client.end();
  } catch (e) {
    console.log(`${label} => TU CHOI: [${e.code ?? '-'}] ${e.message}`);
  }
}
