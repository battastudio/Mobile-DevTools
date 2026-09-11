'use strict';
// Test-type catalog — the "features" layer over the runner registry (lib/qa/runners). Each test
// type is a selectable card with guidance (what / why / how-to flow) and maps to one or more runner
// ids that actually execute. Grouped by platform; Mobile QA surfaces the flutter set.
// scaffold: kind passed to lib/ai scaffolds · ai: AI generation hint · url: needs a live URL.

const TEST_TYPES = [
  // ================= MOBILE (Flutter) =================
  { id: 'flutter-widget', platform: 'flutter', name: 'Widget tests', runnerIds: ['flutter-test', 'flutter-coverage'], scaffold: 'widget', ai: true,
    what: 'Render a single widget in a test harness and assert on its UI + interactions, without a device.',
    why: 'Fast, reliable coverage of screens and components — catches layout/logic regressions in seconds.',
    flow: '1) Put tests in test/ (e.g. test/login_screen_test.dart).\n2) Use testWidgets("...", (tester) async { await tester.pumpWidget(MaterialApp(home: MyWidget())); expect(find.text("Login"), findsOneWidget); await tester.tap(find.byKey(Key("submit"))); await tester.pump(); ... });\n3) Run: flutter test  (add --coverage for lcov).\n4) Find widgets with find.byType/byKey/text; drive them with tester.tap/enterText/pump.' },
  { id: 'flutter-unit', platform: 'flutter', name: 'Unit tests', runnerIds: ['flutter-test'], scaffold: 'unit', ai: true,
    what: 'Test pure Dart logic (functions, classes, providers, use-cases) in isolation.',
    why: 'The cheapest, most stable tests — cover business rules, parsing, and edge cases exhaustively.',
    flow: '1) test/ file: test("adds", () { expect(add(2,3), 5); });\n2) Group with group("Calculator", () { ... });\n3) Mock dependencies (mocktail/mockito) so the unit is isolated.\n4) Run: flutter test test/  (or a single file).' },
  { id: 'flutter-integration', platform: 'flutter', name: 'Integration tests', runnerIds: ['flutter-integration'], scaffold: 'integration', ai: true,
    what: 'Drive the full app on a real device/emulator and assert end-to-end user journeys.',
    why: 'Verifies real flows (login → dashboard → action) the way a user experiences them.',
    flow: '1) Add integration_test to dev_dependencies + create integration_test/app_test.dart.\n2) IntegrationTestWidgetsFlutterBinding.ensureInitialized(); testWidgets(...) { app.main(); await tester.pumpAndSettle(); ... }\n3) Run: flutter test integration_test/  (on a booted device/emulator).' },
  { id: 'flutter-golden', platform: 'flutter', name: 'Golden (snapshot) tests', runnerIds: ['flutter-golden'], scaffold: 'golden', ai: true,
    what: 'Compare a widget’s rendered pixels against a stored reference image (a "golden").',
    why: 'Locks visual appearance — any unintended UI change fails the test.',
    flow: '1) testWidgets: await expectLater(find.byType(MyCard), matchesGoldenFile("goldens/my_card.png"));\n2) Generate references: flutter test --update-goldens.\n3) Commit the goldens/ PNGs; CI re-renders and diffs them.' },
  { id: 'flutter-analyze', platform: 'flutter', name: 'Static analysis', runnerIds: ['flutter-analyze'], ai: false,
    what: 'Run the Dart analyzer over the whole project for errors, warnings, and lint violations.',
    why: 'Catches bugs and style issues before tests even run; treat lints as errors in analysis_options.yaml.',
    flow: 'Run: flutter analyze  ·  Configure rules in analysis_options.yaml (include: package:flutter_lints/flutter.yaml).' },
  { id: 'flutter-coverage', platform: 'flutter', name: 'Coverage', runnerIds: ['flutter-coverage'], ai: false,
    what: 'Measure how much code your tests execute (line coverage from lcov).',
    why: 'Finds untested code paths; aim ≥60% on critical logic.',
    flow: 'Run: flutter test --coverage → coverage/lcov.info. View with genhtml or an IDE gutter.' },
  { id: 'flutter-format', platform: 'flutter', name: 'Formatting', runnerIds: ['dart-format'], ai: false,
    what: 'Check code is formatted to the Dart standard.',
    why: 'Consistent style, clean diffs.', flow: 'Run: dart format . (add --set-exit-if-changed in CI).' },
  { id: 'flutter-gap', platform: 'flutter', name: 'Test plan (coverage gap)', runnerIds: ['test-gap'], ai: false,
    what: 'Map which source files have no matching test.', why: 'A prioritized list of what to test next.', flow: 'Auto-computed. Use “AI test” / “Scaffold” on each untested file.' },
  { id: 'flutter-perf-startup', platform: 'flutter', name: 'Startup performance', runnerIds: ['perf-startup'], ai: false,
    what: 'Measure time-to-first-frame by launching the app in profile mode on a device.',
    why: 'Slow cold starts lose users; catch regressions before release. Aim under ~2s.',
    flow: 'Pick a device in the run bar. Run → flutter run --profile --trace-startup -d <device> writes build/start_up_info.json.' },
  { id: 'flutter-perf-jank', platform: 'flutter', name: 'Frame / jank profiling', runnerIds: ['perf-jank'], scaffold: 'perf', ai: false,
    what: 'Scroll/animate key screens under profile mode and report frame build/raster times + jank %.',
    why: 'Janky frames (>16ms) feel laggy. This finds the screens that drop frames.',
    flow: 'Scaffold integration_test/perf_test.dart (traceAction + reportTimeline), pick a device, Run.' },
  { id: 'flutter-size', platform: 'flutter', name: 'App size', runnerIds: ['flutter-app-size'], ai: false,
    what: 'Build a release APK with --analyze-size and report total size + the biggest contributors.',
    why: 'Large apps hurt install/update conversion. Track and trim size over time.',
    flow: 'Run → flutter build apk --analyze-size --target-platform android-arm64 --release.' },
  { id: 'flutter-a11y', platform: 'flutter', name: 'Accessibility', runnerIds: ['flutter-a11y'], scaffold: 'a11y', ai: false,
    what: 'Run a11y guideline tests (contrast, tap-target, labels) and statically scan for missing semantics.',
    why: 'Accessible apps reach more users and meet compliance. Catches unlabeled images/icon buttons.',
    flow: 'Run to scan lib/ + any meetsGuideline tests. Scaffold adds an a11y guideline widget test.' },

  // ================= WEB (front-end) =================
  { id: 'web-unit', platform: 'web', name: 'Component / unit tests', runnerIds: ['web-test'], scaffold: 'web-unit', ai: true,
    what: 'Test components and functions with Vitest/Jest + Testing Library.',
    why: 'Fast confidence on UI logic and rendering; the backbone of front-end testing.',
    flow: '1) *.test.tsx next to the component.\n2) import { render, screen } from "@testing-library/react"; test("shows title", () => { render(<Card title="Hi"/>); expect(screen.getByText("Hi")).toBeInTheDocument(); });\n3) Run: npm test  (vitest run / jest).' },
  { id: 'web-e2e', platform: 'web', name: 'End-to-end (Playwright)', runnerIds: ['web-e2e'], scaffold: 'e2e', ai: true,
    what: 'Drive a real browser through full user journeys.',
    why: 'Catches integration bugs unit tests miss — routing, auth, forms, API wiring.',
    flow: '1) npm i -D @playwright/test && npx playwright install.\n2) e2e/*.spec.ts: test("login", async ({page}) => { await page.goto("/"); await page.getByLabel("Email").fill("a@b.co"); ... });\n3) Run: npx playwright test. (Use “Scaffold E2E” to start.)' },
  { id: 'web-typecheck', platform: 'web', name: 'Type check', runnerIds: ['web-typecheck'], ai: false,
    what: 'Compile with tsc --noEmit to catch type errors.', why: 'Eliminates a whole class of runtime bugs.', flow: 'Run: npx tsc --noEmit. Enable "strict": true in tsconfig.' },
  { id: 'web-lint', platform: 'web', name: 'Lint', runnerIds: ['web-lint'], ai: false,
    what: 'ESLint over the codebase.', why: 'Consistency + common-bug detection.', flow: 'Run: npm run lint (or npx eslint .). Autofix with --fix.' },
  { id: 'web-a11y', platform: 'web', name: 'Accessibility', runnerIds: ['a11y'], url: true, ai: false,
    what: 'Check the served HTML for alt text, labels, lang, headings, landmarks.',
    why: 'Usable by everyone + legal compliance; also helps SEO.',
    flow: 'Provide the live URL. For full JS-rendered coverage, add axe-core to your Playwright E2E (injectAxe + checkA11y).' },
  { id: 'web-perf', platform: 'web', name: 'Performance', runnerIds: ['perf'], url: true, ai: false,
    what: 'Proxy metrics: TTFB, HTML size, compression, caching, blocking resources.',
    why: 'Faster pages = better UX + SEO.', flow: 'Provide the live URL. For field LCP/CLS run Lighthouse in a browser (npx lighthouse <url>).' },
  { id: 'web-seo', platform: 'web', name: 'SEO', runnerIds: ['seo'], url: true, ai: false,
    what: 'Title, meta description, canonical, Open Graph, JSON-LD, robots, sitemap.',
    why: 'Discoverability in search + social.', flow: 'Provide the live URL (works great on SSR sites).' },
  { id: 'web-build', platform: 'web', name: 'Production build', runnerIds: ['web-build'], ai: false,
    what: 'Run the production build.', why: 'A broken build blocks release.', flow: 'Run: npm run build.' },
  { id: 'web-gap', platform: 'web', name: 'Test plan (coverage gap)', runnerIds: ['test-gap'], ai: false,
    what: 'Map untested components/files.', why: 'Know what to test next.', flow: 'Auto-computed. Use AI test / Scaffold per file.' },

  // ================= BACKEND (Laravel) =================
  { id: 'laravel-feature', platform: 'laravel', name: 'Feature / HTTP tests', runnerIds: ['php-test'], scaffold: 'feature', ai: true,
    what: 'Hit your routes/controllers end-to-end and assert responses, DB effects, and side-effects.',
    why: 'The highest-value backend tests — they exercise real request→response→DB flows.',
    flow: '1) tests/Feature/LoginTest.php.\n2) $this->postJson("/api/login", ["email"=>"a@b.co","password"=>"x"])->assertOk()->assertJsonStructure(["token"]);\n3) Use RefreshDatabase + factories to seed state.\n4) Run: php artisan test  (or vendor/bin/pest).' },
  { id: 'laravel-unit', platform: 'laravel', name: 'Unit tests', runnerIds: ['php-test'], scaffold: 'feature', ai: true,
    what: 'Test a single class/method in isolation.', why: 'Fast checks of pure logic and services.',
    flow: 'tests/Unit/*.php: $this->assertEquals(5, (new Calc)->add(2,3)); Run: php artisan test --testsuite=Unit.' },
  { id: 'laravel-db', platform: 'laravel', name: 'Database tests', runnerIds: ['php-test'], ai: false,
    what: 'Test migrations, models, factories, and queries against a test DB.',
    why: 'Confidence that data logic and constraints hold.',
    flow: 'use RefreshDatabase; User::factory()->create(); $this->assertDatabaseHas("users", ["email"=>...]); Configure a sqlite :memory: test DB in phpunit.xml.' },
  { id: 'laravel-style', platform: 'laravel', name: 'Code style (Pint)', runnerIds: ['pint'], ai: false,
    what: 'Laravel Pint style check.', why: 'Consistent PSR-12 style.', flow: 'Run: vendor/bin/pint (--test in CI).' },
  { id: 'laravel-deps', platform: 'laravel', name: 'Dependencies', runnerIds: ['composer-outdated'], ai: false,
    what: 'Outdated composer packages.', why: 'Stay patched.', flow: 'Run: composer outdated --direct.' },
];

const typesForPlatform = (platform) => TEST_TYPES.filter((t) => t.platform === platform);
function runnerIdsForTypes(typeIds) {
  const set = new Set();
  for (const t of TEST_TYPES) if (typeIds.includes(t.id)) for (const r of t.runnerIds) set.add(r);
  return [...set];
}
module.exports = { TEST_TYPES, typesForPlatform, runnerIdsForTypes };
