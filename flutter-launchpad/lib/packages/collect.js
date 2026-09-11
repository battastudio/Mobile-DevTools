'use strict';
// collect — apply a config's selections to the dep/dev collectors (dep, dv). Split
// into stacks + extras (line cap); this barrel keeps the collect() call site stable.
// `dep`/`dv` are (name, tier).
const { collectStacks } = require('./collect-stacks');
const { collectExtras } = require('./collect-extras');

function collect(config, dep, dv) {
  collectStacks(config, dep, dv);
  collectExtras(config, dep, dv);
}

module.exports = { collect };
