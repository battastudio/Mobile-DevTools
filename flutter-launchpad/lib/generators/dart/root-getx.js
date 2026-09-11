'use strict';

const { pascal, f } = require('./helpers');
const { bootstrap } = require('./bootstrap');

// ── root: GetX my_app + routes + routes_keys ──────────────────────────────
function rootGetx(app, config) {
  const feats = config.features;
  const routeConst = (feat) => `route${pascal(feat)}`;
  const keys = feats
    .map((feat, i) => `const String ${routeConst(feat)} = '${i === 0 ? '/' : `/${feat.replace(/_/g, '-')}`}';`)
    .join('\n');
  const pages = feats
    .map((feat) => `  GetPage<${pascal(feat)}Screen>(name: ${routeConst(feat)}, page: () => const ${pascal(feat)}Screen()),`)
    .join('\n');
  const put = `  final ${pascal(feats[0])}Controller ${feats[0]}Controller = Get.put(${pascal(feats[0])}Controller());`;
  const dark = config.themes.includes('dark');
  const i18n = config.localization !== 'none';
  const maintenance = config.platform.maintenance !== 'none';
  const l10nImport = i18n ? "\nimport 'package:flutter_localizations/flutter_localizations.dart';" : '';
  const themeModeLine = dark ? '\n          themeMode: ThemeController.initial,' : '';
  const i18nLines = i18n
    ? `
          translations: AppTranslations(),
          locale: LocaleController.initial,
          fallbackLocale: const Locale('en'),
          supportedLocales: LocaleController.supported,
          localizationsDelegates: const <LocalizationsDelegate<dynamic>>[
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],`
    : '';
  const builderLine = maintenance
    ? '\n          builder: (BuildContext ctx, Widget? w) => FlutterSmartDialog.init()(ctx, MaintenanceGate(child: w ?? const SizedBox.shrink())),'
    : '\n          builder: FlutterSmartDialog.init(),';
  const myApp = `import 'package:flutter_smart_dialog/flutter_smart_dialog.dart';${l10nImport}

import 'package:${app}/general_exports.dart';

// Cross-screen singletons live here as globals (Get.put once, use anywhere).
${put.replace(/^ {2}/, '')}

// Root widget — ScreenUtilInit wraps GetMaterialApp (named routes + SmartDialog).
class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ScreenUtilInit(
      designSize: const Size(390, 844),
      builder: (BuildContext context, Widget? child) {
        return GetMaterialApp(
          debugShowCheckedModeBanner: false,
          theme: lightTheme,${dark ? '\n          darkTheme: darkTheme,' : ''}${themeModeLine}
          initialRoute: ${routeConst(feats[0])},
          getPages: appRoutes,${i18nLines}${builderLine}
        );
      },
    );
  }
}
`;
  const routes = `import 'package:${app}/general_exports.dart';

// GetPage list mapping route* consts -> screens. Register every screen here.
final List<GetPage<dynamic>> appRoutes = <GetPage<dynamic>>[
${pages}
];
`;
  const routesKeys = `// Named-route constants — never hardcode route strings.
${keys}
`;
  const boot = bootstrap(app, config);
  const main = `${[...boot.imports, `import 'package:${app}/general_exports.dart';`].join('\n')}

// Entrypoint — bindings, GetStorage init${boot.lines.length ? ', bootstrap,' : ','} then runApp(MyApp()).
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await LocalStorage.init();
${boot.lines.length ? boot.lines.join('\n') + '\n' : ''}  runApp(const MyApp());
}
`;
  return [
    f('lib/main.dart', main),
    f('lib/screens/my_app/my_app.dart', myApp),
    f('lib/screens/my_app/routes.dart', routes),
    f('lib/screens/my_app/routes_keys.dart', routesKeys),
  ];
}

module.exports = { rootGetx };
