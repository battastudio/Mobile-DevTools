'use strict';
// Strict structured analysis_options.yaml. Generic mode gets a lighter default.
const { isStructured } = require('../schema');

function analysisOptions(config) {
  const riverpod = config.mode === 'structured-riverpod';
  if (!isStructured(config)) {
    return ['include: package:flutter_lints/flutter.yaml', '', 'linter:', '  rules:', '    prefer_single_quotes: true', '    prefer_const_constructors: true', ''].join('\n');
  }
  return [
    'include: package:flutter_lints/flutter.yaml',
    '',
    'analyzer:',
    '  language:',
    '    strict-casts: true          # no implicit dynamic downcasts',
    '    strict-inference: true      # every type must be inferable',
    '    strict-raw-types: true      # no untyped generics',
    ...(riverpod ? ['  plugins:', '    - custom_lint'] : []),
    '',
    'linter:',
    '  rules:',
    '    # Structured strict set — enforced house-wide.',
    '    always_specify_types: true          # no var / inferred generics',
    '    prefer_single_quotes: true',
    '    prefer_const_constructors: true',
    '    prefer_const_constructors_in_immutables: true',
    '    prefer_const_literals_to_create_immutables: true',
    '    sort_constructors_first: true',
    '    directives_ordering: true',
    '    always_put_control_body_on_new_line: true',
    '    avoid_print: true                   # use consoleLog',
    '    require_trailing_commas: true',
    '    unnecessary_this: true',
    '    prefer_final_locals: true',
    '',
  ].join('\n');
}

module.exports = { analysisOptions };
