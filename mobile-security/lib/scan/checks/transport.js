'use strict';
// OWASP Mobile M5 — Insecure Communication. Cleartext traffic, disabled ATS, missing TLS pinning,
// permissive network-security-config, or an outright-disabled certificate validation callback.
const { grepLib, libHas, fmtHits } = require('../files');

const FIX_CLEARTEXT = 'In AndroidManifest.xml <application>: android:usesCleartextTraffic="false". (One-click Apply available.)';
const FIX_ATS = 'In ios/Runner/Info.plist set NSAppTransportSecurity → NSAllowsArbitraryLoads = false. (One-click Apply available.)';
const FIX_PINNING = 'Pin the server cert on the Dio adapter (badCertificateCallback comparing SHA-256), or use a pinning package. Rotate before cert expiry.';
const FIX_NSC = 'Ship res/xml/network_security_config.xml with cleartextTrafficPermitted="false", no user trust-anchors, and a <pin-set> for critical domains; reference it via android:networkSecurityConfig. (One-click Apply available.)';
const FIX_TLS_OVERRIDE = 'Never return true from badCertificateCallback/onBadCertificate in shipped builds. Remove the override (let the platform validate), or implement real pinning by comparing the cert SHA-256. Gate any dev-only bypass behind kDebugMode so it cannot ship.';

module.exports = [
  { id: 'cleartext-traffic', title: 'Cleartext (HTTP) traffic allowed', category: 'Transport', owasp: 'M5', severity: 'med', fixable: true,
    scenario: 'With cleartext allowed, an attacker on the same network (café Wi-Fi, rogue AP) reads or rewrites API traffic over plain HTTP — stealing tokens and injecting responses.',
    run(ctx) {
      if (/usesCleartextTraffic\s*=\s*"false"/.test(ctx.manifest)) return { status: 'ok', evidence: 'usesCleartextTraffic="false".' };
      if (/usesCleartextTraffic\s*=\s*"true"/.test(ctx.manifest)) return { status: 'fail', evidence: 'AndroidManifest sets usesCleartextTraffic="true".', fix: FIX_CLEARTEXT };
      if (!ctx.manifest) return { status: 'na', evidence: 'No AndroidManifest found.' };
      return { status: 'warn', evidence: 'usesCleartextTraffic not set — defaults vary by SDK. Set it false explicitly.', fix: FIX_CLEARTEXT };
    } },
  { id: 'ios-ats', title: 'iOS App Transport Security disabled', category: 'Transport', owasp: 'M5', severity: 'med', fixable: true,
    scenario: 'NSAllowsArbitraryLoads=true disables ATS, letting the iOS app talk over plain HTTP/weak TLS so a network attacker can intercept or downgrade the connection.',
    run(ctx) {
      if (!ctx.hasIos) return { status: 'na', evidence: 'No ios/ directory.' };
      if (/NSAllowsArbitraryLoads<\/key>\s*<true\/>/.test(ctx.plist)) return { status: 'fail', evidence: 'Info.plist sets NSAllowsArbitraryLoads = true.', fix: FIX_ATS };
      if (/NSAllowsArbitraryLoads<\/key>\s*<false\/>/.test(ctx.plist)) return { status: 'ok', evidence: 'NSAllowsArbitraryLoads = false.' };
      return { status: 'ok', evidence: 'ATS not overridden (secure by default).' };
    } },
  { id: 'cert-pinning', title: 'No SSL/certificate pinning', category: 'Transport', owasp: 'M5', severity: 'med',
    scenario: 'Without pinning, an attacker installs a proxy CA (Burp/Charles) on the device and transparently intercepts all HTTPS traffic — reading and modifying every request/response.',
    run(ctx) {
      const usesNet = /dio|http:|retrofit/.test(ctx.pubspec);
      if (!usesNet) return { status: 'na', evidence: 'No HTTP client detected.' };
      if (/certificate_pinning|ssl_pinning|http_certificate_pinning/.test(ctx.pubspec) || libHas(ctx, /badCertificateCallback|setTrustedCertificates|SecurityContext|pinning/i)) return { status: 'ok', evidence: 'Certificate pinning present.' };
      return { status: 'warn', evidence: 'HTTP client without certificate pinning (defense-in-depth gap).', fix: FIX_PINNING };
    } },
  { id: 'network-security-config', title: 'Network Security Config permits cleartext / user CAs', category: 'Transport', owasp: 'M5', severity: 'med', fixable: true, fix: FIX_NSC,
    scenario: 'A Network Security Config that permits cleartext or trusts user-installed CAs lets a network/MITM attacker intercept traffic even on modern Android — undoing the app’s HTTPS.',
    run(ctx) {
      if (!ctx.netSecConfig) return { status: /android:networkSecurityConfig/.test(ctx.manifest) ? 'warn' : 'na', evidence: /android:networkSecurityConfig/.test(ctx.manifest) ? 'Manifest references a network security config but the XML was not found — verify it forbids cleartext.' : 'No network security config declared (defaults apply — set one to forbid cleartext + user CAs).' };
      const bad = [];
      if (/cleartextTrafficPermitted\s*=\s*"true"/.test(ctx.netSecConfig)) bad.push('cleartextTrafficPermitted="true"');
      if (/<certificates[^>]*src\s*=\s*"user"/.test(ctx.netSecConfig)) bad.push('trusts user-installed CAs');
      if (bad.length) return { status: 'fail', evidence: 'network_security_config.xml: ' + bad.join('; ') + '.' };
      return { status: 'ok', evidence: 'Network security config present without cleartext/user-CA overrides.' };
    } },
  { id: 'insecure-tls-override', title: 'TLS certificate validation disabled', category: 'Transport', owasp: 'M5', severity: 'high',
    scenario: 'A badCertificateCallback / onBadCertificate that returns true turns off TLS validation for the HTTP client — any attacker with a proxy CA silently reads and rewrites all HTTPS traffic, tokens included.',
    run(ctx) {
      const hits = grepLib(ctx, /(badCertificateCallback|onBadCertificate)\s*[:=]\s*\([^)]*\)\s*=>\s*true/);
      if (!hits.length) return { status: 'ok', evidence: 'No badCertificateCallback => true override found.' };
      return { status: 'fail', evidence: 'TLS certificate validation disabled (callback returns true):\n' + fmtHits(hits), fix: FIX_TLS_OVERRIDE };
    } },
];
