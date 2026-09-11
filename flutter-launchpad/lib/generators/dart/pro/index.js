'use strict';

// pro barrel — production-grade extras: testing depth, observability, and
// security hardening. Files are plain Dart (compile in both modes).

const { testingFiles } = require('./testing');
const { observabilityFiles } = require('./observability');
const { securityFiles } = require('./security');

module.exports = { testingFiles, observabilityFiles, securityFiles };
