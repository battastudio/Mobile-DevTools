'use strict';
// Distribution + reporting routes: rollback (re-promote a stored Play versionCode) and retry-upload
// (re-run one upload target without rebuilding), share-card upload + OneDrive folder prep, artifact
// cleanup, CSV / printable build reports, and Jira release / issue creation.
const { handleRollback, handleRetryUpload, handleShareImage, handleMkdirs, handleTeamCard,
  cleanupArtifacts, reportRows, reportCsv, reportHtml } = require('../dashboard');
const { handleCreateRelease, handleCreateIssue, handleTasks, jiraSearchFor } = require('../trackers');

function register(app) {
  const J = app.sendJson;
  app.r('POST', '/api/rollback', ({ req, res, body }) => handleRollback(req, res, body), { body: true });
  app.r('POST', '/api/retry-upload', ({ req, res, body }) => handleRetryUpload(req, res, body), { body: true });
  app.r('POST', '/api/share/image', ({ req, res, body }) => handleShareImage(req, res, body), { body: true });
  app.r('POST', '/api/share/mkdirs', ({ req, res }) => handleMkdirs(req, res));
  app.r('POST', '/api/share/card', ({ res, body }) => handleTeamCard(res, body), { body: true });
  app.r('POST', '/api/cleanup', ({ res, body }) => J(res, 200, cleanupArtifacts(body)), { body: true });
  app.r('POST', '/api/tracker/release', ({ req, res, body }) => handleCreateRelease(req, res, body), { body: true });
  app.r('POST', '/api/tracker/issue', ({ res, body }) => handleCreateIssue(res, body), { body: true });
  // Build-page Jira picker: commit-scraped tasks (?path=&env=) and issue search to link (?path=&q=).
  app.r('GET', '/api/tracker/tasks', ({ res, q }) => handleTasks(res, q.get('path'), q.get('env')));
  app.r('GET', '/api/jira/search', ({ res, q }) => jiraSearchFor(res, q.get('path'), q.get('q')));
  // Reports filter by ?range=<days>&project=&env= and download inline.
  app.r('GET', '/api/report.csv', ({ res, q }) => {
    res.writeHead(200, { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="build-report.csv"' });
    res.end(reportCsv(reportRows(q)));
  });
  app.r('GET', '/api/report.html', ({ res, q }) => { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(reportHtml(reportRows(q))); });
}

module.exports = { register };
