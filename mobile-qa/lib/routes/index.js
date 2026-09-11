'use strict';
// Route dispatcher — registers every QA route group on the kit server. server.js calls this once,
// after team.register + connectors.registerRoutes have wired the shared routes.
module.exports = function registerRoutes(app) {
  require('./qa')(app);
  require('./device')(app);
  require('./ai')(app);
  require('./share')(app);
};
