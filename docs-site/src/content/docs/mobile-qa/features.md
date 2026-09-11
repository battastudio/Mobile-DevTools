---
title: Features
description: Every Mobile QA feature — runners, grading, auto-fix, trends, AI QA, CI export, and the Device Lab.
sidebar:
  order: 3
---

This is the complete feature list, grouped by area. For how each check is graded, see
[Runners](/Mobile-DevTools/mobile-qa/runners/); for the Device Lab, see
[Device Lab](/Mobile-DevTools/mobile-qa/device-lab/).

## The runners

Mobile QA runs a fixed catalog of Flutter runners. Only the ones that apply to a project execute;
the rest report **N/A**. Each streams its progress and returns a status, a metric, and a
"how to improve" note.

| Runner | Category | What it runs | How to use it |
|--------|----------|--------------|---------------|
| **Static analysis** | Analyze | `flutter analyze --no-pub` | Runs automatically. Fails with the issue count; treat lints as errors in `analysis_options.yaml`. |
| **Unit / widget tests** | Tests | `flutter test --coverage --reporter=expanded` | Put tests in `test/`. Fails if any test fails; this also produces the lcov used by Coverage. |
| **Integration tests** | Integration | `flutter test integration_test -d <device>` | Add `integration_test/` and pick a device in the run bar. Runs the full app end-to-end. |
| **Golden (snapshot) tests** | Golden | `flutter test <golden files>` | Auto-detected from any `matchesGoldenFile` in `test/`. Fails on a pixel diff; update with `flutter test --update-goldens`. |
| **Test coverage** | Coverage | reads `coverage/lcov.info` | Run tests with `--coverage` first. Grades line coverage (pass ≥60%). |
| **Test coverage gap** | Coverage | maps `lib/` files to tests | Auto-computed. Lists source files with no matching test — the basis of the test plan. |
| **Formatting** | Lint | `dart format --set-exit-if-changed --output=none .` | Warns if files need formatting. One-click **Auto-fix** applies it. |
| **Outdated dependencies** | Deps | `flutter pub outdated --no-dev-dependencies` | Informational — lists packages behind their latest. |
| **Startup performance** | Performance | `flutter run --profile --trace-startup -d <device>` | Pick a device. Reports time-to-first-frame (aim under ~2s). |
| **Frame / jank profiling** | Performance | `flutter test integration_test/perf_test.dart --profile -d <device>` | Scaffold a `perf_test.dart`, pick a device. Reports missed-frame budget %. |
| **App size** | Performance | `flutter build apk --analyze-size --target-platform android-arm64 --release` | Builds a release APK and reports total MB + the biggest contributors. |
| **Accessibility** | Accessibility | runs `meetsGuideline` tests + statically scans `lib/` | Flags images without `semanticLabel` and icon buttons without `tooltip`. |
| **Release smoke test** | Manual QA | — (checklist) | A human sign-off item: install a release build, launch, login, core flow, offline, logout. |
| **Device / OS matrix** | Manual QA | — (checklist) | Sign-off: verify on min + latest OS, small + large screen, iOS + Android. |
| **Regression sign-off** | Manual QA | — (checklist) | Sign-off: re-test changed areas + previously-fixed bugs before ship. |

## Grading engine

Every run produces one severity-weighted grade. The score starts at 100 and each **failing** check
deducts by its severity: critical −35, high −20, medium −9, low −3. Warnings and N/A checks don't
deduct. The score maps to a letter — **A** ≥90, **B** ≥78, **C** ≥64, **D** ≥45, else **F** — and a
per-category **Quality summary** shows each category's worst status. See
[Runners](/Mobile-DevTools/mobile-qa/runners/#how-grading-works) for the full formula.

## Auto-fix

One-click, safe-only fixes from the toolbar. Auto-fix runs `dart format .` then `dart fix --apply`
— formatters only, never your logic — so the change is easy to review. Run it, check the diff,
re-run QA.

## Per-project trends and sparklines

Mobile QA stores each run per project (the last 20), so it can show how quality is moving:

- **Score sparkline** — a mini line chart of recent scores, on the Dashboard list and the detail
  header.
- **Since last run** delta — the score change (▲ / ▼), how many checks are **new failing**, and
  how many you **fixed**.
- **Slack / Telegram alert** — if you've configured notifications, a run that introduces new
  failing checks or drops the grade fires an alert automatically.

## AI QA

AI features are opt-in — set a provider and key in **Settings → AI** first (the key stays on your
machine and is never sent to the browser). Then, from a project's detail view:

- **Test plan** — AI drafts a prioritized list of the highest-value test cases to write next, each
  with type, priority, target file, and given/when/then. Shown as advice; it does **not** change the
  grade.
- **AI test (per file)** — the **AI** button on a test-type card generates a focused
  widget/unit/integration/golden test for a source file, with a suggested path you can save.
- **Write scenario** — generates BDD/Gherkin scenarios (Feature / Scenario / Given / When / Then)
  for a file or a free-text feature, then **Generate test code** turns them into a runnable Flutter
  test.
- **Smoke test** — writes an `integration_test/smoke_test.dart` that boots the app and walks its
  key user journeys end-to-end.
- **QA summary** — a concise, test-readiness briefing from the last run: release-readiness, top
  risks, and a fix-first order for the week.
- **Untested files** — lists source files with no matching test, each with a one-click **AI** or
  **Scaffold** action.
- **Explain (AI)** — on any failing check, explains the root cause and gives a concrete fix. The
  Device Lab's **AI triage** does the same for a console log.
- **Fix (AI)** — rewrites an offending file to fix the issue, shown as a preview you **Apply**
  (keeps a `.bak` backup).

:::note
Prefer no AI? Every test type also has a deterministic **Scaffold** button that writes a starter
test template — no key required.
:::

## CI export

From the **Reports** menu (and the report link) in a project's detail view:

- **Report** — a standalone, printable HTML QA report with the grade, summary, and every check's
  detail + how-to-fix.
- **Coverage** — a per-file coverage table built from `coverage/lcov.info`, lowest coverage first.
- **Badge (SVG)** — a grade badge for your README or CI, colored by letter.
- **JUnit XML** — one `<testcase>` per check, for CI dashboards.
- **JSON** — the full run record.
- **Device matrix** — run selected test types across several devices and get a combined report.

The same records are available headless via `--qa` for CI pipelines (see
[Usage](/Mobile-DevTools/mobile-qa/usage/#run-it-from-the-command-line-ci)).

## Device Lab

Connect a booted emulator or simulator and check the real app — install & launch, screenshot,
screen-record, stream crash-highlighted live logs, and run an automated smoke (Android `monkey`
stress or an iOS integration smoke). Captured screenshots and recordings are saved as artifacts you
can preview, download, share, or delete. Full details in
[Device Lab](/Mobile-DevTools/mobile-qa/device-lab/).

## Share

Results and artifacts can go to your team via the shared connectors — **Share to team**, a **Jira
issue**, and Slack / Telegram / email — configured once in the kit's connector settings.
