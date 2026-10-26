import { api, cell, guard } from './api.js';

if (await guard('STUDENT')) {
  const { data } = await api('/api/grades/me');
  const tbody = document.getElementById('rows');
  for (const r of data) {
    const tr = document.createElement('tr');
    tr.append(cell(r.code), cell(r.name), cell(r.score ?? 'Chua co'),
              cell(r.updated_at ? new Date(r.updated_at).toLocaleString() : ''));
    tbody.append(tr);
  }
}
