'use strict';

const { navigateBody } = require('../helpers');

// local_notification_service.dart — init + show, with a per-flavor channel and
// (when rich is on) a downloaded big-picture image + tap deep-link payload.
function localNotificationService(app, config) {
  const rich = config.notifications.includes('rich');
  const flavors = config.flavors.length > 0;
  const richImports = rich
    ? `import 'dart:io';\n\nimport 'package:dio/dio.dart';\nimport 'package:path_provider/path_provider.dart';\n`
    : '';
  // Channel is namespaced per flavor via currentMode (from general_exports).
  const channelId = flavors ? "'channel_\${currentMode.name}'" : "'default'";
  const channelName = flavors ? "'Notifications (\${currentMode.name})'" : "'Notifications'";
  const bigPicture = rich
    ? `
  static Future<StyleInformation?> _bigPicture(String? imageUrl) async {
    if (imageUrl == null || imageUrl.isEmpty) return null;
    try {
      final Directory dir = await getTemporaryDirectory();
      final String path = '\${dir.path}/notif_\${DateTime.now().millisecondsSinceEpoch}.jpg';
      await Dio().download(imageUrl, path);
      return BigPictureStyleInformation(FilePathAndroidBitmap(path));
    } catch (e) {
      consoleLog('notif image failed: \$e', key: 'notif');
      return null;
    }
  }
`
    : '';
  const showSig = rich
    ? 'static Future<void> show(String title, String body, {String? route, String? imageUrl}) async {'
    : 'static Future<void> show(String title, String body, {String? route}) async {';
  const styleLine = rich ? '\n    final StyleInformation? style = await _bigPicture(imageUrl);' : '';
  const androidDetails = rich
    ? `AndroidNotificationDetails(
        ${channelId}, ${channelName},
        importance: Importance.max,
        priority: Priority.high,
        styleInformation: style,
      )`
    : `AndroidNotificationDetails(
        ${channelId}, ${channelName},
        importance: Importance.max,
        priority: Priority.high,
      )`;
  return `import 'package:flutter_local_notifications/flutter_local_notifications.dart';

${richImports}import 'package:${app}/general_exports.dart';

// Local notifications. Call init() once at startup, then show(...) to fire one.
// The channel is per build flavor; tapping a notification follows its route.
class LocalNotificationService {
  LocalNotificationService._();

  static final FlutterLocalNotificationsPlugin _plugin =
      FlutterLocalNotificationsPlugin();

  static Future<void> init() async {
    const AndroidInitializationSettings android =
        AndroidInitializationSettings('@mipmap/ic_launcher');
    const DarwinInitializationSettings ios = DarwinInitializationSettings();
    await _plugin.initialize(
      const InitializationSettings(android: android, iOS: ios),
      onDidReceiveNotificationResponse: (NotificationResponse r) =>
          _navigate(r.payload),
    );
  }

  ${showSig}${styleLine}
    final NotificationDetails details = NotificationDetails(
      android: ${androidDetails},
      iOS: const DarwinNotificationDetails(),
    );
    await _plugin.show(0, title, body, details, payload: route);
  }
${bigPicture}
  static void _navigate(String? route) {
${navigateBody(config)}
  }
}
`;
}

module.exports = { localNotificationService };
