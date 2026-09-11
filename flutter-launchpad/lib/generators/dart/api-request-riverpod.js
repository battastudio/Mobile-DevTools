'use strict';

// api/api_request.dart — Riverpod: inline Dio wrapper, typed method enum.
function apiRequestRiverpod(app) {
  return `import 'package:dio/dio.dart';

import 'package:${app}/general_exports.dart';

// HTTP verbs as a typed enum (the Riverpod convention — no raw method strings).
enum ApiMethods { get, post, put, delete, patch }

// The ONE HTTP wrapper. Mechanical mirror of the GetX ApiRequest: inline Dio,
// token + Accept-Language, onSuccess/onError, errors via showMessage. No codegen.
class ApiRequest {
  ApiRequest({
    required this.className,
    this.path,
    this.fullUrl,
    this.method = ApiMethods.get,
    this.body,
    this.header,
    this.queryParameters,
    this.withLoading = false,
    this.shouldShowMessage = true,
  });

  final String className;
  final String? path;
  final String? fullUrl;
  final ApiMethods method;
  final dynamic body;
  final Map<String, dynamic>? header;
  final Map<String, dynamic>? queryParameters;
  final bool withLoading;
  final bool shouldShowMessage;
  dynamic response;

  // Shared client with sane timeouts (never hang on the platform default).
  static final Dio _client = Dio(BaseOptions(
    connectTimeout: const Duration(seconds: 20),
    receiveTimeout: const Duration(seconds: 20),
  ));
  static const String _fallbackError = 'Something went wrong';

  Future<Options> _options() async {
    final String? token = await LocalStorage.read(AppKeys.token);
    return Options(
      headers: <String, dynamic>{
        if (token != null) 'Authorization': 'Bearer \$token', // omit when no token
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Language': await LocalStorage.read(AppKeys.language) ?? 'en',
        'Device-Type': 'MOBILE',
        ...?header,
      },
    );
  }

  Future<void> request({
    Function(dynamic data, dynamic response)? onSuccess,
    Function(dynamic error)? onError,
  }) async {
    final DateTime start = DateTime.now();
    final Options options = await _options();
    final String url = fullUrl ?? (ApiEndpoints.base + (path ?? ''));
    try {
      if (withLoading) {
        startLoading();
      }
      switch (method) {
        case ApiMethods.post:
          response = await _client.post(url, data: body, queryParameters: queryParameters, options: options);
          break;
        case ApiMethods.put:
          response = await _client.put(url, data: body, queryParameters: queryParameters, options: options);
          break;
        case ApiMethods.delete:
          response = await _client.delete(url, data: body, queryParameters: queryParameters, options: options);
          break;
        case ApiMethods.patch:
          response = await _client.patch(url, data: body, queryParameters: queryParameters, options: options);
          break;
        case ApiMethods.get:
          response = await _client.get(url, queryParameters: queryParameters, options: options);
          break;
      }
      final int ms = DateTime.now().difference(start).inMilliseconds;
      consoleLog('\$className \$method \$url (\${ms}ms)', key: 'api');
      if (withLoading) {
        dismissLoading();
      }
      if (onSuccess != null) {
        onSuccess(response.data[AppKeys.data], response.data);
      }
    } on DioException catch (error) {
      dismissLoading();
      final dynamic data = error.response?.data;
      final String reason = data is Map<String, dynamic>
          ? (data[AppKeys.message] ?? _fallbackError).toString()
          : _fallbackError;
      consoleLog('\$className error: \$reason', key: 'api');
      if (shouldShowMessage) {
        showMessage(reason);
      }
      if (onError != null) {
        onError(data);
      }
    }
  }
}
`;
}

module.exports = { apiRequestRiverpod };
