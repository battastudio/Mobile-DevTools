'use strict';
// Run every installed tool's built-in `--selftest`. Tools not yet present are skipped, so this is
// safe to run at any point. Device/toolchain-dependent checks must degrade gracefully (no crash).
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const { CATALOG } = require(path.join(ROOT, 'lib/registry'));

let fail = 0;
for (const t of CATALOG) {
  const server = path.join(ROOT, t.id, 'server.js');
  if (!fs.existsSync(server)) { console.log(`- ${t.id}: not installed, skipped`); continue; }
  const r = spawnSync(process.execPath, [server, '--selftest'], { cwd: path.join(ROOT, t.id), timeout: 120000, encoding: 'utf8' });
  const ok = r.status === 0;
  if (!ok) fail++;
  console.log(`${ok ? '✓' : '✗'} ${t.id}: ${ok ? 'selftest passed' : 'selftest FAILED (exit ' + r.status + ')'}`);
  if (!ok) { const tail = ((r.stderr || '') + (r.stdout || '')).trim().split('\n').slice(-8); for (const l of tail) console.log('    ' + l); }
}
console.log(fail ? `\n${fail} tool(s) failed selftest.` : '\nAll installed tools passed selftest.');
process.exit(fail ? 1 : 0);
