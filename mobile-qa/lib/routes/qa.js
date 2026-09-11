'use strict';
// Core QA routes — project discovery, run (streamed), test-type matrix, report/coverage/badge/export,
// and the device matrix. Controllers only: validate input, call the qa engine, shape the response.
const os = require('os');
const path = require('path');
const { team, messaging } = require('../../../platform-kit');
const qa = require('../qa');
const device = require('../device');
const { discoverProjects } = require('../project-lite');
const { typesForPlatform, runnerIdsForTypes } = require('../testtypes');

const PROJECTS_ROOT = process.env.PROJECTS_ROOT || path.join(os.homedir(), 'mobileApps');
const PLATFORM = 'flutter';

module.exports = function registerQaRoutes(app) {
  const { r, sse, html, sendJson, id } = app;
  const projectsFor = (root) => discoverProjects(root || PROJECTS_ROOT).filter((p) => p.type === PLATFORM);

  r('GET', '/api/projects', ({ res, q }) => sendJson(res, 200, projectsFor(q.get('root'))));
  r('GET', '/api/qa', ({ res, q }) => sendJson(res, 200, qa.qaData(q.get('path'))));
  r('GET', '/api/qa/all', ({ res }) => sendJson(res, 200, qa.qaAll()));
  // Booted devices/emulators for the run picker (integration tests need one; empty = headless only).
  r('GET', '/api/qa/devices', ({ res }) => device.listDevices()
    .then((d) => sendJson(res, 200, { devices: d.map((x) => ({ id: x.id, name: x.name, platform: x.platform, emulator: x.emulator, booted: x.booted })) }))
    .catch(() => sendJson(res, 200, { devices: [] })));

  // Fire a Slack/Telegram alert when a run introduces NEW failing checks or drops the grade.
  const maybeAlert = (rec) => {
    try {
      const d = rec && rec.delta; if (!d) return;
      const newFails = d.newFailures || []; if (!newFails.length && (d.scoreChange || 0) >= 0) return;
      const n = team.readCfg(id).notify || {};
      if (!messaging.notifyConfigured(n)) return;
      const byId = Object.fromEntries((rec.results || []).map((f) => [f.id, f]));
      const lines = newFails.slice(0, 5).map((fid) => { const f = byId[fid]; return f ? `• ${f.title}${f.metric ? ' (' + f.metric + ')' : ''}` : '• ' + fid; });
      const chg = d.scoreChange ? ` (${d.scoreChange > 0 ? '+' : ''}${d.scoreChange})` : '';
      const text = `🚨 ${rec.name}: QA ${rec.grade.letter} ${rec.grade.score}/100${chg}` + (newFails.length ? `\n${newFails.length} new failing:\n${lines.join('\n')}` : '\nGrade dropped since last run.');
      messaging.notify(n, text).catch(() => {});
    } catch {}
  };

  r('POST', '/api/qa/run', ({ res, body }) => {
    const send = sse(res); const onLine = (l) => send('log', { line: l }); const onStep = (e) => send('step', e);
    const done = (x) => { send('result', x); send('done', { ok: true }); res.end(); };
    const fail = (e) => { send('error', { message: e.message }); res.end(); };
    const only = (body.types && body.types.length) ? runnerIdsForTypes(body.types) : null;
    (body.path ? qa.runProject(body.path, { url: body.url || '', only, device: body.device || '', onStep }, onLine).then((x) => { maybeAlert(x); done({ record: x }); })
               : qa.runAll(body.root || PROJECTS_ROOT, onLine).then((xs) => { xs.forEach(maybeAlert); done({ records: xs }); })).catch(fail);
  }, { body: true });

  r('GET', '/api/qa/testtypes', ({ res, q }) => {
    const p = q.get('path'); const rec = qa.qaData(p);
    const byId = {}; for (const rr of (rec.results || [])) byId[rr.id] = rr;
    const worst = { fail: 3, warn: 2, pass: 1, ok: 1, na: 0 };
    const catOf = (t) => { for (const rid of t.runnerIds) { const rn = qa.RUNNERS.find((x) => x.id === rid); if (rn) return rn.category; } return ''; };
    const types = typesForPlatform(PLATFORM).map((t) => {
      let status = 'na', metric = '', win = null;
      for (const rid of t.runnerIds) { const rr = byId[rid]; if (rr && (worst[rr.status] || 0) > (worst[status] || 0)) { status = rr.status; metric = rr.metric || metric; win = rr; } }
      return { id: t.id, name: t.name, category: catOf(t), runnerIds: t.runnerIds || [], what: t.what, why: t.why, flow: t.flow, url: !!t.url, scaffold: !!t.scaffold, ai: !!t.ai, status, metric, detail: win ? win.detail || '' : '', fix: win ? win.fix || '' : '', resultId: win ? win.id : '', files: win ? win.files || [] : [] };
    });
    sendJson(res, 200, { path: p, platform: PLATFORM, types });
  });

  r('GET', '/api/qa/report', ({ res, q }) => html(res, qa.qaReportHtml(qa.qaData(q.get('path')))));
  r('GET', '/api/qa/coverage', ({ res, q }) => html(res, qa.coverageHtml(q.get('path'))));
  r('POST', '/api/qa/autofix', ({ res, body }) => { try { return sendJson(res, 200, qa.autofix(body.path)); } catch (e) { return sendJson(res, 400, { error: e.message }); } }, { body: true });

  // Grade badge (SVG) for README / CI.
  r('GET', '/api/qa/badge', ({ res, q }) => {
    const rec = qa.qaData(q.get('path')); const g = (rec && rec.grade) || null;
    const letter = g ? g.letter : '?', score = g ? g.score : 0;
    const color = !g ? '#6a7285' : ({ A: '#34c77b', B: '#34c77b', C: '#f5b342', D: '#f0803c', F: '#f0556a' }[letter] || '#6a7285');
    const right = g ? `${letter} ${score}/100` : 'no run'; const rw = 8 + right.length * 7, w = 42 + rw;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="20" role="img" aria-label="qa: ${right}"><linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient><rect rx="3" width="${w}" height="20" fill="#555"/><rect rx="3" x="42" width="${rw}" height="20" fill="${color}"/><rect rx="3" width="${w}" height="20" fill="url(#s)"/><g fill="#fff" text-anchor="middle" font-family="Verdana,DejaVu Sans,sans-serif" font-size="11"><text x="21" y="14">QA</text><text x="${42 + rw / 2}" y="14" font-weight="bold">${right}</text></g></svg>`;
    res.writeHead(200, { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': 'no-cache' }); res.end(svg);
  });
  // Export the last run for CI: JUnit XML (per-check) or raw JSON.
  r('GET', '/api/qa/export', ({ res, q }) => {
    const rec = qa.qaData(q.get('path')); if (!rec || rec.ran === false) return sendJson(res, 400, { error: 'Run QA first.' });
    if ((q.get('fmt') || 'json').toLowerCase() === 'junit') {
      res.writeHead(200, { 'Content-Type': 'application/xml', 'Content-Disposition': `attachment; filename="${(rec.name || 'qa')}.junit.xml"` });
      return res.end(qa.junitXml(rec));
    }
    res.writeHead(200, { 'Content-Type': 'application/json', 'Content-Disposition': `attachment; filename="${(rec.name || 'qa')}.json"` });
    res.end(JSON.stringify(rec, null, 2));
  });
  // Device matrix: run selected test types across several devices, combined report.
  r('POST', '/api/qa/matrix', ({ res, body }) => {
    const send = sse(res); const onLine = (l) => send('log', { line: l });
    const only = (body.types && body.types.length) ? runnerIdsForTypes(body.types) : null;
    (async () => {
      const results = [];
      for (const dv of (body.devices || [])) {
        onLine(`▸ device ${dv}`);
        try { const rec = await qa.runProject(body.path, { url: body.url || '', only, device: dv }, onLine); results.push({ device: dv, grade: rec.grade, summary: rec.summary }); }
        catch (e) { onLine('✖ ' + e.message); results.push({ device: dv, error: e.message }); }
      }
      send('result', { matrix: results }); send('done', { ok: true }); res.end();
    })().catch((e) => { send('error', { message: e.message }); res.end(); });
  }, { body: true });
};
