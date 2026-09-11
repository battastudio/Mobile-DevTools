'use strict';
// Preset AI rules injected into CLAUDE.md + AGENTS.md so the agent follows the
// project's conventions (animation, pagination, i18n, etc.) instead of guessing.

const RULES = {
  // ── architecture ────────────────────────────────────────────────────────
  'reuse-first': { label: 'Reuse components', category: 'architecture', text: 'Check lib/components (structured) or lib/widgets (generic) before building UI; reuse or extend, only add new when nothing fits.' },
  'one-api-client': { label: 'One API client', category: 'architecture', text: 'All HTTP goes through the single `ApiRequest` client; endpoints are `ApiEndpoints` constants and every JSON/storage key is an `AppKeys` constant — never raw string keys, never a second HTTP client.' },
  'wrapper-per-capability': { label: 'Wrapper per capability', category: 'architecture', text: 'One wrapper per capability, never a plugin in a screen: images→AppImage, buttons→AppButton, fields→AppTextField; notifications/deep-links/location/connectivity/permissions live in lib/services and are called only from controllers.' },
  'feature-requests-split': { label: 'Split feature requests', category: 'architecture', text: "A controller's HTTP calls live in a sibling `<feature>_requests.dart` so the controller and its requests both stay ≤150 lines." },
  'side-effect-helpers': { label: 'Side-effect free-functions', category: 'architecture', text: 'Never call `print`/SmartDialog/a plugin directly — use the free-functions `consoleLog` / `startLoading` / `showMessage` so screens stay testable.' },
  'small-files': { label: '≤150 lines/file', category: 'architecture', text: 'Keep every file ≤150 lines — split into widgets/helpers first. Only generated l10n and the flat const registries (app_keys/app_assets/api_endpoints) are exempt.' },
  // ── state ───────────────────────────────────────────────────────────────
  'notify-once': { label: 'Notify once', category: 'state', text: 'Mutate the notifier field bag then call `ref.notifyListeners()`/`update()` once at the end; set loading/error flags and reset the failing section so one failed strip can’t take down the whole screen.' },
  'const-widgets': { label: 'Const + small widgets', category: 'state', text: 'Prefer const constructors; extract widgets instead of long build methods; no logic in build().' },
  'dispose-controllers': { label: 'Dispose resources', category: 'state', text: 'Dispose controllers, animation controllers, and stream subscriptions in dispose(); no leaks.' },
  // ── data / networking ─────────────────────────────────────────────────
  'defensive-json': { label: 'Defensive fromJson', category: 'data', text: 'Parse JSON defensively in fromJson: type-check + `tryParse` + sane defaults + a static `listFrom(dynamic)`; never force-unwrap API data; guard every nav-args read.' },
  'null-safety': { label: 'Guard nullable data', category: 'data', text: 'Never force-unwrap (!) nullable API data without a guard/default.' },
  'error-handling': { label: 'Handle every error', category: 'data', text: 'Every network call handles onError, resets the failing section’s flags, and surfaces a localized message; never swallow exceptions or leave an empty catch.' },
  'network-resilience': { label: 'Resilient networking', category: 'data', text: 'Use a shared Dio with connectTimeout + receiveTimeout; omit the Authorization header when there’s no token; on 401 refresh the token and retry once; surface a localized error, never a raw literal.' },
  pagination: { label: 'Paginate lists', category: 'data', text: 'Every list backed by a paged API uses `PaginatedListView` (load-more on scroll); never fetch-all — and document why when you opt out.' },
  'secure-tokens': { label: 'Secure tokens', category: 'data', text: 'Tokens and PII live only in SecureStorage (encrypted), never SharedPreferences or plain files.' },
  // ── ux ──────────────────────────────────────────────────────────────────
  'state-widgets': { label: 'Empty/error/loading states', category: 'ux', text: 'Route every screen through the shared state widgets: content-loading = AppShimmer skeleton shaped like the final content; empty = AppEmptyState (with a CTA when there’s a way out); primary-content failure = AppErrorView(onRetry). Never render a failure as an empty list.' },
  'shimmer-loading': { label: 'Shimmer skeletons', category: 'ux', text: 'Show `AppShimmer` skeletons shaped like the content while lists/details load; `AppLoading` (spinner) is only for blocking actions — never a bare spinner for content.' },
  'pull-refresh': { label: 'Pull to refresh', category: 'ux', text: 'Every scrollable data screen supports pull-to-refresh via `AppRefresher`.' },
  'animation-always': { label: 'Animate everything', category: 'ux', text: 'Animate every route transition and list/item entrance — use `utils/transitions.dart` (fadeRoute/slideRoute); never push a bare MaterialPageRoute.' },
  'hero-images': { label: 'Hero on images', category: 'ux', text: 'Wrap any image/avatar that opens a detail screen in a `Hero` with a stable, unique tag on both screens.' },
  accessibility: { label: 'Accessibility', category: 'ux', text: 'Add Semantics labels to icon-only buttons; keep tap targets ≥48dp; respect text scaling.' },
  // ── design / i18n (single source of truth) ────────────────────────────
  'single-source': { label: 'Single source of truth', category: 'design', text: 'Define every value ONCE and reference it globally — strings in ARB/TranslationKeys (via the global `l10n`), colors/spacing/text in the theme tokens, JSON keys in AppKeys, endpoints in ApiEndpoints, assets in AppAssets. Never duplicate a literal or re-declare a value locally.' },
  'design-tokens': { label: 'Global design tokens', category: 'design', text: 'Read colors from AppColors/AppPalette.token(context), spacing from AppSpacing, text from AppTextStyles or Theme.of(context).textTheme; never inline a Color()/TextStyle()/raw EdgeInsets. The theme is defined once, globally.' },
  'no-hardcoded-strings': { label: 'No hardcoded strings', category: 'design', text: 'No inline UI strings — reference every user-facing string through the global localization layer (TranslationKeys/`l10n`), defined once, with en + ar key parity.' },
  'no-magic-numbers': { label: 'No magic numbers', category: 'design', text: 'No raw pixel numbers — size with ScreenUtil `.w/.h/.sp/.r`.' },
  'rtl-aware': { label: 'RTL aware', category: 'design', text: 'Use directional insets (EdgeInsetsDirectional) and honor `isRTL`; test the UI in Arabic.' },
  // ── style / naming ────────────────────────────────────────────────────
  naming: { label: 'Descriptive names', category: 'style', text: 'Use descriptive, intention-revealing names — NO single-character identifiers (`x`,`e`,`d` → `product`,`error`,`response`) and no cryptic abbreviations. Classes PascalCase, files/dirs snake_case, members/consts camelCase; booleans read as predicates (isX/hasX/canX).' },
  // ── capabilities (one per generated feature) ──────────────────────────
  'notifications-deeplinks': { label: 'Notifications & deep links', category: 'capabilities', text: 'Notifications + deep links go through lib/services; a tap navigates through the router from the payload `route`; register a channel per flavor; request notification permission at the right moment.' },
  'permissions-flow': { label: 'Permissions flow', category: 'capabilities', text: 'Request permissions through PermissionService at point-of-use (not on launch); handle denied + permanently-denied (open app settings); never assume granted.' },
  'firebase-observability': { label: 'Firebase & observability', category: 'capabilities', text: 'Initialize Firebase in main() before runApp; route analytics through FirebaseService; enable Crashlytics; wrap runApp errors; never log PII.' },
  'flavors-env': { label: 'Flavors & env', category: 'capabilities', text: 'Select the environment via `currentMode` (general_constants) with a per-flavor base URL; read secrets/keys from `.env`/`Env`, never hardcoded or committed; keep `viewLog` off in prod.' },
  'maps-location': { label: 'Maps & location', category: 'capabilities', text: 'Read the Maps key from `.env`; dispose GoogleMapController; guard service-enabled + permission before reading a position.' },
  'forms-validation': { label: 'Forms & validation', category: 'capabilities', text: 'Build forms with `Validators` + a Form/GlobalKey; validate on submit with localized messages; format inputs (phone/currency); disable submit while loading.' },
  'security-hardening': { label: 'Security hardening', category: 'capabilities', text: 'Pin the TLS certificate on the release client; obfuscate release builds; never log tokens; get ATT/consent before any tracking.' },
  // ── quality ────────────────────────────────────────────────────────────
  'tests-required': { label: 'Test every feature', category: 'quality', text: 'A feature is not done without its unit test under test/ and its doc under docs/features/.' },
};

// UI options for the rules chip group (with category for grouping).
const ruleOptions = Object.entries(RULES).map(([value, r]) => ({ value, label: r.label, category: r.category }));

// resolveRules — the selected preset texts + any custom free-text rules.
function resolveRules(config) {
  const presets = (config.rules || []).filter((k) => k in RULES).map((k) => RULES[k].text);
  const custom = (config.customRules || []).map((r) => r.trim()).filter(Boolean);
  return [...presets, ...custom];
}

module.exports = { RULES, ruleOptions, resolveRules };
