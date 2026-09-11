'use strict';
// AI QA routes — provider config, test generation, plan, scenarios, explain/fix, summary, and
// deterministic scaffolds. Controllers only: validate, call lib/ai (which calls the shared kit AI).
const ai = require('../ai');
const qa = require('../qa');

module.exports = function registerAiRoutes(app) {
  const { r, sendJson, id } = app;
  const err = (res, e) => sendJson(res, 400, { error: e.message });

  r('GET', '/api/qa/config', ({ res }) => sendJson(res, 200, ai.getConfig(id)));
  r('POST', '/api/qa/config', ({ res, body }) => sendJson(res, 200, ai.setConfig(id, body)), { body: true });
  r('POST', '/api/qa/config/test', ({ res }) => ai.testConfig(id).then((x) => sendJson(res, 200, x)));

  r('POST', '/api/qa/ai/gen', ({ res, body }) => ai.generateTest(id, body.path, body.file, body.type || '').then((x) => sendJson(res, 200, x)).catch((e) => err(res, e)), { body: true });
  // AI test plan (TestSprite-style) — stored on the record as advice, NOT folded into the grade.
  r('POST', '/api/qa/ai/plan', ({ res, body }) => {
    const rec = qa.qaData(body.path); if (!rec || rec.ran === false) return sendJson(res, 400, { error: 'Run QA on the project first.' });
    ai.testPlan(id, body.path, rec.untested || []).then((x) => { try { qa.mergeAiPlan(body.path, x.items); } catch {} sendJson(res, 200, x); }).catch((e) => err(res, e));
  }, { body: true });
  r('POST', '/api/qa/ai/scenario', ({ res, body }) => ai.writeScenario(id, body.path, body.file || '', body.feature || '').then((x) => sendJson(res, 200, x)).catch((e) => err(res, e)), { body: true });
  r('POST', '/api/qa/ai/scenario-code', ({ res, body }) => ai.scenarioToTest(id, body.path, body.gherkin || '', body.type || 'widget').then((x) => sendJson(res, 200, x)).catch((e) => err(res, e)), { body: true });
  r('POST', '/api/qa/ai/explain', ({ res, body }) => ai.explainFailure(id, body.path, body.failure || body.text || '', body.file || '').then((x) => sendJson(res, 200, x)).catch((e) => err(res, e)), { body: true });
  r('POST', '/api/qa/ai/fix', ({ res, body }) => ai.fixTest(id, body.path, body.file, body.failure || '').then((x) => sendJson(res, 200, x)).catch((e) => err(res, e)), { body: true });
  r('POST', '/api/qa/ai/summary', ({ res, body }) => { const rec = qa.qaData(body.path); if (!rec || rec.ran === false) return sendJson(res, 400, { error: 'Run QA on the project first.' }); ai.qaSummary(id, rec).then((x) => sendJson(res, 200, x)).catch((e) => err(res, e)); }, { body: true });
  r('POST', '/api/qa/ai/smoke-journeys', ({ res, body }) => ai.smokeJourneys(id, body.path).then((x) => sendJson(res, 200, x)).catch((e) => err(res, e)), { body: true });
  r('POST', '/api/qa/ai/fix-code', ({ res, body }) => ai.fixCode(id, body.path, body.file, body.instruction || '').then((x) => sendJson(res, 200, x)).catch((e) => err(res, e)), { body: true });

  // Deterministic writes (no AI).
  r('POST', '/api/qa/ai/save', ({ res, body }) => { try { return sendJson(res, 200, ai.saveFile(body.path, body.file, body.content)); } catch (e) { return err(res, e); } }, { body: true });
  r('POST', '/api/qa/apply-fix', ({ res, body }) => { try { return sendJson(res, 200, ai.overwriteFile(body.path, body.file, body.content)); } catch (e) { return err(res, e); } }, { body: true });
  r('POST', '/api/qa/scaffold/test', ({ res, body }) => { try { return sendJson(res, 200, ai.scaffoldTest(body.path, body.file)); } catch (e) { return err(res, e); } }, { body: true });
  r('POST', '/api/qa/scaffold/e2e', ({ res, body }) => { try { return sendJson(res, 200, ai.scaffoldE2E(body.path)); } catch (e) { return err(res, e); } }, { body: true });
  r('POST', '/api/qa/scaffold/type', ({ res, body }) => { try { return sendJson(res, 200, ai.scaffoldType(body.path, body.type)); } catch (e) { return err(res, e); } }, { body: true });
};
