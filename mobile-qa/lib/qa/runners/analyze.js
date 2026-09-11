'use strict';
// Analyze category — the Dart static analyzer.
const { runCmd, tail, isFl } = require('./helpers');

module.exports = [
  { id: 'flutter-analyze', title: 'Static analysis (flutter analyze)', category: 'Analyze', severity: 'high', kind: 'analyze', when: isFl,
    fix: 'Resolve analyzer issues; treat lints as errors in analysis_options.yaml so they cannot regress.',
    run(ctx) { const r = runCmd('flutter', ['analyze', '--no-pub'], ctx.projectPath); if (r.unavailable) return { status: 'na', detail: 'flutter not found on PATH.' }; if (r.ok || /No issues found/i.test(r.out)) return { status: 'pass', detail: 'No issues found.' }; const n = (r.out.match(/(\d+)\s+issue/) || [])[1]; return { status: 'fail', metric: n ? n + ' issues' : '', detail: (n ? n + ' issue(s).\n' : '') + tail(r.out) }; } },
];
