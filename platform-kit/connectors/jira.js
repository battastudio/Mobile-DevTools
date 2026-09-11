'use strict';
// Reusable Jira write primitives (any tool can compose these): ADF body, create-meta discovery,
// PNG attach, create issue, create-from-report, and the project / issue-type / search pickers.
const { httpsRequest, basicAuth, apiGet, jiraBase } = require('./net');

// Minimal Atlassian Document Format: one paragraph per line; bare URLs become links.
function adf(text) {
  const lines = String(text || '').split('\n');
  const content = lines.map((ln) => {
    const t = ln.replace(/\s+$/, '');
    if (!t) return { type: 'paragraph', content: [] };
    const isUrl = /^https?:\/\/\S+$/.test(t);
    const node = isUrl ? { type: 'text', text: t, marks: [{ type: 'link', attrs: { href: t } }] } : { type: 'text', text: t };
    return { type: 'paragraph', content: [node] };
  });
  return { type: 'doc', version: 1, content: content.length ? content : [{ type: 'paragraph', content: [] }] };
}
// Resolve project id + release issue-type id + a name→customfield map (auto-discovered). Never throws.
async function jiraMeta(conn) {
  const b = jiraBase(conn);
  const h = { Authorization: basicAuth(conn.email, conn.token) };
  const key = (conn.projectKey || '').trim();
  const typeName = (conn.issueType || 'Mobile Release').trim();
  const out = { ok: true, projectKey: key, issueType: typeName, projectId: null, issueTypeId: null, me: null, fields: [], byName: {}, fieldMap: {}, missing: [] };
  if (!key) return { ok: false, error: 'Set the Jira project key (e.g. JSW) in Setup → Jira.' };
  try { const me = await apiGet(`${b}/rest/api/3/myself`, h); if (me.status === 200) out.me = { accountId: me.json.accountId, displayName: me.json.displayName }; } catch {}
  try {
    const it = await apiGet(`${b}/rest/api/3/issue/createmeta/${encodeURIComponent(key)}/issuetypes?maxResults=100`, h);
    const types = it.json?.values || it.json?.issueTypes || [];
    const t = types.find((x) => (x.name || '').toLowerCase() === typeName.toLowerCase()) || types.find((x) => /release/i.test(x.name || ''));
    if (t) { out.issueTypeId = t.id; out.issueType = t.name; }
  } catch {}
  let fields = [];
  if (out.issueTypeId) {
    try { const fr = await apiGet(`${b}/rest/api/3/issue/createmeta/${encodeURIComponent(key)}/issuetypes/${out.issueTypeId}?maxResults=200`, h); fields = fr.json?.values || []; } catch {}
  }
  if (!fields.length) { // fallback: classic createmeta
    try {
      const cm = await apiGet(`${b}/rest/api/3/issue/createmeta?projectKeys=${encodeURIComponent(key)}&issuetypeNames=${encodeURIComponent(typeName)}&expand=projects.issuetypes.fields`, h);
      const proj = cm.json?.projects?.[0]; if (proj) out.projectId = proj.id;
      const itype = proj?.issuetypes?.find((x) => (x.name || '').toLowerCase() === typeName.toLowerCase()) || proj?.issuetypes?.[0];
      if (itype) { out.issueTypeId = out.issueTypeId || itype.id; out.issueType = itype.name; fields = Object.values(itype.fields || {}); }
    } catch {}
  }
  out.fields = fields.map((f) => ({ id: f.fieldId || f.key || f.id, name: f.name, schema: f.schema })).filter((f) => f.id && f.name);
  for (const f of out.fields) out.byName[(f.name || '').toLowerCase()] = f;
  const want = { devVersion: 'dev version', demoVersion: 'demo version', prodVersion: 'prod version', storeUrl: 'store url', buildNumber: 'build number', releaseNotes: 'release notes', releaseDate: 'release date' };
  for (const [k, label] of Object.entries(want)) { const f = out.byName[label]; if (f) out.fieldMap[k] = { id: f.id, doc: f.schema && f.schema.type === 'doc' }; else out.missing.push(label); }
  if (!out.issueTypeId) return { ...out, ok: false, error: `Work type "${typeName}" not found in project ${key}.` };
  return out;
}
// Upload a PNG as a Jira attachment (multipart — apiGet can't do multipart).
async function jiraAttach(conn, key, pngBase64, filename) {
  const b = jiraBase(conn);
  const u = new URL(`${b}/rest/api/3/issue/${encodeURIComponent(key)}/attachments`);
  const boundary = '----jbh' + Buffer.from(String(key)).toString('hex').slice(0, 12);
  const bin = Buffer.from(String(pngBase64 || '').replace(/^data:image\/png;base64,/, ''), 'base64');
  const head = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${(filename || 'card.png').replace(/["\\\r\n]/g, '')}"\r\nContent-Type: image/png\r\n\r\n`);
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
  const bodyBuf = Buffer.concat([head, bin, tail]);
  const r = await httpsRequest({ method: 'POST', hostname: u.hostname, path: u.pathname + u.search, headers: {
    Authorization: basicAuth(conn.email, conn.token), 'X-Atlassian-Token': 'no-check',
    'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': bodyBuf.length,
    'User-Agent': 'mobile-devtools', Accept: 'application/json',
  } }, bodyBuf);
  return r.status;
}
// Create a plain Jira issue (defaults to a "Task"). Pure — returns {ok,key,url}|{ok:false,error}.
async function createIssue(conn, { summary, issueType, description, projectKey } = {}) {
  if (!conn || !conn.token) return { ok: false, error: 'Jira not configured (Setup → Jira).' };
  const key = (projectKey || conn.projectKey || '').trim();
  if (!key) return { ok: false, error: 'Set a Jira project first (Setup → Jira).' };
  summary = (summary || '').trim();
  if (!summary) return { ok: false, error: 'Summary required.' };
  const b = jiraBase(conn);
  const fields = { project: { key }, issuetype: { name: (issueType || 'Task').trim() }, summary: summary.slice(0, 250) };
  if (description) fields.description = adf(description);
  const cr = await apiGet(`${b}/rest/api/3/issue`, { Authorization: basicAuth(conn.email, conn.token) }, 'POST', JSON.stringify({ fields }));
  if (cr.status >= 300 || !cr.json || !cr.json.key) return { ok: false, error: `Create failed (${cr.status}): ${(cr.body || '').replace(/<[^>]*>/g, '').slice(0, 300)}` };
  return { ok: true, key: cr.json.key, url: `${b}/browse/${cr.json.key}`, summary };
}
// Create a Jira issue from a report: create + optional PNG attach + optional "Relates" links.
async function createReportIssue(conn, { summary, description, issueType, projectKey, pngBase64, filename, linkKeys } = {}) {
  const r = await createIssue(conn, { summary, issueType, description, projectKey });
  if (!r.ok) return r;
  if (pngBase64) { try { await jiraAttach(conn, r.key, pngBase64, filename || 'report.png'); } catch {} }
  for (const lk of (linkKeys || [])) {
    if (!lk) continue;
    try {
      const b = jiraBase(conn);
      await apiGet(`${b}/rest/api/3/issueLink`, { Authorization: basicAuth(conn.email, conn.token) }, 'POST',
        JSON.stringify({ type: { name: 'Relates' }, inwardIssue: { key: r.key }, outwardIssue: { key: lk } }));
    } catch {}
  }
  return r;
}
// List Jira projects for a picker. → {ok, projects:[{key,name}], defaultKey, defaultType}.
async function jiraProjects(conn) {
  if (!conn || !conn.token) return { ok: false, error: 'Jira not configured (hub → Connectors → Jira).' };
  const b = jiraBase(conn);
  const r = await apiGet(`${b}/rest/api/3/project/search?maxResults=100&orderBy=key`, { Authorization: basicAuth(conn.email, conn.token) });
  if (r.status >= 300) return { ok: false, error: `Jira ${r.status}: ${(r.body || '').slice(0, 140)}` };
  const projects = (r.json.values || r.json || []).map((p) => ({ key: p.key, name: p.name })).filter((p) => p.key);
  return { ok: true, projects, defaultKey: (conn.projectKey || '').trim(), defaultType: (conn.issueType || 'Task').trim() };
}
// List issue types available in one project. → {ok, types:[{id,name}]}.
async function jiraIssueTypes(conn, projectKey) {
  if (!conn || !conn.token) return { ok: false, error: 'Jira not configured.' };
  const key = (projectKey || conn.projectKey || '').trim();
  if (!key) return { ok: false, error: 'Pick a project first.' };
  const b = jiraBase(conn);
  const r = await apiGet(`${b}/rest/api/3/issue/createmeta/${encodeURIComponent(key)}/issuetypes?maxResults=100`, { Authorization: basicAuth(conn.email, conn.token) });
  if (r.status >= 300) return { ok: false, error: `Jira ${r.status}: ${(r.body || '').slice(0, 140)}` };
  const types = (r.json.issueTypes || r.json.values || []).filter((t) => !t.subtask).map((t) => ({ id: t.id, name: t.name }));
  return { ok: true, types };
}
// Search issues to link (scoped to the connector's project when set). → {ok, issues:[{key,summary}]}.
async function jiraSearch(conn, q, projectKey) {
  if (!conn || !conn.token) return { ok: false, error: 'Jira not configured.' };
  const b = jiraBase(conn);
  const key = (projectKey || conn.projectKey || '').trim();
  const text = String(q || '').replace(/["\\]/g, ' ').trim();
  const jql = [key ? `project = ${key}` : '', text ? `text ~ "${text}"` : ''].filter(Boolean).join(' AND ') + ' ORDER BY updated DESC';
  // Jira Cloud removed /rest/api/3/search (410) — use the new bounded /search/jql (POST).
  const r = await apiGet(`${b}/rest/api/3/search/jql`, { Authorization: basicAuth(conn.email, conn.token) }, 'POST', JSON.stringify({ jql, maxResults: 20, fields: ['summary'] }));
  if (r.status >= 300) return { ok: false, error: `Jira ${r.status}: ${(r.body || '').slice(0, 140)}` };
  return { ok: true, issues: ((r.json && r.json.issues) || []).map((i) => ({ key: i.key, summary: (i.fields && i.fields.summary) || '' })) };
}

module.exports = { adf, jiraMeta, jiraAttach, createIssue, createReportIssue, jiraProjects, jiraIssueTypes, jiraSearch };
