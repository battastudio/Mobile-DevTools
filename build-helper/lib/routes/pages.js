'use strict';
// Tester-facing + activity routes: the LAN install page (QR + iOS ad-hoc manifest), the artifact
// download, the live activity feed (SSE, cross-tab), and the email-groups / build-announcement flows.
const fs = require('fs');
const path = require('path');
const { installPage, manifestPlist } = require('../pages');
const { readGroups, handleGroupsSave, handleEmailTest, handleEmailSend } = require('../messaging');
const { feedClients, feedHistory, ARTIFACTS_DIR } = require('../state');

function register(app) {
  const J = app.sendJson;
  // Activity feed: replay the recent buffer, then stream live build/status events (state.broadcast).
  app.r('GET', '/api/feed', ({ req, res }) => {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    for (const msg of feedHistory) res.write(msg);
    feedClients.add(res);
    req.on('close', () => feedClients.delete(res));
  });
  app.r('GET', '/api/groups', ({ res, q }) => { const g = readGroups(); const repo = q.get('repo') || ''; return J(res, 200, { groups: [...(g['*'] || []), ...(repo ? g[repo] || [] : [])] }); });
  app.r('POST', '/api/groups/save', ({ res, body }) => handleGroupsSave(res, body), { body: true });
  app.r('GET', '/api/email/test', ({ res }) => handleEmailTest(res));
  app.r('POST', '/api/email/send', ({ req, res, body }) => handleEmailSend(req, res, body), { body: true });
  // Tester pages, opened on a phone over the LAN. ?path = the built artifact's absolute path.
  app.r('GET', '/install', ({ res, q }) => { const p = artifactPath(q.get('path')); if (!p) { res.writeHead(404); return res.end('not found'); } res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(installPage(p)); });
  app.r('GET', '/manifest.plist', ({ res, q }) => { res.writeHead(200, { 'Content-Type': 'application/xml' }); res.end(manifestPlist(artifactPath(q.get('path')) || '')); });
  app.r('GET', '/artifact', ({ res, q }) => {
    const p = artifactPath(q.get('path'));
    if (!p) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Disposition': `attachment; filename="${path.basename(p)}"` });
    fs.createReadStream(p).pipe(res);
  });
}

// These routes are reachable over the LAN, so restrict downloads to the tool's own artifacts dir —
// never let a tester's phone pull an arbitrary file off the host by path.
function artifactPath(p) {
  if (!p) return null;
  const rp = path.resolve(p);
  return rp.startsWith(ARTIFACTS_DIR + path.sep) && fs.existsSync(rp) ? rp : null;
}

module.exports = { register };
