'use strict';
// Shared "team" layer, open-source edition. There are no accounts, users, or sessions here —
// Mobile DevTools runs entirely on the local machine, so every permission check grants access.
// What remains is genuinely local and useful: a saved profile name (report attribution), the
// local activity log, and notification/email config. One register(app) call wires it all up.
// Config lives in ~/.mobile-devtools/<toolId>/config.json.
const path = require('path');
const { dataDir, readJson, writeJson } = require('./store');
const share = require('./share');
const messaging = require('./messaging');

const cfgFile = (id) => path.join(dataDir(id), 'config.json');
const readCfg = (id) => readJson(cfgFile(id), {});
const writeCfg = (id, patch) => { const c = readCfg(id); writeJson(cfgFile(id), { ...c, ...patch }); };

// Who a report is stamped "by": the tool's saved profile name, else the OS user.
function profileName(id) { const c = readCfg(id); return (c.profile && c.profile.name) || share.whoami().user; }
function setProfileName(id, name) { writeCfg(id, { profile: { name: String(name || '').trim() } }); }

// ---- open-mode permission stubs ----
// No auth means no gate: the server passes user=null and these all say "yes". They exist so the
// tools' `caps` maps and `authenticator`/`gate` wiring keep working untouched with zero users.
const authenticator = () => () => ({ user: null });
const gate = () => () => null;
const isAdmin = () => true;
const hasTool = () => true;
const can = () => true;
const effectiveCaps = () => '*';

// Register the shared team routes on a kit server (app = createKitServer(...)).
function register(app) {
  const id = app.id;
  const J = app.sendJson;

  // ---- activity log + profile ----
  app.r('GET', '/api/team', ({ res }) => J(res, 200, share.pullTeam(id)));
  app.r('GET', '/api/team/profile', ({ res }) => J(res, 200, { name: profileName(id), whoami: share.whoami() }));
  app.r('POST', '/api/team/profile', ({ res, body }) => { setProfileName(id, body.name); J(res, 200, { ok: true, name: profileName(id) }); }, { body: true });

  // ---- notifications (Slack / Telegram) ----
  app.r('GET', '/api/team/notify', ({ res }) => { const n = readCfg(id).notify || {}; J(res, 200, { slackWebhook: n.slackWebhook || '', telegramChatId: n.telegramChatId || '', hasTelegramToken: !!n.telegramToken, configured: messaging.notifyConfigured(n) }); });
  app.r('POST', '/api/team/notify', ({ res, body }) => {
    const prev = readCfg(id).notify || {};
    const n = { slackWebhook: String(body.slackWebhook ?? prev.slackWebhook ?? '').trim(), telegramToken: String(body.telegramToken || '').trim() || prev.telegramToken || '', telegramChatId: String(body.telegramChatId ?? prev.telegramChatId ?? '').trim() };
    writeCfg(id, { notify: n }); J(res, 200, { ok: true, configured: messaging.notifyConfigured(n) });
  }, { body: true });
  app.r('GET', '/api/team/notify/test', ({ res }) => { messaging.notify(readCfg(id).notify || {}, `✅ ${app.name} notifications are working.`).then((r) => J(res, 200, r.ok ? { ok: true, out: 'Sent' } : { ok: false, error: r.error || 'No channel configured — add a Slack webhook or Telegram token+chat.' })); });

  // ---- email (SMTP or API) ----
  app.r('GET', '/api/team/email', ({ res }) => { const em = readCfg(id).email || {}; J(res, 200, { mode: em.mode || 'smtp', provider: em.provider || 'resend', host: em.host || '', port: em.port || 465, user: em.user || '', from: em.from || '', fromName: em.fromName || '', hasKey: !!em.apiKey, hasPass: !!em.pass, configured: messaging.emailConfigured(em) }); });
  app.r('POST', '/api/team/email', ({ res, body }) => {
    const prev = readCfg(id).email || {};
    const em = { mode: body.mode || prev.mode || 'smtp', provider: body.provider || prev.provider || 'resend', host: String(body.host ?? prev.host ?? '').trim(), port: body.port || prev.port || 465, user: String(body.user ?? prev.user ?? '').trim(), pass: String(body.pass || '').trim() || prev.pass || '', apiKey: String(body.apiKey || '').trim() || prev.apiKey || '', from: String(body.from ?? prev.from ?? '').trim(), fromName: String(body.fromName ?? prev.fromName ?? '').trim() };
    writeCfg(id, { email: em }); J(res, 200, { ok: true, configured: messaging.emailConfigured(em) });
  }, { body: true });
  app.r('GET', '/api/team/email/test', ({ res }) => { messaging.emailTest(readCfg(id).email || {}, app.name).then((r) => J(res, 200, r)); });
}

module.exports = { register, authenticator, gate, hasTool, can, isAdmin, effectiveCaps, profileName, setProfileName, readCfg };
