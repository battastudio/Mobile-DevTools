'use strict';
// Build lifecycle routes: start/stop a build, poll status, replay the live log, and read records.
const { running, stopRunning, BUILDS_JSON, readJson } = require('../state');
const { handleBuild } = require('../build');
const { findBuild } = require('../dashboard');
const { commitUrl } = require('../project');

function register(app) {
  const J = app.sendJson;
  app.r('POST', '/api/build', ({ req, res, body }) => handleBuild(req, res, body), { body: true });
  app.r('POST', '/api/build/stop', ({ res }) => { stopRunning(); return J(res, 200, { ok: true }); });
  app.r('GET', '/api/build/status', ({ res }) => J(res, 200, { busy: running.busy, info: running.info, seq: running.seq }));
  // Replay the running (or just-finished) build's event stream so a returning client can reattach its log.
  app.r('GET', '/api/build/log', ({ res, q }) => {
    const since = parseInt(q.get('since') || '0', 10);
    return J(res, 200, { busy: running.busy, info: running.info, seq: running.seq, path: running.startPath || running.info?.path || '', events: (running.log || []).filter((e) => e.seq > since) });
  });
  app.r('GET', '/api/build', ({ res, q }) => { const b = findBuild(q.get('time')); return b ? J(res, 200, { build: b, commitUrl: commitUrl(b.remote, b.commit) }) : J(res, 404, { error: 'not found' }); });
  app.r('GET', '/api/builds', ({ res, q }) => { const p = q.get('path'); return J(res, 200, { builds: readJson(BUILDS_JSON, []).filter((b) => !p || b.path === p) }); });
}

module.exports = { register };
