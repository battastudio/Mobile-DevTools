'use strict';
// Per-env distribution: gather release-note tasks, then upload the collected artifacts to OneDrive
// (rclone, user's own config), Firebase, Google Play, and TestFlight, plus iOS crash symbols.
const { RCLONE, readConfig } = require('../state');
const { run, captureCmd, rc } = require('../shell');
const { collectTasks } = require('../trackers');
const { formatTasks } = require('../../../platform-kit').connectors;
const { uploadToFirebase, uploadToPlay, uploadToTestFlight, uploadDsyms } = require('../stores');

// Release notes = base notes + tasks referenced in commits since the last build (deduped).
async function buildReleaseNotes(app, env) {
  const tasks = await collectTasks(app.path, env.env);
  if (Array.isArray(env.jiraTasks) && env.jiraTasks.length) {
    const seen = new Set(tasks.items.map((i) => i.key));
    for (const t of env.jiraTasks) if (t && t.key && !seen.has(t.key)) { seen.add(t.key); tasks.items.push({ tracker: 'jira', key: t.key, title: t.title || '', state: t.state || '' }); }
    tasks.items.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
    tasks.count = tasks.items.length; tasks.text = tasks.count ? formatTasks(tasks.items) : '';
  }
  const baseNotes = env.whatsNew || env.notes || '';
  const releaseNotes = tasks.text && !/Tasks in this release/i.test(baseNotes) ? [baseNotes, tasks.text].filter(Boolean).join('\n\n') : baseNotes;
  return { tasks, releaseNotes };
}

async function runUploads(app, env, produced, ctx) {
  const { step, log } = ctx;
  const cfg = readConfig();
  const projectPath = app.path;
  const upload = { onedrive: 'skipped', play: 'skipped', testflight: 'skipped', firebase: 'skipped' };
  let testflightInfo = null, onedriveFolderUrl = null, playVersionCode = null;
  const { tasks, releaseNotes } = await buildReleaseNotes(app, env);
  if (tasks.count) log(`tasks: ${tasks.count} in release (${tasks.items.map((i) => i.key).join(', ')})`);

  // OneDrive — all collected (renamed) artifacts routed to OneDrive.
  const odArtifacts = produced.filter((a) => env.dest.onedrive.includes(a.art));
  if (odArtifacts.length) {
    upload.onedrive = 'ok';
    const odName = app.repo || app.name; // repo name so folders are stable across local clones
    const envPath = `${cfg.onedrive.remote}:${cfg.onedrive.base}/${odName}/${env.env}`;
    for (const a of odArtifacts) {
      step(`OneDrive ${a.art.toUpperCase()} → ${envPath}/`);
      try {
        await run(RCLONE, rc(['copy', a.path, envPath + '/', '--progress']), projectPath, log);
        try { a.onedriveUrl = await captureCmd(RCLONE, rc(['link', `${envPath}/${a.name}`]), projectPath); if (a.onedriveUrl) log(`link: ${a.onedriveUrl}`); }
        catch (e) { log(`OneDrive share link unavailable (upload OK): ${e.message.split('\n')[0]}`); }
      } catch (e) { upload.onedrive = 'failed'; log(`rclone failed: ${e.message}`); }
    }
    if (upload.onedrive === 'ok') {
      try { onedriveFolderUrl = await captureCmd(RCLONE, rc(['link', envPath]), projectPath); if (onedriveFolderUrl) log(`folder link: ${onedriveFolderUrl}`); }
      catch (e) { log(`OneDrive folder link unavailable (upload OK): ${e.message.split('\n')[0]}`); }
    }
  }

  // Firebase App Distribution — apk preferred (fallback aab).
  if (env.dest.firebase.length) {
    const fbArt = produced.find((p) => p.art === 'apk' && env.dest.firebase.includes('apk')) || produced.find((p) => p.art === 'aab' && env.dest.firebase.includes('aab'));
    if (fbArt) { step('Firebase App Distribution'); try { await uploadToFirebase(app, fbArt.path, releaseNotes, log); upload.firebase = 'ok'; } catch (e) { upload.firebase = 'failed'; log(`firebase failed: ${e.message}`); } }
    else log('Firebase: skipped — needs an APK or AAB artifact.');
  }
  // Google Play (AAB) and TestFlight (IPA) are independent per the destination matrix.
  if (env.dest.play.includes('aab')) {
    const aab = produced.find((p) => p.art === 'aab');
    if (aab) { step('Google Play upload'); try { playVersionCode = await uploadToPlay(app, aab.path, env.track || (cfg.playAccounts || {})[app.path]?.defaultTrack || cfg.play?.defaultTrack || 'internal', releaseNotes, log, { uploadSymbols: env.uploadSymbols }); upload.play = 'ok'; } catch (e) { upload.play = 'failed'; log(`play failed: ${e.message}`); } }
    else log('Google Play: skipped — no AAB artifact was built.');
  }
  if (env.dest.testflight.includes('ipa')) {
    const ipa = produced.find((p) => p.art === 'ipa');
    if (ipa) { step('TestFlight upload'); try { const r = await uploadToTestFlight(app, ipa.path, env.buildName, env.buildNumber, !!env.validate, releaseNotes, log); upload.testflight = 'ok'; testflightInfo = { state: r.state, url: r.url, tfLink: r.tfLink }; } catch (e) { upload.testflight = 'failed'; testflightInfo = { error: e.message }; log(`✖ testflight failed: ${e.message}`); } }
    else log('TestFlight: skipped — no IPA artifact was built.');
  }
  if (produced.some((p) => p.art === 'ipa') && !env.dest.testflight.includes('ipa')) log('ℹ️ IPA built but not sent to TestFlight — open the build and click "✈️ TestFlight" to upload it now, or tick IPA → TestFlight next time.');
  if (produced.some((p) => p.art === 'aab') && !env.dest.play.includes('aab')) log('ℹ️ AAB built but not sent to Play — click "▶ Play" on the build to upload it now, or tick AAB → Play next time.');
  if (env.uploadSymbols && produced.some((p) => p.art === 'ipa')) { step('Upload iOS crash symbols'); try { await uploadDsyms(app, log); } catch (e) { log(`symbols failed (non-fatal): ${e.message}`); } }

  return { upload, testflightInfo, onedriveFolderUrl, playVersionCode, tasks, releaseNotes };
}

module.exports = { buildReleaseNotes, runUploads };
