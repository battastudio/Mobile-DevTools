---
title: Troubleshooting
description: Fixes for the common issues when generating, exporting, and building a Flutter Launchpad project.
sidebar:
  order: 4
---

Flutter Launchpad generates a scaffold — the last mile (SDKs, native config,
Firebase files, store keys) is yours. Most build failures trace back to a step in
the generated `SETUP.md`. Start there, then check the cases below.

## The generated project won't build

**Run the bring-up steps first.** A fresh scaffold isn't buildable until you've
fetched packages and generated code:

```sh
flutter pub get
# Riverpod or generic mode with localization:
flutter gen-l10n
# freezed models (API models = freezed):
dart run build_runner build --delete-conflicting-outputs
flutter run
```

- **`AppLocalizations` / `app_localizations.dart` not found** — you're on
  `structured-riverpod` or `generic` with localization on. Run `flutter gen-l10n`
  (or `flutter pub get`, since `generate: true` is set in `pubspec.yaml`).
- **`*.freezed.dart` / `*.g.dart` not found** — you chose freezed API models. Run
  `build_runner` as above.
- **`Undefined name 'currentMode'` or flavor errors** — the compile-time
  `AppMode` lives in `lib/constants/general_constants.dart`; switch environments by
  editing `currentMode` there, not with a `--dart-define`.

:::tip
Every generated project includes a `SETUP.md` scoped to exactly your config. If a
build step exists, it's a checkbox in that file.
:::

## A package is missing or won't resolve

The package is in `pubspec.yaml` (tagged `req` / `rec` / `opt`) but not installed
until you run `flutter pub get`.

- **`flutter pub get` fails on a version solve** — the catalog pins recent caret
  versions that assume a current Flutter/Dart. Upgrade Flutter
  (`flutter upgrade`) so your Dart SDK satisfies `>=3.4.0 <4.0.0` from the
  generated `pubspec.yaml`.
- **You need a package that isn't there** — add it in `pubspec.yaml` yourself, or
  regenerate with the matching toggle enabled. Flutter Launchpad only adds
  packages a selection pulls in.
- **A `req` dev package like `build_runner` seems unused** — it's required by
  freezed/retrofit codegen; keep it if you use those.

## Export / zip fails

- **The download is empty or `POST /export` returns `400`** — the config was
  rejected. Check the `{ "error": ... }` response body; fix the offending field
  and retry. Invalid input never partially exports.
- **The zip has odd compression or the system `zip` is missing** — Flutter
  Launchpad prefers the system `zip` binary and falls back to a dependency-free
  stored-mode writer. Both produce a valid archive; a stored zip is just larger.
  Install `zip` if you want real compression.
- **The root folder name looks mangled** — the zip root is your `appName` with
  non-alphanumeric characters replaced by `_`. Use a `lowercase_with_underscores`
  app name.

## Wrong Flutter / Dart SDK

- **The tool itself won't start** — Flutter Launchpad runs on **Node.js ≥ 20**.
  Check `node -v`.
- **The generated app needs a current SDK** — `pubspec.yaml` sets
  `sdk: ">=3.4.0 <4.0.0"` and `flutter_lints: ^4.0.0`. Older Flutter channels will
  fail the version solve or the analyzer. Run `flutter --version` and
  `flutter upgrade`.
- **`flutter analyze` reports lint errors on a clean scaffold** — the project ships
  strict lints (`analysis_options.yaml`). That's intended; the generated code is
  clean against them. Fix your own additions, don't loosen the ruleset.

## Firebase build errors

Firebase toggles add the packages and a `FirebaseService`, but not your project's
secrets:

- **Missing `google-services.json` / `GoogleService-Info.plist`** — run
  `flutterfire configure` (or rename the generated `*.example` files) to add the
  real platform config. See `FIREBASE.md`.
- **`firebase_options.dart` not found** — `flutterfire configure` generates it.
- **Crashlytics build fails on Android** — enable the Crashlytics Gradle plugin
  (listed in `SETUP.md`).

## Runtime permission crashes

Selecting permissions generates the request methods and the manifest/plist
snippets, but doesn't paste them into native files.

- **App crashes when requesting a permission** — copy the entries from
  `MANIFEST.md` into `android/app/src/main/AndroidManifest.xml` and
  `ios/Runner/Info.plist`. Missing iOS usage strings cause an immediate crash.

## The app is stuck on a maintenance / update screen

The maintenance gate blocks the UI based on the source you picked:

- **Backend gate** — the app calls `GET /settings`. Return `off_mode` (with
  `is_off: false`) and a `force_update` block whose min version is at or below the
  app version. Until the endpoint exists and responds correctly, the gate may
  block.
- **Firebase gate** — set the Remote Config keys (`maintenance_mode`,
  `min_version`, `latest_version`, `force_update`, store URLs, announcement) so
  `maintenance_mode` is off and the version thresholds pass.

## Advisories in the preview

The notes under the preview are **advisories, not errors** — generation still
succeeds. They flag config mismatches (e.g. GetX + GoRouter, or Push without
Firebase `messaging`) and store-review nudges (contacts, background location).
Resolve them by adjusting the config, but you can export either way.
