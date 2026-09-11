'use strict';
// One-click safe auto-fix — formatters only (dart format + dart fix). Never touches logic, so the
// user can review the diff and re-run QA. Flutter-only, matching this tool's scope.
const { runCmd, tail } = require('./runners/helpers');
const { isFlutter } = require('../project-lite');

function autofix(projectPath) {
  if (!isFlutter(projectPath)) return { ok: false, type: 'unknown', steps: [], note: 'Auto-fix supports Flutter projects (dart format / dart fix).' };
  const steps = [];
  const f = runCmd('dart', ['format', '.'], projectPath, 120000); steps.push({ cmd: 'dart format .', ok: f.ok, out: tail(f.out, 400) });
  const fx = runCmd('dart', ['fix', '--apply'], projectPath, 180000); if (!fx.unavailable) steps.push({ cmd: 'dart fix --apply', ok: fx.ok, out: tail(fx.out, 400) });
  return { ok: true, type: 'flutter', steps, note: 'Formatters applied. Review the diff and re-run QA.' };
}
module.exports = { autofix };
