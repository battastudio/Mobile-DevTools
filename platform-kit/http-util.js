'use strict';
// Stateless HTTP helpers shared by the kit server and tools: read-only URL fetch, PATH bootstrap,
// JSON/HTML/SSE responders, safe static file serving, and the git-SHA version stamp.
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const zlib = require('zlib');
const { execFileSync } = require('child_process');

const KIT_PUBLIC = path.join(__dirname, 'public');

// Fetch a URL (read-only), transparently decompressing gzip/br/deflate.
// Resolves { status, headers, body, bytes, ms, error? } — never rejects.
function fetchUrl(urlStr, opts = {}) {
  return new Promise((resolve) => {
    let u; try { u = new URL(urlStr); } catch { return resolve({ error: 'bad url' }); }
    const mod = u.protocol === 'http:' ? http : https;
    const t0 = Date.now();
    const req = mod.request(u, { method: opts.method || 'GET', headers: { 'User-Agent': 'MobileDevTools/1.0', 'Accept-Encoding': 'gzip, br, deflate', ...(opts.headers || {}) }, timeout: opts.timeout || 12000, rejectUnauthorized: false }, (res) => {
      const chunks = []; let bytes = 0; const cap = opts.maxBytes || 900000;
      res.on('data', (c) => { bytes += c.length; if (chunks.length < 4000) chunks.push(c); if (bytes > cap * 4) res.destroy(); });
      res.on('end', () => {
        let buf = Buffer.concat(chunks); const enc = (res.headers['content-encoding'] || '').toLowerCase();
        try { if (enc === 'gzip') buf = zlib.gunzipSync(buf); else if (enc === 'br') buf = zlib.brotliDecompressSync(buf); else if (enc === 'deflate') buf = zlib.inflateSync(buf); } catch {}
        resolve({ status: res.statusCode, headers: res.headers, body: buf.toString('utf8').slice(0, cap), bytes, ms: Date.now() - t0 });
      });
    });
    req.on('timeout', () => { req.destroy(); resolve({ error: 'timeout', ms: Date.now() - t0 }); });
    req.on('error', (e) => resolve({ error: e.message }));
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

// A tool shelling out to flutter/dart/git needs a real PATH even when launched from a GUI/service
// with a minimal environment — add common tool dirs plus the user's login-shell PATH.
let _pathReady = false;
function ensurePath() {
  if (_pathReady) return; _pathReady = true;
  const has = (d) => (process.env.PATH || '').split(':').includes(d);
  const add = (d) => { if (d && fs.existsSync(d) && !has(d)) process.env.PATH = (process.env.PATH ? process.env.PATH + ':' : '') + d; };
  const HOME = process.env.HOME || os.homedir();
  for (const d of ['/opt/homebrew/bin', '/opt/homebrew/sbin', '/usr/local/bin',
    `${HOME}/development/flutter/bin`, `${HOME}/flutter/bin`, `${HOME}/fvm/default/bin`,
    `${HOME}/.fvm/default/bin`, '/opt/flutter/bin', `${HOME}/.puro/envs/default/bin`,
    `${HOME}/.pub-cache/bin`]) add(d);
  try {
    const shell = process.env.SHELL || '/bin/zsh';
    const out = execFileSync(shell, ['-lic', 'printf %s "$PATH"'], { timeout: 5000, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    for (const d of out.split(':')) add(d);
  } catch {}
}

const sendJson = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
const html = (res, body) => { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(body); };
const sse = (res) => {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  return (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
};
function readBody(req) { return new Promise((resolve) => { let d = ''; req.on('data', (c) => (d += c)); req.on('end', () => resolve(d)); }); }

const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json', '.map': 'application/json', '.woff2': 'font/woff2' };
function serveFile(res, baseDir, rel) {
  const abs = path.normalize(path.join(baseDir, rel));
  if (!abs.startsWith(baseDir + path.sep) || !fs.existsSync(abs) || !fs.statSync(abs).isFile()) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(abs)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  return fs.createReadStream(abs).pipe(res);
}
// Short git SHA of a repo dir — the version identity for every tool (no version files).
function gitSha(cwd) { try { return execFileSync('git', ['-C', cwd, 'rev-parse', '--short', 'HEAD'], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return 'dev'; } }

// Free a fixed port held by a stale/foreign process: SIGTERM whatever is bound to it (never our own
// PID). Returns true if it killed anything. Used to reclaim canonical ports from old/gated instances.
function reclaimPort(port) {
  try {
    const pids = execFileSync('lsof', ['-ti', `:${port}`]).toString().trim().split(/\s+/).filter(Boolean);
    let k = 0;
    for (const pid of pids) { const n = +pid; if (n && n !== process.pid) { try { process.kill(n, 'SIGTERM'); k++; } catch {} } }
    return k > 0;
  } catch { return false; }
}

module.exports = { fetchUrl, ensurePath, sendJson, html, sse, readBody, serveFile, gitSha, reclaimPort, MIME, KIT_PUBLIC };
