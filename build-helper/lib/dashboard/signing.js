'use strict';
// Android release signing: generate or link a keystore, write android/key.properties, and wire
// build.gradle. Keystores generated here live under the git-ignored data dir (creds/keystores).
const fs = require('fs');
const path = require('path');
const { run } = require('../shell');
const { gradleFile, signingStatus, wireGradleSigning } = require('../project');
const { KEYSTORE_DIR } = require('../setup');

// storeFile value gradle will resolve: relative from the resolver base (kts → android/, groovy → android/app).
function storeFileFor(projectPath, keystoreAbs) {
  const isKts = gradleFile(projectPath).endsWith('.kts');
  const base = path.join(projectPath, 'android', isKts ? '' : 'app');
  return path.relative(base, keystoreAbs);
}
async function handleSigning(req, res, body, mode) {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  const send = (e, d) => res.write(`event: ${e}\ndata: ${JSON.stringify(d)}\n\n`);
  const log = (line) => send('log', { line });
  try {
    const projectPath = body.path; if (!projectPath || !fs.existsSync(projectPath)) throw new Error('unknown project');
    const keyProps = path.join(projectPath, 'android', 'key.properties');
    let keystoreAbs, storePassword, keyPassword, keyAlias;
    if (mode === 'generate') {
      keyAlias = (body.alias || 'upload').trim(); const pw = body.password;
      if (!pw || pw.length < 6) throw new Error('Keystore password must be ≥ 6 chars.');
      storePassword = keyPassword = pw;
      fs.mkdirSync(KEYSTORE_DIR, { recursive: true });
      keystoreAbs = path.join(KEYSTORE_DIR, `${path.basename(projectPath)}.jks`);
      if (fs.existsSync(keystoreAbs)) log('keystore already exists — reusing.');
      else {
        send('step', { text: 'Generating keystore (keytool)…' });
        await run('keytool', ['-genkeypair', '-v', '-keystore', keystoreAbs, '-keyalg', 'RSA', '-keysize', '2048', '-validity', '10000', '-alias', keyAlias, '-storepass', pw, '-keypass', pw, '-dname', body.dname || `CN=${path.basename(projectPath)}, O=BuildHelper, C=US`], projectPath, log);
      }
    } else { // link existing keystore
      keystoreAbs = path.resolve((body.storeFile || '').trim());
      if (!keystoreAbs || !fs.existsSync(keystoreAbs)) throw new Error('storeFile path not found.');
      storePassword = body.storePassword || ''; keyPassword = body.keyPassword || body.storePassword || ''; keyAlias = body.keyAlias || 'upload';
    }
    const storeFile = storeFileFor(projectPath, keystoreAbs);
    fs.writeFileSync(keyProps, `storePassword=${storePassword}\nkeyPassword=${keyPassword}\nkeyAlias=${keyAlias}\nstoreFile=${storeFile}\n`);
    log(`wrote android/key.properties (storeFile=${storeFile})`);
    if (!signingStatus(projectPath).gradleWired) { send('step', { text: 'Wiring build.gradle…' }); wireGradleSigning(projectPath, log); }
    else log('build.gradle already wired for release signing.');
    log('signing configured ✓'); send('done', { ok: true });
  } catch (e) { send('error', { message: e.message }); }
  res.end();
}

module.exports = { storeFileFor, handleSigning };
