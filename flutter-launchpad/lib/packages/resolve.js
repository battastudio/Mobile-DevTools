'use strict';
// resolvePackages — turn a config into deduped, tiered dep/dev lists. Honors the
// structured base sets for the two structured modes and the generic set.
const { PACKAGE_CATALOG } = require('./catalog');
const { collect } = require('./collect');

// Highest tier wins when a package is added by more than one selection.
const RANK = { req: 3, rec: 2, opt: 1 };

function resolvePackages(config) {
  const deps = new Map();
  const dev = new Map();
  const add = (m, name, tier) => {
    if (!PACKAGE_CATALOG[name]) return; // ignore unknown selections
    const cur = m.get(name);
    if (!cur || RANK[tier] > RANK[cur]) m.set(name, tier);
  };
  const dep = (name, tier) => add(deps, name, tier);
  const dv = (name, tier) => add(dev, name, tier);

  collect(config, dep, dv);

  const toList = (m) =>
    [...m.entries()]
      .map(([name, tier]) => ({ name, tier, ...PACKAGE_CATALOG[name] }))
      .sort((a, b) => RANK[b.tier] - RANK[a.tier] || a.name.localeCompare(b.name));

  return { deps: toList(deps), dev: toList(dev) };
}

module.exports = { resolvePackages, RANK };
