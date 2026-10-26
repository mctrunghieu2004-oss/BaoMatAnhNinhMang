const LOGOUT_ERRORS = ['NO_TOKEN', 'SESSION_REVOKED', 'SESSION_EXPIRED', 'SESSION_CONTEXT_MISMATCH', 'INVALID_TOKEN'];

export async function api(path, { method = 'GET', body, otp } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (otp) headers['X-OTP'] = otp;
  const r = await fetch(path, { method, headers, credentials: 'same-origin',
                                body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await r.json().catch(() => ({}));
  if (r.status === 401 && LOGOUT_ERRORS.includes(data.error)) location.href = '/login.html';
  return { status: r.status, data };
}

// tao o bang an toan: textContent, khong bao gio innerHTML voi du lieu tu server
export function cell(text) {
  const td = document.createElement('td');
  td.textContent = text ?? '';
  return td;
}

export function show(msg, isError = true) {
  const el = document.getElementById('msg');
  el.textContent = msg;
  el.className = `msg ${isError ? 'err' : 'ok'}`;
}

export const HOME = { STUDENT: '/student.html', LECTURER: '/lecturer.html', ADMIN: '/admin.html' };

// Moi trang goi ham nay khi tai: sai role thi chuyen trang. Quyen that do server kiem tra.
export async function guard(role) {
  const { status, data } = await api('/api/me');
  if (status !== 200) { location.href = '/login.html'; return null; }
  if (data.role !== role) { location.href = HOME[data.role] ?? '/login.html'; return null; }
  document.getElementById('who').textContent = `${data.username} (${data.role})`;
  document.getElementById('logout').addEventListener('click', async () => {
    await api('/api/auth/logout', { method: 'POST', body: {} });
    location.href = '/login.html';
  });
  return data;
}
