'use strict';
// platform-kit server spine — the reusable, zero-dependency HTTP core every Mobile DevTools tool
// is built on. There is NO auth: the tools run locally, so there is no login gate and every
// handler receives user=null. A tool does:
//   const app = createKitServer({ id, name, defaultPort, publicDir, dataDir, manifest });
//   app.r('GET', '/api/foo', ({ res }) => app.sendJson(res, 200, {...}));
//   app.start();
const http = require('http');
const path = require('path');
const fs = require('fs');
const { spawn, execFileSync } = require('child_process');
const { fetchUrl, ensurePath, sendJson, html, sse, readBody, serveFile, gitSha, KIT_PUBLIC } = require('./http-util');

const openBrowser = (url) => {
  const cmd = process.platform === 'darwin' ? 'open' : 'xdg-open';
  try { spawn(cmd, [url], { detached: true, stdio: 'ignore' }).unref(); } catch {}
};

function createKitServer(opts) {
  ensurePath();
  const { id, name, publicDir, dataDir, repoDir = process.cwd() } = opts;
  const defaultPort = parseInt(process.env.PORT, 10) || opts.defaultPort || 4090;
  const routes = new Map();
  const r = (method, pathname, handler, o = {}) => routes.set(`${method} ${pathname}`, { handler, opts: o });
  let chosenPort = defaultPort;

  // manifest can be an object or a () => object; version is always the live git SHA.
  const manifest = () => {
    const base = typeof opts.manifest === 'function' ? opts.manifest() : (opts.manifest || {});
    return { id, name, version: gitSha(repoDir), port: chosenPort, ...base };
  };
  r('GET', '/api/health', ({ res }) => sendJson(res, 200, { ok: true, id, version: gitSha(repoDir), port: chosenPort }));
  r('GET', '/api/manifest', ({ res }) => sendJson(res, 200, manifest()));

  const server = http.createServer((req, res) => { Promise.resolve().then(() => route(req, res)).catch((e) => { try { if (!res.headersSent) sendJson(res, 500, { error: e.message }); else res.end(); } catch {} }); });

  async function route(req, res) {
    const u = new URL(req.url, `http://localhost:${chosenPort}`);
    const q = u.searchParams;
    res.setHeader('Access-Control-Allow-Origin', '*'); // hub/peer tools call across ports on localhost
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
    const entry = routes.get(`${req.method} ${u.pathname}`);
    if (entry) {
      let body;
      if (entry.opts.body) { const raw = await readBody(req); try { body = JSON.parse(raw || '{}'); } catch (e) { return sendJson(res, 400, { error: 'invalid JSON: ' + e.message }); } }
      return entry.handler({ req, res, u, q, body, user: null });
    }
    // prefix routes registered by the tool (e.g. '/api/proxy/')
    for (const [key, v] of routes) { const [m, p] = key.split(' '); if (v.opts.prefix && req.method === m && u.pathname.startsWith(p)) { let body; if (v.opts.body) { try { body = JSON.parse((await readBody(req)) || '{}'); } catch { body = {}; } } return v.handler({ req, res, u, q, body, user: null }); } }
    // static: /kit/* → shared kit assets; everything else → tool's public dir
    if (req.method === 'GET' && u.pathname.startsWith('/kit/')) return serveFile(res, KIT_PUBLIC, u.pathname.slice('/kit/'.length) || 'kit.js');
    if (req.method === 'GET' && (u.pathname === '/' || u.pathname.startsWith('/css/') || u.pathname.startsWith('/js/') || u.pathname.startsWith('/assets/')))
      return serveFile(res, publicDir, u.pathname === '/' ? 'index.html' : u.pathname);
    res.writeHead(404); res.end('not found');
  }

  // ---- self-healing startup (reuse a live instance, reclaim a zombie port, or move up) ----
  const portFile = () => path.join(dataDir || repoDir, '.port');
  const writePortFile = (p) => { try { fs.mkdirSync(path.dirname(portFile()), { recursive: true }); fs.writeFileSync(portFile(), String(p)); } catch {} };
  const probeHttp = (port) => new Promise((resolve) => { const req = http.get({ host: '127.0.0.1', port, path: '/api/health', timeout: 1500 }, (res) => { res.resume(); resolve(true); }); req.on('timeout', () => { req.destroy(); resolve(false); }); req.on('error', () => resolve(false)); });
  const reclaimPort = (port) => { try { const pids = execFileSync('lsof', ['-ti', `:${port}`]).toString().trim().split(/\s+/).filter(Boolean); let k = 0; for (const pid of pids) { const n = +pid; if (n && n !== process.pid) { try { process.kill(n, 'SIGTERM'); k++; } catch {} } } return k > 0; } catch { return false; } };

  async function start(basePort = defaultPort) {
    const interactive = !!process.stdout.isTTY;
    const listen = (p) => new Promise((resolve, reject) => { const onErr = (e) => { server.removeListener('error', onErr); reject(e); }; server.once('error', onErr); server.listen(p, () => { server.removeListener('error', onErr); resolve(p); }); });
    const ok = (p, note) => { chosenPort = p; writePortFile(p); console.log(`${name} → http://localhost:${p}${note ? ' ' + note : ''}`); server.on('error', (e) => console.error('server error:', e.message)); if (opts.onListen) try { opts.onListen(p); } catch {} };
    try { await listen(basePort); return ok(basePort); } catch (e) { if (e.code !== 'EADDRINUSE') throw e; }
    if (await probeHttp(basePort)) { console.log(`${name} already running → http://localhost:${basePort}`); if (interactive) openBrowser(`http://localhost:${basePort}`); return process.exit(0); }
    if (reclaimPort(basePort)) { await new Promise((rs) => setTimeout(rs, 600)); try { await listen(basePort); if (interactive) openBrowser(`http://localhost:${basePort}`); return ok(basePort, '(reclaimed)'); } catch (e) { if (e.code !== 'EADDRINUSE') throw e; } }
    for (let p = basePort + 1; p <= basePort + 20; p++) { try { await listen(p); if (interactive) openBrowser(`http://localhost:${p}`); return ok(p, `(port ${basePort} busy)`); } catch (e) { if (e.code !== 'EADDRINUSE') throw e; } }
    console.error(`Could not bind ${basePort}..${basePort + 20}.`); process.exit(1);
  }

  return { r, sse, html, sendJson, readBody, serveFile, server, start, manifest, gitSha, id, name, dataDir, get port() { return chosenPort; } };
}

module.exports = { createKitServer, sendJson, html, sse, gitSha, ensurePath, fetchUrl, KIT_PUBLIC };
