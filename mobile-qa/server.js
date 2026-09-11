#!/usr/bin/env node
'use strict';
// Mobile QA — Flutter analyze/test/coverage grading engine + Device Lab, built on platform-kit.
// Wiring only: create the kit server, register the shared team + connectors layers and the QA
// route groups, then start (or handle a --selftest / --qa CLI run). Logic lives in lib/{qa,device,ai}.
const path = require('path');
const { createKitServer, team, connectors, dataDir } = require('../platform-kit');
const registerRoutes = require('./lib/routes');
const cli = require('./lib/cli');

const app = createKitServer({
  id: 'mobile-qa', name: 'Mobile QA', defaultPort: 4113, repoDir: __dirname,
  publicDir: path.join(__dirname, 'public'), dataDir: dataDir('mobile-qa'),
  manifest: {
    icon: 'flask', color: 'brand', platform: 'flutter', platformLabel: 'Mobile (Flutter)',
    description: 'Flutter analyze/test/coverage grading + guided test types, scaffolds, AI generation, and a Device Lab.',
    nav: [{ id: 'dashboard', label: 'Dashboard' }, { id: 'run', label: 'Run QA' }, { id: 'device', label: 'Device Lab' }],
    capabilities: ['test', 'lint', 'coverage', 'report', 'device'],
  },
});

team.register(app);             // /api/team*, profile, notifications, email (no auth — user=null)
connectors.registerRoutes(app); // /api/connectors* (QA results → issue trackers)
registerRoutes(app);            // QA + Device Lab + AI + share route groups

if (!cli.run()) app.start();
