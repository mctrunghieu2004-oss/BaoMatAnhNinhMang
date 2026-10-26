import { logEvent } from '../services/audit.js';

export const requireRole = (...roles) => async (req, res, next) => {
  if (roles.includes(req.user.role)) return next();
  await logEvent({ actorId: req.user.id, action: 'ACCESS_DENIED_ROLE', target: req.originalUrl,
                   ip: req.ip, severity: 'HIGH' });
  res.status(403).json({ error: 'FORBIDDEN' });
};
