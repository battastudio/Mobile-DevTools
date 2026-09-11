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

function scanProjects(root) {
  let ents; try { ents = fs.readdirSync(root, { withFileTypes: true }); } catch { return []; }
  const out = [];
  for (const e of ents) {
    if (!e.isDirectory()) continue;
    const p = path.join(root, e.name);
    if (!fs.existsSync(path.join(p, 'pubspec.yaml'))) continue;
    if (!fs.existsSync(path.join(p, 'lib'))) continue;
    const a = detectApp(p);
    out.push({ name: a.name, path: a.path, version: a.version, currentMode: a.currentMode, modes: Object.keys(a.modes), needsConfig: a.needsConfig, firebase: !!a.firebase, hasIcon: !!findAppIcon(p) });
  }
  return out.sort((x, y) => x.name.localeCompare(y.name));
}

module.exports = { findAppIcon, scanProjects };
