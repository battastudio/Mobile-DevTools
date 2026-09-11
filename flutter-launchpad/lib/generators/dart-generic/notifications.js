'use strict';

function notificationService(app, rich, flavors) {
  const flavorImport = flavors ? `import 'package:${app}/constants/general_constants.dart';\n` : '';
  const chId = flavors ? "'channel_\${currentMode.name}'" : "'default'";
  const chName = flavors ? "'Notifications (\${currentMode.name})'" : "'Notifications'";
  const richImports = rich ? `import 'dart:io';\n\nimport 'package:dio/dio.dart';\nimport 'package:path_provider/path_provider.dart';\n` : '';
  const showSig = rich
    ? 'static Future<void> show(String title, String body, {String? route, String? imageUrl}) async {'
    : 'static Future<void> show(String title, String body, {String? route}) async {';
  const style = rich ? '\n    final StyleInformation? style = await _bigPicture(imageUrl);' : '';
  const android = rich
    ? `AndroidNotificationDetails(${chId}, ${chName},
          importance: Importance.max, priority: Priority.high, styleInformation: style)`
    : `AndroidNotificationDetails(${chId}, ${chName},
          importance: Importance.max, priority: Priority.high)`;
  const bigPicture = rich
    ? `
  static Future<StyleInformation?> _bigPicture(String? imageUrl) async {
    if (imageUrl == null || imageUrl.isEmpty) return null;
    try {
      final Directory dir = await getTemporaryDirectory();
      final String path = '\${dir.path}/notif_\${DateTime.now().millisecondsSinceEpoch}.jpg';
      await Dio().download(imageUrl, path);
      return BigPictureStyleInformation(FilePathAndroidBitmap(path));
    } catch (_) {
      return null;
    }
  }
`
    : '';
  return `import 'package:flutter_local_notifications/flutter_local_notifications.dart';

${richImports}${flavorImport}import 'package:${app}/utils/navigator_key.dart';

// Local notifications. Call init() once; tapping one follows its [route] payload.
class NotificationService {
  NotificationService._();

  static final FlutterLocalNotificationsPlugin _plugin = FlutterLocalNotificationsPlugin();

  static Future<void> init() async {
    const AndroidInitializationSettings android = AndroidInitializationSettings('@mipmap/ic_launcher');
    const DarwinInitializationSettings ios = DarwinInitializationSettings();
    await _plugin.initialize(
      const InitializationSettings(android: android, iOS: ios),
      onDidReceiveNotificationResponse: (NotificationResponse r) {
        if (r.payload != null) navigateTo(r.payload!);
      },
    );
  }

  ${showSig}${style}
    final NotificationDetails details = NotificationDetails(
      android: ${android},
      iOS: const DarwinNotificationDetails(),
    );
    await _plugin.show(0, title, body, details, payload: route);
  }
${bigPicture}}
`;
}

function pushNotificationService(app, hasLocal, rich) {
  const localImport = hasLocal ? `\nimport 'package:${app}/services/notification_service.dart';` : '';
  const fgHook = hasLocal ? '\n    FirebaseMessaging.onMessage.listen(_onForeground);' : '';
  const fgFn = hasLocal
    ? `

  static void _onForeground(RemoteMessage message) {
    final RemoteNotification? n = message.notification;
    if (n == null) return;
    NotificationService.show(
      n.title ?? '',
      n.body ?? '',
      route: message.data['route'] as String?,${rich ? "\n      imageUrl: n.android?.imageUrl ?? message.data['image'] as String?," : ''}
    );
  }`
    : '';
  return `import 'package:firebase_messaging/firebase_messaging.dart';

import 'package:${app}/utils/app_keys.dart';
import 'package:${app}/utils/local_storage.dart';
import 'package:${app}/utils/navigator_key.dart';${localImport}

// FCM handler — permission, token cache, cold-start + tap deep links${hasLocal ? ', foreground display' : ''}.
class PushNotificationService {
  PushNotificationService._();

  static Future<void> setup() async {
    await FirebaseMessaging.instance.requestPermission();
    final String? token = await FirebaseMessaging.instance.getToken();
    if (token != null) await LocalStorage.write(AppKeys.token, token);
    final RemoteMessage? initial = await FirebaseMessaging.instance.getInitialMessage();
    if (initial != null) _onTap(initial);
    FirebaseMessaging.onMessageOpenedApp.listen(_onTap);${fgHook}
  }

  static void _onTap(RemoteMessage message) {
    final String? route = message.data['route'] as String?;
    if (route != null && route.isNotEmpty) navigateTo(route);
  }${fgFn}
}
`;
}

module.exports = { notificationService, pushNotificationService };
