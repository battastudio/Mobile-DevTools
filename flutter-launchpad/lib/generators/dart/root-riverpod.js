'use strict';

const { pascal, f } = require('./helpers');
const { bootstrap } = require('./bootstrap');

// ── root: Riverpod navigation + main ──────────────────────────────────────
function rootRiverpod(app, config) {
  const feats = config.features;
  const screenClass = (feat) => pascal(feat);
  const routeConst = (feat) => `route${pascal(feat)}`;
  const paths = feats
    .map((feat, i) => `const String ${routeConst(feat)} = '${i === 0 ? '/' : `/${feat.replace(/_/g, '-')}`}';`)
    .join('\n');
  const goRoutes = feats
    .map((feat) => `      GoRoute(path: ${routeConst(feat)}, builder: (_, __) => const ${screenClass(feat)}()),`)
    .join('\n');
  const routePaths = `// Route path constants — never hardcode route strings (mirror of routes_keys).
${paths}
`;
  const routerProvider = `import 'package:go_router/go_router.dart';

import 'package:${app}/general_exports.dart';

final GlobalKey<NavigatorState> rootNavigatorKey = GlobalKey<NavigatorState>();

// globalArguments replaces Get.arguments — nav_extension writes the extra map
// here on every push so any screen can read its arguments without a controller.
Map<String, dynamic> globalArguments = <String, dynamic>{};

// GoRouter, exposed as a plain Provider (no code generation).
final Provider<GoRouter> routerProvider = Provider<GoRouter>((Ref<GoRouter> ref) {
  return GoRouter(
    navigatorKey: rootNavigatorKey,
    initialLocation: ${routeConst(feats[0])},
    routes: <RouteBase>[
${goRoutes}
    ],
  );
});
`;
  const navExtension = `import 'package:go_router/go_router.dart';

import 'package:${app}/general_exports.dart';

// Navigate off a route string: routeHome.go();  routeCart.push(extra: {...});
extension NavExtension on String {
  void go({Map<String, dynamic>? extra}) {
    GoRouter.of(rootNavigatorKey.currentContext!).go(this, extra: extra);
    _stash(extra);
  }

  void push({Map<String, dynamic>? extra}) {
    GoRouter.of(rootNavigatorKey.currentContext!).push(this, extra: extra);
    _stash(extra);
  }

  void pop() => GoRouter.of(rootNavigatorKey.currentContext!).pop();

  void _stash(Map<String, dynamic>? extra) {
    if (extra != null) {
      globalArguments.addAll(extra);
    }
  }
}
`;
  const dark = config.themes.includes('dark');
  const i18n = config.localization !== 'none';
  const maintenance = config.platform.maintenance !== 'none';
  const boot = bootstrap(app, config);
  const l10nImport = i18n ? [`import 'package:${app}/l10n/app_localizations.dart';`] : [];
  const needContainer = dark || i18n;
  const loadLines = [
    ...(dark ? ['  await container.read(themeModeProvider.notifier).load();'] : []),
    ...(i18n ? ['  await container.read(localeProvider.notifier).load();'] : []),
  ];
  const runLine = needContainer
    ? `  final ProviderContainer container = ProviderContainer();\n${loadLines.join('\n')}${loadLines.length ? '\n' : ''}  runApp(UncontrolledProviderScope(container: container, child: const MyApp()));`
    : '  runApp(const ProviderScope(child: MyApp()));';
  const watchLines = [
    ...(dark ? ['    final ThemeMode themeMode = ref.watch(themeModeProvider);'] : []),
    ...(i18n ? ['    final Locale locale = ref.watch(localeProvider);'] : []),
  ].join('\n');
  const appLines = [
    dark ? '          darkTheme: darkTheme,' : '',
    dark ? '          themeMode: themeMode,' : '',
    i18n ? '          locale: locale,' : '',
    i18n ? '          supportedLocales: AppLocalizations.supportedLocales,' : '',
    i18n ? '          localizationsDelegates: AppLocalizations.localizationsDelegates,' : '',
    maintenance ? '          builder: (BuildContext ctx, Widget? w) => MaintenanceGate(child: w ?? const SizedBox.shrink()),' : '',
  ].filter(Boolean).join('\n');
  const main = `${[`import 'package:${app}/general_exports.dart';`, ...l10nImport, ...boot.imports].join('\n')}

// Entrypoint — ProviderScope + MaterialApp.router (GoRouter). Mirror of the GetX
// main; state lives in Notifiers, navigation in routerProvider + globalArguments.
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
${boot.lines.length ? boot.lines.join('\n') + '\n' : ''}${runLine}
}

class MyApp extends ConsumerWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final GoRouter router = ref.watch(routerProvider);
${watchLines ? watchLines + '\n' : ''}    return ScreenUtilInit(
      designSize: const Size(390, 844),
      builder: (BuildContext context, Widget? child) {
        return MaterialApp.router(
          debugShowCheckedModeBanner: false,
          theme: lightTheme,${appLines ? '\n' + appLines : ''}
          routerConfig: router,
        );
      },
    );
  }
}
`;
  return [
    f('lib/navigation/router_provider.dart', routerProvider),
    f('lib/navigation/nav_extension.dart', navExtension),
    f('lib/navigation/route_paths.dart', routePaths),
    f('lib/navigation/index.dart', `// navigation — subtree barrel. Add every new file here (structured single-barrel rule).
export 'nav_extension.dart';
export 'route_paths.dart';
export 'router_provider.dart';
`),
    f('lib/main.dart', main),
  ];
}

module.exports = { rootRiverpod };
