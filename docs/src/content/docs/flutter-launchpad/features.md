---
title: Features
description: Every config section, package, recipe, and generator Flutter Launchpad ships — what each does and how to use it.
sidebar:
  order: 3
---

This is the complete reference for everything Flutter Launchpad can do. It's
organized the way the UI is: config sections first, then the package catalog, the
recipes, and the generate/export flow.

## Config sections

The form is grouped into seven sections. Field types are **text**, **seg**
(single-choice segmented), **chips** (multi-select), and **switch**.

### Identity

| Field | Type | What it does |
|-------|------|--------------|
| App name | text | The Dart package name — `lowercase_with_underscores`. |
| Organization ID | text | Reverse-DNS bundle prefix, e.g. `com.example`. |

Deeper identity settings feed the generators (icon path/background/foreground,
splash color/image, app version, brand color, base URL and per-flavor base URLs,
fonts, supported locales, `minSdk`, target platforms, Android signing, support
email, privacy/terms URLs). They drive `pubspec.yaml`, `SETUP.md`, launcher icons
and splash config.

### Foundation

The convention stack — the highest-leverage choices.

| Field | Values | What it does |
|-------|--------|--------------|
| Mode | `structured-getx`, `structured-riverpod`, `generic` | Picks the whole convention stack. Structured modes lock the house rules; generic is vanilla Flutter. |
| State management | `getx`, `riverpod`, `bloc`, `provider`, `none` | The state library. Dictated by the mode in structured modes; free in generic. |
| Architecture | `feature-folder`, `layer-folder`, `clean`, `mvc`, `mvvm` | Folder + wiring convention. In generic mode, `clean` / `mvc` / `mvvm` emit a real wired sample; `layer-folder` emits placeholders. |
| Professional base layer | switch | Adds DI (`get_it`), a Dio client + interceptors, `Result`/`Failure`/`ErrorHandler`, `BaseRepository`/`BaseUseCase`, and `network_info`. |
| API models | `manual`, `freezed` | Always emits `ApiResponse<T>` / `PaginatedResponse<T>` / `ApiError`. Choose hand-written `fromJson` or `@freezed` + `json_serializable` codegen. |
| Navigation | `named-routes`, `go_router` | Named routes (GetX) or GoRouter. Dictated by mode in structured modes. |

:::note
Structured modes derive State management, Architecture, and Navigation from the
mode, so those three fields are locked. `structured-getx` → GetX + feature folders
+ named routes; `structured-riverpod` → Riverpod + feature folders + GoRouter.
:::

### Networking & data

| Field | Values | What it does |
|-------|--------|--------------|
| API client | `api_request`, `dio`, `retrofit`, `http` | `ApiRequest` is one hand-rolled Dio wrapper (no codegen); `retrofit` adds `build_runner`. |
| Connectivity | `connectivity_plus`, `internet_connection_checker_plus` | Reachability changes and/or real internet-access checks. |
| Localization | `none`, `intl`, `flutter_localization` | Single-locale, `intl` formatting, or the `flutter_localization` delegate. |

### UI & theming

| Field | Values | What it does |
|-------|--------|--------------|
| Themes | `light`, `dark`, `dynamic` | Light/dark Material 3 themes; `dynamic` adds `flex_color_scheme`. |
| Interactivity & animation | `pull-refresh`, `infinite-scroll`, `shimmer`, `hero`, `page-transitions`, `animations` | Refresh, load-more lists, skeleton loaders, hero transitions, page transitions, custom animation helpers. |
| Components | `cached_network_image`, `flutter_svg`, `flutter_smart_dialog`, `bottom_sheet`, `date_picker`, `image_attach`, `file_download`, `pdf`, `share`, `state_widgets`, `form_validators`, `switchers` | Ready-made widgets/wrappers. Each emits a real `App*` widget or service. |

### Platform & capabilities

