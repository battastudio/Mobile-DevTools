'use strict';
// Barrel: register every build-helper route group on the kit server in one call. server.js runs this
// after team.register + connectors.registerRoutes have wired the shared routes.
module.exports = function registerRoutes(app) {
  require('./apps').register(app);       // dashboard, projects, per-app config, git, icon
  require('./build').register(app);      // build lifecycle (start/stop/status/log/history)
  require('./testflight').register(app); // TestFlight re-manage (compliance + notes) + status
  require('./signing').register(app);    // Android release signing
  require('./setup').register(app);      // global Setup (Play/Apple/Firebase/OneDrive) + Doctor
  require('./dist').register(app);       // rollback, retry-upload, share, reports, cleanup, trackers
  require('./pages').register(app);      // tester install pages, artifact download, activity feed
  require('./tool').register(app);       // version, tool changelog, self-update (git pull)
};
