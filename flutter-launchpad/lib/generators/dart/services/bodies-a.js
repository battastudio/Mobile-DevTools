'use strict';

// Inline Dart service bodies (secure storage, link launcher, location).
function secureStorage(app) {
  return `import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'package:${app}/general_exports.dart';

// Encrypted key/value store for tokens/PII. Keys are ALWAYS AppKeys constants.
class SecureStorage {
  SecureStorage._();

  static const FlutterSecureStorage _storage = FlutterSecureStorage();

  static Future<String?> read(String key) => _storage.read(key: key);

  static Future<void> write(String key, String value) =>
      _storage.write(key: key, value: value);

  static Future<void> delete(String key) => _storage.delete(key: key);
}
`;
}

function linkService(app) {
  return `import 'package:url_launcher/url_launcher.dart';

import 'package:${app}/general_exports.dart';

// Open external URLs / dialer / mailto. Never call url_launcher directly.
class LinkService {
  LinkService._();

  static Future<void> open(String url) async {
    final Uri uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } else {
      consoleLog('cannot launch \$url', key: 'link');
    }
  }
}
`;
}

function locationService(app) {
  return `import 'package:geolocator/geolocator.dart';

import 'package:${app}/general_exports.dart';

// Device location via geolocator. Guards service-enabled + permission before
// reading a position. Returns null (and toasts) when denied — never throws up.
class LocationService {
  LocationService._();

  static Future<Position?> current() async {
    if (!await Geolocator.isLocationServiceEnabled()) {
      showMessage('Location services are off');
      return null;
    }
    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      showMessage('Location permission denied');
      return null;
    }
    return Geolocator.getCurrentPosition();
  }
}
`;
}

module.exports = { secureStorage, linkService, locationService };
