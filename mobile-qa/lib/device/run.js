'use strict';
// App lifecycle on a device — stream live logs, build+install+launch, automated smoke (Android
// monkey / iOS integration smoke), and read installed app info. Cancellable via stopAll().
const fs = require('fs');
const path = require('path');
const { ADB, CRASH_RE, capture, spawnStream } = require('./process');
const { androidPackageId, iosBundleId } = require('./ids');
const { screenshot } = require('./capture');

// Stream device logs; onLine gets { line, crash }. Returns the stream handle (has .child).
function logStream(dev, appId, onLine) {
  const wrap = (line) => onLine({ line, crash: CRASH_RE.test(line) });
  onLine({ line: `▸ Live logs — ${dev.name} · streaming, press Stop to end.`, crash: false });
  if (dev.platform === 'android') {
    onLine({ line: '(logcat — launch the app to see its output)', crash: false });
    return spawnStream(ADB, ['-s', dev.id, 'logcat', '-v', 'time'], null, wrap);
  }
  if (dev.platform === 'ios-sim') {
    onLine({ line: '(simulator syslog for process "Runner" — Install & Launch the app first, or logs stay quiet)', crash: false });
    return spawnStream('xcrun', ['simctl', 'spawn', dev.id, 'log', 'stream', '--style', 'compact', '--predicate', 'process == "Runner"'], null, wrap);
  }
  onLine({ line: 'Live logs need an Android device or iOS simulator (physical iOS not supported here).', crash: false });
  return { child: null, promise: Promise.resolve({ code: 0 }) };
}

// Build for the target, install, launch, capture a launch screenshot.
async function installLaunch(dev, projectPath, onLine, opts = {}) {
  let launched = false;
  if (dev.platform === 'ios-sim') {
    const bundle = iosBundleId(projectPath); if (!bundle) return { ok: false, error: 'Could not read the iOS bundle id.' };
    onLine('▸ flutter build ios --simulator --debug (first build can take a few minutes)…');
    const b = await spawnStream('flutter', ['build', 'ios', '--simulator', '--debug'], projectPath, onLine).promise;
    if (b.code !== 0) return { ok: false, error: 'iOS simulator build failed (exit ' + b.code + ') — see the log.' };
    const appDir = path.join(projectPath, 'build', 'ios', 'iphonesimulator', 'Runner.app');
    if (!fs.existsSync(appDir)) return { ok: false, error: 'Build finished but Runner.app not found at build/ios/iphonesimulator/.' };
    onLine('▸ installing ' + bundle + ' on the simulator…');
    const inst = await capture('xcrun', ['simctl', 'install', dev.id, appDir], null, 120000);
    if (!inst.ok) return { ok: false, error: 'simctl install failed: ' + inst.err.slice(0, 200) };
    onLine('▸ launching ' + bundle);
    await capture('xcrun', ['simctl', 'launch', dev.id, bundle], null, 30000); launched = true;
  } else if (dev.platform === 'android') {
    const pkg = androidPackageId(projectPath); if (!pkg) return { ok: false, error: 'Could not read the Android applicationId.' };
    onLine('▸ flutter build apk --debug (first build can take a few minutes)…');
    const b = await spawnStream('flutter', ['build', 'apk', '--debug'], projectPath, onLine).promise;
    if (b.code !== 0) return { ok: false, error: 'Android build failed (exit ' + b.code + ') — see the log.' };
    const apk = path.join(projectPath, 'build', 'app', 'outputs', 'flutter-apk', 'app-debug.apk');
    if (!fs.existsSync(apk)) return { ok: false, error: 'Build finished but app-debug.apk not found.' };
    onLine('▸ adb install…');
    const inst = await capture(ADB, ['-s', dev.id, 'install', '-r', apk], null, 180000);
    if (!/Success/i.test(inst.out) && !inst.ok) return { ok: false, error: 'adb install failed: ' + (inst.err || inst.out).slice(0, 200) };
    onLine('▸ launching ' + pkg);
    await capture(ADB, ['-s', dev.id, 'shell', 'monkey', '-p', pkg, '-c', 'android.intent.category.LAUNCHER', '1']); launched = true;
  } else {
    onLine('▸ flutter install -d ' + dev.id + ' (physical iOS needs Xcode signing / ios-deploy)…');
    const inst = await spawnStream('flutter', ['install', '-d', dev.id], projectPath, onLine).promise;
    if (inst.code !== 0) return { ok: false, error: 'Install to the physical device failed — this needs a configured Xcode signing team (open ios/Runner.xcworkspace once) or ios-deploy. Use an iOS simulator for full support.' };
    onLine('✔ installed — launch it on the device (auto-launch needs a simulator/emulator).');
    return { ok: true, launched: false, screenshot: null };
  }
  await new Promise((res) => setTimeout(res, 2500));
  const shot = await screenshot(dev, projectPath).catch(() => ({ ok: false }));
  onLine('✔ launched');
  return { ok: true, launched, screenshot: shot.ok ? shot.url : null };
}

