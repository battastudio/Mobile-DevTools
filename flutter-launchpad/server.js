'use strict';
// Flutter Launchpad — assemble a project config in the UI and generate a complete,
// best-practice Flutter scaffold. Wiring only (createKitServer + routes); the engine
// lives under lib/. No auth (kit passes user=null).
const path = require('path');
const kit = require('../platform-kit');
const schema = require('./lib/schema');
const zip = require('./lib/zip');
const { parseConfig } = schema;
const { generateBlueprint } = require('./lib/generate');
const { packageZip } = require('./lib/export');
const { SECTIONS, COND } = require('./lib/options');
const { PACKAGE_CATALOG } = require('./lib/packages');
const { RECIPES } = require('./lib/recipes');

// --selftest: schema demo + zip demo + a default generate must emit a real tree.
if (process.argv.includes('--selftest')) {
  const assert = require('assert');
  schema.demo();
  zip.demo();
  const bp = generateBlueprint(parseConfig({}));
  const paths = new Set(bp.files.map((f) => f.path));
  assert.ok(bp.files.length > 0, 'blueprint must emit files');
  assert.ok(paths.has('pubspec.yaml'), 'must emit pubspec.yaml');
  assert.ok(paths.has('lib/main.dart'), 'must emit lib/main.dart');
  console.log(`selftest ok — ${bp.files.length} files, ${bp.packages.deps.length} deps, ${bp.warnings.length} advisories`);
  process.exit(0);
}

const app = kit.createKitServer({
  id: 'flutter-launchpad',
  name: 'Flutter Launchpad',
  defaultPort: 4120,
  publicDir: path.join(__dirname, 'public'),
  dataDir: kit.dataDir('flutter-launchpad'),
  repoDir: path.join(__dirname, '..'),
  manifest: { kind: 'tool', modes: schema.LAUNCHPAD_MODES },
});
kit.team.register(app);

// GET /catalog — everything the UI needs to render the config form.
app.r('GET', '/catalog', ({ res }) =>
  app.sendJson(res, 200, { options: { sections: SECTIONS, cond: COND }, packages: PACKAGE_CATALOG, recipes: RECIPES, defaults: schema.defaultConfig }),
);

// POST /generate — the in-memory tabbed file tree + resolved packages + advisories.
app.r('POST', '/generate', ({ res, body }) => {
  try {
    app.sendJson(res, 200, generateBlueprint(parseConfig(body || {})));
  } catch (e) {
    app.sendJson(res, 400, { error: e.message });
  }
}, { body: true });

// POST /export — a downloadable .zip of the generated project.
app.r('POST', '/export', ({ res, body }) => {
  try {
    const config = parseConfig(body || {});
    const { files } = generateBlueprint(config);
    const root = (config.appName || 'app').replace(/[^a-zA-Z0-9_-]/g, '_') || 'app';
    const buf = packageZip(root, files);
    res.writeHead(200, { 'Content-Type': 'application/zip', 'Content-Disposition': `attachment; filename="${root}.zip"`, 'Content-Length': buf.length });
    res.end(buf);
  } catch (e) {
    app.sendJson(res, 400, { error: e.message });
  }
}, { body: true });

if (require.main === module) app.start();

module.exports = app;
