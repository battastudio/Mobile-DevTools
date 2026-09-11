'use strict';
// SBOM — software bill of materials: direct dependencies with versions + licenses + risk flags.
// Reads manifests (pubspec / package.json / composer.json) and node_modules for real npm licenses.
const fs = require('fs');
const path = require('path');

const RISKY_LICENSES = /GPL|AGPL|LGPL|SSPL|CC-BY-NC|BUSL|unknown/i;
function npmLicense(projectPath, name) {
  try { const pj = JSON.parse(fs.readFileSync(path.join(projectPath, 'node_modules', name, 'package.json'), 'utf8')); return (typeof pj.license === 'string' ? pj.license : pj.license?.type) || (pj.licenses && pj.licenses[0]?.type) || 'unknown'; } catch { return 'unknown'; }
}
function readJsonSafe(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } }

function buildSbom(projectPath) {
  const deps = [];
  const lock = fs.existsSync(path.join(projectPath, 'pubspec.lock')) ? fs.readFileSync(path.join(projectPath, 'pubspec.lock'), 'utf8') : '';
  if (lock) { const names = [...lock.matchAll(/^\s{2}([a-z0-9_]+):/gm)].map((m) => m[1]); const vers = {}; for (const m of lock.matchAll(/^\s{2}([a-z0-9_]+):[\s\S]*?version:\s*"?([\d.+\-a-z]+)"?/gm)) vers[m[1]] = m[2]; for (const n of new Set(names)) deps.push({ ecosystem: 'pub', name: n, version: vers[n] || '', license: 'see pub.dev' }); }
  const pkg = readJsonSafe(path.join(projectPath, 'package.json'));
  if (pkg) { const d = { ...pkg.dependencies, ...pkg.devDependencies }; for (const [name, version] of Object.entries(d)) deps.push({ ecosystem: 'npm', name, version: String(version).replace(/^[\^~]/, ''), license: npmLicense(projectPath, name) }); }
  const comp = readJsonSafe(path.join(projectPath, 'composer.json'));
  if (comp) { const d = { ...comp.require, ...comp['require-dev'] }; for (const [name, version] of Object.entries(d)) if (name !== 'php') deps.push({ ecosystem: 'composer', name, version: String(version), license: 'see packagist' }); }
  for (const d of deps) d.risk = RISKY_LICENSES.test(d.license) ? 'review' : 'ok';
  const flagged = deps.filter((d) => d.risk === 'review');
  deps.sort((a, b) => a.name.localeCompare(b.name));
  return { count: deps.length, ecosystems: [...new Set(deps.map((d) => d.ecosystem))], flagged: flagged.length, deps };
}
module.exports = { buildSbom };
