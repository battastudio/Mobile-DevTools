#!/usr/bin/env node
'use strict';
// Build Helper — switch Flutter environments/flavors, bump versions, build APK/AAB/IPA, and
// distribute (OneDrive / Play / TestFlight / Firebase). Wiring only: the kit spine + the shared
// team/connectors layers + the build-helper route groups. Logic lives in lib/{project,build,stores,
// dashboard}. No auth — runs open on localhost, the kit passes user=null to every handler.
const path = require('path');
const kit = require('../platform-kit');
const { createKitServer, dataDir } = kit;
const registerRoutes = require('./lib/routes');
const tool = require('./tool.json');

const app = createKitServer({
  id: tool.id, name: tool.name, defaultPort: tool.port, repoDir: __dirname,
  publicDir: path.join(__dirname, 'public'), dataDir: dataDir(tool.id),
  manifest: {
    icon: 'rocket', color: 'brand', platform: 'flutter', platformLabel: 'Mobile (Flutter)',
    description: 'Switch Flutter environments/flavors, bump versions, build APK/AAB/IPA, and distribute.',
    nav: [{ id: 'dashboard', label: 'Dashboard' }, { id: 'build', label: 'Build' }, { id: 'setup', label: 'Setup' }],
    capabilities: ['build', 'distribute', 'signing', 'report'],
  },
});

kit.team.register(app);              // /api/team* (profile, notifications, email)
kit.connectors.registerRoutes(app);  // /api/connectors* (Jira/GitHub/… issue trackers)
registerRoutes(app);                 // apps · build · signing · setup · distribute · pages

if (process.argv.includes('--selftest')) selftest();
else { app.start(); require('./lib/schedule').startScheduler(); }

// Self-check for CI: re-register the whole route graph onto a throwaway (never-listening) app to
// count routes, then exercise the detection pipeline on a synthetic Flutter project. No network,
// no build, no server bind. Exits non-zero on any error.
function selftest() {
  try {
    const fs = require('fs'); const os = require('os');
    const probe = createKitServer({ id: 'bh-selftest', name: 'x', defaultPort: 0, repoDir: __dirname, publicDir: '', dataDir: dataDir(tool.id), manifest: {} });
    let n = 0; const seen = new Set(); const orig = probe.r; probe.r = (...a) => { n++; seen.add(a[1]); return orig.apply(probe, a); };
    kit.team.register(probe); kit.connectors.registerRoutes(probe); registerRoutes(probe);
    const assert = require('assert');
    for (const p of ['/api/testflight/manage', '/api/testflight/latest', '/api/qr', '/api/tracker/tasks', '/api/jira/search', '/api/doctor/full',
      '/api/security/grades', '/api/version', '/api/changelog/tool', '/api/self-update', '/api/setup/onedrive-shared'])
      assert(seen.has(p), `route not registered: ${p}`);
    const sch = require('./lib/schedule'); assert(typeof sch.startScheduler === 'function' && typeof sch.checkSchedules === 'function', 'schedule module missing');

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bh-'));
    fs.writeFileSync(path.join(dir, 'pubspec.yaml'), 'name: sample\nversion: 1.2.3+4\n');
    fs.mkdirSync(path.join(dir, 'lib', 'api'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'lib', 'env.dart'), 'enum AppMode { dev, prod }\nconst AppMode appMode = AppMode.dev;\n');
    fs.writeFileSync(path.join(dir, 'lib', 'api', 'client.dart'), 'final isDev = appMode == AppMode.dev;\n');
    const { detectApp } = require('./lib/project');
    const a = detectApp(dir);
    console.log(`Build Helper selftest — ${n} routes registered across team + connectors + build-helper groups.`);
    console.log(`Sample "${a.name}" v${a.version} → const ${a.constName}, envs ${Object.keys(a.modes).join('/') || 'none'}, needsConfig=${a.needsConfig}.`);
    process.exit(0);
  } catch (e) { console.error('selftest failed:', e.message); process.exit(1); }
}
