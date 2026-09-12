'use strict';
// OneDrive distribution via rclone, using the USER'S OWN rclone config (~/.config/rclone).
// Single-user, local only: we never ship, fetch, or import a central/company rclone.conf.
// ponytail: dropped the team "shared-folder / own-account → owner's folder" Graph mode from the
// internal build. To re-add multi-user upload, resolve a share link to drive/item ids via Microsoft
// Graph and write drive_id/root_folder_id into the rclone remote, as before.
const { execFileSync } = require('child_process');
const { RCLONE, readConfig, writeConfig } = require('./state');
const { run, which, rc } = require('./shell');

// Is the configured OneDrive remote present in the user's own rclone config?
function onedriveConnected() {
  if (!which(RCLONE)) return false;
  try { return execFileSync(RCLONE, rc(['listremotes'])).toString().includes(`${readConfig().onedrive.remote}:`); } catch { return false; }
}

async function ensureRclone(log) {
  if (which(RCLONE)) { if (log) log('rclone already installed.'); return; }
  if (!which('brew')) throw new Error('Homebrew not found. Install it from https://brew.sh, then retry — or run `brew install rclone` in Terminal.');
  if (log) log('Installing rclone (Homebrew)…');
  await run('brew', ['install', 'rclone'], process.cwd(), log);
}

// Connect OneDrive: rclone opens the system browser for OAuth and writes the remote into the user's
// own rclone config. No shared credentials, no central account.
async function handleSetupRclone(req, res) {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  const log = (line) => send('log', { line });
  const cfg = readConfig();
  try {
    await ensureRclone(log);
    send('step', { text: 'Connecting OneDrive — a browser window will open for login…' });
    await run(RCLONE, rc(['config', 'create', cfg.onedrive.remote, 'onedrive']), process.cwd(), log);
    writeConfig(cfg);
    log('OneDrive connected ✓');
    send('done', { ok: true });
  } catch (e) { send('error', { message: e.message }); }
  res.end();
}

// Shared/team-folder mode: connect your OWN OneDrive account, then route uploads into a team folder
// the owner shared with you. Add the shared folder to "My files" (OneDrive → shared → "Add shortcut
// to My files") so it appears under your drive at a plain path — then enter that path as the base.
// ponytail: path-based (needs the shortcut). Full share-link → drive_id/root_folder_id resolution via
// Microsoft Graph (the old team mode) can replace this if link-only sharing must work.
async function handleSetupRcloneShared(req, res, body) {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  const log = (line) => send('log', { line });
  const cfg = readConfig();
  try {
    const base = String((body || {}).base || '').trim();
    if (!base) throw new Error('Enter the shared/team folder path (as it appears under your OneDrive).');
    await ensureRclone(log);
    send('step', { text: 'Connecting your OneDrive — a browser window will open for login…' });
    await run(RCLONE, rc(['config', 'create', cfg.onedrive.remote, 'onedrive']), process.cwd(), log);
    cfg.onedrive.base = base; writeConfig(cfg);
    log(`OneDrive connected ✓ — uploads will go to "${base}".`);
    send('done', { ok: true, base });
  } catch (e) { send('error', { message: e.message }); }
  res.end();
}

module.exports = { onedriveConnected, ensureRclone, handleSetupRclone, handleSetupRcloneShared };
