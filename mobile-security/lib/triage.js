'use strict';
// Finding triage (false-positive / accepted / fixed) + a configurable quality gate.
// Triage state suppresses a finding from the grade + gate (SonarQube/Corgea behaviour).
// Config lives under the kit data dir (~/.mobile-devtools/mobile-security/).
const path = require('path');
const { dataDir, readJson, writeJson } = require('../../platform-kit');

const TOOL_ID = 'mobile-security';
const TRIAGE_JSON = path.join(dataDir(TOOL_ID), 'triage.json');
const GATE_JSON = path.join(dataDir(TOOL_ID), 'gate.json');
const SUPPRESSED = new Set(['false-positive', 'accepted', 'fixed']);   // these drop out of the grade

const readTriage = () => readJson(TRIAGE_JSON, {});
const triageFor = (projectPath) => readTriage()[projectPath] || {};
function setTriage(projectPath, findingId, state) {
  const all = readTriage(); const proj = all[projectPath] || (all[projectPath] = {});
  if (!state || state === 'open') delete proj[findingId]; else proj[findingId] = state;
  writeJson(TRIAGE_JSON, all); return proj;
}
const isSuppressed = (state) => SUPPRESSED.has(state);

const readGate = () => ({ maxCrit: 0, maxHigh: null, minGrade: null, ...readJson(GATE_JSON, {}) });
const setGate = (cfg) => { writeJson(GATE_JSON, { ...readGate(), ...cfg }); return readGate(); };
const GRADE_RANK = { A: 5, B: 4, C: 3, D: 2, F: 1 };
// Evaluate the gate against active (non-suppressed) findings + grade.
function evalGate(findings, grade) {
  const g = readGate(); const reasons = [];
  const active = findings.filter((f) => f.status === 'fail' && !isSuppressed(f.triage));
  const crit = active.filter((f) => f.severity === 'crit').length;
  const high = active.filter((f) => f.severity === 'high').length;
  if (g.maxCrit != null && crit > g.maxCrit) reasons.push(`${crit} critical > ${g.maxCrit} allowed`);
  if (g.maxHigh != null && high > g.maxHigh) reasons.push(`${high} high > ${g.maxHigh} allowed`);
  if (g.minGrade && (GRADE_RANK[grade.letter] || 0) < (GRADE_RANK[g.minGrade] || 0)) reasons.push(`grade ${grade.letter} < required ${g.minGrade}`);
  return { pass: reasons.length === 0, reasons, config: g };
}

module.exports = { triageFor, setTriage, isSuppressed, readGate, setGate, evalGate, SUPPRESSED };
