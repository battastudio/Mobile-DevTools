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

- **Dashboard** — every Flutter app under your projects root: detected
  environments, version, signing/health, and last-build status at a glance.
- **Build** — per-environment version name + build number, pick APK/AAB/IPA,
  optional `clean` / `pub get` / `analyze` / `test` gates, and a live streaming
  build log. Environment/flavor switching and version writing happen as part of
  the build (Android + the iOS Xcode/plist/export-compliance patches).
- **Distribute** — tick OneDrive / Firebase / Store per build; rollback a Play
  release or retry a single upload without rebuilding; LAN QR install pages for
  testers (`/install`) with an iOS ad-hoc manifest.
- **Signing** — generate an upload keystore (or link an existing one), write
  `android/key.properties`, and wire `build.gradle` automatically.
- **Setup / Doctor** — one-click toolchain checks (Flutter, Xcode, CocoaPods,
  rclone, firebase-tools…) with safe installers, plus OneDrive / Play / Apple /
  Firebase connector setup.
- **Reports** — filter build history by range/env and export CSV or a printable
  (PDF) report.

Issue trackers (Jira/GitHub/…), Slack/Telegram, email, and your profile are
configured in the shared **⚙ Settings** gear, powered by `platform-kit`.

## Layout

```
server.js            wiring only — createKitServer + team + connectors + route groups
tool.json            id / name / port (4095)
lib/routes/          apps · build · signing · setup · dist · pages  (barrel: index.js)
lib/project/         detect · env-switch · version · signing · git · scan · artifacts
lib/build/           the build pipeline (orchestrate · guards · artifacts · uploads · record)
lib/stores/          ASC · Play · TestFlight · Firebase upload/versioning
lib/dashboard/       dashboard data, reports, distribute, doctor, share, per-app config
public/js/           ordered UI modules: state → api → components → views → project → setup → app
```

Signing config can also come from a local `signing.json` (see
`signing.example.json`); no secrets are read from anywhere else.
