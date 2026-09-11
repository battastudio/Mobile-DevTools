'use strict';
// Global Setup + Doctor routes: connector status, credential saves (Play / Apple / Firebase app),
// build-notification + email config, the two OAuth/login SSE flows (OneDrive, Firebase CLI), and the
// environment preflight (doctor). Issue-tracker config is NOT re-wired here — the shared kit
// connectors layer (/api/connectors*) already owns that store; setup.js handleSetupTracker is unused.
const os = require('os');
const fs = require('fs');
const path = require('path');
const { setupStatus, handleSetupPlay, handleSetupApple, handleSetupFirebaseApp, handleSetupFirebaseLogin, handleSetupNotify, handleSetupEmail } = require('../setup');
const { setSources, validateSource } = require('../state');
const { handleSetupRclone } = require('../onedrive');
const { doctorData, doctorInstallCmd } = require('../dashboard');
const { run } = require('../shell');

function register(app) {
  const J = app.sendJson;
  app.r('GET', '/api/setup', ({ res }) => J(res, 200, setupStatus()));
  // Persist project sources (roots + pinned paths + recursive). Validates each entry; returns the
  // saved set plus any `invalid` ones the UI should flag (kept out of the persisted config).
  app.r('POST', '/api/setup/sources', ({ res, body }) => {
    const s = body || {}; const invalid = [];
    const keep = (arr, pinned) => (arr || []).filter((p) => { const v = validateSource(p, pinned); if (!v.ok) invalid.push({ path: p, kind: pinned ? 'pinned' : 'root', reason: v.reason }); return v.ok; });
    const sources = setSources({ roots: keep(s.roots, false), pinned: keep(s.pinned, true), recursive: s.recursive });
    return J(res, 200, { ok: true, sources, invalid });
  }, { body: true });
  app.r('GET', '/api/setup/suggest-roots', ({ res }) => J(res, 200, { roots: suggestRoots() }));
  // Back-compat single-root save (superseded by the sources manager UI). ponytail: drop once no caller.
  app.r('POST', '/api/setup/root', ({ res, body }) => { const r = String((body || {}).root || '').trim(); const s = setSources({ roots: r ? [r] : [], pinned: [], recursive: false }); return J(res, 200, { ok: true, root: s.roots[0] || '' }); }, { body: true });
  app.r('POST', '/api/setup/play', ({ res, body }) => handleSetupPlay(res, body), { body: true });
  app.r('POST', '/api/setup/apple', ({ res, body }) => handleSetupApple(res, body), { body: true });
  app.r('POST', '/api/setup/firebase-app', ({ res, body }) => handleSetupFirebaseApp(res, body), { body: true });
  app.r('POST', '/api/setup/notify', ({ res, body }) => handleSetupNotify(res, body), { body: true });
  app.r('POST', '/api/setup/email', ({ res, body }) => handleSetupEmail(res, body), { body: true });
  // SSE OAuth/login flows — streamSSE POSTs an (ignored) empty body; the handler streams progress.
  app.r('POST', '/api/setup/onedrive', ({ req, res }) => handleSetupRclone(req, res));
  app.r('POST', '/api/setup/firebase-login', ({ req, res }) => handleSetupFirebaseLogin(req, res));
  app.r('GET', '/api/doctor', ({ res }) => J(res, 200, doctorData()));
  app.r('POST', '/api/doctor/install', ({ res, body }) => installTool(res, body), { body: true });
}

// Install one missing tool via its known-safe (non-sudo, non-interactive) command, streaming over SSE.
function installTool(res, body) {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  const send = (e, d) => res.write(`event: ${e}\ndata: ${JSON.stringify(d)}\n\n`);
  const cmd = doctorInstallCmd(body.tool);
  if (!cmd) { send('error', { message: `No safe auto-install for "${body.tool}".` }); return res.end(); }
  send('step', { text: cmd });
  run('/bin/sh', ['-c', cmd], process.cwd(), (line) => send('log', { line }))
    .then(() => { send('done', { ok: true }); res.end(); })
    .catch((e) => { send('error', { message: e.message }); res.end(); });
}

// Common Flutter-project locations under $HOME that actually exist — one-click add suggestions.
function suggestRoots() {
  const home = os.homedir();
  return ['Projects', 'dev', 'Development', 'StudioProjects', 'AndroidStudioProjects', 'mobileApps', 'code', 'src']
    .map((d) => path.join(home, d)).filter((p) => { try { return fs.statSync(p).isDirectory(); } catch { return false; } });
}

module.exports = { register };
