'use strict';
// Artifact naming + collection, and per-project/env build-number bookkeeping (from builds.json).
const fs = require('fs');
const path = require('path');
const os = require('os');
const { ARTIFACTS_DIR, BUILDS_JSON, readJson } = require('../state');

function lanIp() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) { for (const i of ifaces[name] || []) if (i.family === 'IPv4' && !i.internal) return i.address; }
  return 'localhost';
}
// <first2 of project>-<env>-<version>+<number>.<ext>  e.g. co-dev-1.0.0+16.apk
function friendlyName(appName, env, ext, buildName, buildNumber) {
  const first2 = appName.replace(/[^a-z0-9]/gi, '').slice(0, 2).toLowerCase() || 'ap';
  return `${first2}-${env}-${buildName}+${buildNumber}.${ext}`;
}
// Copy a freshly built artifact into artifacts/<project>/<friendly>. Returns {name, path}.
function collectArtifact(app, env, ext, srcPath, buildName, buildNumber) {
  const name = friendlyName(app.name, env, ext, buildName, buildNumber);
  const destDir = path.join(ARTIFACTS_DIR, app.name);
  fs.mkdirSync(destDir, { recursive: true });
  const dest = path.join(destDir, name);
  fs.copyFileSync(srcPath, dest);
  return { name, path: dest };
}
function usedBuildNumbers(projectPath, env) {
  return readJson(BUILDS_JSON, []).filter((b) => b.path === projectPath && b.env === env).map((b) => parseInt(b.buildNumber, 10)).filter((n) => !isNaN(n));
}
function nextBuildNumber(projectPath, env, pubspecNum) {
  return Math.max(pubspecNum || 0, 0, ...usedBuildNumbers(projectPath, env)) + 1;
}
// Size of the same artifact type in the most recent build of this project+env (for regression checks).
function lastArtifactSize(projectPath, env, art) {
  for (const b of readJson(BUILDS_JSON, [])) {
    if (b.path !== projectPath || b.env !== env) continue;
    const a = (b.artifacts || []).find((x) => x && x.art === art && x.size);
    if (a) return a.size;
  }
  return null;
}

module.exports = { lanIp, friendlyName, collectArtifact, usedBuildNumbers, nextBuildNumber, lastArtifactSize };
