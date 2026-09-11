'use strict';
// `node serve` — the Mobile DevTools hub. Runs a small control panel on :4090 and spawns the four
// tools as child processes on their fixed ports. Everything is local; open http://localhost:4090.
const path = require('path');
const kit = require('./platform-kit');
const { CATALOG, HUB_PORT } = require('./lib/registry');
const procs = require('./lib/procs');

const app = kit.createKitServer({
  id: 'hub',
  name: 'Mobile DevTools',
  defaultPort: HUB_PORT,
  publicDir: path.join(__dirname, 'public'),
  dataDir: kit.dataDir('hub'),
  repoDir: __dirname,
  manifest: { kind: 'hub', tools: CATALOG.map((t) => t.id) },
});
kit.team.register(app);

// The tool grid: catalog + live status (running/present) for each.
app.r('GET', '/api/tools', async ({ res }) => {
  const tools = await Promise.all(CATALOG.map(async (t) => {
    const st = await procs.status(t); // st.port is the tool's REAL bound port (guards against stale ports)
    return { id: t.id, name: t.name, icon: t.icon, desc: t.desc, ...st, url: `http://localhost:${st.port}` };
  }));
  app.sendJson(res, 200, { tools });
});
app.r('POST', '/api/tools/restart', ({ res, body }) => {
  const t = CATALOG.find((x) => x.id === (body || {}).id);
  if (!t) return app.sendJson(res, 404, { error: 'unknown tool' });
  procs.stopTool(t.id); procs.startTool(t).catch(() => {});
  app.sendJson(res, 200, { ok: true });
}, { body: true });

const shutdown = () => { procs.stopAll(); process.exit(0); };
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

app.start(HUB_PORT).then(async () => {
  const recs = await Promise.all(CATALOG.map((t) => procs.startTool(t).catch(() => null)));
  const started = recs.filter(Boolean).length;
  console.log(`Hub ready — spawned ${started}/${CATALOG.length} tools. Everything lives at http://localhost:${app.port}`);
});
