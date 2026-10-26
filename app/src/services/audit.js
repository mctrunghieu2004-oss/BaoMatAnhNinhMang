import crypto from 'node:crypto';
import { pool } from '../db.js';

export const GENESIS = '0'.repeat(64);
const canonical = (e) =>
  [e.prev_hash, e.ts, e.actor_id ?? '', e.action, e.target ?? '', e.detail ?? '', e.ip ?? '', e.severity].join('|');
export const hashOf = (e) => crypto.createHash('sha256').update(canonical(e)).digest('hex');

export async function logEvent({ client, actorId = null, action, target = null, detail = null,
                                 ip = null, severity = 'INFO' }) {
  const own = !client;
  const db = client ?? (await pool.connect());
  try {
    if (own) await db.query('BEGIN');
    await db.query('SELECT pg_advisory_xact_lock(42)');   // ghi tuan tu => chuoi khong re nhanh
    const { rows } = await db.query('SELECT hash FROM audit_log ORDER BY id DESC LIMIT 1');
    const e = { prev_hash: rows[0]?.hash ?? GENESIS, ts: new Date().toISOString(), actor_id: actorId,
                action, target, detail: detail === null ? null : JSON.stringify(detail), ip, severity };
    e.hash = hashOf(e);
    await db.query(
      `INSERT INTO audit_log (ts, actor_id, action, target, detail, ip, severity, prev_hash, hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [e.ts, e.actor_id, e.action, e.target, e.detail, e.ip, e.severity, e.prev_hash, e.hash]);
    if (own) await db.query('COMMIT');
    if (severity === 'HIGH' || severity === 'CRITICAL') console.warn(`[ALERT][${severity}] ${action} ${target ?? ''}`);
  } catch (err) {
    if (own) await db.query('ROLLBACK');
    throw err;
  } finally {
    if (own) db.release();
  }
}
