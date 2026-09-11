'use strict';
// TestFlight upload via built-in xcrun altool (uses the ASC API key), plus the .ipa file resolver.
const fs = require('fs');
const path = require('path');
const { readConfig } = require('../state');
const { run } = require('../shell');
const { appleAuth } = require('../signing-config');
const { bumpPatch } = require('./versions');
const { ascBuildStatus, scheduleTestFlightManage } = require('./asc');

// Upload a signed .ipa to TestFlight. Per-app Apple account wins over signing.json's apple block.
async function uploadToTestFlight(app, ipaPath, buildName, buildNumber, validate, notes, log) {
  const cfg = readConfig();
  const apple = (cfg.appleAccounts || {})[app.path] || appleAuth();
  if (!apple || !apple.keyId) throw new Error('Apple TestFlight not configured (App Setup → Apple, or signing.json apple).');
  if (validate) {
    try {
      log('testflight: validating IPA…');
      await run('xcrun', ['altool', '--validate-app', '-f', ipaPath, '-t', 'ios', '--apiKey', apple.keyId, '--apiIssuer', apple.issuerId], app.path, log);
      log('testflight: validation passed ✓');
    } catch (e) { throw new Error(`validation failed (upload skipped): ${e.message.split('\n').slice(-4).join(' ').trim()}`); }
  }
  try {
    await run('xcrun', ['altool', '--upload-app', '-f', ipaPath, '-t', 'ios', '--apiKey', apple.keyId, '--apiIssuer', apple.issuerId], app.path, log);
  } catch (e) {
    const raw = e.message || '', t = raw.toLowerCase();
    if (/cfbundleshortversionstring|previously approved version/i.test(raw)) {
      const m = raw.match(/previously approved version\s*\[([\d.]+)\]/i);
      const approved = m ? m[1] : null;
      throw new Error(`App version too low for TestFlight — App Store Connect already has ${approved || 'a higher version'}. This build is ${buildName}; rebuild with a higher CFBundleShortVersionString${approved ? ` (e.g. ${bumpPatch(approved)})` : ''}.`);
    }
    if (/already been used|redundant|already exists|the build.*already/i.test(t)) throw new Error(`Build ${buildName}(${buildNumber}) already exists in App Store Connect — bump the build number (each upload needs a unique one).`);
    throw new Error(`altool upload failed: ${raw.split('\n').slice(-4).join(' ').trim()}`);
  }
  log(`testflight: altool upload accepted ✓ (Key ${apple.keyId})`);
  const st = await ascBuildStatus(app, apple, buildNumber);
  log(`testflight: ${st.state ? 'processing state ' + st.state : 'uploaded — processing (a few minutes)'} · ${st.url}`);
  if (st.tfLink) log(`testflight: install link → ${st.tfLink}`);
  log('testflight: export compliance + "What to Test" will be set automatically once processing finishes.');
  scheduleTestFlightManage(app, apple, buildNumber, notes); // non-blocking auto compliance + notes
  return { state: st.state || 'processing', url: st.url, tfLink: st.tfLink };
}

// Resolve the actual .ipa file inside build/ios/ipa/.
function findIpa(projectPath) {
  const dir = path.join(projectPath, 'build', 'ios', 'ipa');
  try { const f = fs.readdirSync(dir).find((n) => n.endsWith('.ipa')); return f ? path.join(dir, f) : null; } catch { return null; }
}

module.exports = { uploadToTestFlight, findIpa };
