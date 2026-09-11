'use strict';
// Register the shared connectors API on any kit server (global store — every tool reads/writes the same one).
const { readStore, getConnector, saveConnector, publicDefs, configuredIds } = require('./store');
const { trackerById } = require('./trackers');
const { jiraProjects, jiraIssueTypes, jiraSearch } = require('./jira');

function registerRoutes(app) {
  const J = app.sendJson;
  app.r('GET', '/api/connectors', ({ res }) => {
    const store = readStore().trackers; const values = {};   // prefill non-secret fields; never echo the token
    for (const id of Object.keys(store)) { const v = { ...store[id] }; if (v.token) { v.token = ''; v._hasToken = true; } values[id] = v; }
    J(res, 200, { defs: publicDefs(), values, configured: configuredIds() });
  });
  app.r('POST', '/api/connectors/save', ({ res, body }) => { try { J(res, 200, { ok: true, ...saveConnector(body.id, body) }); } catch (e) { J(res, 400, { error: e.message }); } }, { body: true });
  app.r('GET', '/api/connectors/test', ({ res, q }) => {
    const def = trackerById(q.get('id'));
    if (!def) return J(res, 200, { ok: false, error: 'Unknown connector' });
    const conn = getConnector(def.id);
    if (!conn) return J(res, 200, { ok: false, error: 'Save the connector first, then Test.' });
    def.test(conn).then((x) => J(res, 200, x)).catch((e) => J(res, 200, { ok: false, error: e.message }));
  });
  // Jira compose helpers (project / issue-type / link search) — used by the Build-Helper-style create modal.
  app.r('GET', '/api/connectors/jira/projects', ({ res }) => jiraProjects(getConnector('jira')).then((x) => J(res, 200, x)).catch((e) => J(res, 200, { ok: false, error: e.message })));
  app.r('GET', '/api/connectors/jira/issuetypes', ({ res, q }) => jiraIssueTypes(getConnector('jira'), q.get('key')).then((x) => J(res, 200, x)).catch((e) => J(res, 200, { ok: false, error: e.message })));
  app.r('GET', '/api/connectors/jira/search', ({ res, q }) => jiraSearch(getConnector('jira'), q.get('q'), q.get('key')).then((x) => J(res, 200, x)).catch((e) => J(res, 200, { ok: false, error: e.message })));
}

module.exports = { registerRoutes };
