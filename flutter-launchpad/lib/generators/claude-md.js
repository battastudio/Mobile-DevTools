'use strict';
// CLAUDE.md — the house rules an agent MUST follow in this repo. For structured
// modes this is the convention set (general_exports barrel, ApiRequest-only,
// AppKeys no-raw-strings, 150-line cap, feature folders, strict lints, mutable
// state, no codegen). Generic mode gets a short honest placeholder.
const { isStructured } = require('../schema');
const { resolveRules } = require('../rules');

function claudeMd(config) {
  const projectRules = resolveRules(config);
  const rulesBlock = projectRules.length ? ['', '## Project rules (MUST follow)', ...projectRules.map((r) => `- ${r}`), ''] : [];
  if (!isStructured(config)) {
    return [
      `# CLAUDE.md — ${config.appName}`,
      '',
      'Generic Flutter project. No structured house rules are enforced.',
      '',
      '- Keep files small and single-purpose.',
      '- Run `flutter analyze` and `flutter test` before you finish.',
      ...rulesBlock,
      '',
    ].join('\n');
  }

  const riverpod = config.mode === 'structured-riverpod';
  const stateRules = riverpod
    ? [
        '## State — raw Riverpod (no codegen)',
        '- Controllers are **Notifiers** (`Notifier<void>` / `AsyncNotifier` / `AutoDisposeNotifier`), never GetxControllers.',
        '- **Mutable field bags**: mutate the notifier fields, then call **`ref.notifyListeners()` once** at the end. This is the direct analog of GetX `update()`.',
        '- Declare the provider **in the same file** next to the notifier: `final xProvider = NotifierProvider<X, void>(X.new);`.',
        '- Screens are **`ConsumerWidget`**; read with `ref.watch(xProvider)`, call methods with `ref.read(xProvider.notifier).m()`.',
        '- Cross-notifier singletons via a **lazy getter** (`X get x => ref.read(xProvider.notifier);`), never a field-initialized `ref.read`.',
        '- **NO `freezed`, NO `copyWith`, NO immutable state objects, NO `@riverpod`/`riverpod_generator`.** Raw `flutter_riverpod ^2.6` only.',
        '- Navigate with **GoRouter** (`routerProvider`) using `route*` path consts; screen args go through the global `globalArguments` map (guard reads).',
      ]
    : [
        '## State — GetX',
        '- Screens are `StatelessWidget` wrapped in `GetBuilder<XxxController>`.',
        '- Controllers extend **`GetxController`**; mutate the **mutable field bag**, then call **`update()`** to re-render. No business logic in the widget.',
        '- Cross-screen singletons (`myAppController`, ...) are `Get.put` in `my_app.dart` and preferred over `Get.find<T>()`.',
        '- Navigate via **named-route constants** from `routes_keys.dart` — never hardcode route strings.',
        '- **NO codegen.** Plain GetxControllers, plain routes.',
      ];

  return [
    `# CLAUDE.md — ${config.appName}`,
    '',
    `Structured **${config.mode}** app. These rules OVERRIDE defaults — follow them exactly.`,
    '',
    '## Single barrel import',
    `- Import ONLY \`import 'package:${config.appName}/general_exports.dart';\` (or the relative \`general_exports.dart\`).`,
    '- `general_exports.dart` re-exports Flutter, the state library, ScreenUtil, and **every subtree `index.dart`**. Never import internals directly.',
    '- Every subtree (`api/`, `components/`, `screens/`, `theme/`, `utils/`, `constants/`) has an `index.dart` barrel. When you add a file, **add it to its barrel**.',
    '',
    '## Architecture — feature folders (structured MVC)',
    '- One folder per feature under `lib/screens/<snake>/` with the screen, its controller, and an `index.dart`. Reusable UI mirrors under `lib/components/<snake>/`.',
    '- This IS the MVC split: **Model** = `models/` + `api/`, **View** = `<feat>_screen.dart`, **Controller** = `<feat>_controller.dart`. Do not add a parallel `mvc/` or `clean/` layer.',
    '- A controller\'s HTTP calls go in a sibling **`<feature>_requests.dart`** so both the controller and the requests stay ≤150 lines.',
    '- Scaffold screens **by hand** — there is no generator step.',
    '',
    '## Reusable components first',
    '- Before writing UI, check `lib/components/` (buttons, fields, scaffold, dialogs, bottom sheet, date picker, image picker, share, pdf, shimmer, refresher, maintenance gate). Reuse or extend; only add a new component if none fits.',
    '- Cross-cutting capabilities live in `lib/services/` (notifications, deep links, location, connectivity, maintenance) and `lib/utils/` (locale, theme, transitions, logging). Route through them — never call a plugin directly from a screen.',
    '',
    ...stateRules,
    '',
    '## Networking — one ApiRequest, no raw keys',
    '- ALL HTTP goes through the single hand-rolled **`ApiRequest`** (`lib/api/api_request.dart`, inline Dio). No retrofit, no codegen, no second client.',
    '- Endpoints are constants on **`ApiEndpoints`**; JSON request/response + storage keys are constants on **`AppKeys`**. **NEVER use raw string keys.**',
    '- `fromJson` is **defensive**: type-check each field, `int.tryParse`/`double.tryParse` with defaults, `?? ` fallbacks, and a static `listFrom` for arrays. Never assume a key exists or a type is right.',
    '- `flutter_smart_dialog` is required; use the free-functions `consoleLog` / `startLoading` / `showMessage` (never `print`).',
    '',
    '## Single source of truth — define once, reference everywhere',
    `- **Strings**: never inline UI text. Add a key and read it through ${riverpod ? 'the global **`l10n`** (`l10n.welcome`)' : '**`TranslationKeys.x.tr`**'} — one definition, all locales.`,
    '- **Colors/spacing/text**: read from the theme tokens (`AppColors`, `AppSpacing`, `AppTextStyles` / `Theme.of(context).textTheme`) — never inline a `Color()`, raw `EdgeInsets`, or `TextStyle()`.',
    '- **Keys/endpoints/assets**: `AppKeys` / `ApiEndpoints` / `AppAssets`. Never duplicate a literal or re-declare a value locally — if you need it in two places, it belongs in a token file.',
    '',
    '## Sizing, theming, i18n',
    '- Size with **ScreenUtil** `.w/.h/.sp/.r` on the 390×844 canvas (ScreenUtilInit in the root) — never raw px. Do not hardcode dimensions.',
    '- Colors via `AppColors`; RTL via the global `isRTL`. Translate with keys (no inline strings).',
    `- Light/dark is a runtime toggle via \`ThemeController\`; locale via ${riverpod ? '`localeProvider`' : '`LocaleController`'} (both persisted). See \`docs/features/theming.md\` + \`i18n.md\`.`,
    '',
    '## Hard limits & style (strict analysis_options.yaml)',
    '- **150-line cap per file** — split anything longer into widgets/helpers. If a file crosses 150 lines, refactor before finishing. (Generated l10n and flat const registries — `app_keys.dart`, `app_assets.dart`, `api_endpoints.dart` — are exempt.)',
    '- **Descriptive, intention-revealing names — no single-character identifiers** (`x`,`e`,`d` → `product`,`error`,`response`); no cryptic abbreviations. Booleans read as predicates (`isX`/`hasX`/`canX`).',
    '- `always_specify_types`, `prefer_single_quotes`, `prefer_const_constructors`, `sort_constructors_first`, `directives_ordering`, `always_put_control_body_on_new_line`, `avoid_print`.',
    '- Files/folders `snake_case`; identifiers `camelCase`; classes `PascalCase`.',
    '',
    '## Definition of done (per feature)',
    '- Feature folder + barrel wired into `screens/index.dart` and the router.',
    '- A **doc per feature** under `docs/features/` and a **test per feature** under `test/`.',
    '- `flutter analyze` clean, `flutter test` green, every file ≤150 lines.',
    '- If a required asset (icon/image/SVG) is missing: **STOP and ask** — no placeholders, no guessing.',
    ...rulesBlock,
    '',
  ].join('\n');
}

module.exports = { claudeMd };
