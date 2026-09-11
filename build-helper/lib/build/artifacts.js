'use strict';
// Per-env artifact build: run `flutter build <art>` for each wanted artifact, resolve the output,
// rename+collect it into artifacts/, and flag size regressions vs the last build.
const fs = require('fs');
const path = require('path');
const { PORT, FLUTTER, readConfig } = require('../state');
const { run, ARTIFACTS } = require('../shell');
const { collectArtifact, lastArtifactSize, lanIp } = require('../project');
const { findIpa } = require('../stores');
const { notify } = require('../messaging');

async function buildEnvArtifacts(app, env, wanted, opts, ctx) {
  const { step, log, send } = ctx;
  const projectPath = app.path;
  const produced = []; // {art, src, name, path, url, size}
  for (const art of wanted) {
    step(`Build ${art.toUpperCase()} (${env.env})`);
    await run(FLUTTER, ['build', ARTIFACTS[art].cmd, '--release', `--build-name=${env.buildName}`, `--build-number=${env.buildNumber}`, ...opts.flavorArgs, ...opts.extraArgs], projectPath, log);
    const src = art === 'ipa' ? findIpa(projectPath) : path.join(projectPath, ARTIFACTS[art].out);
    if (!src || !fs.existsSync(src)) { log(`⚠ ${art}: build output not found${art === 'ipa' ? ' (iOS signing may have failed)' : ''}`); continue; }
    const col = collectArtifact(app, env.env, art, src, env.buildName, env.buildNumber);
    const size = fs.statSync(col.path).size;
    const url = `http://${lanIp()}:${PORT}/artifact?path=${encodeURIComponent(col.path)}`;
    produced.push({ art, ...col, url, size });
    const prevSize = lastArtifactSize(projectPath, env.env, art);
    if (prevSize && size > prevSize * 1.15) {
      const pct = Math.round((size / prevSize - 1) * 100);
      log(`⚠ size regression: ${art.toUpperCase()} grew ${pct}% (${(prevSize / 1e6).toFixed(1)} → ${(size / 1e6).toFixed(1)} MB)`);
      notify(`⚠ ${app.name} ${env.env} ${art.toUpperCase()} size +${pct}% (${(size / 1e6).toFixed(1)} MB)`);
    }
    send('artifact', { art, name: col.name, size, url, path: col.path });
    log(`artifact: ${col.name} (${(size / 1e6).toFixed(1)} MB)`);
  }
  return produced;
}

module.exports = { buildEnvArtifacts };
