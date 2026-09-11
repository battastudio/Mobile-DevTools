'use strict';
// generateBlueprint — compose the structure, reference Dart, pubspec, docs and
// config files into one tabbed file set, plus resolved packages + advisories.
// dartFiles OVERLAYS structure: where both emit the same path the reference-Dart
// body (tab 'code') wins over the thin structure skeleton (tab 'structure').
const { resolvePackages } = require('./packages');
const { validateConfig } = require('./validate');
const { structure } = require('./generators/structure');
const { pubspec } = require('./generators/pubspec');
const { packagesMd } = require('./generators/packages-md');
const { claudeMd } = require('./generators/claude-md');
const { agentsMd } = require('./generators/agents-md');
const { featureDocs } = require('./generators/feature-docs');
const { setup } = require('./generators/setup');
const { manifest } = require('./generators/manifest');
const { analysisOptions } = require('./generators/analysis-options');
const { dartFiles } = require('./generators/dart');
const { repoFiles } = require('./generators/repo');

function generateBlueprint(config) {
  const packages = resolvePackages(config);
  const tag = (files, tab) => files.map((f) => ({ ...f, tab }));

  // Dedupe by path — later writers win, so reference Dart overlays skeletons.
  const byPath = new Map();
  for (const f of tag(structure(config), 'structure')) byPath.set(f.path, f);
  for (const f of tag(dartFiles(config), 'code')) byPath.set(f.path, f);

  const files = [
    ...byPath.values(),
    { path: 'pubspec.yaml', content: pubspec(config, packages), tab: 'pubspec' },
    { path: 'analysis_options.yaml', content: analysisOptions(config), tab: 'config' },
    { path: 'CLAUDE.md', content: claudeMd(config), tab: 'docs' },
    { path: 'AGENTS.md', content: agentsMd(config), tab: 'docs' },
    { path: 'PACKAGES.md', content: packagesMd(config, packages), tab: 'docs' },
    { path: 'SETUP.md', content: setup(config), tab: 'docs' },
    { path: 'MANIFEST.md', content: manifest(config), tab: 'config' },
    ...tag(featureDocs(config), 'docs'),
    // Repo hygiene / DX — README to docs, dotfiles to config.
    ...repoFiles(config).map((f) => ({ ...f, tab: f.path.endsWith('.md') ? 'docs' : 'config' })),
  ];

  return { files, packages, warnings: validateConfig(config) };
}

module.exports = { generateBlueprint };
