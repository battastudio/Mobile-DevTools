'use strict';
// Manual QA category — sign-off checklists. These never run a tool; they surface as REVIEW items
// so a human records the release smoke, device matrix, and regression pass.
module.exports = [
  { id: 'smoke-checklist', title: 'Release smoke test', category: 'Manual QA', severity: 'high', kind: 'manual',
    fix: 'Install a release build, launch, log in, run the core flow, background/restore, go offline, log out — on a real device.',
    run() { return { status: 'warn', detail: 'Manual sign-off: install release build · launch · login · core flow · offline · deep links · logout.' }; } },
  { id: 'device-matrix', title: 'Device / OS matrix', category: 'Manual QA', severity: 'med', kind: 'manual',
    fix: 'Verify on min + latest OS, a small and a large screen, and both iOS + Android (or your target platforms).',
    run() { return { status: 'warn', detail: 'Verify: min+latest OS, small+large screen, iOS+Android. Record results per release.' }; } },
  { id: 'regression-signoff', title: 'Regression sign-off', category: 'Manual QA', severity: 'med', kind: 'manual',
    fix: 'Re-test areas touched this release + prior critical bugs; capture evidence and sign off before ship.',
    run() { return { status: 'warn', detail: 'Confirm previously-fixed bugs stay fixed and changed areas are re-tested.' }; } },
];