| Field | Values | What it does |
|-------|--------|--------------|
| Firebase | `core`, `analytics`, `crashlytics`, `messaging`, `performance`, `remote_config` | Adds the Firebase products and a `FirebaseService`. |
| Notifications | `local`, `push`, `deeplink`, `rich` | Local notifications, FCM push, deep links (`app_links`), rich (image-preview) pushes. |
| Maps & location | `google_maps`, `geolocator`, `geocoding` | Google Maps widget, geolocation service, address lookup. |
| Security | `secure_storage`, `recaptcha`, `cert_pinning` | Encrypted storage, reCAPTCHA Enterprise, TLS certificate pinning. |
| Observability | `sentry`, `error_boundary`, `token_refresh` | Sentry, a runApp error boundary, a 401 token-refresh interceptor. |
| Permissions | modern `permission_handler` set (see below) | Emits a request method per permission + AndroidManifest / Info.plist snippets. |
| URL launcher | switch | Adds `url_launcher` + a `LinkService`. |
| Tap-to-dismiss keyboard | switch | A keyboard-dismiss wrapper. |
| Sound effects & haptics | switch | `audioplayers` + `vibration`, plus an `assets/sfx/` folder. |
| Env / secrets | switch | A `.env` + `flutter_dotenv` `Env` loader. |
| Bottom-nav shell + auth guard | switch | A nav shell with an auth guard. |
| GDPR consent + iOS ATT | switch | A consent flow and App Tracking Transparency prompt. |
| Maintenance / force-update gate | `none`, `backend`, `firebase` | A root gate that blocks the app for maintenance or a required update, with soft-update prompt + announcement banner. Flags come from your API or Firebase Remote Config. |

**Permissions catalog** (deprecated `storage` / `calendar` / `mediaLibrary` are
intentionally excluded): `camera`, `photos`, `videos`, `audio`, `location`,
`locationWhenInUse`, `locationAlways`, `notifications`, `contacts`, `microphone`,
`calendarFullAccess`, `calendarWriteOnly`, `reminders`, `phone`, `sms`, `speech`,
`sensors`, `activityRecognition`, `bluetoothScan`, `bluetoothConnect`,
`bluetoothAdvertise`, `nearbyWifiDevices`, `appTrackingTransparency`,
`manageExternalStorage`, `scheduleExactAlarm`, `ignoreBatteryOptimizations`,
`systemAlertWindow`. Each selection generates a `request<Name>()` method plus the
matching Android permissions and iOS usage strings.

### Delivery & quality

| Field | Values | What it does |
|-------|--------|--------------|
| Logging | `consoleLog`, `file`, `logger`, `pretty_dio_logger` | Structured console logging; `file` also writes logs to an on-device file; `logger` and `pretty_dio_logger` add those packages. |
| Asset tooling | `launcher_icons`, `native_splash`, `svg`, `images` | `flutter_launcher_icons` + `flutter_native_splash` config, SVG support, image asset folder. |
| Build flavors | `dev`, `demo`, `prod` (+ your own) | A compile-time `AppMode` in `general_constants.dart` with a per-mode API base URL. Add custom flavors with the `+` input. |
| Native flavors | switch | Also emits real Android `productFlavors`, per-flavor entry points (`lib/main_<flavor>.dart`), and a `FLAVORS.md`. |
| Test scaffold | switch | `mocktail` + a unit test per feature. |

### AI rules (CLAUDE.md / AGENTS.md)

A chip group of rule presets injected into `CLAUDE.md` and `AGENTS.md` so a coding
agent follows the project's conventions. Presets are grouped by category —
**architecture** (reuse-first, one API client, wrapper per capability, split
feature requests, side-effect free-functions, ≤150 lines/file), **state** (notify
once, const + small widgets, dispose resources), **data** (defensive `fromJson`,
guard nullable data, handle every error, resilient networking, paginate lists,
secure tokens), **ux** (empty/error/loading states, shimmer, pull-to-refresh,
animate everything, hero on images, accessibility), **design** (single source of
truth, global design tokens, no hardcoded strings, no magic numbers, RTL-aware),
**style** (descriptive names), **capabilities** (one rule per generated
subsystem: notifications & deep links, permissions flow, Firebase & observability,
flavors & env, maps & location, forms & validation, security hardening), and
**quality** (test every feature). You can also add free-text custom rules.

## Package catalog

Every package is pinned to a known-good caret version and tagged with a tier when
resolved: **`req`** (required by your stack), **`rec`** (recommended for a
selection), **`opt`** (optional add-on). The pinned versions appear in the
`pubspec` tab.

