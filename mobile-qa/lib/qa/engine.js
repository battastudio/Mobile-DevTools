'use strict';
// QA engine — runs the applicable runners over a project, grades the results, and persists a record.
// The only impurity is the runners themselves (they shell out) and saveRecord; the loop is otherwise
// a straight fold over the catalog with progress streamed via onLine/onStep.
const fs = require('fs');
const path = require('path');
const { isFlutter, isLaravel, isWeb, discoverProjects } = require('../project-lite');
const { RUNNERS } = require('./runners');
const { gradeOf, summary } = require('./grade');
const { readCache, saveRecord } = require('./store');

const readFileSafe = (p) => { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } };

function buildCtx(projectPath, opts = {}) {
  const type = isLaravel(projectPath) ? 'laravel' : isFlutter(projectPath) ? 'flutter' : isWeb(projectPath) ? 'web' : 'unknown';
  let url = opts.url || '';
  if (url && !/^https?:\/\//i.test(url)) url = 'https://' + url;
  return { projectPath, type, url, device: opts.device || '', pkg: readFileSafe(path.join(projectPath, 'package.json')) };
}

// opts: { url, only, device, onStep } — a function 2nd arg is treated as onLine (back-compat).
async function runProject(projectPath, opts = {}, onLine = () => {}) {
  if (typeof opts === 'function') { onLine = opts; opts = {}; }
  if (!isFlutter(projectPath) && !isLaravel(projectPath) && !isWeb(projectPath) && !opts.url) throw new Error('Not a Flutter, Laravel, or web project: ' + projectPath);
  const name = path.basename(projectPath);
  const ctx = buildCtx(projectPath, opts);
  const onStep = typeof opts.onStep === 'function' ? opts.onStep : () => {};
  onLine(`▸ QA ${name} [${ctx.type}]${ctx.url ? ' + ' + ctx.url : ''}`);
  const results = [];
  const only = opts.only && opts.only.length ? new Set(opts.only) : null;   // run just these runner ids
  const plan = RUNNERS.filter((rn) => (!rn.when || rn.when(ctx)) && (!only || only.has(rn.id)));
  onStep({ kind: 'stages', stages: plan.map((rn) => ({ id: rn.id, title: rn.title, category: rn.category, severity: rn.severity })) });
  for (const rn of plan) {
    onLine(`  … ${rn.title}`);
    onStep({ kind: 'step', id: rn.id, status: 'running' });
    const t0 = Date.now();
    let res; try { res = await rn.run(ctx); } catch (e) { res = { status: 'warn', detail: 'Runner error: ' + e.message }; }
    const ms = Date.now() - t0;
    results.push({ id: rn.id, title: rn.title, category: rn.category, severity: rn.severity, kind: rn.kind, status: res.status, metric: res.metric || '', detail: res.detail || '', fix: res.fix || rn.fix || '', files: res.files || [] });
    onStep({ kind: 'step', id: rn.id, status: res.status, metric: res.metric || '', ms });
    const icon = { pass: '✔', ok: '✔', fail: '✖', warn: '!', na: '·' }[res.status] || '·';
    onLine(`  ${icon} [${res.status}] ${rn.title}${res.metric ? ' — ' + res.metric : ''}`);
  }
  // A subset run merges into the last full record (keep untouched runners' results).
  let merged = results, untested = ctx._untested || [];
  if (only) { const prev = readCache()[projectPath]; if (prev && prev.results) { const ran = new Set(results.map((r) => r.id)); merged = prev.results.filter((r) => !ran.has(r.id)).concat(results); if (!results.some((r) => r.id === 'test-gap')) untested = prev.untested || []; } }
  const grade = gradeOf(merged);
  const record = { path: projectPath, name, type: ctx.type, url: ctx.url || null, ranAt: new Date().toISOString(), grade, summary: summary(merged), results: merged, untested };
  saveRecord(record);
  onLine(`▸ ${name}: QA grade ${grade.letter} (${grade.score}/100) — ${grade.counts.fail || 0} failing, ${grade.counts.pass || 0} passing`);
  return record;
}
async function runAll(root, onLine = () => {}) {
  const projects = discoverProjects(root).filter((p) => p.type === 'flutter');   // Mobile QA = Flutter only
  onLine(`▸ QA on ${projects.length} projects under ${root}`);
  const out = [];
  for (const p of projects) { try { out.push(await runProject(p.path, {}, onLine)); } catch (e) { onLine(`  ✖ ${p.name}: ${e.message}`); } }
  return out;
}
module.exports = { runProject, runAll, buildCtx };
