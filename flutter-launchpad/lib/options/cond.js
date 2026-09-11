'use strict';
// Conditional-explainer text per select value. The UI shows COND[key][value] under
// the field once a value is chosen.
const COND = {
  architecture: {
    'feature-folder': 'One folder per feature with screen + controller (the structured default).',
    'layer-folder': 'Grouped by layer (data/domain/presentation) — scaffold to fill in.',
    clean: 'Full Clean Architecture: data → domain → presentation, repository + usecase + entity, with a working sample feature (pulls in the pro base layer).',
    mvc: 'Model / View / Controller — a ChangeNotifier controller drives the view.',
    mvvm: 'Model / View / ViewModel — the view binds to a ViewModel (ChangeNotifier).',
  },
  modelsCodegen: {
    manual: 'Plain Dart models with hand-written fromJson/toJson — zero build_runner.',
    freezed: 'Immutable @freezed models with json_serializable (adds build_runner).',
  },
  mode: {
    'structured-getx': 'Structured GetX: GetxController + update(), StatelessWidget wrapped in GetBuilder, named routes, get_storage. general_exports mega-barrel and ApiRequest/AppKeys are mandatory.',
    'structured-riverpod': 'Structured Riverpod: raw flutter_riverpod Notifiers (no @riverpod codegen), ConsumerWidget screens, GoRouter + globalArguments, shared_preferences. Same barrel + ApiRequest/AppKeys rules as GetX.',
    generic: 'Vanilla Flutter. You pick state management, navigation and folders; no structured house rules are enforced.',
  },
  navigation: {
    'named-routes': 'GetX named routes: route* constants in routes_keys.dart, GetPage list in routes.dart. Pairs with GetX.',
    go_router: 'GoRouter routerProvider with route* path consts; screen args via a global globalArguments map. Pairs with Riverpod.',
  },
  apiClient: {
    api_request: 'One hand-rolled ApiRequest (lib/api/api_request.dart) wrapping Dio; endpoints on ApiEndpoints, JSON keys on AppKeys — never raw string keys.',
    dio: 'Raw Dio client. Consider wrapping it in an ApiRequest for auth/lang/error interceptors.',
    retrofit: 'Codegen typed client — adds build_runner. Not used by structured modes.',
    http: 'Minimal http client; no interceptors.',
  },
  localization: {
    intl: 'intl formatting; structured GetX translates via translateByKey with keys in translation_keys.dart.',
    flutter_localization: 'flutter_localization delegate; structured Riverpod drives locale via an AsyncNotifier.',
    none: 'Single-locale app.',
  },
  stateMgmt: {
    riverpod: 'Raw flutter_riverpod ^2.6 — mutable notifier field bags + ref.notifyListeners(). No freezed, no @riverpod codegen.',
    getx: 'GetxController field bags + update(). No Obx state objects required.',
    bloc: 'BLoC/Cubit with events + emitted states.',
  },
  themes: {
    dynamic: 'Dynamic color scheme via flex_color_scheme. Note: ScreenUtil sizing is documented per-feature, not hardcoded here.',
  },
  'platform.maintenance': {
    backend: "Backend: the app calls GET /settings and reads off_mode (maintenance) + force_update (min/latest version, store urls, is_required) + announcement. This is a backend-owned pattern — you own the flags server-side.",
    firebase: 'Firebase: flags come from Remote Config keys (maintenance_mode, min_version, latest_version, force_update, store urls, announcement_*). Toggle them in the Firebase console — no backend needed.',
    none: 'No maintenance gate.',
  },
  flavors: {
    dev: 'dev — points at the dev API + dev Firebase; debuggable, separate app id suffix so it installs beside prod.',
    demo: 'demo — a stable staging/QA variant (demo API, demo Firebase) for client review.',
    prod: 'prod — the release build: production API + Firebase, release signing, no debug tooling.',
  },
};

// Fields the structured modes DICTATE — the UI should lock these (they have no effect
// in structured modes; the generators derive them from `mode`). Only free in Generic mode.
const STRUCTURED_LOCKED_FIELDS = ['stateMgmt', 'architecture', 'navigation'];

// The canonical value each structured mode forces for the locked fields. The config UI
// snaps to these on mode change so the preview/export match what's generated.
const MODE_CANONICAL = {
  'structured-getx': { stateMgmt: 'getx', architecture: 'feature-folder', navigation: 'named-routes' },
  'structured-riverpod': { stateMgmt: 'riverpod', architecture: 'feature-folder', navigation: 'go_router' },
};

module.exports = { COND, STRUCTURED_LOCKED_FIELDS, MODE_CANONICAL };
