'use strict';
// validateConfig — non-blocking advisories surfaced next to the blueprint. Not a
// schema check (parseConfig handles that); these are convention + store-review nudges.
function validateConfig(config) {
  const out = [];
  const warn = (message) => void out.push({ level: 'warn', message });
  const info = (message) => void out.push({ level: 'info', message });

  // State/navigation coherence.
  if (config.stateMgmt === 'getx' && config.navigation === 'go_router')
    warn('GetX + GoRouter: structured GetX apps navigate via named routes (routes_keys.dart), not GoRouter. Prefer named-routes, or switch to Riverpod.');
  if (config.stateMgmt === 'riverpod' && config.navigation === 'named-routes')
    warn('Riverpod + named routes: structured Riverpod apps use GoRouter + globalArguments. Prefer go_router.');
  if (config.mode === 'structured-getx' && config.stateMgmt !== 'getx')
    warn(`structured-getx mode expects GetX state, not "${config.stateMgmt}".`);
  if (config.mode === 'structured-riverpod' && config.stateMgmt !== 'riverpod')
    warn(`structured-riverpod mode expects Riverpod state, not "${config.stateMgmt}".`);

  // Store-review flags.
  if (config.permissions.includes('contacts'))
    warn('Contacts access triggers App Store / Play data-safety review — declare a clear purpose string.');
  if (config.permissions.includes('location') || config.maps.length)
    warn('Location is requested at runtime (never "always" unless justified) — background location gets extra Play/App Store review.');

  // Notifications without a delivery path.
  if (config.notifications.includes('push') && !config.firebase.includes('messaging'))
    warn('Push notifications need firebase_messaging — add "messaging" under Firebase.');
  if (config.firebase.includes('messaging') && !config.notifications.includes('push'))
    info('firebase_messaging is included but Push notifications are off — enable Push to show foreground notifications.');

  // Doc-only note.
  if (config.themes.includes('dynamic') || config.mode !== 'generic')
    info('Sizing note: flutter_screenutil (390×844 canvas, ScreenUtilInit in the root) — use .w/.h/.sp/.r, never raw px.');

  // Recaptcha needs a real client key at bring-up.
  if (config.security.includes('recaptcha'))
    info('reCAPTCHA Enterprise needs a site key configured at bring-up (see SETUP.md).');

  // New-capability nudges.
  if (config.notifications.includes('rich') && !config.notifications.includes('local'))
    warn('Rich notifications (image preview) render through the local plugin — enable Local notifications too.');
  if (config.notifications.includes('deeplink'))
    info('Deep links (app_links) need platform setup: Android intent-filters + iOS Associated Domains / custom URL scheme.');
  if (config.components.includes('pdf'))
    info('The PDF viewer uses Syncfusion — a (free community) license key is required for production.');
  if (config.mode === 'structured-riverpod' && config.localization !== 'none')
    info('Localization runs flutter gen-l10n (AppLocalizations) — run `flutter gen-l10n` (or `flutter pub get` with generate: true) before the first build.');
  if (config.nativeFlavors && config.flavors.length)
    info('Native flavors need manual gradle/iOS setup — see the generated FLAVORS.md. The compile-time `currentMode` convention alone does not.');
  if (config.nativeFlavors && !config.flavors.length)
    warn('Native flavors is on but no flavors are selected — pick dev/demo/prod or turn it off.');

  if (config.platform.maintenance === 'backend')
    info('Maintenance gate (backend): expose GET /settings returning off_mode + force_update (with android/ios_min_version + version_number + url) + announcement. See docs/features/maintenance.md.');
  if (config.platform.maintenance === 'firebase')
    info('Maintenance gate (firebase): set Remote Config keys maintenance_mode, min_version, latest_version, force_update, android/ios_store_url, announcement_message. firebase_remote_config is added automatically.');

  return out;
}

module.exports = { validateConfig };
