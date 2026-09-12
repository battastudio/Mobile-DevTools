---
title: Gate & baseline
description: How grading and the quality gate work, how triage suppresses findings, and how the baseline lets you accept today's findings and focus on what's new.
sidebar:
  order: 6
---

This page explains the three mechanisms that turn a pile of findings into a
pass/fail signal: **grading**, the **quality gate**, and the **baseline**.

## Grading

The grade is pure: the same findings always produce the same score. It starts at
100 and subtracts a weight for each **FAIL**, by severity:

| Severity | Points off per FAIL |
|----------|---------------------|
| Critical | 35 |
| High | 20 |
| Medium | 9 |
| Low | 3 |
| Info | 0 |

REVIEW, PASS, and N/A findings do not change the score. The score clamps at 0,
then maps to a letter:

| Score | Grade |
|-------|-------|
| ≥ 90 | A |
| ≥ 78 | B |
| ≥ 64 | C |
| ≥ 45 | D |
| below | F |

So one critical FAIL (−35) drops a clean app straight to a C; two highs (−40)
land it at D. This is deliberate — the grade tracks the worst problems, not the
count of nitpicks.

## Triage: how a finding leaves the grade

Before grading, any finding you've triaged as **False positive**, **Accepted
risk**, or **Fixed** is suppressed — a suppressed FAIL is treated as N/A, so it
stops subtracting points and stops counting against the gate. **Open** (the
default) findings count normally.

This is the lever you use for real-world noise: accept a finding you've decided
to live with, and both the grade and the gate reflect that decision immediately.

## The quality gate

The gate is a pass/fail verdict for CI. It evaluates three thresholds against the
**active** findings (FAIL findings that are *not* suppressed) plus the grade:

| Setting | Default | Fails the gate when… |
|---------|---------|----------------------|
| `maxCrit` | `0` | active criticals exceed the limit. |
| `maxHigh` | `null` (off) | active highs exceed the limit. |
| `minGrade` | `null` (off) | the grade is below the required letter. |

A threshold set to `null` is disabled. The gate returns `pass` plus a list of
`reasons` — for example `2 critical > 0 allowed` or `grade C < required B` — and
that verdict rides along on every scan (shown as `gate PASS` / `gate FAIL` next
to the grade).

### Reading and setting the gate

```sh
# read the current gate config
curl -s http://localhost:4110/api/security/gate

# require zero criticals, at most 3 highs, and at least a B
curl -s -X POST http://localhost:4110/api/security/gate \
  -H 'Content-Type: application/json' \
  -d '{"maxCrit":0,"maxHigh":3,"minGrade":"B"}'
```

The gate config is global to the tool, so every project is held to the same bar.

:::tip
In CI, scan the project, then read `gate.pass` from the scan response (or the
`GET /api/security?path=…` record) and fail the job when it's `false`.
:::

## The baseline: accept today, watch for new

A fresh scanner on an existing app can surface dozens of findings at once.
Fixing them all before you can gate is unrealistic — so you draw a line under
today's state and hold the line only on **new** problems.

Two things make this work:

**The baseline snapshot.** `POST /api/security/baseline` records the IDs of every
current failing and review finding, with a timestamp — "these are known and
accepted as of now." It's attached to the scan record so the UI and API can show
that a project has an accepted baseline.

```sh
# accept the current findings as the baseline
curl -s -X POST http://localhost:4110/api/security/baseline \
  -H 'Content-Type: application/json' \
  -d '{"path":"/abs/path/to/app"}'

# read it back
curl -s "http://localhost:4110/api/security/baseline?path=/abs/path/to/app"

# clear it
curl -s -X POST http://localhost:4110/api/security/baseline \
  -H 'Content-Type: application/json' \
  -d '{"path":"/abs/path/to/app","clear":true}'
```

**The per-scan delta.** Every scan compares itself to the *previous* scan and
records a `delta`: the score change, the `newFindings` (failing/review findings
that weren't there last time), and the `fixedFindings` (ones that cleared). New
findings are exactly what you want to react to — and if you've configured a
Slack or Telegram channel in **Settings**, a scan that introduces new findings
auto-alerts with the list.

### Putting it together

A practical rollout for an existing app:

1. Scan it and set a **baseline** to accept the current findings.
2. **Triage** the ones you're genuinely accepting (False positive / Accepted
   risk) so they leave the grade and gate.
3. Set a **gate** you can actually pass today (e.g. `maxCrit: 0`).
4. From then on, each scan's `delta.newFindings` shows what regressed, and new
   findings alert your channel — so the gate protects against *new* problems
   while the backlog gets worked down over time.

:::note
The baseline records what's accepted and the delta highlights what's new; the
grade and gate themselves only stop counting a finding once you **triage** it.
Baseline + triage together give you "accept the backlog, fail on new."
:::
