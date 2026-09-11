'use strict';

const { f } = require('./helpers');

// Build flavors — a compile-time `AppMode` constant in general_constants.dart
// (hand-edited to switch env), with the API base URL a ternary on `currentMode`.
// Optional native flavors add per-flavor entry points + paste-in gradle/iOS
// scaffolding. Shared by structured (index.js) and generic.

// Per-flavor URL: the flavor's own entry, else the conventional per-flavor pattern.
// (The single `baseUrl` is only the no-flavor default — see index/generic apiEndpoints.)
const url = (fl, byFlavor = {}) => `'${byFlavor[fl] || `https://${fl}.example.com/v1`}'`;

const prodOf = (flavors) => (flavors.includes('prod') ? 'prod' : flavors[flavors.length - 1]);

function modeTextExpr(flavors) {
  const nonProd = flavors.filter((fl) => fl !== 'prod');
  if (nonProd.length === 0) return "''";
  return `${nonProd.map((fl) => `currentMode == AppMode.${fl} ? '-${fl}'`).join(' : ')} : ''`;
}

// general_constants.dart — enum AppMode + currentMode + currentModeText + viewLog.
// default: `const currentMode` (edit by hand). native: mutable, set by the entry point.
function generalConstants(flavors, native) {
  const prod = prodOf(flavors);
  const header = `// App environment (structured convention). ${native
    ? 'Set by the flavor entry point (lib/main_<flavor>.dart) before runApp.'
    : 'Change [currentMode] by hand before a build to switch environment.'}
enum AppMode { ${flavors.join(', ')} }
`;
  if (native) {
    return `${header}
AppMode currentMode = AppMode.${flavors[0]};

// Suffix for the version string + storage-key namespacing (not the app label).
String get currentModeText => ${modeTextExpr(flavors)};

// Verbose logging off in production.
bool get viewLog => currentMode != AppMode.${prod};
`;
  }
  return `${header}
const AppMode currentMode = AppMode.${flavors[0]};

// Suffix for the version string + storage-key namespacing (not the app label).
const String currentModeText = ${modeTextExpr(flavors)};

// Verbose logging off in production.
const bool viewLog = currentMode != AppMode.${prod};
`;
}

// The `static String get base => <ternary on currentMode>;` line for ApiEndpoints.
// URLs come from identity.baseUrlByFlavor (per flavor) with identity.baseUrl fallback.
function baseUrlGetter(flavors, byFlavor = {}) {
  if (flavors.length === 1) return `  static String get base => ${url(flavors[0], byFlavor)};`;
  const head = flavors.slice(0, -1);
  const parts = head.map((fl, i) => `${i === 0 ? '      ' : '      : '}currentMode == AppMode.${fl} ? ${url(fl, byFlavor)}`);
  parts.push(`      : ${url(flavors[flavors.length - 1], byFlavor)}`);
  return `  static String get base =>\n${parts.join('\n')};`;
}

// Per-flavor entry points: lib/main_<flavor>.dart sets currentMode then runs the app.
// `modeImport` is where AppMode/currentMode live (general_exports for structured, the
// constants file for generic).
function flavorEntryFiles(app, flavors, modeImport) {
  return flavors.map((fl) =>
    f(`lib/main_${fl}.dart`, `import 'package:${app}/${modeImport}';
import 'package:${app}/main.dart' as app;

// Flavor entry point — run with: flutter run --flavor ${fl} -t lib/main_${fl}.dart
void main() {
  currentMode = AppMode.${fl};
  app.main();
}
`),
  );
}

// Paste-in native scaffolding (gradle snippet) + a step-by-step FLAVORS.md.
function nativeFlavorFiles(app, flavors) {
  const label = (fl) => (fl === 'prod' ? app : `${app} ${fl}`);
  const productFlavors = flavors
    .map((fl) => `  create("${fl}") {
    dimension = "env"${fl === 'prod' ? '' : `\n    applicationIdSuffix = ".${fl}"`}
    resValue("string", "app_name", "${label(fl)}")
  }`)
    .join('\n');
  const gradle = f('platform/flavors/android_flavors.gradle.kts', `// Paste inside android/app/build.gradle.kts -> android { } (Kotlin DSL).
flavorDimensions += "env"
productFlavors {
${productFlavors}
}
`);
  const md = f('FLAVORS.md', `# Build flavors — ${app}

Native flavors: ${flavors.join(', ')}. The Dart environment is still driven by \`currentMode\`
in \`lib/constants/general_constants.dart\`, which each \`lib/main_<flavor>.dart\` sets before runApp.

> Note: no current structured app ships native flavors — this is the opt-in upgrade. The default
> structured convention is just editing \`currentMode\` by hand.

## Android
1. Paste \`platform/flavors/android_flavors.gradle.kts\` into \`android/app/build.gradle.kts\` inside \`android { }\`.
2. Set the label to \`@string/app_name\` in \`android/app/src/main/AndroidManifest.xml\`.
3. Per-flavor Firebase: put each \`google-services.json\` under \`android/app/src/<flavor>/\`.

## iOS
1. Duplicate the Runner scheme per flavor and add matching build configs.
2. Add a \`<Flavor>.xcconfig\` per config with \`PRODUCT_BUNDLE_IDENTIFIER\` + \`DISPLAY_NAME\`.
3. Per-flavor Firebase: add each \`GoogleService-Info.plist\` via a Run Script build phase keyed on the config.

## Icons & names
- Per-flavor icons via \`flutter_launcher_icons\` flavor config, or swap \`assets/icons/<flavor>/\`.

## Run / build
${flavors.map((fl) => `- ${fl}: \`flutter run --flavor ${fl} -t lib/main_${fl}.dart\``).join('\n')}
`);
  return [gradle, md];
}

module.exports = { generalConstants, baseUrlGetter, flavorEntryFiles, nativeFlavorFiles };
