'use strict';
// Global Setup: connector status + save handlers (Play, Apple, trackers, Firebase, notifications,
// email). Credential file-writers are shared with per-app App Setup. Global Apple/Play defaults can
// also come from signing.json (see signing-config) — the Setup UI saves override into config.json.
const fs = require('fs');
const path = require('path');
const os = require('os');
const { which } = require('./shell');
const { CREDS_DIR, RCLONE, readConfig, writeConfig, projectsRoot, sendJson } = require('./state');
const { profileName } = require('./project');
const { TRACKERS, readStore, saveConnector } = require('./trackers');
const { emailConfigured } = require('./messaging');
const { onedriveConnected } = require('./onedrive');
const { appleAuth, playAccount, androidSigning } = require('./signing-config');

const KEYSTORE_DIR = path.join(CREDS_DIR, 'keystores');

function setupStatus() {
  const cfg = readConfig();
  const gPlay = playAccount(); const gApple = appleAuth();
  const cfgPlaySet = !!(cfg.play && cfg.play.saPath && fs.existsSync(cfg.play.saPath));
  const playSet = cfgPlaySet || !!(gPlay && fs.existsSync(gPlay.saPath));
  let playEmail = ''; const saP = cfgPlaySet ? cfg.play.saPath : (gPlay && gPlay.saPath); if (saP) { try { playEmail = JSON.parse(fs.readFileSync(saP, 'utf8')).client_email || ''; } catch {} }
  const n = cfg.notify || {};
  let keystores = []; try { keystores = fs.readdirSync(KEYSTORE_DIR).filter((f) => f.endsWith('.jks')); } catch {}
  if (androidSigning().keystore) keystores.push(path.basename(androidSigning().keystore));
  return {
    rcloneInstalled: which(RCLONE), onedriveConnected: onedriveConnected(), onedriveBase: cfg.onedrive.base,
    play: playSet, playEmail, playTrack: (cfg.play && cfg.play.defaultTrack) || (gPlay && gPlay.defaultTrack) || 'internal',
    apple: !!(gApple || (cfg.apple && cfg.apple.keyId)), appleKeyId: (cfg.apple && cfg.apple.keyId) || (gApple && gApple.keyId) || '',
    firebaseCli: which('firebase'),
    notify: !!(n.slackWebhook || (n.telegramToken && n.telegramChatId)), slackWebhook: n.slackWebhook || '', telegramChatId: n.telegramChatId || '',
    email: emailConfigured(cfg.email), emailMode: cfg.email?.mode || 'smtp', emailProvider: cfg.email?.provider || 'resend', hasEmailKey: !!cfg.email?.apiKey,
    emailHost: cfg.email?.host || '', emailPort: cfg.email?.port || 465, emailUser: cfg.email?.user || '', emailFrom: cfg.email?.from || '', emailFromName: cfg.email?.fromName || '',
    firebaseApps: cfg.firebaseApps || {},
    trackers: (() => { const tr = readStore().trackers; return Object.fromEntries(TRACKERS.map((t) => [t.id, !!(tr[t.id] && Object.values(tr[t.id]).some((v) => String(v || '').trim()))])); })(),
    trackerConfigs: readStore().trackers,
    trackerDefs: TRACKERS.map((t) => ({ id: t.id, label: t.label, authHint: t.authHint, fields: t.fields })),
    keystores, root: projectsRoot(), profileName: profileName(),
  };
}

// Shared credential file-writers (reused by global Setup and per-app App Setup).
function writeAppleP8(keyId, p8) {
  const dir = path.join(os.homedir(), '.appstoreconnect', 'private_keys');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `AuthKey_${keyId}.p8`), p8.trim() + '\n');
}
function writePlaySa(saPath, serviceAccountJson) {
  const sa = JSON.parse(serviceAccountJson);
  if (!sa.client_email || !sa.private_key) throw new Error('JSON is missing client_email / private_key.');
  fs.mkdirSync(path.dirname(saPath), { recursive: true });
  fs.writeFileSync(saPath, JSON.stringify(sa, null, 2));
}

