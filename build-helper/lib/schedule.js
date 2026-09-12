'use strict';
// Unattended scheduled builds: a 1-minute tick fires any app schedule whose day + time match now.
// Schedules are per-app (cfg.apps[path].schedules = [{env, time:'HH:MM', days:[0-6], artifacts:[]}]),
// edited in App Setup → Schedule. Scheduled builds are build-only (no distribution) and bypass the
// interactive guards — nobody's watching to answer a "Build anyway?" prompt.
// ponytail: build-only + guards bypassed. Add per-schedule destinations if unattended uploads matter.
const { readConfig, running } = require('./state');
const { detectApp } = require('./project');
const { handleBuild } = require('./build');

const _fired = new Set(); // "path|env|time|YYYY-MM-DDTHH:MM" — de-dupe within a minute

function runScheduled(projectPath, sched) {
  const app = detectApp(projectPath);
  const buildName = (app.version || '1.0.0').split('+')[0] || '1.0.0';
  const body = {
    path: projectPath, artifacts: sched.artifacts || [],
    envs: [{ env: sched.env, buildName, buildNumber: '1', autoNum: true, dest: { onedrive: [], firebase: [], play: [], testflight: [] } }],
    allowDirty: true, allowDuplicate: true, confirmProd: true, allowLowVersion: true,
  };
  const res = { writeHead() {}, write() { return true; }, end() {}, on() {} };
  console.log(`[schedule] ${app.name} ${sched.env} @ ${sched.time} → building (${(sched.artifacts || []).join(',')})`);
  handleBuild({ on() {} }, res, body).catch((e) => console.error('[schedule] build error:', e.message));
}

// Fire the first schedule matching `now`. Skips while a build is running (next tick retries).
function checkSchedules(now) {
  now = now || new Date();
  if (running.busy) return;
  const day = now.getDay();
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const stamp = `${now.toISOString().slice(0, 10)}T${hhmm}`;
  const apps = readConfig().apps || {};
  for (const [p, cfg] of Object.entries(apps)) {
    for (const s of (cfg.schedules || [])) {
      if (!s.env || !(s.artifacts || []).length || !(s.days || []).includes(day) || s.time !== hhmm) continue;
      const key = `${p}|${s.env}|${s.time}|${stamp}`;
      if (_fired.has(key)) continue;
      _fired.add(key); if (_fired.size > 300) _fired.delete(_fired.values().next().value);
      runScheduled(p, s); return; // one at a time
    }
  }
}

function startScheduler() { setInterval(() => { try { checkSchedules(); } catch (e) { console.error('[schedule]', e.message); } }, 60000); }

module.exports = { checkSchedules, runScheduled, startScheduler };
