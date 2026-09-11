# Mobile DevTools — project rules for Claude

Zero-dependency, self-hosted Flutter toolkit. Pure Node stdlib, no build step,
**no accounts, no login** — everything runs on `localhost`. Full engineering
rules live in [`CONTRIBUTING.md`](./CONTRIBUTING.md); read it before writing code.

## The two repos (keep them in lockstep)

| Repo | Local path | Purpose |
|------|------------|---------|
| **Code** (this one) | `…/Batta Studio/Mobile-DevTools` | the four tools + `platform-kit` spine + hub |
| **Docs** | `…/Batta Studio/Mobile-DevTools-Docs` | Astro Starlight site, published to GitHub Pages |

## MANDATORY: mirror every user-facing change into the docs repo

Any change here that alters behaviour a user can see — a new/renamed tool,
route, flag, setup step, screen, config field, port, or requirement — **must**
be reflected in `../Mobile-DevTools-Docs/src/content/docs/` in the *same* piece
of work. Do not consider a task done until the docs match the code. Pure
internal refactors (no observable behaviour change) don't need a docs edit;
when unsure, add a note to the relevant page.

Checklist before finishing a change:
- [ ] Code + per-tool `README.md` updated.
- [ ] Matching page(s) in `../Mobile-DevTools-Docs/src/content/docs/` updated (or created).
- [ ] `node scripts/check-lines.js` clean and the affected `--selftest` passes.

## Invariants — don't regress these

- **No auth / no login.** The kit passes `user = null` to every handler
  (`platform-kit/team.js` stubs all permission checks to always-allow). There is
  no sign-in gate anywhere. If you see a login screen, it's a *stale old process*
  squatting a port — not this codebase. Restart the tool; the spine now reclaims
  its own port from a mismatched instance.
- **One URL.** The hub (`serve.js`, port `4090`) spawns the four tools and hosts
  them in a single shell (`public/index.html`): a top nav switches tools, each
  loads in an iframe from its own origin (`#/build-helper`, …). Tools also still
  run standalone on their own ports.
- **Zero runtime deps**, **≤ 150 lines per `.js/.cjs/.mjs` file** (CI-enforced by
  `scripts/check-lines.js`), one responsibility per file, strict
  `server → routes → lib` layering.
- **Fixed ports:** hub `4090`, build-helper `4095`, mobile-security `4110`,
  mobile-qa `4113`, flutter-launchpad `4120`. See `lib/registry.js`.
- **One shared stylesheet:** `platform-kit/public/kit.css` styles all four tools
  + the hub. Edit it once to restyle the whole suite; keep per-tool tweaks in each
  tool's inline `<style>` block.
