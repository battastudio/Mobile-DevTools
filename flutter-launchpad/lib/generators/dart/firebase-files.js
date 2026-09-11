'use strict';

// Firebase config-FILE generator (distinct from firebase.js, which is init code):
// google-services.json / GoogleService-Info.plist placeholders + a FIREBASE.md
// checklist. `.example` suffix so real files (from `flutterfire configure`) are
// never clobbered and gradle isn't broken by a stub. Emitted when any Firebase
// product is selected.

const { f } = require('./helpers');

const googleServicesJson = (bundleId) =>
  JSON.stringify(
    {
      project_info: { project_number: '000000000000', project_id: 'REPLACE_ME' },
      client: [
        {
          client_info: { mobilesdk_app_id: '1:000000000000:android:0000000000000000', android_client_info: { package_name: bundleId } },
          api_key: [{ current_key: 'REPLACE_ME' }],
        },
      ],
      configuration_version: '1',
    },
    null,
    2,
  );

const googleServiceInfoPlist = (bundleId) => `<?xml version="1.0" encoding="UTF-8"?>
<!-- PLACEHOLDER — replace with the real file from \`flutterfire configure\` / Firebase console. -->
<plist version="1.0">
<dict>
  <key>API_KEY</key><string>REPLACE_ME</string>
  <key>BUNDLE_ID</key><string>${bundleId}</string>
  <key>PROJECT_ID</key><string>REPLACE_ME</string>
  <key>GCM_SENDER_ID</key><string>000000000000</string>
  <key>GOOGLE_APP_ID</key><string>1:000000000000:ios:0000000000000000</string>
  <key>IS_GCM_ENABLED</key><true/>
</dict>
</plist>
`;

function firebaseFiles(app, config) {
  if (!config.firebase.length) return [];
  const bundleId = `${config.orgId}.${app}`;
  const push = config.notifications.includes('push') || config.firebase.includes('messaging');
  const fc = config.firebaseConfig;
  // When the user pasted the real file contents, emit real files; else .example.
  const androidReal = fc.android.trim();
  const iosReal = fc.ios.trim();
  const out = [
    androidReal
      ? f('android/app/google-services.json', androidReal)
      : f('android/app/google-services.json.example', googleServicesJson(bundleId)),
    iosReal
      ? f('ios/Runner/GoogleService-Info.plist', iosReal)
      : f('ios/Runner/GoogleService-Info.plist.example', googleServiceInfoPlist(bundleId)),
  ];
  // Per-flavor Android config when native flavors are on (real if pasted).
  if (config.nativeFlavors && config.flavors.length) {
    for (const fl of config.flavors) {
      const real = (fc.androidPerFlavor[fl] ?? '').trim();
      out.push(
        real
          ? f(`android/app/src/${fl}/google-services.json`, real)
          : f(`android/app/src/${fl}/google-services.json.example`, googleServicesJson(`${bundleId}${fl === 'prod' ? '' : `.${fl}`}`)),
      );
    }
  }
  out.push(
    f('FIREBASE.md', `# Firebase setup — ${app}

Products: ${config.firebase.join(', ')}.

## Config files (rename \`.example\` → real, or regenerate)
- \`android/app/google-services.json\` (Android)
- \`ios/Runner/GoogleService-Info.plist\` (iOS)
- \`lib/firebase_options.dart\` — regenerate with \`flutterfire configure\` (overwrites the stub).

The fastest path: \`dart pub global activate flutterfire_cli && flutterfire configure\` — it writes
all three from your Firebase project. The \`.example\` files show the exact shape/location if you
prefer to paste them by hand.
${config.nativeFlavors && config.flavors.length
    ? `\n## Per-flavor (native flavors on)\nPlace each flavor's file under its source set:\n${config.flavors.map((fl) => `- \`android/app/src/${fl}/google-services.json\``).join('\n')}\niOS: add one \`GoogleService-Info.plist\` per scheme via a Run Script build phase keyed on the config.\n`
    : ''}${push
    ? `\n## Push (APNs) — needed for iOS FCM\n- Create an **APNs auth key** (\`.p8\`) in the Apple Developer portal (Keys → Apple Push Notifications service).\n- Upload it in Firebase console → Project settings → Cloud Messaging → APNs Authentication Key (Key ID + Team ID). Do NOT commit the \`.p8\`.\n- Enable Push Notifications + Background Modes (Remote notifications) capabilities in Xcode.\n`
    : ''}${config.firebase.includes('crashlytics') ? '\n## Crashlytics\n- Add the Crashlytics Gradle plugin (see SETUP.md).\n' : ''}`),
  );
  return out;
}

module.exports = { firebaseFiles };
