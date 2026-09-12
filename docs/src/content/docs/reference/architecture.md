---
title: Architecture
description: How Mobile DevTools is put together — the shared kit, folder-per-tool, and the rules.
sidebar:
  order: 1
---

Mobile DevTools is a small monorepo. Every tool is a self-contained folder that
runs on a shared, zero-dependency spine.

## The shared spine: `platform-kit/`

`platform-kit/` is a reusable HTTP + UI core that every tool builds on:

- **`createKitServer(...)`** — a tiny zero-dependency HTTP server. Tools register
  routes with `app.r(method, path, handler)` and call `app.start()`. It also
  serves static files and the shared front-end assets under `/kit/*`.
- **No auth.** The kit passes `user = null` to every handler. There is no login,
  no session, no capability gate — the tools run locally and are open by design.
- **Local store** — `~/.mobile-devtools/<tool>/config.json` via a shared JSON store.
- **Shared services** — issue-tracker connectors, Slack/Telegram/email
  notifications, an opt-in AI helper (off by default), and a local activity feed.
- **Front-end kit** — `kit.css` design tokens (dark + light), `kit.js`, and shared
  components, all loaded via CDN Vue with no build step.

## Folder per tool

Each of the four tools — `build-helper`, `mobile-qa`, `mobile-security`,
`flutter-launchpad` — is self-contained:

```
<tool>/
  server.js     # wiring only: createKitServer + route registration + start
  tool.json     # { id, name, port }
  lib/          # controllers (routes/) + services + pure engine
  public/       # the tool's UI (Vue-via-CDN + /kit assets)
  README.md
```

The **hub** (`serve.js` + `lib/`) spawns the four tools as local child processes
and hosts them behind a **single address** (`localhost:4090`). Its shell
(`public/index.html`) is a top nav plus a full-height `iframe`: selecting a tool
loads it from its own origin — so every absolute `/kit`, `/api`, and `/catalog`
path stays valid — while the browser URL stays on the hub as a hash route
(`#/build-helper`). Tools stay alive once opened, so switching never reloads their
state. When a tool detects it's embedded in the hub it hides its own cross-tool
switcher (the hub is the sole navigator) but keeps its internal tabs. Each tool
still runs standalone on its own port.

## The rules

A few strict rules keep the codebase readable and auditable — see
[Contributing](/Mobile-DevTools/reference/contributing/) for the full list:

- **≤ 150 lines per source file**, CI-enforced. Over the cap → split by
  responsibility into a folder with an `index.js` barrel.
- **Zero runtime dependencies** — Node standard library only. (The docs site is
  the one place dependencies are allowed.)
- **Strict layering:** `server.js` → `routes/*` (controllers) → `lib/<domain>/*`
  (services + pure engine). No layer-skipping.
- **No secrets in git, no telemetry, no phone-home.**
