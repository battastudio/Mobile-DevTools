---
title: Modes & architecture
description: How the three generation modes differ in architecture, state management, and the conventions they enforce.
sidebar:
  order: 5
---

**Mode** is the single most important choice in Flutter Launchpad. It picks the
whole convention stack — architecture, state management, navigation, storage, and
the house rules the generated code follows. There are three:

- **`structured-getx`** — opinionated GetX with a `general_exports` mega-barrel.
- **`structured-riverpod`** — raw `flutter_riverpod` + GoRouter, same barrel.
- **`generic`** — vanilla Flutter; you choose the state library, navigation, and
  folders.

## Structured vs generic

The two **structured** modes are opinionated: they encode a strict set of
conventions and derive State management, Architecture, and Navigation from the
mode itself. Those three fields are **locked** in the UI — they have no effect
because the generators read them from `mode`.

| Structured mode | State | Architecture | Navigation | Storage |
|-----------------|-------|--------------|------------|---------|
| `structured-getx` | GetX | feature folders | named routes | `get_storage` |
| `structured-riverpod` | Riverpod | feature folders | GoRouter | `shared_preferences` |

**Generic** mode enforces nothing. State management, navigation, and architecture
are all yours to pick, and no `general_exports` barrel or `ScreenUtil` sizing is
imposed.

Some things are the same in every mode: the typed API envelope
(`ApiResponse<T>` / `PaginatedResponse<T>` / `ApiError`), your selected models,
and the optional Professional base layer (DI + Dio client + `Result`/`Failure` +
base repository/usecase + `network_info`) — which `clean` architecture always
pulls in.

## The structured house rules

Both structured modes share the same non-negotiable conventions:

- **One mega-barrel.** Every file imports only
  `package:<app>/general_exports.dart`, which re-exports Flutter, the state
  library, `flutter_screenutil`, and every subtree `index.dart`.
- **One API client.** All networking goes through a single hand-rolled
  `ApiRequest` (wrapping Dio) — no retrofit, no codegen. Endpoints are
  `ApiEndpoints` constants; every JSON/storage key is an `AppKeys` constant.
- **Feature folders.** One folder per feature under `lib/screens/<feature>/` with
  a screen, a controller, and a barrel.
- **Side-effect free-functions.** Screens never call `print`, a dialog, or a
  plugin directly — they call `consoleLog` / `startLoading` / `showMessage`.
- **≤150 lines per file**, strict lints, `flutter_smart_dialog` for global
  loading/toast, and `flutter_screenutil` sizing on a 390×844 canvas.

## `structured-getx`

The opinionated GetX stack.

- **State:** `GetxController` field bags; mutate fields then call `update()`.
  Screens are `StatelessWidget`s wrapped in `GetBuilder` — no `Obx` state objects
  required.
- **Navigation:** GetX **named routes**. Route constants live in
  `routes_keys.dart`; a `GetPage` list in `routes.dart` maps them to screens.
  Never hardcode a route string.
- **Root:** `GetMaterialApp` inside `ScreenUtilInit`, with `SmartDialog` init in
  the builder. Cross-screen singletons are `Get.put` once in `my_app.dart`.
- **Storage:** `get_storage`, wrapped in `LocalStorage`.
- **Localization:** GetX native translations — strings in `AppTranslations`,
  resolved with `TranslationKeys.x.tr`; locale switched via `LocaleController`.

## `structured-riverpod`

The same conventions on a Riverpod foundation — deliberately **codegen-free**.

- **State:** raw `flutter_riverpod` `Notifier`s with mutable field bags and
  `ref.notifyListeners()`. **No** `@riverpod` codegen and **no** freezed for
  state. Screens are `ConsumerWidget`s. Ships with `custom_lint` + `riverpod_lint`
  as dev dependencies.
- **Navigation:** **GoRouter** via a `routerProvider`, with `route*` path
  constants. Screen arguments pass through a global `globalArguments` map.
- **Storage:** `shared_preferences`, wrapped in `LocalStorage`.
- **Localization:** Flutter `gen-l10n`. Strings live in `lib/l10n/app_*.arb`;
  running `flutter gen-l10n` emits `AppLocalizations`. Locale is switched and
  persisted through a provider. Requires `flutter gen-l10n` (or a `pub get` with
  `generate: true`) before the first build.

## `generic`

Vanilla Flutter — the plain-Flutter idiom, no structured house rules.

- **State management** is free: `getx`, `riverpod`, `bloc`, `provider`, or
  `none`. The capability layer uses plain `ChangeNotifier` / `ValueNotifier` and
  does not impose a barrel or `ScreenUtil`.
- **Architecture** is meaningful here:
  - **`clean`** — full Clean Architecture: `data → domain → presentation` with a
    repository + usecase + entity and a **working sample feature** wired end to
    end. Pulls in the Professional base layer automatically.
  - **`mvc`** — Model / View / Controller; a `ChangeNotifier` controller drives
    the view, with a real sample.
  - **`mvvm`** — Model / View / ViewModel; the view binds to a `ChangeNotifier`
    ViewModel, with a real sample.
  - **`layer-folder`** — `core` / `data` / `domain` / `presentation` folders with
    `.gitkeep` placeholders for you to fill.
- **Every capability toggle still emits a real, buildable file** (services,
  widgets, theme, i18n, env, permissions). What's left to you is the **root
  wiring** — `app.dart` / `main.dart` composition — so you can plug the generated
  pieces into your own state and navigation setup.

## Choosing a mode

- Want the fastest path with the most conventions decided for you, and you like
  GetX? → **`structured-getx`**.
- Prefer Riverpod + GoRouter, still fully opinionated and codegen-free? →
  **`structured-riverpod`**.
- Want to keep control of state, navigation, and folder layout, or you're dropping
  the scaffold into an existing style? → **`generic`** (with `clean` / `mvc` /
  `mvvm` if you want a wired sample to copy).

:::note
Switching mode in the UI snaps the locked fields (State, Architecture,
Navigation) to the mode's canonical values so the preview and export match what's
generated.
:::
