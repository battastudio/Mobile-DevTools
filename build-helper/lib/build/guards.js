'use strict';
// Build preparation + guards: per-app options, destination normalization, connector preflight, and
// the version/duplicate/dirty/prod safety checks. Guards return an error object (or null) so the
// orchestrator can emit it and stop before any long work happens.
const { execFileSync } = require('child_process');
const { readConfig } = require('../state');
const { ARTIFACTS } = require('../shell');
const { nextBuildNumber, usedBuildNumbers } = require('../project');
const { setupStatus } = require('../setup');
const { appleAuth, playAccount } = require('../signing-config');
const { ascHighestVersion, cmpVer, bumpPatch } = require('../stores');

// Per-app build options (flavor, extra args, pre/post commands) from config.json.
function buildOptions(projectPath) {
  const ax = readConfig().apps?.[projectPath] || {};
  return {
    extraArgs: String(ax.buildArgs || '').trim() ? String(ax.buildArgs).trim().split(/\s+/) : [],
    flavorArgs: String(ax.flavor || '').trim() ? ['--flavor', String(ax.flavor).trim()] : [],
    preBuild: (Array.isArray(ax.preBuild) ? ax.preBuild : []).map((c) => String(c || '').trim()).filter(Boolean),
    postBuild: (Array.isArray(ax.postBuild) ? ax.postBuild : []).map((c) => String(c || '').trim()).filter(Boolean),
  };
}

// Normalize per-env upload destinations (matrix `dest`, or legacy flags) + apply auto build numbers.
function normalizeDestinations(app, projectPath, envs, wanted) {
  const pubspecNum = parseInt((app.version || '').split('+')[1] || '0', 10);
  for (const env of envs) {
    const d = env.dest || {};
    env.dest = {
      onedrive: d.onedrive || (env.uploadOneDrive ? [...wanted] : []),
      firebase: d.firebase || (env.uploadFirebase ? ['apk', 'aab'] : []),
      play: d.play || (env.uploadStore ? ['aab'] : []),
      testflight: d.testflight || (env.uploadStore ? ['ipa'] : []),
    };
    if (env.autoNum) env.buildNumber = String(nextBuildNumber(projectPath, env.env, pubspecNum));
  }
}

// Validate config only for the connectors actually selected — fail fast, before building. Throws.
function preflightConnectors(app, projectPath, envs, wanted) {
  const wantOnedrive = envs.some((e) => e.dest.onedrive.length);
  const wantPlay = envs.some((e) => e.dest.play.includes('aab'));
  const wantApple = envs.some((e) => e.dest.testflight.includes('ipa'));
  const wantFirebase = envs.some((e) => e.dest.firebase.length);
  if (!(wantOnedrive || wantPlay || wantApple || wantFirebase)) return;
  const st = setupStatus(); const cfg = readConfig();
  if (wantOnedrive && !st.onedriveConnected) throw new Error('OneDrive is selected but not connected. Open ⚙ Setup to connect it, or untick OneDrive.');
  if (wantFirebase && !st.firebaseCli) throw new Error('Firebase distribution needs firebase-tools. Open ⚙ Setup → Firebase, or untick it.');
  if (wantPlay) {
    if (!wanted.includes('aab')) throw new Error('Play upload is selected but no AAB artifact is chosen.');
    if (!((cfg.playAccounts || {})[projectPath] || playAccount())) throw new Error('Play upload needs Google Play configured. Open ⚙ App Setup → Google Play (or signing.json), or untick it.');
  }
  if (wantApple) {
    if (!wanted.includes('ipa')) throw new Error('TestFlight upload is selected but no IPA artifact is chosen.');
    if (!((cfg.appleAccounts || {})[projectPath] || appleAuth())) throw new Error('TestFlight upload needs Apple configured. Open ⚙ App Setup → Apple (or signing.json), or untick it.');
  }
}

// Marketing-version / duplicate build number / dirty tree / prod-publish guards. Returns {kind,...}|null.
async function checkGuards(app, projectPath, envs, body) {
  const wantApple = envs.some((e) => e.dest.testflight.includes('ipa'));
  if (wantApple && !body.allowLowVersion) {
    const cfg = readConfig();
    const apple = (cfg.appleAccounts || {})[projectPath] || appleAuth();
    const asc = await ascHighestVersion(app, apple);
    if (asc) {
      const fixes = envs.filter((e) => e.dest.testflight.includes('ipa') && cmpVer(e.buildName, asc) <= 0).map((e) => ({ env: e.env, suggested: bumpPatch(asc) }));
      if (fixes.length) {
        const who = fixes.map((f) => f.env.toUpperCase()).join(', ');
        return { kind: 'lowVersion', asc, suggested: bumpPatch(asc), fixes, message: `App Store Connect already has version ${asc}. ${who} version is not higher — Apple requires a higher app version (CFBundleShortVersionString). Use ${bumpPatch(asc)} or higher.` };
      }
    } else { console.log('[build] TestFlight version check skipped — could not read the current version from App Store Connect.'); }
  }
  if (!body.allowDuplicate) {
    for (const env of envs) if (usedBuildNumbers(projectPath, env.env).includes(parseInt(env.buildNumber, 10))) return { kind: 'duplicate', message: `Build number ${env.buildNumber} was already used for ${env.env.toUpperCase()}. Bump it, or Build anyway.` };
  }
  if (!body.allowDirty) {
    let dirty = ''; try { dirty = execFileSync('git', ['-C', projectPath, 'status', '--porcelain']).toString().trim(); } catch {}
    if (dirty) return { kind: 'dirty', message: `The repo has uncommitted changes:\n${dirty.split('\n').slice(0, 15).join('\n')}\n\nCommit/stash first, or Build anyway.` };
  }
  if (!body.confirmProd && envs.some((e) => (e.prod || e.env === 'prod') && (e.dest.play.includes('aab') && (e.track === 'production' || !e.track))))
    return { kind: 'confirm', message: 'This will publish a production build to a store / the production track. Confirm to proceed.' };
  return null;
}

module.exports = { buildOptions, normalizeDestinations, preflightConnectors, checkGuards };
