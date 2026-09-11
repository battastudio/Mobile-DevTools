'use strict';
// packages — the pub catalog + the config→deps resolver.
module.exports = {
  ...require('./catalog'),
  ...require('./resolve'),
};