function handleSetupPlay(res, body) {
  try {
    const saPath = path.join(CREDS_DIR, 'play-sa.json');
    writePlaySa(saPath, body.serviceAccountJson);
    const cfg = readConfig(); cfg.play = { saPath, defaultTrack: (body.defaultTrack || 'internal').trim() }; writeConfig(cfg);
    return sendJson(res, 200, { ok: true });
  } catch (e) { return sendJson(res, 400, { error: e.message }); }
}
function handleSetupApple(res, body) {
  try {
    const keyId = (body.keyId || '').trim(), issuerId = (body.issuerId || '').trim();
    if (!keyId || !issuerId || !body.p8) throw new Error('Key ID, Issuer ID and the .p8 contents are all required.');
    writeAppleP8(keyId, body.p8);
    const cfg = readConfig(); cfg.apple = { keyId, issuerId }; writeConfig(cfg);
    return sendJson(res, 200, { ok: true });
  } catch (e) { return sendJson(res, 400, { error: e.message }); }
}
// Save one issue-tracker connector's config to the SHARED kit store. Blank field keeps the saved value.
function handleSetupTracker(res, body) {
  try { return sendJson(res, 200, { ok: true, ...saveConnector(body.id, body) }); } catch (e) { return sendJson(res, 400, { error: e.message }); }
}
async function handleSetupFirebaseLogin(req, res) {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  const { run } = require('./shell');
  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  const log = (line) => send('log', { line });
  try {
    if (!which('firebase')) { send('step', { text: 'Installing firebase-tools (npm)…' }); await run('npm', ['i', '-g', 'firebase-tools'], process.cwd(), log); } else log('firebase-tools already installed.');
    send('step', { text: 'Opening browser to log in to Firebase…' });
    await run('firebase', ['login', '--no-localhost'], process.cwd(), log);
    log('Firebase login ✓'); send('done', { ok: true });
  } catch (e) { send('error', { message: e.message }); }
  res.end();
}
function handleSetupFirebaseApp(res, body) {
  try {
    const p = body.path, appId = (body.appId || '').trim(), groups = (body.groups || '').trim();
    if (!p || !fs.existsSync(p)) throw new Error('Unknown project path.');
    if (!appId) throw new Error('Firebase App ID is required.');
    const cfg = readConfig(); cfg.firebaseApps = cfg.firebaseApps || {}; cfg.firebaseApps[p] = { appId, groups }; writeConfig(cfg);
    return sendJson(res, 200, { ok: true });
  } catch (e) { return sendJson(res, 400, { error: e.message }); }
}
function handleSetupNotify(res, body) {
  try {
    const cfg = readConfig();
    cfg.notify = { slackWebhook: (body.slackWebhook || '').trim(), telegramToken: (body.telegramToken || '').trim(), telegramChatId: (body.telegramChatId || '').trim() };
    writeConfig(cfg); return sendJson(res, 200, { ok: true });
  } catch (e) { return sendJson(res, 400, { error: e.message }); }
}
// Email connector save (SMTP or API provider).
function handleSetupEmail(res, body) {
  try {
    const cfg = readConfig(); const prev = cfg.email || {};
    const pass = (body.pass || '').trim(), apiKey = (body.apiKey || '').trim();
    const mode = body.mode === 'api' ? 'api' : 'smtp';
    const email = {
      mode, provider: ['resend', 'sendgrid', 'postmark'].includes(body.provider) ? body.provider : (prev.provider || 'resend'),
      host: (body.host || '').trim(), port: parseInt(body.port, 10) || 465,
      user: (body.user || '').trim(), pass: pass || prev.pass || '', apiKey: apiKey || prev.apiKey || '',
      from: (body.from || body.user || '').trim(), fromName: (body.fromName || '').trim(),
    };
    if (emailConfigured(email)) { cfg.email = email; writeConfig(cfg); return sendJson(res, 200, { ok: true }); }
    const empty = mode === 'api' ? (!email.apiKey && !email.from) : (!email.host && !email.user);
    if (empty) { delete cfg.email; writeConfig(cfg); return sendJson(res, 200, { ok: true, cleared: true }); }
    return sendJson(res, 200, { ok: false, error: mode === 'api' ? 'Enter an API key and a From address.' : 'Enter the SMTP host and your email/username.' });
  } catch (e) { return sendJson(res, 400, { error: e.message }); }
}

module.exports = {
  setupStatus, writeAppleP8, writePlaySa, KEYSTORE_DIR,
  handleSetupPlay, handleSetupApple, handleSetupTracker, handleSetupFirebaseLogin, handleSetupFirebaseApp, handleSetupNotify, handleSetupEmail,
};
