'use strict';
// The static catalog of the four Mobile DevTools tools the hub launches. Open-source edition:
// every tool is always available, there are no accounts, no enable/disable, and no remote mode.
// `serve.js` spawns each tool's server.js on its fixed port; the hub UI links to them.
const path = require('path');

const ROOT = path.join(__dirname, '..');
const HUB_PORT = 4090;

const CATALOG = [
  { id: 'build-helper', name: 'Build Helper', icon: 'rocket', port: 4095,
    desc: 'Switch Flutter environments/flavors, bump versions, build APK/AAB/IPA, and distribute.' },
  { id: 'mobile-qa', name: 'Mobile QA', icon: 'flask', port: 4113,
    desc: 'flutter analyze/test/coverage with grading, plus a device lab (adb/simctl): install, launch, capture.' },
  { id: 'mobile-security', name: 'Mobile Security', icon: 'shield', port: 4110,
    desc: 'OWASP Mobile Top 10 scanning for Flutter — findings, grading, SBOM, CVE lookup, git-secret detection.' },
  { id: 'flutter-launchpad', name: 'Flutter Launchpad', icon: 'boxes', port: 4120,
    desc: 'Assemble a project config in the UI and generate a complete, best-practice Flutter scaffold.' },
];

const catalogById = (id) => CATALOG.find((t) => t.id === id);
const toolDir = (id) => path.join(ROOT, id);
const toolUrl = (t) => `http://localhost:${t.port}`;
const hasTool = (id) => { try { return require('fs').existsSync(path.join(toolDir(id), 'server.js')); } catch { return false; } };

module.exports = { CATALOG, HUB_PORT, ROOT, catalogById, toolDir, toolUrl, hasTool };
