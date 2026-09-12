---
title: AI features
description: What AI adds to Mobile Security — deep scan, explain a finding, propose a patch, STRIDE threat model, and an executive risk summary.
sidebar:
  order: 2.5
---

Mobile Security's static checks run with no AI. Adding an AI provider turns on a
set of higher-signal, natural-language actions on top of a scan.

:::note
Add a provider first — see **[Set up AI](/Mobile-DevTools/reference/ai-setup/)**.
The default **OmniRoute (local)** needs no key; cloud providers do. Every action
below is disabled until the AI tile reads *configured*.
:::

Run a scan first (AI actions work from a scanned project's findings), then:

- **Deep scan** — the AI reviews the app context (pubspec, AndroidManifest,
  Info.plist, and truncated Dart source) for high-signal issues the regex checks
  miss: insecure data flow, auth/session logic, injection, unsafe platform
  channels, crypto misuse, WebView-bridge abuse, IDOR, and more. Its findings are
  **merged into the record and count toward the grade**.
- **Explain a finding** — plain-language *why it's a risk*, a concrete minimal
  fix, and how to verify it, for any single finding.
- **Propose a patch** — a concrete fix for one finding as a unified `diff` (or
  exact before/after code), grounded in the file and line context.
- **Threat model** — a concise **STRIDE** threat model (assets, attack surface, a
  STRIDE table, and a fix-first list) built from the scan's failing findings.
- **Executive summary** — an executive risk briefing: overall posture, the top 3
  risks with business impact, and a prioritized fix-first order for the week.

All of these call your configured provider directly; nothing is sent to a
Batta/Mobile-DevTools server. See [Privacy & storage](/Mobile-DevTools/reference/ai-setup/#privacy--storage).
