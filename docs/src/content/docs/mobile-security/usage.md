---
title: Usage
description: Point Mobile Security at a Flutter project, run a scan, read the grade and gate, work a finding, and export a report or SARIF.
sidebar:
  order: 2
---

This walkthrough takes you from an unscanned project to a graded report you can
put in CI. Start the tool with `node serve` (hub) or `node mobile-security/server.js`
(standalone), then open **http://localhost:4110**.

## 1. Point at a Flutter project

Open the **Scan** screen. In **Flutter project path**, type or paste the path to
your app — for example `/Users/you/mobileApps/acme-wallet`.

The field autocompletes from projects discovered under your projects root
(`~/mobileApps` by default; override with the `PROJECTS_ROOT` environment
variable). A Flutter project is any folder with both a `pubspec.yaml` and a
`lib/` directory.

:::note
Only Flutter projects are scannable. If the path has no `pubspec.yaml` + `lib/`,
the scan stops with "Not a Flutter project".
:::

## 2. Run the scan

Click **Run scan**. A live log streams each check as it runs:

```
▸ Scanning acme-wallet [flutter]
  ✖ [fail] Session token / PII stored unencrypted
  ! [warn] No SSL/certificate pinning
  ✔ [ok] Cleartext (HTTP) traffic allowed
  ·  [na] iOS App Transport Security disabled
▸ acme-wallet: grade D (52/100) — gate FAIL — 4 failing
```

When it finishes, the results panel appears.

## 3. Read the grade, gate, and OWASP coverage

The header shows the letter grade and score, the app name, and the quality-gate
result — `gate PASS` or `gate FAIL` — plus a count line:

> **acme-wallet** · gate FAIL
> 4 fail · 6 review · 15 pass · 5 n/a

Below it, **OWASP Mobile coverage — X/Y categories passing** shows a chip per
category (M1–M10) colored by its worst finding. Hover a chip for the category
name.

The four status values mean:

| Status | Meaning |
|--------|---------|
| **PASS** | The check passed. |
| **FAIL** | A real problem that counts against the grade. |
| **REVIEW** | A possible issue worth a human look (does not lower the grade). |
| **N/A** | Not applicable — the relevant surface isn't present in this app. |

## 4. Expand a finding

Findings are sorted worst-first (FAIL, then REVIEW, then PASS, then N/A). Click
any finding to expand it:

- **Attack scenario** — how the weakness gets exploited in practice.
- **Evidence** — the concrete reason it fired, with `file:line` references.
  Secret values are redacted.
- **Remediation** — the exact config or code change that fixes it.

Each finding row also shows its **OWASP** tag (e.g. `M9`), its **category**, and
a severity badge (**Critical / High / Medium / Low / Info**).

## 5. Fix or triage it

Inside an expanded finding you have three moves:

- **One-click fix** — appears on the safe, reversible checks (cleartext traffic,
  `allowBackup`, iOS ATS, network-security-config, release-debuggable). It edits
  the manifest/Gradle/plist directly and writes a `.bak` beside the original.
  Prefer to fix everything fixable at once? Use **Fix all** in the results header.
- **AI explain** — opens a plain-language explanation and a concrete fix. This is
  one of several [AI features](/Mobile-DevTools/mobile-security/ai/) (deep
  scan, patch, threat model, summary); they're off until you
  [set up AI](/Mobile-DevTools/reference/ai-setup/) (the default local
  OmniRoute provider needs no key).
- **Triage** — the dropdown sets the finding to **Open**, **False positive**,
  **Accepted risk**, or **Fixed**. The last three suppress it from the grade and
  gate. The app regrades immediately.

:::caution
One-click fixes change real files. They always leave a `.bak`, and the tool
refuses to modify itself, but review the diff and re-scan to confirm the fix
landed.
:::

## 6. Export a report or SARIF

From the results header:

- **Report** opens a clean, printable HTML report (grade, OWASP coverage, and
  every finding with scenario, evidence, and remediation) — use your browser's
  Print → Save as PDF.
- **SARIF** downloads a SARIF 2.1.0 file (failing + review findings, with CWE
  rule metadata) for GitHub code scanning or any SARIF-aware tool.

## 7. Wire it into CI

There's no separate scan binary — CI drives the same HTTP API the UI uses. Start
the server, trigger a scan, then pull the SARIF export:

```sh
# 1. start the tool (background it in CI)
node mobile-security/server.js &

# 2. run a scan for one project path
curl -s -X POST http://localhost:4110/api/security/scan \
  -H 'Content-Type: application/json' \
  -d '{"path":"/abs/path/to/app"}'

# 3. download SARIF for code scanning
curl -s "http://localhost:4110/api/security/export?fmt=sarif&path=/abs/path/to/app" \
  -o security.sarif
```

A grade badge for your README is one request away:

```sh
curl -s "http://localhost:4110/api/security/badge?path=/abs/path/to/app" -o badge.svg
```

To turn the grade into a build gate, see
[Gate & baseline](/Mobile-DevTools/mobile-security/gate-and-baseline/).
