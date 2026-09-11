'use strict';
// OWASP Mobile M8/M6 — exported Android components without a permission guard, and over-broad
// dangerous permissions that widen the attack + privacy surface.

module.exports = [
  { id: 'exported-components', title: 'Exported Android components without permission', category: 'Misconfiguration', owasp: 'M8', severity: 'med',
    fix: 'Set android:exported="false" on activities/services/receivers that are not intended for other apps; guard any that must be exported with a signature-level android:permission.',
    scenario: 'An exported activity/service/receiver with no permission can be invoked by any installed app, letting malware trigger internal flows or feed it crafted intents.',
    run(ctx) {
      if (!ctx.manifest) return { status: 'na', evidence: 'No AndroidManifest found.' };
      const blocks = ctx.manifest.match(/<(activity|service|receiver)[^>]*android:exported\s*=\s*"true"[\s\S]*?<\/\1>|<(activity|service|receiver)[^>]*android:exported\s*=\s*"true"[^>]*\/>/g) || [];
      const bad = blocks.filter((b) => !/android:permission\s*=/.test(b));
      if (bad.length) return { status: 'warn', evidence: `${bad.length} exported component(s) without an android:permission guard. Review each is meant to be public.` };
      return { status: 'ok', evidence: 'No unguarded exported components found.' };
    } },
  { id: 'dangerous-permissions', title: 'Excessive dangerous permissions', category: 'Privacy', owasp: 'M6', severity: 'low',
    fix: 'Request only the permissions the feature needs; drop location/SMS/contacts/storage if unused. Each dangerous permission widens the attack surface and privacy exposure.',
    scenario: 'Over-broad permissions (SMS, contacts, fine location, external storage) mean a compromised app — or a malicious SDK inside it — can exfiltrate far more user data than the feature needs.',
    run(ctx) {
      if (!ctx.manifest) return { status: 'na', evidence: 'No AndroidManifest found.' };
      const perms = (ctx.manifest.match(/android:name="android\.permission\.([A-Z_]+)"/g) || []).map((m) => m.match(/permission\.([A-Z_]+)/)[1]);
      const dangerous = perms.filter((p) => /READ_SMS|SEND_SMS|RECEIVE_SMS|READ_CONTACTS|ACCESS_FINE_LOCATION|ACCESS_BACKGROUND_LOCATION|RECORD_AUDIO|READ_EXTERNAL_STORAGE|WRITE_EXTERNAL_STORAGE|READ_CALL_LOG|CAMERA/.test(p));
      if (dangerous.length >= 4) return { status: 'warn', evidence: 'Many dangerous permissions requested — confirm each is needed:\n  ' + dangerous.join(', ') };
      return { status: 'ok', evidence: dangerous.length ? 'Dangerous permissions: ' + dangerous.join(', ') : 'No dangerous permissions requested.' };
    } },
];
