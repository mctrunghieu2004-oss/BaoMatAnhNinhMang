import { api, show } from './api.js';

document.getElementById('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const { status, data } = await api('/api/auth/login', { method: 'POST', body: { username, password } });
  if (status === 200) {
    sessionStorage.setItem('next', data.next);     // chi la goi y dieu huong, khong phai token
    location.href = '/mfa.html';
    return;
  }
  show(status === 423 ? 'Tài khoản đang bị khoá, thử lại sau 15 phút.'
     : status === 429 ? 'Quá nhiều lần thử, vui lòng đợi.'
     : 'Sai tài khoản hoặc mật khẩu.');
});
