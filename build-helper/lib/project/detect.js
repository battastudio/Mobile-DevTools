'use strict';
// App detection: find the AppMode const a Flutter app compiles, its defining file, the enum
// members, and merge user overrides from config.json (keyed by absolute project path).
const fs = require('fs');
const path = require('path');
const { LOGICAL_ENVS, readConfig } = require('../state');
const { repoName } = require('./git');

// Find the AppMode const the app ACTUALLY compiles: whatever lib/api/* compares to AppMode.
function detectConstName(projectPath) {
  const apiDir = path.join(projectPath, 'lib', 'api');
  const files = [];
  const walk = (d) => {
    let ents; try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.dart')) files.push(p);
    }
  };
  walk(apiDir);
  const re = /(\w+)\s*==\s*AppMode\.|AppMode\.\w+\s*==\s*(\w+)/;
  for (const f of files) {
    const m = re.exec(fs.readFileSync(f, 'utf8'));
    if (m) return m[1] || m[2];
  }
  return null;
}

// Find the .dart file under lib/ that DEFINES `const AppMode <name> = AppMode.<x>;`
function findDefiningFile(projectPath, constName) {
  const libDir = path.join(projectPath, 'lib');
  const declRe = new RegExp(`const\\s+AppMode\\s+${constName}\\s*=\\s*AppMode\\.(\\w+)\\s*;`);
  const hits = [];
  const walk = (d) => {
    if (hits.length >= 2) return;
    let ents; try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      if (hits.length >= 2) return;
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.dart')) { const m = declRe.exec(fs.readFileSync(p, 'utf8')); if (m) hits.push({ file: p, current: m[1] }); }
    }
  };
  walk(libDir);
  return hits;
}

// Read `enum AppMode { a, b, c }` members from a file's content.
function readEnumMembers(content) {
  const m = /enum\s+AppMode\s*\{([\s\S]*?)\}/.exec(content);
  if (!m) return [];
  return m[1].replace(/\/\/[^\n]*/g, '').split(',').map((s) => s.trim()).filter((s) => /^\w+$/.test(s));
}

// Map logical env (dev/demo/qa/prod) -> actual enum member (handles production/QA casing).
function mapModes(members) {
  const modes = {};
  for (const logical of LOGICAL_ENVS) {
    const hit = members.find((mem) => { const l = mem.toLowerCase(); return l === logical || (logical === 'prod' && l === 'production'); });
    if (hit) modes[logical] = hit;
  }
  return modes;
}

function firebaseConfig(projectPath) {
  const fb = path.join(projectPath, 'firebase');
  const files = { prodAndroid: 'google-services.json', prodIos: 'GoogleService-Info.plist', devAndroid: 'google-services-dev-demo.json', devIos: 'GoogleService-Info-dev-demo.plist' };
  for (const f of Object.values(files)) { if (!fs.existsSync(path.join(fb, f))) return null; } // partial/no firebase setup -> skip swap
  return files;
}

function readVersion(projectPath) {
  try { const m = /^version:\s*(.+)$/m.exec(fs.readFileSync(path.join(projectPath, 'pubspec.yaml'), 'utf8')); return m ? m[1].trim() : null; } catch { return null; }
}

// Full detection, merged with user overrides from config.json (gitignored), keyed by absolute path.
function detectApp(projectPath) {
  const ov = readConfig().apps?.[projectPath]?.override || {};
  const name = path.basename(projectPath);
  const version = readVersion(projectPath);
  let constName = ov.constName || detectConstName(projectPath);
  let envFile = ov.envFile ? path.join(projectPath, ov.envFile) : null;
  let current = null, members = [];
  if (constName) {
    const hits = findDefiningFile(projectPath, constName);
    if (envFile) { const found = hits.find((h) => h.file === envFile) || hits[0]; if (found) current = found.current; }
    else if (hits.length === 1) { envFile = hits[0].file; current = hits[0].current; }
    else if (hits.length > 1) envFile = null; // ambiguous defining file — need override
    if (envFile && fs.existsSync(envFile)) members = readEnumMembers(fs.readFileSync(envFile, 'utf8'));
  }
  let envs;
  if (ov.envs && ov.envs.length) { envs = ov.envs.filter((e) => e && e.key && e.mode); }
  else {
    const DEFAULT_ENV_COLOR = { dev: 'sky', demo: 'violet', qa: 'amber', prod: 'emerald' };
    envs = Object.entries(ov.modes || mapModes(members)).map(([k, m]) => ({ key: k, label: k.toUpperCase(), mode: m, color: DEFAULT_ENV_COLOR[k] || 'slate', prod: k === 'prod' }));
  }
  const modes = Object.fromEntries(envs.map((e) => [e.key, e.mode]));
  const firebase = ov.firebase !== undefined ? ov.firebase : firebaseConfig(projectPath);
  const needsConfig = !constName || !envFile || envs.length === 0;
  return { name, repo: repoName(projectPath), path: projectPath, version, constName, envFile: envFile ? path.relative(projectPath, envFile) : null, currentMode: current, modes, envs, members, firebase, needsConfig };
}

module.exports = { detectConstName, findDefiningFile, readEnumMembers, mapModes, firebaseConfig, readVersion, detectApp };
