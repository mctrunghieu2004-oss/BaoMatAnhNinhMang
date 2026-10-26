import { api, cell, guard, show } from './api.js';

const select = document.getElementById('course');
const tbody = document.getElementById('rows');
const dialog = document.getElementById('editor');

if (await guard('LECTURER')) {
  const { data: courses } = await api('/api/courses/mine');
  for (const c of courses) {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = `${c.code} - ${c.name}`;
    select.append(opt);
  }
  select.addEventListener('change', load);
  if (courses.length) await load();
}

async function load() {
  tbody.replaceChildren();
  const { status, data } = await api(`/api/courses/${select.value}/grades`);
  if (status !== 200) { show('Khong xem duoc lop nay.'); return; }
  for (const r of data) {
    const tr = document.createElement('tr');
    const btn = document.createElement('button');
    btn.textContent = 'Sua';
    btn.addEventListener('click', () => openEditor(r));
    const td = document.createElement('td');
    td.append(btn);
    tr.append(cell(r.username), cell(r.full_name), cell(r.score ?? 'Chua co'), td);
    tbody.append(tr);
  }
}

function openEditor(row) {
  document.getElementById('target').textContent = `${row.full_name} (enrollment ${row.enrollment_id})`;
  dialog.dataset.enrollmentId = row.enrollment_id;
  document.getElementById('score').value = row.score ?? '';
  document.getElementById('reason').value = '';
  document.getElementById('otp').value = '';
  dialog.showModal();
}

document.getElementById('cancel').addEventListener('click', () => dialog.close());

document.getElementById('save').addEventListener('click', async (e) => {
  e.preventDefault();
  const id = dialog.dataset.enrollmentId;
  const body = { score: Number(document.getElementById('score').value),
                 reason: document.getElementById('reason').value };
  const otp = document.getElementById('otp').value;
  const { status, data } = await api(`/api/grades/${id}`, { method: 'PUT', body, otp });
  dialog.close();
  if (status === 200) { show('Da luu diem.', false); await load(); return; }
  show(data.error === 'STEP_UP_REQUIRED' ? 'Can ma OTP moi de sua diem.'
     : data.error === 'FORBIDDEN' ? 'Ban khong day lop nay.'
     : 'Du lieu khong hop le (diem 0-10, ly do tu 5 ky tu).');
});
