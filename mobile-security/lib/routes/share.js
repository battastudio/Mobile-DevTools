'use strict';
// Sharing + notification routes: local activity feed, push a report, open a Jira issue from findings,
// and send a report over the configured Slack/Telegram/email channels. Controllers only.
const TOOL_ID = 'mobile-security';

module.exports = function registerShareRoutes(app, { scan, kit }) {
  const { share, connectors, team, messaging } = kit;
  const J = app.sendJson;

  app.r('GET', '/api/security/share/status', ({ res }) => J(res, 200, { available: share.available() }));
  app.r('POST', '/api/security/share', ({ res, body }) => {
    const rec = scan.securityData(body.path); if (!rec || rec.scanned === false) return J(res, 400, { error: 'Scan the project first.' });
    const key = share.projectKey(body.path);
    const pushed = share.pushRecord(TOOL_ID, { key, name: rec.name, type: rec.type, grade: rec.grade, gate: rec.gate }, { by: team.profileName(TOOL_ID) });
    if (!pushed.shared) return J(res, 200, { shared: false, reason: pushed.reason });
    J(res, 200, { shared: true, report: share.pushReport(TOOL_ID, key, scan.securityReportHtml(rec)) });
  }, { body: true });
  app.r('GET', '/api/security/team', ({ res }) => J(res, 200, share.pullTeam(TOOL_ID)));

  // Create a Jira issue from the security report (uses the shared Jira connector).
  app.r('POST', '/api/security/share-jira', ({ res, body }) => {
    const rec = scan.securityData(body.path); if (!rec || rec.scanned === false) return J(res, 400, { error: 'Scan the project first.' });
    const conn = connectors.getConnector('jira');
    if (!conn) return J(res, 200, { ok: false, error: 'Jira not configured — add it in the Connectors settings.' });
    const fails = (rec.findings || []).filter((x) => x.status === 'fail');
    const summary = (body.summary || '').trim() || `${rec.name} — Security ${rec.grade.letter} (${rec.grade.score}/100)`;
    let description = (body.description || '').trim();
    if (!description) {
      const lines = fails.slice(0, 40).map((f) => `- [${f.severity || ''}] ${f.title}${f.owasp ? ' (' + f.owasp + ')' : ''}`);
      description = [
        `Security scan for ${rec.name}${rec.type ? ' (' + rec.type + ')' : ''}.`,
        `Grade ${rec.grade.letter} (${rec.grade.score}/100)${rec.gate ? ' · gate: ' + rec.gate : ''} · ${fails.length} failing check(s).`,
        lines.length ? '\nFailing:\n' + lines.join('\n') : '',
      ].filter(Boolean).join('\n');
    }
    if (body.includeReport !== false) {
      const rep = share.pushReport(TOOL_ID, share.projectKey(body.path), scan.securityReportHtml(rec));
      if (rep && rep.url) description += `\n\nFull report: ${rep.url}`;
    }
    connectors.createReportIssue(conn, { summary, description, projectKey: body.projectKey, issueType: body.issueType, linkKeys: body.linkKeys })
      .then((x) => J(res, 200, x)).catch((e) => J(res, 200, { ok: false, error: e.message }));
  }, { body: true });

  app.r('POST', '/api/security/notify', ({ res, body }) => {
    const n = team.readCfg(TOOL_ID).notify || {};
    if (!messaging.notifyConfigured(n)) return J(res, 200, { ok: false, error: 'No Slack/Telegram channel — set one in Settings → Notifications.' });
    messaging.notify(n, String(body.text || '').slice(0, 3500)).then((r) => J(res, 200, r && r.ok !== false ? { ok: true } : { ok: false, error: (r && r.error) || 'send failed' })).catch((e) => J(res, 200, { ok: false, error: e.message }));
  }, { body: true });
  app.r('POST', '/api/security/email', ({ res, body }) => {
    const em = team.readCfg(TOOL_ID).email || {};
    if (!messaging.emailConfigured(em)) return J(res, 200, { ok: false, error: 'Email not configured — set SMTP/API in Settings → Notifications.' });
    if (!body.to) return J(res, 200, { ok: false, error: 'Recipient required.' });
    messaging.sendEmail(em, { to: [body.to], bcc: [], subject: (body.subject || 'Security report').slice(0, 160), html: body.html || '', text: body.text || '' }).then(() => J(res, 200, { ok: true })).catch((e) => J(res, 200, { ok: false, error: e.message }));
  }, { body: true });
  app.r('POST', '/api/security/share-note', ({ res, body }) => {
    if (!share.available()) return J(res, 200, { ok: false, error: 'Local share target not connected.' });
    const t = messaging.escH(body.title || 'Security note');
    const html = `<!doctype html><meta charset="utf-8"><title>${t}</title><body style="font-family:system-ui;max-width:820px;margin:40px auto;padding:0 20px;line-height:1.6"><h1>${t}</h1>${body.html || ''}</body>`;
    const rep = share.pushReport(TOOL_ID, share.projectKey(body.path) + '-' + (body.kind || 'note'), html);
    J(res, 200, rep && rep.shared ? { ok: true, url: rep.url } : { ok: false, error: (rep && rep.reason) || 'share failed' });
  }, { body: true });
};
