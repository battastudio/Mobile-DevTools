'use strict';

const { navigateBody } = require('../helpers');
const { deepLinkRoutesLiteral } = require('../deeplink');

// push_notification_service.dart — FCM setup, token cache, cold-start + tap deep
// links, and (with local notifications) foreground display.
function pushNotificationService(app, config) {
  const hasLocal = config.notifications.includes('local');
  const rich = config.notifications.includes('rich');
  const localImport = hasLocal ? `\nimport 'package:${app}/services/local_notification_service.dart';` : '';
  const foregroundHook = hasLocal ? '\n    FirebaseMessaging.onMessage.listen(_onForeground);' : '';
  const foregroundFn = hasLocal
    ? `

  // Foreground pushes don't auto-display on Android — surface them locally.
  static void _onForeground(RemoteMessage message) {
    final RemoteNotification? n = message.notification;
    if (n == null) return;
    LocalNotificationService.show(
      n.title ?? '',
      n.body ?? '',
      route: message.data['route'] as String?,${rich ? "\n      imageUrl: n.android?.imageUrl ?? message.data['image'] as String?," : ''}
    );
  }`
    : '';
  return `import 'package:firebase_messaging/firebase_messaging.dart';

import 'package:${app}/general_exports.dart';${localImport}

// Push handler — request permission, cache the FCM token, route deep-link taps
// (cold start + background), and display foreground messages${hasLocal ? ' locally' : ''}.
class PushNotificationService {
  PushNotificationService._();

  static Future<void> setup() async {
    final NotificationSettings settings =
        await FirebaseMessaging.instance.requestPermission();
    consoleLog(settings.authorizationStatus, key: 'push');
    final String? token = await FirebaseMessaging.instance.getToken();
    if (token != null) {
      await LocalStorage.write(AppKeys.token, token);
    }
    final RemoteMessage? initial =
        await FirebaseMessaging.instance.getInitialMessage();
    if (initial != null) {
      _onTap(initial);
    }
    FirebaseMessaging.onMessageOpenedApp.listen(_onTap);${foregroundHook}
  }

  static void _onTap(RemoteMessage message) =>
      _navigate(message.data['route'] as String?);

  static void _navigate(String? route) {
${navigateBody(config)}
  }${foregroundFn}
}
`;
}

// deep_link_service.dart — external / universal links via app_links. Routes the
// path portion of an incoming URI through the app router (same nav as pushes).
function deepLinkService(app, config) {
  return `import 'package:app_links/app_links.dart';

import 'package:${app}/general_exports.dart';

// Handles https:// universal links and myapp:// deep links. Call init() in main.
class DeepLinkService {
  DeepLinkService._();

  static final AppLinks _appLinks = AppLinks();

  // Incoming path -> in-app route. Falls back to the path itself.
  static final Map<String, String> _routes = ${deepLinkRoutesLiteral(config)};

  static Future<void> init() async {
    final Uri? initial = await _appLinks.getInitialLink();
    if (initial != null) {
      _handle(initial);
    }
    _appLinks.uriLinkStream.listen(_handle);
  }

  static void _handle(Uri uri) {
    final String path = uri.path.isEmpty ? '/' : uri.path;
    final String route = _routes[path] ?? path;
    consoleLog('deep-link \$path -> \$route', key: 'link');
    _navigate(route);
  }

  static void _navigate(String? route) {
${navigateBody(config)}
  }
}
`;
}

module.exports = { pushNotificationService, deepLinkService };
