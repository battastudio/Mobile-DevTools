'use strict';
// Public API of the dashboard package — data, reports, per-app config, signing, share, distribute, doctor.
module.exports = {
  ...require('./data'),
  ...require('./reports'),
  ...require('./app-config'),
  ...require('./signing'),
  ...require('./share'),
  ...require('./distribute'),
  ...require('./doctor'),
};
