import { api, show, HOME } from './api.js';

const next = sessionStorage.getItem('next') || 'MFA_VERIFY';
const enrolling = next === 'MFA_ENROLL';
document.getElementById('title').textContent = enrolling ? 'Bật xác thực hai lớp' : 'Nhập mã OTP';

if (enrolling) {
  const { status, data } = await api('/api/auth/mfa/setup', { method: 'POST', body: {} });
  if (status === 200) document.getElementById('qr').src = data.qr;
  else if (status === 409) location.reload();
  else show('Không tạo được mã QR.');
} else {
  document.getElementById('enroll').hidden = true;
}

document.getElementById('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const otp = document.getElementById('otp').value;
  const path = enrolling ? '/api/auth/mfa/enable' : '/api/auth/mfa/verify';
  const { status, data } = await api(path, { method: 'POST', body: { otp } });
  if (status === 200) { sessionStorage.removeItem('next'); location.href = HOME[data.role] ?? '/login.html'; return; }
  show(status === 423 ? 'Sai OTP quá nhiều lần: tài khoản bị khoá.' : 'Mã OTP không hợp lệ.');
});
