import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { requireStepUp } from '../middleware/stepUp.js';
import { logEvent } from '../services/audit.js';

export const router = Router();
const twoDecimals = (n) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-9;
const num = (v) => (v === null || v === undefined ? null : Number(v));

router.get('/me', requireAuth(), (req, res) =>
  res.json({ id: req.user.id, username: req.user.username, role: req.user.role }));

// student_id lay tu session, khong nhan tu client
router.get('/grades/me', requireAuth(), requireRole('STUDENT'), async (req, res) => {
  const { rows } = await pool.query(
    `SELECT c.code, c.name, e.id AS enrollment_id, g.score, g.updated_at
       FROM enrollments e JOIN courses c ON c.id = e.course_id
       LEFT JOIN grades g ON g.enrollment_id = e.id
      WHERE e.student_id = $1 ORDER BY c.code`, [req.user.id]);
  res.json(rows.map((r) => ({ ...r, score: num(r.score) })));
});

router.get('/courses/mine', requireAuth(), requireRole('LECTURER'), async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, code, name FROM courses WHERE lecturer_id = $1 ORDER BY code', [req.user.id]);
  res.json(rows);
});

router.get('/courses/:id/grades', requireAuth(), requireRole('LECTURER', 'ADMIN'), async (req, res) => {
  const courseId = Number(req.params.id);
  if (!Number.isInteger(courseId)) return res.status(400).json({ error: 'INVALID_INPUT' });
  const { rows: [course] } = await pool.query('SELECT id, lecturer_id FROM courses WHERE id = $1', [courseId]);
  if (!course) return res.status(404).json({ error: 'NOT_FOUND' });
  if (req.user.role === 'LECTURER' && course.lecturer_id !== req.user.id) {   // ownership (chong IDOR)
    await logEvent({ actorId: req.user.id, action: 'ACCESS_DENIED_IDOR', target: `course:${courseId}`,
                     ip: req.ip, severity: 'HIGH' });
    return res.status(403).json({ error: 'FORBIDDEN' });
  }
  const { rows } = await pool.query(
    `SELECT e.id AS enrollment_id, u.username, u.full_name, g.score, g.updated_at
       FROM enrollments e JOIN users u ON u.id = e.student_id
       LEFT JOIN grades g ON g.enrollment_id = e.id
      WHERE e.course_id = $1 ORDER BY u.username`, [courseId]);
  res.json(rows.map((r) => ({ ...r, score: num(r.score) })));
});

router.put('/grades/:enrollmentId', requireAuth(), requireRole('LECTURER'), requireStepUp, async (req, res) => {
  const enrollmentId = Number(req.params.enrollmentId);
  const { score, reason } = req.body ?? {};
  const valid = Number.isInteger(enrollmentId) && typeof score === 'number' && Number.isFinite(score)
    && score >= 0 && score <= 10 && twoDecimals(score)
    && typeof reason === 'string' && reason.trim().length >= 5 && reason.length <= 200;
  if (!valid) {
    await logEvent({ actorId: req.user.id, action: 'INPUT_REJECTED', target: `enrollment:${req.params.enrollmentId}`,
                     detail: { score, reasonLength: reason?.length }, ip: req.ip, severity: 'WARN' });
    return res.status(400).json({ error: 'INVALID_INPUT' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(1, $1)', [enrollmentId]); // tuan tu hoa theo enrollment
    const { rows: [row] } = await client.query(
      `SELECT c.lecturer_id, g.score AS old_score
         FROM enrollments e JOIN courses c ON c.id = e.course_id
         LEFT JOIN grades g ON g.enrollment_id = e.id
        WHERE e.id = $1`, [enrollmentId]);

    if (!row || row.lecturer_id !== req.user.id) {        // KIEM TRA OWNERSHIP (chong IDOR)
      await client.query('ROLLBACK');
      await logEvent({ actorId: req.user.id, action: 'ACCESS_DENIED_IDOR', target: `enrollment:${enrollmentId}`,
                       ip: req.ip, severity: 'HIGH' });     // log NGOAI transaction da rollback
      return res.status(row ? 403 : 404).json({ error: row ? 'FORBIDDEN' : 'NOT_FOUND' });
    }

    await client.query(
      `INSERT INTO grades (enrollment_id, score, updated_by) VALUES ($1, $2, $3)
       ON CONFLICT (enrollment_id) DO UPDATE
         SET score = EXCLUDED.score, updated_by = EXCLUDED.updated_by, updated_at = now()`,
      [enrollmentId, score, req.user.id]);
    await logEvent({ client, actorId: req.user.id, action: 'GRADE_UPDATE', target: `enrollment:${enrollmentId}`,
                     detail: { old: num(row.old_score), new: score, reason },
                     ip: req.ip });                         // audit cung transaction
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
});
