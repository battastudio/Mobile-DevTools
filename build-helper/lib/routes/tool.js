'use strict';
// Tool self-management routes: the version stamp, this tool's recent changelog, and self-update
// (git pull). Controllers only — logic lives in lib/selfupdate.
const { toolVersion, toolChangelog, selfUpdate } = require('../selfupdate');

function register(app) {
  const J = app.sendJson;
  app.r('GET', '/api/version', ({ res }) => J(res, 200, toolVersion()));
  app.r('GET', '/api/changelog/tool', ({ res }) => J(res, 200, { commits: toolChangelog() }));
  app.r('POST', '/api/self-update', ({ req, res }) => selfUpdate(req, res));
}

module.exports = { register };
