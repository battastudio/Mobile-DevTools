---
title: Set up AI (OmniRoute & providers)
description: Add an AI provider once and unlock the AI features in Mobile Security and Mobile QA — deep scans, explanations, fixes, threat models, and test generation.
sidebar:
  order: 4
---

The AI features in **Mobile Security** and **Mobile QA** (deep scans, "explain a
finding", one-click fixes, threat models, test generation…) all route through one
small, shared, **opt-in** AI helper. You configure a provider **once per tool** in
its Settings, and every AI action uses it.

It is zero-dependency (plain Node `https`) and works with **any OpenAI-compatible
provider** *or* **Anthropic (Claude)** directly. Your key is stored locally and is
**never returned to the browser** — see [Privacy & storage](#privacy--storage).

## Default: OmniRoute (local) — no key needed

Out of the box the provider is **OmniRoute**, a *local* endpoint
(`http://localhost:20128/v1`, model `auto/best-free`). If you run OmniRoute (or
another local model server) on your machine, AI works with **no API key and
nothing leaving your computer**. To use a hosted model instead, pick a cloud
provider below and paste its key.

## Providers

| Provider | Base URL | Default model | Key needed? |
|----------|----------|---------------|-------------|
| **OmniRoute (local)** *(default)* | `http://localhost:20128/v1` | `auto/best-free` | No (local) |
| **Ollama (local)** | `http://localhost:11434/v1` | `llama3.1` | No (local) |
| **OpenAI** | `https://api.openai.com/v1` | `gpt-4o-mini` | Yes |
| **Groq** | `https://api.groq.com/openai/v1` | `llama-3.3-70b-versatile` | Yes |
| **OpenRouter** | `https://openrouter.ai/api/v1` | `openai/gpt-4o-mini` | Yes |
| **Anthropic (Claude)** | `https://api.anthropic.com` | `claude-sonnet-4-5` | Yes |
| **Custom (OpenAI-compatible)** | *(you set it)* | *(you set it)* | Depends |

Picking a provider auto-fills its **Base URL** and **Model** — both stay editable.

## Add your key

1. Open the tool (Mobile Security → `http://localhost:4110`, or Mobile QA →
   `http://localhost:4113`) and click the **⚙ Settings** gear.
2. In the **AI** section, choose your **Provider** from the dropdown. The **Model**
   and **Base URL** fill in from the preset — change them if you want a different
   model.
3. For a cloud provider, paste your key into **API token**. (Local providers can
   leave it blank. Leaving it blank on a re-save keeps the current key.)
4. Click **Save**, then **Test** — it sends a tiny prompt and shows
   `✓ <model> replied …` on success, or the error to fix.

Once the AI tile reads **configured**, the AI actions in that tool light up.

## What it unlocks

- **Mobile Security** — see [AI features](/Mobile-DevTools/mobile-security/ai/):
  deep scan, explain a finding, propose a patch, STRIDE threat model, executive
  summary.
- **Mobile QA** — see [AI features](/Mobile-DevTools/mobile-qa/ai/): generate
  tests, test plans, BDD scenarios, smoke journeys, explain/fix failing tests.

Each tool is configured separately (its own key), so you can point Security at one
model and QA at another.

## Privacy & storage

- The key is written to that tool's local data dir —
  `~/.mobile-devtools/<tool>/config.json` (override the base with the
  `MOBILE_DEVTOOLS_HOME` env var). It is **never committed to a repo** and the
  config API returns only whether a key is set (`hasKey`), never the key itself.
- **Env override:** `ANTHROPIC_API_KEY` is honored if set (handy for Claude in
  CI). There is no `OPENAI_API_KEY` override — enter OpenAI-compatible keys in
  Settings.
- **Where prompts go:** requests are made **directly** from the local Node process
  to the provider *you* choose — there is no Batta/Mobile-DevTools server in the
  middle. With a **local** provider (OmniRoute/Ollama) prompts and key never leave
  your machine. With a **cloud** provider, the prompt (which for scans/QA can
  include truncated source, manifests, and findings) and the key go to that
  provider, exactly as with any hosted LLM.
