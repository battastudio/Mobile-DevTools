---
title: Generated conventions
description: The folder layout, API layer, models, theming, features, services, and docs of a generated project.
sidebar:
  order: 6
---

Every project Flutter Launchpad generates follows a consistent shape. This page
describes what you actually get on disk so you know where each thing lives and how
the pieces connect. The examples use a structured project; the
[modes page](/Mobile-DevTools/flutter-launchpad/modes-and-architecture/) covers
how generic mode differs.

## Folder layout (structured)

```text
lib/
  general_exports.dart      # the single mega-barrel — import ONLY this
  main.dart                 # entrypoint: bindings, storage init, runApp
  api/
    index.dart
    api_request.dart        # the one Dio wrapper
    api_endpoints.dart      # ApiEndpoints path constants
    app_keys.dart           # AppKeys — every JSON/storage key
    translation_keys.dart   # TranslationKeys — i18n message keys
  theme/
    app_colors.dart         # AppColors palette
    app_theme.dart          # light/dark Material 3 themes
    theme_controller.dart   # runtime toggle + persistence (when dark)
  constants/
    app_constants.dart
    app_assets.dart         # AppAssets — asset path constants
    app_info.dart           # name/version/base URL
    general_constants.dart  # AppMode + currentMode (when flavors)
  utils/
    local_storage.dart      # LocalStorage keyed by AppKeys
    helper/log.dart         # consoleLog
    helper/global_functions.dart  # startLoading / stopLoading / showMessage
  components/               # shared App* widgets
  screens/
    my_app/                 # root widget + routes + routes_keys
    <feature>/              # screen + controller + barrel, one per feature
  core/network/             # ApiResponse / PaginatedResponse / ApiError
  models/                   # your typed models (when any)
  services/                 # gated capability services
assets/
  images/ svg/ fonts/ icon/ splash/   # .gitkeep placeholders
```

Alongside `lib/` you get `pubspec.yaml`, `analysis_options.yaml`, the docs
(`README.md`, `SETUP.md`, `PACKAGES.md`, `CLAUDE.md`, `AGENTS.md`, `MANIFEST.md`,
`docs/features/`), and repo hygiene (`.gitignore`, `.editorconfig`,
`.vscode/launch.json`, `.githooks/pre-commit`, `.github/workflows/ci.yml`).

## The mega-barrel

`lib/general_exports.dart` is the single import. It re-exports Flutter, the state
library (`get` or `flutter_riverpod`), `flutter_screenutil`, and every subtree
`index.dart`. Every file imports **only** this:

```dart
import 'package:my_app/general_exports.dart';
```

## API layer

All networking flows through one hand-rolled `ApiRequest` (wrapping Dio) — no
retrofit, no codegen. It auto-injects the bearer token and `Accept-Language`, logs
the call, and surfaces errors via `showMessage` unless you opt out. Two rules keep
it clean:

- **Endpoints** are constants on `ApiEndpoints` — never inline a URL string. The
  base URL is chosen per `currentMode` when flavors are on.
- **Keys** are constants on `AppKeys` — every JSON request/response and storage
  key. Never a raw string key.

## Models & the network envelope

Every mode emits the typed envelope under `lib/core/network/`:
`ApiResponse<T>`, `PaginatedResponse<T>`, and `ApiError`. Your own models land in
`lib/models/` with a barrel. The **API models** setting decides how they're
written:

- **Manual** — plain Dart with hand-written `fromJson` / `toJson`, no
  `build_runner`.
- **freezed** — immutable `@freezed` classes with `json_serializable` (adds
  `build_runner`).

Models are parsed defensively (type-check + `tryParse` + sane defaults + a static
`listFrom`), per the generated rules.

## Theming

- `AppColors` holds the palette; reference colors only through it.
- `app_theme.dart` builds Material 3 light/dark themes seeded from `AppColors`.
- When **dark** is enabled, `ThemeController` switches and persists the theme mode
  (via `Get.changeThemeMode` in GetX, or a `themeModeProvider` in Riverpod).
- Selecting **dynamic** adds `flex_color_scheme`.
- Sizing uses `flutter_screenutil` on a 390×844 canvas — size with `.w/.h/.sp/.r`,
  never raw pixels.

