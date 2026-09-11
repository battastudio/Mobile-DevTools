'use strict';
// CI gate: no source file may exceed MAX lines — the repo's core readability rule.
// Exempt: node_modules, .git, docs-site (own Astro toolchain). The 150-line cap applies to ALL other
// code, including browser bundles under public/ — split them into ordered <script> modules instead.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MAX = 150;
const EXT = new Set(['.js', '.mjs', '.cjs']);
const SKIP_DIRS = new Set(['node_modules', '.git']);
const SKIP_PATHS = ['docs-site'];

const isExempt = (rel) => SKIP_PATHS.some((p) => rel === p || rel.startsWith(p + path.sep));

function walk(dir, out) {
  for (const name of fs.readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const abs = path.join(dir, name);
    const rel = path.relative(ROOT, abs);
    if (isExempt(rel)) continue;
    if (fs.statSync(abs).isDirectory()) { walk(abs, out); continue; }
    if (!EXT.has(path.extname(name))) continue;
    const lines = fs.readFileSync(abs, 'utf8').split('\n').length;
    if (lines > MAX) out.push({ rel, lines });
  }
  return out;
}

const over = walk(ROOT, []).sort((a, b) => b.lines - a.lines);
if (over.length) {
  console.error(`✗ ${over.length} file(s) exceed ${MAX} lines:`);
  for (const f of over) console.error(`  ${String(f.lines).padStart(5)}  ${f.rel}`);
  process.exit(1);
}
console.log(`✓ every source file is ≤ ${MAX} lines`);
