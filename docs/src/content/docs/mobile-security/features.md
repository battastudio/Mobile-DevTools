---
title: Features
description: Every Mobile Security feature — the OWASP scan, grading, the quality gate, findings, one-click fixes, triage, AI, SBOM, CVE lookup, git-secrets, exports, and the fleet view.
sidebar:
  order: 3
---

This page enumerates everything Mobile Security does. The **Scan** and
**Dashboard** screens surface the core loop; the rest is available over the same
local HTTP API (`http://localhost:4110/api/security/*`) for CI and scripting.

## The OWASP Mobile scan

**What it does.** Runs 30 static checks over a Flutter project's `pubspec.yaml`,
`AndroidManifest.xml`, Gradle files, `Info.plist`, and Dart source, each mapped
to an OWASP Mobile Top 10 (2024) category (M1–M10). Every check is read-only —
no live network probing, no running the app. A broken check degrades gracefully
to a REVIEW finding rather than failing the scan.

**How to use it.** On the **Scan** screen, enter a project path and click
**Run scan**. A live log streams each check. For a whole fleet, the API scans
every Flutter project under your root (`PROJECTS_ROOT`, default `~/mobileApps`).

See the full catalog in
[OWASP mapping](/Mobile-DevTools/mobile-security/owasp-mapping/).

## Grading

**What it does.** Turns findings into a 0–100 score and an A–F letter. The score
starts at 100 and subtracts a weight for each **FAIL** by severity — Critical 35,
High 20, Medium 9, Low 3, Info 0. Letters: **A** ≥ 90, **B** ≥ 78, **C** ≥ 64,
**D** ≥ 45, **F** below. REVIEW, PASS, and N/A do not lower the score.

**How to use it.** The grade shows in the results header and on every Dashboard
row. Each re-scan records a capped history and a delta (score change, new
findings, fixed findings) versus the previous scan.

## Quality gate

**What it does.** A configurable pass/fail check for CI. It fails when active
(non-suppressed) findings exceed your thresholds: **max criticals** (default 0),
**max highs** (default unlimited), or the grade falls below a **minimum grade**
(default none). The result — `gate PASS` / `gate FAIL` with reasons — rides
along on every scan record.

**How to use it.** The gate result shows next to the grade. Configure thresholds
via `GET`/`POST /api/security/gate`. Full details in
[Gate & baseline](/Mobile-DevTools/mobile-security/gate-and-baseline/).

## Findings: scenario, evidence, fix

**What it does.** Each finding carries an OWASP tag, category, severity, a status
(PASS/FAIL/REVIEW/N/A), a plain-language **attack scenario**, **evidence** (the
concrete reason it fired, with `file:line` and redacted secrets), and a
**remediation**.

**How to use it.** Findings sort worst-first. Click one to expand its scenario,
evidence, and fix.

## One-click fix

**What it does.** Applies a deterministic, reversible fix for the safe
manifest/Gradle/plist toggles. Every write leaves a `.bak` beside the original,
and the tool refuses to modify itself. Auto-fixable checks:

| Check | What the fix does |
|-------|-------------------|
| Cleartext (HTTP) traffic | Sets `android:usesCleartextTraffic="false"`. |
| Android `allowBackup` | Sets `android:allowBackup="false"`. |
| Release debuggable | Sets `debuggable false` in the release build type. |
| iOS ATS disabled | Sets `NSAllowsArbitraryLoads=false` in `Info.plist`. |
| Network Security Config | Creates `network_security_config.xml` (cleartext off, system CAs only) and wires it into the manifest. |

**How to use it.** Expand a fixable finding and click **One-click fix**, then
re-scan to confirm.

## Fix all

**What it does.** Applies every auto-fixable failing or review finding on the
current record in one pass, reporting what was applied and what was skipped.

**How to use it.** Click **Fix all** in the results header.

## Triage

**What it does.** Sets a per-finding state: **Open** (default), **False
positive**, **Accepted risk**, or **Fixed**. The last three suppress the finding
from both the grade and the gate (a suppressed FAIL is treated as N/A). Triage
state persists per project.