// Automated exploration: Android monkey stress, or a scripted integration smoke on a simulator.
async function smoke(dev, projectPath, onLine, opts = {}) {
  const events = Math.min(Math.max(+opts.events || 200, 20), 5000);
  if (dev.platform === 'android') {
    const pkg = androidPackageId(projectPath); if (!pkg) return { ok: false, error: 'No Android applicationId found.' };
    onLine(`▸ monkey ${events} events on ${pkg}…`);
    const r = await spawnStream(ADB, ['-s', dev.id, 'shell', 'monkey', '-p', pkg, '--throttle', '300', '--pct-syskeys', '0', '-v', String(events)], projectPath, onLine).promise;
    const crashed = /CRASH|ANR|Exception|Monkey aborted/i.test(r.out + r.err) && !/No crashes/i.test(r.out);
    return { ok: true, crashed, detail: crashed ? 'Monkey hit a crash/ANR — see the log.' : `Survived ${events} events with no crash.` };
  }
  if (fs.existsSync(path.join(projectPath, 'integration_test'))) {
    onLine('▸ iOS smoke = running integration_test/ on ' + dev.name + ' (monkey is Android-only)…');
    const r = await spawnStream('flutter', ['test', 'integration_test', '-d', dev.id], projectPath, onLine).promise;
    onLine('▸ smoke ' + (r.code === 0 ? 'passed' : 'failed'));
    return { ok: true, crashed: r.code !== 0, detail: r.code === 0 ? 'Integration smoke passed.' : 'Integration smoke failed — see the log.' };
  }
  return { ok: false, error: 'iOS has no monkey stress tool. Add an integration_test/ smoke (AI QA → “Smoke test” generates one), or boot an Android emulator for random-event stress testing.' };
}

async function appInfo(dev, projectPath) {
  if (dev.platform === 'android') {
    const pkg = androidPackageId(projectPath); if (!pkg) return { appId: '', version: '', size: '' };
    const r = await capture(ADB, ['-s', dev.id, 'shell', 'dumpsys', 'package', pkg], null, 15000);
    const ver = (r.out.match(/versionName=([^\s]+)/) || [])[1] || '';
    return { appId: pkg, version: ver, platform: 'android' };
  }
  if (dev.platform === 'ios-sim') {
    const bundle = iosBundleId(projectPath); if (!bundle) return { appId: '', version: '', size: '' };
    const c = await capture('xcrun', ['simctl', 'get_app_container', dev.id, bundle], null, 15000);
    let size = ''; if (c.ok && c.out.trim()) { const du = await capture('du', ['-sh', c.out.trim()], null, 10000); size = (du.out.split('\t')[0] || '').trim(); }
    return { appId: bundle, version: '', size, platform: 'ios-sim' };
  }
  return { appId: dev.platform === 'ios-device' ? iosBundleId(projectPath) : '', version: '', size: '', platform: dev.platform };
}
module.exports = { logStream, installLaunch, smoke, appInfo };
