'use strict';
// Coverage category — measured line coverage (lcov) plus a test-gap map of untested source files.
const path = require('path');
const fs = require('fs');
const { isFl, lcovPct, walkExt } = require('./helpers');

module.exports = [
  { id: 'flutter-coverage', title: 'Test coverage', category: 'Coverage', severity: 'med', kind: 'coverage', when: isFl,
    fix: 'Raise line coverage (aim ≥60%). Run `flutter test --coverage`; cover critical logic and error paths.',
    run(ctx) { const lcov = path.join(ctx.projectPath, 'coverage/lcov.info'); if (!fs.existsSync(lcov)) return { status: 'na', detail: 'No coverage/lcov.info — run tests with --coverage.' }; const pct = lcovPct(lcov); return { status: pct >= 60 ? 'pass' : pct >= 30 ? 'warn' : 'fail', metric: pct + '%', detail: `Line coverage ${pct}%.` }; } },
  { id: 'test-gap', title: 'Test coverage gap (test plan)', category: 'Coverage', severity: 'med', kind: 'coverage', when: isFl,
    fix: 'Add tests for the untested files listed. Use the QA tool’s “Generate test” (AI) or “Scaffold test” to start each one.',
    run(ctx) {
      const srcRoot = path.join(ctx.projectPath, 'lib');
      const isTest = (f) => /\.(test|spec)\.|_test\.|(^|\/)(test|tests|__tests__|e2e)\//i.test(f);
      const all = walkExt(srcRoot, ['.dart']).map((f) => path.relative(ctx.projectPath, f));
      const src = all.filter((f) => !isTest(f) && !/(^|\/)(main)\.dart$/.test(f));
      const tests = all.filter(isTest);
      if (!src.length) return { status: 'na', detail: 'No source files found to map.' };
      const untested = src.filter((f) => { const base = path.basename(f).replace(/\.dart$/, ''); return !tests.some((t) => t.includes(base)); });
      const pct = Math.round(100 * (src.length - untested.length) / src.length);
      ctx._untested = untested.slice(0, 200);   // surfaced to the UI for AI/scaffold actions
      const detail = `${src.length - untested.length}/${src.length} source files have a matching test (${pct}%). ${tests.length} test file(s).` + (untested.length ? '\nUntested (first 15):\n  ' + untested.slice(0, 15).join('\n  ') : '');
      return { status: pct >= 60 ? 'pass' : pct >= 25 ? 'warn' : 'fail', metric: pct + '% covered', detail };
    } },
];
