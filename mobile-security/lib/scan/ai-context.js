'use strict';
// Context builders for the optional AI features: a bounded code+config blob for the deep-scan, the
// merge of AI-returned findings into a record (they count toward the grade), and the file snippet
// around a finding for the AI patch. AI is off unless the user configures a key.
const fs = require('fs');
const path = require('path');
const { buildCtx, scrub } = require('./files');
const { readCache, saveRecord, gradeWithTriage } = require('./store');
const { compliance } = require('./grade');

// Bounded code+config context for the model (keeps the request size sane).
function aiContext(projectPath) {
  const rec = readCache()[projectPath] || {};
  const ctx = buildCtx(projectPath);
  const CAP = 40000;
  let code = '', used = 0;
  for (const f of ctx.libFiles || []) {
    if (used >= CAP) break;
    const slice = f.text.slice(0, Math.max(0, CAP - used));
    code += `\n// ==== ${f.rel} ====\n` + slice;
    used += slice.length + f.rel.length + 12;
  }
  const deps = (ctx.pubspec.match(/^\s{2}[\w-]+:\s.*$/gm) || []).slice(0, 120).join('\n');
  const alreadyFound = (rec.findings || []).filter((f) => f.status === 'fail').map((f) => `${f.owasp || ''} ${f.title}`);
  return { type: ctx.type, manifest: (ctx.manifest || '').slice(0, 6000), plist: (ctx.plist || '').slice(0, 3000), gradle: (ctx.gradle || '').slice(0, 3000), deps, alreadyFound, code };
}

const slugId = (s) => String(s || 'issue').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'issue';
const AI_SEV = new Set(['crit', 'high', 'med', 'low', 'info']);
// Replace the record's prior AI findings with a fresh set, regrade, recompute compliance + delta, persist.
function mergeAiFindings(projectPath, aiFindings) {
  const rec = readCache()[projectPath];
  if (!rec) throw new Error('No scan on record — scan the app first.');
  const kept = (rec.findings || []).filter((f) => f.kind !== 'ai');
  const seen = new Set();
  const mapped = (aiFindings || []).map((a, i) => {
    let id = 'ai-' + slugId(a.title) + '-' + i; while (seen.has(id)) id += 'x'; seen.add(id);
    const conf = typeof a.confidence === 'number' ? a.confidence : 60;
    return {
      id, title: String(a.title || 'AI finding').slice(0, 140), category: String(a.category || 'AI review').slice(0, 60),
      standard: 'mobile', owasp: /^M(10|[1-9])$/.test(a.owasp || '') ? a.owasp : '', severity: AI_SEV.has(a.severity) ? a.severity : 'med',
      kind: 'ai', source: 'ai', status: conf >= 60 ? 'fail' : 'warn', evidence: scrub(String(a.evidence || '').slice(0, 1200)),
      scenario: String(a.scenario || '').slice(0, 600), fix: String(a.fix || '').slice(0, 1200), confidence: conf,
    };
  });
  rec.findings = kept.concat(mapped);
  const graded = gradeWithTriage(projectPath, rec.findings);
  rec.grade = graded.grade; rec.gate = graded.gate; rec.compliance = compliance(rec.findings); rec.aiScannedAt = new Date().toISOString();
  saveRecord(rec);
  return rec;
}

// The file referenced in a finding's evidence, bounded — context for an AI fix patch.
function patchContext(projectPath, finding) {
  const m = ((finding && finding.evidence) || '').match(/([\w./-]+\.(?:dart|xml|plist|gradle|kts|json|ya?ml|env)):(\d+)/i);
  if (!m) return {};
  const rel = m[1], line = +m[2];
  try {
    const abs = path.join(projectPath, rel);
    if (!fs.existsSync(abs) || fs.statSync(abs).size > 262144) return { file: rel };
    const lines = fs.readFileSync(abs, 'utf8').split('\n');
    const from = Math.max(0, line - 40), to = Math.min(lines.length, line + 40);
    return { file: rel, line, snippet: lines.slice(from, to).map((t, i) => `${from + i + 1}| ${t}`).join('\n') };
  } catch { return { file: rel }; }
}

module.exports = { aiContext, mergeAiFindings, patchContext };
