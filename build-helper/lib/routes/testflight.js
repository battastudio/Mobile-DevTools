'use strict';
// TestFlight post-upload management: (re)apply export compliance + "What to Test" notes to an
// already-uploaded build, and look up its processing state + deep link. Thin wrappers over
// lib/stores/asc — the build pipeline runs the same manage pass automatically; these let a user
// re-run it from a build's detail view.
const { readConfig } = require('../state');
const { detectApp } = require('../project');
const { appleAuth } = require('../signing-config');
const { ascManageBuild, ascBuildStatus } = require('../stores');

// Resolve the Apple ASC account for a project: per-app override wins over the global signing.json one.
function appleFor(projectPath) {
  const perApp = (readConfig().appleAccounts || {})[projectPath];
  return perApp && perApp.keyId && perApp.issuerId ? perApp : appleAuth();
}

function register(app) {
  const J = app.sendJson;
  app.r('POST', '/api/testflight/manage', ({ res, body }) => {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    const send = (e, d) => res.write(`event: ${e}\ndata: ${JSON.stringify(d)}\n\n`);
    const b = body || {};
    const a = b.path ? detectApp(b.path) : null;
    const apple = b.path ? appleFor(b.path) : null;
    if (!a || !apple) { send('error', { message: 'Apple App Store Connect not configured for this app.' }); return res.end(); }
    ascManageBuild(a, apple, String(b.buildNumber || ''), b.notes || '', (line) => send('log', { line }))
      .then((info) => { send('done', { ok: true, info }); res.end(); })
      .catch((e) => { send('error', { message: e.message }); res.end(); });
  }, { body: true });
  app.r('GET', '/api/testflight/latest', ({ res, q }) => {
    const p = q.get('path'); const a = p ? detectApp(p) : null; const apple = p ? appleFor(p) : null;
    if (!a || !apple) return J(res, 200, { url: 'https://appstoreconnect.apple.com/apps' });
    return ascBuildStatus(a, apple, q.get('buildNumber') || '').then((r) => J(res, 200, r || {}));
  });
}

module.exports = { register };
