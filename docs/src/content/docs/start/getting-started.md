---
title: Getting started
description: Clone Mobile DevTools and run it locally in under a minute.
sidebar:
  order: 1
---

Mobile DevTools runs entirely on your machine. There is no install step beyond
cloning, no `npm install`, and no accounts.

## Requirements

- **Node.js ≥ 20**
- **Flutter SDK** on your `PATH`
- For device features: **Android platform-tools (`adb`)** and/or **Xcode (`simctl`)**
- **macOS or Linux** (Windows/WSL support is planned)

## Install & run

```sh
git clone https://github.com/battastudio/Mobile-DevTools.git
cd Mobile-DevTools
node serve
```

Then open **http://localhost:4090**. The hub starts and launches the four tools as
local child processes. That's it — no build, no login.

## The tools and their ports

| Tool | Port | What it does |
|------|------|--------------|
| Hub | `4090` | The dashboard you open first; links to every tool. |
| Build Helper | `4095` | Env-switch, version bump, build & distribute. |
| Mobile Security | `4110` | OWASP Mobile Top 10 scanning. |
| Mobile QA | `4113` | analyze/test/coverage + device lab. |
| Flutter Launchpad | `4120` | Generate a Flutter project scaffold. |

You can also open any tool directly on its port, or run a single tool on its own
with `node <tool>/server.js`.

## Where does my data live?

All local configuration and activity lives under `~/.mobile-devtools/<tool>/`.
Nothing leaves your machine. Delete that folder to reset everything.
