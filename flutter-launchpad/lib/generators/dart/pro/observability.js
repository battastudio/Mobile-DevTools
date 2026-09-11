'use strict';

// Observability — Sentry monitoring init, a global build-error boundary, and a
// 401 token-refresh interceptor. Each gated on a `observability` chip.

const { f } = require('../helpers');

const widgetsDir = (config) => (config.mode === 'generic' ? 'lib/widgets' : 'lib/components');

function observabilityFiles(app, config) {
  const o = config.observability;
  const out = [];
  if (o.includes('sentry')) {
    const dsn = config.env ? 'Env.sentryDsn' : `'${config.setup.sentryDsn || 'REPLACE_ME'}'`;
    const dsnImport = config.env ? `\nimport 'package:${app}/utils/env.dart';` : '';
    out.push(f('lib/services/monitoring_service.dart', `import 'package:flutter/foundation.dart';
import 'package:sentry_flutter/sentry_flutter.dart';${dsnImport}

// Crash + performance monitoring. Call MonitoringService.init() in main().
class MonitoringService {
  MonitoringService._();

  static Future<void> init() async {
    await SentryFlutter.init((SentryFlutterOptions options) {
      options.dsn = ${dsn};
      options.tracesSampleRate = kReleaseMode ? 0.2 : 1.0;
    });
  }

  static Future<void> capture(Object error, StackTrace stack) =>
      Sentry.captureException(error, stackTrace: stack);
}
`));
  }
  if (o.includes('error_boundary')) {
    out.push(f(`${widgetsDir(config)}/error_boundary.dart`, `import 'package:flutter/material.dart';

// Global build-error UI. Call ErrorBoundary.install() in main() before runApp.
class ErrorBoundary {
  ErrorBoundary._();

  static void install() {
    ErrorWidget.builder = (FlutterErrorDetails details) => Material(
          color: Colors.white,
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Text(
                'Something went wrong.\\n\${details.exceptionAsString()}',
                textAlign: TextAlign.center,
              ),
            ),
          ),
        );
  }
}
`));
  }
  if (o.includes('token_refresh')) {
    out.push(f('lib/api/auth_interceptor.dart', `import 'package:dio/dio.dart';

// Attaches the bearer token and, on 401, refreshes once then retries the request.
// Wire it: dio.interceptors.add(AuthInterceptor(dio, readToken: ..., refresh: ...)).
class AuthInterceptor extends Interceptor {
  AuthInterceptor(this._dio, {required this.readToken, required this.refresh});

  final Dio _dio;
  final Future<String?> Function() readToken;
  final Future<String?> Function() refresh;
  bool _retrying = false;

  @override
  Future<void> onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    final String? token = await readToken();
    if (token != null) options.headers['Authorization'] = 'Bearer \$token';
    handler.next(options);
  }

  @override
  Future<void> onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode == 401 && !_retrying) {
      _retrying = true;
      final String? fresh = await refresh();
      _retrying = false;
      if (fresh != null) {
        err.requestOptions.headers['Authorization'] = 'Bearer \$fresh';
        try {
          handler.resolve(await _dio.fetch<dynamic>(err.requestOptions));
          return;
        } catch (_) {}
      }
    }
    handler.next(err);
  }
}
`));
  }
  return out;
}

module.exports = { observabilityFiles };
