'use strict';

const { baseUrlGetter } = require('../dart/flavors');
const { f } = require('./helpers');

// ── api ────────────────────────────────────────────────────────────────────
const apiEndpoints = (app, config) => {
  const flavored = config.flavors.length > 0;
  const header = flavored
    ? `// Endpoint path constants. [base] is chosen per flavor from currentMode
// (edit it in constants/general_constants.dart).
import 'package:${app}/constants/general_constants.dart';

`
    : '// Endpoint path constants — never inline URL strings.\n';
  const base = flavored
    ? baseUrlGetter(config.flavors, config.identity.baseUrlByFlavor)
    : `  static const String base = '${config.identity.baseUrl}';`;
  return `${header}class ApiEndpoints {
  ApiEndpoints._();

${base}
  static const String login = '/auth/login';
  static const String settings = '/settings';
}
`;
};

function apiClient(app, client) {
  if (client === 'http') {
    return f('lib/api/api_client.dart', `import 'dart:convert';

import 'package:http/http.dart' as http;

import 'package:${app}/api/api_endpoints.dart';

// Minimal http client. Wrap all calls here so headers/errors live in one place.
class ApiClient {
  Future<dynamic> get(String path) async {
    final http.Response res = await http.get(Uri.parse('\${ApiEndpoints.base}\$path'));
    return jsonDecode(res.body);
  }

  Future<dynamic> post(String path, {Object? body}) async {
    final http.Response res = await http.post(
      Uri.parse('\${ApiEndpoints.base}\$path'),
      headers: const <String, String>{'Content-Type': 'application/json'},
      body: jsonEncode(body),
    );
    return jsonDecode(res.body);
  }
}
`);
  }
  if (client === 'retrofit') {
    return f('lib/api/app_api.dart', `import 'package:dio/dio.dart';
import 'package:retrofit/retrofit.dart';

part 'app_api.g.dart';

// Retrofit typed client — run \`dart run build_runner build\` to generate app_api.g.dart.
@RestApi(baseUrl: 'https://api.example.com/v1')
abstract class AppApi {
  factory AppApi(Dio dio) = _AppApi;

  @GET('/items')
  Future<List<dynamic>> getItems();
}
`);
  }
  // dio / api_request — a thin Dio wrapper.
  return f('lib/api/api_client.dart', `import 'package:dio/dio.dart';

import 'package:${app}/api/api_endpoints.dart';

// Thin Dio wrapper — every request goes through ApiClient (baseUrl + headers here).
class ApiClient {
  ApiClient()
      : _dio = Dio(BaseOptions(
          baseUrl: ApiEndpoints.base,
          connectTimeout: const Duration(seconds: 20),
          receiveTimeout: const Duration(seconds: 20),
          headers: const <String, dynamic>{'Accept': 'application/json'},
        ));

  final Dio _dio;

  Future<Response<dynamic>> get(String path, {Map<String, dynamic>? query}) =>
      _dio.get<dynamic>(path, queryParameters: query);

  Future<Response<dynamic>> post(String path, {dynamic data}) => _dio.post<dynamic>(path, data: data);

  Future<Response<dynamic>> put(String path, {dynamic data}) => _dio.put<dynamic>(path, data: data);

  Future<Response<dynamic>> delete(String path) => _dio.delete<dynamic>(path);
}
`);
}

module.exports = { apiEndpoints, apiClient };
