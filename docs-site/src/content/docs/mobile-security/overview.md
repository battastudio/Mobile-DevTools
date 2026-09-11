---
title: Mobile Security
description: A zero-dependency, offline OWASP Mobile Top 10 static scanner that grades your Flutter app and gates on the result.
sidebar:
  order: 1
---

Mobile Security is a static scanner for Flutter apps. It reads a project's
`pubspec.yaml`, `AndroidManifest.xml`, Gradle files, `Info.plist`, and Dart
source, maps what it finds to the **OWASP Mobile Top 10 (2024)**, grades the app
**A–F**, and shows each finding with an attack scenario and a concrete fix.

Everything is static and read-only — no live network probing, no instrumented
device, no accounts, and nothing leaves your machine.

## The core idea: scan → grade → gate

Three moves, all local:

1. **Scan** — point at a Flutter project path. Mobile Security runs 30 OWASP
   Mobile checks over its files and produces a finding for each: **PASS**,
   **FAIL**, **REVIEW**, or **N/A**.
2. **Grade** — findings roll up into a 0–100 score and an A–F letter. Failing
   checks subtract points weighted by severity; the more (and more severe) the
   fails, the lower the grade.
3. **Gate** — a configurable quality gate turns that grade into a pass/fail
   signal for CI: fail the build when criticals or highs exceed a threshold, or
   when the grade drops below a minimum.

## Where it runs

Mobile Security runs entirely on your machine at **http://localhost:4110**.

Launch it two ways:

```sh
# Via the hub — starts every tool, open http://localhost:4090
node serve

# Standalone — just this tool, on http://localhost:4110
node mobile-security/server.js
```

You can confirm the catalog loads without opening a browser:

```sh
node mobile-security/server.js --selftest
# Mobile Security selftest — 30 checks loaded (OWASP Mobile Top 10).
# Sample "mobsec-…" → grade F (42/100): 5 fail, 7 review, 6 pass, 12 n/a · gate PASS.
```

The self-test loads the check catalog, scans a throwaway sample app in a temp
directory, and prints the grade — a fast way to verify the install.

## The two screens

The UI has a segmented switcher in the header:

- **Dashboard** — the fleet view. A roll-up grade across every app you've
  scanned, the total failing checks, and a list of scanned apps (each with its
  grade and fail count). Click any app to reopen its findings.
- **Scan** — the working screen. Enter a Flutter project path, hit **Run scan**,
  and read the grade, the quality-gate result, the OWASP coverage strip, and the
  full list of findings. Expand a finding for its scenario, evidence, and fix.

## What you can do

- **Scan a single app or a whole fleet** — scan one path, or scan every Flutter
  project discovered under your projects root.
- **Read a real grade** — an A–F letter and 0–100 score you can track over time,
  with per-scan deltas (what's new, what's fixed).
- **Understand each finding** — every finding carries an OWASP category, a
  severity, an attack scenario, redacted evidence (file:line), and a remediation.
- **Fix safely in one click** — apply deterministic manifest/Gradle/plist fixes
  (each writes a `.bak` first), one at a time or all at once with **Fix all**.
- **Triage the noise** — mark a finding **False positive**, **Accepted risk**,
  or **Fixed** to drop it from the grade and gate.
- **Gate your CI** — set thresholds on criticals, highs, and minimum grade, then
  export **SARIF** for code-scanning or a printable **Report**.
- **Go deeper with AI (optional)** — turn on a key in Settings for AI explain, a
  deep scan that finds issues the static checks miss, a STRIDE threat model, and
  an executive risk briefing.
- **Look up dependency CVEs** — build an SBOM and query real advisories from
  [OSV](https://osv.dev), plus a git-history secret scan.

:::tip
New here? Read [Usage](/Mobile-DevTools/mobile-security/usage/) for a full
walkthrough, then [OWASP mapping](/Mobile-DevTools/mobile-security/owasp-mapping/)
to see exactly which checks map to each M1–M10 category.
:::
