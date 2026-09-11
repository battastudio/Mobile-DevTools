'use strict';
// Per-app config saves: env override, per-app Apple/Play/Firebase/tracker accounts, favorite, order.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { CREDS_DIR, readConfig, writeConfig, sendJson } = require('../state');
const { TRACKERS } = require('../trackers');
const { writeAppleP8, writePlaySa } = require('../setup');

function handleAppSave(res, body) {
  try {
    const p = body.path; if (!p || !fs.existsSync(p)) throw new Error('unknown project');
    const cfg = readConfig();
    if (body.override) { cfg.apps = cfg.apps || {}; cfg.apps[p] = { ...(cfg.apps[p] || {}), override: { ...(cfg.apps[p]?.override || {}), ...body.override } }; }
    if (body.firebaseApp) { cfg.firebaseApps = cfg.firebaseApps || {}; cfg.firebaseApps[p] = body.firebaseApp; }
    if (body.settings) { cfg.apps = cfg.apps || {}; cfg.apps[p] = { ...(cfg.apps[p] || {}), ...body.settings }; }
    // Per-app Apple TestFlight account
    if (body.apple) {
      cfg.appleAccounts = cfg.appleAccounts || {};
      if (body.apple.clear) delete cfg.appleAccounts[p];
      else {
        const keyId = (body.apple.keyId || '').trim(), issuerId = (body.apple.issuerId || '').trim();
        if (keyId && issuerId) { if (body.apple.p8) writeAppleP8(keyId, body.apple.p8); cfg.appleAccounts[p] = { keyId, issuerId }; }
      }
    }
    // Per-app Google Play account
    if (body.play) {
      cfg.playAccounts = cfg.playAccounts || {};
      if (body.play.clear) delete cfg.playAccounts[p];
      else {
        const saPath = path.join(CREDS_DIR, `play-sa-${crypto.createHash('md5').update(p).digest('hex').slice(0, 8)}.json`);
        if (body.play.serviceAccountJson && body.play.serviceAccountJson.trim()) { writePlaySa(saPath, body.play.serviceAccountJson); cfg.playAccounts[p] = { saPath, defaultTrack: (body.play.defaultTrack || 'internal').trim() }; }
        else if (cfg.playAccounts[p] && body.play.defaultTrack) cfg.playAccounts[p].defaultTrack = body.play.defaultTrack.trim();
      }
    }
    // Per-app issue-tracker accounts (override the global ones for this project)
    if (body.trackers && typeof body.trackers === 'object') {
      cfg.trackerAccounts = cfg.trackerAccounts || {};
      const acc = { ...(cfg.trackerAccounts[p] || {}) };
      for (const t of TRACKERS) {
        const inc = body.trackers[t.id];
        if (!inc) continue;
        if (inc.clear) { delete acc[t.id]; continue; }
        const prev = acc[t.id] || {}; let anyProvided = false; const conn = {};
        for (const [name] of t.fields) { const v = String(inc[name] ?? '').trim(); if (v) anyProvided = true; conn[name] = v || prev[name] || ''; }
        if (anyProvided) acc[t.id] = conn; else delete acc[t.id];
      }
      if (Object.keys(acc).length) cfg.trackerAccounts[p] = acc; else delete cfg.trackerAccounts[p];
    }
    writeConfig(cfg);
    return sendJson(res, 200, { ok: true });
  } catch (e) { return sendJson(res, 400, { error: e.message }); }
}
function handleFavorite(res, body) {
  const cfg = readConfig(); cfg.apps = cfg.apps || {};
  cfg.apps[body.path] = { ...(cfg.apps[body.path] || {}), favorite: !!body.favorite };
  writeConfig(cfg); return sendJson(res, 200, { ok: true });
}
function handleReorder(res, body) {
  const cfg = readConfig(); cfg.apps = cfg.apps || {};
  (body.paths || []).forEach((p, i) => { cfg.apps[p] = { ...(cfg.apps[p] || {}), order: i }; });
  writeConfig(cfg); return sendJson(res, 200, { ok: true });
}

module.exports = { handleAppSave, handleFavorite, handleReorder };
