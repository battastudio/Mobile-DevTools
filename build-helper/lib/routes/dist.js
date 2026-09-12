'use strict';
// Distribution + reporting routes: rollback (re-promote a stored Play versionCode) and retry-upload
// (re-run one upload target without rebuilding), share-card upload + OneDrive folder prep, artifact
// cleanup, CSV / printable build reports, and Jira release / issue creation.
const fs = require('fs');
const path = require('path');
const { ARTIFACTS_DIR } = require('../state');
const { handleRollback, handleRetryUpload, handleShareImage, handleMkdirs, handleTeamCard,
  cleanupArtifacts, reportRows, reportCsv, reportHtml } = require('../dashboard');
const { handleCreateRelease, handleCreateIssue, handleTasks, jiraSearchFor, handleJiraMeta } = require('../trackers');

function register(app) {
  const J = app.sendJson;
  app.r('POST', '/api/rollback', ({ req, res, body }) => handleRollback(req, res, body), { body: true });
  app.r('POST', '/api/retry-upload', ({ req, res, body }) => handleRetryUpload(req, res, body), { body: true });
  app.r('POST', '/api/share/image', ({ req, res, body }) => handleShareImage(req, res, body), { body: true });
  app.r('POST', '/api/share/mkdirs', ({ req, res }) => handleMkdirs(req, res));
  app.r('POST', '/api/share/card', ({ res, body }) => handleTeamCard(res, body), { body: true });
  app.r('POST', '/api/cleanup', ({ res, body }) => J(res, 200, cleanupArtifacts(body)), { body: true });
  // On-disk artifacts for one project (build page browser) + delete-one.
  app.r('GET', '/api/artifacts', ({ res, q }) => {
    const dir = path.join(ARTIFACTS_DIR, path.basename(q.get('project') || ''));
    let files = []; try { files = fs.readdirSync(dir).filter((n) => !n.startsWith('_')).map((n) => { const p = path.join(dir, n); return { name: n, path: p, size: fs.statSync(p).size }; }); } catch {}
    return J(res, 200, { files });
  });
  app.r('POST', '/api/artifact/delete', ({ res, body }) => {
    const p = path.resolve(String((body || {}).path || ''));
    if (!p.startsWith(ARTIFACTS_DIR + path.sep)) return J(res, 400, { error: 'outside artifacts dir' });
    try { fs.unlinkSync(p); } catch (e) { return J(res, 400, { error: e.message }); }
    return J(res, 200, { ok: true });
  }, { body: true });
  app.r('POST', '/api/tracker/release', ({ req, res, body }) => handleCreateRelease(req, res, body), { body: true });
  app.r('POST', '/api/tracker/issue', ({ res, body }) => handleCreateIssue(res, body), { body: true });
  // Build-page Jira picker: commit-scraped tasks (?path=&env=) and issue search to link (?path=&q=).
  app.r('GET', '/api/tracker/tasks', ({ res, q }) => handleTasks(res, q.get('path'), q.get('env')));
  app.r('GET', '/api/jira/search', ({ res, q }) => jiraSearchFor(res, q.get('path'), q.get('q')));
  app.r('GET', '/api/jira/meta', ({ res, q }) => handleJiraMeta(res, q.get('path')));
  app.r('POST', '/api/jira/create-release', ({ req, res, body }) => handleCreateRelease(req, res, body), { body: true });
  app.r('POST', '/api/jira/create-issue', ({ res, body }) => handleCreateIssue(res, body), { body: true });
  // Reports filter by ?range=<days>&project=&env= and download inline.
  app.r('GET', '/api/report.csv', ({ res, q }) => {
    res.writeHead(200, { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="build-report.csv"' });
    res.end(reportCsv(reportRows(q)));
  });
  app.r('GET', '/api/report.html', ({ res, q }) => { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(reportHtml(reportRows(q))); });
}

module.exports = { register };