| Category | Packages |
|----------|----------|
| State management | `get`, `flutter_riverpod`, `riverpod_annotation`, `flutter_bloc`, `bloc`, `hydrated_bloc`, `provider` |
| Navigation | `go_router` |
| Networking | `dio`, `pretty_dio_logger`, `retrofit`, `http` |
| Connectivity | `connectivity_plus`, `internet_connection_checker_plus` |
| Storage | `get_storage`, `shared_preferences`, `flutter_secure_storage` |
| UI / media | `flutter_smart_dialog`, `cached_network_image`, `flutter_svg`, `flex_color_scheme` |
| Localization | `intl`, `flutter_localization` |
| Firebase | `firebase_core`, `firebase_analytics`, `firebase_crashlytics`, `firebase_messaging`, `firebase_performance`, `firebase_remote_config` |
| Notifications / links | `flutter_local_notifications`, `app_links`, `url_launcher`, `package_info_plus`, `flutter_dotenv`, `sentry_flutter` |
| Logging | `logger` |
| Files / permissions / pickers | `path_provider`, `permission_handler`, `image_picker`, `share_plus`, `open_filex`, `syncfusion_flutter_pdfviewer` |
| Audio / haptics | `audioplayers`, `vibration` |
| Maps / location | `google_maps_flutter`, `geolocator`, `geocoding` |
| Security | `recaptcha_enterprise_flutter` |
| Dev tooling | `flutter_launcher_icons`, `flutter_native_splash` |
| Models / DI / codegen | `get_it`, `freezed_annotation`, `freezed`, `json_annotation`, `json_serializable`, `mocktail`, `bloc_test`, `build_runner`, `custom_lint`, `riverpod_lint`, `riverpod_generator` |

`flutter_screenutil` (sizing) and `cupertino_icons` are always added, and
`flutter_lints` is always a dev dependency. When a package is pulled in by more
than one selection, the highest tier wins.

## Recipes (presets)

Recipes pre-fill a coherent config you can then edit:

| Recipe | Stack |
|--------|-------|
| **Structured · GetX (standard)** | `structured-getx`, `ApiRequest`, `intl`, light/dark, `get_storage`, smart dialog, launcher icons + splash, tests, features splash/auth/home. |
| **Structured · Riverpod (standard)** | `structured-riverpod`, GoRouter, `flutter_localization`, `shared_preferences`, same UI/testing set. |
| **Minimal** | `generic`, layer folders, no state library, `http`, single light theme, no extras, feature home. |
| **Enterprise** | `structured-riverpod` + full delivery: Firebase (core/analytics/crashlytics/performance/remote_config), local + push notifications, secure storage + reCAPTCHA, dynamic theme, flavors dev/staging/prod, features splash/auth/home/profile. |

## The generate + export flow

- **Generate** (`POST /generate`) composes the project in memory and returns
  `files`, resolved `packages` (`deps` + `dev`), and `warnings`. Package
  resolution dedupes and tiers every dependency from your selections; validation
  produces non-blocking advisories.
- **Export** (`POST /export`) runs the same generation and streams a `.zip` named
  `<appName>.zip`, with the project nested under a sanitized root folder. It uses
  the system `zip` for real compression and falls back to a dependency-free
  stored-mode writer when `zip` isn't available.
- **`GET /catalog`** returns the option sections, package catalog, recipes, and
  defaults that drive the UI.

## The tabbed preview

Generated files carry a `tab` so the UI can group them:

| Tab | Contents |
|-----|----------|
| **structure** | Folder tree, barrels, thin skeletons, `.gitkeep` placeholders. |
| **code** | The real reference Dart that overlays the skeletons (client, theme, controllers, screens, services, models). |
| **pubspec** | The generated `pubspec.yaml` with pinned, tiered packages. |
| **config** | `analysis_options.yaml`, `MANIFEST.md` (manifest/plist snippets), and repo dotfiles. |
| **docs** | `SETUP.md`, `PACKAGES.md`, `CLAUDE.md`, `AGENTS.md`, and `docs/features/*`. |

Advisories appear alongside the preview: state/navigation coherence checks, push
without `firebase_messaging`, store-review nudges (contacts, background location),
Syncfusion licensing, deep-link platform setup, native-flavor setup, and
maintenance-gate wiring reminders.

## What every project includes

Regardless of mode, each generated project ships repo hygiene and docs:

- `README.md`, `.gitignore`, `.editorconfig`
- `.vscode/launch.json` (per-flavor when native flavors are on)
- `.githooks/pre-commit` (format + analyze) and `.github/workflows/ci.yml`
- `SETUP.md` (a checklist scoped to your config), `PACKAGES.md`, `MANIFEST.md`
- `CLAUDE.md` / `AGENTS.md` with your rules, and `docs/features/` with one doc per
  feature plus capability docs (theming, i18n, notifications, maintenance).
