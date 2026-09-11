'use strict';

// Pro base layer — Dio interceptors (auth/logging/retry), the configured Dio
// client, and a NetworkInfo connectivity probe.

function interceptors(app, secureStore) {
  const tokenRead = secureStore
    ? "await const FlutterSecureStorage().read(key: 'token')"
    : "null /* wire your token store here */";
  const imports = secureStore ? "import 'package:flutter_secure_storage/flutter_secure_storage.dart';\n\n" : '';
  return `import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
${imports}// Interceptors: attach the auth token, log in debug, and retry idempotent GETs once.
class AuthInterceptor extends Interceptor {
  @override
  Future<void> onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    final String? token = ${tokenRead};
    if (token != null) options.headers['Authorization'] = 'Bearer \$token';
    handler.next(options);
  }
}

class LoggingInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    if (kDebugMode) debugPrint('→ \${options.method} \${options.uri}');
    handler.next(options);
  }

  @override
  void onResponse(Response<dynamic> response, ResponseInterceptorHandler handler) {
    if (kDebugMode) debugPrint('← \${response.statusCode} \${response.requestOptions.uri}');
    handler.next(response);
  }
}

class RetryInterceptor extends Interceptor {
  RetryInterceptor(this._dio);
  final Dio _dio;

  @override
  Future<void> onError(DioException err, ErrorInterceptorHandler handler) async {
    final bool retriable = err.requestOptions.method == 'GET' &&
        (err.type == DioExceptionType.connectionError || err.type == DioExceptionType.receiveTimeout) &&
        err.requestOptions.extra['retried'] != true;
    if (retriable) {
      err.requestOptions.extra['retried'] = true;
      try {
        handler.resolve(await _dio.fetch<dynamic>(err.requestOptions));
        return;
      } catch (_) {}
    }
    handler.next(err);
  }
}`;
}

function dioClient(app) {
  return `import 'package:dio/dio.dart';

import 'package:${app}/core/network/interceptors.dart';

// The single configured Dio instance (base url, timeouts, interceptors). Inject it
// everywhere via the service locator (getIt<DioClient>().dio).
class DioClient {
  DioClient({String baseUrl = 'https://api.example.com/v1'}) {
    dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 20),
      receiveTimeout: const Duration(seconds: 30),
      headers: <String, dynamic>{'Accept': 'application/json'},
    ));
    dio.interceptors.addAll(<Interceptor>[AuthInterceptor(), RetryInterceptor(dio), LoggingInterceptor()]);
  }

  late final Dio dio;
}`;
}

function networkInfo(app) {
  return `import 'package:connectivity_plus/connectivity_plus.dart';

// Is the device online? Repositories check this before a network call to return a
// NetworkFailure fast instead of timing out.
class NetworkInfo {
  const NetworkInfo();
  Future<bool> get isConnected async {
    final List<ConnectivityResult> r = await Connectivity().checkConnectivity();
    return !r.contains(ConnectivityResult.none);
  }
}`;
}

module.exports = { interceptors, dioClient, networkInfo };
