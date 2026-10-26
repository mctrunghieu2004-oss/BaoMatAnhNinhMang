// Chay BEN TRONG container app de bo qua WAF: chung minh defense-in-depth.
//   docker compose cp tests/attacks/sqli-direct.mjs app:/tmp/sqli-direct.mjs
//   docker compose exec app node /tmp/sqli-direct.mjs      (Git Bash: them MSYS_NO_PATHCONV=1)
const payloads = ["' OR '1'='1' --", "admin'--", "x'; DROP TABLE grades; --"];
for (const username of payloads) {
  const r = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password: 'x' }),
  });
  console.log(r.status, await r.text(), '<=', username); // ky vong: 401 INVALID_CREDENTIALS
}
