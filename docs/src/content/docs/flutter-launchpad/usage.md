---
title: Usage
description: Configure a project, generate the scaffold, review the tabbed preview, export the zip, and open it in Flutter.
sidebar:
  order: 2
---

This is the end-to-end walkthrough: from an empty form to a running Flutter app.
Open Flutter Launchpad at **http://localhost:4120** (via `node serve` or
`node flutter-launchpad/server.js`) and follow along.

## 1. Start from a recipe (optional)

The fastest start is a recipe — a preset that pre-fills a coherent stack. Pick
one, then tweak:

| Recipe | What it sets up |
|--------|-----------------|
| **Structured · GetX (standard)** | GetX, `general_exports` barrel, `ApiRequest`, `get_storage`, smart dialog, splash/auth/home. |
| **Structured · Riverpod (standard)** | Raw `flutter_riverpod`, GoRouter + `globalArguments`, `shared_preferences`, `flutter_localization`. |
| **Minimal** | Vanilla Flutter, layer folders, no state library — a clean starting point. |
| **Enterprise** | Structured Riverpod with the full delivery stack: Firebase, push, remote config, flavors, dynamic theme. |

You can also skip recipes and build from the default config.

## 2. Configure the project

Work down the sections. Each field is a **text** input, a **segmented**
single-choice control, a multi-select **chip** group, or a **switch**.

- **Identity** — the app name (snake_case Dart package) and organization ID
  (reverse-DNS, e.g. `com.example`).
- **Foundation** — the convention stack: **Mode**, **State management**,
  **Architecture**, the **Professional base layer** switch, **API models**
  (manual vs freezed), and **Navigation**.
- **Networking & data** — **API client**, **Connectivity**, **Localization**.
- **UI & theming** — **Themes** (light / dark / dynamic), **Interactivity &
  animation**, and **Components**.
- **Platform & capabilities** — Firebase, notifications, maps, security,
  observability, permissions, plus switches for URL launcher, keyboard dismiss,
  sound effects, env secrets, nav shell, GDPR consent, and the maintenance gate.
- **Delivery & quality** — logging, asset tooling, build flavors, native
  flavors, and the test scaffold.
- **AI rules** — rule presets injected into `CLAUDE.md` / `AGENTS.md`.

:::note
In the two structured modes, **State management**, **Architecture**, and
**Navigation** are dictated by the mode and snap to the canonical values. They
only become free choices in `generic` mode.
:::

### A realistic example

Say you're building a delivery app. Pick **Structured · Riverpod**, then:

- **Identity** → `appName: swift_deliver`, `orgId: com.acme`.
- **Networking** → API client `ApiRequest (Dio)`, localization
  `flutter_localization`.
- **UI** → themes `light` + `dark`, interactivity `pull-refresh` +
  `infinite-scroll` + `shimmer`, components `cached_network_image` +
  `flutter_svg` + `state_widgets`.
- **Platform** → Firebase `core` + `messaging`, notifications `push`,
  permissions `notifications` + `location`, maintenance gate `Backend (your API)`.
- **Delivery** → flavors `dev` / `demo` / `prod`, test scaffold on.

As you toggle, watch the advisories: enabling **Push** without Firebase
**messaging** raises a warning telling you to add it.

## 3. Generate and review the tabbed preview

Click **Generate**. Flutter Launchpad composes the whole project in memory and
shows it across tabs:

- **structure** — the folder tree and thin skeletons (barrels, `.gitkeep`
  placeholders, scaffolding).
- **code** — the real, wired reference Dart that overlays the skeletons: your
  `ApiRequest`, theme, controllers, screens, services, and models.
- **pubspec** — the generated `pubspec.yaml` with every resolved package pinned
  and tagged `req` / `rec` / `opt`.
- **config** — `analysis_options.yaml`, `MANIFEST.md` (manifest / Info.plist
  snippets), and the repo dotfiles.
- **docs** — `SETUP.md`, `PACKAGES.md`, `CLAUDE.md`, `AGENTS.md`, and one doc per
  feature under `docs/features/`.

Below the preview you'll see **advisories** — non-blocking notes that flag config
mismatches (e.g. GetX + GoRouter) and store-review nudges (e.g. contacts or
background location).

## 4. Export the zip

Click **Export** to download `<appName>.zip`. The project is nested under a root
folder named after your app (non-alphanumeric characters are sanitized to `_`).

## 5. Open it in Flutter

```sh
unzip swift_deliver.zip
cd swift_deliver
flutter pub get
# Riverpod / generic with localization also need:
flutter gen-l10n
flutter run
```

Then open `SETUP.md` — it's a checklist that only lists the steps your config
actually needs (icons, splash, Firebase, flavors, permission manifests, maps
keys). Work top to bottom and you're ready to build.

:::tip
Hand the unzipped project to **Build Helper** (port `4095`) for env-switching,
version bumps, and building/distributing.
:::

## Using the API / CLI

Everything the UI does is available over HTTP — no auth, all local.

### `GET /catalog`

Returns everything the form renders from: option sections, package catalog,
recipes, and the default config.

```sh
curl http://localhost:4120/catalog
```

### `POST /generate`

Send a (partial) config; get back the in-memory blueprint: `files` (each with a
`path`, `content`, and `tab`), resolved `packages` (`deps` + `dev`), and
`warnings`.

```sh
curl -X POST http://localhost:4120/generate \
  -H 'Content-Type: application/json' \
  -d '{"appName":"swift_deliver","mode":"structured-riverpod","firebase":["core","messaging"],"notifications":["push"]}'
```

Any fields you omit fall back to the default config — the body is deep-merged
over the defaults.

### `POST /export`

Same config in, a downloadable `.zip` out.

```sh
curl -X POST http://localhost:4120/export \
  -H 'Content-Type: application/json' \
  -d '{"appName":"swift_deliver","mode":"structured-riverpod"}' \
  -o swift_deliver.zip
```

An invalid config returns `400` with an `{ "error": ... }` body.
