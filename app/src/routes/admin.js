import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { requireStepUp } from '../middleware/stepUp.js';
import { logEvent } from '../services/audit.js';
import { verifyChain, reconcileGrades } from '../services/integrity.js';

export const router = Router();
router.use(requireAuth(), requireRole('ADMIN'));

router.get('/alerts', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, ts, actor_id, action, target, detail, ip, severity FROM audit_log
      WHERE severity IN ('HIGH','CRITICAL') ORDER BY id DESC LIMIT 100`);
  res.json(rows);
});

router.get('/audit', async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
  const { rows } = await pool.query(
    `SELECT id, ts, actor_id, action, target, detail, ip, severity, prev_hash, hash
       FROM audit_log ORDER BY id DESC LIMIT $1`, [limit]);
  res.json(rows);
});

router.get('/integrity', async (req, res) => {
  const [chain, grades] = await Promise.all([verifyChain(), reconcileGrades()]);
  if (chain.broken.length || grades.length) {
    await logEvent({ actorId: req.user.id, action: 'INTEGRITY_VIOLATION', target: 'audit_log+grades',
                     detail: { broken: chain.broken, grades }, ip: req.ip, severity: 'CRITICAL' });
  }
  res.json({ chain, grades });
});

router.get('/users', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, username, full_name, role, mfa_enabled, failed_attempts, mfa_failed, locked_until, is_active
       FROM users ORDER BY id`);
  res.json(rows);
});

// Moi thao tac phan ung su co: ADMIN + step-up OTP + mot dong audit HIGH
const incidentAction = (run, auditAction) => async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'INVALID_INPUT' });
  const { rowCount } = await run(id);
  await logEvent({ actorId: req.user.id, action: auditAction, target: `user:${id}`,
                   ip: req.ip, severity: 'HIGH' });
  res.json({ ok: true, affected: rowCount });
};

const revokeAll = (id) => pool.query(
  `UPDATE sessions SET revoked_at = now(), revoke_reason = 'ADMIN_REVOKE'
    WHERE user_id = $1 AND revoked_at IS NULL`, [id]);

router.post('/users/:id/revoke-sessions', requireStepUp,
  incidentAction(revokeAll, 'ADMIN_REVOKE_SESSIONS'));

router.post('/users/:id/reset-mfa', requireStepUp, incidentAction(async (id) => {
  const r = await pool.query(
    `UPDATE users SET mfa_enabled = FALSE, mfa_secret = NULL, last_otp = NULL, mfa_failed = 0
      WHERE id = $1`, [id]);
  await revokeAll(id);
  return r;
}, 'ADMIN_RESET_MFA'));

router.post('/users/:id/unlock', requireStepUp, incidentAction((id) => pool.query(
  `UPDATE users SET failed_attempts = 0, mfa_failed = 0, locked_until = NULL WHERE id = $1`, [id]),
  'ADMIN_UNLOCK'));
