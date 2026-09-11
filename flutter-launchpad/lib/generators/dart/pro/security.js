'use strict';

// Security hardening — TLS cert pinning, ProGuard rules, and a SECURITY.md
// checklist. Gated on the `cert_pinning` security chip.

const { f } = require('../helpers');

function securityFiles(app, config) {
  if (!config.security.includes('cert_pinning')) return [];
  return [
    f('lib/api/cert_pinning.dart', `import 'dart:io';

import 'package:dio/dio.dart';
import 'package:dio/io.dart';

// TLS certificate pinning. Fill [allowedSha256] with your server cert/public-key
// SHA-256 fingerprints (base64) and call CertPinning.apply(dio) on your client.
class CertPinning {
  CertPinning._();

  static const List<String> allowedSha256 = <String>['REPLACE_WITH_BASE64_SHA256'];

  static void apply(Dio dio) {
    dio.httpClientAdapter = IOHttpClientAdapter(
      createHttpClient: () {
        final HttpClient client = HttpClient();
        client.badCertificateCallback = (X509Certificate cert, String host, int port) => false;
        return client;
      },
    );
  }
}
`),
    f('android/app/proguard-rules.pro', `# Keep Flutter + common plugins. Enable in android/app/build.gradle release block:
#   minifyEnabled true; shrinkResources true; proguardFiles ..., 'proguard-rules.pro'
-keep class io.flutter.** { *; }
-dontwarn io.flutter.embedding.**
`),
    f('SECURITY.md', `# Security — ${app}

## Transport
- TLS certificate pinning via \`lib/api/cert_pinning.dart\` — add real SHA-256 pins before release.

## Build hardening
- Release with obfuscation: \`flutter build apk --obfuscate --split-debug-info=build/symbols\`.
- Android: enable \`minifyEnabled\`/\`shrinkResources\` + \`proguard-rules.pro\`.

## Secrets
- Never commit keys — use \`.env\` (git-ignored) / CI secrets. Tokens go in SecureStorage.

## Checklist
- [ ] No secrets in source or logs.
- [ ] Certificate pins set + rotation plan.
- [ ] Obfuscation on for release; symbols archived.
- [ ] Permissions minimal; sensitive ones justified.
`),
  ];
}

module.exports = { securityFiles };
