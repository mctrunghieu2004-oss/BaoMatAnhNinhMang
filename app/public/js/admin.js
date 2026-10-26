import { api, cell, guard, show } from './api.js';

const tabs = { alerts: renderAlerts, audit: renderAudit, integrity: renderIntegrity, users: renderUsers };
const out = document.getElementById('out');
const ts = (v) => new Date(v).toLocaleString();

if (await guard('ADMIN')) {
  for (const [name, render] of Object.entries(tabs)) {
    document.getElementById(`tab-${name}`).addEventListener('click', render);
  }
  await renderAlerts();
}

function table(headers, rows) {
  const t = document.createElement('table');
  const head = document.createElement('tr');
  for (const h of headers) {
    const th = document.createElement('th');
    th.textContent = h;
    head.append(th);
  }
  t.append(head);
  for (const cells of rows) {
    const tr = document.createElement('tr');
    tr.append(...cells.map((c) => (c instanceof HTMLElement ? c : cell(c))));
    t.append(tr);
  }
  out.replaceChildren(t);
}

async function renderAlerts() {
  const { data } = await api('/api/admin/alerts');
  table(['ID', 'Thoi diem', 'Severity', 'Action', 'Actor', 'Target', 'Detail'],
    data.map((r) => [r.id, ts(r.ts), r.severity, r.action, r.actor_id, r.target, r.detail]));
}

async function renderAudit() {
  const { data } = await api('/api/admin/audit?limit=100');
  table(['ID', 'Thoi diem', 'Action', 'Actor', 'Target', 'Severity', 'Hash'],
    data.map((r) => [r.id, ts(r.ts), r.action, r.actor_id, r.target, r.severity, `${r.hash.slice(0, 16)}...`]));
}

async function renderIntegrity() {
  const { data } = await api('/api/admin/integrity');
  const rows = [
    ['So dong log', data.chain.total],
    ['Dong bi dut chuoi hash', data.chain.broken.join(', ') || 'khong co'],
    ['Hash cuoi (anchor)', data.chain.lastHash],
    ['Diem lech so voi log', data.grades.length
      ? data.grades.map((g) => `enrollment ${g.enrollmentId}: DB=${g.dbScore} / log=${g.loggedScore}`).join(' | ')
      : 'khong co'],
  ];
  table(['Muc', 'Ket qua'], rows);
}

async function renderUsers() {
  const { data } = await api('/api/admin/users');
  table(['ID', 'Username', 'Role', 'MFA', 'Sai MK', 'Sai OTP', 'Khoa den', 'Hanh dong'],
    data.map((u) => [u.id, u.username, u.role, u.mfa_enabled ? 'Bat' : 'Tat',
      u.failed_attempts, u.mfa_failed, u.locked_until ? ts(u.locked_until) : '',
      actions(u.id)]));
}

function actions(id) {
  const td = document.createElement('td');
  for (const [label, path] of [['Thu hoi phien', 'revoke-sessions'], ['Reset MFA', 'reset-mfa'], ['Mo khoa', 'unlock']]) {
    const b = document.createElement('button');
    b.className = 'secondary';
    b.textContent = label;
    b.addEventListener('click', () => run(id, path, label));
    td.append(b);
  }
  return td;
}

// Moi thao tac phan ung su co deu can OTP moi (step-up)
async function run(id, path, label) {
  const otp = document.getElementById('otp').value;
  if (!otp) { show('Nhap OTP truoc khi thuc hien thao tac quan tri.'); return; }
  const { status } = await api(`/api/admin/users/${id}/${path}`, { method: 'POST', body: {}, otp });
  show(status === 200 ? `${label}: thanh cong.` : `${label}: that bai (can OTP moi).`, status !== 200);
  document.getElementById('otp').value = '';
  if (status === 200) await renderUsers();
}
