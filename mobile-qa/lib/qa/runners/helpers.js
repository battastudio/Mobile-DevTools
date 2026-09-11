'use strict';
// Shared side-effect helpers for the runner catalog: shell-out (execFileSync) and fs probes.
// Every runner routes its tool invocations through runCmd so the catalog files stay declarative.
// ponytail: runners shell out with execFileSync (blocking) — fine for a single-user local tool;
//           move to streamed spawn if concurrent runs ever matter.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const isFl = (ctx) => ctx.type === 'flutter';

function runCmd(cmd, args, cwd, timeout = 300000) {
  try { return { ok: true, out: execFileSync(cmd, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'], timeout, maxBuffer: 1 << 25 }).toString() }; }
  catch (e) { return { ok: false, out: ((e.stdout || '') + (e.stderr || '')).toString(), code: e.status, unavailable: /ENOENT/.test(e.message), err: e.message }; }
}
const tail = (s, n = 500) => String(s || '').trim().split('\n').slice(-6).join('\n').slice(-n);

// Collect files under root with one of exts, skipping the usual build/vendor dirs (bounded walk).
function walkExt(root, exts, skip = new Set(['node_modules', '.git', 'build', 'dist', '.next', 'coverage', '.dart_tool', 'ios', 'android', 'Pods'])) {
  const out = []; const go = (d, depth) => { if (depth > 8 || out.length > 4000) return; let ents; try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { return; } for (const e of ents) { const p = path.join(d, e.name); if (e.isDirectory()) { if (!skip.has(e.name)) go(p, depth + 1); } else if (exts.some((x) => e.name.endsWith(x))) out.push(p); } };
  go(root, 0); return out;
}
function lcovPct(file) {
  try { const t = fs.readFileSync(file, 'utf8'); let lf = 0, lh = 0; for (const l of t.split('\n')) { if (l.startsWith('LF:')) lf += +l.slice(3) || 0; else if (l.startsWith('LH:')) lh += +l.slice(3) || 0; } return lf ? Math.round(100 * lh / lf) : 0; } catch { return 0; }
}
const hasTests = (p) => fs.existsSync(path.join(p, 'test')) || fs.existsSync(path.join(p, 'tests'));
// Golden tests are widget tests that assert on rendered pixels (matchesGoldenFile).
function goldenFiles(projectPath) {
  const dir = path.join(projectPath, 'test'); if (!fs.existsSync(dir)) return [];
  return walkExt(dir, ['.dart']).filter((f) => { try { return /matchesGoldenFile/.test(fs.readFileSync(f, 'utf8')); } catch { return false; } });
}
module.exports = { isFl, runCmd, tail, walkExt, lcovPct, hasTests, goldenFiles };
