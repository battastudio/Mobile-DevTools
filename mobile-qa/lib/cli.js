'use strict';
// CLI entry points that run without the HTTP server: --selftest (sanity + device probe, must not
// crash when no device/toolchain is attached) and --qa <path> (one-shot grade for CI, exits
// non-zero when failures land at/above a severity floor).
const { RUNNERS, runProject } = require('./qa');
const device = require('./device');

async function selftest() {
  console.log('Mobile QA — selftest');
  console.log(`runners: ${RUNNERS.length} · ${RUNNERS.map((r) => r.id).join(', ')}`);
  let devices = [];
  try { devices = await device.listDevices(); } catch (e) { console.log('device discovery error (non-fatal):', e.message); }
  console.log(`devices: ${devices.length}` + (devices.length ? ' · ' + devices.map((d) => `${d.id} [${d.platform}${d.booted ? ',booted' : ''}]`).join(', ') : ' (none attached)'));
  console.log('ok');
  process.exit(0);
}

function qaCli() {
  const argv = process.argv, p = argv[argv.indexOf('--qa') + 1];
  if (!p || p.startsWith('--')) { console.error('Usage: node server.js --qa <project-path> [--fail-on=high] [--url=]'); process.exit(2); }
  const failOn = (argv.find((a) => a.startsWith('--fail-on=')) || '--fail-on=high').split('=')[1];
  const url = (argv.find((a) => a.startsWith('--url=')) || '=').split('=')[1] || '';
  const RANK = { crit: 4, high: 3, med: 2, low: 1, info: 0 };
  runProject(p, { url }, (l) => process.stderr.write(l + '\n'))
    .then((rec) => { const breaches = (rec.results || []).filter((f) => f.status === 'fail' && (RANK[f.severity] ?? 0) >= (RANK[failOn] ?? 3)); process.stdout.write(JSON.stringify(rec, null, 2) + '\n'); console.error(`\n▸ ${rec.name}: QA grade ${rec.grade.letter} (${rec.grade.score}/100) — ${breaches.length} failing at/above ${failOn}`); process.exit(breaches.length ? 1 : 0); })
    .catch((e) => { console.error('qa failed: ' + e.message); process.exit(2); });
}

// Returns true if a CLI command was handled (the process will exit); false → start the server.
function run() {
  if (process.argv.includes('--selftest')) { selftest(); return true; }
  if (process.argv.includes('--qa')) { qaCli(); return true; }
  return false;
}
module.exports = { run, selftest, qaCli };
