'use strict';

// models barrel — typed models (manual or freezed) + the always-emitted
// ApiResponse / PaginatedResponse / ApiError network envelope. Emitted in every mode.

const { f } = require('../helpers');
const { snake } = require('./field');
const { manualModel, freezedModel } = require('./model');
const { apiResponse, paginatedResponse, apiError } = require('./envelope');

function modelFiles(config) {
  const out = [
    f('lib/core/network/api_response.dart', apiResponse()),
    f('lib/core/network/paginated_response.dart', paginatedResponse()),
    f('lib/core/network/api_error.dart', apiError()),
  ];
  const freezed = config.modelsCodegen === 'freezed';
  for (const m of config.models) {
    out.push(f(`lib/models/${snake(m.name)}.dart`, freezed ? freezedModel(m) : manualModel(m)));
  }
  if (config.models.length) {
    out.push(
      f(
        'lib/models/index.dart',
        ['// models — barrel.', ...config.models.map((m) => `export '${snake(m.name)}.dart';`), ''].join('\n'),
      ),
    );
  }
  return out;
}

module.exports = { modelFiles };
