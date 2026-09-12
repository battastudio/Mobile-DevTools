// Build Helper frontend — shared state + constants + tiny formatters. Loaded first; everything
// else (api, components, views, app) reads from these globals. No framework state here: Vue owns
// only the topnav + a persistent #bhbody that the imperative view renderers fill (see app.js).
'use strict';

// One mutable state bag. Views read/write it; there's no store abstraction — it's a single-user
// local tool, so a plain object is plenty.
window.BH = {
  view: 'dashboard', root: '', toolName: 'Build Helper',
  sources: { roots: [], pinned: [], recursive: false },   // scan roots + pinned project paths
  projects: [], builds: [], storage: {}, running: { busy: false },
  project: null,          // the /api/project payload for the open project
  sel: null,              // open project path
};

// The three build artifacts flutter can produce, in the order the UI lists them.
window.ARTS = [
  { id: 'apk', label: 'APK', hint: 'Android sideload / testers' },
  { id: 'aab', label: 'AAB', hint: 'Play Store bundle' },
  { id: 'ipa', label: 'IPA', hint: 'iOS / TestFlight' },
];

// Logical env → kit color token (matches lib/project/detect.js DEFAULT_ENV_COLOR).
window.ENV_COLOR = { dev: 'sky', demo: 'violet', qa: 'amber', prod: 'emerald' };

// Views register themselves here so app.js can dispatch by name.
window.V = {};

// Build-page runtime globals (source names): current project payload + the running-build tracker.
var CUR = null, BUILDLOG = null, BUILDING = false, LOG = null;

window.verName = (v) => String(v || '').split('+')[0] || '1.0.0';
window.fmtDur = (ms) => (ms ? Math.round(ms / 1000) + 's' : '');
window.envColor = (k) => window.ENV_COLOR[k] || 'slate';
