'use strict';
// Post-build distribution actions: rollback (re-promote a stored Play versionCode) and retry-upload
// (re-run one upload target for a past build without rebuilding).
const fs = require('fs');
const path = require('path');
const { ARTIFACTS_DIR, BUILDS_JSON, readJson, writeJson, readConfig } = require('../state');
const { run, rc } = require('../shell');
const { detectApp } = require('../project');
const { promoteToPlayTrack, uploadToPlay, uploadToTestFlight, uploadToFirebase } = require('../stores');

async function handleRollback(req, res, body) {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  const send = (e, d) => res.write(`event: ${e}\ndata: ${JSON.stringify(d)}\n\n`);
  const log = (line) => send('log', { line });
  try {
    const app = detectApp(body.path);
    if (!body.versionCode) throw new Error('No stored Play versionCode for this build.');
    send('step', { text: `Promote versionCode ${body.versionCode} → ${body.track}` });
    await promoteToPlayTrack(app, body.versionCode, body.track || 'internal', log);
    send('done', { ok: true });
  } catch (e) { send('error', { message: e.message }); }
  res.end();
}

async function handleRetryUpload(req, res, body) {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  const log = (line) => send('log', { line });
  try {
    const { path: projectPath, artifactName, target } = body;
    const app = detectApp(projectPath);
    const RCLONE = require('../state').RCLONE;
    const file = path.join(ARTIFACTS_DIR, app.name, artifactName || '');
    if (!artifactName || !fs.existsSync(file)) throw new Error('Artifact not found — it may have been deleted. Rebuild instead.');
    send('step', { text: `Retry ${target} — ${artifactName}` });
    if (target === 'onedrive') {
      const cfg = readConfig();
      await run(RCLONE, rc(['copy', file, `${cfg.onedrive.remote}:${cfg.onedrive.base}/${app.name}/`, '--progress']), projectPath, log);
    } else if (target === 'play') {
      await uploadToPlay(app, file, body.track || 'internal', body.notes || '', log);
    } else if (target === 'testflight') {
      const m = /([\d.]+)\+(\d+)\.[^.]+$/.exec(artifactName || '');
      await uploadToTestFlight(app, file, m?.[1] || '', m?.[2] || '', false, body.notes || '', log);
    } else if (target === 'firebase') {
      await uploadToFirebase(app, file, body.notes || '', log);
    } else throw new Error('Unknown target ' + target);
    const hist = readJson(BUILDS_JSON, []);
    const rec = hist.find((b) => b.path === projectPath && (b.artifacts || []).some((a) => a.name === artifactName));
    if (rec) { rec.upload = rec.upload || {}; rec.upload[target] = 'ok'; writeJson(BUILDS_JSON, hist); }
    log(`retry ${target}: ok ✓`); send('done', { ok: true });
  } catch (e) { send('error', { message: e.message }); }
  res.end();
}

module.exports = { handleRollback, handleRetryUpload };
