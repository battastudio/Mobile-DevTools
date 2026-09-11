'use strict';
// Local child-process launcher for the hub. `node serve` spawns each tool's server.js on its
// fixed port and this tracks the handles so the hub can report status and stop/restart them.
// No launchd, no services, no pairing — the tools live for as long as the hub process runs.
const { spawn } = require('child_process');
const http = require('http');
const { toolDir, hasTool } = require('./registry');

const procs = new Map(); // id -> { child, port, startedAt }

// Spawn a tool if it isn't already ours. Inherits stdout/stderr so its logs stream to the hub console.
function startTool(t) {
  if (procs.has(t.id)) return procs.get(t.id);
  if (!hasTool(t.id)) return null; // tool folder not present yet — skip quietly
  const child = spawn(process.execPath, ['server.js'], {
    cwd: toolDir(t.id),
    env: { ...process.env, PORT: String(t.port) },
    stdio: ['ignore', 'inherit', 'inherit'],
  });
  child.on('exit', () => { if (procs.get(t.id)?.child === child) procs.delete(t.id); });
  const rec = { child, port: t.port, startedAt: Date.now() };
  procs.set(t.id, rec);
  return rec;
}
function stopTool(id) { const r = procs.get(id); if (!r) return false; try { r.child.kill('SIGTERM'); } catch {} procs.delete(id); return true; }
function stopAll() { for (const id of [...procs.keys()]) stopTool(id); }

// Is a tool answering on its port? (It may be one we spawned, or one the user started by hand.)
const probe = (port) => new Promise((resolve) => {
  const req = http.get({ host: '127.0.0.1', port, path: '/api/health', timeout: 1200 }, (res) => { res.resume(); resolve(res.statusCode === 200); });
  req.on('timeout', () => { req.destroy(); resolve(false); });
  req.on('error', () => resolve(false));
});
async function status(t) { return { id: t.id, port: t.port, running: await probe(t.port), managed: procs.has(t.id), present: hasTool(t.id) }; }

module.exports = { startTool, stopTool, stopAll, status, probe };
