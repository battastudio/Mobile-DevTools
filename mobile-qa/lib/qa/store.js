'use strict';
// Local persistence of QA records — one JSON file at ~/.mobile-devtools/mobile-qa/qa.json, keyed
// by project path. Keeps per-project history + a delta (new failures / fixed / score change) so the
// UI and Slack/Telegram alerts can show what changed since the last run.
const path = require('path');
const { dataDir, readJson, writeJson } = require('../../../platform-kit');
const { RUNNERS } = require('./runners');

const TOOL_ID = 'mobile-qa';
const qaJson = () => path.join(dataDir(TOOL_ID), 'qa.json');
function readCache() { return readJson(qaJson(), {}); }

function saveRecord(record) {
  const c = readCache(); const prev = c[record.path];
  if (prev) {
    record.history = (prev.history || []).concat([{ ranAt: prev.ranAt, score: prev.grade?.score, letter: prev.grade?.letter, fail: prev.grade?.counts?.fail || 0 }]).slice(-20);
    const bad = (f) => f.status === 'fail';
    const prevBad = new Set((prev.results || []).filter(bad).map((f) => f.id)); const nowBad = new Set((record.results || []).filter(bad).map((f) => f.id));
    record.delta = { scoreChange: (record.grade?.score || 0) - (prev.grade?.score || 0), newFailures: (record.results || []).filter((f) => bad(f) && !prevBad.has(f.id)).map((f) => f.id), fixed: [...prevBad].filter((id) => !nowBad.has(id)) };
  } else { record.history = []; record.delta = null; }
  c[record.path] = record; writeJson(qaJson(), c);
}
// Store an AI test plan on the record (advice — shown in the UI, NOT folded into the grade).
function mergeAiPlan(projectPath, plan) {
  const c = readCache(); const rec = c[projectPath];
  if (!rec) throw new Error('Run QA on the project first.');
  rec.aiPlan = { at: new Date().toISOString(), items: Array.isArray(plan) ? plan.slice(0, 40) : [] };
  c[projectPath] = rec; writeJson(qaJson(), c);
  return rec;
}
function qaData(projectPath) { const c = readCache(); const rec = projectPath ? c[projectPath] : null; return rec || { path: projectPath || null, ran: false, runners: RUNNERS.map((r) => ({ id: r.id, title: r.title, category: r.category, severity: r.severity, kind: r.kind })) }; }
function qaAll() {
  const c = readCache(); const apps = Object.values(c).map((r) => ({ path: r.path, name: r.name, type: r.type, grade: r.grade, ranAt: r.ranAt, summary: r.summary || {}, history: (r.history || []).map((h) => h.score).concat([r.grade ? r.grade.score : 0]).slice(-20) }));
  const scored = apps.filter((a) => a.grade); const avg = scored.length ? Math.round(scored.reduce((s, a) => s + a.grade.score, 0) / scored.length) : null;
  const letter = avg == null ? '—' : avg >= 90 ? 'A' : avg >= 78 ? 'B' : avg >= 64 ? 'C' : avg >= 45 ? 'D' : 'F';
  let totalFail = 0, worst = null; for (const r of Object.values(c)) { totalFail += (r.grade?.counts?.fail || 0); if (r.grade && (!worst || r.grade.score < worst.grade.score)) worst = { name: r.name, path: r.path, grade: r.grade }; }
  return { apps, overall: { avg, letter, totalFail, scanned: scored.length, worst } };
}
module.exports = { readCache, saveRecord, mergeAiPlan, qaData, qaAll, qaJson };
