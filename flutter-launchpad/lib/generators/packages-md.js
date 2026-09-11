'use strict';
// PACKAGES.md — a human-readable rationale for every dependency, grouped by tier.
const { resolvePackages } = require('../packages');

const TIER_LABEL = { req: 'Required', rec: 'Recommended', opt: 'Optional' };

function packagesMd(config, pkgs) {
  const { deps, dev } = pkgs || resolvePackages(config);
  const row = (p) => `| [\`${p.name}\`](${p.url}) | ${p.version} | ${TIER_LABEL[p.tier]} | ${p.purpose} |`;
  const table = (list) =>
    list.length
      ? ['| Package | Version | Tier | Purpose |', '| --- | --- | --- | --- |', ...list.map(row)]
      : ['_None._'];

  return [
    `# Packages — ${config.appName}`,
    '',
    `Resolved for **${config.mode}** mode. Tiers: Required (mode/selection needs it), Recommended, Optional.`,
    '',
    '## Dependencies',
    ...table(deps),
    '',
    '## Dev dependencies',
    ...table(dev),
    '',
    '> `flutter_screenutil` is pinned in pubspec for sizing but treated as doc-level:',
    '> size with `.w/.h/.sp/.r`, never raw px.',
    '',
  ].join('\n');
}

module.exports = { packagesMd };
