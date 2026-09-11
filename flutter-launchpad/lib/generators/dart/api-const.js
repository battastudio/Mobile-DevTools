'use strict';

const { baseUrlGetter } = require('./flavors');

// api/app_keys.dart, api/api_endpoints.dart, api/translation_keys.dart
function appKeys() {
  return `// JSON request/response + storage KEY constants. NEVER inline raw string keys.
class AppKeys {
  AppKeys._();

  static const String token = 'token';
  static const String userData = 'user_data';
  static const String language = 'language';
  static const String themeMode = 'theme_mode';
  static const String skippedVersion = 'skipped_version';
  static const String dismissedAnnouncement = 'dismissed_announcement';
  static const String consent = 'consent';
  static const String data = 'data';
  static const String message = 'message';
  static const String status = 'status';
  static const String id = 'id';
  static const String name = 'name';
  static const String email = 'email';
  static const String items = 'items';
}
`;
}

function apiEndpoints(app, features, config) {
  const paths = features
    .map((feat) => `  static const String ${feat} = '/${feat.replace(/_/g, '-')}';`)
    .join('\n');
  const flavored = config.flavors.length > 0;
  const header = flavored
    ? `// Endpoint path constants — never inline URL strings. [base] is chosen per flavor
// from currentMode (edit it in constants/general_constants.dart).
import 'package:${app}/general_exports.dart';

`
    : `// Endpoint path constants — never inline URL strings. Paths are joined onto [base].
`;
  const base = flavored
    ? baseUrlGetter(config.flavors, config.identity.baseUrlByFlavor)
    : `  static const String base = '${config.identity.baseUrl}';`;
  return `${header}class ApiEndpoints {
  ApiEndpoints._();

${base}
  static const String login = '/auth/login';
  static const String profile = '/profile';
  static const String settings = '/settings';
${paths}
}
`;
}

function translationKeys() {
  return `// i18n message keys resolved by translateByKey(<key>). NEVER inline UI strings.
class TranslationKeys {
  TranslationKeys._();

  static const String appTitle = 'app_title';
  static const String welcome = 'welcome';
  static const String retry = 'retry';
  static const String somethingWentWrong = 'something_went_wrong';
  static const String noConnection = 'no_connection';
  static const String fieldRequired = 'field_required';
  static const String invalidEmail = 'invalid_email';
  static const String invalidPhone = 'invalid_phone';
}
`;
}

module.exports = { appKeys, apiEndpoints, translationKeys };
