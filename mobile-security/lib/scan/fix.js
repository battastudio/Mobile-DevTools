'use strict';
// One-click deterministic fixes for the safe, reversible manifest/gradle/plist toggles only. Every
// write leaves a .bak beside the original. Nothing here is inferred from AI — pure string edits.
const fs = require('fs');
const path = require('path');
const { TOOL_ROOT } = require('./files');
const { gradleFile } = require('../project-lite');
const { readCache } = require('./store');

const FIXABLE = new Set(['cleartext-traffic', 'allow-backup', 'release-debuggable', 'ios-ats', 'network-security-config']);
function backupThenWrite(file, next, note) { fs.writeFileSync(file + '.bak', fs.readFileSync(file, 'utf8')); fs.writeFileSync(file, next); return { ok: true, note, backup: file + '.bak' }; }

function applyFix(projectPath, checkId) {
  if (!FIXABLE.has(checkId)) throw new Error('Not an auto-fixable check: ' + checkId);
  if (path.resolve(projectPath) === path.resolve(TOOL_ROOT)) throw new Error('Refusing to modify the security tool itself.');
  if (checkId === 'cleartext-traffic' || checkId === 'allow-backup') {
    const file = path.join(projectPath, 'android/app/src/main/AndroidManifest.xml');
    if (!fs.existsSync(file)) throw new Error('AndroidManifest.xml not found');
    const attr = checkId === 'cleartext-traffic' ? 'usesCleartextTraffic' : 'allowBackup';
    let x = fs.readFileSync(file, 'utf8'); const re = new RegExp(`android:${attr}\\s*=\\s*"[^"]*"`);
    x = re.test(x) ? x.replace(re, `android:${attr}="false"`) : x.replace(/<application\b/, `<application android:${attr}="false"`);
    return backupThenWrite(file, x, `Set android:${attr}="false"`);
  }
  if (checkId === 'ios-ats') {
    const file = path.join(projectPath, 'ios/Runner/Info.plist');
    if (!fs.existsSync(file)) throw new Error('Info.plist not found');
    let x = fs.readFileSync(file, 'utf8');
    if (/NSAllowsArbitraryLoads<\/key>\s*<true\/>/.test(x)) x = x.replace(/(NSAllowsArbitraryLoads<\/key>\s*)<true\/>/, '$1<false/>');
    else if (/NSAppTransportSecurity<\/key>/.test(x)) x = x.replace(/(<key>NSAppTransportSecurity<\/key>\s*<dict>)/, '$1\n\t\t<key>NSAllowsArbitraryLoads</key>\n\t\t<false/>');
    else x = x.replace(/<\/dict>\s*<\/plist>\s*$/, '\t<key>NSAppTransportSecurity</key>\n\t<dict>\n\t\t<key>NSAllowsArbitraryLoads</key>\n\t\t<false/>\n\t</dict>\n</dict>\n</plist>\n');
    return backupThenWrite(file, x, 'Set NSAllowsArbitraryLoads=false');
  }
  if (checkId === 'network-security-config') {
    const xmlDir = path.join(projectPath, 'android/app/src/main/res/xml');
    const xmlFile = path.join(xmlDir, 'network_security_config.xml');
    const manifest = path.join(projectPath, 'android/app/src/main/AndroidManifest.xml');
    if (!fs.existsSync(manifest)) throw new Error('AndroidManifest.xml not found');
    fs.mkdirSync(xmlDir, { recursive: true });
    fs.writeFileSync(xmlFile, `<?xml version="1.0" encoding="utf-8"?>\n<network-security-config>\n    <base-config cleartextTrafficPermitted="false">\n        <trust-anchors>\n            <certificates src="system" />\n        </trust-anchors>\n    </base-config>\n</network-security-config>\n`);
    let m = fs.readFileSync(manifest, 'utf8');
    if (!/android:networkSecurityConfig=/.test(m)) { m = m.replace(/<application\b/, '<application android:networkSecurityConfig="@xml/network_security_config"'); backupThenWrite(manifest, m, 'wired networkSecurityConfig'); }
    return { ok: true, note: 'Created network_security_config.xml (cleartext=false, system CAs only) and wired it into the manifest', backup: manifest + '.bak' };
  }
  // release-debuggable
  const file = gradleFile(projectPath);
  let g = fs.readFileSync(file, 'utf8');
  if (/debuggable\s+true/.test(g)) g = g.replace(/debuggable\s+true/, 'debuggable false');
  else if (/buildTypes\s*\{[\s\S]*?release\s*\{/.test(g)) g = g.replace(/(release\s*\{)/, '$1\n            debuggable false');
  else throw new Error('Could not locate release buildType in build.gradle');
  return backupThenWrite(file, g, 'Set release debuggable false');
}

// Bulk-apply every fixable failing/review finding on a scanned record.
function fixAll(projectPath) {
  const rec = readCache()[projectPath];
  if (!rec) throw new Error('No scan on record — scan the app first.');
  const targets = (rec.findings || []).filter((f) => FIXABLE.has(f.id) && (f.status === 'fail' || f.status === 'warn'));
  const applied = [], errors = [];
  for (const f of targets) { try { const r = applyFix(projectPath, f.id); applied.push({ id: f.id, note: r.note }); } catch (e) { errors.push({ id: f.id, error: e.message }); } }
  return { applied, errors };
}

module.exports = { FIXABLE, applyFix, fixAll };
