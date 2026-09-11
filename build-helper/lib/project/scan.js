'use strict';
// Project discovery: scan a root dir for Flutter projects, and find an app's launcher icon.
const fs = require('fs');
const path = require('path');
const { detectApp } = require('./detect');

// Largest android launcher icon for a project (nice visual on cards).
function findAppIcon(projectPath) {
  const res = path.join(projectPath, 'android', 'app', 'src', 'main', 'res');
  for (const d of ['mipmap-xxxhdpi', 'mipmap-xxhdpi', 'mipmap-xhdpi', 'mipmap-hdpi', 'mipmap-mdpi']) {
    for (const n of ['ic_launcher.png', 'ic_launcher_round.png', 'launcher_icon.png']) {
      const p = path.join(res, d, n);
      if (fs.existsSync(p)) return p;
    }
  }
  return null;
}

// Dirs that never contain a sibling app — pruned so recursive scans stay fast.
const PRUNE = new Set(['node_modules', '.dart_tool', 'build', '.git', 'ios', 'android', 'macos', 'windows', 'linux', 'web', '.symlinks', '.fvm', '.idea', 'Pods']);
const isFlutter = (p) => fs.existsSync(path.join(p, 'pubspec.yaml')) && fs.existsSync(path.join(p, 'lib'));

// One directory → the dashboard card projection, or null if it isn't a Flutter app.
function detectCard(p) {
  if (!isFlutter(p)) return null;
  const a = detectApp(p);
  return { name: a.name, path: a.path, version: a.version, currentMode: a.currentMode, modes: Object.keys(a.modes), needsConfig: a.needsConfig, firebase: !!a.firebase, hasIcon: !!findAppIcon(p) };
}

// Scan a root for Flutter apps. recursive → descend up to `depth` levels (a Flutter dir is a leaf).
function scanProjects(root, recursive, depth = 3) {
  let ents; try { ents = fs.readdirSync(root, { withFileTypes: true }); } catch { return []; }
  const out = [];
  for (const e of ents) {
    if (!e.isDirectory() || PRUNE.has(e.name) || e.name.startsWith('.')) continue;
    const p = path.join(root, e.name);
    const card = detectCard(p);
    if (card) out.push(card);
    else if (recursive && depth > 1) out.push(...scanProjects(p, true, depth - 1));
  }
  return out.sort((x, y) => x.name.localeCompare(y.name));
}

// Every card across all scan roots + pinned project paths, deduped by absolute path.
function scanAll(sources) {
  const { roots = [], pinned = [], recursive = false } = sources || {};
  const seen = new Set(); const out = [];
  for (const c of [...roots.flatMap((r) => scanProjects(r, recursive)), ...pinned.map(detectCard)]) {
    if (c && !seen.has(c.path)) { seen.add(c.path); out.push(c); }
  }
  return out;
}

module.exports = { findAppIcon, scanProjects, detectCard, scanAll };
