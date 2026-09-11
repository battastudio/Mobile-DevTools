'use strict';

// dartFiles — the REAL reference-Dart bodies that OVERLAY the thin structure
// skeletons (same paths win, see generate.js). Structured mode (getx/riverpod)
// emits the full wired app; generic mode delegates to the plain-Flutter layer.
// Every generated Dart file stays under the 150-line house rule.

const { f } = require('./helpers');
const { isStructured } = require('../../schema');
const { modelFiles } = require('./models');
const { proBaseFiles } = require('./probase');
const { genericCapabilities } = require('../dart-generic');
const { apiRequestGetx } = require('./api-request-getx');
const { apiRequestRiverpod } = require('./api-request-riverpod');
const { appKeys, apiEndpoints, translationKeys } = require('./api-const');
const { appColors, appTheme, themeControllerGetx, themeControllerRiverpod } = require('./theme');
const { appAssets, subtreeBarrels } = require('./barrels');
const { appInfoFile, signingFiles } = require('./appinfo');
const { generalConstants, flavorEntryFiles, nativeFlavorFiles } = require('./flavors');
const { log, fileLoggerBody, globalFunctions } = require('./logging');
const { localStorageGetx, localStorageRiverpod } = require('./storage');
const { transitionsFile } = require('./interactivity');
const { validatorsFile, designTokenFiles } = require('./uikit');
const { testingFiles, observabilityFiles, securityFiles } = require('./pro');
const { navShellFiles, consentFiles } = require('./navconsent');
const { envFiles } = require('./env');
const { i18nFiles } = require('./i18n');
const { componentFiles } = require('./components');
const { featureGetx, featureRiverpod, featureTest } = require('./features');
const { rootGetx } = require('./root-getx');
const { rootRiverpod } = require('./root-riverpod');
const { gatedServices } = require('./services');

function dartFiles(config) {
  // Typed models + the ApiResponse/pagination/error envelope + the optional pro
  // base layer are architecture-agnostic — emitted in every mode.
  const shared = [...modelFiles(config), ...proBaseFiles(config)];
  // Generic mode: skeleton/architecture sample + models + proBase + the plain-Flutter
  // capability layer so every toggle is mirrored in the structure.
  if (!isStructured(config)) return [...shared, ...genericCapabilities(config)];

  const app = config.appName;
  const riverpod = config.mode === 'structured-riverpod';
  const feats = config.features.length > 0 ? config.features : ['home'];
  const fileLogger = config.logging.includes('logger') || config.logging.includes('file');
  const dark = config.themes.includes('dark');
  const hero = config.interactivity.includes('hero');
  const transitions = transitionsFile(app, config);
  const validators = validatorsFile(app, config);

  const out = [
    ...shared,
    // api/
    f('lib/api/api_request.dart', riverpod ? apiRequestRiverpod(app) : apiRequestGetx(app)),
    f('lib/api/app_keys.dart', appKeys()),
    f('lib/api/api_endpoints.dart', apiEndpoints(app, feats, config)),
    f('lib/api/translation_keys.dart', translationKeys()),
    // theme/
    f('lib/theme/app_colors.dart', appColors(config)),
    f('lib/theme/app_theme.dart', appTheme(app, config.themes)),
    ...(dark ? [f('lib/theme/theme_controller.dart', riverpod ? themeControllerRiverpod(app) : themeControllerGetx(app))] : []),
    // constants/
    f('lib/constants/app_assets.dart', appAssets()),
    appInfoFile(config),
    ...(config.flavors.length ? [f('lib/constants/general_constants.dart', generalConstants(config.flavors, config.nativeFlavors))] : []),
    // Android signing scaffold (opt-in)
    ...signingFiles(config),
    // utils/
    f('lib/utils/helper/log.dart', log(fileLogger)),
    f('lib/utils/helper/global_functions.dart', globalFunctions()),
    f('lib/utils/local_storage.dart', riverpod ? localStorageRiverpod() : localStorageGetx()),
    ...(fileLogger ? [f('lib/utils/helper/file_logger.dart', fileLoggerBody(app, config.logging.includes('logger')))] : []),
    ...(transitions ? [transitions] : []),
    // UX kit: validators (utils) + design tokens (theme)
    ...(validators ? [validators] : []),
    ...designTokenFiles(config),
    // testing depth + observability + security
    ...testingFiles(config),
    ...observabilityFiles(app, config),
    ...securityFiles(app, config),
    // nav shell + auth guard + consent/ATT
    ...navShellFiles(app, config),
    ...consentFiles(app, config),
    // env / secrets
    ...envFiles(app, config),
    // i18n (locale files + .arb/l10n.yaml for Riverpod gen-l10n)
    ...i18nFiles(app, config),
    // subtree barrels — re-emitted to export the new theme/utils/constants files
    ...subtreeBarrels(config),
    // components/
    ...componentFiles(app, config),
    // one real, wired feature (controller + screen) per feature
    ...feats.flatMap((feat) => (riverpod ? featureRiverpod(app, feat, hero) : featureGetx(app, feat, hero))),
    // root / navigation
    ...(riverpod ? rootRiverpod(app, config) : rootGetx(app, config)),
    // gated services
    ...gatedServices(app, config),
    // native flavors (opt-in): per-flavor entry points + paste-in gradle/iOS scaffolding
    ...(config.nativeFlavors && config.flavors.length
      ? [...flavorEntryFiles(app, config.flavors, 'general_exports.dart'), ...nativeFlavorFiles(app, config.flavors)]
      : []),
  ];

  // A unit test per feature (structured: one is not done without its test).
  if (config.testing) {
    for (const feat of feats) out.push(featureTest(app, feat, riverpod));
  }

  return out;
}

module.exports = { dartFiles };
