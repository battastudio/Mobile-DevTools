'use strict';
const Title = (s) => s.replace(/(^|[_-])(\w)/g, (_, sep, c) => (sep ? ' ' : '') + c.toUpperCase()).trim();

// Doc-per-feature (structured rule). One markdown stub per feature under
// docs/features/, plus the index.
function featureDocs(config) {
  const riverpod = config.mode === 'structured-riverpod';
  const stateNote = riverpod
    ? 'State: a raw `Notifier` + provider-in-file; mutate fields then `ref.notifyListeners()`.'
    : 'State: a `GetxController`; mutate fields then `update()`.';

  const files = config.features.map((feat) => ({
    path: `docs/features/${feat}.md`,
    content: [
      `# ${Title(feat)}`,
      '',
      '## Purpose',
      `_What ${feat} does and who uses it._`,
      '',
      '## Screens & controllers',
      `- \`lib/screens/${feat}/\` — screen, controller, barrel.`,
      `- ${stateNote}`,
      '',
      '## Networking',
      '- Endpoints: add to `ApiEndpoints`. Keys: add to `AppKeys`. Call via `ApiRequest`.',
      '',
      '## Tests',
      `- \`test/${feat}_controller_test.dart\` — construct the controller directly, assert field-bag transitions.`,
      '',
    ].join('\n'),
  }));

  // Cross-cutting capability docs — one per enabled subsystem.
  const cross = [
    {
      slug: 'theming',
      title: 'Theming',
      on: config.themes.includes('dark'),
      body: [
        'Material 3 light/dark themes seeded from `AppColors` (`lib/theme/app_theme.dart`).',
        'Runtime toggle + persistence via `ThemeController` (`lib/theme/theme_controller.dart`),',
        riverpod ? 'watched through `themeModeProvider`.' : 'applied via `Get.changeThemeMode`.',
        '',
        'Switch: `' + (riverpod ? 'ref.read(themeModeProvider.notifier).set(ThemeMode.dark)' : 'ThemeController.set(ThemeMode.dark)') + '`.',
      ],
    },
    {
      slug: 'i18n',
      title: 'Localization',
      on: config.localization !== 'none',
      body: riverpod
        ? [
            'Localization uses Flutter `gen-l10n`. Strings live in `lib/l10n/app_*.arb`; run',
            '`flutter gen-l10n` to (re)generate `AppLocalizations`. Locale is switched + persisted',
            'via `localeProvider` (`lib/utils/locale_controller.dart`).',
          ]
        : [
            'Localization uses GetX native translations. Strings live in `AppTranslations`',
            '(`lib/utils/app_translations.dart`), resolved with `TranslationKeys.welcome.tr`.',
            'Locale is switched + persisted via `LocaleController.setLocale(\'ar\')`. Ships en + ar (RTL).',
          ],
    },
    {
      slug: 'notifications',
      title: 'Notifications',
      on: config.notifications.length > 0,
      body: [
        `Enabled: ${config.notifications.join(', ')}.`,
        '- Local: `LocalNotificationService` (per-flavor channel' + (config.notifications.includes('rich') ? ', big-picture image' : '') + ').',
        '- Push (FCM): `PushNotificationService` — token cache, cold-start + tap deep links.',
        '- Tapping a notification navigates to `data[\'route\']`.',
      ],
    },
    {
      slug: 'maintenance',
      title: 'Maintenance & force-update',
      on: config.platform.maintenance !== 'none',
      body: [
        '`MaintenanceGate` wraps the app root and blocks the UI when `MaintenanceService.check()`',
        'reports maintenance (off mode) or a below-minimum version. It also shows a dismissible',
        '"update available" prompt (remind me later) and a non-blocking announcement banner.',
        '',
        config.platform.maintenance === 'firebase'
          ? 'Source: **Firebase Remote Config** — keys `maintenance_mode`, `maintenance_message`, `min_version`, `latest_version`, `force_update`, `android_store_url`, `ios_store_url`, `announcement_message`.'
          : 'Source: **your backend** — `GET /settings` returns `off_mode` (is_off/message/image/contact_email), `force_update` (android/ios_min_version + version_number + url, is_required, message) and `announcement`.',
      ],
    },
  ];
  for (const c of cross) {
    if (!c.on) continue;
    files.push({ path: `docs/features/${c.slug}.md`, content: [`# ${c.title}`, '', ...c.body, ''].join('\n') });
  }

  const crossLinks = cross.filter((c) => c.on).map((c) => `- [${c.title}](./${c.slug}.md)`);
  files.push({
    path: 'docs/features/index.md',
    content: [
      `# Features — ${config.appName}`,
      '',
      'One doc per feature. Keep them current — a feature is not done without its doc.',
      '',
      '## Features',
      ...config.features.map((f) => `- [${Title(f)}](./${f}.md)`),
      ...(crossLinks.length ? ['', '## Capabilities', ...crossLinks] : []),
      '',
    ].join('\n'),
  });
  return files;
}

module.exports = { featureDocs };
