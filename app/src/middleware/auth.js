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

    let claims;                                   // Lop 1: chu ky + thuat toan + iss/aud/exp
    try {
      claims = jwt.verify(token, config.jwtSecret, {
        algorithms: ['HS256'], issuer: config.issuer, audience: config.audience,
      });
    } catch (e) {
      await logEvent({ action: 'JWT_INVALID', detail: { reason: e.message }, ip: req.ip, severity: 'HIGH' });
      return deny(res, 401, 'INVALID_TOKEN');
    }
    if (!UUID.test(claims.sid ?? '')) return deny(res, 401, 'INVALID_TOKEN');

    const { rows } = await pool.query(           // Lop 2: session phai ton tai trong DB
      `SELECT s.*, u.username, u.role, u.is_active, u.mfa_secret, u.mfa_enabled, u.last_otp, u.last_otp_at
         FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = $1`, [claims.sid]);
    const s = rows[0];
    if (!s || String(s.user_id) !== claims.sub) {
      await logEvent({ action: 'SESSION_UNKNOWN', detail: { sid: claims.sid }, ip: req.ip, severity: 'CRITICAL' });
      return deny(res, 401, 'INVALID_SESSION');  // chu ky dung ma sid la => nghi lo JWT_SECRET
    }
    if (s.revoked_at) return deny(res, 401, 'SESSION_REVOKED');
    if (new Date(s.expires_at) < new Date()) return deny(res, 401, 'SESSION_EXPIRED');
    if (!s.is_active) return deny(res, 403, 'ACCOUNT_DISABLED');

    if (s.fingerprint !== fingerprint(req)) {    // Lop 3: dung ngu canh thiet bi
      await pool.query(`UPDATE sessions SET revoked_at = now(), revoke_reason = 'CONTEXT_MISMATCH' WHERE id = $1`, [s.id]);
      await logEvent({ actorId: s.user_id, action: 'SESSION_CONTEXT_MISMATCH', target: `session:${s.id}`,
                       detail: { ua: req.get('user-agent') }, ip: req.ip, severity: 'CRITICAL' });
      return deny(res, 401, 'SESSION_CONTEXT_MISMATCH');
    }
    if (!s.mfa_verified && !allowPreMfa) return deny(res, 401, 'MFA_REQUIRED');  // Lop 4

    // Role lay tu DB, KHONG lay tu claim trong token
    req.user = { id: s.user_id, username: s.username, role: s.role, mfaVerified: s.mfa_verified,
                 sessionId: s.id, mfa_secret: s.mfa_secret, mfa_enabled: s.mfa_enabled,
                 last_otp: s.last_otp, last_otp_at: s.last_otp_at };
    next();
  };
}
