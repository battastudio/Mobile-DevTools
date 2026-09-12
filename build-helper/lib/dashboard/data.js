'use strict';
// Dashboard payload + storage/cleanup: the projects grid (cached briefly), build history, and
// artifact disk usage. The client computes KPIs/series/filters locally from `builds`.
const fs = require('fs');
const path = require('path');
const { ARTIFACTS_DIR, BUILDS_JSON, readJson, readConfig, projectsRoot, projectSources, running } = require('../state');
const { scanAll, appHealth, findAppIcon } = require('../project');

// Total + per-project artifact bytes under artifacts/.
function storageData() {
  const perProject = {}; let totalBytes = 0, files = 0;
  let dirs; try { dirs = fs.readdirSync(ARTIFACTS_DIR, { withFileTypes: true }); } catch { dirs = []; }
  for (const d of dirs) {
    if (!d.isDirectory()) continue;
    let sum = 0; let ents; try { ents = fs.readdirSync(path.join(ARTIFACTS_DIR, d.name)); } catch { ents = []; }
    for (const n of ents) { try { const s = fs.statSync(path.join(ARTIFACTS_DIR, d.name, n)); sum += s.size; files++; } catch {} }
    if (sum) { perProject[d.name] = sum; totalBytes += sum; }
  }
  return { totalBytes, files, perProject };
}

// The per-app scan is the expensive part; cache it briefly so nav-backs and feed refreshes reuse it.
let _dashCache = { key: '', t: 0, projects: null };
function dashboardData() {
  const sources = projectSources();
  const key = JSON.stringify(sources);
  const all = readJson(BUILDS_JSON, []);
  const apps = readConfig().apps || {};
  const now = Date.now();
  let projects;
  if (_dashCache.projects && _dashCache.key === key && now - _dashCache.t < 4000) { projects = _dashCache.projects; }
  else {
    projects = scanAll(sources).map((p) => {
      const pb = all.filter((b) => b.path === p.path);
      const last = pb[0] || null;
      const h = appHealth(p.path, { needsConfig: p.needsConfig, firebase: p.firebase });
      return { ...p, buildCount: pb.length, hasIcon: !!findAppIcon(p.path),
        favorite: !!(apps[p.path] && apps[p.path].favorite),
        order: apps[p.path] && apps[p.path].order != null ? apps[p.path].order : undefined,
        healthOk: h.envDetected && h.signing && h.packageId,
        lastBuild: last ? { time: last.time, version: last.version, env: last.env, buildOk: last.buildOk !== false, upload: last.upload || {}, durationMs: last.durationMs || null } : null };
    });
    projects.sort((a, b) => (b.favorite - a.favorite)
      || ((a.order == null ? 1e9 : a.order) - (b.order == null ? 1e9 : b.order))
      || ((b.lastBuild ? new Date(b.lastBuild.time) : 0) - (a.lastBuild ? new Date(a.lastBuild.time) : 0))
      || a.name.localeCompare(b.name));
    _dashCache = { key, t: now, projects };
  }
  return { builds: all.slice(0, 500), projects, storage: storageData(), running: { busy: running.busy, info: running.info }, root: projectsRoot(), sources };
}

function cleanupArtifacts(body) {
  const olderThanDays = body.olderThanDays == null ? 30 : Number(body.olderThanDays);
  const cutoff = Date.now() - olderThanDays * 864e5;
  let freed = 0, removed = 0;
  let dirs; try { dirs = fs.readdirSync(ARTIFACTS_DIR, { withFileTypes: true }); } catch { dirs = []; }
  for (const d of dirs) {
    if (!d.isDirectory()) continue;
    if (body.project && d.name !== body.project) continue;
    let ents; try { ents = fs.readdirSync(path.join(ARTIFACTS_DIR, d.name)); } catch { continue; }
    for (const n of ents) { const f = path.join(ARTIFACTS_DIR, d.name, n); try { const s = fs.statSync(f); if (s.mtimeMs < cutoff) { fs.unlinkSync(f); freed += s.size; removed++; } } catch {} }
  }
  return { freed, removed };
}

function findBuild(time) { return readJson(BUILDS_JSON, []).find((b) => b.time === time) || null; }

module.exports = { storageData, dashboardData, cleanupArtifacts, findBuild };
