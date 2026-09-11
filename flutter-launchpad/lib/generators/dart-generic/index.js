'use strict';

// GENERIC-mode capability layer. Plain Flutter idiom (ChangeNotifier/ValueNotifier,
// no GetX/Riverpod, no general_exports barrel, no flutter_screenutil). Every toggle
// emits a real buildable file; root wiring (app.dart) is left to the developer.

const { f } = require('./helpers');
const { logger, navigatorKey, appKeys, localStorage, fileLogger } = require('./utils');
const { transitions, localeController, appAssets, arbFor } = require('./utils-extra');
const { appColors, appTheme, themeController } = require('./theme');
const { apiEndpoints, apiClient } = require('./api');
const { connectivityService, deepLinkService, locationService, addressService, secureStorage, linkService } = require('./services-core');
const { notificationService, pushNotificationService } = require('./notifications');
const { firebaseService, firebaseOptions } = require('./firebase');
const { maintenanceServiceGeneric } = require('./maintenance-service');
const { maintenanceScreensGeneric } = require('./maintenance-screens');
const { maintenanceGateGeneric } = require('./maintenance-gate');
const { permissionService } = require('./permission');
const { appButton, appTextField, bottomSheet, datePicker, imagePicker } = require('./widgets-core');
const { fileDownload, pdfViewer, shareService, keyboardDismiss, refresher } = require('./widgets-extra');
const { shimmer, paginatedList, mapView } = require('./widgets-list');

const { generalConstants, flavorEntryFiles, nativeFlavorFiles } = require('../dart/flavors');
const { firebaseFiles } = require('../dart/firebase-files');
const { envFiles } = require('../dart/env');
const { deeplinkFiles } = require('../dart/deeplink');
const { uiKitComponents, validatorsFile, designTokenFiles } = require('../dart/uikit');
const { testingFiles, observabilityFiles, securityFiles } = require('../dart/pro');
const { navShellFiles, consentFiles } = require('../dart/navconsent');
const { appInfoFile, signingFiles } = require('../dart/appinfo');

