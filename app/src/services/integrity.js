import { pool } from '../db.js';
import { GENESIS, hashOf } from './audit.js';

export async function verifyChain() {
  const { rows } = await pool.query('SELECT * FROM audit_log ORDER BY id');
  let prev = GENESIS;
  const broken = [];
  for (const r of rows) {
    const e = { ...r, ts: new Date(r.ts).toISOString() };
    if (r.prev_hash !== prev || hashOf(e) !== r.hash) broken.push(Number(r.id));
    prev = r.hash;
  }
  return { total: rows.length, broken, lastHash: prev };
}

// FULL JOIN: phat hien ca diem bi sua, bi xoa, hoac bi chen thang vao DB (khong co log)
export async function reconcileGrades() {
  const { rows } = await pool.query(`
    WITH last AS (
      SELECT DISTINCT ON (target) target, detail
        FROM audit_log WHERE action = 'GRADE_UPDATE'
       ORDER BY target, id DESC)
    SELECT coalesce(g.enrollment_id, split_part(l.target, ':', 2)::int) AS enrollment_id,
           g.score, l.detail AS last_detail
      FROM grades g FULL JOIN last l ON l.target = 'enrollment:' || g.enrollment_id`);
  return rows
    .map((r) => ({ enrollmentId: r.enrollment_id,
                   dbScore: r.score === null ? null : Number(r.score),
                   loggedScore: r.last_detail ? JSON.parse(r.last_detail).new : null }))
    .filter((x) => x.loggedScore !== x.dbScore);
}
