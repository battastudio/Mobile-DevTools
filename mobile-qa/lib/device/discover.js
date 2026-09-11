'use strict';
// Device discovery — merge `flutter devices --machine` with live `adb devices` serials and booted
// iOS simulators (`xcrun simctl`) so we report which targets are actually connected/booted.
const { execFile } = require('child_process');
const { ADB, capture } = require('./process');

function flutterDevices() {
  return new Promise((resolve) => {
    execFile('flutter', ['devices', '--machine'], { timeout: 30000, maxBuffer: 1 << 22 }, (err, stdout) => {
      let arr = []; try { const m = String(stdout || '').match(/\[[\s\S]*\]/); arr = m ? JSON.parse(m[0]) : []; } catch {}
      resolve(arr);
    });
  });
}
async function bootedSimUdids() {
  const r = await capture('xcrun', ['simctl', 'list', 'devices', 'booted', '--json'], undefined, 15000);
  const set = new Set(); try { const j = JSON.parse(r.out); for (const list of Object.values(j.devices || {})) for (const d of list) if (d.state === 'Booted') set.add(d.udid); } catch {}
  return set;
}
async function adbSerials() {
  const r = await capture(ADB, ['devices'], undefined, 10000);
  const set = new Set(); for (const ln of r.out.split('\n').slice(1)) { const m = ln.match(/^(\S+)\s+device\b/); if (m) set.add(m[1]); }
  return set;
}
function classify(d) {
  const tp = d.targetPlatform || d.platform || '';
  if (/android/i.test(tp)) return 'android';
  if (/ios/i.test(tp)) return d.emulator ? 'ios-sim' : 'ios-device';
  return tp || 'other';
}
async function listDevices() {
  const [fl, sims, serials] = await Promise.all([flutterDevices(), bootedSimUdids(), adbSerials()]);
  return fl.map((d) => {
    const platform = classify(d);
    const booted = platform === 'ios-sim' ? sims.has(d.id) : platform === 'android' ? serials.has(d.id) : true; // physical devices are always "connected"
    return { id: d.id, name: d.name, platform, emulator: !!d.emulator, booted, os: d.sdk || '', caps: d.capabilities || {} };
  });
}
async function findDevice(id) { const list = await listDevices(); return list.find((d) => d.id === id) || null; }
module.exports = { listDevices, findDevice, classify };
