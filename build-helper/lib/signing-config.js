'use strict';
// Local signing / credentials config — the open-source replacement for the old central "vault"
// client. Instead of fetching certs from a company server, this reads a git-ignored signing.json
// that just POINTS at files already on your machine: the Android keystore + key.properties, the
// Apple App Store Connect .p8, the Google Play service-account JSON, and per-flavor baseUrl +
// distribution targets. Nothing is uploaded or fetched — everything stays local.
//
// Looked up (first found wins): build-helper/signing.json (next to signing.example.json,
// git-ignored) then ~/.mobile-devtools/build-helper/signing.json. Copy signing.example.json to
// signing.json and fill in your paths. Per-app overrides in the Setup UI still take precedence.
const fs = require('fs');
const path = require('path');
const { DATA } = require('./state');

const CANDIDATES = [path.join(__dirname, '..', 'signing.json'), path.join(DATA, 'signing.json')];

function readSigning() {
  for (const p of CANDIDATES) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch {} }
  return {};
}

// Android release-signing file locations (absolute paths). {} when unset.
function androidSigning() { const a = readSigning().android || {}; return { keystore: a.keystore || '', keyProperties: a.keyProperties || a.keyProps || '' }; }
// Global Apple ASC account (keyId/issuerId + .p8 path), or null when signing.json has no apple block.
function appleAuth() { const a = readSigning().apple; return a && a.keyId && a.issuerId ? { keyId: a.keyId, issuerId: a.issuerId, p8: a.p8 || a.p8Path || '' } : null; }
// Global Google Play account ({ saPath, defaultTrack }), or null when unset.
function playAccount() { const p = readSigning().play; const saPath = p && (p.serviceAccount || p.saPath); return saPath ? { saPath, defaultTrack: p.defaultTrack || 'internal' } : null; }
// Per-flavor { baseUrl, dist } (dist = { onedrive, firebase, play, testflight } destinations). {} when unset.
function flavorTarget(flavor) { return (readSigning().flavors || {})[flavor] || {}; }

function demo() {
  const assert = require('assert');
  // Shape-only checks against an inline sample (no disk / no network).
  const s = { android: { keystore: '/k.jks', keyProperties: '/key.properties' }, apple: { keyId: 'A', issuerId: 'B', p8: '/x.p8' }, play: { serviceAccount: '/sa.json', defaultTrack: 'beta' }, flavors: { dev: { baseUrl: 'https://d', dist: { onedrive: 'x' } } } };
  const orig = fs.readFileSync;
  fs.readFileSync = (p, e) => (String(p).endsWith('signing.json') ? JSON.stringify(s) : orig(p, e));
  try {
    assert.strictEqual(androidSigning().keystore, '/k.jks');
    assert.deepStrictEqual(appleAuth(), { keyId: 'A', issuerId: 'B', p8: '/x.p8' });
    assert.strictEqual(playAccount().saPath, '/sa.json');
    assert.strictEqual(playAccount().defaultTrack, 'beta');
    assert.strictEqual(flavorTarget('dev').baseUrl, 'https://d');
  } finally { fs.readFileSync = orig; }
  console.log('signing-config demo ok');
}

module.exports = { readSigning, androidSigning, appleAuth, playAccount, flavorTarget, demo };

if (require.main === module) demo();
