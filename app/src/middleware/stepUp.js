import { checkOtp } from '../services/otp.js';
import { logEvent } from '../services/audit.js';

export async function requireStepUp(req, res, next) {
  const result = await checkOtp(req.user, req.get('x-otp'));
  if (result === 'OK') return next();
  await logEvent({ actorId: req.user.id, action: `STEP_UP_FAIL_${result}`, target: req.originalUrl,
                   ip: req.ip, severity: 'HIGH' });
  res.status(401).json({ error: 'STEP_UP_REQUIRED' });
}
