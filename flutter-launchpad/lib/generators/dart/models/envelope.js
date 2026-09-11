'use strict';

// Always-emitted response envelope + error, imported by ApiRequest / repositories.

function apiResponse() {
  return `// A typed API envelope: ApiResponse<T> wraps the parsed data + status/message.
class ApiResponse<T> {
  const ApiResponse({required this.success, this.data, this.message, this.statusCode});

  final bool success;
  final T? data;
  final String? message;
  final int? statusCode;

  factory ApiResponse.fromJson(
    Map<String, dynamic> json,
    T Function(Object? data) fromData,
  ) {
    return ApiResponse<T>(
      success: json['status'] == true || json['success'] == true,
      data: json['data'] == null ? null : fromData(json['data']),
      message: json['message'] as String?,
      statusCode: json['statusCode'] as int?,
    );
  }
}`;
}

function paginatedResponse() {
  return `// A paged list envelope for list endpoints.
class PaginatedResponse<T> {
  const PaginatedResponse({
    required this.items,
    required this.page,
    required this.total,
    this.hasMore = false,
  });

  final List<T> items;
  final int page;
  final int total;
  final bool hasMore;

  factory PaginatedResponse.fromJson(
    Map<String, dynamic> json,
    T Function(Object? item) fromItem,
  ) {
    final List<dynamic> list =
        (json['data'] ?? json['items'] ?? const <dynamic>[]) as List<dynamic>;
    return PaginatedResponse<T>(
      items: list.map(fromItem).toList(),
      page: (json['page'] ?? json['current_page'] ?? 1) as int,
      total: (json['total'] ?? list.length) as int,
      hasMore: (json['has_more'] ?? json['hasMore'] ?? false) as bool,
    );
  }
}`;
}

function apiError() {
  return `// A normalized API error thrown by the client on non-2xx / bad payloads.
class ApiError implements Exception {
  const ApiError(this.message, {this.statusCode, this.errors});

  final String message;
  final int? statusCode;
  final Map<String, dynamic>? errors;

  factory ApiError.fromResponse(Object? data, int? statusCode) {
    if (data is Map<String, dynamic>) {
      return ApiError(
        (data['message'] ?? 'Something went wrong').toString(),
        statusCode: statusCode,
        errors: data['errors'] as Map<String, dynamic>?,
      );
    }
    return ApiError('Something went wrong', statusCode: statusCode);
  }

  @override
  String toString() => 'ApiError(\$statusCode): \$message';
}`;
}

module.exports = { apiResponse, paginatedResponse, apiError };
