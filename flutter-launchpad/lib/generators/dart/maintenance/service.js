'use strict';

// maintenance_service.dart — the status source chosen by platform.maintenance:
// 'backend' (your API GET /settings, twina-shaped) or 'firebase' (Remote Config).

const { f } = require('../helpers');
const { statusModel } = require('./status-model');

function backendService(app, riverpod) {
  const call = riverpod
    ? `ApiRequest(className: 'MaintenanceService', path: ApiEndpoints.settings, shouldShowMessage: false)`
    : `ApiRequest(path: ApiEndpoints.settings, method: getMethod, className: 'MaintenanceService', shouldShowMessage: false)`;
  return `import 'dart:async';
import 'dart:io';

import 'package:package_info_plus/package_info_plus.dart';

import 'package:${app}/general_exports.dart';

${statusModel}

// Backend-driven gate — reads GET /settings (off_mode + force_update + announcement).
class MaintenanceService {
  MaintenanceService._();

  static Future<MaintenanceStatus> check() async {
    final Completer<MaintenanceStatus> completer = Completer<MaintenanceStatus>();
    await ${call}.request(
      onSuccess: (dynamic data, dynamic response) async =>
          completer.complete(await _parse((response as Map<String, dynamic>?) ?? <String, dynamic>{})),
      onError: (dynamic error) => completer.complete(const MaintenanceStatus()),
    );
    return completer.future;
  }

  static Future<MaintenanceStatus> _parse(Map<String, dynamic> data) async {
    final Map<String, dynamic> off = _node(data['off_mode']);
    final Map<String, dynamic> fu = _node(data['force_update']);
    final Map<String, dynamic> ann = _node(data['announcement']);
    final bool ios = Platform.isIOS;
    final String latest = '\${(ios ? fu['ios_version_number'] : fu['android_version_number']) ?? ''}';
    final String min = '\${(ios ? fu['ios_min_version'] : fu['android_min_version']) ?? latest}';
    final PackageInfo info = await PackageInfo.fromPlatform();
    final bool belowMin = min.isNotEmpty && isOutdated(info.version, min);
    final bool belowLatest = latest.isNotEmpty && isOutdated(info.version, latest);
    return MaintenanceStatus(
      isDown: off['is_off'] == true,
      message: off['message'] as String?,
      imageUrl: (off['image'] ?? fu['image']) as String?,
      contactEmail: off['contact_email'] as String?,
      forceUpdate: belowMin || (belowLatest && fu['is_required'] == true),
      updateAvailable: belowLatest,
      latestVersion: latest.isEmpty ? null : latest,
      storeUrl: (ios ? fu['ios_url'] : fu['android_url']) as String?,
      updateMessage: fu['message'] as String?,
      announcementId: ann['id'] as String?,
      announcementMessage: ann['message'] as String?,
      announcementUrl: ann['action_url'] as String?,
    );
  }

  // twina nests the mobile block under 'mobile'; fall back to the node itself.
  static Map<String, dynamic> _node(dynamic node) {
    if (node is! Map) return <String, dynamic>{};
    final dynamic mobile = node['mobile'];
    return (mobile is Map ? mobile : node).cast<String, dynamic>();
  }
}
`;
}

function firebaseService(app) {
  return `import 'dart:io';

import 'package:firebase_remote_config/firebase_remote_config.dart';
import 'package:package_info_plus/package_info_plus.dart';

import 'package:${app}/general_exports.dart';

${statusModel}

// Firebase Remote Config gate — flip flags in the console, no backend needed.
class MaintenanceService {
  MaintenanceService._();

  static String? _s(String v) => v.isEmpty ? null : v;

  static Future<MaintenanceStatus> check() async {
    try {
      final FirebaseRemoteConfig rc = FirebaseRemoteConfig.instance;
      await rc.fetchAndActivate();
      final bool ios = Platform.isIOS;
      final String min = rc.getString('min_version');
      final String latest = rc.getString('latest_version');
      final PackageInfo info = await PackageInfo.fromPlatform();
      final bool belowMin = min.isNotEmpty && isOutdated(info.version, min);
      final bool belowLatest = latest.isNotEmpty && isOutdated(info.version, latest);
      return MaintenanceStatus(
        isDown: rc.getBool('maintenance_mode'),
        message: _s(rc.getString('maintenance_message')),
        imageUrl: _s(rc.getString('maintenance_image')),
        contactEmail: _s(rc.getString('contact_email')),
        forceUpdate: belowMin || (belowLatest && rc.getBool('force_update')),
        updateAvailable: belowLatest,
        latestVersion: _s(latest),
        storeUrl: _s(ios ? rc.getString('ios_store_url') : rc.getString('android_store_url')),
        updateMessage: _s(rc.getString('update_message')),
        announcementId: _s(rc.getString('announcement_id')),
        announcementMessage: _s(rc.getString('announcement_message')),
        announcementUrl: _s(rc.getString('announcement_url')),
      );
    } catch (e) {
      consoleLog('maintenance check failed: \$e', key: 'maintenance');
      return const MaintenanceStatus();
    }
  }
}
`;
}

// maintenanceServiceFile — lib/services/maintenance_service.dart (null when off).
function maintenanceServiceFile(app, config) {
  if (config.platform.maintenance === 'none') return null;
  const riverpod = config.mode === 'structured-riverpod';
  const body = config.platform.maintenance === 'firebase' ? firebaseService(app) : backendService(app, riverpod);
  return f('lib/services/maintenance_service.dart', body);
}

module.exports = { maintenanceServiceFile };
