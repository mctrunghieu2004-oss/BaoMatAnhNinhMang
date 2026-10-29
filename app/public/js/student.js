import { api, cell, guard } from './api.js';

if (await guard('STUDENT')) {
  const { data } = await api('/api/grades/me');
  const tbody = document.getElementById('rows');
  for (const r of data) {
    const tr = document.createElement('tr');
    const diem = cell(r.score ?? 'Chưa có');
    diem.className = r.score == null ? 'muted right' : 'score right';
    tr.append(cell(r.code), cell(r.name), diem,
              cell(r.updated_at ? new Date(r.updated_at).toLocaleString() : ''));
    tbody.append(tr);
  }
}
