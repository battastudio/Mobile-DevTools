'use strict';
// Public API of the project package — stable require site: `require('./project')`.
// Everything that reads/writes a Flutter project or this tool's own repo.
module.exports = {
  ...require('./detect'),
  ...require('./env-switch'),
  ...require('./version'),
  ...require('./artifacts'),
  ...require('./git'),
  ...require('./signing'),
  ...require('./scan'),
};
