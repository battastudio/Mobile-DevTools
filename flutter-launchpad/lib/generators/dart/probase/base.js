'use strict';

// Pro base layer — the service locator + the BaseRepository/UseCase abstractions
// the clean-architecture data + domain layers extend.

function injector(app) {
  return `import 'package:get_it/get_it.dart';

import 'package:${app}/core/network/dio_client.dart';

// Service locator. Register singletons/factories here and resolve with getIt<T>().
final GetIt getIt = GetIt.instance;

Future<void> configureDependencies() async {
  getIt.registerLazySingleton<DioClient>(DioClient.new);
  // getIt.registerLazySingleton<AuthRepository>(() => AuthRepositoryImpl(getIt()));
  // getIt.registerFactory<LoginUseCase>(() => LoginUseCase(getIt()));
}`;
}

function baseRepository(app) {
  return `import 'package:${app}/core/error/error_handler.dart';
import 'package:${app}/core/result.dart';

// BaseRepository — wraps a network call so subclasses return Result<T> instead of
// throwing. Catches everything and maps it to a Failure via ErrorHandler.
abstract class BaseRepository {
  Future<Result<T>> guard<T>(Future<T> Function() call) async {
    try {
      return Success<T>(await call());
    } catch (e) {
      return Err<T>(ErrorHandler.handle(e));
    }
  }
}`;
}

function baseUseCase(app) {
  return `import 'package:${app}/core/result.dart';

// A use case = one unit of business logic. Params in, Result<T> out.
abstract class UseCase<T, P> {
  Future<Result<T>> call(P params);
}

class NoParams {
  const NoParams();
}`;
}

module.exports = { injector, baseRepository, baseUseCase };
