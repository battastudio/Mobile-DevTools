'use strict';
// Pub package catalog. `version` is a sensible caret used by the pubspec
// generator; url/purpose feed PACKAGES.md and the UI.
const P = 'https://pub.dev/packages/';

const PACKAGE_CATALOG = {
  // ── State management ────────────────────────────────────────────────
  get: { url: `${P}get`, purpose: 'GetX state, DI and named-route navigation', version: '^4.6.6' },
  flutter_riverpod: { url: `${P}flutter_riverpod`, purpose: 'Riverpod state (raw Notifiers, no codegen)', version: '^2.6.1' },
  riverpod_annotation: { url: `${P}riverpod_annotation`, purpose: '@riverpod annotations (codegen path — not used by structured modes)', version: '^2.6.1' },
  flutter_bloc: { url: `${P}flutter_bloc`, purpose: 'BLoC/Cubit state', version: '^8.1.6' },
  bloc: { url: `${P}bloc`, purpose: 'Core BLoC library', version: '^8.1.4' },
  hydrated_bloc: { url: `${P}hydrated_bloc`, purpose: 'Persisted BLoC state', version: '^9.1.5' },
  provider: { url: `${P}provider`, purpose: 'InheritedWidget-based state', version: '^6.1.2' },
  // ── Navigation ──────────────────────────────────────────────────────
  go_router: { url: `${P}go_router`, purpose: 'Declarative routing (Riverpod structured + generic)', version: '^14.6.2' },
  // ── Networking ──────────────────────────────────────────────────────
  dio: { url: `${P}dio`, purpose: 'HTTP client backing ApiRequest', version: '^5.7.0' },
  pretty_dio_logger: { url: `${P}pretty_dio_logger`, purpose: 'Readable Dio request/response logs', version: '^1.4.0' },
  retrofit: { url: `${P}retrofit`, purpose: 'Codegen typed API client (generic only)', version: '^4.4.1' },
  http: { url: `${P}http`, purpose: 'Minimal HTTP client', version: '^1.2.2' },
  // ── Connectivity ────────────────────────────────────────────────────
  connectivity_plus: { url: `${P}connectivity_plus`, purpose: 'Network reachability changes', version: '^6.1.0' },
  internet_connection_checker_plus: { url: `${P}internet_connection_checker_plus`, purpose: 'Actual internet-access checks', version: '^2.5.2' },
  // ── Storage ─────────────────────────────────────────────────────────
  get_storage: { url: `${P}get_storage`, purpose: 'Key/value storage (GetX structured)', version: '^2.1.1' },
  shared_preferences: { url: `${P}shared_preferences`, purpose: 'Key/value storage (Riverpod structured)', version: '^2.3.3' },
  flutter_secure_storage: { url: `${P}flutter_secure_storage`, purpose: 'Encrypted key/value storage', version: '^9.2.2' },
  // ── UI / dialogs / media ────────────────────────────────────────────
  flutter_smart_dialog: { url: `${P}flutter_smart_dialog`, purpose: 'Global loading/toast/dialog (required by structured modes)', version: '^4.9.8' },
  cached_network_image: { url: `${P}cached_network_image`, purpose: 'Disk-cached network images', version: '^3.4.1' },
  flutter_svg: { url: `${P}flutter_svg`, purpose: 'SVG rendering', version: '^2.0.16' },
  flex_color_scheme: { url: `${P}flex_color_scheme`, purpose: 'Themeable Material color schemes', version: '^7.3.1' },
  // ── Localization ────────────────────────────────────────────────────
  intl: { url: `${P}intl`, purpose: 'Message/date/number formatting', version: '^0.19.0' },
  flutter_localization: { url: `${P}flutter_localization`, purpose: 'Localization delegate (Riverpod structured)', version: '^0.3.0' },
  // ── Firebase ────────────────────────────────────────────────────────
  firebase_core: { url: `${P}firebase_core`, purpose: 'Firebase initialization', version: '^3.8.0' },
  firebase_analytics: { url: `${P}firebase_analytics`, purpose: 'Analytics events', version: '^11.3.6' },
  firebase_crashlytics: { url: `${P}firebase_crashlytics`, purpose: 'Crash reporting', version: '^4.1.6' },
  firebase_messaging: { url: `${P}firebase_messaging`, purpose: 'Push notifications', version: '^15.1.6' },
  firebase_performance: { url: `${P}firebase_performance`, purpose: 'Performance monitoring', version: '^0.10.0+11' },
  firebase_remote_config: { url: `${P}firebase_remote_config`, purpose: 'Remote config flags', version: '^5.1.6' },
  // ── Notifications / links ───────────────────────────────────────────
  flutter_local_notifications: { url: `${P}flutter_local_notifications`, purpose: 'Local/scheduled notifications', version: '^18.0.1' },
  app_links: { url: `${P}app_links`, purpose: 'Deep/universal links', version: '^6.3.2' },
  url_launcher: { url: `${P}url_launcher`, purpose: 'Open urls/tel/mailto', version: '^6.3.1' },
  package_info_plus: { url: `${P}package_info_plus`, purpose: 'App version/build for force-update checks', version: '^8.0.2' },
  flutter_dotenv: { url: `${P}flutter_dotenv`, purpose: 'Load secrets/keys from a .env file', version: '^5.2.1' },
  sentry_flutter: { url: `${P}sentry_flutter`, purpose: 'Crash + performance monitoring', version: '^8.10.1' },
  // ── Logging ─────────────────────────────────────────────────────────
  logger: { url: `${P}logger`, purpose: 'Structured console logging', version: '^2.5.0' },
  // ── Files / permissions / media pickers ─────────────────────────────
  path_provider: { url: `${P}path_provider`, purpose: 'App directory paths', version: '^2.1.5' },
  permission_handler: { url: `${P}permission_handler`, purpose: 'Runtime permission requests', version: '^11.3.1' },
  image_picker: { url: `${P}image_picker`, purpose: 'Camera/gallery image picking', version: '^1.1.2' },
  share_plus: { url: `${P}share_plus`, purpose: 'System share sheet', version: '^12.0.0' },
  open_filex: { url: `${P}open_filex`, purpose: 'Open files with the OS handler', version: '^4.5.0' },
  syncfusion_flutter_pdfviewer: { url: `${P}syncfusion_flutter_pdfviewer`, purpose: 'In-app PDF viewing', version: '^27.2.5' },
  // ── Audio / haptics ─────────────────────────────────────────────────
  audioplayers: { url: `${P}audioplayers`, purpose: 'Sound-effect playback', version: '^6.1.0' },
  vibration: { url: `${P}vibration`, purpose: 'Haptic feedback', version: '^2.0.1' },
  // ── Maps / location ─────────────────────────────────────────────────
  google_maps_flutter: { url: `${P}google_maps_flutter`, purpose: 'Google Maps widget', version: '^2.9.0' },
  geolocator: { url: `${P}geolocator`, purpose: 'Device geolocation', version: '^13.0.2' },
  geocoding: { url: `${P}geocoding`, purpose: 'Address <-> coordinate lookup', version: '^3.0.0' },
  // ── Security ────────────────────────────────────────────────────────
  recaptcha_enterprise_flutter: { url: `${P}recaptcha_enterprise_flutter`, purpose: 'reCAPTCHA Enterprise bot defense', version: '^18.7.0' },
  // ── Dev / tooling ───────────────────────────────────────────────────
  flutter_launcher_icons: { url: `${P}flutter_launcher_icons`, purpose: 'Generate launcher icons', version: '^0.14.1' },
  flutter_native_splash: { url: `${P}flutter_native_splash`, purpose: 'Generate native splash screens', version: '^2.4.3' },
  // ── Models / DI / architecture ──────────────────────────────────────
  get_it: { url: `${P}get_it`, purpose: 'Service locator / dependency injection', version: '^8.0.2' },
  freezed_annotation: { url: `${P}freezed_annotation`, purpose: 'Immutable model annotations', version: '^2.4.4' },
  freezed: { url: `${P}freezed`, purpose: 'Immutable model codegen', version: '^2.5.7' },
  json_annotation: { url: `${P}json_annotation`, purpose: 'JSON (de)serialization annotations', version: '^4.9.0' },
  json_serializable: { url: `${P}json_serializable`, purpose: 'JSON codegen', version: '^6.8.0' },
  mocktail: { url: `${P}mocktail`, purpose: 'Mocking for unit tests', version: '^1.0.4' },
  bloc_test: { url: `${P}bloc_test`, purpose: 'BLoC test helpers', version: '^9.1.7' },
  build_runner: { url: `${P}build_runner`, purpose: 'Codegen runner', version: '^2.4.13' },
  custom_lint: { url: `${P}custom_lint`, purpose: 'Custom lint host (Riverpod structured)', version: '^0.7.0' },
  riverpod_lint: { url: `${P}riverpod_lint`, purpose: 'Riverpod lint rules', version: '^2.6.3' },
  riverpod_generator: { url: `${P}riverpod_generator`, purpose: 'Riverpod codegen (not used by structured modes)', version: '^2.6.3' },
};

module.exports = { PACKAGE_CATALOG };
