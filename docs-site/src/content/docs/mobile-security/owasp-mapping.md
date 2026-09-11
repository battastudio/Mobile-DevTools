---
title: OWASP mapping
description: The M1–M10 OWASP Mobile Top 10 categories and exactly which of the 30 checks map to each.
sidebar:
  order: 5
---

Every check Mobile Security runs is tagged with one OWASP Mobile Top 10 (2024)
category, M1 through M10. The **OWASP coverage** strip on the Scan screen rolls
findings up per category — each category takes the worst status of its checks
(FAIL beats REVIEW beats PASS), and "X/Y categories passing" counts the ones
where every applicable check passed.

There are **30 checks** across the ten categories. Here's the full map.

## M1 · Improper Credential Usage

Secrets that ship inside the app or get committed to source control.

| Check | Severity | What it looks for |
|-------|----------|-------------------|
| Hardcoded secrets in Dart source | High | API keys, tokens, private keys, `password`/`secret` literals in `lib/` (values redacted). |
| Secret files committed to git | High | `key.properties`, `.env`, keystores (`.jks`/`.keystore`/`.p12`/`.mobileprovision`) tracked in git. |
| Google/Maps API key must be restricted | Low | A store-issued `AIza…` key that ships by design — confirm it's restricted by package + SHA-1 + API. |

## M2 · Inadequate Supply Chain Security

Vulnerable or unaudited dependencies. Also see the SBOM and OSV/CVE lookup in
[Features](/Mobile-DevTools/mobile-security/features/).

| Check | Severity | What it looks for |
|-------|----------|-------------------|
| Outdated / vulnerable dependencies | Medium | Runs `dart pub audit` and reports known advisories. |

## M3 · Insecure Authentication/Authorization

Auth flows that can be intercepted or spoofed at the OS link layer.

| Check | Severity | What it looks for |
|-------|----------|-------------------|
| Deep-link / App Link not verified | Low | `https` deep links without `android:autoVerify="true"`, or custom-scheme links that can be hijacked. |

## M4 · Insufficient Input/Output Validation

Untrusted input reaching WebViews, local SQL, biometrics, or the touch layer.

| Check | Severity | What it looks for |
|-------|----------|-------------------|
| WebView JavaScript / file access misconfig | Medium | Unrestricted JS, a `JavascriptChannel`, or file access on a WebView. |
| SQL injection in local database query | Medium | Interpolated strings in `sqflite` `rawQuery`/`rawInsert`/… instead of `?` placeholders. |
| Weak biometric / local-auth configuration | Medium | `local_auth` without `biometricOnly` + `stickyAuth`, or biometric success trusted with no server binding. |
| No tapjacking / overlay protection | Low | Sensitive screens without `filterTouchesWhenObscured` overlay guards. |

## M5 · Insecure Communication

Traffic that can be read or rewritten on the network.

| Check | Severity | What it looks for |
|-------|----------|-------------------|
| Cleartext (HTTP) traffic allowed | Medium | `usesCleartextTraffic="true"` or unset in the Android manifest. |
| iOS App Transport Security disabled | Medium | `NSAllowsArbitraryLoads=true` in `Info.plist`. |
| No SSL/certificate pinning | Medium | An HTTP client with no pinning (defense-in-depth gap). |
| Network Security Config permits cleartext / user CAs | Medium | `cleartextTrafficPermitted="true"` or trusting user-installed CAs. |
| TLS certificate validation disabled | High | A `badCertificateCallback`/`onBadCertificate` that returns `true`. |

## M6 · Inadequate Privacy Controls

PII leaking through logs, replay SDKs, the keyboard, or over-broad permissions.

| Check | Severity | What it looks for |
|-------|----------|-------------------|
| Session-replay SDK without field masking | Medium | A replay SDK (Clarity/Sentry/Smartlook/FullStory) capturing card/CVV/password fields unmasked. |
| Sensitive data written to logs | Medium | `print`/`log` of a token, password, secret, or API key. |
| Sensitive fields leak via keyboard cache / suggestions | Low | Password/CVV/OTP fields without `enableSuggestions:false` + `autocorrect:false`. |
| Excessive dangerous permissions | Low | Four or more dangerous permissions (SMS, contacts, location, storage, camera…). |
| No screenshot / screen-recording block | Low | No `FLAG_SECURE` on sensitive screens. |

## M7 · Insufficient Binary Protections

Missing runtime and reverse-engineering defenses.

| Check | Severity | What it looks for |
|-------|----------|-------------------|
| No root / jailbreak detection | Medium | No jailbreak/root package wired at boot. |
| No anti-debugging | Low | No native anti-debug bridge (TracerPid / P_TRACED checks). |
| No code obfuscation / shrinking | Low | No `minifyEnabled`/ProGuard and no Dart `--obfuscate`. |

## M8 · Security Misconfiguration

Release builds and components shipped with insecure defaults.

| Check | Severity | What it looks for |
|-------|----------|-------------------|
| Release signed with debug certificate | Info | Release not wired to a `key.properties` signing config. |
| Release build debuggable | Medium | `debuggable true` in the release build type. |
| Exported Android components without permission | Medium | Exported activities/services/receivers with no `android:permission` guard. |

## M9 · Insecure Data Storage

Sensitive data left readable at rest.

| Check | Severity | What it looks for |
|-------|----------|-------------------|
| Session token / PII stored unencrypted | High | Tokens/PII written to `GetStorage`/`SharedPreferences` instead of secure storage. |
| Android `allowBackup` enabled | Medium | `allowBackup` true or unset — data extractable via `adb backup`. |
| Sensitive value copied to the clipboard | Low | `Clipboard.setData` with a password, OTP, token, or card value. |

## M10 · Insufficient Cryptography

Broken ciphers and predictable randomness.

| Check | Severity | What it looks for |
|-------|----------|-------------------|
| Weak / broken cryptography | Medium | MD5, SHA1, DES, RC4, or AES-ECB usage. |
| Insecure randomness for tokens / OTP | Low | Plain `Random()` near tokens/OTP/nonces/salts (should be `Random.secure()`). |

:::note
The SARIF export ([Features](/Mobile-DevTools/mobile-security/features/)) also
attaches a **CWE** ID to each finding, so results slot straight into GitHub code
scanning and other CWE-aware tooling.
:::
