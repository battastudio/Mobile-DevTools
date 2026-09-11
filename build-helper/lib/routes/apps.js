'use strict';
// Project + per-app routes: the dashboard payload, project list/detail, per-app config saves,
// health, git metadata, changelog, and the app icon image.
const fs = require('fs');
const { BUILDS_JSON, readJson, readConfig, projectsRoot } = require('../state');
const { dashboardData, handleAppSave, handleFavorite, handleReorder } = require('../dashboard');
const { detectApp, scanProjects, gitBranches, gitLastCommit, gitChangelog, groupConventional, nextBuildNumber, appHealth, findAppIcon } = require('../project');
const { setupStatus } = require('../setup');
const { TRACKERS, readStore } = require('../trackers');
const { appleAuth, playAccount } = require('../signing-config');

function register(app) {
  const J = app.sendJson;
  app.r('GET', '/api/dashboard', ({ res, q }) => J(res, 200, dashboardData(q.get('root'))));
  app.r('GET', '/api/projects', ({ res, q }) => { const root = q.get('root') || projectsRoot(); return J(res, 200, { root, projects: scanProjects(root) }); });
  app.r('GET', '/api/project', ({ res, q }) => {
    const p = q.get('path');
    if (!p || !fs.existsSync(p)) return J(res, 404, { error: 'not found' });
    const app2 = detectApp(p);
    const git = gitBranches(p);
    const builds = readJson(BUILDS_JSON, []).filter((b) => b.path === p).slice(0, 30);
    const pubNum = parseInt((app2.version || '').split('+')[1] || '0', 10);
    const nextBuildNumbers = {};
    for (const env of Object.keys(app2.modes)) nextBuildNumbers[env] = nextBuildNumber(p, env, pubNum);
    const cfg = readConfig();
    const firebaseApp = (cfg.firebaseApps || {})[p] || null;
    const settings = (cfg.apps || {})[p] || {};
    const apple = (cfg.appleAccounts || {})[p] || null;
    const pc = (cfg.playAccounts || {})[p] || null;
    let play = null; if (pc) { let email = ''; try { email = JSON.parse(fs.readFileSync(pc.saPath, 'utf8')).client_email || ''; } catch {} play = { defaultTrack: pc.defaultTrack, email }; }
    const trackerAccounts = (cfg.trackerAccounts || {})[p] || {};
    const storeTrackers = readStore().trackers;
    const globalTrackers = Object.fromEntries(TRACKERS.map((t) => [t.id, !!storeTrackers[t.id]]));
    const trackerDefs = TRACKERS.map((t) => ({ id: t.id, label: t.label, authHint: t.authHint, fields: t.fields }));
    const ss = setupStatus();
    return J(res, 200, { app: app2, git, builds, nextBuildNumbers, firebaseApp, settings, apple, play, globalApple: !!(cfg.apple?.keyId || appleAuth()), globalPlay: !!(cfg.play?.saPath || playAccount()), onedriveConnected: !!ss.onedriveConnected, firebaseCli: !!ss.firebaseCli, trackerAccounts, globalTrackers, trackerDefs, health: appHealth(p), hasIcon: !!findAppIcon(p) });
  });
  app.r('POST', '/api/app/save', ({ res, body }) => handleAppSave(res, body), { body: true });
  app.r('POST', '/api/app/favorite', ({ res, body }) => handleFavorite(res, body), { body: true });
  app.r('POST', '/api/app/order', ({ res, body }) => handleReorder(res, body), { body: true });
  app.r('GET', '/api/app/health', ({ res, q }) => { const p = q.get('path'); if (!p || !fs.existsSync(p)) return J(res, 404, { error: 'not found' }); return J(res, 200, appHealth(p)); });
  app.r('GET', '/api/gitmeta', ({ res, q }) => J(res, 200, gitLastCommit(q.get('path'), q.get('branch') || '') || {}));
  app.r('GET', '/api/changelog', ({ res, q }) => { const text = gitChangelog(q.get('path'), q.get('env')); return J(res, 200, { text: q.get('grouped') ? groupConventional(text) : text }); });
  app.r('GET', '/api/icon', ({ res, q }) => {
    const p = q.get('path'); const icon = p && fs.existsSync(p) ? findAppIcon(p) : null;
    if (!icon) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': 'image/png' });
    return fs.createReadStream(icon).pipe(res);
  });
}

module.exports = { register };
