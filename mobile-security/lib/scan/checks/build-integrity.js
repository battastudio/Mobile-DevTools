'use strict';
// OWASP Mobile M8/M7/M2 — Security misconfiguration, binary protections, and supply chain at build
// time: debug-signed/debuggable releases, no obfuscation, and un-audited dependencies.
const fs = require('fs');
const path = require('path');
const { runAudit } = require('../files');
const { signingStatus } = require('../../project-lite');

const FIX_SIGNING = 'Add android/key.properties (gitignored) + wire release signing in android/app/build.gradle so the release is signed with your own upload key, not the shared debug key.';
const FIX_DEBUGGABLE = 'In android/app/build.gradle release buildType: debuggable false. (One-click Apply available.)';
const FIX_OBFUSCATION = 'Android: minifyEnabled true + shrinkResources true + proguard-rules.pro. Dart: flutter build --obfuscate --split-debug-info=build/symbols.';

module.exports = [
  { id: 'debug-signing', title: 'Release signed with debug certificate', category: 'Build integrity', owasp: 'M8', severity: 'info',
    scenario: 'A release signed with the shared debug keystore can be repackaged, tampered, and re-signed by anyone — undermining app authenticity and the update chain.',
    run(ctx) {
      const s = signingStatus(ctx.projectPath);
      if (s.gradleWired && s.hasKeyProps) return { status: 'ok', evidence: 'Release wired to key.properties signing config.' };
      return { status: 'fail', evidence: `Release build uses debug signing. key.properties: ${s.hasKeyProps ? 'present' : 'missing'}, gradle wired: ${s.gradleWired}.`, fix: FIX_SIGNING };
    } },
  { id: 'release-debuggable', title: 'Release build debuggable', category: 'Build integrity', owasp: 'M8', severity: 'med', fixable: true,
    scenario: 'A debuggable release lets an attacker attach a debugger (jdwp) to a shipped app, inspect memory, and step through logic — trivial runtime tampering and secret extraction.',
    run(ctx) {
      if (/debuggable\s+true/.test(ctx.gradle)) return { status: 'fail', evidence: 'release buildType sets debuggable true.', fix: FIX_DEBUGGABLE };
      if (/debuggable\s+false/.test(ctx.gradle)) return { status: 'ok', evidence: 'release debuggable false.' };
      return { status: 'warn', evidence: 'debuggable not set (release is non-debuggable by default). Set it false explicitly to be safe.', fix: FIX_DEBUGGABLE };
    } },
  { id: 'obfuscation', title: 'No code obfuscation / shrinking', category: 'Build integrity', owasp: 'M7', severity: 'low', fix: FIX_OBFUSCATION,
    scenario: 'Un-obfuscated Dart/native code is trivially decompiled, exposing API structure, endpoint URLs, and business logic that speed up crafting attacks against the backend.',
    run(ctx) {
      if (/minifyEnabled\s+true/.test(ctx.gradle) || fs.existsSync(path.join(ctx.projectPath, 'android/app/proguard-rules.pro'))) return { status: 'ok', evidence: 'ProGuard/R8 shrinking configured.' };
      return { status: 'warn', evidence: 'No minifyEnabled/ProGuard, and no Dart --obfuscate wired. Reverse-engineering is easier.' };
    } },
  { id: 'outdated-deps-mobile', title: 'Outdated / vulnerable dependencies', category: 'Supply chain', owasp: 'M2', severity: 'med',
    fix: 'Run `dart pub audit` / `flutter pub outdated` in CI; pin and update packages, watch advisories, and remove abandoned packages.',
    scenario: 'A known-vulnerable transitive package ships inside the app; an attacker exploits the public CVE without needing any app-specific bug.',
    run(ctx) {
      const a = runAudit('dart', ['pub', 'audit'], ctx.projectPath);
      if (a.unavailable) return { status: 'warn', evidence: 'Could not run `dart pub audit` here (' + a.error + '). Run it in CI.' };
      if (/No vulnerabilities|0 vulnerabilit/i.test(a.out)) return { status: 'ok', evidence: 'dart pub audit: no known vulnerabilities.' };
      if (/vulnerabilit|advisor/i.test(a.out)) return { status: 'fail', evidence: 'dart pub audit reported issues:\n' + a.out.slice(0, 1200) };
      return { status: 'warn', evidence: 'dart pub audit output:\n' + (a.out || a.error).slice(0, 1200) };
    } },
];
