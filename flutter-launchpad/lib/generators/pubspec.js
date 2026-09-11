'use strict';
// pubspec.yaml from the resolved package lists. flutter_screenutil is added here
// (it's doc-level for sizing, but it must be a real dep to build).
const { resolvePackages } = require('../packages');

function pubspec(config, pkgs) {
  const { deps, dev } = pkgs || resolvePackages(config);
  const line = (name, version) => `  ${name}: ${version}`;
  const depLines = deps.map((p) => `${line(p.name, p.version)}  # ${p.tier}`);
  const devLines = dev.map((p) => `${line(p.name, p.version)}  # ${p.tier}`);

  const i18n = config.localization !== 'none';
  const genL10n = i18n && config.mode !== 'structured-getx'; // gen-l10n path (riverpod + generic use .arb)
  const l10nDep = i18n ? ['  flutter_localizations:', '    sdk: flutter'] : [];
  const id = config.identity;

  const iconCfg = config.assets.includes('launcher_icons')
    ? [
        '',
        'flutter_launcher_icons:',
        `  image_path: "${id.icon.path}"`,
        '  android: true',
        '  ios: true',
        `  min_sdk_android: ${id.minSdk}`,
        `  adaptive_icon_background: "${id.icon.adaptiveBackground}"`,
        ...(id.icon.foreground ? [`  adaptive_icon_foreground: "${id.icon.foreground}"`] : []),
        '  remove_alpha_ios: true',
      ]
    : [];
  const splashCfg = config.assets.includes('native_splash')
    ? [
        '',
        'flutter_native_splash:',
        `  color: "${id.splash.color}"`,
        `  image: ${id.splash.image}`,
        `  color_dark: "${id.splash.colorDark}"`,
        ...(id.splash.android12 ? ['  android_12:', `    color: "${id.splash.color}"`, `    image: ${id.splash.image}`] : []),
      ]
    : [];
  const fontsBlock =
    id.fonts.family && id.fonts.files.length
      ? ['  fonts:', `    - family: ${id.fonts.family}`, '      fonts:', ...id.fonts.files.map((f) => `        - asset: assets/fonts/${f}`)]
      : ['  # fonts:', '  #   - family: AppFont', '  #     fonts:', '  #       - asset: assets/fonts/AppFont-Regular.ttf'];

  return [
    `name: ${config.appName}`,
    `description: "${(id.description || `${config.appName} — scaffolded by Mobile DevTools Flutter Launchpad.`).replace(/"/g, "'")}"`,
    'publish_to: "none"',
    `version: ${id.version || '1.0.0+1'}`,
    '',
    'environment:',
    '  sdk: ">=3.4.0 <4.0.0"',
    '',
    'dependencies:',
    '  flutter:',
    '    sdk: flutter',
    ...l10nDep,
    '  cupertino_icons: ^1.0.8',
    '  flutter_screenutil: ^5.9.3  # sizing (390x844 canvas) — use .w/.h/.sp/.r',
    ...depLines,
    '',
    'dev_dependencies:',
    '  flutter_test:',
    '    sdk: flutter',
    ...(config.testing ? ['  integration_test:', '    sdk: flutter'] : []),
    '  flutter_lints: ^4.0.0',
    ...devLines,
    '',
    'flutter:',
    '  uses-material-design: true',
    ...(genL10n ? ['  generate: true  # runs flutter gen-l10n from l10n.yaml + lib/l10n/*.arb'] : []),
    '  assets:',
    '    - assets/images/',
    '    - assets/svg/',
    '    - assets/fonts/',
    '    - assets/icon/',
    '    - assets/splash/',
    ...(config.platform.sfx ? ['    - assets/sfx/'] : []),
    ...(config.env ? ['    - .env'] : []),
    ...fontsBlock,
    ...iconCfg,
    ...splashCfg,
    '',
  ].join('\n');
}

module.exports = { pubspec };
