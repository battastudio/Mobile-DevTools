'use strict';
// Share helpers: upload a build-card image to OneDrive, pre-create the OneDrive folder tree, and
// upload a generated card for a build. Single-user + local rclone (no team log to attach to).
const fs = require('fs');
const path = require('path');
const { ROOT, RCLONE, ARTIFACTS_DIR, readConfig, projectsRoot, sendJson } = require('../state');
const { run, captureCmd, rc } = require('../shell');
const { scanProjects, detectApp } = require('../project');

async function handleShareImage(req, res, body) {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  const send = (e, d) => res.write(`event: ${e}\ndata: ${JSON.stringify(d)}\n\n`);
  const log = (line) => send('log', { line });
  try {
    const b64 = (body.pngBase64 || '').replace(/^data:image\/png;base64,/, '');
    if (!b64) throw new Error('no image');
    const name = (body.filename || 'build-card.png').replace(/[^\w.+-]/g, '_');
    const tmp = path.join(ARTIFACTS_DIR, '_cards'); fs.mkdirSync(tmp, { recursive: true });
    const file = path.join(tmp, name);
    fs.writeFileSync(file, Buffer.from(b64, 'base64'));
    const cfg = readConfig();
    const dest = `${cfg.onedrive.remote}:${cfg.onedrive.base}/${(body.project || 'shared').replace(/[^\w.-]/g, '_')}/`;
    send('step', { text: `Uploading card → ${dest}` });
    await run(RCLONE, rc(['copy', file, dest, '--progress']), ROOT, log);
    log('card uploaded ✓'); send('done', { ok: true });
  } catch (e) { send('error', { message: e.message }); }
  res.end();
}

// Pre-create OneDrive folders for every project (repo-named) + each env inside.
async function handleMkdirs(req, res) {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  const send = (e, d) => res.write(`event: ${e}\ndata: ${JSON.stringify(d)}\n\n`);
  const log = (line) => send('log', { line });
  try {
    const cfg = readConfig();
    const base = `${cfg.onedrive.remote}:${cfg.onedrive.base}`;
    const mk = async (p) => { try { await run(RCLONE, rc(['mkdir', p]), ROOT, () => {}); log('✓ ' + p); } catch (e) { log('✖ ' + p + ' — ' + (e.message || '').split('\n')[0]); } };
    const projects = scanProjects(projectsRoot());
    log(`Creating folders for ${projects.length} project(s)…`);
    for (const pr of projects) {
      const a = detectApp(pr.path); const name = a.repo || a.name;
      const envs = Object.keys(a.modes || {});
      send('step', { text: `${name} (${envs.length} env)` });
      if (!envs.length) { log(`(${name}: no environments defined — skipped)`); continue; }
      for (const env of envs) await mk(`${base}/${name}/${env}`);
    }
    log('✓ done — folder tree ready'); send('done', { ok: true });
  } catch (e) { send('error', { message: e.message }); }
  res.end();
}

// Upload an auto-generated build card image to OneDrive and return a share link. body = {project, filename, pngBase64}
async function handleTeamCard(res, body) {
  try {
    const b64 = (body.pngBase64 || '').replace(/^data:image\/png;base64,/, '');
    if (!b64) return sendJson(res, 200, { ok: false, error: 'no image' });
    const cfg = readConfig();
    const tmp = path.join(ARTIFACTS_DIR, '_cards'); fs.mkdirSync(tmp, { recursive: true });
    const name = (body.filename || `card-${Date.now()}.png`).replace(/[^\w.+-]/g, '_');
    const file = path.join(tmp, name);
    fs.writeFileSync(file, Buffer.from(b64, 'base64'));
    let url = null;
    try {
      const dest = `${cfg.onedrive.remote}:${cfg.onedrive.base}/_cards/`;
      await captureCmd(RCLONE, rc(['copy', file, dest]), ROOT);
      try { url = (await captureCmd(RCLONE, rc(['link', dest + name]), ROOT)).trim() || null; } catch {}
    } catch {}
    return sendJson(res, 200, { ok: true, url });
  } catch (e) { return sendJson(res, 200, { ok: false, error: e.message }); }
}

module.exports = { handleShareImage, handleMkdirs, handleTeamCard };
