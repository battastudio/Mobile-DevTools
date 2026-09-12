---
title: Run your first QA
description: A start-to-finish walkthrough — pick a project, run QA, read the grade, auto-fix, and open a project's detail.
sidebar:
  order: 2
---

This walkthrough takes you from a fresh start to a graded project, a fix, and a re-run. Open
**http://localhost:4113** and follow along.

## 1. Pick a project (or a path)

Go to the **Run QA** screen. In the **Run QA on a project** form you have two ways to choose what
to check:

- **Project** — a dropdown of every Flutter project Mobile QA found under your projects root
  (`~/mobileApps` by default, or wherever `PROJECTS_ROOT` points).
- **…or a path** — paste an absolute path like `/Users/you/projects/app` if the project lives
  somewhere else.

:::tip
Don't see your project in the dropdown? Set `PROJECTS_ROOT` to the folder that contains it, or just
paste the full path in the **…or a path** field.
:::

## 2. Optionally add a live URL

The form has a **Live URL** field (labelled *adds SEO / accessibility / performance /
best-practices audit*). Mobile QA's graded checks are Flutter-focused — leave this blank for a
normal mobile run. Paste a URL only if you also want web-side audit context for a project that
ships a web build.

If your project has an emulator or simulator booted, a **Device** picker appears too. Integration
and performance runners need a device; everything else runs headless. See
[Device Lab](/Mobile-DevTools/mobile-qa/device-lab/) for connecting one.

## 3. Run QA

Click **Run QA**. Mobile QA streams a live log as each runner executes — you'll see lines like:

```
▸ QA my_app [flutter]
  … Unit / widget tests (flutter test)
  ✔ [pass] Unit / widget tests (flutter test) — 42 passed
  … Test coverage
  ! [warn] Test coverage — 48%
  ✔ [pass] Static analysis (flutter analyze) — No issues found.
▸ my_app: QA grade B (81/100) — 1 failing, 6 passing
```

Real builds and test runs take time — a first `flutter test` or an app-size build can run for
minutes. The log stays live the whole time.

:::note
Prefer to sweep everything? The Dashboard has a **Run all** button that grades every Flutter
project under your root in one pass.
:::

## 4. Read the grade and category breakdown

When the run finishes, you get:

- **The grade** — a single A–F letter and a score out of 100. It's severity-weighted: a failing
  critical check (unit tests) costs far more than a low one (formatting).
- **Quality summary** — a chip per category (Tests, Coverage, Analyze, Performance, Manual QA, …)
  showing its worst status: **PASS**, **REVIEW**, **FAIL**, or **N/A**.
- **By category** — a clickable breakdown; click a category to jump to its test-type card.
- **Since last run** — once a project has more than one run, a delta shows the score change,
  how many checks are **new failing**, and how many you **fixed**, plus a score sparkline.

Each check you can expand to see **What's wrong & how to fix** (the raw tool output) and a concrete
**How to improve** note.

## 5. Auto-fix the safe stuff

In a project's detail view, the toolbar has an **Auto-fix** button. It applies only safe
formatters — `dart format .` then `dart fix --apply` — and never touches your logic. It keeps the
change reviewable: run it, look at the diff, then re-run QA to confirm the Lint category went green.

## 6. Open a project's detail

Back on the **Dashboard**, projects are listed worst-first with their grade, failing/passing
counts, a trend sparkline, and how long ago they ran. Click any project to open its **detail view**,
where you can:

- Run **all** checks or **Run selected** test types (tick the cards you want).
- Read each test type's **what / why / how it works** guidance.
- **Scaffold** a starter test, or use the [AI features](/Mobile-DevTools/mobile-qa/ai/)
  to generate tests, BDD scenarios, and smoke journeys, or explain/fix a failing
  test. AI is off until you [set up a provider](/Mobile-DevTools/reference/ai-setup/)
  (the default local OmniRoute needs no key).
- **Auto-fix**, open the **Reports** menu (badge, JUnit, JSON, coverage), or jump to the **Device Lab**.

## Run it from the command line (CI)

Mobile QA grades a project without the UI — ideal for CI:

```sh
# One-shot grade; exits non-zero if any check fails at or above the severity floor.
node mobile-qa/server.js --qa /path/to/app --fail-on=high
```

It prints the full record as JSON to stdout and a one-line summary to stderr:

```
▸ my_app: QA grade B (81/100) — 1 failing at/above high
```

`--fail-on` accepts `crit`, `high` (default), `med`, `low`, or `info`. There's also a
`--url=` flag to pass a live URL. To sanity-check your setup without grading anything:

```sh
# Lists the runners and probes for attached devices — never crashes.
node mobile-qa/server.js --selftest
```

Next: the full [Features](/Mobile-DevTools/mobile-qa/features/) reference, or a deep dive into the
[runners](/Mobile-DevTools/mobile-qa/runners/) and how each is graded.
