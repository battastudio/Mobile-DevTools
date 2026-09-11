'use strict';
// Firebase App Distribution (APK/AAB → testers) + Crashlytics dSYM upload, via the firebase CLI.
const fs = require('fs');
const path = require('path');
const { readConfig } = require('../state');
const { run } = require('../shell');

async function uploadToFirebase(app, filePath, notes, log) {
  const fb = (readConfig().firebaseApps || {})[app.path];
  if (!fb || !fb.appId) throw new Error('Firebase App Distribution not configured for this app (Setup → Firebase).');
  const args = ['appdistribution:distribute', filePath, '--app', fb.appId];
  if (fb.groups) args.push('--groups', fb.groups);
  if (notes) args.push('--release-notes', notes);
  await run('firebase', args, app.path, log);
  log('firebase: distributed to testers ✓');
}

// Upload iOS dSYMs to Firebase Crashlytics (if firebase configured + dSYMs present).
async function uploadDsyms(app, log) {
  const fb = (readConfig().firebaseApps || {})[app.path];
  if (!fb || !fb.appId) { log('symbols: Firebase App ID not set — skipped'); return; }
  const archives = path.join(app.path, 'build', 'ios', 'archive');
  let dsymDir = null;
  for (const base of [archives, path.join(app.path, 'build', 'ios')]) {
    try { const found = fs.readdirSync(base, { withFileTypes: true }).find((e) => e.name.endsWith('.xcarchive')); if (found) { dsymDir = path.join(base, found.name, 'dSYMs'); break; } } catch {}
  }
  if (!dsymDir || !fs.existsSync(dsymDir)) { log('symbols: no dSYMs found — skipped'); return; }
  await run('firebase', ['crashlytics:symbols:upload', '--app', fb.appId, dsymDir], app.path, log);
  log('symbols: dSYMs uploaded to Crashlytics ✓');
}

module.exports = { uploadToFirebase, uploadDsyms };
