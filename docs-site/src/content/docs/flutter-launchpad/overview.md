---
title: Flutter Launchpad
description: Assemble a project config in the UI and generate a complete, best-practice Flutter scaffold you download as a zip.
sidebar:
  order: 1
---

Flutter Launchpad turns a form into a finished Flutter project. You assemble a
config in the UI — mode, state management, packages, capabilities — and it
generates a complete, wired, best-practice scaffold you download as a `.zip` and
open in Flutter. No boilerplate, no starter-repo cloning, no login.

## The core idea

Three steps, all local:

1. **Configure** — pick a mode (or a recipe preset), then toggle the sections,
   packages, and capabilities your app needs.
2. **Generate** — Flutter Launchpad composes the whole project in memory and
   shows it in a tabbed preview: file tree, real Dart code, `pubspec.yaml`, and
   the generated docs.
3. **Download** — export a `.zip`, unzip it, run `flutter pub get`, and you have
   a buildable app.

It is not a template gallery. Every toggle changes the generated code: the
packages in `pubspec.yaml`, the services under `lib/`, the manifest snippets, and
the bring-up checklist all follow your choices.

## Where it runs

Flutter Launchpad runs entirely on your machine at
**http://localhost:4120**. There are no accounts and nothing leaves your
computer.

Launch it two ways:

```sh
# Via the hub — starts every tool, open http://localhost:4090
node serve

# Standalone — just this tool, on http://localhost:4120
node flutter-launchpad/server.js
```

You can also smoke-test the generator without opening a browser:

```sh
node flutter-launchpad/server.js --selftest
# selftest ok — 76 files, 10 deps, 2 advisories
```

The self-test generates a default blueprint and reports how many files, packages,
and advisories it produced.

## What you can do

- **Start from a recipe** — `Structured · GetX`, `Structured · Riverpod`,
  `Minimal`, or `Enterprise` presets that pre-fill a coherent stack.
- **Pick a convention stack** — three modes (`structured-getx`,
  `structured-riverpod`, `generic`) that decide the architecture and house rules.
- **Assemble packages from a curated catalog** — networking, storage, Firebase,
  maps, notifications, media, security, and more, each pinned to a known-good
  version.
- **Wire real capabilities** — Firebase, push/local notifications, deep links,
  maps & location, permissions, a maintenance / force-update gate, flavors, env
  secrets, and an auth-guarded bottom-nav shell.
- **Get real code, not stubs** — a working sample feature per feature, a single
  `ApiRequest` client, theming with light/dark, i18n, models with a typed API
  envelope, and per-feature tests.
- **Ship with docs and CI** — every project includes `SETUP.md`, `PACKAGES.md`,
  `CLAUDE.md` / `AGENTS.md`, per-feature docs, a `.gitignore`, a pre-commit hook,
  and a GitHub Actions workflow.
- **Preview before you commit** — review the full tree, code, `pubspec.yaml`, and
  docs in the browser, plus non-blocking advisories that flag config mismatches.

:::tip
New here? Read [Usage](/Mobile-DevTools/flutter-launchpad/usage/) for a full
walkthrough, or jump to [Modes & architecture](/Mobile-DevTools/flutter-launchpad/modes-and-architecture/)
to choose between GetX, Riverpod, and generic.
:::
