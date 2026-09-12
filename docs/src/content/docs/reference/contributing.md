---
title: Contributing
description: The small, strict set of engineering rules that keep this codebase clean.
sidebar:
  order: 2
---

This project has a deliberately small, strict set of engineering rules. They keep
the codebase readable, dependency-free, and easy to hack on. The full list lives
in [`CONTRIBUTING.md`](https://github.com/battastudio/Mobile-DevTools/blob/main/CONTRIBUTING.md);
the highlights:

1. **≤ 150 lines per `.js`/`.cjs`/`.mjs` file.** Hard cap, CI-enforced by
   `scripts/check-lines.js` with no path exceptions — over the cap → split by
   responsibility. Non-JS assets (HTML/CSS under `public/`) aren't counted, and
   the docs live in their own repo, not this one.
2. **One responsibility per file.** Name the file after the one thing it does.
3. **Strict layering:** `server.js` (wiring) → `lib/routes/*` (controllers) →
   `lib/<domain>/*` (services + pure engine). No layer-skipping.
4. **Zero runtime dependencies** — Node stdlib only.
5. **Pure engine functions;** isolate side effects (`fs`, network,
   `child_process`) in named modules.
6. **Validate every request at the boundary.** Never trust client input.
7. **No secrets in git, ever. No telemetry.**
8. **One runnable self-check** per non-trivial module (`--selftest`).
9. **Docs as you go** — every tool has a README; every feature has a page here.

## Running the checks

```sh
node scripts/check-lines.js   # the 150-line gate (also runs in CI)
npm test                      # each installed tool's --selftest
```
