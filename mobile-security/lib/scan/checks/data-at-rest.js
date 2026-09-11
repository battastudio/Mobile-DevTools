'use strict';
// OWASP Mobile M9 — Insecure Data Storage. Tokens/PII persisted where another app, a stolen device,
// or `adb backup` can read them at rest.
const { grepLib, libHas, fmtHits } = require('../files');

const FIX_SECURE = 'Move the session token + PII off GetStorage/SharedPreferences into flutter_secure_storage (Android Keystore / iOS Keychain):\n  final storage = FlutterSecureStorage();\n  await storage.write(key: "token", value: token);\n  final token = await storage.read(key: "token");';
const FIX_BACKUP = 'In AndroidManifest.xml <application>: android:allowBackup="false". (One-click Apply available.)';

module.exports = [
  { id: 'plaintext-token', title: 'Session token / PII stored unencrypted', category: 'Data at rest', owasp: 'M9', severity: 'high',
    scenario: 'An attacker with physical/adb access (or malware) reads the app sandbox and lifts the session token or PII straight out of SharedPreferences/GetStorage, then replays it to impersonate the user.',
    run(ctx) {
      const secure = /flutter_secure_storage/.test(ctx.pubspec);
      const usesPlain = /get_storage/.test(ctx.pubspec) || libHas(ctx, /SharedPreferences|GetStorage\(/);
      if (!usesPlain) return { status: 'na', evidence: 'No get_storage/SharedPreferences persistence detected.' };
      const tokenish = grepLib(ctx, /(token|access_token|user_?data|password|refresh)/i).filter((h) => /\.write\(|GetStorage|prefs?\.set|setString/i.test(h.text));
      if (secure && !tokenish.length) return { status: 'ok', evidence: 'flutter_secure_storage in use.' };
      if (secure) return { status: 'warn', evidence: 'flutter_secure_storage present, but token-like keys also written to plaintext storage:\n' + fmtHits(tokenish), fix: FIX_SECURE };
      if (tokenish.length) return { status: 'fail', evidence: 'Token/PII written to plaintext GetStorage/SharedPreferences:\n' + fmtHits(tokenish), fix: FIX_SECURE };
      return { status: 'warn', evidence: 'Plaintext key-value store present; no secure storage. Verify no secrets stored here.', fix: FIX_SECURE };
    } },
  { id: 'allow-backup', title: 'Android allowBackup enabled', category: 'Data at rest', owasp: 'M9', severity: 'med', fixable: true,
    scenario: 'With allowBackup on, anyone with USB debugging can run `adb backup` and pull the app sandbox — including any tokens/PII stored on disk — off a non-rooted device.',
    run(ctx) {
      if (/allowBackup\s*=\s*"false"/.test(ctx.manifest)) return { status: 'ok', evidence: 'allowBackup="false".' };
      if (!ctx.manifest) return { status: 'na', evidence: 'No AndroidManifest found.' };
      return { status: 'fail', evidence: 'allowBackup is true/unset — app data extractable via adb backup.', fix: FIX_BACKUP };
    } },
];