**How to use it.** Use the **Triage** dropdown inside an expanded finding; the
app regrades immediately.

## AI deep scan

**What it does.** Sends a bounded slice of your code and config to your
configured model to surface issues the regex checks miss — insecure data flow,
auth/session logic, injection, unsafe platform channels, crypto misuse, WebView
bridge abuse. Returned issues are folded into the findings list (tagged **AI**)
and count toward the grade.

**How to use it.** Click **AI deep scan** in the results header. Requires an AI
key in **Settings** — off by default.

## AI explain

**What it does.** Explains one finding to a developer and proposes a concrete,
minimal fix (why it's a risk, the fix, how to verify).

**How to use it.** Click **AI explain** inside an expanded finding.

## More AI (API)

With a key configured, three more endpoints are available for scripting:

- **AI fix patch** (`/api/security/ai/patch`) — a unified-diff fix for one
  finding, grounded in the surrounding file.
- **AI threat model** (`/api/security/ai/threat-model`) — a STRIDE threat model
  grounded in the scan.
- **AI executive summary** (`/api/security/ai/summary`) — a short risk briefing
  (posture, top risks, fix-first order).

:::note
AI is entirely opt-in. Nothing is sent anywhere until you add a key in Settings,
and the static scan works fully without it.
:::

## SBOM

**What it does.** Builds a software bill of materials — direct dependencies with
versions and licenses across `pub`, `npm`, and `composer`, flagging risky
licenses (GPL/AGPL/LGPL/SSPL/BUSL/unknown) for review.

**How to use it.** `GET /api/security/sbom?path=<project>`.

## OSV / CVE vulnerability lookup

**What it does.** Queries [OSV](https://osv.dev) for real advisories against your
resolved dependency versions, returning severity, a summary, the fixed-in
version, and a link per CVE. This one check reaches the network (OSV's public
API, no key).

**How to use it.** `GET /api/security/vulns?path=<project>`.

## Git-history secret scan

**What it does.** Scans added lines across recent git history (TruffleHog/gitleaks
style) for leaked keys and tokens, with an entropy gate for opaque strings.
Findings are redacted and report the commit, date, and file.

**How to use it.** `GET /api/security/git-secrets?path=<project>`.

## SARIF and report export

**What it does.** Exports findings for CI and code scanning:

- **SARIF 2.1.0** — failing and review findings with CWE rule metadata and
  best-effort `file:line` locations.
- **Raw JSON** — the full findings array.
- **Printable HTML report** — grade, OWASP coverage, and every finding, styled
  for Print → PDF.

**How to use it.** Click **SARIF** or **Report** in the results header, or hit
`GET /api/security/export?fmt=sarif|json&path=<project>` and
`GET /api/security/report?path=<project>`.

## Grade badge

**What it does.** Renders an SVG badge (`security: B 84/100`) colored by grade
for your README or CI.

**How to use it.** `GET /api/security/badge?path=<project>`.

## Dashboard & fleet view

**What it does.** The **Dashboard** screen rolls up every scanned app: an average
grade, total failing checks, and a clickable list of apps with their grades and
fail counts. A dedicated fleet heatmap (each app × its OWASP category statuses,
weakest first) is available at `GET /api/security/fleet`.

**How to use it.** Open **Dashboard**, or click any app row to reopen its
findings on the Scan screen.

## Baseline

**What it does.** Snapshots the current failing and review findings (their IDs
and a timestamp) so you can accept today's state and focus future scans on what's
new. The snapshot is attached to the scan record.

**How to use it.** `POST /api/security/baseline` to set (or clear) it. See
[Gate & baseline](/Mobile-DevTools/mobile-security/gate-and-baseline/).

## Share & notify

**What it does.** Pushes results to your team through the shared kit connectors:
open a **Jira** issue from the findings, send the report over **Slack /
Telegram**, email it, or push a shareable note. New findings introduced by a scan
can auto-alert a configured Slack/Telegram channel.

**How to use it.** Configure connectors and notifications in **Settings**, then
use the `/api/security/share*`, `/api/security/notify`, and
`/api/security/email` endpoints.
