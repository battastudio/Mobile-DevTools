'use strict';
// Unattended scheduled builds: a 1-minute tick fires any app schedule whose day + time match now.
// Schedules are per-app (cfg.apps[path].schedules = [{env, time:'HH:MM', days:[0-6], artifacts:[]}]),
// edited in App Setup → Schedule. Scheduled builds are build-only (no distribution) and bypass the
// interactive guards — nobody's watching to answer a "Build anyway?" prompt.
// ponytail: build-only + guards bypassed. Add per-schedule destinations if unattended uploads matter.
const { readConfig, writeConfig, running } = require('./state');
const { detectApp } = require('./project');
const { handleBuild } = require('./build');

function runScheduled(projectPath, sched) {
  const app = detectApp(projectPath);
  const buildName = (app.version || '1.0.0').split('+')[0] || '1.0.0';
  const dest = sched.dest || { onedrive: [], firebase: [], play: [], testflight: [] };
  const body = {
    path: projectPath, artifacts: (sched.artifacts && sched.artifacts.length) ? sched.artifacts : ['apk'],
    envs: [{ env: sched.env, buildName, buildNumber: '1', autoNum: true, dest }],
    allowDirty: true, allowDuplicate: true, confirmProd: true, allowLowVersion: true,
  };
  const res = { writeHead() {}, write() { return true; }, end() {}, on() {} };
  console.log(`[schedule] ${app.name} ${sched.env} @ ${sched.time} → building (${body.artifacts.join(',')})`);
  handleBuild({ on() {} }, res, body).catch((e) => console.error('[schedule] build error:', e.message));
}

// Fire the first enabled schedule whose day + time match `now`, at most once per day (lastRunYmd is
// persisted). Skips while a build is running (next tick retries).
function checkSchedules(now) {
  now = now || new Date();
  if (running.busy) return;
  const day = now.getDay(), isWeekday = day >= 1 && day <= 5;
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const ymd = now.toISOString().slice(0, 10);
  const cfg = readConfig(), apps = cfg.apps || {};
  for (const [p, ax] of Object.entries(apps)) {
    for (const s of (ax.schedules || [])) {
      if (!s.enabled || !s.env || s.time !== hhmm) continue;
      if (s.days === 'weekdays' && !isWeekday) continue;
      if (s.lastRunYmd === ymd) continue;
      s.lastRunYmd = ymd; writeConfig(cfg);
      runScheduled(p, s); return; // one at a time
    }
  }
}

function startScheduler() { setInterval(() => { try { checkSchedules(); } catch (e) { console.error('[schedule]', e.message); } }, 60000); }

module.exports = { checkSchedules, runScheduled, startScheduler };
