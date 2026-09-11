'use strict';
// OWASP Mobile M4/M3 — Input/Output validation & insecure auth via WebViews and deep links.
const { grepLib, fmtHits } = require('../files');

module.exports = [
  { id: 'webview-misconfig', title: 'WebView JavaScript / file access misconfig', category: 'WebView', owasp: 'M4', severity: 'med',
    fix: 'Set JavaScriptMode.disabled unless required; never expose a JavascriptChannel to untrusted content; disable file access; validate every URL loaded and every deep-link param before use.',
    scenario: 'A WebView with unrestricted JS + a JavascriptChannel (or file access) lets attacker-controlled web content call into native code or read local files — XSS in the page becomes device access.',
    run(ctx) {
      if (!/webview_flutter|flutter_inappwebview/.test(ctx.pubspec)) return { status: 'na', evidence: 'No WebView package in pubspec.' };
      const hits = grepLib(ctx, /JavascriptMode\.unrestricted|javaScriptMode:\s*JavaScriptMode\.unrestricted|addJavascriptChannel|allowFileAccess\s*:\s*true|allowUniversalAccessFromFileURLs/i);
      if (hits.length) return { status: 'fail', evidence: 'Risky WebView configuration:\n' + fmtHits(hits) };
      return { status: 'ok', evidence: 'No unrestricted-JS / JS-channel / file-access WebView config found.' };
    } },
  { id: 'deep-link-hijack', title: 'Deep-link / App Link not verified', category: 'WebView', owasp: 'M3', severity: 'low',
    fix: 'For https App Links set android:autoVerify="true" + host a Digital Asset Links file; for custom schemes assume any app can send the link — authenticate the user and validate/whitelist every parameter server-side.',
    scenario: 'An unverified custom-scheme/deep link can be registered or spoofed by a malicious app to intercept the redirect (e.g. OAuth code) or feed the app attacker-controlled parameters.',
    run(ctx) {
      if (!ctx.manifest) return { status: 'na', evidence: 'No AndroidManifest found.' };
      if (!/<intent-filter[\s\S]*?<data\b/.test(ctx.manifest)) return { status: 'na', evidence: 'No deep-link intent filters declared.' };
      if (/android:scheme="https"/.test(ctx.manifest) && !/android:autoVerify="true"/.test(ctx.manifest)) return { status: 'warn', evidence: 'https deep links declared without android:autoVerify="true" (App Links unverified — links can be hijacked).' };
      return { status: 'warn', evidence: 'Deep-link intent filters present — verify params are validated and OAuth redirects are protected (custom schemes are inherently spoofable).' };
    } },
];
