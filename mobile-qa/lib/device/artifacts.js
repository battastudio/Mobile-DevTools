'use strict';
// Artifact store — screenshots / recordings / logs saved under
// ~/.mobile-devtools/mobile-qa/artifacts/<app>/. Also the path guard (safeArtifact) + mime lookup
// the routes use to serve/delete/attach files without escaping the artifacts root.
const fs = require('fs');
const path = require('path');
const { dataDir } = require('../../../platform-kit');

const TOOL_ID = 'mobile-qa';
const keyFor = (projectPath) => (path.basename(projectPath || 'app') || 'app').replace(/[^\w.-]/g, '_');
function artifactRoot() { return path.join(dataDir(TOOL_ID), 'artifacts'); }
function artDir(projectPath) { const d = path.join(artifactRoot(), keyFor(projectPath)); fs.mkdirSync(d, { recursive: true }); return d; }
const stamp = (d) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}${String(d.getSeconds()).padStart(2, '0')}`;
const artUrl = (file) => `/api/qa/artifact?path=${encodeURIComponent(file)}`;

function listArtifacts(projectPath) {
  const d = artDir(projectPath); let ents = [];
  try { ents = fs.readdirSync(d).map((n) => { const fp = path.join(d, n); const st = fs.statSync(fp); return { name: n, path: fp, url: artUrl(fp), size: st.size, at: st.mtime.toISOString(), kind: /\.(png|jpg)$/i.test(n) ? 'image' : /\.(mp4|mov)$/i.test(n) ? 'video' : 'log' }; }); } catch {}
  return ents.sort((a, b) => (a.at < b.at ? 1 : -1));
}
// Resolve + guard a path: only ok if it lives inside the artifacts root and exists.
function safeArtifact(p) { const abs = path.resolve(p || ''); return abs.startsWith(path.resolve(artifactRoot())) && fs.existsSync(abs) ? abs : null; }
const mimeOf = (p) => { const e = path.extname(p).toLowerCase(); return e === '.png' ? 'image/png' : e === '.jpg' || e === '.jpeg' ? 'image/jpeg' : (e === '.mp4' || e === '.mov') ? 'video/mp4' : 'application/octet-stream'; };

module.exports = { keyFor, artifactRoot, artDir, stamp, artUrl, listArtifacts, safeArtifact, mimeOf };
