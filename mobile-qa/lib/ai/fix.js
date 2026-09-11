'use strict';
// AI explain/fix — explain a failing test, rewrite a failing test file, produce an executive QA
// briefing, apply a targeted fix to any file, and (deterministic) overwrite-with-backup for Apply.
const fs = require('fs');
const path = require('path');
const { ai } = require('../../../platform-kit');
const { frameworkFor, codeFence, guard } = require('./context');

// Explain a failing test's output + how to fix.
async function explainFailure(toolId, projectPath, failureText, file = '') {
  let src = '';
  if (file) { try { const abs = guard(projectPath, file); src = `\n\nTest / source file ${path.relative(projectPath, abs)}:\n\`\`\`\n${fs.readFileSync(abs, 'utf8').slice(0, 10000)}\n\`\`\``; } catch {} }
  const prompt = `You are a senior test engineer. A test run failed. Explain the root cause to a developer and give a concrete, minimal fix. Be specific and practical. Respond in short markdown with: 1) What failed and why (2-3 sentences), 2) The fix (code/config), 3) How to verify it's green.\n\nFailure output:\n${String(failureText || '').slice(0, 8000)}${src}`;
  const { text, model } = await ai.callAI(toolId, prompt, { maxTokens: 1500, temperature: 0.2 });
  return { text, model };
}
// Fix a failing test file (returns corrected code).
async function fixTest(toolId, projectPath, file, failureText = '') {
  const abs = guard(projectPath, file);
  const src = fs.readFileSync(abs, 'utf8').slice(0, 12000);
  const fw = frameworkFor(projectPath);
  const prompt = `You are a senior test engineer using ${fw}. Fix the failing test file below so it passes for the right reason (do not weaken assertions to force a pass). Output ONLY the corrected full test file in a single code block — no prose.\n\nFile: ${path.relative(projectPath, abs)}\n${failureText ? `\nFailure output:\n${String(failureText).slice(0, 4000)}\n` : ''}\n\`\`\`\n${src}\n\`\`\``;
  const { text, model } = await ai.callAI(toolId, prompt, { maxTokens: 3000, temperature: 0.1 });
  return { code: codeFence(text), model, path: path.relative(projectPath, abs) };
}
// Executive QA / test-readiness briefing from the record.
async function qaSummary(toolId, record) {
  const g = record.grade || {}; const fails = (record.results || []).filter((f) => f.status === 'fail');
  const list = fails.slice(0, 40).map((f) => `- [${f.severity}] ${f.title}${f.metric ? ' (' + f.metric + ')' : ''}`).join('\n');
  const prompt = `You are a senior QA engineer. Give a concise test-readiness briefing for "${record.name}" (grade ${g.letter} ${g.score}/100, ${fails.length} failing checks, type ${record.type}). Cover: 1) release-readiness in 2 sentences, 2) top 3 quality risks and their impact, 3) a prioritized fix-first order for this week. Be specific; short markdown.\n\nFailing checks:\n${list || 'none'}`;
  const { text, model } = await ai.callAI(toolId, prompt, { maxTokens: 1200, temperature: 0.4 });
  return { text, model };
}
// Fix-it: rewrite a file to fix a specific issue.
async function fixCode(toolId, projectPath, file, instruction = '') {
  const abs = guard(projectPath, file);
  const src = fs.readFileSync(abs, 'utf8').slice(0, 16000);
  const rel = path.relative(projectPath, abs);
  const lang = /\.dart$/.test(rel) ? 'Dart/Flutter' : /\.(t|j)sx?$/.test(rel) ? 'TypeScript/JS' : /\.php$/.test(rel) ? 'PHP' : 'the file’s language';
  const prompt = `You are a senior ${lang} engineer. Apply this fix to the file and output ONLY the FULL corrected file in a single code block — no prose, no partial snippets, keep everything else unchanged.\n\nFix to apply: ${instruction || 'resolve the issue described for this file'}\n\nFile: ${rel}\n\n\`\`\`\n${src}\n\`\`\``;
  const { text, model } = await ai.callAI(toolId, prompt, { maxTokens: 4000, temperature: 0.1 });
  return { code: codeFence(text), model, path: rel };
}
// Overwrite an existing file, keeping a .bak backup (used by Apply).
function overwriteFile(projectPath, file, content) {
  const abs = guard(projectPath, file);
  if (!fs.existsSync(abs)) throw new Error('file does not exist: ' + path.relative(projectPath, abs));
  fs.copyFileSync(abs, abs + '.bak');
  fs.writeFileSync(abs, content);
  return { written: path.relative(projectPath, abs), backup: path.relative(projectPath, abs) + '.bak' };
}
module.exports = { explainFailure, fixTest, qaSummary, fixCode, overwriteFile };
