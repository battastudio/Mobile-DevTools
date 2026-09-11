'use strict';
const check = (on, text) => `- [${on ? 'x' : ' '}] ${text}`;

// SETUP.md — the bring-up checklist. Only surfaces steps the config actually needs
// (flavors, firebase, notifications, permissions manifest, maps).
function setup(config) {
  const lines = [
    `# Setup — ${config.appName}`,
    '',
    'Bring-up checklist. Work top to bottom; each item is only listed if the config needs it.',
    '',
    '## Base',
    check(true, '`flutter pub get`'),
    check(true, 'Enable the format+analyze pre-commit hook: `git config core.hooksPath .githooks`'),
    check(true, '`flutter analyze` clean, `flutter test` green'),
    check(true, `Set the app display name to "${config.identity.displayName || config.appName}" (Android \`android:label\`, iOS \`CFBundleDisplayName\`)`),
    check(true, `Android minSdk ${config.identity.minSdk}; platforms: ${config.identity.platforms.join(', ')}`),
    check(
      config.assets.includes('launcher_icons'),
      config.identity.icon.url
        ? `Icon: \`curl -L -o ${config.identity.icon.path} "${config.identity.icon.url}"\`, then \`dart run flutter_launcher_icons\``
        : `Place your icon at \`${config.identity.icon.path}\`, then \`dart run flutter_launcher_icons\``,
    ),
    check(
      config.assets.includes('native_splash'),
      config.identity.splash.imageUrl
        ? `Splash: \`curl -L -o ${config.identity.splash.image} "${config.identity.splash.imageUrl}"\`, then \`dart run flutter_native_splash:create\``
        : `Place your splash logo at \`${config.identity.splash.image}\`, then \`dart run flutter_native_splash:create\``,
    ),
    check(config.identity.autoColors, 'Colors: let the AI derive `adaptive_icon_background` + splash colors from the image (see the build prompt), or set them in pubspec.yaml'),
    check(config.identity.androidSigning, 'Signing: copy `android/key.properties.example` → `key.properties`; paste `platform/signing/*.snippet` into `android/app/build.gradle.kts`'),
    check(config.identity.fonts.family.length > 0, `Add font files to \`assets/fonts/\` for family "${config.identity.fonts.family}"`),
    '',
  ];

  if (config.localization !== 'none') {
    lines.push(
      '## Localization',
      ...(config.mode === 'structured-riverpod'
        ? [
            check(false, 'Run `flutter gen-l10n` (or `flutter pub get` — `generate: true` is set) to emit `AppLocalizations` from `lib/l10n/*.arb`'),
            check(false, 'Add strings to `lib/l10n/app_en.arb` + `app_ar.arb`, then re-run gen-l10n'),
          ]
        : [
            check(false, 'Add strings to `AppTranslations` (`lib/utils/app_translations.dart`); resolve with `TranslationKeys.x.tr`'),
          ]),
      '',
    );
  }

  if (config.flavors.length) {
    lines.push(
      '## Flavors',
      check(true, `Environments: ${config.flavors.join(', ')} — switch by editing \`currentMode\` in \`lib/constants/general_constants.dart\` (the structured convention)`),
      check(true, 'API base URL is chosen per `currentMode` in `lib/api/api_endpoints.dart`'),
      ...(config.nativeFlavors
        ? [
            check(false, 'Native flavors: follow `FLAVORS.md` — paste `platform/flavors/android_flavors.gradle.kts`, add iOS schemes, place per-flavor Firebase files'),
            ...config.flavors.map((fl) => check(false, `Run \`${fl}\`: \`flutter run --flavor ${fl} -t lib/main_${fl}.dart\``)),
          ]
        : []),
      '',
    );
  }
  if (config.firebase.length || config.notifications.includes('push')) {
    const perEnv = config.flavors.length
      ? [check(false, `Add per-flavor Firebase config for ${config.flavors.join(' / ')} (\`flutterfire configure\` once per flavor; place files under the flavor's source set / scheme)`)]
      : [check(false, 'Add `google-services.json` (Android) and `GoogleService-Info.plist` (iOS)')];
    lines.push(
      '## Firebase',
      check(false, 'See `FIREBASE.md` — rename the `*.example` config files to real ones, or run `flutterfire configure`'),
      check(false, 'Run `flutterfire configure` (adds `firebase_options.dart` + platform config files)'),
      ...perEnv,
      ...(config.firebase.includes('crashlytics') ? [check(false, 'Enable Crashlytics Gradle plugin')] : []),
      '',
    );
  }
  if (config.platform.maintenance === 'backend') {
    lines.push(
      '## Maintenance / force-update (backend)',
      check(false, 'Expose `GET /settings` returning `off_mode` (is_off/message/image/contact_email), `force_update` (android/ios_min_version + version_number + url, is_required, message) and `announcement`'),
      check(false, 'Set store URLs (`android_url`/`ios_url`) so the Update button opens the right store'),
      '',
    );
  }
  if (config.platform.maintenance === 'firebase') {
    lines.push(
      '## Maintenance / force-update (Firebase Remote Config)',
      check(false, 'Add RC keys: `maintenance_mode`, `maintenance_message`, `maintenance_image`, `contact_email`, `min_version`, `latest_version`, `force_update`, `android_store_url`, `ios_store_url`, `announcement_id`, `announcement_message`, `announcement_url`'),
      '',
    );
  }
  if (config.notifications.length) {
    lines.push(
      '## Notifications',
      ...(config.notifications.includes('local') ? [check(false, 'Initialize `flutter_local_notifications` + channel; iOS request authorization')] : []),
      ...(config.notifications.includes('push') ? [check(false, 'Wire FCM: iOS APNs key + background modes; Android POST_NOTIFICATIONS runtime prompt')] : []),
      ...(config.notifications.includes('deeplink') ? [check(false, 'Deep links: Android `<intent-filter>` (+ autoVerify) and iOS Associated Domains / custom URL scheme')] : []),
      ...(config.notifications.includes('rich') ? [check(false, 'Rich pushes: send `notification.android.image` / `data[\'image\']`; iOS needs a Notification Service Extension for images')] : []),
      '',
    );
  }
  if (config.permissions.length) {
    lines.push('## Permissions', check(false, 'Add the manifest / Info.plist snippets from `MANIFEST.md` for: ' + config.permissions.join(', ')), '');
  }
  if (config.maps.length) {
    lines.push(
      '## Maps & location',
      ...(config.maps.includes('google_maps') ? [check(false, 'Add the Google Maps API key (AndroidManifest meta-data + AppDelegate)')] : []),
      check(false, 'Add location usage strings + request permission at runtime (never "always" without justification)'),
      '',
    );
  }
  if (config.security.includes('recaptcha')) {
    lines.push('## Security', check(false, 'Configure reCAPTCHA Enterprise site key'), '');
  }

  return lines.join('\n');
}

module.exports = { setup };
