'use strict';
// Structured feature-folder tree (GetX + Riverpod share this shape). Emits the
// folder structure + barrels + thin hand-rolled skeletons (the scaffolding a
// structured repo can't infer). The full reference Dart bodies land in dartFiles
// (see generate.js) — every skeleton here carries a `// FL-2:` marker.
const { barrel } = require('./helpers');
const { screenFiles, navFiles, mainFile } = require('./structured-screens');

function structuredStructure(config) {
  const app = config.appName;
  const riverpod = config.mode === 'structured-riverpod';
  const files = [];

  // general_exports.dart — the mega-barrel every file imports.
  const stateExport = riverpod
    ? "export 'package:flutter_riverpod/flutter_riverpod.dart';"
    : "export 'package:get/get.dart';";
  files.push({
    path: 'lib/general_exports.dart',
    content: [
      '// The single mega-barrel. Import ONLY this:',
      `//   import 'package:${app}/general_exports.dart';`,
      '// Re-exports Flutter, the state library, ScreenUtil, and every subtree index.dart.',
      "export 'package:flutter/material.dart';",
      stateExport,
      "export 'package:flutter_screenutil/flutter_screenutil.dart';",
      "export 'api/index.dart';",
      "export 'components/index.dart';",
      "export 'constants/index.dart';",
      "export 'screens/index.dart';",
      "export 'theme/index.dart';",
      "export 'utils/index.dart';",
      riverpod ? "export 'navigation/index.dart';" : '',
      '',
    ].filter((l) => l !== '' || false).join('\n') + '\n',
  });

  // api/ — hand-rolled, no codegen.
  files.push({ path: 'lib/api/index.dart', content: barrel('api', ['api_request.dart', 'api_endpoints.dart', 'app_keys.dart', 'translation_keys.dart']) });
  files.push({
    path: 'lib/api/api_request.dart',
    content: [
      "import 'package:dio/dio.dart';",
      '',
      '// The ONE HTTP wrapper. All networking goes through ApiRequest (inline Dio).',
      '// Auto-injects the bearer token + Accept-Language, logs the call, and shows',
      '// errors via showMessage unless shouldShowMessage:false. NO retrofit/codegen.',
      'class ApiRequest {',
      '  ApiRequest({required this.endPoint, this.data, this.shouldShowMessage = true});',
      '',
      '  final String endPoint;',
      '  final Map<String, dynamic>? data;',
      '  final bool shouldShowMessage;',
      '',
      '  // FL-2: full request() body (Dio instance, token/lang headers, onSuccess/onError).',
      '  Future<void> request({required Function onSuccess, Function? onError}) async {}',
      '}',
      '',
    ].join('\n'),
  });
  files.push({
    path: 'lib/api/api_endpoints.dart',
    content: ['// Endpoint path constants — never inline URL strings.', 'class ApiEndpoints {', "  static const String base = 'https://api.example.com';", '  // FL-2: real endpoints.', '}', ''].join('\n'),
  });
  files.push({
    path: 'lib/api/app_keys.dart',
    content: ['// JSON request/response + storage KEY constants. NEVER use raw string keys.', 'class AppKeys {', "  static const String token = 'token';", '  // FL-2: real keys.', '}', ''].join('\n'),
  });
  files.push({
    path: 'lib/api/translation_keys.dart',
    content: ['// i18n message keys used by translateByKey(<key>).', 'class TranslationKeys {', '  // FL-2: real keys.', '}', ''].join('\n'),
  });

  // theme / utils / constants / components barrels.
  files.push({ path: 'lib/theme/index.dart', content: barrel('theme', ['app_colors.dart', 'app_theme.dart']) });
  files.push({ path: 'lib/theme/app_colors.dart', content: ["import 'package:flutter/material.dart';", '', '// Palette — reference colors only via AppColors.', 'class AppColors {', '  // FL-2: real palette.', '}', ''].join('\n') });
  files.push({ path: 'lib/utils/index.dart', content: barrel('utils', ['local_storage.dart', 'helper/log.dart', 'helper/global_functions.dart']) });
  files.push({
    path: 'lib/utils/helper/log.dart',
    content: ['// consoleLog — the only logging call (avoid_print is enforced).', 'void consoleLog(Object? message) {', '  // FL-2: guarded debugPrint.', '}', ''].join('\n'),
  });
  files.push({
    path: 'lib/utils/helper/global_functions.dart',
    content: [
      "import 'package:flutter_smart_dialog/flutter_smart_dialog.dart';",
      '',
      '// Global side-effect free-functions (structured): startLoading / stopLoading / showMessage.',
      'void startLoading() => SmartDialog.showLoading();',
      'void stopLoading() => SmartDialog.dismiss();',
      'void showMessage(String message) => SmartDialog.showToast(message);',
      '',
    ].join('\n'),
  });
  files.push({
    path: 'lib/utils/local_storage.dart',
    content: [
      `// Key/value storage keyed by AppKeys constants (${riverpod ? 'shared_preferences' : 'get_storage'}).`,
      'class LocalStorage {',
      '  // FL-2: read/write wrappers.',
      '}',
      '',
    ].join('\n'),
  });
  files.push({ path: 'lib/constants/index.dart', content: barrel('constants', ['app_constants.dart']) });
  files.push({ path: 'lib/constants/app_constants.dart', content: ['// App-wide constants.', 'class AppConstants {', '  // FL-2.', '}', ''].join('\n') });
  files.push({ path: 'lib/components/index.dart', content: barrel('components', []) });

  return [...files, ...screenFiles(config), ...navFiles(config), mainFile(config)];
}

module.exports = { structuredStructure };
