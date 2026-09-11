'use strict';
// Side-effectful file layer for the scanner: bounded project file loading, grep helpers over the
// loaded arrays, and buildCtx() which reads a Flutter app's manifests + Dart source into a context
// object the pure checks read from. Isolating fs here keeps engine.js + the checks easy to reason about.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { gradleFile } = require('../project-lite');

const TOOL_ROOT = path.join(__dirname, '..', '..');   // this tool's own repo (never scan/modify it)

const readFileSafe = (p) => { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } };
const redact = (s) => { s = String(s || ''); return s.length <= 6 ? '••••' : s.slice(0, 6) + '…(' + s.length + ' chars)'; };
// Redact token-shaped strings from evidence before it is stored/returned.
const scrub = (s) => String(s || '').replace(/\b(eyJ[A-Za-z0-9._-]{10,}|Bearer\s+[A-Za-z0-9._-]{12,}|[A-Za-z0-9]{32,})\b/g, (m) => redact(m));

// Collect files with the given extensions under the given sub-dirs as {rel,text} (bounded so a giant
// repo can't hang). Skips vendored/build trees and files over 512 KB.
const SKIP_DIRS = new Set(['node_modules', 'vendor', '.git', 'build', '.dart_tool', 'Pods', '.symlinks', 'storage']);
function loadFiles(projectPath, dirs, exts, cap = 1500) {
  const out = []; const okExt = (n) => exts.some((e) => n.endsWith(e));
  const walk = (dir) => {
    let ents; try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      if (out.length > cap) return;
      if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) walk(path.join(dir, e.name)); continue; }
      const p = path.join(dir, e.name);
      if (okExt(e.name)) { try { if (fs.statSync(p).size < 524288) out.push({ rel: path.relative(projectPath, p), text: fs.readFileSync(p, 'utf8') }); } catch {} }
    }
  };
  for (const d of dirs) walk(path.join(projectPath, d));
  return out;
}
const loadLibFiles = (projectPath) => loadFiles(projectPath, ['lib'], ['.dart']);

// grep a loaded file array → [{file, line, text}] (first `cap` matches).
function grepFiles(files, re, cap = 5) {
  const hits = [];
  for (const f of files || []) {
    const lines = f.text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (re.test(lines[i])) { hits.push({ file: f.rel, line: i + 1, text: lines[i].trim().slice(0, 200) }); if (hits.length >= cap) return hits; }
      re.lastIndex = 0;
    }
  }
  return hits;
}
const grepLib = (ctx, re, cap = 5) => grepFiles(ctx.libFiles, re, cap);
const libHas = (ctx, re) => grepLib(ctx, re, 1).length > 0;
const fmtHits = (hits) => hits.map((h) => `  ${h.file}:${h.line}  ${h.text}`).join('\n');

// Locate MainActivity.(kt|java) so checks can grep native window flags (FLAG_SECURE, tapjacking).
function findMainActivity(projectPath) {
  const base = path.join(projectPath, 'android/app/src/main');
  for (const root of ['kotlin', 'java']) {
    let found = null;
    const walk = (d) => { let e; try { e = fs.readdirSync(d, { withFileTypes: true }); } catch { return; } for (const x of e) { const p = path.join(d, x.name); if (x.isDirectory()) walk(p); else if (/MainActivity\.(kt|java)$/.test(x.name)) found = p; } };
    walk(path.join(base, root)); if (found) return found;
  }
  return '';
}

// Run a dependency-audit command; return { out, error, unavailable }. Never throws.
function runAudit(cmd, args, cwd, timeout = 60000) {
  try { return { out: execFileSync(cmd, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'], timeout }).toString(), error: '' }; }
  catch (e) {
    const out = ((e.stdout || '') + (e.stderr || '')).toString();
    if (out) return { out, error: e.message };                    // tool ran, exited non-zero (findings) — keep output
    return { out: '', error: e.message || 'command failed', unavailable: true };
  }
}

// Read a Flutter app's manifests + Dart source into the context the checks read from.
function buildCtx(projectPath) {
  const ctx = {
    projectPath, type: 'flutter',
    isSelf: path.resolve(projectPath) === path.resolve(TOOL_ROOT),
    hasIos: fs.existsSync(path.join(projectPath, 'ios')),
    pubspec: readFileSafe(path.join(projectPath, 'pubspec.yaml')),
    manifest: readFileSafe(path.join(projectPath, 'android/app/src/main/AndroidManifest.xml')),
    gradle: readFileSafe(gradleFile(projectPath)),
    plist: readFileSafe(path.join(projectPath, 'ios/Runner/Info.plist')),
    libFiles: loadLibFiles(projectPath),
    googleServices: readFileSafe(path.join(projectPath, 'android/app/google-services.json')),
    iosGooglePlist: readFileSafe(path.join(projectPath, 'ios/Runner/GoogleService-Info.plist')),
  };
  // network security config: default path + whatever the manifest points at (@xml/foo → res/xml/foo.xml)
  const nscRef = (ctx.manifest.match(/android:networkSecurityConfig\s*=\s*"@xml\/([\w-]+)"/) || [])[1];
  ctx.netSecConfig = readFileSafe(path.join(projectPath, 'android/app/src/main/res/xml/network_security_config.xml'))
    || (nscRef ? readFileSafe(path.join(projectPath, `android/app/src/main/res/xml/${nscRef}.xml`)) : '');
  return ctx;
}

module.exports = { TOOL_ROOT, readFileSafe, redact, scrub, loadFiles, loadLibFiles, grepFiles, grepLib, libHas, fmtHits, findMainActivity, runAudit, buildCtx };
