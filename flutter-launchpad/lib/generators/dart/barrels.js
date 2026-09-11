'use strict';

const { f } = require('./helpers');

// constants/app_assets.dart — typed asset-path constants (never inline paths).
function appAssets() {
  return `// Asset path constants — reference bundled assets ONLY via AppAssets.
class AppAssets {
  AppAssets._();

  static const String _images = 'assets/images';
  static const String _svg = 'assets/svg';

  static const String logo = '\$_images/logo.png';
  static const String placeholder = '\$_images/placeholder.png';
  static const String iconHome = '\$_svg/home.svg';
}
`;
}

// Re-emitted subtree barrels (overlay structure's static ones) so newly added
// theme/utils/constants files are exported from the single general_exports tree.
function subtreeBarrels(config) {
  const riverpod = config.mode === 'structured-riverpod';
  const i18n = config.localization !== 'none';
  const dark = config.themes.includes('dark');
  const fileLogger = config.logging.includes('logger') || config.logging.includes('file');
  const anim = ['hero', 'page-transitions', 'animations'].some((k) => config.interactivity.includes(k));

  const tokens = config.components.includes('state_widgets') || config.components.includes('switchers');
  const themeExports = [
    'app_colors.dart',
    'app_theme.dart',
    ...(dark ? ['theme_controller.dart'] : []),
    ...(tokens ? ['app_spacing.dart', 'app_text_styles.dart'] : []),
  ];
  const utilsExports = [
    'local_storage.dart',
    'helper/log.dart',
    'helper/global_functions.dart',
    ...(fileLogger ? ['helper/file_logger.dart'] : []),
    ...(anim ? ['transitions.dart'] : []),
    ...(i18n ? ['locale_controller.dart'] : []),
    ...(i18n && riverpod ? ['l10n.dart'] : []),
    ...(i18n && !riverpod ? ['app_translations.dart'] : []),
    ...(config.env ? ['env.dart'] : []),
    ...(config.components.includes('form_validators') ? ['validators.dart'] : []),
  ];
  const barrel = (title, exports) =>
    f(`lib/${title}/index.dart`, [`// ${title} — subtree barrel. Add every new file here (structured single-barrel rule).`, ...exports.map((e) => `export '${e}';`), ''].join('\n'));
  const constantsExports = ['app_constants.dart', 'app_assets.dart', 'app_info.dart', ...(config.flavors.length ? ['general_constants.dart'] : [])];
  return [barrel('theme', themeExports), barrel('utils', utilsExports), barrel('constants', constantsExports)];
}

// ── barrels touched by the overlay ────────────────────────────────────────
function componentsBarrel(exports) {
  return f(
    'lib/components/index.dart',
    ['// components — subtree barrel. Add every new file here (structured single-barrel rule).', ...exports.map((e) => `export '${e}';`), ''].join('\n'),
  );
}

module.exports = { appAssets, subtreeBarrels, componentsBarrel };
