---
title: AI features
description: What AI adds to Mobile QA — generate tests, test plans, BDD scenarios, smoke journeys, and explain/fix failing tests.
sidebar:
  order: 2.5
---

Mobile QA runs and grades your Flutter tests without AI. Adding an AI provider
turns on generation and repair actions that write and fix test code for you.

:::note
Add a provider first — see **[Set up AI](/Mobile-DevTools/reference/ai-setup/)**.
The default **OmniRoute (local)** needs no key; cloud providers do. Every action
below is disabled until the AI tile reads *configured*.
:::

Generation:

- **Generate a test** — writes a focused test file for a source file (optionally
  hinted `widget` / `unit` / `integration` / `golden`) and suggests where to save it.
- **Test plan** — a prioritized, TestSprite-style list of test cases for the
  untested files (advice — it does not change your grade).
- **BDD / Gherkin scenario** — Gherkin acceptance scenarios for a file or a
  free-text feature description.
- **Scenario → test code** — turns a Gherkin scenario into a runnable Flutter
  widget or integration test.
- **Smoke journeys** — a Flutter `integration_test` that boots the app and walks
  the key user journeys end-to-end.

Repair:

- **Explain a failure** — root cause of a failing test, the minimal fix, and how
  to verify it's green.
- **Fix a test** — rewrites a failing test file so it passes for the right reason.
- **Fix code** — applies a fix to any source file (Dart/TS/JS/PHP) and returns the
  full corrected file. Applying a fix keeps a `.bak` backup.
- **QA summary** — an executive test-readiness briefing from the QA record.

All of these call your configured provider directly; nothing is sent to a
Batta/Mobile-DevTools server. See [Privacy & storage](/Mobile-DevTools/reference/ai-setup/#privacy--storage).