Design tokens (`AppSpacing`, text styles) and validators come in via the UI kit
when the matching components are selected.

## Features

Each feature is a folder under `lib/screens/<feature>/` with a **screen**, a
**controller**, and a barrel — one real, wired sample per feature:

- **GetX** — a `GetxController` field bag; mutate fields then `update()`. Screens
  are `StatelessWidget`s in a `GetBuilder`.
- **Riverpod** — a raw `Notifier` + in-file provider; mutate fields then
  `ref.notifyListeners()`. Screens are `ConsumerWidget`s.

A controller's HTTP calls belong in a sibling `<feature>_requests.dart` so both
stay under 150 lines. When the **test scaffold** is on, each feature also gets a
`test/<feature>_controller_test.dart` (using `mocktail`) and a doc under
`docs/features/`.

## Services

Capability code lives in `lib/services/` and is called only from controllers —
never a plugin dropped into a screen. What's generated depends on your toggles:

| Service | Enabled by |
|---------|-----------|
| `ConnectivityService` | Connectivity selection |
| `NotificationService` | Notifications → local (per-flavor channel; big-picture when rich) |
| `PushNotificationService` | Notifications → push (token cache, cold-start + tap deep links) |
| `DeepLinkService` | Notifications → deep links (`app_links`) |
| `FirebaseService` | Firebase → analytics/crashlytics |
| `LocationService` / `AddressService` | Maps → geolocator / geocoding |
| `SecureStorage` | Security → secure storage |
| `LinkService` | URL launcher |
| `MaintenanceService` | Maintenance gate |
| `PermissionService` | Any permission (or consent) |

## Firebase

Firebase toggles add the products, a `firebase_options.dart` placeholder, a
`FirebaseService` (when analytics/crashlytics are on), and a `FIREBASE.md`. You
supply the real config with `flutterfire configure` (or by renaming the `*.example`
files). Initialize Firebase in `main()` before `runApp`.

## Localization

- **structured-getx** — GetX native translations: strings in `AppTranslations`
  (`lib/utils/app_translations.dart`), resolved with `TranslationKeys.x.tr`; locale
  switched and persisted via `LocaleController`. Ships `en` + `ar` (RTL).
- **structured-riverpod / generic** — Flutter `gen-l10n`: strings in
  `lib/l10n/app_*.arb`, a global `l10n` accessor, an `l10n.yaml`, and
  `generate: true` in `pubspec.yaml`. Run `flutter gen-l10n` to (re)build
  `AppLocalizations`.

## Flavors & environments

The structured convention is a **compile-time** environment. `general_constants.dart`
defines an `AppMode` enum and a `currentMode`; the API base URL is selected per
mode in `api_endpoints.dart`. Switch environments by editing `currentMode` — no
native flavors required.

Turn on **Native flavors** to also get real Android `productFlavors`, per-flavor
entry points (`lib/main_<flavor>.dart`), matching `.vscode/launch.json` configs,
and a `FLAVORS.md` with iOS + per-flavor Firebase/icon steps.

## Storage & logging

- `LocalStorage` wraps `get_storage` (GetX) or `shared_preferences` (Riverpod),
  keyed by `AppKeys` constants. Tokens and PII belong in secure storage, not here.
- `consoleLog` is the only logging call (`avoid_print` is enforced). Adding **file**
  logging also writes every `consoleLog` to an on-device log file; `logger` and
  `pretty_dio_logger` are optional richer loggers.

## Permissions

Selecting permissions generates a `request<Name>()` method per permission plus the
Android `<uses-permission>` entries and iOS usage strings, collected in
`MANIFEST.md` (and `platform/` files in generic mode). Paste them into your native
config; request permissions at point-of-use, and handle denied /
permanently-denied.

## Docs & AI rules

Every project ships `CLAUDE.md` and `AGENTS.md` seeded with the conventions above
plus your selected rule presets, so a coding agent extends the project in-style
instead of guessing. `SETUP.md` is a bring-up checklist scoped to your exact
config, `PACKAGES.md` explains why each dependency is there, and `docs/features/`
holds one doc per feature plus capability docs (theming, i18n, notifications,
maintenance).
