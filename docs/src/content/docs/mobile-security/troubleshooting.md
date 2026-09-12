---
title: Troubleshooting
description: Fixes for the common Mobile Security snags — no findings, scan errors, a gate that's too strict or too loose, AI keys, and false positives.
sidebar:
  order: 4
---

Quick fixes for the problems you're most likely to hit.

## "Not a Flutter project"

The scan only runs on Flutter apps, and a Flutter app is a folder with **both**
`pubspec.yaml` and a `lib/` directory.

- Point at the project root, not a subfolder or a monorepo top level.
- Use an absolute path.
- If you're scanning a fleet, put each app directly under your projects root
  (`PROJECTS_ROOT`, default `~/mobileApps`) — discovery only looks one level deep.

## The scan runs but finds nothing (all PASS / N/A)

That can be genuine — but check these first:

- **Lots of N/A** usually means the relevant surface isn't present. No `ios/`
  directory makes the iOS ATS check N/A; no WebView package makes the WebView
  check N/A. That's expected.
- **Dart checks look empty** if your source lives somewhere unusual. The scanner
  reads `lib/`; code outside `lib/` isn't scanned.
- Re-run the self-test to confirm the catalog is loading:

  ```sh
  node mobile-security/server.js --selftest
  # Mobile Security selftest — 30 checks loaded (OWASP Mobile Top 10).
  ```

## A check shows REVIEW with "Check error"

If a single check throws, it degrades to a **REVIEW** finding whose evidence
starts with `Check error:` instead of failing the whole scan. This is almost
always a missing external tool or an unreadable file:

- **"Outdated / vulnerable dependencies"** needs `dart` on your `PATH` to run
  `dart pub audit`. Without it the check becomes REVIEW — run the audit in CI
  where the Flutter SDK is available.
- **"Secret files committed to git"** and the git-history secret scan need the
  project to be a git repository; otherwise they report N/A or an error.

## AI explain / deep scan says "configure AI in Settings"

AI is off by default. Open **Settings** (top-right) and add a model key under the
AI section. Until a key is set, the AI buttons return that message — the static
scan and grading work fully without it.

If a key is set but calls still fail, use the config test in Settings to verify
the key and model, and confirm the machine has outbound network access.

## Dependency CVE lookup returns an error or empty list

The OSV lookup (`/api/security/vulns`) is the one feature that reaches the
network. If it errors:

- Confirm outbound HTTPS to `api.osv.dev` is allowed.
- Dependencies without a concrete resolved version are skipped — make sure a
  lockfile (`pubspec.lock`) is present so versions can be read.

## The gate fails on findings you've already accepted

The gate counts **active** findings only — anything you've triaged as **False
positive**, **Accepted risk**, or **Fixed** drops out of both the grade and the
gate. If an old finding is still failing the gate:

1. Open the finding on the **Scan** screen and set its **Triage** state.
2. Re-scan (or the record regrades immediately on triage).

To accept everything as-is and only surface what's new going forward, set a
[baseline](/Mobile-DevTools/mobile-security/gate-and-baseline/).

## The gate is too strict (or too loose)

The default gate allows **0 criticals**, unlimited highs, and sets no minimum
grade. Tune it via `POST /api/security/gate`:

```sh
# Stricter: no criticals, at most 2 highs, require at least a B
curl -s -X POST http://localhost:4110/api/security/gate \
  -H 'Content-Type: application/json' \
  -d '{"maxCrit":0,"maxHigh":2,"minGrade":"B"}'
```

Set a threshold to `null` to disable it. See
[Gate & baseline](/Mobile-DevTools/mobile-security/gate-and-baseline/) for how
each threshold is evaluated.

## A finding is a false positive

The static checks are pattern-based and occasionally over-fire (for example, a
`Random()` used far from any real token, or an exported component that's meant to
be public). Don't fight it — expand the finding and set **Triage → False
positive**. It's suppressed from the grade and gate and won't nag on future
scans, while staying visible in the list for the record.

## Port 4110 is already in use

Another process (or a second copy of the tool) holds the port. Stop the other
process, or launch through the hub with `node serve`, which manages all tool
ports for you.

## A one-click fix didn't seem to change anything

- One-click fixes only apply to the five auto-fixable checks; other findings need
  a manual change (follow the **Remediation** text).
- Each fix writes a `.bak` beside the edited file — check the diff against it.
- Re-scan after fixing; the grade and finding status update on the next scan.
