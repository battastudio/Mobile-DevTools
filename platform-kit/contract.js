'use strict';
// platform-kit tool contract — client helpers the hub/peers use to discover a tool.
const http = require('http');

function _get(url, timeout = 2500) {
  return new Promise((resolve) => {
    let u; try { u = new URL(url); } catch { return resolve(null); }
    const req = http.get({ host: u.hostname, port: u.port || 80, path: u.pathname + u.search, timeout }, (res) => {
      let d = ''; res.on('data', (c) => { if (d.length < 65536) d += c; });
      res.on('end', () => { try { resolve({ status: res.statusCode, json: JSON.parse(d) }); } catch { resolve({ status: res.statusCode, json: null }); } });
    });
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.on('error', () => resolve(null));
  });
}
const baseUrl = (url) => url.replace(/\/+$/, '');
async function probeHealth(url) { const r = await _get(baseUrl(url) + '/api/health'); return r && r.status < 400 ? r.json : null; }
async function fetchManifest(url) { const r = await _get(baseUrl(url) + '/api/manifest'); return r && r.status < 400 ? r.json : null; }

module.exports = { probeHealth, fetchManifest };
