'use strict';
// OWASP Mobile M1 — Improper Credential Usage. Secrets hardcoded in Dart, committed to git, or a
// store-issued Google API key that must be restricted in the provider console.
const { execFileSync } = require('child_process');
const { grepLib, libHas, fmtHits, redact } = require('../files');

const FIX_HARDCODED = 'Remove hardcoded secrets from Dart. Store-issued keys (e.g. Google Maps) that must ship should be restricted per-app in the provider console. Real secrets → Keystore/Keychain or fetched at runtime.';
const FIX_COMMITTED = 'git rm --cached the file, add it to .gitignore, rotate the leaked credential/keystore. Never commit key.properties / .env / keystores.';
const FIX_GKEY = 'Store-issued keys (Maps/Firebase) ship in the app by design — restrict each key in the Google Cloud console by app package + SHA-1 and by API, so a lifted key cannot be reused elsewhere.';

module.exports = [
  { id: 'hardcoded-secrets', title: 'Hardcoded secrets in Dart source', category: 'Secrets', owasp: 'M1', severity: 'high',
    scenario: 'A hardcoded API key/secret is extracted from the decompiled bundle and reused directly against the backend or cloud provider — full abuse of whatever that credential authorizes.',
    run(ctx) {
      if (ctx.isSelf) return { status: 'na', evidence: 'Skipped (target is the security tool itself).' };
      const re = /(AIza[0-9A-Za-z_\-]{20,}|sk_live_[0-9A-Za-z]{10,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY|(?:api[_-]?key|secret|password|access[_-]?token)\s*[:=]\s*['"][^'"]{12,}['"]|Bearer\s+[A-Za-z0-9._\-]{24,})/i;
      const hits = grepLib(ctx, re).map((h) => ({ ...h, text: h.text.replace(re, (m) => redact(m)) }));
      if (!hits.length) return { status: 'ok', evidence: 'No hardcoded secrets found in lib/.' };
      return { status: 'fail', evidence: 'Possible hardcoded secrets in Dart source (values redacted):\n' + fmtHits(hits), fix: FIX_HARDCODED };
    } },
  { id: 'committed-secrets', title: 'Secret files committed to git', category: 'Secrets', owasp: 'M1', severity: 'high',
    scenario: 'A keystore/.env/key.properties committed to git means anyone with repo access (or a leaked mirror) can sign malicious builds or read production credentials from history.',
    run(ctx) {
      let tracked = '';
      try { tracked = execFileSync('git', ['-C', ctx.projectPath, 'ls-files'], { stdio: ['ignore', 'pipe', 'ignore'] }).toString(); } catch { return { status: 'na', evidence: 'Not a git repo.' }; }
      const bad = tracked.split('\n').filter((f) => /(^|\/)key\.properties$|(^|\/)\.env$|\.(jks|keystore|p12|mobileprovision)$/.test(f));
      if (!bad.length) return { status: 'ok', evidence: 'No signing/secret files tracked in git.' };
      return { status: 'fail', evidence: 'Secret files tracked in git:\n' + bad.map((f) => '  ' + f).join('\n'), fix: FIX_COMMITTED };
    } },
  { id: 'google-api-key-restriction', title: 'Google/Maps API key must be restricted', category: 'Secrets', owasp: 'M1', severity: 'low', fix: FIX_GKEY,
    scenario: 'An unrestricted Google API key extracted from the APK/IPA can be reused by anyone to run up billing or access enabled APIs on your project.',
    run(ctx) {
      const has = /AIza[0-9A-Za-z_\-]{20,}/.test(ctx.googleServices) || /AIza[0-9A-Za-z_\-]{20,}/.test(ctx.iosGooglePlist) || libHas(ctx, /AIza[0-9A-Za-z_\-]{20,}/) || /AIza[0-9A-Za-z_\-]{20,}/.test(ctx.manifest);
      if (!has) return { status: 'na', evidence: 'No Google API key found in the bundle.' };
      return { status: 'warn', evidence: 'Google API key ships in the app (expected). Confirm it is restricted by package + SHA-1 + API in the Google Cloud console.' };
    } },
];
