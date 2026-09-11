'use strict';
// Env switching (the cm.dart logic): rewrite the AppMode const, flip viewLog for prod, and swap
// the firebase config files into place for the selected environment.
const fs = require('fs');
const path = require('path');

function switchEnv(app, logicalEnv, log) {
  const member = app.modes[logicalEnv];
  if (!member) throw new Error(`App has no '${logicalEnv}' environment (known: ${Object.keys(app.modes).join(', ') || 'none'})`);
  if (!app.envFile) throw new Error('Env file unknown — set envFile/constName for this app in App Setup.');
  const ent = (app.envs || []).find((e) => e.key === logicalEnv) || {};
  const envPath = path.join(app.path, app.envFile);

  // 1. rewrite the const
  let content = fs.readFileSync(envPath, 'utf8');
  const declRe = new RegExp(`(const\\s+AppMode\\s+${app.constName}\\s*=\\s*AppMode\\.)\\w+(\\s*;)`);
  if (!declRe.test(content)) throw new Error(`Could not find AppMode declaration for ${app.constName} in ${app.envFile}`);
  content = content.replace(declRe, `$1${member}$2`);
  // 2. flip viewLog if present in the same file (off for production)
  content = content.replace(/(viewLog\s*=\s*)(?:true|false)(\s*;)/, `$1${ent.prod ? 'false' : 'true'}$2`);
  fs.writeFileSync(envPath, content);
  log(`env: set ${app.constName} = AppMode.${member} in ${app.envFile}`);

  // 3. firebase file swap
  if (app.firebase) {
    const isProd = !!ent.prod;
    const fb = (n) => path.join(app.path, 'firebase', n);
    const copies = [
      [fb(isProd ? app.firebase.prodAndroid : app.firebase.devAndroid), path.join(app.path, 'android/app/google-services.json')],
      [fb(isProd ? app.firebase.prodIos : app.firebase.devIos), path.join(app.path, 'ios/Runner/GoogleService-Info.plist')],
    ];
    for (const [src, dest] of copies) {
      if (fs.existsSync(src)) { fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.copyFileSync(src, dest); log(`firebase: ${path.basename(src)} -> ${path.relative(app.path, dest)}`); }
    }
  } else log('firebase: no firebase/ config for this app — skipped');
}

module.exports = { switchEnv };
