'use strict';
// Shared singletons: path constants, config access, the running-build tracker, and the SSE
// activity feed. All local state lives under ~/.mobile-devtools/build-helper/ (via the kit's
// dataDir) — nothing is written into the repo and there are no accounts/sessions.
const fs = require('fs');
const path = require('path');
const os = require('os');
const { dataDir, readJson, writeJson } = require('../../platform-kit');

const ID = 'build-helper';
const DATA = dataDir(ID);                    // ~/.mobile-devtools/build-helper
const ROOT = path.join(__dirname, '..');     // the tool's repo dir (git self-version + public/)
const PORT = process.env.PORT || 4095;
const FLUTTER = process.env.FLUTTER_BIN || 'flutter';
const RCLONE = process.env.RCLONE_BIN || 'rclone';
const ONEDRIVE_REMOTE = process.env.ONEDRIVE_REMOTE || 'onedrive';
const ONEDRIVE_BASE = process.env.ONEDRIVE_BASE || 'Mobile apps';
const CONFIG_JSON = path.join(DATA, 'config.json');
const BUILDS_JSON = path.join(DATA, 'builds.json');
const CREDS_DIR = path.join(DATA, 'creds');   // generated keystores, play SA, email groups
const ARTIFACTS_DIR = path.join(DATA, 'artifacts');
const LOGS_DIR = path.join(DATA, 'logs');
const CHANGELOGS_DIR = path.join(DATA, 'changelogs');

const LOGICAL_ENVS = ['dev', 'demo', 'qa', 'prod'];

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function readConfig() {
  const c = readJson(CONFIG_JSON, {});
  c.onedrive = c.onedrive || { remote: ONEDRIVE_REMOTE, base: ONEDRIVE_BASE };
  if (['BuildHelper', 'MobileApps'].includes(c.onedrive.base)) c.onedrive.base = 'Mobile apps'; // migrate old defaults
  return c;
}
function writeConfig(c) { writeJson(CONFIG_JSON, c); }
function projectsRoot() { return readConfig().root || process.env.FLUTTER_PROJECTS || path.join(os.homedir(), 'mobileApps'); }

// ---------- running-build tracker (for Stop + one-at-a-time lock) ----------
const running = { children: new Set(), aborted: false, busy: false, info: null, log: [], seq: 0 };
function stopRunning() {
  running.aborted = true;
  for (const c of running.children) { try { c.kill('SIGTERM'); } catch {} }
}

// ---------- live activity feed (SSE broadcast to all tabs, with replay buffer) ----------
const feedClients = new Set();
const feedHistory = []; // last ~30 pre-serialized SSE messages, replayed to new clients
function broadcast(event, data) {
  const msg = `event: ${event}\ndata: ${JSON.stringify({ ...data, time: new Date().toISOString() })}\n\n`;
  feedHistory.push(msg);
  if (feedHistory.length > 30) feedHistory.shift();
  for (const r of feedClients) { try { r.write(msg); } catch {} }
}

function sendJson(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

module.exports = {
  ID, DATA, ROOT, PORT, FLUTTER, RCLONE, ONEDRIVE_REMOTE, ONEDRIVE_BASE,
  CONFIG_JSON, BUILDS_JSON, CREDS_DIR, ARTIFACTS_DIR, LOGS_DIR, CHANGELOGS_DIR, LOGICAL_ENVS,
  readJson, writeJson, esc, readConfig, writeConfig, projectsRoot,
  running, stopRunning, feedClients, feedHistory, broadcast, sendJson,
};
