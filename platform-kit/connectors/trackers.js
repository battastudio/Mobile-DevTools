'use strict';
// One descriptor per issue tracker: how to auth, extract issue keys from commit text, test the
// connection, and enrich keys with title/state. Adding a platform = one more TRACKERS entry.
const { basicAuth, apiGet } = require('./net');

function jiraBase(conn) { const raw = ((conn && conn.baseUrl) || '').trim(); try { return new URL(raw).origin; } catch { return raw.replace(/\/+$/, ''); } }

const TRACKERS = [
  { id: 'jira', label: 'Jira', authHint: 'Site URL + email + API token',
    fields: [['baseUrl', 'Site URL (https://you.atlassian.net)'], ['email', 'Email'], ['token', 'API token'], ['projectKey', 'Project key for releases (e.g. JSW)'], ['issueType', 'Release work type (default: Mobile Release)']],
    keyRegex: /\b[A-Z][A-Z0-9]+-\d+\b/,
    headers(c) { return { Authorization: basicAuth(c.email, c.token) }; },
    async test(c) { const b = jiraBase(c); const r = await apiGet(`${b}/rest/api/3/myself`, this.headers(c)); return r.status === 200 ? { ok: true, out: `Jira: ${r.json.displayName || r.json.emailAddress || 'connected'}` } : { ok: false, error: `Jira ${r.status}: ${(r.body || '').slice(0, 140)}` }; },
    async enrich(c, keys) { const b = jiraBase(c); const out = []; for (const k of keys) { try { const r = await apiGet(`${b}/rest/api/3/issue/${encodeURIComponent(k)}?fields=summary,status`, this.headers(c)); out.push(r.status === 200 ? { key: k, title: r.json.fields?.summary || '', state: r.json.fields?.status?.name || '', url: `${b}/browse/${k}` } : { key: k }); } catch { out.push({ key: k }); } } return out; } },
  { id: 'gitlab', label: 'GitLab', authHint: 'Host + project ID + token',
    fields: [['baseUrl', 'Host (https://gitlab.com)'], ['projectId', 'Project ID or path'], ['token', 'Personal access token']],
    keyRegex: /(?<![\w#])#\d+/,
    headers(c) { return { 'PRIVATE-TOKEN': c.token }; },
    async test(c) { const b = (c.baseUrl || '').replace(/\/$/, ''); const r = await apiGet(`${b}/api/v4/user`, this.headers(c)); return r.status === 200 ? { ok: true, out: `GitLab: ${r.json.username || 'connected'}` } : { ok: false, error: `GitLab ${r.status}` }; },
    async enrich(c, keys) { const b = (c.baseUrl || '').replace(/\/$/, ''); const pid = encodeURIComponent(c.projectId || ''); const out = []; for (const k of keys) { const iid = k.replace(/^#/, ''); try { const r = await apiGet(`${b}/api/v4/projects/${pid}/issues/${iid}`, this.headers(c)); out.push(r.status === 200 ? { key: k, title: r.json.title || '', state: r.json.state || '', url: r.json.web_url || '' } : { key: k }); } catch { out.push({ key: k }); } } return out; } },
  { id: 'github', label: 'GitHub', authHint: 'owner/repo + token',
    fields: [['owner', 'Owner (org or user)'], ['repo', 'Repo'], ['token', 'Token (PAT)']],
    keyRegex: /(?<![\w#])#\d+/,
    headers(c) { return { Authorization: `Bearer ${c.token}`, Accept: 'application/vnd.github+json' }; },
    async test(c) { const r = await apiGet('https://api.github.com/user', this.headers(c)); return r.status === 200 ? { ok: true, out: `GitHub: ${r.json.login || 'connected'}` } : { ok: false, error: `GitHub ${r.status}` }; },
    async enrich(c, keys) { const out = []; for (const k of keys) { const n = k.replace(/^#/, ''); try { const r = await apiGet(`https://api.github.com/repos/${c.owner}/${c.repo}/issues/${n}`, this.headers(c)); out.push(r.status === 200 ? { key: k, title: r.json.title || '', state: r.json.state || '', url: r.json.html_url || '' } : { key: k }); } catch { out.push({ key: k }); } } return out; } },
  { id: 'azure', label: 'Azure DevOps', authHint: 'Org + project + PAT',
    fields: [['org', 'Organization'], ['project', 'Project'], ['token', 'Personal access token']],
    keyRegex: /\bAB#\d+\b/,
    headers(c) { return { Authorization: basicAuth('', c.token) }; },
    async test(c) { const r = await apiGet(`https://dev.azure.com/${encodeURIComponent(c.org)}/_apis/projects?api-version=7.0`, this.headers(c)); return r.status === 200 ? { ok: true, out: `Azure: ${r.json.count ?? 'connected'} projects` } : { ok: false, error: `Azure ${r.status}` }; },
    async enrich(c, keys) { const out = []; for (const k of keys) { const id = k.replace(/^AB#/, ''); try { const r = await apiGet(`https://dev.azure.com/${encodeURIComponent(c.org)}/${encodeURIComponent(c.project)}/_apis/wit/workitems/${id}?api-version=7.0`, this.headers(c)); out.push(r.status === 200 ? { key: k, title: r.json.fields?.['System.Title'] || '', state: r.json.fields?.['System.State'] || '', url: r.json._links?.html?.href || '' } : { key: k }); } catch { out.push({ key: k }); } } return out; } },
  { id: 'linear', label: 'Linear', authHint: 'API key',
    fields: [['token', 'API key']],
    keyRegex: /\b[A-Z]{2,}-\d+\b/,
    headers(c) { return { Authorization: c.token }; },
    async test(c) { const r = await apiGet('https://api.linear.app/graphql', this.headers(c), 'POST', JSON.stringify({ query: '{ viewer { name } }' })); return r.status === 200 && r.json.data?.viewer ? { ok: true, out: `Linear: ${r.json.data.viewer.name}` } : { ok: false, error: `Linear ${r.status}` }; },
    async enrich(c, keys) { const out = []; for (const k of keys) { try { const r = await apiGet('https://api.linear.app/graphql', this.headers(c), 'POST', JSON.stringify({ query: `{ issue(id:"${k}") { title state { name } url } }` })); const i = r.json.data?.issue; out.push(i ? { key: k, title: i.title || '', state: i.state?.name || '', url: i.url || '' } : { key: k }); } catch { out.push({ key: k }); } } return out; } },
  { id: 'bitbucket', label: 'Bitbucket', authHint: 'workspace/repo + user + app password',
    fields: [['workspace', 'Workspace'], ['repo', 'Repo'], ['user', 'Username'], ['token', 'App password']],
    keyRegex: /(?<![\w#])#\d+/,
    headers(c) { return { Authorization: basicAuth(c.user, c.token) }; },
    async test(c) { const r = await apiGet('https://api.bitbucket.org/2.0/user', this.headers(c)); return r.status === 200 ? { ok: true, out: `Bitbucket: ${r.json.username || r.json.display_name || 'connected'}` } : { ok: false, error: `Bitbucket ${r.status}` }; },
    async enrich(c, keys) { const out = []; for (const k of keys) { const id = k.replace(/^#/, ''); try { const r = await apiGet(`https://api.bitbucket.org/2.0/repositories/${c.workspace}/${c.repo}/issues/${id}`, this.headers(c)); out.push(r.status === 200 ? { key: k, title: r.json.title || '', state: r.json.state || '', url: r.json.links?.html?.href || '' } : { key: k }); } catch { out.push({ key: k }); } } return out; } },
];
const trackerById = (id) => TRACKERS.find((t) => t.id === id);

function extractKeys(text, regex) {
  const re = new RegExp(regex.source, 'g'); const keys = new Set(); let m;
  while ((m = re.exec(text || ''))) keys.add(m[0]);
  return [...keys];
}
function formatTasks(items) {
  if (!items || !items.length) return '';
  const lines = items.map((i) => `- ${i.key}${i.title ? ' ' + i.title : ''}${i.state ? ' (' + i.state + ')' : ''}`);
  return `Tasks in this release (${items.length}):\n${lines.join('\n')}`;
}

module.exports = { TRACKERS, trackerById, extractKeys, formatTasks };
