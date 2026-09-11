'use strict';

const { deepLinkRoutesLiteral } = require('../dart/deeplink');

// ── services ───────────────────────────────────────────────────────────────
const connectivityService = () => `import 'package:connectivity_plus/connectivity_plus.dart';

// Reachability wrapper. onlineStream emits as the connection changes.
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

const deepLinkService = (app, config) => `import 'package:app_links/app_links.dart';

import 'package:${app}/utils/navigator_key.dart';

// https:// universal links + custom-scheme deep links. Call init() in main().
class DeepLinkService {
  DeepLinkService._();

  static final AppLinks _appLinks = AppLinks();

  // Incoming path -> in-app route. Falls back to the path itself.
  static final Map<String, String> _routes = ${deepLinkRoutesLiteral(config)};

  static Future<void> init() async {
    final Uri? initial = await _appLinks.getInitialLink();
    if (initial != null) _handle(initial);
    _appLinks.uriLinkStream.listen(_handle);
  }

  static void _handle(Uri uri) {
    final String path = uri.path.isEmpty ? '/' : uri.path;
    navigateTo(_routes[path] ?? path);
  }
}
`;

const locationService = (app) => `import 'package:geolocator/geolocator.dart';

import 'package:${app}/utils/navigator_key.dart';

// Device location via geolocator. Guards service + permission; returns null (and
// toasts) when denied — never throws up to the UI.
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
    if (permission == LocationPermission.denied || permission == LocationPermission.deniedForever) {
      showMessage('Location permission denied');
      return null;
    }
    return Geolocator.getCurrentPosition();
  }
}
`;

const addressService = () => `import 'package:geocoding/geocoding.dart';

// Reverse/forward geocoding. Returns null on lookup failure.
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
    } catch (_) {
      return null;
    }
  }

  static Future<Location?> addressToCoords(String address) async {
    try {
      final List<Location> hits = await locationFromAddress(address);
      return hits.isEmpty ? null : hits.first;
    } catch (_) {
      return null;
    }
  }
}
`;

const secureStorage = () => `import 'package:flutter_secure_storage/flutter_secure_storage.dart';

// Encrypted key/value store for tokens / PII.
class SecureStorage {
  SecureStorage._();

  static const FlutterSecureStorage _storage = FlutterSecureStorage();

  static Future<String?> read(String key) => _storage.read(key: key);
  static Future<void> write(String key, String value) => _storage.write(key: key, value: value);
  static Future<void> delete(String key) => _storage.delete(key: key);
}
`;

const linkService = (app) => `import 'package:url_launcher/url_launcher.dart';

import 'package:${app}/utils/navigator_key.dart';

// Open external URLs / dialer / mailto. Never call url_launcher directly.
class LinkService {
  LinkService._();

  static Future<void> open(String url) async {
    final Uri uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } else {
      showMessage('Cannot open \$url');
    }
  }
}
`;

module.exports = { connectivityService, deepLinkService, locationService, addressService, secureStorage, linkService };
