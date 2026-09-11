'use strict';
// Static maps + fetch helpers for the Mobile Security UI. Loaded before app.js (attaches to window.SEC).
window.SEC = {
  OWASP: {
    M1: 'Improper Credential Usage', M2: 'Inadequate Supply Chain Security', M3: 'Insecure Authentication/Authorization',
    M4: 'Insufficient Input/Output Validation', M5: 'Insecure Communication', M6: 'Inadequate Privacy Controls',
    M7: 'Insufficient Binary Protections', M8: 'Security Misconfiguration', M9: 'Insecure Data Storage', M10: 'Insufficient Cryptography',
  },
  SEV_COLOR: { crit: 'rose', high: 'rose', med: 'amber', low: 'slate', info: 'slate' },
  SEV_LABEL: { crit: 'Critical', high: 'High', med: 'Medium', low: 'Low', info: 'Info' },
  STATUS_CLASS: { ok: 'ok', fail: 'fail', warn: 'run', na: 'off' },
  STATUS_TEXT: { ok: 'PASS', fail: 'FAIL', warn: 'REVIEW', na: 'N/A' },
  STATUS_ORDER: { fail: 0, warn: 1, ok: 2, na: 3 },
  SEV_ORDER: { crit: 0, high: 1, med: 2, low: 3, info: 4 },
  TRIAGE: { open: 'Open', 'false-positive': 'False positive', accepted: 'Accepted risk', fixed: 'Fixed' },
  get: (u) => fetch(u).then((r) => r.json()),
  post: (u, b) => fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then((r) => r.json()),
  qp: (p) => encodeURIComponent(p || ''),
};
