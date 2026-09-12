'use strict';
// Self-update: pull the latest code for this tool's repo and report progress. The relaunch model
// differs from the launchd-KeepAlive setup — here the hub manages processes — so we pull + report
// "restart to apply" rather than force-exiting a process nothing may respawn.
// ponytail: no auto-exit. Under a KeepAlive service you could process.exit(0) after a successful pull.
const { execFileSync } = require('child_process');
const { ROOT } = require('./state');
const { run } = require('./shell');

const _git = (args) => { try { return execFileSync('git', ['-C', ROOT, ...args], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return ''; } };

function toolVersion() {
  let behind = 0; try { behind = parseInt(_git(['rev-list', '--count', 'HEAD..@{u}']) || '0', 10) || 0; } catch {}
  return { version: _git(['rev-parse', '--short', 'HEAD']) || 'dev', branch: _git(['rev-parse', '--abbrev-ref', 'HEAD']) || '', behind };
}

function toolChangelog() {
  const out = _git(['log', '-20', '--pretty=%h%x09%s%x09%cs']);
  return out ? out.split('\n').filter(Boolean).map((l) => { const [sha, subject, date] = l.split('\t'); return { sha, subject, date }; }) : [];
}

async function selfUpdate(req, res) {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  const send = (e, d) => res.write(`event: ${e}\ndata: ${JSON.stringify(d)}\n\n`);
  const log = (line) => send('log', { line });
  try {
    send('step', { text: 'git pull --ff-only' });
    await run('git', ['-C', ROOT, 'pull', '--ff-only'], ROOT, log);
    log('✓ updated — restart Build Helper (or the hub) to apply the new code.');
    send('done', { ok: true, restart: true });
  } catch (e) { send('error', { message: e.message }); }
  res.end();
}

module.exports = { toolVersion, toolChangelog, selfUpdate };
