'use strict';

// firebase_options.dart — flutterfire stub so the project compiles before the
// user runs `flutterfire configure` (which overwrites it with real values).
function firebaseOptions(app, org) {
  return `// GENERATED STUB — replace by running \`flutterfire configure\`
// (dart pub global activate flutterfire_cli). Placeholder values let the project
// compile; it will NOT reach a real Firebase project until you regenerate this.
import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

class DefaultFirebaseOptions {
  DefaultFirebaseOptions._();

  static FirebaseOptions get currentPlatform {
    if (kIsWeb) return _web;
    switch (defaultTargetPlatform) {
      case TargetPlatform.iOS:
        return _ios;
      default:
        return _android;
    }
  }

  static const FirebaseOptions _android = FirebaseOptions(
    apiKey: 'REPLACE_ME',
    appId: '1:000000000000:android:0000000000000000',
    messagingSenderId: '000000000000',
    projectId: 'replace-me',
  );
  static const FirebaseOptions _ios = FirebaseOptions(
    apiKey: 'REPLACE_ME',
    appId: '1:000000000000:ios:0000000000000000',
    messagingSenderId: '000000000000',
    projectId: 'replace-me',
    iosBundleId: '${org}.${app}',
  );
  static const FirebaseOptions _web = FirebaseOptions(
    apiKey: 'REPLACE_ME',
    appId: '1:000000000000:web:0000000000000000',
    messagingSenderId: '000000000000',
    projectId: 'replace-me',
  );
}
`;
}

function firebaseService(app, config) {
  const analytics = config.firebase.includes('analytics');
  const crashlytics = config.firebase.includes('crashlytics');
  const imports = [
    analytics ? "import 'package:firebase_analytics/firebase_analytics.dart';" : '',
    crashlytics ? "import 'package:firebase_crashlytics/firebase_crashlytics.dart';" : '',
    crashlytics ? "import 'package:flutter/foundation.dart';" : '',
    `import 'package:${app}/general_exports.dart';`,
  ]
    .filter(Boolean)
    .join('\n');
  const analyticsBody = analytics
    ? `
  static final FirebaseAnalytics analytics = FirebaseAnalytics.instance;

  static Future<void> logEvent(String name, {Map<String, Object>? params}) =>
      analytics.logEvent(name: name, parameters: params);
`
    : '';
  const crashBody = crashlytics
    ? `
  // Route Flutter + async errors into Crashlytics. Call from main().
  static void enableCrashlytics() {
    FlutterError.onError = FirebaseCrashlytics.instance.recordFlutterError;
    PlatformDispatcher.instance.onError = (Object e, StackTrace s) {
      FirebaseCrashlytics.instance.recordError(e, s, fatal: true);
      return true;
    };
  }
`
    : '';
  return `${imports}

// Firebase wrappers — call these instead of touching the SDKs directly.
class FirebaseService {
  FirebaseService._();
${analyticsBody}${crashBody}}
`;
}

module.exports = { firebaseOptions, firebaseService };