// ── composer ─────────────────────────────────────────────────────────────
function genericCapabilities(config) {
  const app = config.appName;
  const dark = config.themes.includes('dark');
  const i18n = config.localization !== 'none';
  const push = config.notifications.includes('push');
  const local = config.notifications.includes('local');
  const rich = config.notifications.includes('rich');
  const needStorage = dark || i18n || push || config.platform.maintenance !== 'none';
  const fileLog = config.logging.includes('logger') || config.logging.includes('file');
  const anim = ['hero', 'page-transitions', 'animations'].some((k) => config.interactivity.includes(k));
  const out = [];

  // Foundational (always).
  out.push(f('lib/utils/logger.dart', logger(app, fileLog)));
  out.push(f('lib/utils/navigator_key.dart', navigatorKey()));
  out.push(f('lib/theme/app_colors.dart', appColors(config.identity.brandColor)));
  out.push(f('lib/theme/app_theme.dart', appTheme(app, dark)));
  out.push(f('lib/constants/app_assets.dart', appAssets()));
  out.push(appInfoFile(config));
  out.push(...signingFiles(config));
  out.push(f('lib/api/api_endpoints.dart', apiEndpoints(app, config)));
  out.push(apiClient(app, config.apiClient));
  out.push(f('lib/widgets/app_button.dart', appButton(config.platform.sfx)));
  out.push(f('lib/widgets/app_text_field.dart', appTextField()));

  if (needStorage) {
    out.push(f('lib/utils/app_keys.dart', appKeys()));
    out.push(f('lib/utils/local_storage.dart', localStorage(app)));
  }
  if (dark) out.push(f('lib/theme/theme_controller.dart', themeController(app)));
  if (anim) out.push(f('lib/utils/transitions.dart', transitions()));
  if (fileLog) out.push(f('lib/utils/helper/file_logger.dart', fileLogger(config.logging.includes('logger'))));
  out.push(...envFiles(app, config));
  out.push(...uiKitComponents(app, config));
  const validators = validatorsFile(app, config);
  if (validators) out.push(validators);
  out.push(...designTokenFiles(config));
  out.push(...testingFiles(config));
  out.push(...observabilityFiles(app, config));
  out.push(...securityFiles(app, config));
  out.push(...navShellFiles(app, config));
  out.push(...consentFiles(app, config));

  // i18n
  if (i18n) {
    const locales = config.identity.supportedLocales.length ? config.identity.supportedLocales : ['en'];
    const template = locales.includes('en') ? 'en' : locales[0];
    out.push(f('lib/utils/locale_controller.dart', localeController(app, locales)));
    out.push(f('lib/utils/l10n.dart', `import 'package:${app}/l10n/app_localizations.dart';
import 'package:${app}/utils/navigator_key.dart';

// Global l10n accessor — reference any string anywhere (l10n.welcome), no context.
AppLocalizations get l10n => AppLocalizations.of(navigatorKey.currentContext!)!;
`));
    for (const l of locales) out.push(f(`lib/l10n/app_${l}.arb`, arbFor(l)));
    out.push(f('l10n.yaml', `arb-dir: lib/l10n\ntemplate-arb-file: app_${template}.arb\noutput-localization-file: app_localizations.dart\noutput-class: AppLocalizations\n`));
  }

  // services
  if (config.connectivity.length) out.push(f('lib/services/connectivity_service.dart', connectivityService()));
  if (local) out.push(f('lib/services/notification_service.dart', notificationService(app, rich, config.flavors.length > 0)));
  if (push) out.push(f('lib/services/push_notification_service.dart', pushNotificationService(app, local, rich)));
  if (config.notifications.includes('deeplink')) {
    out.push(f('lib/services/deep_link_service.dart', deepLinkService(app, config)));
    out.push(...deeplinkFiles(config));
  }
  if (config.firebase.length) {
    out.push(f('lib/firebase_options.dart', firebaseOptions(app, config.orgId)));
    if (config.firebase.includes('analytics') || config.firebase.includes('crashlytics')) {
      out.push(f('lib/services/firebase_service.dart', firebaseService(app, config)));
    }
    out.push(...firebaseFiles(app, config));
  }
  if (config.maps.includes('geolocator')) out.push(f('lib/services/location_service.dart', locationService(app)));
  if (config.maps.includes('geocoding')) out.push(f('lib/services/address_service.dart', addressService()));
  if (config.maps.includes('google_maps')) out.push(f('lib/widgets/map_view.dart', mapView()));
  if (config.security.includes('secure_storage')) out.push(f('lib/services/secure_storage.dart', secureStorage()));
  if (config.platform.urlLauncher) out.push(f('lib/services/link_service.dart', linkService(app)));
  if (config.platform.maintenance !== 'none') {
    out.push(f('lib/services/maintenance_service.dart', maintenanceServiceGeneric(app, config)));
    out.push(f('lib/widgets/maintenance_screens.dart', maintenanceScreensGeneric(app)));
    out.push(f('lib/widgets/maintenance_gate.dart', maintenanceGateGeneric(app)));
  }
  if (config.permissions.length || config.consent) {
    const p = permissionService(config.consent ? { ...config, permissions: [...config.permissions, 'appTrackingTransparency'] } : config);
    out.push(f('lib/services/permission_service.dart', p.service));
    if (p.android) out.push(f('platform/AndroidManifest.permissions.xml', p.android));
    if (p.plist) out.push(f('platform/Info.permissions.plist', p.plist));
  }

  // widgets (gated by components / interactivity / platform.keyboard)
  const c = config.components;
  if (c.includes('bottom_sheet')) out.push(f('lib/widgets/app_bottom_sheet.dart', bottomSheet()));
  if (c.includes('date_picker')) out.push(f('lib/widgets/app_date_picker.dart', datePicker()));
  if (c.includes('image_attach')) out.push(f('lib/widgets/app_image_picker.dart', imagePicker()));
  if (c.includes('file_download')) out.push(f('lib/widgets/app_file_download.dart', fileDownload(app)));
  if (c.includes('pdf')) out.push(f('lib/widgets/app_pdf_viewer.dart', pdfViewer()));
  if (c.includes('share')) out.push(f('lib/widgets/app_share.dart', shareService()));
  if (config.platform.keyboard) out.push(f('lib/widgets/keyboard_dismiss.dart', keyboardDismiss()));
  if (config.interactivity.includes('shimmer')) out.push(f('lib/widgets/app_shimmer.dart', shimmer()));
  if (config.interactivity.includes('pull-refresh')) out.push(f('lib/widgets/app_refresher.dart', refresher()));
  if (config.interactivity.includes('infinite-scroll')) out.push(f('lib/widgets/paginated_list_view.dart', paginatedList()));

  // flavors
  if (config.flavors.length) {
    out.push(f('lib/constants/general_constants.dart', generalConstants(config.flavors, config.nativeFlavors)));
    if (config.nativeFlavors) {
      out.push(...flavorEntryFiles(app, config.flavors, 'constants/general_constants.dart'));
      out.push(...nativeFlavorFiles(app, config.flavors));
    }
  }

  return out;
}

module.exports = { genericCapabilities };
