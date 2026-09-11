// ---------- shared SETTINGS modal (build-helper-style Setup: tiles · connectors · notifications · profile & access · AI  +  Activity) ----------
let KIT_SET_OPTS = {}, KIT_CONN_DEFS = [];
function teamButtonHtml() { return ''; }   // deprecated — settings are folded into the gear (openSettings)
// opts: { aiUrl? } — pass a tool's AI config endpoint to show the AI section.
function openSettings(opts = {}) {
  KIT_SET_OPTS = opts || {};
  const extra = opts.extraTabs || [];
  const tabs = [...extra.map((t) => ({ id: t.id, label: t.label })), { id: 'setup', label: 'Setup' }, { id: 'activity', label: 'Activity' }];
  const active = opts.active || tabs[0].id;
  const body = openModal({ title: 'Settings', subtitle: 'This tool + your team', tabs, active, onTab: (t) => settingsTab(t, body), size: opts.size || '760px' });
  settingsTab(active, body);
}
const openTeam = openSettings;   // back-compat
function settingsTab(tab, body) {
  const extra = (KIT_SET_OPTS.extraTabs || []).find((t) => t.id === tab);
  if (extra) return extra.render(body);
  if (tab === 'activity') { body.innerHTML = '<div class="text-slate-500 text-sm">Loading…</div>'; return renderTeamActivity(body); }
  const opts = KIT_SET_OPTS;
  body.innerHTML = `
    <div id="set-tiles" class="mb-5"></div>
    <div class="eyebrow mb-2" id="sec-connectors" data-cap="connectors">Connectors</div><div id="set-connectors" class="space-y-3 mb-6" data-cap="connectors"></div>
    <div class="eyebrow mb-2" id="sec-notify" data-cap="share">Notifications</div><div id="set-notify" class="mb-6" data-cap="share"></div>
    <div class="eyebrow mb-2" id="sec-profile">Profile &amp; access</div><div id="set-profile" class="mb-6"></div>
    ${opts.aiUrl ? `<div class="eyebrow mb-2" id="sec-ai" data-cap="ai">AI</div><div id="set-ai" data-cap="ai"></div>` : ''}`;
  settingsTiles(el('#set-tiles'));
  if (el('#set-connectors')) settingsConnectors(el('#set-connectors'));
  if (el('#set-notify')) renderTeamNotify(el('#set-notify'));
  renderTeamProfile(el('#set-profile'));
  if (opts.aiUrl && el('#set-ai')) settingsAi(el('#set-ai'), opts.aiUrl);
  applyCaps(body); kitLoadMe().then(() => applyCaps(body));   // drop the sections this member can't use (re-apply once identity loads)
}
async function settingsTiles(box) {
  const opts = KIT_SET_OPTS;
  const [conn, notif] = await Promise.all([
    fetch('/api/connectors').then(r => r.json()).catch(() => ({ configured: [] })),
    fetch('/api/team/notify').then(r => r.json()).catch(() => ({})),
  ]);
  const ai = opts.aiUrl ? await fetch(opts.aiUrl).then(r => r.json()).catch(() => ({})) : null;
  const tile = (icon, label, val, ok, jump) => `<button class="surface p-3 flex items-center gap-3 text-left set-jump" data-jump="${jump}">
    <span class="icon-tile shrink-0">${icon}</span>
    <div class="min-w-0"><div class="text-[10px] uppercase tracking-wider text-slate-500">${label}</div><div class="text-sm truncate">${esc(val)}</div></div>
    <span class="ml-auto shrink-0">${pill(ok)}</span></button>`;
  const nConn = (conn.configured || []).length;
  box.innerHTML = `<div class="grid sm:grid-cols-2 gap-2">
    ${tile(ICON.plug, 'Connectors', nConn ? nConn + ' connected' : 'none', nConn > 0, 'sec-connectors')}
    ${tile(ICON.bell, 'Notifications', notif.configured ? 'on' : 'off', !!notif.configured, 'sec-notify')}
    ${tile(ICON.users, 'Profile', 'local', true, 'sec-profile')}
    ${opts.aiUrl ? tile(ICON.gear, 'AI', ai && ai.hasKey ? 'configured' : 'not set', !!(ai && ai.hasKey), 'sec-ai') : ''}
  </div>`;
  box.querySelectorAll('.set-jump').forEach(b => b.onclick = () => { const t = el('#' + b.dataset.jump); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
}
async function settingsConnectors(box) {
  let data; try { data = await fetch('/api/connectors').then(r => r.json()); } catch { data = { defs: [], values: {}, configured: [] }; }
  const { defs = [], values = {}, configured = [] } = data;
  KIT_CONN_DEFS = defs;
  box.innerHTML = defs.map(d => {
    const cv = values[d.id] || {}, on = configured.includes(d.id);
    const fields = d.fields.map(([name, label]) => { const secret = name === 'token'; const val = secret ? '' : esc(cv[name] || ''); const ph = secret && cv._hasToken ? '•••••• saved — blank keeps it' : ''; return `<label class="block"><span class="text-[11px] text-slate-500">${esc(label)}</span><input id="c-${d.id}-${name}" ${secret ? 'type="password"' : ''} value="${val}" placeholder="${ph}" class="field w-full font-mono text-sm mt-1"/></label>`; }).join('');
    const bodyH = `<div class="grid sm:grid-cols-2 gap-2">${fields}</div>
      <div class="flex items-center gap-2 mt-3"><button class="btn btn-primary text-sm c-save" data-cid="${d.id}">${ICON.check}Save</button><button class="btn btn-secondary text-sm c-test" data-cid="${d.id}">Test</button>${on ? `<button class="btn btn-ghost text-sm ml-auto text-rose-300 c-disc" data-cid="${d.id}">Disconnect</button>` : ''}</div>
      <div id="c-log-${d.id}" class="log mt-2 hidden max-h-24 overflow-auto rounded p-2 text-slate-300 border border-edge text-[11px]" style="background:var(--sunken)"></div>`;
    const meta = CONNECTORS[d.id] || { name: d.label, logo: '', blurb: d.authHint };
    return connectorCard(meta, on, bodyH, { id: d.id, open: false });
  }).join('') || '<div class="text-sm text-slate-500">No connectors available.</div>';
  wireConnectorsIn();
}
function connSaveBody(cid) { const def = KIT_CONN_DEFS.find(d => d.id === cid); const b = { id: cid }; (def && def.fields || []).forEach(([n]) => { const e = el(`#c-${cid}-${n}`); const v = e && e.value.trim(); if (v) b[n] = v; }); return b; }
function wireConnectorsIn() {
  const refresh = () => { settingsConnectors(el('#set-connectors')); settingsTiles(el('#set-tiles')); };
  document.querySelectorAll('.c-save').forEach(btn => btn.onclick = async () => { const r = await postJson('/api/connectors/save', connSaveBody(btn.dataset.cid)); if (r.error) toast(r.error, 'err'); else { toast(r.cleared ? 'Removed' : 'Saved', 'ok'); refresh(); } });
  document.querySelectorAll('.c-test').forEach(btn => btn.onclick = async () => { const log = el('#c-log-' + btn.dataset.cid); log.classList.remove('hidden'); log.textContent = 'Testing…'; const r = await fetch('/api/connectors/test?id=' + encodeURIComponent(btn.dataset.cid)).then(x => x.json()); log.textContent = r.ok ? '✓ ' + (r.out || 'connected') : '✖ ' + (r.error || 'failed — check the values and Save first'); });
  document.querySelectorAll('.c-disc').forEach(btn => btn.onclick = async () => { if (!confirm('Disconnect ' + btn.dataset.cid + '? Removes its saved credentials for every tool.')) return; const r = await postJson('/api/connectors/save', { id: btn.dataset.cid }); if (r.error) toast(r.error, 'err'); else { toast('Disconnected', 'ok'); refresh(); } });
}
async function settingsAi(box, aiUrl) {
  const cfg = await fetch(aiUrl).then(r => r.json()).catch(() => ({}));
  const presets = cfg.presets;
  if (!presets) {   // legacy key+model form (tools without provider presets)
    box.innerHTML = `<div class="surface p-5 space-y-3 text-sm">
      <div class="text-slate-400 text-xs">Key is stored locally (this tool's data dir), never in a repo, never returned to the browser. Blank keeps the current key.</div>
      <div><div class="text-[11px] text-slate-500 mb-1">API key ${cfg.hasKey ? '<span class="text-emerald-400">· configured</span>' : '<span class="text-slate-500">· not set</span>'}</div><input id="ai-key" type="password" class="field text-xs w-full font-mono" placeholder="sk-…"/></div>
      <div><div class="text-[11px] text-slate-500 mb-1">Model</div><input id="ai-model" class="field text-xs w-full font-mono" value="${esc(cfg.aiModel || '')}"/></div>
      <button id="ai-save-cfg" class="btn btn-primary text-sm">${ICON.check}Save</button></div>`;
    el('#ai-save-cfg').onclick = async () => { const patch = { aiModel: el('#ai-model').value.trim() }; const k = el('#ai-key').value.trim(); if (k) patch.anthropicApiKey = k; await postJson(aiUrl, patch); toast('AI settings saved', 'ok'); settingsTiles(el('#set-tiles')); };
    return;
  }
  const provOpts = Object.entries(presets).map(([id, p]) => `<option value="${id}" ${cfg.aiProvider === id ? 'selected' : ''}>${esc(p.label)}</option>`).join('');
  box.innerHTML = `<div class="surface p-5 space-y-3 text-sm">
    <div class="text-slate-400 text-xs">Routes through any OpenAI-compatible provider (OmniRoute, OpenAI, Groq, OpenRouter, Ollama) or Anthropic. Token is stored locally (this tool's data dir), never in a repo, never returned to the browser. Blank keeps the current token.</div>
    <div class="grid sm:grid-cols-2 gap-2">
      <label class="block"><span class="text-[11px] text-slate-500">Provider</span><select id="ai-provider" class="field text-sm w-full mt-1">${provOpts}</select></label>
      <label class="block"><span class="text-[11px] text-slate-500">Model</span><input id="ai-model" class="field text-sm w-full font-mono mt-1" value="${esc(cfg.aiModel || '')}"/></label>
    </div>
    <label class="block"><span class="text-[11px] text-slate-500">Base URL</span><input id="ai-baseurl" class="field text-sm w-full font-mono mt-1" value="${esc(cfg.aiBaseUrl || '')}" placeholder="http://localhost:20128/v1"/></label>
    <label class="block"><span class="text-[11px] text-slate-500">API token ${cfg.hasKey ? '<span class="text-emerald-400">· configured</span>' : '<span class="text-slate-500">· not set (local providers may not need one)</span>'}</span><input id="ai-key" type="password" class="field text-sm w-full font-mono mt-1" placeholder="paste token — blank keeps current"/></label>
    <div class="flex gap-2"><button id="ai-save-cfg" class="btn btn-primary text-sm">${ICON.check}Save</button><button id="ai-test" class="btn btn-secondary text-sm">Test</button><span id="ai-test-log" class="text-[11px] text-slate-400 self-center"></span></div>
  </div>`;
  const prov = el('#ai-provider');
  prov.onchange = () => { const p = presets[prov.value]; if (p && prov.value !== 'custom') { el('#ai-baseurl').value = p.baseUrl; el('#ai-model').value = p.model; } };
  const patchFrom = () => { const patch = { aiProvider: prov.value, aiBaseUrl: el('#ai-baseurl').value.trim(), aiModel: el('#ai-model').value.trim() }; const k = el('#ai-key').value.trim(); if (k) patch.aiApiKey = k; return patch; };
  el('#ai-save-cfg').onclick = async () => { await postJson(aiUrl, patchFrom()); toast('AI settings saved', 'ok'); settingsTiles(el('#set-tiles')); };
  el('#ai-test').onclick = async () => {
    const log = el('#ai-test-log'); log.textContent = 'Testing…';
    await postJson(aiUrl, patchFrom());   // persist current form values, then test them
    const r = await postJson(aiUrl + '/test', {}).catch(() => ({ ok: false, error: 'request failed' }));
    log.textContent = r.ok ? `✓ ${r.model || 'connected'} replied "${(r.reply || '').slice(0, 24)}"` : '✖ ' + (r.error || 'failed');
  };
}
