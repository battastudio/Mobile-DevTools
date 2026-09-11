'use strict';
// AI generation — write tests, a prioritized test plan, BDD/Gherkin scenarios, scenario→test code,
// and a smoke journey. All calls go through the shared kit AI helper (provider/key set once in
// Settings → AI). Deterministic scaffolds (no AI) live in scaffold.js.
const fs = require('fs');
const path = require('path');
const { ai } = require('../../../platform-kit');
const { frameworkFor, codeFence, jsonBlock, sourceContext, guard, suggestTestPath } = require('./context');

// Generate a test for a source file (optionally hinted to a test type).
async function generateTest(toolId, projectPath, file, typeHint = '') {
  const abs = guard(projectPath, file);
  const src = fs.readFileSync(abs, 'utf8').slice(0, 12000);
  const fw = frameworkFor(projectPath);
  const rel = path.relative(projectPath, abs);
  const kind = { widget: 'widget tests (pump the widget in a MaterialApp and assert UI + interactions)', unit: 'pure unit tests', integration: 'an integration_test flow', golden: 'a golden/snapshot test using matchesGoldenFile' }[typeHint] || 'the most valuable tests';
  const prompt = `You are a senior test engineer. Write a thorough but focused test file for the source below, using ${fw}. Prefer ${kind}. Cover the main behaviours, edge cases, and error paths. Use realistic mocks for external dependencies. Output ONLY the test file code in a single code block — no prose.\n\nFile: ${rel}\n\n\`\`\`\n${src}\n\`\`\``;
  const { text, model } = await ai.callAI(toolId, prompt, { maxTokens: 3000, temperature: 0.2 });
  return { code: codeFence(text), model, suggestedPath: suggestTestPath(rel, fw) };
}
// Prioritized test plan (TestSprite-style) — advice, not graded.
async function testPlan(toolId, projectPath, untested = []) {
  const fw = frameworkFor(projectPath);
  const system = 'You are a senior mobile QA engineer building a test plan for a Flutter app. Return the highest-value test cases a team should write next. Respond with STRICT JSON only — no prose, no markdown fences.';
  const prompt = `Return a JSON array (max 15) of prioritized test cases. Each item: {"title": str, "type": "widget"|"unit"|"integration"|"golden", "priority": "high"|"med"|"low", "targetFile": str (source file it covers, or ""), "given": str, "when": str, "then": str}. Focus on real user-facing behaviour, critical flows, and edge/error paths. Framework: ${fw}.\n\nUntested source files (prioritize these):\n${(untested || []).slice(0, 60).join('\n') || '(none reported)'}\n\nApp source (truncated):\n${sourceContext(projectPath)}`;
  const { text, model } = await ai.callAI(toolId, prompt, { system, maxTokens: 3000, temperature: 0.2 });
  const items = jsonBlock(text);
  return { items: Array.isArray(items) ? items : [], model };
}
// Write BDD/Gherkin scenarios for a file or a free-text feature.
async function writeScenario(toolId, projectPath, file = '', feature = '') {
  let ctx = feature ? `Feature described by the user: ${feature}` : '';
  if (file) { const abs = guard(projectPath, file); ctx += `\n\nSource file ${path.relative(projectPath, abs)}:\n\`\`\`\n${fs.readFileSync(abs, 'utf8').slice(0, 10000)}\n\`\`\``; }
  if (!ctx) ctx = 'App source (truncated):\n' + sourceContext(projectPath, 16000);
  const prompt = `You are a senior QA engineer. Write clear BDD acceptance-test scenarios in Gherkin (Feature / Scenario / Given / When / Then, with Scenario Outline + Examples where useful). Cover the happy path, key edge cases, and error handling. Output ONLY Gherkin in a single \`\`\`gherkin code block.\n\n${ctx}`;
  const { text, model } = await ai.callAI(toolId, prompt, { maxTokens: 2000, temperature: 0.3 });
  return { gherkin: codeFence(text), model };
}
// Convert generated Gherkin into a runnable Flutter test (widget or integration).
async function scenarioToTest(toolId, projectPath, gherkin, type = 'widget') {
  const fw = frameworkFor(projectPath);
  const integration = type === 'integration';
  const kind = integration
    ? 'a Flutter integration_test that boots the app (import main as `app`, IntegrationTestWidgetsFlutterBinding, pumpAndSettle between steps) and drives the flow end-to-end'
    : 'a flutter_test widget test that pumps the relevant widget(s) in a MaterialApp and asserts UI + interactions';
  const prompt = `You are a senior Flutter test engineer. Convert the Gherkin scenarios below into ${kind}, using ${fw}. Turn each Scenario / Scenario Outline into a test (use the Examples table rows as cases). Match real widget keys, text labels, and routes from the app source. Be resilient (guard finds). Output ONLY the test file code in a single code block — no prose.\n\nGherkin:\n\`\`\`gherkin\n${String(gherkin || '').slice(0, 8000)}\n\`\`\`\n\nApp source (truncated):\n${sourceContext(projectPath, 20000)}`;
  const { text, model } = await ai.callAI(toolId, prompt, { maxTokens: 3500, temperature: 0.2 });
  return { code: codeFence(text), model, suggestedPath: integration ? 'integration_test/scenario_test.dart' : 'test/scenario_test.dart' };
}
// A scripted integration smoke that walks key user journeys.
async function smokeJourneys(toolId, projectPath) {
  const prompt = `You are a senior mobile QA engineer. Write a Flutter integration_test that boots the app and walks its most important user journeys end-to-end (launch → main screen → 2-3 key flows), tapping/entering text and asserting the app reaches each expected state. Use IntegrationTestWidgetsFlutterBinding, import the app's main as \`app\`, and pumpAndSettle between steps. Be resilient (guard finds). Output ONLY the test file code in a single code block — no prose.\n\nApp source (truncated):\n${sourceContext(projectPath, 24000)}`;
  const { text, model } = await ai.callAI(toolId, prompt, { maxTokens: 3000, temperature: 0.2 });
  return { code: codeFence(text), model, suggestedPath: 'integration_test/smoke_test.dart' };
}
module.exports = { generateTest, testPlan, writeScenario, scenarioToTest, smokeJourneys };
