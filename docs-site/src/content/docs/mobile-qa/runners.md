---
title: Runners & grading
description: Every Mobile QA runner — the command it runs, its severity, and exactly how each status is decided.
sidebar:
  order: 6
---

A **runner** is one graded check. Each is pure data — an id, a category, a severity, and a `run`
function that shells out and returns a status. Mobile QA runs the catalog in order and grades the
result. Only runners that apply to a project execute; the rest report **N/A**.

## How grading works

The score starts at 100. Each **failing** check deducts by its severity — nothing else does:

| Severity | Deduction on fail |
|----------|-------------------|
| Critical | −35 |
| High | −20 |
| Medium | −9 |
| Low | −3 |
| Info | 0 |

The score is floored at 0 and mapped to a letter:

| Score | Grade |
|-------|-------|
| ≥ 90 | A |
| ≥ 78 | B |
| ≥ 64 | C |
| ≥ 45 | D |
| < 45 | F |

:::note
**Warnings and N/A never lower the grade.** A **REVIEW** (warn) check — like formatting, outdated
deps, or the manual sign-off items — shows up in the summary but doesn't cost points. Only a
**FAIL** deducts, and only by its severity.
:::

Each check also rolls up into a **category**, and the Quality summary shows the worst status per
category. Statuses render as **PASS**, **FAIL**, **REVIEW** (warn), or **N/A**.

## Analyze

**Static analysis** · category `Analyze` · severity **high**

```sh
flutter analyze --no-pub
```

- **PASS** — "No issues found".
- **FAIL** — any issues; the metric is the issue count.
- **N/A** — `flutter` not on `PATH`.

## Tests

**Unit / widget tests** · category `Tests` · severity **critical**

```sh
flutter test --coverage --reporter=expanded
```

- **PASS** — the run is green with zero failures (metric: *N passed*).
- **FAIL** — one or more tests fail.
- **N/A** — no `test/` directory.

This is the highest-stakes check (a fail costs 35 points) and it also writes `coverage/lcov.info`,
which the Coverage check reads.

**Integration tests** · category `Integration` · severity **high**

```sh
flutter test integration_test -d <device>
```

- **PASS** — green on the selected device.
- **FAIL** — one or more integration tests fail.
- **N/A** — no `integration_test/` directory, or no device selected (these drive the real app, so
  pick one in the run bar).

**Golden (snapshot) tests** · category `Golden` · severity **medium**

```sh
flutter test <files containing matchesGoldenFile>
```

- **PASS** — the rendered UI matches every stored golden.
- **FAIL** — a pixel diff. If the change is intended, update with `flutter test --update-goldens`.
- **N/A** — no golden tests found in `test/`.

## Coverage

**Test coverage** · category `Coverage` · severity **medium**

Reads `coverage/lcov.info` (produced by the test runner) and computes line coverage.

- **PASS** — ≥ 60%
- **REVIEW** — 30–59%
- **FAIL** — < 30%
- **N/A** — no `coverage/lcov.info` (run tests with `--coverage` first).

**Test coverage gap** · category `Coverage` · severity **medium**

Walks `lib/` and matches each source file to a test file by name. Produces the **test plan** — the
list of untested files surfaced in the UI.

- **PASS** — ≥ 60% of source files have a matching test
- **REVIEW** — 25–59%
- **FAIL** — < 25%
- **N/A** — no source files found.

## Lint & hygiene

**Formatting** · category `Lint` · severity **low**

```sh
dart format --set-exit-if-changed --output=none .
```

- **PASS** — all files formatted.
- **REVIEW** — files need formatting (fix instantly with **Auto-fix**).
- **N/A** — `dart` not on `PATH`.

**Outdated dependencies** · category `Deps` · severity **low**

```sh
flutter pub outdated --no-dev-dependencies
```

Always **REVIEW** — an informational list of packages behind their latest version.

## Performance

**Startup performance** · category `Performance` · severity **medium**

```sh
flutter run --profile --trace-startup -d <device>
```

Reads `build/start_up_info.json` for time-to-first-frame.

- **PASS** — ≤ 2000 ms
- **REVIEW** — 2001–3500 ms
- **FAIL** — > 3500 ms
- **N/A** — no device selected.

**Frame / jank profiling** · category `Performance` · severity **low**

```sh
flutter test integration_test/perf_test.dart --profile -d <device>
```

Reads the timeline summary and computes the missed-frame budget %.

- **PASS** — ≤ 5% jank
- **REVIEW** — 6–15%
- **FAIL** — > 15%
- **N/A** — no `integration_test/perf_test.dart` (scaffold one), or no device selected.

**App size** · category `Performance` · severity **low**

```sh
flutter build apk --analyze-size --target-platform android-arm64 --release
```

Reports the release APK size and the biggest contributors.

- **PASS** — ≤ 40 MB
- **REVIEW** — 41–70 MB, or the build produced no APK (usually a missing Android SDK / signing).
- **FAIL** — > 70 MB.

## Accessibility

**Accessibility** · category `Accessibility` · severity **medium**

Runs any `meetsGuideline` a11y tests in `test/`, then statically scans `lib/` for images without a
`semanticLabel` and icon buttons without a `tooltip` ("smells").

- **FAIL** — a guideline test fails, or more than 8 smells.
- **REVIEW** — 1–8 smells, or a clean scan with no guideline tests.
- **PASS** — no smells and guideline tests present.

Offending files are listed and get a per-file **Fix (AI)** action.

## Manual QA

Three human sign-off checklists — **Release smoke test** (severity high), **Device / OS matrix**
(medium), and **Regression sign-off** (medium). They never run a tool and always report **REVIEW**,
so they surface as reminders in every run without affecting the numeric grade.

## Running a subset

From a project's detail view you can **Run selected** test types instead of the whole catalog. A
subset run merges into the last full record — the checks you didn't run keep their previous result —
so the grade stays complete.
