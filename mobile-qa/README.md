# Mobile QA

A zero-dependency QA and testing tool for Flutter apps, built on `platform-kit`.
Run `flutter analyze` / `test` / coverage / `dart format` with a severity-weighted
grading engine, browse guided test types, scaffold and AI-generate tests, and drive
a real device or simulator from the built-in **Device Lab**. Everything runs on your
machine — no accounts, no cloud, no build step.

## What it does

- **Run QA** — runs the applicable Flutter runners over a project and grades the
  result (A–F, severity-weighted): static analysis, unit/widget tests, coverage,
  a test-gap map, formatting, outdated deps, integration & golden tests, startup /
  jank / app-size performance, accessibility, and a manual sign-off checklist.
- **Grade & report** — per-project history and a delta (new failures / fixed / score
  change), a printable HTML report, a coverage table, a CI grade badge (SVG), and
  JUnit-XML / JSON export.
- **Guided test types** — selectable cards (widget / unit / integration / golden /
  a11y / perf / …) with what/why/how guidance, one-click **Scaffold** starters, and
  optional **AI** test generation, scenarios, and fix suggestions.
- **Device Lab** — list booted devices/emulators, install & launch the app, capture
  screenshots and screen recordings, stream live logs (with crash highlighting), and
  run an automated smoke (Android `monkey` / iOS integration smoke).
- **Share** — Slack / Telegram notify, email (with artifact attachments), and Jira
  create / attach / comment via the shared connectors.

## Run

```sh
# From the repo root (Node.js >= 20):
node mobile-qa/server.js
```

Then open **http://localhost:4113**. Point `PROJECTS_ROOT` at where your Flutter
projects live (defaults to `~/mobileApps`).

```sh
# One-shot grade for CI (exits non-zero on failures at/above a severity floor):
node mobile-qa/server.js --qa /path/to/app --fail-on=high

# Sanity check (lists runners + probes for attached devices, never crashes):
node mobile-qa/server.js --selftest
```

## Requirements

- **Node.js ≥ 20**
- **Flutter SDK** on your `PATH` (for `flutter analyze` / `test` / build).
- **Device Lab** talks to *local* device tooling — shell-outs only, nothing bundled:
  - **Android:** platform-tools (`adb`) on your `PATH`, plus a booted emulator or a
    connected, authorized device. Override the binary with `ADB_BIN` if needed.
  - **iOS simulator:** Xcode command-line tools (`xcrun simctl`) with a booted
    simulator. Physical iOS devices have limited support (screenshots/recording need
    a simulator; installing needs a configured Xcode signing team).

## Configuration

Local config lives under `~/.mobile-devtools/mobile-qa/` — QA records (`qa.json`),
captured artifacts (`artifacts/`), AI provider/key, and notification settings. It is
git-ignored and never leaves your machine. Set an AI provider/key in **Settings → AI**
to enable the AI features (test generation, explain/fix, plan, summary).
