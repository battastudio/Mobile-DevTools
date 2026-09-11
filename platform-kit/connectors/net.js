'use strict';
// Zero-dep net primitives shared by every connector: https request, basic-auth header,
// a JSON GET/POST that never rejects on non-2xx, and the Jira site-origin normalizer.
const https = require('https');

function httpsRequest(opts, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(opts, (res) => {
      let data = ''; res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}
function basicAuth(user, pass) { return 'Basic ' + Buffer.from(`${user || ''}:${pass || ''}`).toString('base64'); }

// GET/POST a full URL and JSON-parse. Never rejects on non-2xx — returns {status, json, body}.
async function apiGet(urlString, headers, method, body) {
  const u = new URL(urlString);
  const h = Object.assign({ 'User-Agent': 'mobile-devtools', Accept: 'application/json' }, headers || {});
  if (body) { h['Content-Type'] = h['Content-Type'] || 'application/json'; h['Content-Length'] = Buffer.byteLength(body); }
  const r = await httpsRequest({ method: method || 'GET', hostname: u.hostname, path: u.pathname + u.search, headers: h }, body);
  let json = {}; try { json = JSON.parse(r.body); } catch {}
  return { status: r.status, json, body: r.body };
}

// Jira Cloud REST needs the site ORIGIN — a pasted board URL (.../projects/JSW/boards/1) otherwise breaks every /rest path.
function jiraBase(conn) {
  const raw = ((conn && conn.baseUrl) || '').trim();
  try { return new URL(raw).origin; } catch { return raw.replace(/\/+$/, ''); }
}

module.exports = { httpsRequest, basicAuth, apiGet, jiraBase };
