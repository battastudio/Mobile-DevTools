'use strict';
// collectStacks — the mode base stacks + networking/data/UI capability packages.
// `dep`/`dv` are (name, tier) collectors. Split from collect.js for the line cap.
function collectStacks(config, dep, dv) {
  // ── Mode base sets (the structured stacks) ────────────────────────────
  if (config.mode === 'structured-getx') {
    for (const n of ['get', 'dio', 'get_storage', 'flutter_smart_dialog', 'intl']) dep(n, 'req');
  } else if (config.mode === 'structured-riverpod') {
    for (const n of ['flutter_riverpod', 'go_router', 'dio', 'shared_preferences', 'flutter_smart_dialog', 'flutter_localization']) dep(n, 'req');
    dv('custom_lint', 'req');
    dv('riverpod_lint', 'req');
  } else {
    // generic — driven purely by the explicit selections below
    dep('dio', 'rec');
    if (config.stateMgmt === 'getx') dep('get', 'req');
    if (config.stateMgmt === 'riverpod') dep('flutter_riverpod', 'req');
    if (config.stateMgmt === 'bloc') {
      dep('flutter_bloc', 'req');
      dep('bloc', 'req');
      dv('bloc_test', 'rec');
    }
    if (config.stateMgmt === 'provider') dep('provider', 'req');
  }

  // ── Navigation ────────────────────────────────────────────────────────
  if (config.navigation === 'go_router') dep('go_router', 'req');

  // ── API client ────────────────────────────────────────────────────────
  if (config.apiClient === 'dio' || config.apiClient === 'api_request') dep('dio', 'req');
  if (config.apiClient === 'http') dep('http', 'req');
  if (config.apiClient === 'retrofit') {
    dep('retrofit', 'req');
    dep('dio', 'req');
    dv('build_runner', 'req');
  }

  // ── Localization ──────────────────────────────────────────────────────
  if (config.localization === 'intl') dep('intl', 'rec');
  if (config.localization === 'flutter_localization') dep('flutter_localization', 'rec');

  // ── Generic-mode capability layer needs shared_preferences for its plain
  //    LocalStorage. Structured modes already have a storage package. ──────
  if (config.mode === 'generic') {
    const needStorage =
      config.themes.includes('dark') ||
      config.localization !== 'none' ||
      config.notifications.includes('push') ||
      config.platform.maintenance !== 'none';
    if (needStorage) dep('shared_preferences', 'rec');
  }

  // ── Connectivity ──────────────────────────────────────────────────────
  for (const n of config.connectivity) dep(n, 'rec');

  // ── Firebase (core is implied by any product) ─────────────────────────
  if (config.firebase.length) {
    dep('firebase_core', 'req');
    for (const fb of config.firebase) dep(`firebase_${fb}`, 'rec');
  }

  // ── Notifications ─────────────────────────────────────────────────────
  if (config.notifications.includes('local')) dep('flutter_local_notifications', 'rec');
  if (config.notifications.includes('push')) {
    dep('firebase_core', 'req');
    dep('firebase_messaging', 'rec');
  }
  if (config.notifications.includes('deeplink')) dep('app_links', 'rec');
  if (config.notifications.includes('rich')) {
    dep('flutter_local_notifications', 'rec');
    dep('path_provider', 'rec');
    dep('dio', 'req');
  }

  // ── Maps / location ───────────────────────────────────────────────────
  for (const m of config.maps) {
    if (m === 'google_maps') dep('google_maps_flutter', 'rec');
    else dep(m, 'rec'); // geolocator, geocoding
  }

  // ── Security ──────────────────────────────────────────────────────────
  if (config.security.includes('secure_storage')) dep('flutter_secure_storage', 'rec');
  if (config.security.includes('recaptcha')) dep('recaptcha_enterprise_flutter', 'opt');

  // ── UI components ─────────────────────────────────────────────────────
  for (const c of config.components) dep(c, 'rec'); // real pkg names
  if (config.components.includes('image_attach')) dep('image_picker', 'rec');
  if (config.components.includes('file_download')) {
    dep('path_provider', 'rec');
    dep('open_filex', 'rec');
    dep('dio', 'req');
  }
  if (config.components.includes('pdf')) dep('syncfusion_flutter_pdfviewer', 'opt');
  if (config.components.includes('share')) dep('share_plus', 'rec');
  if (config.themes.includes('dynamic')) dep('flex_color_scheme', 'opt');
}

module.exports = { collectStacks };
