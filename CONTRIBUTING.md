# Contributing to Mobile DevTools

Thanks for helping out! This project has a deliberately small, strict set of
engineering rules. They keep the codebase readable, dependency-free, and easy
to hack on. Please follow them — CI enforces the important ones.

## The golden rules

1. **≤ 150 lines per file. Hard cap, CI-enforced.** If a file grows past 150
   lines, split it by responsibility. This applies to **every** file, including
   browser bundles under `public/` — split those into ordered `<script>`
   modules (each attaches what the next needs to `window.*`) rather than
   shipping one large file. The only exception is `docs-site/`, which has its
   own Astro toolchain and dependencies. Check locally:
   ```sh
   node scripts/check-lines.js
   ```
   Output must end with `✓ every source file is ≤ 150 lines`.

2. **One responsibility per file.** Name the file after the one thing it does.

3. **Strict layering, per tool.**
   `server.js` (wiring only, via `createKitServer`) →
   `lib/routes/*` (controllers: validate the request, call a service, shape the
   response — no business logic, no `fs`/`child_process`) →
   `lib/<domain>/*` (services + pure engine). Never skip a layer.

4. **Zero runtime dependencies.** Tool code uses the Node standard library
   only — no npm packages. (`docs-site/` is the sole place deps are allowed.)
   Before writing code, climb the ladder: does it need to exist at all? Does
   the stdlib already do it? Can it be one line?

5. **Pure engine functions.** Engine/`lib` functions take inputs and return
   outputs with no hidden global state. Isolate side effects (`fs`, network,
   `child_process`) in clearly-named modules.

6. **No premature abstraction.** No interface/factory/config for a single use.

7. **Barrels.** Each folder exposes its public API through an `index.js` so
   require sites stay stable when internals are split.

8. **Validate every request** at the boundary. Never trust client input. Fail
   with a clear message. Don't swallow errors silently.

9. **No secrets in git, ever.** All local config is git-ignored. There is no
   telemetry and no phone-home — this is open source and runs entirely on the
   user's machine.

10. **Naming.** Files `kebab-case`, functions `camelCase`, constants
    `UPPER_SNAKE`. Descriptive, no cryptic abbreviations.

11. **No dead or commented-out code.** Git remembers.

12. **Comments explain _why_, not _what_.** Mark a deliberate shortcut with a
    `ponytail:` comment naming the ceiling and the upgrade path.

13. **One runnable self-check** per non-trivial module — a `--selftest` flag or
    a `demo()` with `assert`s. No test framework.

14. **Reuse the kit.** The frontend is Vue-via-CDN + `platform-kit` CSS tokens +
    the shared components. No build step, no new UI library. Theme via CSS
    variables only.

15. **Docs as you go.** Every tool folder has a `README`; every user-facing
    feature has a page under `docs/`.

## Architecture at a glance

- **Zero build, zero deps.** Clone → `node serve` → use. Pure Node stdlib.
- **Folder per tool.** Each of the four tools (`build-helper`, `mobile-qa`,
  `mobile-security`, `flutter-launchpad`) is self-contained: a `tool.json`,
  a `server.js` built on `createKitServer`, a `lib/`, and a `public/` UI.
- **`platform-kit/`** is the shared spine: the HTTP server, local config store,
  notifications, and the frontend kit.
- **No accounts.** There is no login, no users, no server-side state beyond
  local JSON config files under `~/.mobile-devtools/`.

See `docs/architecture.md` for the full picture.

## Before you open a PR

- Run the 150-line check above — it must be clean.
- Run each affected tool's self-check: `node <tool>/server.js --selftest`.
- Make sure no secrets, private hostnames, or personal data landed in the diff.
