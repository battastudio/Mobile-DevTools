'use strict';
// Structured skeleton: per-feature screen/controller folders, navigation, main.
const { PascalCase, barrel } = require('./helpers');

// screens/ — one folder per feature, plus the screens/ barrel.
function screenFiles(config) {
  const app = config.appName;
  const riverpod = config.mode === 'structured-riverpod';
  const files = [];
  const featureExports = [];
  for (const feat of config.features) {
    const Pascal = PascalCase(feat);
    const dir = `lib/screens/${feat}`;
    featureExports.push(`${feat}/index.dart`);
    const screenFile = riverpod ? `${feat}.dart` : `${feat}_screen.dart`;
    files.push({ path: `${dir}/index.dart`, content: barrel(feat, [screenFile, `${feat}_controller.dart`]) });
    files.push({
      path: `${dir}/${screenFile}`,
      content: riverpod
        ? [`import 'package:${app}/general_exports.dart';`, '', `// ${Pascal} — ConsumerWidget (the Riverpod convention drops the _screen suffix).`, `class ${Pascal} extends ConsumerWidget {`, `  const ${Pascal}({super.key});`, '', '  @override', '  Widget build(BuildContext context, WidgetRef ref) {', `    ref.watch(${feat}Provider);`, '    // FL-2: real UI.', '    return const SizedBox.shrink();', '  }', '}', ''].join('\n')
        : [`import 'package:${app}/general_exports.dart';`, '', `// ${Pascal}Screen — StatelessWidget wrapped in GetBuilder.`, `class ${Pascal}Screen extends StatelessWidget {`, `  const ${Pascal}Screen({super.key});`, '', '  @override', '  Widget build(BuildContext context) {', `    return GetBuilder<${Pascal}Controller>(`, `      init: ${Pascal}Controller(),`, '      builder: (controller) {', '        // FL-2: real UI.', '        return const SizedBox.shrink();', '      },', '    );', '  }', '}', ''].join('\n'),
    });
    files.push({
      path: `${dir}/${feat}_controller.dart`,
      content: riverpod
        ? [`import 'package:${app}/general_exports.dart';`, '', `// ${Pascal}Controller — raw Notifier + provider-in-file. Mutable field bag,`, '// call ref.notifyListeners() to rebuild. No code generation.', `final NotifierProvider<${Pascal}Controller, void> ${feat}Provider =`, `    NotifierProvider<${Pascal}Controller, void>(${Pascal}Controller.new);`, '', `class ${Pascal}Controller extends Notifier<void> {`, '  @override', '  void build() {}', '  // FL-2: fields + methods (ApiRequest calls inline).', '}', ''].join('\n')
        : [`import 'package:${app}/general_exports.dart';`, '', `// ${Pascal}Controller — GetxController. Mutable field bag, call update().`, `class ${Pascal}Controller extends GetxController {`, '  // FL-2: fields + methods (ApiRequest calls inline).', '}', ''].join('\n'),
    });
  }
  files.push({ path: 'lib/screens/index.dart', content: barrel('screens', riverpod ? featureExports : [...featureExports, 'my_app/index.dart']) });
  return files;
}

// Navigation skeleton — GoRouter (riverpod) or the my_app named-routes tree (getx).
function navFiles(config) {
  const app = config.appName;
  if (config.mode === 'structured-riverpod') {
    return [
      { path: 'lib/navigation/index.dart', content: barrel('navigation', ['router_provider.dart']) },
      {
        path: 'lib/navigation/router_provider.dart',
        content: [
          `import 'package:${app}/general_exports.dart';`,
          "import 'package:go_router/go_router.dart';",
          '',
          '// GoRouter. route* path consts + globalArguments (replaces Get.arguments).',
          'Map<String, dynamic> globalArguments = <String, dynamic>{};',
          "const String routeHome = '/';",
          'final Provider<GoRouter> routerProvider = Provider<GoRouter>((ref) {',
          '  return GoRouter(',
          '    routes: <GoRoute>[',
          '      // FL-2: GoRoute per feature.',
          '    ],',
          '  );',
          '});',
          '',
        ].join('\n'),
      },
    ];
  }
  return [
    { path: 'lib/screens/my_app/index.dart', content: barrel('my_app', ['my_app.dart', 'routes.dart', 'routes_keys.dart']) },
    {
      path: 'lib/screens/my_app/routes_keys.dart',
      content: ['// Named-route constants — never hardcode route strings.', "const String routeSplash = '/';", '// FL-2: one route* const per feature.', ''].join('\n'),
    },
    {
      path: 'lib/screens/my_app/routes.dart',
      content: [`import 'package:${app}/general_exports.dart';`, '', '// GetPage list mapping route consts -> screens.', 'final List<GetPage<dynamic>> appRoutes = <GetPage<dynamic>>[', '  // FL-2: GetPage(name: route*, page: () => const *Screen()).', '];', ''].join('\n'),
    },
    {
      path: 'lib/screens/my_app/my_app.dart',
      content: [`import 'package:${app}/general_exports.dart';`, '', '// Root widget: Get.put cross-screen singletons here (myAppController, ...).', 'class MyApp extends StatelessWidget {', '  const MyApp({super.key});', '', '  @override', '  Widget build(BuildContext context) {', '    // FL-2: ScreenUtilInit + GetMaterialApp.', '    return const SizedBox.shrink();', '  }', '}', ''].join('\n'),
    },
  ];
}

// main.dart entrypoint.
function mainFile(config) {
  const app = config.appName;
  return {
    path: 'lib/main.dart',
    content: [`import 'package:${app}/general_exports.dart';`, '', 'void main() {', '  // FL-2: SmartDialog init, bindings, runApp(...).', '  runApp(const SizedBox.shrink());', '}', ''].join('\n'),
  };
}

module.exports = { screenFiles, navFiles, mainFile };
