'use strict';
// Minimal Flutter-project helpers the scanner needs: release-signing status (for the build-integrity
// checks) and a slim discovery of Flutter apps under a root. Node stdlib only.
const fs = require('fs');
const path = require('path');

function gradleFile(projectPath) {
  for (const f of ['android/app/build.gradle.kts', 'android/app/build.gradle']) {
    const p = path.join(projectPath, f); if (fs.existsSync(p)) return p;
  }
  return path.join(projectPath, 'android/app/build.gradle');
}
function signingStatus(projectPath) {
  const keyProps = path.join(projectPath, 'android', 'key.properties');
  const hasKeyProps = fs.existsSync(keyProps);
  const gf = gradleFile(projectPath), isKts = gf.endsWith('.kts');
  let gradleWired = false, keystore = null;
  try {
    const g = fs.readFileSync(gf, 'utf8');
    const usesRelease = /signingConfig\s+signingConfigs\.release/.test(g)
      || /signingConfig\s*=\s*signingConfigs\.(getByName\(\s*["']release["']\s*\)|release)/.test(g);
    gradleWired = /key\.properties/.test(g) && /signingConfigs/.test(g) && usesRelease;
  } catch {}
  if (hasKeyProps) { try { keystore = (/storeFile=(.+)/.exec(fs.readFileSync(keyProps, 'utf8')) || [])[1] || null; } catch {} }
  return { hasKeyProps, gradleWired, isKts, keystore };
}
// A Flutter app: a pubspec.yaml + a lib/ source dir.
const isFlutter = (p) => fs.existsSync(path.join(p, 'pubspec.yaml')) && fs.existsSync(path.join(p, 'lib'));

// List scannable Flutter apps directly under a root: { name, path, type:'flutter' }.
function discoverProjects(root) {
  let ents; try { ents = fs.readdirSync(root, { withFileTypes: true }); } catch { return []; }
  const out = [];
  for (const e of ents) {
    if (!e.isDirectory()) continue;
    const p = path.join(root, e.name);
    if (isFlutter(p)) out.push({ name: e.name, path: p, type: 'flutter' });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

module.exports = { gradleFile, signingStatus, isFlutter, discoverProjects };
