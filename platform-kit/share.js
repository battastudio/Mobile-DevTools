'use strict';
// Local activity log + machine identity. Open-source edition: everything stays on this machine —
// there is no cloud sync and no team server. Reports are attributed to the local profile / OS user,
// and each tool keeps a small local JSONL feed of recent results (shown in its Activity view).
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { dataDir, readJson, writeJson } = require('./store');

// Stable local identity for report attribution.
function whoami() {
  const cfgFile = path.join(dataDir('shared'), 'identity.json');
  let id = readJson(cfgFile, null);
  if (!id) { id = { user: os.userInfo().username || 'user' }; writeJson(cfgFile, id); }
  return id;
}

// Canonical project key = git origin slug (stable across folder renames), else the folder name.
function projectKey(projectPath) {
  try {
    const remote = execFileSync('git', ['-C', projectPath, 'remote', 'get-url', 'origin'], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    const slug = remote.replace(/\.git$/, '').replace(/\/+$/, '').split(/[/:]/).filter(Boolean).pop();
    if (slug) return slug;
  } catch {}
  return path.basename(projectPath);
}

// Append a result to this tool's local activity feed.
function pushRecord(toolId, record, opts = {}) {
  const file = path.join(dataDir(toolId), 'activity.jsonl');
  const line = JSON.stringify({ ...record, by: opts.by || whoami().user, at: new Date(opts.now || Date.now()).toISOString() }) + '\n';
  try { fs.appendFileSync(file, line); return { ok: true }; } catch (e) { return { ok: false, reason: e.message }; }
}

// Read this tool's local activity feed, newest first.
function pullTeam(toolId) {
  const file = path.join(dataDir(toolId), 'activity.jsonl');
  const out = [];
  try {
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      try { out.push(JSON.parse(line)); } catch {}
    }
  } catch {}
  out.sort((a, b) => (b.at || '').localeCompare(a.at || ''));
  return { available: true, records: out.slice(0, 200) };
}

module.exports = { whoami, projectKey, pushRecord, pullTeam };
