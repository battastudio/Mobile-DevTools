'use strict';
// App Store Connect API (ES256 JWT): request helpers, TestFlight deep links, build status, and
// the post-upload "manage" pass (export compliance + What-to-Test notes).
const { httpsRequest, appStoreConnectJwt } = require('../net');
const { iosBundleId } = require('../project');

async function ascReq(apple, method, apiPath, bodyObj) {
  const body = bodyObj ? JSON.stringify(bodyObj) : undefined;
  const headers = { Authorization: `Bearer ${appStoreConnectJwt(apple)}` };
  if (body) { headers['Content-Type'] = 'application/json'; headers['Content-Length'] = Buffer.byteLength(body); }
  const r = await httpsRequest({ method, hostname: 'api.appstoreconnect.apple.com', path: apiPath, headers }, body);
  return { status: r.status, json: (() => { try { return JSON.parse(r.body); } catch { return {}; } })(), body: r.body };
}
async function ascGet(apple, apiPath) {
  const r = await ascReq(apple, 'GET', apiPath);
  if (r.status !== 200) throw new Error(`ASC ${r.status}: ${(r.body || '').slice(0, 200)}`);
  return r.json;
}
// Device-openable TestFlight link: a beta group's public link if enabled, else the itms-beta deep link.
async function ascTfLink(apple, appId) {
  try {
    const g = await ascGet(apple, `/v1/apps/${appId}/betaGroups?fields[betaGroups]=publicLink&limit=50`);
    const pub = (g.data || []).map((x) => x.attributes.publicLink).find(Boolean);
    if (pub) return pub;
  } catch {}
  return `itms-beta://beta.itunes.apple.com/v1/app/${appId}`;
}
// Set export compliance + "What to Test" notes on a TestFlight build. Best-effort; polls for the build.
async function ascManageBuild(app, apple, buildNumber, notes, log) {
  try {
    if (!apple || !apple.keyId || !apple.issuerId) { if (log) log('TestFlight manage skipped — Apple not configured.'); return null; }
    const bundleId = iosBundleId(app.path);
    const apps = await ascGet(apple, `/v1/apps?filter[bundleId]=${encodeURIComponent(bundleId)}&fields[apps]=bundleId`);
    const appId = apps.data?.[0]?.id;
    if (!appId) { if (log) log('TestFlight manage: app not found in App Store Connect.'); return null; }
    const url = `https://appstoreconnect.apple.com/apps/${appId}/testflight/ios`;
    const tfLink = await ascTfLink(apple, appId);
    let buildId = null;
    for (let i = 0; i < 6 && !buildId; i++) {
      try { const r = await ascGet(apple, `/v1/builds?filter[app]=${appId}&filter[version]=${encodeURIComponent(buildNumber)}&limit=1&fields[builds]=version`); buildId = r.data?.[0]?.id; } catch {}
      if (!buildId) await new Promise((r) => setTimeout(r, 10000));
    }
    if (!buildId) { if (log) log('TestFlight manage: build not registered yet — retrying in the background.'); return { appId, url, tfLink, done: false }; }
    try {
      const r = await ascReq(apple, 'PATCH', `/v1/builds/${buildId}`, { data: { type: 'builds', id: buildId, attributes: { usesNonExemptEncryption: false } } });
      if (log) log(r.status < 300 ? '✓ TestFlight: export compliance set (no non-exempt encryption)' : `TestFlight compliance not set (ASC ${r.status})`);
    } catch (e) { if (log) log(`TestFlight compliance skipped: ${e.message}`); }
    if (notes && notes.trim()) {
      try {
        const locs = await ascGet(apple, `/v1/builds/${buildId}/betaBuildLocalizations?fields[betaBuildLocalizations]=locale`);
        const loc = (locs.data || []).find((l) => l.attributes.locale === 'en-US') || (locs.data || [])[0];
        let r;
        if (loc) r = await ascReq(apple, 'PATCH', `/v1/betaBuildLocalizations/${loc.id}`, { data: { type: 'betaBuildLocalizations', id: loc.id, attributes: { whatsNew: notes } } });
        else r = await ascReq(apple, 'POST', '/v1/betaBuildLocalizations', { data: { type: 'betaBuildLocalizations', attributes: { locale: 'en-US', whatsNew: notes }, relationships: { build: { data: { type: 'builds', id: buildId } } } } });
        if (log) log(r.status < 300 ? '✓ TestFlight: "What to Test" notes updated' : `TestFlight notes not set (ASC ${r.status})`);
      } catch (e) { if (log) log(`TestFlight notes skipped: ${e.message}`); }
    }
    return { appId, url, tfLink, done: true };
  } catch (e) { if (log) log(`TestFlight manage skipped: ${e.message}`); return null; }
}
// Fire-and-forget: set compliance + notes automatically, retrying while the build finishes processing.
function scheduleTestFlightManage(app, apple, buildNumber, notes) {
  const clog = (line) => { try { console.log(`[testflight ${app.name} ${buildNumber}] ${line}`); } catch {} };
  const delays = [0, 120000, 360000]; let i = 0;
  const attempt = async () => { const r = await ascManageBuild(app, apple, buildNumber, notes, clog).catch(() => null); if ((!r || r.done === false) && ++i < delays.length) setTimeout(attempt, delays[i]); };
  setTimeout(attempt, delays[0]);
}
// Best-effort: confirm the uploaded build + processing state, and build a TestFlight link. Never throws.
async function ascBuildStatus(app, apple, buildNumber) {
  const generic = { url: 'https://appstoreconnect.apple.com/apps' };
  try {
    if (!apple || !apple.keyId || !apple.issuerId) return generic;
    const bundleId = iosBundleId(app.path);
    const apps = await ascGet(apple, `/v1/apps?filter[bundleId]=${encodeURIComponent(bundleId)}&fields[apps]=bundleId`);
    const appId = apps.data?.[0]?.id;
    if (!appId) return generic;
    const url = `https://appstoreconnect.apple.com/apps/${appId}/testflight/ios`;
    const tfLink = await ascTfLink(apple, appId);
    try {
      const builds = await ascGet(apple, `/v1/builds?filter[app]=${appId}&filter[version]=${encodeURIComponent(buildNumber)}&limit=1&fields[builds]=version,processingState`);
      const b = builds.data?.[0];
      return { appId, url, tfLink, state: b ? b.attributes.processingState : null };
    } catch { return { appId, url, tfLink }; }
  } catch { return generic; }
}

module.exports = { ascReq, ascGet, ascTfLink, ascManageBuild, scheduleTestFlightManage, ascBuildStatus };
