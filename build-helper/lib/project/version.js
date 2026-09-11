'use strict';
// Version writers: pubspec version, plus the iOS-specific patches archives need (Xcode project /
// Info.plist versions, App.framework MinimumOSVersion, and export-compliance for TestFlight).
const fs = require('fs');
const path = require('path');

function writeVersion(app, buildName, buildNumber) {
  const pub = path.join(app.path, 'pubspec.yaml');
  let content = fs.readFileSync(pub, 'utf8');
  content = content.replace(/^version:\s*.+$/m, `version: ${buildName}+${buildNumber}`);
  fs.writeFileSync(pub, content);
}

// iOS archives read the version from the Xcode project, not pubspec — flutter build ipa's
// --build-name/--build-number don't override a pinned MARKETING_VERSION/CURRENT_PROJECT_VERSION.
function writeIosVersion(app, buildName, buildNumber, log) {
  try {
    // ponytail: blanket replace hits all targets (Runner + RunnerTests); harmless.
    const pbx = path.join(app.path, 'ios', 'Runner.xcodeproj', 'project.pbxproj');
    if (fs.existsSync(pbx)) {
      let c = fs.readFileSync(pbx, 'utf8');
      if (/MARKETING_VERSION\s*=/.test(c)) {
        c = c.replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${buildName};`).replace(/CURRENT_PROJECT_VERSION = [^;]+;/g, `CURRENT_PROJECT_VERSION = ${buildNumber};`);
        fs.writeFileSync(pbx, c);
        if (log) log(`ios: set MARKETING_VERSION=${buildName}, CURRENT_PROJECT_VERSION=${buildNumber} in project.pbxproj`);
      }
    }
    // Fallback: projects that hardcode literal versions in Info.plist (skip $(VAR) references).
    const plist = path.join(app.path, 'ios', 'Runner', 'Info.plist');
    if (fs.existsSync(plist)) {
      let p = fs.readFileSync(plist, 'utf8'); const before = p;
      p = p.replace(/(<key>CFBundleShortVersionString<\/key>\s*<string>)(?!\$\()[^<]*(<\/string>)/, `$1${buildName}$2`).replace(/(<key>CFBundleVersion<\/key>\s*<string>)(?!\$\()[^<]*(<\/string>)/, `$1${buildNumber}$2`);
      if (p !== before) { fs.writeFileSync(plist, p); if (log) log('ios: updated literal version in Info.plist'); }
    }
  } catch (e) { if (log) log(`ios version sync skipped: ${e.message}`); }
}

// Some projects ship ios/Flutter/AppFrameworkInfo.plist without MinimumOSVersion → App.framework gets
// an empty value and TestFlight rejects the IPA (altool 90360/90530). Ensure the key exists.
function ensureAppFrameworkMinOS(app, log) {
  try {
    const plist = path.join(app.path, 'ios', 'Flutter', 'AppFrameworkInfo.plist');
    if (!fs.existsSync(plist)) return;
    let target = '12.0';
    try { const m = /IPHONEOS_DEPLOYMENT_TARGET = ([\d.]+);/.exec(fs.readFileSync(path.join(app.path, 'ios', 'Runner.xcodeproj', 'project.pbxproj'), 'utf8')); if (m) target = m[1]; } catch {}
    let p = fs.readFileSync(plist, 'utf8');
    if (/<key>MinimumOSVersion<\/key>/.test(p)) {
      const before = p;
      p = p.replace(/(<key>MinimumOSVersion<\/key>\s*<string>)[^<]*(<\/string>)/, `$1${target}$2`);
      if (p !== before) { fs.writeFileSync(plist, p); if (log) log(`ios: set App.framework MinimumOSVersion=${target}`); }
    } else {
      p = p.replace(/(\n\s*)<\/dict>/, `$1  <key>MinimumOSVersion</key>$1  <string>${target}</string>$1</dict>`);
      fs.writeFileSync(plist, p);
      if (log) log(`ios: added App.framework MinimumOSVersion=${target}`);
    }
  } catch (e) { if (log) log(`ios MinimumOSVersion patch skipped: ${e.message}`); }
}

// Declare export compliance (standard HTTPS = exempt) so TestFlight builds aren't stuck on
// "Missing Compliance". Only added if not already present.
function ensureIosExportCompliance(app, log) {
  try {
    const plist = path.join(app.path, 'ios', 'Runner', 'Info.plist');
    if (!fs.existsSync(plist)) return;
    let p = fs.readFileSync(plist, 'utf8');
    if (/<key>ITSAppUsesNonExemptEncryption<\/key>/.test(p)) return;
    p = p.replace(/(\n\s*)<\/dict>/, `$1\t<key>ITSAppUsesNonExemptEncryption</key>$1\t<false/>$1</dict>`);
    fs.writeFileSync(plist, p);
    if (log) log('ios: set ITSAppUsesNonExemptEncryption=false (export compliance — TestFlight ready)');
  } catch (e) { if (log) log(`ios export-compliance patch skipped: ${e.message}`); }
}

module.exports = { writeVersion, writeIosVersion, ensureAppFrameworkMinOS, ensureIosExportCompliance };
