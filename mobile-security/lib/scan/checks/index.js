'use strict';
// Aggregate every mobile (OWASP Mobile Top 10) check definition into one flat catalog.
// Each domain file exports an array of { id, title, category, owasp, severity, fixable?, scenario, fix?, run(ctx) }.
module.exports = [].concat(
  require('./data-at-rest'),
  require('./transport'),
  require('./runtime'),
  require('./secrets'),
  require('./crypto'),
  require('./privacy'),
  require('./webview'),
  require('./build-integrity'),
  require('./permissions'),
  require('./injection-auth'),
);
