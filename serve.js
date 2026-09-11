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
  const tools = await Promise.all(CATALOG.map(async (t) => ({
    id: t.id, name: t.name, icon: t.icon, desc: t.desc, port: t.port,
    url: `http://localhost:${t.port}`, ...(await procs.status(t)),
  })));
  app.sendJson(res, 200, { tools });
});
app.r('POST', '/api/tools/restart', ({ res, body }) => {
  const t = CATALOG.find((x) => x.id === (body || {}).id);
  if (!t) return app.sendJson(res, 404, { error: 'unknown tool' });
  procs.stopTool(t.id); procs.startTool(t);
  app.sendJson(res, 200, { ok: true });
}, { body: true });

const shutdown = () => { procs.stopAll(); process.exit(0); };
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

app.start(HUB_PORT).then(() => {
  const started = CATALOG.map((t) => procs.startTool(t)).filter(Boolean).length;
  console.log(`Hub ready on http://localhost:${app.port} — spawned ${started}/${CATALOG.length} tools.`);
});
