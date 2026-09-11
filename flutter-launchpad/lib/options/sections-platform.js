'use strict';
// Platform/delivery config sections (platform → delivery → AI rules). Pure data.
// Permission + rule chip options are pulled from their own catalogs.

const { permissionOptions } = require('../permissions');
const { ruleOptions } = require('../rules');

const opt = (value, label) => ({ value, label: label != null ? label : value });

const platformSections = [
  {
    id: 'platform',
    title: 'Platform & capabilities',
    fields: [
      { type: 'chips', key: 'firebase', label: 'Firebase', opts: [opt('core'), opt('analytics'), opt('crashlytics'), opt('messaging'), opt('performance'), opt('remote_config')] },
      { type: 'chips', key: 'notifications', label: 'Notifications', opts: [opt('local', 'Local'), opt('push', 'Push (FCM)'), opt('deeplink', 'Deep links (app_links)'), opt('rich', 'Rich (image preview)')] },
      { type: 'chips', key: 'maps', label: 'Maps & location', opts: [opt('google_maps', 'Google Maps'), opt('geolocator'), opt('geocoding')] },
      { type: 'chips', key: 'security', label: 'Security', opts: [opt('secure_storage', 'Secure storage'), opt('recaptcha', 'reCAPTCHA Enterprise'), opt('cert_pinning', 'TLS certificate pinning')] },
      { type: 'chips', key: 'observability', label: 'Observability', opts: [opt('sentry', 'Sentry'), opt('error_boundary', 'Error boundary'), opt('token_refresh', 'Token refresh interceptor')] },
      { type: 'chips', key: 'permissions', label: 'Permissions', help: 'Modern permission_handler set (deprecated storage/calendar/mediaLibrary excluded). Emits a request method per permission + AndroidManifest/Info.plist snippets.', opts: permissionOptions },
      { type: 'switch', key: 'platform.urlLauncher', label: 'URL launcher' },
      { type: 'switch', key: 'platform.keyboard', label: 'Tap-to-dismiss keyboard' },
      { type: 'switch', key: 'platform.sfx', label: 'Sound effects & haptics' },
      { type: 'switch', key: 'env', label: 'Env / secrets (.env + dotenv)' },
      { type: 'switch', key: 'navShell', label: 'Bottom-nav shell + auth guard' },
      { type: 'switch', key: 'consent', label: 'GDPR consent + iOS ATT' },
      {
        type: 'seg',
        key: 'platform.maintenance',
        label: 'Maintenance / force-update gate',
        help: 'A root gate that can block the app for maintenance or a required update (with soft-update prompt + announcement banner). Pick where the flags come from.',
        opts: [opt('none', 'Off'), opt('backend', 'Backend (your API)'), opt('firebase', 'Firebase Remote Config')],
      },
    ],
  },
  {
    id: 'delivery',
    title: 'Delivery & quality',
    fields: [
      { type: 'chips', key: 'logging', label: 'Logging', help: '`file` also writes every consoleLog to an on-device log file (app documents dir).', opts: [opt('consoleLog', 'consoleLog (structured)'), opt('file', 'Write logs to file'), opt('logger'), opt('pretty_dio_logger')] },
      { type: 'chips', key: 'assets', label: 'Asset tooling', opts: [opt('launcher_icons', 'Launcher icons'), opt('native_splash', 'Native splash'), opt('svg'), opt('images')] },
      {
        type: 'chips',
        key: 'flavors',
        label: 'Build flavors',
        help: 'The structured convention: a compile-time `AppMode` in general_constants.dart + a per-mode API base URL. Switch env by editing `currentMode` (no native flavors). Turn on "Native flavors" below for real gradle/iOS variants. Add your own with the + input.',
        opts: [opt('dev'), opt('demo'), opt('prod')],
        custom: true,
      },
      {
        type: 'switch',
        key: 'nativeFlavors',
        label: 'Native flavors (gradle + entry points)',
        help: 'Also emit real native flavors: android productFlavors, per-flavor entry points (lib/main_<flavor>.dart), `flutter run --flavor`, and a FLAVORS.md with iOS + per-flavor Firebase/icon steps.',
      },
      { type: 'switch', key: 'testing', label: 'Test scaffold (mocktail + per-feature tests)' },
    ],
  },
  {
    id: 'ai-rules',
    title: 'AI rules (CLAUDE.md / AGENTS.md)',
    note: 'Rules the coding agent MUST follow, injected into CLAUDE.md + AGENTS.md. Add your own below.',
    fields: [{ type: 'chips', key: 'rules', label: 'Rule presets', opts: ruleOptions }],
  },
];

module.exports = { platformSections };
