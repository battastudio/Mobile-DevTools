'use strict';
// Persist a build result: changelog entry, optional git commit+tag, the builds.json record, the
// local activity feed, notifications, and the SSE done-env event. One for success, one for failure.
const fs = require('fs');
const path = require('path');
const { LOGS_DIR, BUILDS_JSON, readJson, writeJson, broadcast } = require('../state');
const { run } = require('../shell');
const { appendChangelog, profileName, pushTeamRecord } = require('../project');
const { notify } = require('../messaging');

const rel = (logFile) => path.relative(LOGS_DIR, logFile);

async function recordSuccess(app, env, d, ctx) {
  const { send, step, log } = ctx;
  const { produced, upload, testflightInfo, onedriveFolderUrl, tasks, playVersionCode, branch, headCommit, remote, logFile, envStart } = d;
  const version = `${env.buildName}+${env.buildNumber}`;
  appendChangelog(app, `${version} (${env.env})`, env.whatsNew, new Date().toISOString().slice(0, 10));

  let tag = null;
  if (env.commitTag) {
    try {
      tag = `${app.name}-v${version}`;
      step('git commit + tag');
      await run('git', ['-C', app.path, 'add', 'pubspec.yaml', app.envFile].filter(Boolean), app.path, log);
      await run('git', ['-C', app.path, 'commit', '-m', `release ${version} (${env.env})${tasks.count ? ` · ${tasks.count} tasks` : ''}`], app.path, log);
      await run('git', ['-C', app.path, 'tag', tag], app.path, log);
      if (env.push) { await run('git', ['-C', app.path, 'push'], app.path, log); await run('git', ['-C', app.path, 'push', 'origin', tag], app.path, log); }
    } catch (e) { log(`git release step failed (non-fatal): ${e.message}`); }
  }

  const record = { time: new Date().toISOString(), project: app.name, repo: app.repo, path: app.path,
    env: env.env, version, buildName: env.buildName, buildNumber: env.buildNumber, branch: branch || null, notes: env.notes || '', whatsNew: env.whatsNew || '',
    artifacts: produced.map((p) => ({ art: p.art, name: p.name, url: p.url, size: p.size, onedriveUrl: p.onedriveUrl || null })),
    upload, testflight: testflightInfo, onedriveUrl: onedriveFolderUrl, logFile: rel(logFile), commit: headCommit, remote, tag,
    taskCount: tasks.count, tasks: tasks.items, playVersionCode, durationMs: Date.now() - envStart, buildOk: true, by: profileName() };
  const hist = readJson(BUILDS_JSON, []); hist.unshift(record); writeJson(BUILDS_JSON, hist);
  pushTeamRecord(record);
  notify(`✅ ${app.name} ${env.env} ${version} built — ${produced.map((p) => p.art).join(', ') || 'no artifacts'}` + (produced[0] ? `\n${produced[0].url}` : ''));
  broadcast('feed', { project: app.name, kind: 'done', text: `${env.env} ${version} ✓` });
  send('done-env', { env: env.env, record });
}

async function recordFailure(app, env, d, ctx) {
  const { send, log } = ctx;
  const { branch, headCommit, logFile, envStart, err } = d;
  let hint = '';
  try { if (/storeFile|SigningConfig/i.test(fs.readFileSync(logFile, 'utf8'))) hint = ' — release signing not configured for this app (add android/key.properties + keystore, or a debug fallback).'; } catch {}
  const msg = `${err.message}${hint}`;
  log(`✖ ${env.env.toUpperCase()} build failed: ${msg}`);
  const record = { time: new Date().toISOString(), project: app.name, repo: app.repo, path: app.path,
    env: env.env, version: `${env.buildName}+${env.buildNumber}`, buildName: env.buildName, buildNumber: env.buildNumber, branch: branch || null, notes: env.notes || '', whatsNew: env.whatsNew || '',
    artifacts: [], upload: {}, logFile: rel(logFile), commit: headCommit, durationMs: Date.now() - envStart, buildOk: false, error: msg, by: profileName() };
  const hist = readJson(BUILDS_JSON, []); hist.unshift(record); writeJson(BUILDS_JSON, hist);
  pushTeamRecord(record);
  notify(`❌ ${app.name} ${env.env} ${env.buildName}+${env.buildNumber} failed: ${err.message}`);
  broadcast('feed', { project: app.name, kind: 'error', text: `${env.env} build failed` });
  send('done-env', { env: env.env, record });
}

module.exports = { recordSuccess, recordFailure };
