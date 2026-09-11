'use strict';
// App-id detectors — read the Android applicationId and iOS bundle id straight from the project
// files (build.gradle / project.pbxproj). Pure file reads, no device needed.
const fs = require('fs');
const path = require('path');

const readSafe = (p) => { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } };

function androidPackageId(projectPath) {
  for (const f of ['android/app/build.gradle.kts', 'android/app/build.gradle']) {
    const m = /applicationId\s*=?\s*["']([^"']+)["']/.exec(readSafe(path.join(projectPath, f)));
    if (m) return m[1];
  }
  return '';
}
function iosBundleId(projectPath) {
  const txt = readSafe(path.join(projectPath, 'ios', 'Runner.xcodeproj', 'project.pbxproj'));
  const ids = [...txt.matchAll(/PRODUCT_BUNDLE_IDENTIFIER = ([^;]+);/g)].map((m) => m[1].trim().replace(/^["']|["']$/g, ''));
  return ids.find((v) => v && !/RunnerTests|\.tests?$/i.test(v) && !v.includes('$(')) || '';
}
module.exports = { androidPackageId, iosBundleId };
