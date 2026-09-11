'use strict';
// Marketing-version (CFBundleShortVersionString) helpers + App Store Connect version lookups.
const { ascGet } = require('./asc');
const { iosBundleId } = require('../project');

function verParts(v) { return String(v || '').trim().split('.').map((n) => parseInt(n, 10) || 0); }
function cmpVer(a, b) { const x = verParts(a), y = verParts(b), n = Math.max(x.length, y.length); for (let i = 0; i < n; i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d < 0 ? -1 : 1; } return 0; }
function maxVer(list) { return (list || []).filter(Boolean).reduce((m, v) => (m == null || cmpVer(v, m) > 0 ? v : m), null); }
function bumpPatch(v) { const p = verParts(v); if (!p.length) return '1.0.0'; p[p.length - 1] = (p[p.length - 1] || 0) + 1; return p.join('.'); }

// Highest marketing version already in App Store Connect (TestFlight pre-release + App Store), or null. Never throws.
async function ascHighestVersion(app, apple) {
  try {
    if (!apple || !apple.keyId || !apple.issuerId) return null;
    const bundleId = iosBundleId(app.path);
    const apps = await ascGet(apple, `/v1/apps?filter[bundleId]=${encodeURIComponent(bundleId)}&fields[apps]=bundleId`);
    const appId = apps.data?.[0]?.id;
    if (!appId) return null;
    const vers = [];
    try { const pre = await ascGet(apple, `/v1/apps/${appId}/preReleaseVersions?filter[platform]=IOS&limit=200&fields[preReleaseVersions]=version`); for (const d of (pre.data || [])) if (d.attributes?.version) vers.push(d.attributes.version); } catch {}
    try { const asv = await ascGet(apple, `/v1/apps/${appId}/appStoreVersions?limit=200&fields[appStoreVersions]=versionString`); for (const d of (asv.data || [])) if (d.attributes?.versionString) vers.push(d.attributes.versionString); } catch {}
    return maxVer(vers);
  } catch { return null; }
}
// Latest TestFlight build for the app's iOS bundle. { latest: {version, build, state, uploadedDate}|null, error? }. Never throws.
async function ascLatestBuild(app, apple) {
  if (!apple || !apple.keyId || !apple.issuerId) return { latest: null, error: 'Apple not configured' };
  const bundleId = iosBundleId(app.path);
  if (!bundleId) return { latest: null, error: 'No iOS app' };
  try {
    const apps = await ascGet(apple, `/v1/apps?filter[bundleId]=${encodeURIComponent(bundleId)}&fields[apps]=bundleId`);
    const appId = apps.data?.[0]?.id;
    if (!appId) return { latest: null, error: 'Not on App Store Connect' };
    const r = await ascGet(apple, `/v1/builds?filter[app]=${appId}&sort=-uploadedDate&limit=1&fields[builds]=version,uploadedDate,processingState,preReleaseVersion&include=preReleaseVersion&fields[preReleaseVersions]=version`);
    const b = r.data?.[0];
    if (!b) return { latest: null };
    const pre = (r.included || []).find((x) => x.type === 'preReleaseVersions');
    return { latest: { version: pre?.attributes?.version || null, build: b.attributes?.version || null, state: b.attributes?.processingState || null, uploadedDate: b.attributes?.uploadedDate || null } };
  } catch (e) {
    const status = (/ASC (\d+)/.exec(e.message || '') || [])[1];
    const friendly = status === '401' ? 'Sign-in failed — re-add your API key (App Setup → Apple).'
      : status === '403' ? 'This API key has no access to this app.'
      : status === '404' ? 'App not found on App Store Connect.' : (e.message || 'App Store Connect error');
    return { latest: null, error: friendly };
  }
}

module.exports = { verParts, cmpVer, maxVer, bumpPatch, ascHighestVersion, ascLatestBuild };
