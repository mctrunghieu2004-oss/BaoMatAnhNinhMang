export const config = {
  jwtSecret: process.env.JWT_SECRET,
  issuer: 'securegrade',
  audience: 'securegrade-web',
  totpIssuer: process.env.TOTP_ISSUER || 'SecureGrade',
  preMfaTtlSec: 300,
  sessionTtlSec: 900,
  maxLoginFail: 5,
  maxMfaFail: 3,
  lockMinutes: 15,
};
// fail-safe: khong chay voi secret yeu
if (!config.jwtSecret || config.jwtSecret.length < 64) {
  throw new Error('JWT_SECRET missing or too short');
}
