'use strict';
// The scan engine. runChecks() is pure over the project's files (context in + checks → findings out);
// scanProject()/scanAll() wrap it with grading + persistence. All checks are static OWASP-Mobile
// checks, so there are no live/authenticated network probes here.
const path = require('path');
const { buildCtx, scrub } = require('./files');
const CHECKS = require('./checks');
const { isFlutter, discoverProjects } = require('../project-lite');
const { gradeWithTriage, saveRecord } = require('./store');
const { compliance } = require('./grade');

// Pure: run the given checks against a prepared context → normalized findings. Never throws (a
// broken check becomes a 'warn' finding).
async function runChecks(ctx, checks, onLine = () => {}) {
  const findings = [];
  for (const c of checks) {
    let res; try { res = await c.run(ctx); } catch (e) { res = { status: 'warn', evidence: 'Check error: ' + e.message }; }
    findings.push({
      id: c.id, title: c.title, category: c.category, standard: 'mobile', owasp: c.owasp || '',
      severity: res.severity || c.severity, kind: 'static', status: res.status,
      evidence: scrub(res.evidence || ''), scenario: res.scenario || c.scenario || '', fix: res.fix || c.fix || '',
    });
    const icon = { ok: '✔', fail: '✖', warn: '!', na: '·' }[res.status] || '·';
    onLine(`  ${icon} [${res.status}] ${c.title}`);
  }
  return findings;
}

async function scanProject(projectPath, onLine = () => {}) {
  if (!isFlutter(projectPath)) throw new Error('Not a Flutter project (needs pubspec.yaml + lib/): ' + projectPath);
  const name = path.basename(projectPath);
  onLine(`▸ Scanning ${name} [flutter]`);
  const findings = await runChecks(buildCtx(projectPath), CHECKS, onLine);
  const graded = gradeWithTriage(projectPath, findings);
  const record = { path: projectPath, name, type: 'flutter', scannedAt: new Date().toISOString(), grade: graded.grade, gate: graded.gate, compliance: compliance(findings), findings };
  saveRecord(record);
  onLine(`▸ ${name}: grade ${graded.grade.letter} (${graded.grade.score}/100) — gate ${graded.gate.pass ? 'PASS' : 'FAIL'} — ${graded.grade.counts.fail || 0} failing`);
  return record;
}

async function scanAll(root, onLine = () => {}) {
  const projects = discoverProjects(root);
  onLine(`▸ Scanning ${projects.length} Flutter project(s) under ${root}`);
  const results = [];
  for (const p of projects) { try { results.push(await scanProject(p.path, onLine)); } catch (e) { onLine(`  ✖ ${p.name}: ${e.message}`); } }
  return results;
}

module.exports = { runChecks, scanProject, scanAll };
