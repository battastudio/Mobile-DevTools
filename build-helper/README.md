# Build Helper

Flutter build & release cockpit, part of **Mobile DevTools**. Switch app
environments/flavors, bump versions, build **APK / AAB / IPA**, and distribute
to OneDrive, Google Play, TestFlight, and Firebase App Distribution — from one
local dashboard. Zero runtime dependencies (Node stdlib + Vue via CDN), no
accounts, no login: it runs open on `localhost`.

## Run

```bash
node server.js          # → http://localhost:4095  (auto-moves up if the port is busy)
node server.js --selftest   # CI sanity check: loads the full route/lib graph, no server, no network
```

`PORT` overrides the port. `FLUTTER_PROJECTS` sets where the dashboard looks for
apps (default `~/mobileApps`). `FLUTTER_BIN` / `RCLONE_BIN` override tool paths.
All tool state lives under `~/.mobile-devtools/build-helper/` — nothing is
written into your repos.

## Features

- **Dashboard** — a sortable, drag-to-reorder **project-health table** (favorite
  ★, density toggle, per-row security grade from the Mobile Security tool),
  **range / project / env filters** feeding KPIs and hand-rolled **SVG charts**
  (builds over time, duration, upload health, env split), and a **⌘K** quick-jump
  palette. A guided **tour** (`?` in the nav) explains each screen.
- **Build** — a dev→demo→qa→prod **pipeline**, per-env version (with **M/m/p**
  bump) + build number (auto next-free), a full **outputs matrix** per env
  (Build only / OneDrive / TestFlight / Firebase / Play + track selector +
  validate-IPA + upload-symbols), **release notes** filled from a template,
  grouped commits, or tracker tasks, a **Jira task picker** (search + create),
  a **branch selector**, and an **Advanced** menu (clean/pub-get/analyze/test/
  commit+tag/push/warn-only). The live log **survives navigation**, and blocked
  builds surface inline **guard prompts** (dirty / duplicate / low-version /
  prod-confirm → "Build anyway" / "Use X").
- **Build detail & history** — per-build detail with artifact download / copy
  path / **re-upload to any target**, **TestFlight re-manage** (export
  compliance + "What to Test"), and **Play rollback**. History supports
  multi-select **bulk re-upload**.
- **Share** — a branded **build card** (canvas PNG + QR), copy image, copy team
  / client text, **email client groups**, and **create a Jira release**.
- **App Setup** (per app) — release-readiness checklist, env-file/const override,
  **custom environments**, Firebase App ID, per-app Apple/Play, build defaults
  (flavor / args / pre- & post-build commands), **scheduled builds**, per-app
  trackers, and client email groups.
- **Distribute** — OneDrive (incl. a **shared team-folder** mode) / Firebase /
  Play / TestFlight; LAN QR install pages for testers (`/install`) with an iOS
  ad-hoc manifest.
- **Signing** — generate an upload keystore (or link an existing one), write
  `android/key.properties`, and wire `build.gradle` automatically.
- **Setup / Doctor** — one-click toolchain checks with safe installers and a live
  **`flutter doctor`** run, plus OneDrive / Play / Apple / Firebase setup.
- **Scheduler & self-update** — a 1-minute tick runs unattended per-app
  **scheduled builds**; the nav **⬆** button shows the version, tool changelog,
  and updates via `git pull`.
- **Reports** — filter build history by range/env and export CSV or a printable
  (PDF) report.

Issue trackers (Jira/GitHub/…), Slack/Telegram, email, and your profile are
configured in the shared **⚙ Settings** gear, powered by `platform-kit`.

## Layout

```
server.js            wiring only — createKitServer + team + connectors + route groups + scheduler
tool.json            id / name / port (4095)
lib/routes/          apps · build · testflight · signing · setup · dist · pages · tool (barrel: index.js)
lib/project/         detect · env-switch · version · signing · git · scan · artifacts
lib/build/           the build pipeline (orchestrate · guards · artifacts · uploads · record)
lib/stores/          ASC · Play · TestFlight · Firebase upload/versioning
lib/dashboard/       dashboard data, reports, distribute, doctor, share, per-app config
lib/                 schedule · selfupdate · qr · onedrive · trackers · messaging · setup · …
public/js/           state → api → components → charts → health-table → views → dashboard
                     → build-form → notes → build-run → history → share → share-actions
                     → detail → app-setup(+more) → project → setup → cmdk → app
```

Signing config can also come from a local `signing.json` (see
`signing.example.json`); no secrets are read from anywhere else.
