'use strict';
// Android release-signing routes: read status, generate a keystore, or link an existing one.
const { signingStatus } = require('../project');
const { handleSigning } = require('../dashboard');

function register(app) {
  const J = app.sendJson;
  app.r('GET', '/api/signing/status', ({ res, q }) => { const p = q.get('path'); return J(res, 200, p ? signingStatus(p) : { error: 'no path' }); });
  app.r('POST', '/api/signing/generate', ({ req, res, body }) => handleSigning(req, res, body, 'generate'), { body: true });
  app.r('POST', '/api/signing/link', ({ req, res, body }) => handleSigning(req, res, body, 'link'), { body: true });
}

module.exports = { register };
