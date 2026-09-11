'use strict';
// Sharing routes — push a report to the local activity feed, Slack/Telegram notify, email (with
// artifact attachments), OneDrive file share, and Jira create/attach/comment via the shared
// connectors. Controllers only: validate, guard artifact paths, call the kit service.
const fs = require('fs');
const path = require('path');
const { share, team, messaging, connectors } = require('../../../platform-kit');
const qa = require('../qa');
const device = require('../device');

module.exports = function registerShareRoutes(app) {
  const { r, sendJson, id } = app;
  const needRun = (res, rec) => { if (!rec || rec.ran === false) { sendJson(res, 400, { error: 'Run QA on the project first.' }); return true; } return false; };

  // Attribute + push the report to this tool's local activity feed.
  r('POST', '/api/qa/share', ({ res, body }) => {
    const rec = qa.qaData(body.path); if (needRun(res, rec)) return;
    const key = share.projectKey(body.path);
    const pushed = share.pushRecord(id, { key, name: rec.name, type: rec.type, grade: rec.grade, summary: rec.summary }, { by: team.profileName(id) });
    sendJson(res, 200, pushed.ok === false ? { shared: false, reason: pushed.reason } : { shared: true });
  }, { body: true });

  // Slack / Telegram.
  r('POST', '/api/qa/notify', ({ res, body }) => {
    const n = team.readCfg(id).notify || {};
    if (!messaging.notifyConfigured(n)) return sendJson(res, 200, { ok: false, error: 'No Slack/Telegram channel — set one in Settings → Notifications.' });
    messaging.notify(n, String(body.text || '').slice(0, 3500)).then((x) => sendJson(res, 200, x && x.ok !== false ? { ok: true } : { ok: false, error: (x && x.error) || 'send failed' })).catch((e) => sendJson(res, 200, { ok: false, error: e.message }));
  }, { body: true });

  // Email (text/html body + optional artifact attachments; attachments need SMTP mode).
  r('POST', '/api/qa/email', ({ res, body }) => {
    const em = team.readCfg(id).email || {};
    if (!messaging.emailConfigured(em)) return sendJson(res, 200, { ok: false, error: 'Email not configured — set SMTP/API in Settings → Notifications.' });
    if (!body.to) return sendJson(res, 200, { ok: false, error: 'Recipient required.' });
    const attachments = (body.paths || []).map((p) => { const abs = device.safeArtifact(p); if (!abs) return null; return { type: device.mimeOf(abs), filename: path.basename(abs), contentBase64: fs.readFileSync(abs).toString('base64') }; }).filter(Boolean);
    messaging.sendEmail(em, { to: [body.to], bcc: [], subject: (body.subject || 'QA share').slice(0, 160), html: body.html || '', text: body.text || '', attachments })
      .then(() => sendJson(res, 200, { ok: true })).catch((e) => sendJson(res, 200, { ok: false, error: e.message }));
  }, { body: true });

  // ponytail: cloud file upload (OneDrive/etc) isn't part of the open-source kit — no phone-home.
  //           Attach the artifact to Jira or email it instead; this stays a graceful no-op.
  r('POST', '/api/qa/share/file', ({ res }) => sendJson(res, 200, { ok: false, error: 'Cloud file sharing is not available in this build — attach to Jira or email the artifact instead.' }), { body: true });

  // Jira — from the QA report.
  r('POST', '/api/qa/share-jira', ({ res, body }) => {
    const rec = qa.qaData(body.path); if (needRun(res, rec)) return;
    const conn = connectors.getConnector('jira');
    if (!conn) return sendJson(res, 200, { ok: false, error: 'Jira not configured — add it in the hub Connectors page.' });
    const fails = (rec.results || []).filter((x) => x.status === 'fail');
    const lines = fails.slice(0, 40).map((f) => `- ${f.name || f.id}${f.metric ? ' (' + f.metric + ')' : ''}`);
    const summary = `${rec.name} — QA ${rec.grade.letter} (${rec.grade.score}/100)`;
    const description = [`QA report for ${rec.name}${rec.type ? ' (' + rec.type + ')' : ''}.`, `Grade ${rec.grade.letter} (${rec.grade.score}/100) · ${fails.length} failing check(s).`, lines.length ? '\nFailing:\n' + lines.join('\n') : ''].filter(Boolean).join('\n');
    connectors.createReportIssue(conn, { summary, description }).then((x) => sendJson(res, 200, x)).catch((e) => sendJson(res, 200, { ok: false, error: e.message }));
  }, { body: true });
  // Jira — create a new issue (optionally attaching an artifact).
  r('POST', '/api/qa/jira/create', ({ res, body }) => {
    const conn = connectors.getConnector('jira'); if (!conn) return sendJson(res, 200, { ok: false, error: 'Jira not configured — add it in the hub Connectors page.' });
    const abs = body.attachPath ? device.safeArtifact(body.attachPath) : null;
    const pngBase64 = abs ? fs.readFileSync(abs).toString('base64') : undefined;
    connectors.createReportIssue(conn, { summary: (body.summary || 'QA').slice(0, 250), description: body.description || '', projectKey: body.projectKey, issueType: body.issueType, pngBase64, filename: abs ? path.basename(abs) : undefined, linkKeys: body.linkKeys })
      .then((x) => sendJson(res, 200, x)).catch((e) => sendJson(res, 200, { ok: false, error: e.message }));
  }, { body: true });
  // Jira — attach an artifact file to an existing issue.
  r('POST', '/api/qa/jira/attach', ({ res, body }) => {
    const conn = connectors.getConnector('jira'); if (!conn) return sendJson(res, 200, { ok: false, error: 'Jira not configured.' });
    const abs = device.safeArtifact(body.path); if (!abs) return sendJson(res, 200, { ok: false, error: 'artifact not found' });
    if (!body.key) return sendJson(res, 200, { ok: false, error: 'Issue key required.' });
    Promise.resolve(connectors.jiraAttach(conn, body.key, fs.readFileSync(abs).toString('base64'), path.basename(abs)))
      .then((status) => sendJson(res, 200, { ok: status >= 200 && status < 300, status })).catch((e) => sendJson(res, 200, { ok: false, error: e.message }));
  }, { body: true });
  // Jira — add a comment to an existing issue.
  r('POST', '/api/qa/jira/comment', ({ res, body }) => {
    const conn = connectors.getConnector('jira'); if (!conn) return sendJson(res, 200, { ok: false, error: 'Jira not configured.' });
    if (!body.key || !body.text) return sendJson(res, 200, { ok: false, error: 'Issue key and text required.' });
    const url = connectors.jiraBase(conn) + '/rest/api/3/issue/' + encodeURIComponent(body.key) + '/comment';
    Promise.resolve(connectors.apiGet(url, { Authorization: connectors.basicAuth(conn.email, conn.token) }, 'POST', JSON.stringify({ body: connectors.adf(String(body.text).slice(0, 4000)) })))
      .then((x) => sendJson(res, 200, { ok: x.status >= 200 && x.status < 300, status: x.status })).catch((e) => sendJson(res, 200, { ok: false, error: e.message }));
  }, { body: true });
};
