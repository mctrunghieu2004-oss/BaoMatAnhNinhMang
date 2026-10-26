import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { loginLimiter } from '../middleware/limits.js';
import { newSecret, qrFor, checkOtp, fingerprint } from '../services/otp.js';
import { logEvent } from '../services/audit.js';

export const router = Router();
const DUMMY_HASH = bcrypt.hashSync('timing-equalizer', 12); // chong do username qua thoi gian phan hoi

async function issueSession(req, res, userId, mfaVerified) {
  const ttl = mfaVerified ? config.sessionTtlSec : config.preMfaTtlSec;
  const { rows } = await pool.query(
    `INSERT INTO sessions (user_id, fingerprint, mfa_verified, expires_at)
     VALUES ($1, $2, $3, now() + make_interval(secs => $4)) RETURNING id`,
    [userId, fingerprint(req), mfaVerified, ttl]);
  const token = jwt.sign({ sid: rows[0].id, mfa: mfaVerified }, config.jwtSecret, {
    algorithm: 'HS256', expiresIn: ttl, subject: String(userId),
    issuer: config.issuer, audience: config.audience,
  });
  res.cookie('sg_token', token, { httpOnly: true, sameSite: 'strict', secure: false, // true khi co HTTPS
                                   maxAge: ttl * 1000, path: '/' });
}

const revoke = (sid, reason) =>
  pool.query('UPDATE sessions SET revoked_at = now(), revoke_reason = $2 WHERE id = $1', [sid, reason]);

router.post('/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body ?? {};
  if (typeof username !== 'string' || typeof password !== 'string' || username.length > 50 || password.length > 128)
    return res.status(400).json({ error: 'INVALID_INPUT' });

  const { rows: [user] } = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
  const ok = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);

  if (user?.locked_until && new Date(user.locked_until) > new Date()) {
    await logEvent({ actorId: user.id, action: 'LOGIN_WHILE_LOCKED', ip: req.ip, severity: 'WARN' });
    return res.status(423).json({ error: 'ACCOUNT_LOCKED' });
  }
  if (!user || !ok || !user.is_active) {
    if (user) {
      const { rows: [u] } = await pool.query(
        `UPDATE users SET failed_attempts = failed_attempts + 1,
           locked_until = CASE WHEN failed_attempts + 1 >= $2 THEN now() + make_interval(mins => $3) END
         WHERE id = $1 RETURNING failed_attempts`, [user.id, config.maxLoginFail, config.lockMinutes]);
      const locked = u.failed_attempts >= config.maxLoginFail;
      await logEvent({ actorId: user.id, action: locked ? 'ACCOUNT_LOCKED' : 'LOGIN_FAIL',
                       ip: req.ip, severity: locked ? 'HIGH' : 'WARN' });
    } else {
      await logEvent({ action: 'LOGIN_FAIL_UNKNOWN_USER', detail: { username }, ip: req.ip, severity: 'WARN' });
    }
    return res.status(401).json({ error: 'INVALID_CREDENTIALS' }); // cung 1 thong bao cho moi truong hop
  }

  await pool.query('UPDATE users SET failed_attempts = 0 WHERE id = $1', [user.id]);
  await issueSession(req, res, user.id, false);
  await logEvent({ actorId: user.id, action: 'LOGIN_PASSWORD_OK', ip: req.ip });
  res.json({ next: user.mfa_enabled ? 'MFA_VERIFY' : 'MFA_ENROLL' });
});

router.post('/mfa/setup', requireAuth({ allowPreMfa: true }), async (req, res) => {
  if (req.user.mfa_enabled) return res.status(409).json({ error: 'MFA_ALREADY_ENABLED' });
  const secret = newSecret();
  await pool.query('UPDATE users SET mfa_secret = $1 WHERE id = $2', [secret, req.user.id]);
  res.json({ qr: await qrFor(req.user.username, secret, config.totpIssuer) });
});

router.post('/mfa/enable', requireAuth({ allowPreMfa: true }), async (req, res) => {
  if (req.user.mfa_enabled) return res.status(409).json({ error: 'MFA_ALREADY_ENABLED' });
  // doc lai secret vua luu o /mfa/setup
  const { rows: [u] } = await pool.query(
    'SELECT id, mfa_secret, last_otp, last_otp_at FROM users WHERE id = $1', [req.user.id]);
  if (!u.mfa_secret) return res.status(409).json({ error: 'MFA_SETUP_REQUIRED' });
  if (await checkOtp(u, req.body?.otp) !== 'OK') {
    await logEvent({ actorId: req.user.id, action: 'MFA_ENROLL_FAIL', ip: req.ip, severity: 'WARN' });
    return res.status(401).json({ error: 'OTP_INVALID' });
  }
  await pool.query('UPDATE users SET mfa_enabled = TRUE, mfa_failed = 0 WHERE id = $1', [req.user.id]);
  await logEvent({ actorId: req.user.id, action: 'MFA_ENROLLED', ip: req.ip });
  await revoke(req.user.sessionId, 'UPGRADED');
  await issueSession(req, res, req.user.id, true);
  res.json({ ok: true, role: req.user.role });
});

router.post('/mfa/verify', requireAuth({ allowPreMfa: true }), async (req, res) => {
  const result = await checkOtp(req.user, req.body?.otp);
  if (result !== 'OK') {
    const { rows: [u] } = await pool.query(
      `UPDATE users SET mfa_failed = mfa_failed + 1,
         locked_until = CASE WHEN mfa_failed + 1 >= $2 THEN now() + make_interval(mins => $3) END
       WHERE id = $1 RETURNING mfa_failed`, [req.user.id, config.maxMfaFail, config.lockMinutes]);
    const suspect = u.mfa_failed >= config.maxMfaFail;
    await logEvent({ actorId: req.user.id, action: suspect ? 'MFA_FAIL_THRESHOLD' : `MFA_FAIL_${result}`,
                     detail: suspect ? { note: 'Password dung nhung OTP sai lien tuc - nghi lo mat khau' } : null,
                     ip: req.ip, severity: suspect ? 'HIGH' : 'WARN' });
    if (suspect) await revoke(req.user.sessionId, 'MFA_FAIL_THRESHOLD');
    return res.status(suspect ? 423 : 401).json({ error: suspect ? 'ACCOUNT_LOCKED' : `OTP_${result}` });
  }
  await pool.query('UPDATE users SET mfa_failed = 0 WHERE id = $1', [req.user.id]);
  await revoke(req.user.sessionId, 'UPGRADED');        // chong session fixation
  await issueSession(req, res, req.user.id, true);
  await logEvent({ actorId: req.user.id, action: 'LOGIN_SUCCESS', ip: req.ip });
  res.json({ ok: true, role: req.user.role });
});

router.post('/logout', requireAuth({ allowPreMfa: true }), async (req, res) => {
  await revoke(req.user.sessionId, 'LOGOUT');
  await logEvent({ actorId: req.user.id, action: 'LOGOUT', ip: req.ip });
  res.clearCookie('sg_token', { path: '/' });
  res.json({ ok: true });
});
