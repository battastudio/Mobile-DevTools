'use strict';
// Shared credential store for issue-tracker connectors. Configured once (hub → Connectors),
// so EVERY tool reads/writes the same set. Lives at ~/.mobile-devtools/connectors/config.json.
const path = require('path');
const { dataDir, readJson, writeJson } = require('../store');
const { trackerById } = require('./trackers');

const STORE = path.join(dataDir('connectors'), 'config.json');
function readStore() { const s = readJson(STORE, null); return s && s.trackers ? s : { trackers: {} }; }
function writeStore(s) { writeJson(STORE, s); }

// Effective connection for a connector: an explicit per-context override wins, else the global store.
function getConnector(id, override) { return override || readStore().trackers[id] || null; }

// Save/clear a connector. Blank field keeps the saved value (a blank password won't wipe a token); all-blank clears.
function saveConnector(id, patch) {
  const def = trackerById(id); if (!def) throw new Error('Unknown connector: ' + id);
  const s = readStore(); const prev = s.trackers[id] || {};
  let any = false; const conn = {};
  for (const [name] of def.fields) { const v = String((patch || {})[name] ?? '').trim(); if (v) any = true; conn[name] = v || prev[name] || ''; }
  if (!any) { delete s.trackers[id]; writeStore(s); return { cleared: true }; }
  s.trackers[id] = conn; writeStore(s); return { ok: true };
}

// One-time carry-over from a tool's legacy per-app config into the shared store. Idempotent (flag-guarded),
// so a connector the user later deletes from the store won't be resurrected. Never throws.
function seedFromLegacy(legacyTrackers) {
  try {
    const s = readStore();
    if (s.migratedFromLegacy) return;
    for (const [id, conn] of Object.entries(legacyTrackers || {})) { if (trackerById(id) && !s.trackers[id]) s.trackers[id] = conn; }
    s.migratedFromLegacy = true;
    writeStore(s);
  } catch {}
}

// UI-facing descriptors (no functions): id/label/authHint/fields for generic field rendering.
function publicDefs() { const { TRACKERS } = require('./trackers'); return TRACKERS.map((t) => ({ id: t.id, label: t.label, authHint: t.authHint, fields: t.fields })); }
// Which connectors have a saved, non-empty global connection (for status dots).
function configuredIds() { const tr = readStore().trackers; return Object.keys(tr).filter((id) => Object.values(tr[id] || {}).some((v) => String(v || '').trim())); }

module.exports = { readStore, getConnector, saveConnector, seedFromLegacy, publicDefs, configuredIds };
