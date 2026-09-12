---
title: Mobile QA overview
description: A zero-dependency QA console for Flutter apps — one grade per project, plus a built-in Device Lab.
sidebar:
  order: 1
---

Mobile QA runs the Flutter quality checks your team already cares about — `flutter analyze`,
`flutter test`, coverage, formatting, performance, accessibility — grades the result, and shows
what changed since the last run. It also ships a **Device Lab** that drives a real emulator or
simulator: install, launch, screenshot, screen-record, stream logs, and stress-test the app.

Everything runs on your machine. No accounts, no cloud, no build step.

## The core idea: one grade per project

Every run produces a single, severity-weighted grade (**A–F**) for a project. Failing a critical
check (like unit tests) costs far more than a low-severity one (like formatting), so the grade
reflects real release risk, not a raw pass count. Each check rolls up into a category — Tests,
Coverage, Analyze, Performance, Manual QA, and more — so you can see at a glance where the project
is weak.

Runs are stored per project, so Mobile QA also tracks **trends**: a sparkline of recent scores and a
"since last run" delta showing new failures, fixed checks, and the score change.

## The main screens

Mobile QA has three top-level screens, switchable from the top nav:

| Screen | What it's for |
|--------|---------------|
| **Dashboard** | The quality console — overall grade, weakest project, failing checks, and a list of every project you've run, sorted worst-first. |
| **Run QA** | Pick a project (or paste a path) and run the checks. Streams a live log as each runner executes. |
| **Device Lab** | Connect a booted device or simulator and check the real app: install & launch, screenshot, record, live logs, and an automated smoke. |

Opening a project from the Dashboard takes you to its **detail view**: the grade, a category
breakdown, per-test-type cards with what/why/how guidance, and the run/export/AI actions.

## What you can do

- **Run graded QA** on a Flutter project — analysis, unit/widget tests, coverage, a test-gap map,
  formatting, outdated deps, integration & golden tests, startup/jank/app-size performance,
  accessibility, and a manual sign-off checklist.
- **Read the grade and category breakdown**, then drill into any failing check for the exact output
  and a concrete "how to improve".
- **Auto-fix** the safe stuff — `dart format` + `dart fix --apply` — in one click, then re-run.
- **Track trends** per project with a score sparkline and a since-last-run delta.
- **Generate tests with AI** — a prioritized test plan, a widget/unit/integration test for a file,
  BDD/Gherkin scenarios, an integration smoke, and a test-readiness QA summary.
- **Export for CI** — a printable HTML report, a per-file coverage table, a grade badge (SVG), and
  JUnit-XML / JSON.
- **Drive a real device** from the Device Lab — install & launch, capture screenshots and video,
  stream crash-highlighted logs, and run an automated smoke.

## Run it

Launch the whole hub (Mobile QA starts as a child process):

```sh
node serve
```

Or run Mobile QA on its own:

```sh
node mobile-qa/server.js
```

Then open **http://localhost:4113**.

:::note
Mobile QA scans for Flutter projects under `~/mobileApps` by default. Point `PROJECTS_ROOT` at
wherever your projects live, or paste an absolute path in the **Run QA** form.
:::

See [Usage](/Mobile-DevTools/mobile-qa/usage/) for a full walkthrough, or
[Features](/Mobile-DevTools/mobile-qa/features/) for everything Mobile QA can do.
