'use strict';
// Core scan routes: discover projects, run/read a scan (SSE), the printable report, one-click fixes,
// finding triage, the quality gate, and the accepted baseline. Controllers only — logic lives in scan/*.
const { discoverProjects } = require('../project-lite');

const TOOL_ID = 'mobile-security';

module.exports = function registerScanRoutes(app, { scan, kit, PROJECTS_ROOT }) {
  const { team, messaging } = kit;
  const J = app.sendJson;

  // Fire a Slack/Telegram alert when a scan introduces NEW findings vs the previous scan.
  const maybeAlert = (rec) => {
    try {
      const newIds = (rec && rec.delta && rec.delta.newFindings) || [];
      if (!newIds.length) return;
      const n = team.readCfg(TOOL_ID).notify || {};
      if (!messaging.notifyConfigured(n)) return;
      const byId = Object.fromEntries((rec.findings || []).map((f) => [f.id, f]));
      const lines = newIds.slice(0, 5).map((id) => { const f = byId[id]; return f ? `• [${f.severity}] ${f.title}${f.owasp ? ' (' + f.owasp + ')' : ''}` : '• ' + id; });
      messaging.notify(n, `🚨 ${rec.name}: ${newIds.length} NEW security finding(s) — grade ${rec.grade.letter} ${rec.grade.score}/100\n${lines.join('\n')}`).catch(() => {});
    } catch {}
  };

  app.r('GET', '/api/projects', ({ res, q }) => J(res, 200, discoverProjects(q.get('root') || PROJECTS_ROOT)));
  app.r('GET', '/api/security', ({ res, q }) => J(res, 200, scan.securityData(q.get('path'))));
  app.r('GET', '/api/security/all', ({ res }) => J(res, 200, scan.securityAll()));

  app.r('POST', '/api/security/scan', ({ res, body }) => {
    const send = app.sse(res); const onLine = (l) => send('log', { line: l });
    const done = (x) => { send('result', x); send('done', { ok: true }); res.end(); };
    const fail = (e) => { send('error', { message: e.message }); res.end(); };
    (body.path ? scan.scanProject(body.path, onLine).then((x) => { maybeAlert(x); done({ record: x }); })
               : scan.scanAll(body.root || PROJECTS_ROOT, onLine).then((xs) => { xs.forEach(maybeAlert); done({ records: xs }); })).catch(fail);
  }, { body: true });

  app.r('GET', '/api/security/report', ({ res, q }) => app.html(res, scan.securityReportHtml(scan.securityData(q.get('path')))));
  app.r('POST', '/api/security/fix', ({ res, body }) => { try { J(res, 200, scan.applyFix(body.path, body.checkId)); } catch (e) { J(res, 400, { error: e.message }); } }, { body: true });
  app.r('POST', '/api/security/fix-all', ({ res, body }) => { try { J(res, 200, scan.fixAll(body.path)); } catch (e) { J(res, 400, { error: e.message }); } }, { body: true });
  app.r('POST', '/api/security/triage', ({ res, body }) => { try { J(res, 200, scan.retriage(body.path, body.findingId, body.state)); } catch (e) { J(res, 400, { error: e.message }); } }, { body: true });

  app.r('GET', '/api/security/gate', ({ res }) => J(res, 200, scan.readGate()));
  app.r('POST', '/api/security/gate', ({ res, body }) => J(res, 200, scan.setGate(body)), { body: true });
  app.r('GET', '/api/security/baseline', ({ res, q }) => J(res, 200, scan.readBaseline(q.get('path')) || { count: 0, ids: [] }));
  app.r('POST', '/api/security/baseline', ({ res, body }) => { try { J(res, 200, body.clear ? scan.clearBaseline(body.path) : scan.setBaseline(body.path)); } catch (e) { J(res, 400, { error: e.message }); } }, { body: true });
};
