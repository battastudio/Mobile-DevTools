'use strict';
// The build pipeline entry point. Sets up the cancellable SSE stream + one-at-a-time lock, resolves
// the app, runs guards, then loops per env: switch → version → build artifacts → upload → record.
// Phase detail lives in guards / artifacts / uploads / record; this file is the orchestration.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { FLUTTER, LOGS_DIR, readConfig, running, broadcast } = require('../state');
const { run, ARTIFACTS } = require('../shell');
const { detectApp, switchEnv, writeVersion, writeIosVersion, ensureAppFrameworkMinOS, ensureIosExportCompliance } = require('../project');
const { notify } = require('../messaging');
const { buildOptions, normalizeDestinations, preflightConnectors, checkGuards } = require('./guards');
const { buildEnvArtifacts } = require('./artifacts');
const { runUploads } = require('./uploads');
const { recordSuccess, recordFailure } = require('./record');
const { triggerSecurityScan } = require('./security');

async function handleBuild(req, res, body) {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  let clientOpen = true; res.on('close', () => { clientOpen = false; });
  const t0 = Date.now();
  const send = (event, data) => {
    running.seq++; running.log.push({ seq: running.seq, event, data });
    if (running.log.length > 2000) running.log.shift();
    if (clientOpen) { try { res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); } catch { clientOpen = false; } }
  };
  const step = (text) => send('step', { text, elapsedMs: Date.now() - t0 });
  const rootLog = (line) => send('log', { line });

  if (running.busy) { try { res.write(`event: error\ndata: ${JSON.stringify({ message: `A build is already running (${running.info?.project || 'another project'}) — press Stop or wait.` })}\n\n`); } catch {} return res.end(); }
  running.busy = true; running.aborted = false; running.log = []; running.seq = 0; running.startPath = body.path || '';

  const { path: projectPath, branch, envs, artifacts } = body;
  running.info = { project: path.basename(projectPath || ''), path: projectPath, envs: (envs || []).map((e) => e.env).join('/'), env: '', startedAt: Date.now() };
  broadcast('status', { busy: true, info: running.info });
  try {
    const app = detectApp(projectPath);
    const wanted = (artifacts || []).filter((a) => ARTIFACTS[a]);
    if (!wanted.length) throw new Error('No artifacts selected.');
    if (!envs || !envs.length) throw new Error('No environments selected.');
    const opts = buildOptions(projectPath);
    normalizeDestinations(app, projectPath, envs, wanted);
    preflightConnectors(app, projectPath, envs, wanted);
    const guardErr = await checkGuards(app, projectPath, envs, body);
    if (guardErr) { send('error', guardErr); return res.end(); }

    notify(`▶ ${app.name} ${envs.map((e) => e.env).join('/')} building…`);
    broadcast('feed', { project: app.name, kind: 'start', text: `building ${envs.map((e) => e.env).join('/')}` });
    if (branch) { step(`Checkout ${branch}`); await run('git', ['-C', projectPath, 'checkout', branch], projectPath, rootLog); }
    if (body.clean) { step('flutter clean'); await run(FLUTTER, ['clean'], projectPath, rootLog); }
    if (body.pubGet) { step('flutter pub get'); await run(FLUTTER, ['pub', 'get'], projectPath, rootLog); }
    for (const [flag, label, args] of [[body.runAnalyze, 'flutter analyze', ['analyze']], [body.runTest, 'flutter test', ['test']]]) {
      if (!flag) continue;
      step(label);
      try { await run(FLUTTER, args, projectPath, rootLog); }
      catch (e) { if (body.gateWarnOnly) rootLog(`⚠ ${label} failed (warn only): ${e.message}`); else throw new Error(`${label} failed — fix it or enable "warn only".`); }
    }
    // ponytail: arbitrary shell — trust boundary, but it's the user's own machine + their own per-app config (like a CI file).
    for (const cmd of opts.preBuild) { step('Pre-build: ' + cmd); await run('/bin/sh', ['-c', cmd], projectPath, rootLog); }
    let headCommit = null, remote = null;
    try { headCommit = execFileSync('git', ['-C', projectPath, 'rev-parse', 'HEAD']).toString().trim(); } catch {}
    try { remote = execFileSync('git', ['-C', projectPath, 'remote', 'get-url', 'origin']).toString().trim(); } catch {}

    let built = 0, failed = 0;
    for (const env of envs) {
      if (running.aborted) break;
      if (running.info) running.info.env = env.env;
      const envStart = Date.now();
      fs.mkdirSync(path.join(LOGS_DIR, app.name), { recursive: true });
      const logFile = path.join(LOGS_DIR, app.name, `${new Date().toISOString().replace(/[:.]/g, '-')}-${env.env}.log`);
      const logStream = fs.createWriteStream(logFile);
      const log = (line) => { send('log', { line }); try { logStream.write(line + '\n'); } catch {} };
      const ctx = { send, step, log };
      try {
        step(`── ${env.env.toUpperCase()} — v${env.buildName}+${env.buildNumber}`);
        switchEnv(app, env.env, log);
        writeVersion(app, env.buildName, env.buildNumber);
        log(`pubspec: version ${env.buildName}+${env.buildNumber}`);
        if (wanted.includes('ipa')) { writeIosVersion(app, env.buildName, env.buildNumber, log); ensureAppFrameworkMinOS(app, log); ensureIosExportCompliance(app, log); }
        const produced = await buildEnvArtifacts(app, env, wanted, opts, ctx);
        const up = await runUploads(app, env, produced, ctx);
        await recordSuccess(app, env, { produced, ...up, branch, headCommit, remote, logFile, envStart }, ctx);
        logStream.end(); built++;
      } catch (envErr) {
        try { logStream.end(); } catch {}
        if (running.aborted) break; // user pressed Stop — not a failure
        failed++;
        await recordFailure(app, env, { branch, headCommit, logFile, envStart, err: envErr }, ctx);
      }
    }
    if (built && opts.postBuild.length) {
      const penv = { ...process.env, BH_APP: app.name, BH_REPO: app.repo || '', BH_ENVS: envs.map((e) => e.env).join(','), BH_VERSION: `${envs[0].buildName}+${envs[0].buildNumber}` };
      for (const cmd of opts.postBuild) { step('Post-build: ' + cmd); try { await run('/bin/sh', ['-c', cmd], projectPath, rootLog, { env: penv }); } catch (e) { rootLog(`⚠ post-build failed (non-fatal): ${e.message}`); } }
    }
    if (built) { try { step('Security scan'); await triggerSecurityScan(projectPath, rootLog); } catch (e) { rootLog(`⚠ security scan skipped (non-fatal): ${e.message}`); } }
    send('done', { ok: true, built, failed });
  } catch (e) {
    notify(`❌ ${path.basename(projectPath || '')} failed: ${e.message}`);
    broadcast('feed', { project: path.basename(projectPath || ''), kind: 'error', text: e.message });
    send('error', { message: e.message });
  } finally {
    running.busy = false; running.info = null; broadcast('status', { busy: false });
  }
  res.end();
}

module.exports = { handleBuild };
