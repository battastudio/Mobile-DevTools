'use strict';
// platform-kit entry — one require for the whole shared spine.
module.exports = {
  ...require('./server'),
  ...require('./store'),
  contract: require('./contract'),
  ai: require('./ai'),
  share: require('./share'),
  connectors: require('./connectors'),
  messaging: require('./messaging'),
  team: require('./team'),
};
