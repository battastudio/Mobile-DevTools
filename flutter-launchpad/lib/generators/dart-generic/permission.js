'use strict';

const { buildPermissions } = require('../../permissions');

function permissionService(config) {
  const perms = buildPermissions(config.permissions);
  const service = `import 'package:permission_handler/permission_handler.dart';

// Runtime permission requests — one method per configured permission.
class PermissionService {
  PermissionService._();

${perms.methods}

  static Future<bool> _ensure(Permission permission) async {
    PermissionStatus status = await permission.status;
    if (status.isGranted) return true;
    status = await permission.request();
    if (status.isPermanentlyDenied) {
      await openAppSettings();
      return false;
    }
    return status.isGranted;
  }
}
`;
  return { service, android: perms.android, plist: perms.plist };
}

module.exports = { permissionService };
