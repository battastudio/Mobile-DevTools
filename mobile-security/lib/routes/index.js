'use strict';
// Barrel: register every route group on the kit server in one call. deps = { scan, kit, PROJECTS_ROOT }.
const registerScanRoutes = require('./scan');
const registerSupplyRoutes = require('./supply');
const registerShareRoutes = require('./share');
const registerAiRoutes = require('./ai');

function registerAll(app, deps) {
  registerScanRoutes(app, deps);
  registerSupplyRoutes(app, deps);
  registerShareRoutes(app, deps);
  registerAiRoutes(app, deps);
}

module.exports = { registerAll };
