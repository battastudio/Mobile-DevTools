'use strict';

// api/api_request.dart — GetX: inline Dio wrapper, token + Accept-Language.
function apiRequestGetx(app) {
  return `import 'package:dio/dio.dart';

import 'package:${app}/general_exports.dart';

// HTTP method tokens — never inline raw method strings.
const String getMethod = 'GET';
const String postMethod = 'POST';
const String putMethod = 'PUT';
const String deleteMethod = 'DELETE';
const String patchMethod = 'PATCH';

// The ONE HTTP wrapper. Every network call goes through ApiRequest (inline Dio).
// Auto-injects the bearer token + Accept-Language, logs the call, and surfaces
// errors via showMessage unless shouldShowMessage:false. NO retrofit / codegen.
class ApiRequest {
  ApiRequest({
    required this.path,
    required this.method,
    required this.className,
    this.body,
    this.header,
    this.queryParameters,
    this.withLoading = false,
    this.shouldShowMessage = true,
  });

  final String path;
  final String method;
  final String className;
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

  Map<String, dynamic> _headers() {
    final String? token = LocalStorage.read(AppKeys.token);
    return <String, dynamic>{
      if (token != null) 'Authorization': 'Bearer \$token', // omit when no token
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Accept-Language': LocalStorage.read(AppKeys.language) ?? 'en',
      'Device-Type': 'MOBILE',
      ...?header,
    };
  }

  Future<void> request({
    Function(dynamic data, dynamic response)? onSuccess,
    Function(dynamic error)? onError,
  }) async {
    final DateTime start = DateTime.now();
    try {
      if (withLoading) {
        startLoading();
      }
      final String url = ApiEndpoints.base + path;
      final Options options = Options(headers: _headers());
      switch (method) {
        case postMethod:
          response = await _client.post(url, data: body, queryParameters: queryParameters, options: options);
          break;
        case putMethod:
          response = await _client.put(url, data: body, queryParameters: queryParameters, options: options);
          break;
        case deleteMethod:
          response = await _client.delete(url, data: body, queryParameters: queryParameters, options: options);
          break;
        case patchMethod:
          response = await _client.patch(url, data: body, queryParameters: queryParameters, options: options);
          break;
        default:
          response = await _client.get(url, queryParameters: queryParameters, options: options);
      }
      final int ms = DateTime.now().difference(start).inMilliseconds;
      consoleLog('\$className \$method \$path (\${ms}ms)', key: 'api');
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

module.exports = { apiRequestGetx };
