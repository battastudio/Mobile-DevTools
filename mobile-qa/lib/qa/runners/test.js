'use strict';
// Tests category — unit/widget, integration, and golden (snapshot) test runners.
const path = require('path');
const fs = require('fs');
const { runCmd, tail, isFl, hasTests, goldenFiles } = require('./helpers');

module.exports = [
  { id: 'flutter-test', title: 'Unit / widget tests (flutter test)', category: 'Tests', severity: 'crit', kind: 'test', when: isFl,
    fix: 'Fix failing tests before release; add tests for uncovered logic. Gate merges on green tests.',
    run(ctx) { if (!hasTests(ctx.projectPath)) return { status: 'na', detail: 'No test/ directory.' }; const r = runCmd('flutter', ['test', '--coverage', '--reporter=expanded'], ctx.projectPath); if (r.unavailable) return { status: 'na', detail: 'flutter not found.' }; const passed = (r.out.match(/\+(\d+)/g) || []).map((x) => +x.slice(1)).pop() || 0; const failed = (r.out.match(/-(\d+)/g) || []).map((x) => +x.slice(1)).pop() || 0; if (r.ok && !failed) return { status: 'pass', metric: passed + ' passed', detail: `${passed} tests passed.` }; return { status: 'fail', metric: `${failed} failed`, detail: `${passed} passed, ${failed} failed.\n` + tail(r.out) }; } },
  { id: 'flutter-integration', title: 'Integration tests (integration_test/)', category: 'Integration', severity: 'high', kind: 'integration', when: isFl,
    fix: 'Add integration_test/ with an app_test.dart that drives a real user journey (login → core flow), then run it on a booted device/emulator: flutter test integration_test/ -d <device>.',
    run(ctx) {
      const dir = path.join(ctx.projectPath, 'integration_test');
      if (!fs.existsSync(dir)) return { status: 'na', detail: 'No integration_test/ directory — use “Scaffold” to add a starter app_test.dart.' };
      const dev = ctx.device && ctx.device !== 'headless' ? ctx.device : '';
      if (!dev) return { status: 'na', detail: 'Integration tests drive the real app — pick a device/emulator in the run bar (or boot one: flutter emulators --launch <id>), then re-run. Runs headless-only tests via Widget/Unit above.' };
      const r = runCmd('flutter', ['test', 'integration_test', '-d', dev], ctx.projectPath, 900000);
      if (r.unavailable) return { status: 'na', detail: 'flutter not found on PATH.' };
      const passed = (r.out.match(/\+(\d+)/g) || []).map((x) => +x.slice(1)).pop() || 0;
      const failed = (r.out.match(/-(\d+)/g) || []).map((x) => +x.slice(1)).pop() || 0;
      if (r.ok && !failed) return { status: 'pass', metric: passed + ' passed', detail: `${passed} integration test(s) passed on ${dev}.` };
      return { status: 'fail', metric: `${failed} failed`, detail: `${passed} passed, ${failed} failed on ${dev}.\n` + tail(r.out) };
    } },
  { id: 'flutter-golden', title: 'Golden (snapshot) tests', category: 'Golden', severity: 'med', kind: 'golden', when: isFl,
    fix: 'Add golden tests (matchesGoldenFile) and commit the reference PNGs. Regenerate/update them with `flutter test --update-goldens` when a UI change is intended.',
    run(ctx) {
      const files = goldenFiles(ctx.projectPath);
      if (!files.length) return { status: 'na', detail: 'No golden tests found (no matchesGoldenFile in test/). Use “Scaffold” to add one — runs headless, no device needed.' };
      const rel = files.map((f) => path.relative(ctx.projectPath, f));
      const r = runCmd('flutter', ['test', ...rel], ctx.projectPath, 600000);
      if (r.unavailable) return { status: 'na', detail: 'flutter not found.' };
      const failed = (r.out.match(/-(\d+)/g) || []).map((x) => +x.slice(1)).pop() || 0;
      if (r.ok && !failed) return { status: 'pass', metric: rel.length + ' golden file(s)', detail: `Rendered UI matches all golden references (${rel.length} file(s)).` };
      return { status: 'fail', metric: `${failed} diff${failed === 1 ? '' : 's'}`, detail: `Golden mismatch — the rendered UI changed vs the stored reference. Review the diff; if the change is intended, update: flutter test --update-goldens\n` + tail(r.out) };
    } },
];
