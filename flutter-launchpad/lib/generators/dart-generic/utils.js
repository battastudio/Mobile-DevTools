'use strict';

// ── utils ──────────────────────────────────────────────────────────────────
const logger = (app, fileLogger) => `import 'package:flutter/foundation.dart';
${fileLogger ? `\nimport 'package:${app}/utils/helper/file_logger.dart';\n` : ''}
// consoleLog — the single logging call. Debug prints;${fileLogger ? ' always appends to the on-device log file.' : ' release is a no-op.'}
void consoleLog(Object? value, {String key = 'log'}) {
  if (kDebugMode) debugPrint('[\$key] \$value');
${fileLogger ? '  FileLogger.write(value, key: key);\n' : ''}}
`;

const navigatorKey = () => `import 'package:flutter/material.dart';

// Global navigator key — wire it in: MaterialApp(navigatorKey: navigatorKey, ...).
// Lets services navigate + show snackbars without a BuildContext.
final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

void navigateTo(String route, {Object? arguments}) =>
    navigatorKey.currentState?.pushNamed(route, arguments: arguments);

void showMessage(String message) {
  final BuildContext? context = navigatorKey.currentContext;
  if (context == null) return;
  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
}
`;

const appKeys = () => `// Storage / JSON key constants — never inline raw string keys.
class AppKeys {
  AppKeys._();

  static const String token = 'token';
  static const String language = 'language';
  static const String themeMode = 'theme_mode';
  static const String skippedVersion = 'skipped_version';
  static const String dismissedAnnouncement = 'dismissed_announcement';
  static const String consent = 'consent';
}
`;

const localStorage = (app) => `import 'package:shared_preferences/shared_preferences.dart';

// Key/value storage (shared_preferences). Keys are ALWAYS AppKeys constants.
class LocalStorage {
  LocalStorage._();

  static Future<String?> read(String key) async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    return prefs.getString(key);
  }

  static Future<void> write(String key, String value) async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    await prefs.setString(key, value);
  }

  static Future<void> remove(String key) async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    await prefs.remove(key);
  }
}
`;

const fileLogger = (useLoggerPkg) => `import 'dart:io';

${useLoggerPkg ? "import 'package:logger/logger.dart';\n" : ''}import 'package:path_provider/path_provider.dart';

// Appends every log to an on-device file. Call init() once.
class FileLogger {
  FileLogger._();
${useLoggerPkg ? '\n  static final Logger _logger = Logger(printer: PrettyPrinter(methodCount: 0));' : ''}
  static File? _file;

  static Future<void> init() async {
    final Directory dir = await getApplicationDocumentsDirectory();
    _file = File('\${dir.path}/app.log');
  }

  static void write(Object? message, {String key = 'log'}) {${useLoggerPkg ? "\n    _logger.i('\$key: \$message');" : ''}
    _file?.writeAsStringSync(
      '\${DateTime.now().toIso8601String()} \$key: \$message\\n',
      mode: FileMode.append,
      flush: false,
    );
  }
}
`;

module.exports = { logger, navigatorKey, appKeys, localStorage, fileLogger };
