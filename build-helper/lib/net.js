'use strict';
// Pure network/auth primitives: raw https, Google + App Store Connect JWTs.
// Leaf module — depends on nothing local.
const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const crypto = require('crypto');

function httpsRequest(opts, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

// Build a signed JWT for a Google service account (RS256, zero-dep).
function serviceAccountJwt(sa, nowSec) {
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: 'https://oauth2.googleapis.com/token',
    iat: nowSec, exp: nowSec + 3600,
  }));
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(`${header}.${claim}`);
  const sig = b64url(signer.sign(sa.private_key));
  return `${header}.${claim}.${sig}`;
}

async function googleAccessToken(sa) {
  const jwt = serviceAccountJwt(sa, Math.floor(Date.now() / 1000));
  const form = `grant_type=${encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')}&assertion=${jwt}`;
  const r = await httpsRequest({
    method: 'POST', hostname: 'oauth2.googleapis.com', path: '/token',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(form) },
  }, form);
  if (r.status !== 200) throw new Error(`Google token failed (${r.status}): ${r.body}`);
  return JSON.parse(r.body).access_token;
}

function basicAuth(user, pass) { return 'Basic ' + Buffer.from(`${user || ''}:${pass || ''}`).toString('base64'); }
// GET/POST a full URL and JSON-parse. Never rejects on a non-2xx — returns {status, json, body}.
// ponytail: https-only (SaaS default). Self-hosted http would need a protocol switch here — add if a user needs it.
async function apiGet(urlString, headers, method, body) {
  const u = new URL(urlString);
  const h = Object.assign({ 'User-Agent': 'mobile-devtools', Accept: 'application/json' }, headers || {});
  if (body) { h['Content-Type'] = h['Content-Type'] || 'application/json'; h['Content-Length'] = Buffer.byteLength(body); }
  const r = await httpsRequest({ method: method || 'GET', hostname: u.hostname, path: u.pathname + u.search, headers: h }, body);
  let json = {}; try { json = JSON.parse(r.body); } catch {}
  return { status: r.status, json, body: r.body };
}

// App Store Connect JWT (ES256). The .p8 comes from signing.json's apple.p8 path when set,
// else the conventional ~/.appstoreconnect/private_keys/AuthKey_<keyId>.p8.
function appStoreConnectJwt(apple) {
  const p8Path = (apple.p8 && fs.existsSync(apple.p8)) ? apple.p8
    : path.join(os.homedir(), '.appstoreconnect', 'private_keys', `AuthKey_${apple.keyId}.p8`);
  const key = fs.readFileSync(p8Path, 'utf8');
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'ES256', kid: apple.keyId, typ: 'JWT' }));
  const claim = b64url(JSON.stringify({ iss: apple.issuerId, iat: now, exp: now + 1140, aud: 'appstoreconnect-v1' }));
  const signer = crypto.createSign('SHA256');
  signer.update(`${header}.${claim}`);
  const sig = b64url(signer.sign({ key, dsaEncoding: 'ieee-p1363' }));
  return `${header}.${claim}.${sig}`;
}

module.exports = { httpsRequest, b64url, serviceAccountJwt, googleAccessToken, basicAuth, apiGet, appStoreConnectJwt };
