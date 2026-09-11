'use strict';
// Build-helper-specific issue-tracker glue over the SHARED kit connectors (platform-kit/connectors).
// Connector descriptors, the credential store, and Jira primitives all live in the kit. This file
// keeps only what's build-helper-specific: per-app credential overrides, release-note task collection
// from git, and the "Mobile Release" write path.
const { readConfig, sendJson } = require('./state');
const { basicAuth, apiGet } = require('./net');
const { gitChangelog } = require('./project');
const C = require('../../platform-kit').connectors;
const { TRACKERS, trackerById, extractKeys, formatTasks, jiraBase, adf, jiraMeta, jiraAttach, createIssue, getConnector, readStore, saveConnector } = C;

// Per-app override wins over the shared store — same idiom as apple/play accounts.
function resolveTracker(id, projectPath) {
  const cfg = readConfig();
  const perApp = (cfg.trackerAccounts?.[projectPath] || {})[id];
  return getConnector(id, perApp && Object.values(perApp).some((v) => String(v || '').trim()) ? perApp : null);
}
function configuredTrackers(projectPath) {
  return TRACKERS.map((t) => ({ t, conn: resolveTracker(t.id, projectPath) })).filter((x) => x.conn && Object.values(x.conn).some((v) => String(v || '').trim()));
}
// Parse issue keys from commits since the last build, enrich via configured trackers. Never throws.
async function collectTasks(projectPath, env) {
  try {
    const text = gitChangelog(projectPath, env);
    const configured = configuredTrackers(projectPath);
    if (!text || !configured.length) return { count: 0, items: [], text: '' };
    const assigned = new Map();
    for (const c of configured) for (const k of extractKeys(text, c.t.keyRegex)) if (!assigned.has(k)) assigned.set(k, c);
    const byTracker = new Map();
    for (const [k, c] of assigned) { if (!byTracker.has(c)) byTracker.set(c, []); byTracker.get(c).push(k); }
    const items = [];
    for (const [c, keys] of byTracker) { let en; try { en = await c.t.enrich(c.conn, keys); } catch { en = keys.map((k) => ({ key: k })); } for (const it of en) items.push({ tracker: c.t.id, ...it }); }
    items.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
    return { count: items.length, items, text: formatTasks(items) };
  } catch { return { count: 0, items: [], text: '' }; }
}

// ---------- Jira write path (create a "Mobile Release" work item) — build-helper specific ----------
async function handleCreateRelease(req, res, body) {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  const send = (e, d) => res.write(`event: ${e}\ndata: ${JSON.stringify(d)}\n\n`);
  const log = (line) => send('log', { line });
  try {
    const conn = resolveTracker('jira', body.path);
    if (!conn || !conn.token) throw new Error('Jira not configured (Setup → Jira).');
    const b = jiraBase(conn);
    const h = { Authorization: basicAuth(conn.email, conn.token) };
    send('step', { text: 'Reading Jira project + fields…' });
    const meta = await jiraMeta(conn);
    if (!meta.ok) throw new Error(meta.error || 'Could not read Jira project metadata.');
    const fields = { project: { key: meta.projectKey }, issuetype: { id: meta.issueTypeId }, summary: (body.summary || 'Mobile Release').slice(0, 250) };
    if (body.description) fields.description = adf(body.description);
    if (body.assignMe && meta.me && meta.me.accountId) fields.assignee = { id: meta.me.accountId };
    const vals = body.fields || {}; const setFields = [];
    for (const k of ['devVersion', 'demoVersion', 'prodVersion', 'storeUrl', 'buildNumber', 'releaseNotes', 'releaseDate']) {
      const fm = meta.fieldMap[k]; const v = (vals[k] == null ? '' : String(vals[k])).trim();
      if (!fm || !v) continue;
      fields[fm.id] = fm.doc ? adf(v) : v; setFields.push(k);
    }
    send('step', { text: 'Creating issue…' });
    const cr = await apiGet(`${b}/rest/api/3/issue`, h, 'POST', JSON.stringify({ fields }));
    if (cr.status >= 300 || !cr.json || !cr.json.key) throw new Error(`Create failed (${cr.status}): ${(cr.body || '').slice(0, 300)}`);
    const key = cr.json.key; const url = `${b}/browse/${key}`;
    log(`✓ created ${key}`);
    if (body.pngBase64) { send('step', { text: 'Attaching card image…' }); try { const st = await jiraAttach(conn, key, body.pngBase64, body.filename); log(st < 300 ? '✓ image attached' : `image attach failed (${st})`); } catch (e) { log('image attach failed: ' + e.message); } }
    for (const lk of (body.linkKeys || [])) {
      if (!lk) continue;
      try { const r = await apiGet(`${b}/rest/api/3/issueLink`, h, 'POST', JSON.stringify({ type: { name: 'Relates' }, inwardIssue: { key }, outwardIssue: { key: lk } })); log(r.status < 300 ? `✓ linked ${lk}` : `link ${lk} failed (${r.status})`); } catch (e) { log(`link ${lk} failed: ${e.message}`); }
    }
    send('done', { ok: true, key, url, setFields, missing: meta.missing });
  } catch (e) { send('error', { message: e.message }); }
  res.end();
}
// Create a plain Jira issue inline from the build page — resolve the per-app connection, delegate to the shared primitive.
async function handleCreateIssue(res, body) {
  try {
    const conn = resolveTracker('jira', body.path);
    const r = await createIssue(conn, { summary: body.summary, issueType: body.issueType, description: body.description });
    return sendJson(res, 200, r);
  } catch (e) { return sendJson(res, 200, { ok: false, error: e.message }); }
}

module.exports = {
  jiraBase, TRACKERS, trackerById, resolveTracker, configuredTrackers, collectTasks,
  jiraMeta, handleCreateRelease, handleCreateIssue, readStore, saveConnector,
};
