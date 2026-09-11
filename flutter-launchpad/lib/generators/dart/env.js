'use strict';

const { f } = require('./helpers');

// .env + flutter_dotenv wiring. `Env` reads secrets at runtime so keys aren't
// hardcoded. `.env` holds the (optionally pre-filled) real values; `env.example`
// is the committed template.

function envBody(config, real) {
  const s = config.setup;
  const v = (val) => (real ? val : '');
  const lines = [
    `BASE_URL=${real ? 'https://api.example.com/v1' : ''}`,
    ...(config.maps.length ? [`MAPS_API_KEY=${v(s.mapsApiKey)}`] : []),
    ...(config.observability.includes('sentry') ? [`SENTRY_DSN=${v(s.sentryDsn)}`] : []),
    ...(config.components.includes('pdf') ? [`SYNCFUSION_LICENSE=${v(s.syncfusionLicense)}`] : []),
    ...(config.security.includes('recaptcha') ? [`RECAPTCHA_SITE_KEY=${v(s.recaptchaSiteKey)}`] : []),
  ];
  return lines.join('\n') + '\n';
}

const envDart = (app) => `import 'package:flutter_dotenv/flutter_dotenv.dart';

// Env — typed access to .env values. Call \`await dotenv.load()\` in main() first.
class Env {
  Env._();

  static String _s(String k) => dotenv.env[k] ?? '';

  static String get baseUrl => _s('BASE_URL');
  static String get mapsApiKey => _s('MAPS_API_KEY');
  static String get sentryDsn => _s('SENTRY_DSN');
  static String get syncfusionLicense => _s('SYNCFUSION_LICENSE');
  static String get recaptchaSiteKey => _s('RECAPTCHA_SITE_KEY');
}
`;

// envFiles — the .env template + secrets util (when config.env).
function envFiles(app, config) {
  if (!config.env) return [];
  return [
    f('.env', envBody(config, true)),
    f('env.example', envBody(config, false)),
    f('lib/utils/env.dart', envDart(app)),
  ];
}

module.exports = { envFiles };
