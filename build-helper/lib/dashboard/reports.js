'use strict';
// CSV export + printable HTML build report, filtered by range/project/env.
const { BUILDS_JSON, readJson } = require('../state');

function reportRows(q) {
  const range = Number(q.get('range')) || 0, project = q.get('project') || '', env = q.get('env') || '';
  const cutoff = range ? Date.now() - range * 864e5 : 0;
  return readJson(BUILDS_JSON, []).filter((b) => (!cutoff || new Date(b.time).getTime() >= cutoff) && (!project || b.project === project) && (!env || b.env === env));
}
function reportCsv(rows) {
  const head = ['time', 'project', 'env', 'version', 'branch', 'buildOk', 'durationMs', 'artifacts', 'onedrive', 'play', 'testflight', 'firebase', 'whatsNew'];
  const esc = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
  const lines = [head.join(',')];
  for (const b of rows) {
    const u = b.upload || {};
    lines.push([b.time, b.project, b.env, b.version, b.branch || '', b.buildOk !== false, b.durationMs || '',
      (b.artifacts || []).map((a) => a.name || a).join(' '), u.onedrive || '', u.play || '', u.testflight || '', u.firebase || '', (b.whatsNew || '').replace(/\n/g, ' ')].map(esc).join(','));
  }
  return lines.join('\n');
}
function reportHtml(rows) {
  const ok = rows.filter((b) => b.buildOk !== false).length;
  const row = (b) => `<tr><td>${new Date(b.time).toLocaleString()}</td><td>${b.project}</td><td>${b.env}</td><td>${b.version}</td><td>${b.buildOk === false ? '✗ failed' : '✓ ok'}</td><td>${b.durationMs ? Math.round(b.durationMs / 1000) + 's' : ''}</td><td>${(b.artifacts || []).map((a) => a.name || a).join('<br>')}</td></tr>`;
  return `<!doctype html><meta charset="utf-8"><title>Build report</title>
<style>body{font:13px system-ui;margin:32px;color:#111}h1{margin:0}table{border-collapse:collapse;width:100%;margin-top:16px}th,td{border:1px solid #ddd;padding:6px 8px;text-align:left;vertical-align:top}th{background:#f4f4f4}@media print{button{display:none}}</style>
<h1>Build Helper — report</h1><div style="color:#666">${rows.length} builds · ${ok} ok · ${rows.length - ok} failed · ${new Date().toLocaleString()}</div>
<button onclick="print()" style="margin-top:12px;padding:6px 14px">Print / Save PDF</button>
<table><thead><tr><th>Time</th><th>Project</th><th>Env</th><th>Version</th><th>Status</th><th>Duration</th><th>Artifacts</th></tr></thead>
<tbody>${rows.map(row).join('')}</tbody></table>`;
}

module.exports = { reportRows, reportCsv, reportHtml };
