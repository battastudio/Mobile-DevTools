'use strict';

const { f } = require('../helpers');
const { pushNotificationService, deepLinkService, localNotificationService } = require('../notifications');
const { deeplinkFiles } = require('../deeplink');
const { maintenanceServiceFile } = require('../maintenance');
const { firebaseOptions, firebaseService } = require('../firebase');
const { firebaseFiles } = require('../firebase-files');
const { buildPermissions } = require('../../../permissions');
const { secureStorage, linkService, locationService } = require('./bodies-a');
const { addressService, connectivityService, permissionService } = require('./bodies-b');

// ── optional gated services ───────────────────────────────────────────────
function gatedServices(app, config) {
  const out = [];
  const svc = (name, body) => {
    out.push(f(`lib/services/${name}.dart`, body));
  };

  // Flavors are handled by general_constants.dart (AppMode/currentMode) — see flavors.js.

  if (config.security.includes('flutter_secure_storage')) {
    svc('secure_storage', secureStorage(app));
  }
  if (config.platform.urlLauncher) {
    svc('link_service', linkService(app));
  }
  if (config.notifications.includes('push')) {
    svc('push_notification_service', pushNotificationService(app, config));
  }
  if (config.notifications.includes('deeplink')) {
    svc('deep_link_service', deepLinkService(app, config));
    out.push(...deeplinkFiles(config));
  }

  // Maps / location.
  if (config.maps.includes('geolocator')) {
    svc('location_service', locationService(app));
  }
  if (config.maps.includes('geocoding')) {
    svc('address_service', addressService(app));
  }

  // Connectivity.
  if (config.connectivity.length > 0) {
    svc('connectivity_service', connectivityService(app));
  }

  // Permissions — a concrete request method per selected permission, plus the
  // AndroidManifest + Info.plist snippets to paste in.
  if (config.permissions.length > 0 || config.consent) {
    const permKeys = config.consent ? [...config.permissions, 'appTrackingTransparency'] : config.permissions;
    const perms = buildPermissions(permKeys);
    if (perms.keys.length) {
      svc('permission_service', permissionService(perms));
      if (perms.android) out.push(f('platform/AndroidManifest.permissions.xml', perms.android));
      if (perms.plist) out.push(f('platform/Info.permissions.plist', perms.plist));
    }
  }

  // Local notifications.
  if (config.notifications.includes('local')) {
    svc('local_notification_service', localNotificationService(app, config));
  }

  // Maintenance / force-update service.
  const maintenanceSvc = maintenanceServiceFile(app, config);
  if (maintenanceSvc) out.push(maintenanceSvc);

  // Firebase bootstrap: options stub + optional analytics/crashlytics service.
  if (config.firebase.length > 0) {
    out.push(f('lib/firebase_options.dart', firebaseOptions(app, config.orgId)));
    if (config.firebase.includes('analytics') || config.firebase.includes('crashlytics')) {
      svc('firebase_service', firebaseService(app, config));
    }
    out.push(...firebaseFiles(app, config));
  }

  return out;
}

module.exports = { gatedServices };
