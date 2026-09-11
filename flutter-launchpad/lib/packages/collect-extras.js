'use strict';
// collectExtras — the platform/delivery add-on packages (maintenance, env,
// logging, permissions, assets, codegen, pro base, testing). Split from collect.js.
function collectExtras(config, dep, dv) {
  // ── Maintenance / force-update gate ───────────────────────────────────
  if (config.platform.maintenance !== 'none') {
    dep('package_info_plus', 'rec');
    dep('url_launcher', 'rec');
    if (config.platform.maintenance === 'firebase') {
      dep('firebase_core', 'req');
      dep('firebase_remote_config', 'rec');
    } else {
      dep('dio', 'rec');
    }
  }

  // ── Env / observability / consent ─────────────────────────────────────
  if (config.env) dep('flutter_dotenv', 'rec');
  if (config.observability.includes('sentry')) dep('sentry_flutter', 'rec');
  if (config.consent) dep('permission_handler', 'rec');

  // ── Platform toggles ──────────────────────────────────────────────────
  if (config.platform.urlLauncher) dep('url_launcher', 'rec');
  if (config.platform.sfx) {
    dep('audioplayers', 'opt');
    dep('vibration', 'opt');
  }

  // ── Logging ───────────────────────────────────────────────────────────
  if (config.logging.includes('logger')) {
    dep('logger', 'opt');
    dep('path_provider', 'rec');
  }
  if (config.logging.includes('file')) dep('path_provider', 'rec');
  if (config.logging.includes('pretty_dio_logger')) dep('pretty_dio_logger', 'opt');

  // ── Permissions ───────────────────────────────────────────────────────
  if (config.permissions.length) dep('permission_handler', 'rec');
  if (config.permissions.includes('camera') || config.permissions.includes('photos')) dep('image_picker', 'opt');

  // ── Assets tooling (dev) ──────────────────────────────────────────────
  if (config.assets.includes('launcher_icons')) dv('flutter_launcher_icons', 'rec');
  if (config.assets.includes('native_splash')) dv('flutter_native_splash', 'rec');
  if (config.assets.includes('svg')) dep('flutter_svg', 'rec');

  // ── Models codegen (freezed) ──────────────────────────────────────────
  if (config.modelsCodegen === 'freezed' && config.models.length) {
    dep('freezed_annotation', 'req');
    dep('json_annotation', 'req');
    dv('freezed', 'req');
    dv('json_serializable', 'req');
    dv('build_runner', 'req');
  }

  // ── Professional base layer (clean architecture pulls it in too) ──────
  if (config.proBase || config.architecture === 'clean') {
    dep('get_it', 'req');
    dep('dio', 'req');
    dep('connectivity_plus', 'rec');
  }

  // ── Testing (dev) ─────────────────────────────────────────────────────
  if (config.testing) dv('mocktail', 'rec');
}

module.exports = { collectExtras };
