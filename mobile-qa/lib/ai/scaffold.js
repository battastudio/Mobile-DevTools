'use strict';
// Deterministic scaffolds (no AI) — write a starter test for a file, a Playwright E2E starter, or a
// per-type template. saveFile refuses to clobber; guard keeps writes inside the project.
const fs = require('fs');
const path = require('path');
const { frameworkFor, suggestTestPath, guard } = require('./context');

function saveFile(projectPath, file, content) {
  const abs = guard(projectPath, file);
  if (fs.existsSync(abs)) throw new Error('file already exists: ' + path.relative(projectPath, abs));
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
  return { written: path.relative(projectPath, abs) };
}
function scaffoldTest(projectPath, file) {
  const fw = frameworkFor(projectPath); const rel = path.relative(projectPath, path.isAbsolute(file) ? file : path.join(projectPath, file));
  const target = suggestTestPath(rel, fw);
  const isDart = fw === 'flutter_test';
  const body = isDart
    ? `import 'package:flutter_test/flutter_test.dart';\n\n// TODO: import the unit under test from ${rel}\n\nvoid main() {\n  group('${path.basename(rel)}', () {\n    test('TODO: describe expected behaviour', () {\n      // arrange / act / assert\n      expect(true, isTrue);\n    });\n  });\n}\n`
    : `import { describe, it, expect } from 'vitest';\n// TODO: import the unit under test from ${rel}\n\ndescribe('${path.basename(rel)}', () => {\n  it('TODO: describe expected behaviour', () => {\n    expect(true).toBe(true);\n  });\n});\n`;
  return saveFile(projectPath, target, body);
}
function scaffoldE2E(projectPath) {
  const cfg = `import { defineConfig } from '@playwright/test';\nexport default defineConfig({\n  testDir: './e2e',\n  use: { baseURL: process.env.BASE_URL || 'http://localhost:3000', trace: 'on-first-retry' },\n});\n`;
  const smoke = `import { test, expect } from '@playwright/test';\n\ntest('home page loads', async ({ page }) => {\n  await page.goto('/');\n  await expect(page).toHaveTitle(/.+/);\n});\n\ntest('has no obvious console errors', async ({ page }) => {\n  const errors: string[] = [];\n  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));\n  await page.goto('/');\n  expect(errors, errors.join('\\n')).toHaveLength(0);\n});\n`;
  const written = [];
  const cfgPath = path.join(projectPath, 'playwright.config.ts'); if (!fs.existsSync(cfgPath)) { fs.writeFileSync(cfgPath, cfg); written.push('playwright.config.ts'); }
  const smokePath = path.join(projectPath, 'e2e', 'smoke.spec.ts'); if (!fs.existsSync(smokePath)) { fs.mkdirSync(path.dirname(smokePath), { recursive: true }); fs.writeFileSync(smokePath, smoke); written.push('e2e/smoke.spec.ts'); }
  return { written, note: written.length ? 'Install Playwright to run: npm i -D @playwright/test && npx playwright install' : 'Playwright files already present.' };
}
const TYPE_TEMPLATES = {
  'flutter-widget': { path: 'test/example_widget_test.dart', body: `import 'package:flutter/material.dart';\nimport 'package:flutter_test/flutter_test.dart';\n\nvoid main() {\n  testWidgets('renders and reacts to a tap', (tester) async {\n    var tapped = false;\n    await tester.pumpWidget(MaterialApp(home: Scaffold(body: ElevatedButton(\n      key: const Key('btn'), onPressed: () => tapped = true, child: const Text('Tap')))));\n    expect(find.text('Tap'), findsOneWidget);\n    await tester.tap(find.byKey(const Key('btn')));\n    await tester.pump();\n    expect(tapped, isTrue);\n  });\n}\n` },
  'flutter-unit': { path: 'test/example_unit_test.dart', body: `import 'package:flutter_test/flutter_test.dart';\n\nint add(int a, int b) => a + b; // TODO: import your real unit\n\nvoid main() {\n  group('add', () {\n    test('adds two numbers', () => expect(add(2, 3), 5));\n    test('handles zero', () => expect(add(0, 0), 0));\n  });\n}\n` },
  'flutter-integration': { path: 'integration_test/app_test.dart', body: `import 'package:flutter_test/flutter_test.dart';\nimport 'package:integration_test/integration_test.dart';\n// import 'package:your_app/main.dart' as app;\n\nvoid main() {\n  IntegrationTestWidgetsFlutterBinding.ensureInitialized();\n  testWidgets('full app smoke flow', (tester) async {\n    // app.main();\n    await tester.pumpAndSettle();\n    // await tester.tap(find.text('Login')); await tester.pumpAndSettle();\n    expect(true, isTrue); // TODO: assert a real journey\n  });\n}\n// Run on a booted device: flutter test integration_test/ -d <device>\n` },
  'flutter-golden': { path: 'test/example_golden_test.dart', body: `import 'package:flutter/material.dart';\nimport 'package:flutter_test/flutter_test.dart';\n\nvoid main() {\n  testWidgets('matches golden', (tester) async {\n    await tester.pumpWidget(const MaterialApp(home: Scaffold(body: Center(child: Text('Hello')))));\n    await expectLater(find.byType(MaterialApp), matchesGoldenFile('goldens/hello.png'));\n  });\n}\n// Generate the reference once: flutter test --update-goldens\n` },
  'flutter-perf-jank': { path: 'integration_test/perf_test.dart', body: `import 'package:flutter/material.dart';\nimport 'package:flutter_test/flutter_test.dart';\nimport 'package:integration_test/integration_test.dart';\n// import 'package:your_app/main.dart' as app;\n\nvoid main() {\n  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();\n  testWidgets('scroll performance', (tester) async {\n    // app.main();\n    await tester.pumpAndSettle();\n    await binding.traceAction(() async {\n      // TODO: drive a real scroll/animation on a key screen\n      final scrollable = find.byType(Scrollable);\n      if (scrollable.evaluate().isNotEmpty) {\n        await tester.fling(scrollable.first, const Offset(0, -500), 3000);\n        await tester.pumpAndSettle();\n      }\n    }, reportKey: 'scrolling_summary');\n  });\n}\n// Run: flutter test integration_test/perf_test.dart --profile -d <device>\n` },
  'flutter-a11y': { path: 'test/a11y_test.dart', body: `import 'package:flutter/material.dart';\nimport 'package:flutter_test/flutter_test.dart';\n\nvoid main() {\n  testWidgets('meets accessibility guidelines', (tester) async {\n    final handle = tester.ensureSemantics();\n    await tester.pumpWidget(const MaterialApp(home: Scaffold(body: Center(child: Text('Hello')))));\n    // TODO: pump your real screen instead of the placeholder above\n    await expectLater(tester, meetsGuideline(textContrastGuideline));\n    await expectLater(tester, meetsGuideline(androidTapTargetGuideline));\n    await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));\n    handle.dispose();\n  });\n}\n` },
};
function scaffoldType(projectPath, typeId) {
  if (typeId === 'web-e2e') return scaffoldE2E(projectPath);
  const t = TYPE_TEMPLATES[typeId];
  if (!t) throw new Error('No starter template for "' + typeId + '" — run/guide only.');
  return saveFile(projectPath, t.path, t.body);
}
module.exports = { saveFile, scaffoldTest, scaffoldE2E, scaffoldType, TYPE_TEMPLATES };
