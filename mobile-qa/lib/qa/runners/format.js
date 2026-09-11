'use strict';
// Format / hygiene category — Dart formatting and outdated-dependency reporting.
const { runCmd, tail, isFl } = require('./helpers');

module.exports = [
  { id: 'dart-format', title: 'Formatting (dart format)', category: 'Lint', severity: 'low', kind: 'lint', when: isFl,
    fix: 'Run `dart format .` and commit; enforce in CI with --set-exit-if-changed.',
    run(ctx) { const r = runCmd('dart', ['format', '--set-exit-if-changed', '--output=none', '.'], ctx.projectPath); if (r.unavailable) return { status: 'na', detail: 'dart not found.' }; return r.ok ? { status: 'pass', detail: 'All files formatted.' } : { status: 'warn', detail: 'Files need formatting:\n' + tail(r.out) }; } },
  { id: 'flutter-deps', title: 'Outdated dependencies', category: 'Deps', severity: 'low', kind: 'deps', when: isFl,
    fix: 'Review `flutter pub outdated`; upgrade and remove abandoned packages regularly.',
    run(ctx) { const r = runCmd('flutter', ['pub', 'outdated', '--no-dev-dependencies'], ctx.projectPath, 120000); if (r.unavailable) return { status: 'na', detail: 'flutter not found.' }; return { status: 'warn', detail: tail(r.out, 900) || 'Run flutter pub outdated.' }; } },
];
