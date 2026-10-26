import { pool } from '../db.js';
import { logEvent } from './audit.js';

// Moi rule: dem su kien nguon trong cua so thoi gian, bo qua neu vua canh bao cho cung actor
const RULES = [
  { alert: 'ALERT_IDOR_BURST',        source: 'ACCESS_DENIED_IDOR', windowMin: 5,  threshold: 3 },
  { alert: 'ALERT_MASS_GRADE_CHANGE', source: 'GRADE_UPDATE',       windowMin: 10, threshold: 15 },
];

async function runRule({ alert, source, windowMin, threshold }) {
  const { rows } = await pool.query(
    `SELECT a.actor_id, count(*) AS n
       FROM audit_log a
      WHERE a.action = $1 AND a.ts > now() - make_interval(mins => $2)
      GROUP BY a.actor_id
     HAVING count(*) >= $3`, [source, windowMin, threshold]);
  for (const r of rows) {
    const { rows: [dup] } = await pool.query(
      `SELECT 1 FROM audit_log
        WHERE action = $1 AND actor_id IS NOT DISTINCT FROM $2
          AND ts > now() - make_interval(mins => $3) LIMIT 1`, [alert, r.actor_id, windowMin]);
    if (dup) continue;
    await logEvent({ actorId: r.actor_id, action: alert, target: `user:${r.actor_id}`,
                     detail: { count: Number(r.n), windowMin }, severity: 'HIGH' });
  }
}

export function startDetectors() {
  const tick = async () => {
    for (const rule of RULES) {
      try { await runRule(rule); } catch (e) { console.error('[DETECT]', rule.alert, e.message); }
    }
  };
  setInterval(tick, 60_000).unref();
}
