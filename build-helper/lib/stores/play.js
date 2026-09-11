'use strict';
// Google Play Developer API: upload an .aab, roll it out to a track (+ optional ProGuard mapping),
// and re-promote an existing versionCode. Plain Play API over the built-in https client.
const fs = require('fs');
const path = require('path');
const { readJson, readConfig } = require('../state');
const { httpsRequest, googleAccessToken } = require('../net');
const { androidPackageId } = require('../project');
const { playAccount } = require('../signing-config');

// Shared Play API client for a package (token + helpers). Per-app account wins over signing.json's play.
async function playClient(app) {
  const cfg = readConfig();
  const pc = (cfg.playAccounts || {})[app.path] || playAccount();
  if (!pc || !pc.saPath) throw new Error('Google Play not configured (App Setup → Google Play, or signing.json play.serviceAccount).');
  const sa = readJson(pc.saPath, null);
  if (!sa || !sa.client_email || !sa.private_key) throw new Error('Invalid Play service-account JSON.');
  const pkg = androidPackageId(app.path);
  const token = await googleAccessToken(sa);
  const auth = { Authorization: `Bearer ${token}` };
  const base = 'androidpublisher.googleapis.com';
  const api = (method, p, headers, body) => httpsRequest({ method, hostname: base, path: p, headers: { ...auth, ...headers } }, body);
  const upload = (p, buf, ctype) => httpsRequest({ method: 'POST', hostname: base, path: p, headers: { ...auth, 'Content-Type': ctype, 'Content-Length': buf.length } }, buf);
  return { pkg, api, upload };
}

// Upload an .aab to Google Play and roll it out to a track. Returns the versionCode.
async function uploadToPlay(app, aabPath, track, whatsNew, log, opts = {}) {
  const { pkg, api, upload } = await playClient(app);
  log(`play: package ${pkg}, track ${track}`);
  let r = await api('POST', `/androidpublisher/v3/applications/${pkg}/edits`, {});
  if (r.status !== 200) throw new Error(`edits.insert (${r.status}): ${r.body}`);
  const editId = JSON.parse(r.body).id;

  const aab = fs.readFileSync(aabPath);
  log(`play: uploading ${(aab.length / 1e6).toFixed(1)} MB bundle…`);
  r = await upload(`/upload/androidpublisher/v3/applications/${pkg}/edits/${editId}/bundles?uploadType=media`, aab, 'application/octet-stream');
  if (r.status !== 200) throw new Error(`bundle upload (${r.status}): ${r.body}`);
  const versionCode = JSON.parse(r.body).versionCode;
  log(`play: uploaded versionCode ${versionCode}`);

  // Optional ProGuard mapping upload (crash deobfuscation) — same edit, before commit.
  if (opts.uploadSymbols) {
    const mapping = path.join(app.path, 'build/app/outputs/mapping/release/mapping.txt');
    if (fs.existsSync(mapping)) {
      const m = fs.readFileSync(mapping);
      const mr = await upload(`/upload/androidpublisher/v3/applications/${pkg}/edits/${editId}/deobfuscationFiles/${versionCode}/proguard?uploadType=media`, m, 'application/octet-stream');
      log(mr.status === 200 ? 'play: uploaded mapping.txt (deobfuscation) ✓' : `play: mapping upload failed (${mr.status})`);
    } else log('play: no mapping.txt (obfuscation off) — skipped');
  }

  const body = JSON.stringify({ track, releases: [Object.assign({ versionCodes: [String(versionCode)], status: 'completed' }, whatsNew ? { releaseNotes: [{ language: 'en-US', text: whatsNew }] } : {})] });
  r = await api('PUT', `/androidpublisher/v3/applications/${pkg}/edits/${editId}/tracks/${track}`, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }, body);
  if (r.status !== 200) throw new Error(`tracks.update (${r.status}): ${r.body}`);
  r = await api('POST', `/androidpublisher/v3/applications/${pkg}/edits/${editId}:commit`, {});
  if (r.status !== 200) throw new Error(`edits.commit (${r.status}): ${r.body}`);
  log(`play: committed to '${track}' ✓`);
  return versionCode;
}

// Re-promote an already-uploaded versionCode to a track (rollback / channel change) — no re-upload.
async function promoteToPlayTrack(app, versionCode, track, log) {
  const { pkg, api } = await playClient(app);
  let r = await api('POST', `/androidpublisher/v3/applications/${pkg}/edits`, {});
  if (r.status !== 200) throw new Error(`edits.insert (${r.status}): ${r.body}`);
  const editId = JSON.parse(r.body).id;
  const body = JSON.stringify({ track, releases: [{ versionCodes: [String(versionCode)], status: 'completed' }] });
  r = await api('PUT', `/androidpublisher/v3/applications/${pkg}/edits/${editId}/tracks/${track}`, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }, body);
  if (r.status !== 200) throw new Error(`tracks.update (${r.status}): ${r.body}`);
  r = await api('POST', `/androidpublisher/v3/applications/${pkg}/edits/${editId}:commit`, {});
  if (r.status !== 200) throw new Error(`edits.commit (${r.status}): ${r.body}`);
  log(`play: promoted versionCode ${versionCode} to '${track}' ✓`);
}

module.exports = { playClient, uploadToPlay, promoteToPlayTrack };
