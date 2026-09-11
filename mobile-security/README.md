# Mobile Security

A zero-dependency, offline **OWASP Mobile Top 10** scanner for Flutter apps. It statically reads a
project's `pubspec.yaml`, `AndroidManifest.xml`, Gradle, `Info.plist`, and Dart source, grades the app
A–F, and shows each finding with an attack scenario and a concrete fix. Part of **Mobile DevTools** —
runs open on `localhost`, no accounts, no telemetry.

## Run

```sh
node mobile-security/server.js          # → http://localhost:4110
node mobile-security/server.js --selftest   # load the catalog + scan a throwaway sample, print the grade
```

Open the UI, point it at a Flutter project path (or pick one discovered under `PROJECTS_ROOT`,
default `~/mobileApps`), and hit **Run scan**. Findings list with grade, quality gate, one-click fixes,
SARIF/JSON export, a printable report, and optional AI explain/deep-scan (off until you add a key in
Settings).

## What it checks — OWASP Mobile Top 10 (2024)

All checks are **static and read-only** (no live/authenticated network probing).

| OWASP | Category | Checks |
|-------|----------|--------|
| M1 | Improper Credential Usage | hardcoded secrets in Dart, secret files committed to git, unrestricted Google/Maps API key |
| M2 | Inadequate Supply Chain Security | outdated/vulnerable dependencies (`dart pub audit`), SBOM + OSV CVE lookup |
| M3 | Insecure Authentication/Authorization | deep-link / App Link not verified |
| M4 | Insufficient Input/Output Validation | WebView JS/file-access misconfig, local SQL injection, weak biometric/local-auth, tapjacking |
| M5 | Insecure Communication | cleartext traffic, iOS ATS disabled, no cert pinning, permissive network-security-config, disabled TLS validation |
| M6 | Inadequate Privacy Controls | session-replay without masking, secrets in logs, keyboard-cache leaks, dangerous permissions |
| M7 | Insufficient Binary Protections | no root/jailbreak detection, no anti-debug, no obfuscation/shrinking |
| M8 | Security Misconfiguration | debug-signed release, debuggable release, exported components without permission |
| M9 | Insecure Data Storage | plaintext token/PII storage, `allowBackup` enabled, sensitive value on clipboard |
| M10 | Insufficient Cryptography | weak/broken ciphers (MD5/SHA1/DES/RC4/ECB), insecure `Random()` for tokens/OTP |

## Extras

- **Quality gate** — fail CI when criticals/highs exceed a threshold or the grade drops below a minimum.
- **Triage** — mark findings false-positive / accepted / fixed; suppressed findings drop out of the grade.
- **Baseline** — accept today's findings so future scans surface only new ones.
- **Git-history secret scan**, **grade badge SVG**, and **push to Jira** / Slack / Telegram / email via the shared kit connectors.

## Layout

```
server.js            wiring (createKitServer) + --selftest
lib/scan/            engine, grade, store, report, fix, ai-context, fleet
lib/scan/checks/     the OWASP Mobile check catalog, as data, one file per domain
lib/routes/          HTTP controllers (scan, supply, share, ai)
lib/                 gitsecrets, osv, sbom, triage, project-lite
public/              Vue-via-CDN UI on the platform-kit frontend
```
