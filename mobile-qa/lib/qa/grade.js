'use strict';
// Pure grading — severity-weighted deductions from 100 → a letter, plus a per-category
// worst-status summary. No I/O, no globals: takes results, returns numbers.
const SEV_WEIGHT = { crit: 35, high: 20, med: 9, low: 3, info: 0 };
const WORST = { fail: 3, warn: 2, pass: 1, na: 0 };

function gradeOf(results) {
  let score = 100;
  for (const f of results) if (f.status === 'fail') score -= (SEV_WEIGHT[f.severity] || 0);
  score = Math.max(0, score);
  const letter = score >= 90 ? 'A' : score >= 78 ? 'B' : score >= 64 ? 'C' : score >= 45 ? 'D' : 'F';
  const counts = { fail: 0, warn: 0, pass: 0, na: 0 };
  for (const f of results) counts[f.status === 'ok' ? 'pass' : f.status] = (counts[f.status === 'ok' ? 'pass' : f.status] || 0) + 1;
  return { score, letter, counts };
}
// Per-category worst status (Tests / Coverage / Lint / Analyze / Deps / Manual QA / …).
function summary(results) {
  const by = {};
  for (const f of results) { if (f.status === 'na') continue; const s = f.status; const cur = by[f.category]; if (!cur || WORST[s] > WORST[cur.status]) by[f.category] = { status: s, metric: f.metric || '' }; }
  return by;
}
module.exports = { gradeOf, summary, SEV_WEIGHT, WORST };
