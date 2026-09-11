'use strict';
// AI QA suite barrel — config passthrough to the shared kit AI helper (provider/key set once in
// Settings → AI, per-tool data dir, never returned to the browser) + generate/fix/scaffold.
const { ai } = require('../../../platform-kit');
module.exports = {
  getConfig: (toolId) => ai.aiConfig(toolId),
  setConfig: (toolId, patch) => ai.setAiConfig(toolId, patch),
  testConfig: (toolId) => ai.testAI(toolId),
  ...require('./generate'),  // generateTest, testPlan, writeScenario, scenarioToTest, smokeJourneys
  ...require('./fix'),       // explainFailure, fixTest, qaSummary, fixCode, overwriteFile
  ...require('./scaffold'),  // saveFile, scaffoldTest, scaffoldE2E, scaffoldType
};
