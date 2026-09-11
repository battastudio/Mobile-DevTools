'use strict';
// FL-1 emits the folder structure + barrels + thin skeletons. structure() picks the
// structured (feature-folder) tree or the generic (layer-folder) tree, then appends
// the asset-folder placeholders declared in pubspec.
const { isStructured } = require('../../schema');
const { structuredStructure } = require('./structured');
const { genericStructure } = require('./generic');

// Asset folders declared in pubspec must exist — emit a .gitkeep so they show in the
// tree (and survive git) regardless of mode. sfx/ only when SFX is on.
function assetPlaceholders(config) {
  const keep = '# Keeps this asset folder in git. Drop your files here.\n';
  const dirs = ['assets/images', 'assets/svg', 'assets/fonts', 'assets/icon', 'assets/splash'];
  if (config.platform.sfx) dirs.push('assets/sfx');
  return dirs.map((d) => ({ path: `${d}/.gitkeep`, content: keep }));
}

function structure(config) {
  const base = isStructured(config) ? structuredStructure(config) : genericStructure(config);
  return [...base, ...assetPlaceholders(config)];
}

module.exports = { structure };
