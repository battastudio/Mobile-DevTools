'use strict';
// Shared, opt-in AI helper for any tool. OpenAI-compatible by default (OmniRoute/OpenAI/Groq/
// OpenRouter/Ollama) + Anthropic as one provider. Key lives in the tool's data dir
// (~/.mobile-devtools/<id>/config.json) or ANTHROPIC_API_KEY; never in a repo, never returned to the
// browser. Stdlib http/https only — no dependencies.
const https = require('https');
const http = require('http');
const { URL } = require('url');
const path = require('path');
const { dataDir, readJson, writeJson } = require('./store');

// provider -> { label, baseUrl, model, kind }. kind 'openai' = /chat/completions, 'anthropic' = /v1/messages.
const AI_PRESETS = {
  omniroute: { label: 'OmniRoute (local)', baseUrl: 'http://localhost:20128/v1', model: 'auto/best-free', kind: 'openai' },
  openai: { label: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini', kind: 'openai' },
  groq: { label: 'Groq', baseUrl: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile', kind: 'openai' },
  openrouter: { label: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1', model: 'openai/gpt-4o-mini', kind: 'openai' },
  ollama: { label: 'Ollama (local)', baseUrl: 'http://localhost:11434/v1', model: 'llama3.1', kind: 'openai' },
  anthropic: { label: 'Anthropic (Claude)', baseUrl: 'https://api.anthropic.com', model: 'claude-sonnet-4-5', kind: 'anthropic' },
  custom: { label: 'Custom (OpenAI-compatible)', baseUrl: '', model: '', kind: 'openai' },
};
const DEFAULT_PROVIDER = 'omniroute';

const cfgFile = (toolId) => path.join(dataDir(toolId), 'config.json');
const readCfg = (toolId) => readJson(cfgFile(toolId), {});
// Merge the stored config over the chosen preset's defaults.
function resolve(toolId) {
  const c = readCfg(toolId);
  const provider = c.aiProvider || DEFAULT_PROVIDER;
  const preset = AI_PRESETS[provider] || AI_PRESETS.custom;
  const key = c.aiApiKey || c.anthropicApiKey || process.env.ANTHROPIC_API_KEY || '';
  return { provider, kind: preset.kind, baseUrl: (c.aiBaseUrl || preset.baseUrl || '').trim(), model: (c.aiModel || preset.model || '').trim(), key };
}
function aiConfig(toolId) {
  const r = resolve(toolId);
  return { hasKey: !!r.key, aiProvider: r.provider, aiBaseUrl: r.baseUrl, aiModel: r.model, presets: AI_PRESETS };
}
function setAiConfig(toolId, patch = {}) {
  const c = readCfg(toolId);
  if (patch.aiProvider) c.aiProvider = patch.aiProvider;
  if (patch.aiBaseUrl !== undefined) c.aiBaseUrl = patch.aiBaseUrl;
  if (patch.aiModel !== undefined) c.aiModel = patch.aiModel;
  // Blank key keeps the stored one. Accept either field name; store under aiApiKey.
  const k = patch.aiApiKey !== undefined ? patch.aiApiKey : patch.anthropicApiKey;
  if (k) c.aiApiKey = k;
  writeJson(cfgFile(toolId), c);
  return aiConfig(toolId);
}

// POST JSON to a URL (http or https by scheme), resolve the raw body string.
function postJson(urlStr, headers, payload) {
  return new Promise((resolve, reject) => {
    let u; try { u = new URL(urlStr); } catch { return reject(new Error('Bad AI base URL: ' + urlStr)); }
    const mod = u.protocol === 'http:' ? http : https;
    const req = mod.request(urlStr, { method: 'POST', headers: { ...headers, 'content-length': Buffer.byteLength(payload) }, timeout: 120000 }, (res) => {
      let b = ''; res.on('data', (c) => (b += c));
      res.on('end', () => resolve(b));
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('AI request timed out')); });
    req.on('error', reject);
    req.end(payload);
  });
}

// Unified caller. opts: { system, maxTokens, temperature }. Returns { text, model }.
async function callAI(toolId, prompt, opts = {}) {
  const { kind, baseUrl, model, key } = resolve(toolId);
  const maxTokens = opts.maxTokens || 2000;
  if (!baseUrl) throw new Error('No AI endpoint configured (Settings → AI).');

  if (kind === 'anthropic') {
    if (!key) throw new Error('No Anthropic API key configured (Settings → AI, or ANTHROPIC_API_KEY).');
    const payload = JSON.stringify({ model, max_tokens: maxTokens, ...(opts.system ? { system: opts.system } : {}), messages: [{ role: 'user', content: prompt }] });
    const b = await postJson(baseUrl.replace(/\/$/, '') + '/v1/messages', { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' }, payload);
    let j; try { j = JSON.parse(b); } catch { throw new Error('Bad API response: ' + b.slice(0, 160)); }
    if (j.error) throw new Error(j.error.message || 'API error');
    return { text: (j.content || []).filter((x) => x.type === 'text').map((x) => x.text).join('\n'), model };
  }

  // OpenAI-compatible
  const messages = [...(opts.system ? [{ role: 'system', content: opts.system }] : []), { role: 'user', content: prompt }];
  const payload = JSON.stringify({ model, messages, temperature: opts.temperature ?? 0.7, max_tokens: maxTokens });
  const headers = { 'content-type': 'application/json', ...(key ? { authorization: 'Bearer ' + key } : {}) };
  const b = await postJson(baseUrl.replace(/\/$/, '') + '/chat/completions', headers, payload);
  return parseOpenAI(b, model);
}
// Handle both a single JSON completion and an SSE stream (OmniRoute streams by default).
function parseOpenAI(b, model) {
  const t = (b || '').trim();
  if (t.startsWith('{')) {
    let j; try { j = JSON.parse(t); } catch { throw new Error('Bad API response: ' + t.slice(0, 160)); }
    if (j.error) throw new Error(j.error.message || j.error || 'API error');
    return { text: (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content || '').trim(), model: j.model || model };
  }
  let text = '', mdl = model, saw = false;
  for (const line of t.split('\n')) {
    const s = line.trim(); if (!s.startsWith('data:')) continue;
    const p = s.slice(5).trim(); if (p === '[DONE]') break;
    let j; try { j = JSON.parse(p); } catch { continue; }
    if (j.error) throw new Error(j.error.message || 'API error');
    if (j.model) mdl = j.model;
    const ch = j.choices && j.choices[0];
    if (ch) { text += (ch.delta && ch.delta.content) || (ch.message && ch.message.content) || ''; saw = true; }
  }
  if (!saw) throw new Error('Bad API response: ' + t.slice(0, 160));
  return { text: text.trim(), model: mdl };
}
// Back-compat: existing callers use callClaude(toolId, prompt, maxTokens).
const callClaude = (toolId, prompt, maxTokens = 2000) => callAI(toolId, prompt, { maxTokens });

async function testAI(toolId) {
  try {
    const { text, model } = await callAI(toolId, 'Reply with exactly: ok', { system: 'You are a health check.', maxTokens: 20 });
    return { ok: true, model, reply: (text || '').slice(0, 40) };
  } catch (e) { return { ok: false, error: e.message }; }
}

module.exports = { aiConfig, setAiConfig, callAI, callClaude, testAI, AI_PRESETS };
