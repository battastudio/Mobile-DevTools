'use strict';

// Extra imports + pre-runApp() lines injected into main() for firebase/notifs.
// Both roots share this so the GetX and Riverpod entrypoints bootstrap alike.
function bootstrap(app, config) {
  const imports = [];
  const lines = [];
  if (config.env) {
    imports.push("import 'package:flutter_dotenv/flutter_dotenv.dart';");
    lines.push("  await dotenv.load(fileName: '.env');");
  }
  if (config.observability.includes('error_boundary')) {
    imports.push(`import 'package:${app}/components/error_boundary.dart';`);
    lines.push('  ErrorBoundary.install();');
  }
  if (config.observability.includes('sentry')) {
    imports.push(`import 'package:${app}/services/monitoring_service.dart';`);
    lines.push('  await MonitoringService.init();');
  }
  if (config.logging.includes('logger') || config.logging.includes('file')) {
    // FileLogger is re-exported by the utils barrel (already imported via general_exports).
    lines.push('  await FileLogger.init();');
  }
  if (config.firebase.length > 0) {
    imports.push("import 'package:firebase_core/firebase_core.dart';");
    imports.push(`import 'package:${app}/firebase_options.dart';`);
    lines.push('  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);');
    if (config.firebase.includes('crashlytics')) {
      imports.push(`import 'package:${app}/services/firebase_service.dart';`);
      lines.push('  FirebaseService.enableCrashlytics();');
    }
  }
  if (config.notifications.includes('push')) {
    imports.push(`import 'package:${app}/services/push_notification_service.dart';`);
    lines.push('  await PushNotificationService.setup();');
  }
  if (config.notifications.includes('local')) {
    imports.push(`import 'package:${app}/services/local_notification_service.dart';`);
    lines.push('  await LocalNotificationService.init();');
  }
  if (config.notifications.includes('deeplink')) {
    imports.push(`import 'package:${app}/services/deep_link_service.dart';`);
    lines.push('  await DeepLinkService.init();');
  }
  return { imports, lines };
}

module.exports = { bootstrap };
