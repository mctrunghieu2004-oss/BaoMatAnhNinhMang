import { api, cell, guard, show } from './api.js';

const tabs = { alerts: renderAlerts, audit: renderAudit, integrity: renderIntegrity, users: renderUsers };
const out = document.getElementById('out');
const ts = (v) => new Date(v).toLocaleString();

if (await guard('ADMIN')) {
  for (const [name, render] of Object.entries(tabs)) {
    document.getElementById(`tab-${name}`).addEventListener('click', () => open(name, render));
  }
  await open('alerts', renderAlerts);
}

async function open(name, render) {
  for (const n of Object.keys(tabs)) document.getElementById(`tab-${n}`).classList.toggle('active', n === name);
  await render();
}

// O co nhan mau. Van dung textContent nen du lieu tu server khong the chen HTML.
function badge(text, cls) {
  const td = document.createElement('td');
  const span = document.createElement('span');
  span.className = `badge ${cls}`;
  span.textContent = text ?? '';
  td.append(span);
  return td;
}

function mono(text) {
  const td = cell(text);
  td.className = 'mono';
  return td;
}

function table(headers, rows, rowClass = () => '') {
  const t = document.createElement('table');
  const head = document.createElement('tr');
  for (const h of headers) {
    const th = document.createElement('th');
    th.textContent = h;
    head.append(th);
  }
  t.append(head);
  rows.forEach((cells, i) => {
    const tr = document.createElement('tr');
    tr.className = rowClass(i);
    tr.append(...cells.map((c) => (c instanceof HTMLElement ? c : cell(c))));
    t.append(tr);
  });
  const wrap = document.createElement('div');
  wrap.className = 'table-wrap';
  wrap.append(t);
  out.replaceChildren(wrap);
}

async function renderAlerts() {
  const { data } = await api('/api/admin/alerts');
  table(['ID', 'Thời điểm', 'Mức độ', 'Sự kiện', 'Actor', 'Target', 'Chi tiết'],
    data.map((r) => [r.id, ts(r.ts), badge(r.severity, `sev-${r.severity}`), r.action, r.actor_id,
      mono(r.target), mono(r.detail)]),
    (i) => (data[i].severity === 'CRITICAL' ? 'crit' : ''));
}

async function renderAudit() {
  const { data } = await api('/api/admin/audit?limit=100');
  table(['ID', 'Thời điểm', 'Sự kiện', 'Actor', 'Target', 'Mức độ', 'Hash'],
    data.map((r) => [r.id, ts(r.ts), r.action, r.actor_id, mono(r.target),
      badge(r.severity, `sev-${r.severity}`), mono(`${r.hash.slice(0, 16)}…`)]));
}

async function renderIntegrity() {
  const { data } = await api('/api/admin/integrity');
  const broken = data.chain.broken.length > 0;
  const lech = data.grades.length > 0;
  table(['Mục', 'Kết quả'], [
    ['Số dòng log', data.chain.total],
    ['Dòng bị đứt chuỗi hash', broken ? badge(data.chain.broken.join(', '), 'st-bad') : badge('không có', 'st-ok')],
    ['Hash cuối (anchor)', mono(data.chain.lastHash)],
    ['Điểm lệch so với log', lech
      ? badge(data.grades.map((g) => `enrollment ${g.enrollmentId}: DB=${g.dbScore} / log=${g.loggedScore}`).join(' | '), 'st-bad')
      : badge('không có', 'st-ok')],
  ]);
}

async function renderUsers() {
  const { data } = await api('/api/admin/users');
  table(['ID', 'Tài khoản', 'Vai trò', 'MFA', 'Sai MK', 'Sai OTP', 'Khoá đến', 'Hành động'],
    data.map((u) => [u.id, u.username, u.role, badge(u.mfa_enabled ? 'Bật' : 'Tắt', u.mfa_enabled ? 'st-ok' : 'sev-WARN'),
      u.failed_attempts, u.mfa_failed, u.locked_until ? ts(u.locked_until) : '',
      actions(u.id)]));
}

function actions(id) {
  const td = document.createElement('td');
  for (const [label, path] of [['Thu hồi phiên', 'revoke-sessions'], ['Reset MFA', 'reset-mfa'], ['Mở khoá', 'unlock']]) {
    const b = document.createElement('button');
    b.className = 'secondary small';
    b.textContent = label;
    b.addEventListener('click', () => run(id, path, label));
    td.append(b);
  }
  return td;
}

// Moi thao tac phan ung su co deu can OTP moi (step-up)
async function run(id, path, label) {
  const otp = document.getElementById('otp').value;
  if (!otp) { show('Nhập OTP trước khi thực hiện thao tác quản trị.'); return; }
  const { status } = await api(`/api/admin/users/${id}/${path}`, { method: 'POST', body: {}, otp });
  show(status === 200 ? `${label}: thành công.` : `${label}: thất bại (cần OTP mới).`, status !== 200);
  document.getElementById('otp').value = '';
  if (status === 200) await renderUsers();
}
