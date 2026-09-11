'use strict';
// Scan-record persistence + triage-aware grading. One JSON cache per tool under the kit data dir
// (~/.mobile-devtools/mobile-security/). Isolated so engine.js can stay a pure check runner.
const path = require('path');
const { dataDir, readJson, writeJson } = require('../../../platform-kit');
const triage = require('../triage');
const { gradeOf, compliance } = require('./grade');
const CHECKS = require('./checks');

const TOOL_ID = 'mobile-security';
const securityJson = () => path.join(dataDir(TOOL_ID), 'security.json');
const baselineJson = () => path.join(dataDir(TOOL_ID), 'baseline.json');
const readCache = () => readJson(securityJson(), {});

// Tag findings with triage state, grade with suppressed findings excluded, evaluate the quality gate.
function gradeWithTriage(projectPath, findings) {
  const t = triage.triageFor(projectPath);
  for (const f of findings) f.triage = t[f.id] || 'open';
  const effective = findings.map((f) => triage.isSuppressed(f.triage) && f.status === 'fail' ? { ...f, status: 'na' } : f);
  const grade = gradeOf(effective);
  const gate = triage.evalGate(findings, grade);
  return { grade, gate };
}

// Save the new record, carrying a capped grade-history + a delta (new/fixed) vs the previous scan.
function saveRecord(record) {
  const c = readCache();
  const prev = c[record.path];
  if (prev) {
    const hist = (prev.history || []).concat([{ scannedAt: prev.scannedAt, score: prev.grade?.score, letter: prev.grade?.letter, fail: prev.grade?.counts?.fail || 0 }]);
    record.history = hist.slice(-20);
    const bad = (f) => f.status === 'fail' || f.status === 'warn';
    const prevBad = new Set((prev.findings || []).filter(bad).map((f) => f.id));
    const nowBad = new Set((record.findings || []).filter(bad).map((f) => f.id));
    record.delta = {
      scoreChange: (record.grade?.score || 0) - (prev.grade?.score || 0),
      newFindings: (record.findings || []).filter((f) => bad(f) && !prevBad.has(f.id)).map((f) => f.id),
      fixedFindings: [...prevBad].filter((id) => !nowBad.has(id)),
    };
  } else { record.history = []; record.delta = null; }
  c[record.path] = record; writeJson(securityJson(), c);
}

// Re-apply triage to a cached record after a state change, regrade + regate, persist.
function retriage(projectPath, findingId, state) {
  const rec = readCache()[projectPath];
  if (!rec) throw new Error('No scan on record for this project.');
  triage.setTriage(projectPath, findingId, state);
  const graded = gradeWithTriage(projectPath, rec.findings || []);
  rec.grade = graded.grade; rec.gate = graded.gate;
  saveRecord(rec);
  return rec;
}

// Sync summary for one project (from cache) — or the check catalog if it has never been scanned.
function securityData(projectPath) {
  const rec = projectPath ? readCache()[projectPath] : null;
  if (rec) { const b = readBaseline(projectPath); return b ? { ...rec, baseline: b } : rec; }
  return { path: projectPath || null, scanned: false, checks: CHECKS.map((c) => ({ id: c.id, title: c.title, category: c.category, standard: 'mobile', owasp: c.owasp || '', severity: c.severity, kind: 'static', fixable: !!c.fixable })) };
}
// All cached grades + an overall roll-up (for the dashboard).
function securityAll() {
  const c = readCache();
  const apps = Object.values(c).map((r) => ({ path: r.path, name: r.name, grade: r.grade, scannedAt: r.scannedAt }));
  let totalFail = 0, worst = null;
  for (const r of Object.values(c)) { totalFail += (r.grade?.counts?.fail || 0); if (r.grade && (!worst || r.grade.score < worst.grade.score)) worst = { name: r.name, path: r.path, grade: r.grade }; }
  const scored = apps.filter((a) => a.grade);
  const avg = scored.length ? Math.round(scored.reduce((s, a) => s + a.grade.score, 0) / scored.length) : null;
  const letter = avg == null ? '—' : avg >= 90 ? 'A' : avg >= 78 ? 'B' : avg >= 64 ? 'C' : avg >= 45 ? 'D' : 'F';
  return { apps, overall: { avg, letter, totalFail, scanned: scored.length, worst } };
}

// Baseline: accept the current failing/review findings so future scans surface only new ones.
function setBaseline(projectPath) {
  const rec = readCache()[projectPath];
  if (!rec) throw new Error('No scan on record — scan the app first.');
  const ids = (rec.findings || []).filter((f) => f.status === 'fail' || f.status === 'warn').map((f) => f.id);
  const store = readJson(baselineJson(), {});
  store[projectPath] = { ids, at: new Date().toISOString() };
  writeJson(baselineJson(), store);
  return { count: ids.length, at: store[projectPath].at };
}
function readBaseline(projectPath) {
  const b = readJson(baselineJson(), {})[projectPath];
  return b ? { count: (b.ids || []).length, at: b.at, ids: b.ids || [] } : null;
}
function clearBaseline(projectPath) {
  const store = readJson(baselineJson(), {}); delete store[projectPath]; writeJson(baselineJson(), store); return { cleared: true };
}

module.exports = { readCache, gradeWithTriage, saveRecord, retriage, securityData, securityAll, setBaseline, readBaseline, clearBaseline };
