'use strict';

// features barrel — the one real, wired sample feature per mode + its unit test.
const { featureGetx, featureTest } = require('./getx');
const { featureRiverpod } = require('./riverpod');

module.exports = { featureGetx, featureRiverpod, featureTest };
