'use strict';
// Slim project discovery — detects Flutter / Laravel / web front-end folders under a root.
// Mobile QA only surfaces Flutter projects, but the shared detectors stay so runProject can
// still name a project's type cleanly.
const fs = require('fs');
const path = require('path');
const isFlutter = (p) => fs.existsSync(path.join(p, 'pubspec.yaml')) && fs.existsSync(path.join(p, 'lib'));
const isLaravel = (p) => fs.existsSync(path.join(p, 'artisan')) && fs.existsSync(path.join(p, 'composer.json'));
const WEB_FW = ['next', 'nuxt', 'vite', 'react-dom', 'vue', '@angular/core', 'svelte', 'astro', 'gatsby', '@remix-run/react', 'solid-js'];
function readPkg(p) { try { return JSON.parse(fs.readFileSync(path.join(p, 'package.json'), 'utf8')); } catch { return null; } }
function isWeb(p) {
  if (isFlutter(p) || isLaravel(p)) return false;
  const pkg = readPkg(p);
  if (pkg) { const deps = { ...pkg.dependencies, ...pkg.devDependencies }; if (deps['react-native'] || deps['expo']) return false; if (WEB_FW.some((k) => deps[k])) return true; }
  return fs.existsSync(path.join(p, 'index.html')) && !!pkg;
}
function discoverProjects(root) {
  let ents; try { ents = fs.readdirSync(root, { withFileTypes: true }); } catch { return []; }
  const out = [];
  for (const e of ents) {
    if (!e.isDirectory()) continue;
    const p = path.join(root, e.name);
    const type = isLaravel(p) ? 'laravel' : isFlutter(p) ? 'flutter' : isWeb(p) ? 'web' : null;
    if (type) out.push({ name: e.name, path: p, type });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}
module.exports = { discoverProjects, isFlutter, isLaravel, isWeb, readPkg };
