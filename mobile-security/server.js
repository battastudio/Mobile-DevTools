#!/usr/bin/env node
'use strict';
// Mobile Security — OWASP Mobile Top 10 static scanner for Flutter apps. Wiring only: the scan engine
// lives in lib/scan/*, the HTTP controllers in lib/routes/*. No auth — runs open on localhost, the
// kit passes user=null everywhere.
const path = require('path');
const os = require('os');
const kit = require('../platform-kit');
const { createKitServer, dataDir } = kit;
const scan = require('./lib/scan');
const routes = require('./lib/routes');
const tool = require('./tool.json');

// Where "Scan all" looks for Flutter apps; override with PROJECTS_ROOT. A single scan takes an explicit path.
const PROJECTS_ROOT = process.env.PROJECTS_ROOT || path.join(os.homedir(), 'mobileApps');

const app = createKitServer({
  id: tool.id, name: tool.name, defaultPort: tool.port, repoDir: __dirname,
  publicDir: path.join(__dirname, 'public'), dataDir: dataDir(tool.id),
  manifest: { icon: 'shield', color: 'brand', description: 'OWASP Mobile Top 10 static scanner for Flutter apps.', platformLabel: 'Mobile (Flutter)', nav: [{ id: 'dashboard', label: 'Dashboard' }, { id: 'scan', label: 'Scan' }] },
});
kit.team.register(app);               // /api/team* (profile, notifications, email)
kit.connectors.registerRoutes(app);   // /api/connectors* (Jira/GitHub/… issue trackers)
routes.registerAll(app, { scan, kit, PROJECTS_ROOT });

if (process.argv.includes('--selftest')) selftest();
else app.start();

// Self-check: load the catalog, scan a throwaway Flutter app in a tmp dir, print the grade. No network.
// ponytail: the scan lands a record (keyed by the tmp path) in the real cache — harmless noise; add an
// in-memory/no-persist scan mode if selftest output ever needs to stay out of the dashboard.
async function selftest() {
  const fs = require('fs');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mobsec-'));
  fs.writeFileSync(path.join(dir, 'pubspec.yaml'), 'name: sample\ndependencies:\n  get_storage: ^2.0.0\n  webview_flutter: ^4.0.0\n');
  fs.mkdirSync(path.join(dir, 'lib'));
  fs.writeFileSync(path.join(dir, 'lib', 'main.dart'),
    'final apiKey = "NOT_A_REAL_KEY_selftest_fixture_only";\nvoid main() { GetStorage().write("token", token); print("token=$token"); }\n');
  try {
    const rec = await scan.scanProject(dir);
    const c = rec.grade.counts;
    console.log(`Mobile Security selftest — ${scan.CHECKS.length} checks loaded (OWASP Mobile Top 10).`);
    console.log(`Sample "${rec.name}" → grade ${rec.grade.letter} (${rec.grade.score}/100): ${c.fail || 0} fail, ${c.warn || 0} review, ${c.ok || 0} pass, ${c.na || 0} n/a · gate ${rec.gate.pass ? 'PASS' : 'FAIL'}.`);
    process.exit(0);
  } catch (e) { console.error('selftest failed:', e.message); process.exit(1); }
}
