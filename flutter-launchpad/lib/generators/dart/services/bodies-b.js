'use strict';

// Inline Dart service bodies (geocoding, connectivity, permissions).
function addressService(app) {
  return `import 'package:geocoding/geocoding.dart';

import 'package:${app}/general_exports.dart';

// Reverse/forward geocoding. coordsToAddress turns lat/lng into a readable
// address; addressToCoords does the inverse. Returns null on lookup failure.
class AddressService {
  AddressService._();

  static Future<String?> coordsToAddress(double lat, double lng) async {
    try {
      final List<Placemark> marks = await placemarkFromCoordinates(lat, lng);
      if (marks.isEmpty) return null;
      final Placemark p = marks.first;
      return <String?>[p.street, p.locality, p.administrativeArea, p.country]
          .where((String? s) => s != null && s.isNotEmpty)
          .join(', ');
    } catch (e) {
      consoleLog('geocode failed: \$e', key: 'address');
      return null;
    }
  }

  static Future<Location?> addressToCoords(String address) async {
    try {
      final List<Location> hits = await locationFromAddress(address);
      return hits.isEmpty ? null : hits.first;
    } catch (e) {
      consoleLog('geocode failed: \$e', key: 'address');
      return null;
    }
  }
}
`;
}

function connectivityService(app) {
  return `import 'package:connectivity_plus/connectivity_plus.dart';

import 'package:${app}/general_exports.dart';

// Reachability wrapper. onlineStream emits true/false as the connection changes;
// isOnline is a one-shot check. Backed by connectivity_plus.
class ConnectivityService {
  ConnectivityService._();

  static Stream<bool> get onlineStream => Connectivity()
      .onConnectivityChanged
      .map((List<ConnectivityResult> r) => !r.contains(ConnectivityResult.none));

  static Future<bool> isOnline() async {
    final List<ConnectivityResult> r = await Connectivity().checkConnectivity();
    return !r.contains(ConnectivityResult.none);
  }
}
`;
}

function permissionService(perms) {
  return `import 'package:permission_handler/permission_handler.dart';

// Runtime permission requests — one method per configured permission. Each returns
// whether it ended up granted; opens app settings on permanent denial.
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
}

module.exports = { addressService, connectivityService, permissionService };
