'use strict';

// utils/helper/log.dart, file_logger.dart, global_functions.dart
function log(fileLogger) {
  const importLine = fileLogger
    ? `import 'package:flutter/foundation.dart';\n\nimport 'file_logger.dart';`
    : `import 'package:flutter/foundation.dart';`;
  const fileWrite = fileLogger ? '\n  FileLogger.write(value, key: key);' : '';
  return `${importLine}

// consoleLog — the ONLY logging call (avoid_print is enforced house-wide).
// Debug prints;${fileLogger ? ' always appends to the on-device log file (debug + release).' : ' in release it is a no-op.'}
void consoleLog(Object? value, {String key = 'log'}) {
  if (kDebugMode) {
    debugPrint('📔 \$key: \$value');
  }${fileWrite}
}
`;
}

// utils/helper/file_logger.dart — appends every log to an on-device file. When the
// `logger` package is selected it also pretty-prints; otherwise it's dependency-free.
function fileLoggerBody(app, useLoggerPkg) {
  const loggerImport = useLoggerPkg ? "import 'package:logger/logger.dart';\n" : '';
  const loggerField = useLoggerPkg ? '\n  static final Logger _logger = Logger(printer: PrettyPrinter(methodCount: 0));' : '';
  const loggerCall = useLoggerPkg ? '\n    _logger.i(\'\$key: \$message\');' : '';
  return `import 'dart:io';

${loggerImport}import 'package:path_provider/path_provider.dart';

import 'package:${app}/general_exports.dart';

// FileLogger — call init() once in main(); consoleLog routes here when file logging is on.
class FileLogger {
  FileLogger._();
${loggerField}
  static File? _file;

  static Future<void> init() async {
    final Directory dir = await getApplicationDocumentsDirectory();
    _file = File('\${dir.path}/app.log');
  }

  static void write(Object? message, {String key = 'log'}) {${loggerCall}
    _file?.writeAsStringSync(
      '\${DateTime.now().toIso8601String()} \$key: \$message\\n',
      mode: FileMode.append,
      flush: false,
    );
  }
}
`;
}

function globalFunctions() {
  return `import 'package:flutter_smart_dialog/flutter_smart_dialog.dart';

// Global side-effect free-functions (structured): the whole app calls these, never
// touching SmartDialog directly. Under test they can be stubbed to no-ops.
void startLoading() => SmartDialog.showLoading();

void dismissLoading() => SmartDialog.dismiss();

void showMessage(String message) => SmartDialog.showToast(message);
`;
}

module.exports = { log, fileLoggerBody, globalFunctions };
