'use strict';
// Media capture — screenshots and screen recordings via adb (Android) or xcrun simctl (iOS sim).
// Recordings run as detached children tracked in process.js so stopAll() can end them.
const fs = require('fs');
const path = require('path');
const { ADB, capture, captureBuf, spawnStream, recordings } = require('./process');
const { artDir, stamp, artUrl } = require('./artifacts');

async function screenshot(dev, projectPath) {
  const dir = artDir(projectPath); const file = path.join(dir, `shot-${stamp(new Date())}.png`);
  if (dev.platform === 'android') {
    const r = await captureBuf(ADB, ['-s', dev.id, 'exec-out', 'screencap', '-p']);
    if (!r.ok || !r.buf || !r.buf.length) return { ok: false, error: 'adb screencap failed (device booted & authorized?)' };
    fs.writeFileSync(file, r.buf);
  } else if (dev.platform === 'ios-sim') {
    const r = await capture('xcrun', ['simctl', 'io', dev.id, 'screenshot', file]);
    if (!r.ok) return { ok: false, error: 'simctl screenshot failed: ' + r.err.slice(0, 200) };
  } else if (dev.caps && dev.caps.screenshot) {
    const r = await capture('flutter', ['screenshot', '-d', dev.id, '--out', file], projectPath, 60000);
    if (!r.ok) return { ok: false, error: 'flutter screenshot failed: ' + r.err.slice(0, 200) };
  } else {
    return { ok: false, error: 'Screenshots are not supported on this physical device (needs libimobiledevice/ios-deploy). Use an iOS simulator or Android device.' };
  }
  return { ok: true, file, url: artUrl(file) };
}

async function recordStart(dev, projectPath) {
  if (recordings.has(dev.id)) return { ok: false, error: 'Already recording this device.' };
  const dir = artDir(projectPath); const file = path.join(dir, `rec-${stamp(new Date())}.mp4`);
  if (dev.platform === 'android') {
    const remote = '/sdcard/qa_rec_' + Date.now() + '.mp4';
    const { child } = spawnStream(ADB, ['-s', dev.id, 'shell', 'screenrecord', '--time-limit', '180', remote], null, null);
    recordings.set(dev.id, { child, file, remote });
  } else if (dev.platform === 'ios-sim') {
    const { child } = spawnStream('xcrun', ['simctl', 'io', dev.id, 'recordVideo', '--codec', 'h264', '--force', file], null, null);
    recordings.set(dev.id, { child, file });
  } else return { ok: false, error: 'Screen recording needs an Android device or iOS simulator.' };
  return { ok: true, recording: true };
}
async function recordStop(dev, projectPath) {
  const rec = recordings.get(dev.id); if (!rec) return { ok: false, error: 'Not recording.' };
  recordings.delete(dev.id);
  try { rec.child.kill('SIGINT'); } catch {}
  await new Promise((res) => setTimeout(res, 1200));
  if (dev.platform === 'android' && rec.remote) {
    await capture(ADB, ['-s', dev.id, 'pull', rec.remote, rec.file], null, 60000);
    capture(ADB, ['-s', dev.id, 'shell', 'rm', '-f', rec.remote]).catch(() => {});
  }
  const ok = fs.existsSync(rec.file) && fs.statSync(rec.file).size > 0;
  return ok ? { ok: true, file: rec.file, url: artUrl(rec.file) } : { ok: false, error: 'Recording produced no file.' };
}
module.exports = { screenshot, recordStart, recordStop };
