import { generateSecret, generateURI, verify } from 'otplib';
import QRCode from 'qrcode';
import crypto from 'node:crypto';
import { pool } from '../db.js';

export const newSecret = () => generateSecret();

export async function qrFor(username, secret, issuer) {
  const uri = generateURI({ issuer, label: username, secret });
  return QRCode.toDataURL(uri);
}

// Tra ve 'OK' | 'INVALID' | 'REPLAY'
export async function checkOtp(user, token) {
  token = String(token ?? '');
  if (!/^\d{6}$/.test(token)) return 'INVALID';
  if (!user.mfa_secret) return 'INVALID';
  const recent = user.last_otp_at && Date.now() - new Date(user.last_otp_at).getTime() < 90_000;
  if (user.last_otp === token && recent) return 'REPLAY';
  const { valid } = await verify({ secret: user.mfa_secret, token, epochTolerance: 30 });
  if (!valid) return 'INVALID';
  await pool.query('UPDATE users SET last_otp = $1, last_otp_at = now() WHERE id = $2', [token, user.id]);
  return 'OK';
}

// Gan phien voi ngu canh thiet bi: dung token o thiet bi khac => bi thu hoi
export const fingerprint = (req) =>
  crypto.createHash('sha256').update(`${req.get('user-agent') || ''}|${req.ip}`).digest('hex');
