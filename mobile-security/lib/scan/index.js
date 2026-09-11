'use strict';
// Public API of the scan package — the stable require site for the route controllers.
const CHECKS = require('./checks');
const engine = require('./engine');
const store = require('./store');
const report = require('./report');
const fix = require('./fix');
const ai = require('./ai-context');
const fleet = require('./fleet');
const triage = require('../triage');

module.exports = {
  CHECKS,
  scanProject: engine.scanProject, scanAll: engine.scanAll,
  securityData: store.securityData, securityAll: store.securityAll, retriage: store.retriage,
  setBaseline: store.setBaseline, readBaseline: store.readBaseline, clearBaseline: store.clearBaseline,
  readGate: triage.readGate, setGate: triage.setGate,
  securityReportHtml: report.securityReportHtml, securitySarif: report.securitySarif,
  applyFix: fix.applyFix, fixAll: fix.fixAll,
  aiContext: ai.aiContext, mergeAiFindings: ai.mergeAiFindings, patchContext: ai.patchContext,
  fleetData: fleet.fleetData,
};
