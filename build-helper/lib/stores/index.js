'use strict';
// Public API of the stores package — store distribution (App Store Connect, Play, Firebase, TestFlight).
module.exports = {
  ...require('./asc'),
  ...require('./versions'),
  ...require('./play'),
  ...require('./firebase'),
  ...require('./testflight'),
};
