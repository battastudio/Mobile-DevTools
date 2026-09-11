'use strict';

// Pro base layer — the Result<T> type + the typed Failure stack and the single
// ErrorHandler that maps any thrown error into a UI-safe Failure.

function result(app) {
  return `import 'package:${app}/core/error/failure.dart';

// Result<T> — success(data) or failure(Failure). Repositories return this so the
// UI never has to catch exceptions.
sealed class Result<T> {
  const Result();
  R when<R>({required R Function(T data) success, required R Function(Failure failure) failure}) {
    final self = this;
    if (self is Success<T>) return success(self.data);
    return failure((self as Err<T>).failure);
  }
  bool get isSuccess => this is Success<T>;
  T? get dataOrNull => this is Success<T> ? (this as Success<T>).data : null;
}

class Success<T> extends Result<T> {
  const Success(this.data);
  final T data;
}

class Err<T> extends Result<T> {
  const Err(this.failure);
  final Failure failure;
}`;
}

function failure() {
  return `// Failure — the typed, UI-safe error a repository returns (never a raw exception).
abstract class Failure {
  const Failure(this.message, {this.statusCode});
  final String message;
  final int? statusCode;
}

class ServerFailure extends Failure {
  const ServerFailure(super.message, {super.statusCode});
}

class NetworkFailure extends Failure {
  const NetworkFailure([super.message = 'No internet connection']);
}

class CacheFailure extends Failure {
  const CacheFailure([super.message = 'Cache error']);
}

class ValidationFailure extends Failure {
  const ValidationFailure(super.message, {this.errors});
  final Map<String, dynamic>? errors;
}

class UnknownFailure extends Failure {
  const UnknownFailure([super.message = 'Something went wrong']);
}`;
}

function appException() {
  return `// AppException — thrown inside the data layer; mapped to a Failure by ErrorHandler.
class AppException implements Exception {
  const AppException(this.message, {this.statusCode});
  final String message;
  final int? statusCode;
  @override
  String toString() => 'AppException(\$statusCode): \$message';
}`;
}

function errorHandler(app) {
  return `import 'package:dio/dio.dart';

import 'package:${app}/core/error/app_exception.dart';
import 'package:${app}/core/error/failure.dart';
import 'package:${app}/core/network/api_error.dart';

// Maps any thrown error into a typed Failure — the single place that knows how to
// translate DioException / ApiError / AppException into UI-safe failures.
class ErrorHandler {
  const ErrorHandler._();

  static Failure handle(Object error) {
    if (error is DioException) return _dio(error);
    if (error is ApiError) {
      return error.errors != null
          ? ValidationFailure(error.message, errors: error.errors)
          : ServerFailure(error.message, statusCode: error.statusCode);
    }
    if (error is AppException) return ServerFailure(error.message, statusCode: error.statusCode);
    return const UnknownFailure();
  }

  static Failure _dio(DioException e) {
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return const NetworkFailure('Request timed out');
      case DioExceptionType.connectionError:
        return const NetworkFailure();
      case DioExceptionType.badResponse:
        final int? code = e.response?.statusCode;
        return code == 422
            ? ValidationFailure('Validation failed', errors: e.response?.data is Map<String, dynamic> ? (e.response!.data as Map<String, dynamic>)['errors'] as Map<String, dynamic>? : null)
            : ServerFailure((e.response?.data is Map<String, dynamic> ? (e.response!.data as Map<String, dynamic>)['message'] : null)?.toString() ?? 'Server error', statusCode: code);
      default:
        return const UnknownFailure();
    }
  }
}`;
}

module.exports = { result, failure, appException, errorHandler };
