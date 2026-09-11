'use strict';
// Local child-process launcher for the hub. `node serve` spawns each tool's server.js on its
// fixed port and this tracks the handles so the hub can report status and stop/restart them.
// No launchd, no services, no pairing — the tools live for as long as the hub process runs.
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { toolDir, hasTool } = require('./registry');
const { reclaimPort, dataDir } = require('../platform-kit');

const procs = new Map(); // id -> { child, port, startedAt }
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Spawn a tool if it isn't already ours. First reclaim its canonical port from any stale/gated
// instance so it binds the fixed port (never walking to +1 and showing an old login in the hub).
// HUB_CHILD tells the tool's spine not to open its own browser tab — only the hub opens one.
async function startTool(t) {
  if (procs.has(t.id)) return procs.get(t.id);
  if (!hasTool(t.id)) return null; // tool folder not present yet — skip quietly
  if (reclaimPort(t.port)) await wait(600); // let the freed socket release before the child binds
  const child = spawn(process.execPath, ['server.js'], {
    cwd: toolDir(t.id),
    env: { ...process.env, PORT: String(t.port), HUB_CHILD: '1' },
    stdio: ['ignore', 'inherit', 'inherit'],
  });
  child.on('exit', () => { if (procs.get(t.id)?.child === child) procs.delete(t.id); });
  const rec = { child, port: t.port, startedAt: Date.now() };
  procs.set(t.id, rec);
  return rec;
}
function stopTool(id) { const r = procs.get(id); if (!r) return false; try { r.child.kill('SIGTERM'); } catch {} procs.delete(id); return true; }
function stopAll() { for (const id of [...procs.keys()]) stopTool(id); }

// Read a tool's live /api/health identity from a port; null if nothing/other answers.
const health = (port) => new Promise((resolve) => {
  const req = http.get({ host: '127.0.0.1', port, path: '/api/health', timeout: 1200 }, (res) => { let d = ''; res.on('data', (c) => (d += c)); res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve(null); } }); });
  req.on('timeout', () => { req.destroy(); resolve(null); });
  req.on('error', () => resolve(null));
});
// The tool's real bound port: the spine writes it to <dataDir>/.port; fall back to the catalog port.
function realPort(t) { try { const p = parseInt(fs.readFileSync(path.join(dataDir(t.id), '.port'), 'utf8'), 10); if (p) return p; } catch {} return t.port; }

// Status the hub UI trusts: report the tool's ACTUAL port and only "running" when THIS tool answers
// there (a stale squatter has a different id → treated as not running, so the hub never iframes it).
async function status(t) {
  const port = realPort(t);
  const h = await health(port);
  return { id: t.id, port, running: !!(h && h.id === t.id), managed: procs.has(t.id), present: hasTool(t.id) };
}

module.exports = { startTool, stopTool, stopAll, status };
