'use strict';
// Pure grading: findings → letter grade + status counts, and the OWASP-Mobile compliance roll-up.
// No I/O, no globals — same findings in, same grade out.
const SEV_WEIGHT = { crit: 35, high: 20, med: 9, low: 3, info: 0 };

function gradeOf(findings) {
  let score = 100;
  for (const f of findings) if (f.status === 'fail') score -= (SEV_WEIGHT[f.severity] || 0);
  score = Math.max(0, score);
  const letter = score >= 90 ? 'A' : score >= 78 ? 'B' : score >= 64 ? 'C' : score >= 45 ? 'D' : 'F';
  const counts = { fail: 0, warn: 0, ok: 0, na: 0 };
  for (const f of findings) counts[f.status] = (counts[f.status] || 0) + 1;
  return { score, letter, counts };
}

// Roll findings up per OWASP category (worst status wins) for the "coverage" summary.
const STANDARD_LABEL = { mobile: 'OWASP Mobile Top 10' };
const WORST = { fail: 3, warn: 2, ok: 1, na: 0 };
function compliance(findings) {
  const byStd = {};
  for (const f of findings) {
    if (!f.owasp || f.status === 'na') continue;
    const std = f.standard || 'mobile';
    (byStd[std] || (byStd[std] = {}));
    const cur = byStd[std][f.owasp];
    if (!cur || WORST[f.status] > WORST[cur]) byStd[std][f.owasp] = f.status;
  }
  const out = {};
  for (const [std, cats] of Object.entries(byStd)) {
    const categories = Object.entries(cats).map(([owasp, status]) => ({ owasp, status })).sort((a, b) => a.owasp.localeCompare(b.owasp, undefined, { numeric: true }));
    out[std] = { label: STANDARD_LABEL[std] || std, pass: categories.filter((c) => c.status === 'ok').length, total: categories.length, categories };
  }
  return out;
}

module.exports = { gradeOf, compliance, SEV_WEIGHT };
