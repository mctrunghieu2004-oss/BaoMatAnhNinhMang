import rateLimit from 'express-rate-limit';
import { logEvent } from '../services/audit.js';

const onLimit = (name) => async (req, res, next, options) => {
  await logEvent({ action: 'RATE_LIMITED', target: name, ip: req.ip, severity: 'WARN' });
  res.status(options.statusCode).json({ error: 'TOO_MANY_REQUESTS' });
};
const common = { windowMs: 15 * 60 * 1000, standardHeaders: 'draft-7', legacyHeaders: false };

export const loginLimiter = rateLimit({ ...common, limit: 10, handler: onLimit('login') });
export const apiLimiter = rateLimit({ ...common, limit: 300, handler: onLimit('api') });
