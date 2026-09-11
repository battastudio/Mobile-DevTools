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

module.exports = { onedriveConnected, ensureRclone, handleSetupRclone };
