'use strict';
// Bundle ids + Android release-signing state: read iOS/Android identifiers, report signing status,
// compute an app "health" summary, and wire build.gradle for release signing when needed.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { detectApp } = require('./detect');

function iosBundleId(projectPath) {
  const pbx = path.join(projectPath, 'ios', 'Runner.xcodeproj', 'project.pbxproj');
  const txt = fs.readFileSync(pbx, 'utf8');
  const ids = [...txt.matchAll(/PRODUCT_BUNDLE_IDENTIFIER = ([^;]+);/g)].map((m) => m[1].trim().replace(/^["']|["']$/g, ''));
  const id = ids.find((v) => v && !/RunnerTests|\.tests?$/i.test(v) && !v.includes('$('));
  if (!id) throw new Error('Could not read iOS bundle id from project.pbxproj');
  return id;
}
function gradleFile(projectPath) {
  for (const f of ['android/app/build.gradle.kts', 'android/app/build.gradle']) { const p = path.join(projectPath, f); if (fs.existsSync(p)) return p; }
  return path.join(projectPath, 'android/app/build.gradle');
}
function androidPackageId(projectPath) {
  // Handles Groovy (`applicationId "x"`) and Kotlin DSL (`applicationId = "x"`).
  const gradle = fs.readFileSync(gradleFile(projectPath), 'utf8');
  const m = /applicationId\s*=?\s*["']([^"']+)["']/.exec(gradle);
  if (!m) throw new Error('Could not find applicationId in android/app/build.gradle(.kts)');
  return m[1];
}
function signingStatus(projectPath) {
  const keyProps = path.join(projectPath, 'android', 'key.properties');
  const hasKeyProps = fs.existsSync(keyProps);
  const gf = gradleFile(projectPath), isKts = gf.endsWith('.kts');
  let gradleWired = false, keystore = null;
  try {
    const g = fs.readFileSync(gf, 'utf8');
    const usesRelease = /signingConfig\s+signingConfigs\.release/.test(g) || /signingConfig\s*=\s*signingConfigs\.(getByName\(\s*["']release["']\s*\)|release)/.test(g);
    gradleWired = /key\.properties/.test(g) && /signingConfigs/.test(g) && usesRelease;
  } catch {}
  if (hasKeyProps) { try { keystore = (/storeFile=(.+)/.exec(fs.readFileSync(keyProps, 'utf8')) || [])[1] || null; } catch {} }
  return { hasKeyProps, gradleWired, isKts, keystore };
}
function appHealth(projectPath, app) {
  if (!app) { try { app = detectApp(projectPath); } catch { app = { needsConfig: true, firebase: null }; } }
  const sign = signingStatus(projectPath);
  let packageId = false; try { androidPackageId(projectPath); packageId = true; } catch {}
  let gitRemote = false; try { execFileSync('git', ['-C', projectPath, 'remote', 'get-url', 'origin'], { stdio: 'ignore' }); gitRemote = true; } catch {}
  return { envDetected: !app.needsConfig, firebaseFiles: !!app.firebase, signing: sign.hasKeyProps && sign.gradleWired, packageId, gitRemote, sign };
}

// Insert the canonical Flutter release-signing wiring into build.gradle if absent. Returns a note.
function wireGradleSigning(projectPath, log) {
  const gf = gradleFile(projectPath);
  if (gf.endsWith('.kts')) {
    log('build.gradle.kts uses debug signing for release. key.properties is written; to use it, set in android/app/build.gradle.kts:');
    log('  signingConfigs { create("release") { keyAlias = keystoreProperties.getProperty("keyAlias"); keyPassword = keystoreProperties.getProperty("keyPassword"); storeFile = keystoreProperties.getProperty("storeFile")?.let { File(rootProject.projectDir, it) }; storePassword = keystoreProperties.getProperty("storePassword") } }');
    log('  buildTypes { release { signingConfig = signingConfigs.getByName("release") } }');
    return;
  }
  let g = fs.readFileSync(gf, 'utf8');
  if (/key\.properties/.test(g) && /signingConfigs\.release/.test(g)) { log('build.gradle already wired for release signing.'); return; }
  fs.writeFileSync(gf + '.bak', g); // backup
  const loader = `def keystoreProperties = new Properties()\ndef keystorePropertiesFile = rootProject.file('key.properties')\nif (keystorePropertiesFile.exists()) { keystoreProperties.load(new FileInputStream(keystorePropertiesFile)) }\n\n`;
  if (!/def keystoreProperties/.test(g)) g = g.replace(/android\s*\{/, loader + 'android {');
  const signingBlock = `    signingConfigs {\n        release {\n            keyAlias keystoreProperties['keyAlias']\n            keyPassword keystoreProperties['keyPassword']\n            storeFile keystoreProperties['storeFile'] ? file(keystoreProperties['storeFile']) : null\n            storePassword keystoreProperties['storePassword']\n        }\n    }\n`;
  if (!/signingConfigs\s*\{/.test(g)) g = g.replace(/(android\s*\{\s*\n)/, `$1${signingBlock}`);
  if (/buildTypes\s*\{[\s\S]*?release\s*\{/.test(g)) {
    g = g.replace(/(release\s*\{)([\s\S]*?)(\n\s*\})/, (m, a, mid, c) => /signingConfig/.test(mid) ? m : `${a}${mid}\n            signingConfig signingConfigs.release${c}`);
  }
  fs.writeFileSync(gf, g);
  log('build.gradle wired for release signing (backup: build.gradle.bak).');
}

module.exports = { iosBundleId, androidPackageId, gradleFile, signingStatus, appHealth, wireGradleSigning };
