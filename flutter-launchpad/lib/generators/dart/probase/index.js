'use strict';

// probase barrel — the professional base layer (DI, Dio client + interceptors,
// error stack, Result<T>, base repository/usecase, network_info). Gated on
// config.proBase; clean architecture always pulls it in. Architecture-agnostic.

const { f } = require('../helpers');
const { result, failure, appException, errorHandler } = require('./errors');
const { interceptors, dioClient, networkInfo } = require('./network');
const { injector, baseRepository, baseUseCase } = require('./base');

function proBaseFiles(config) {
  // clean architecture depends on the base layer (Result/BaseRepository/DioClient/…).
  if (!config.proBase && config.architecture !== 'clean') return [];
  const app = config.appName;
  const secureStore = config.security.includes('secure_storage');
  return [
    f('lib/core/result.dart', result(app)),
    f('lib/core/error/failure.dart', failure()),
    f('lib/core/error/app_exception.dart', appException()),
    f('lib/core/error/error_handler.dart', errorHandler(app)),
    f('lib/core/network/interceptors.dart', interceptors(app, secureStore)),
    f('lib/core/network/dio_client.dart', dioClient(app)),
    f('lib/core/network/network_info.dart', networkInfo(app)),
    f('lib/core/di/injector.dart', injector(app)),
    f('lib/core/base/base_repository.dart', baseRepository(app)),
    f('lib/core/base/base_usecase.dart', baseUseCase(app)),
  ];
}

module.exports = { proBaseFiles };
