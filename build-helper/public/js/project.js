// Build Helper frontend — Build (Project) view (source design). Renders into #bhbody under the kit
// nav: header (icon + Current + TestFlight), sticky pipeline bar, colored-left-border env cards with
// the outputs matrix, artifacts-on-disk, live log, and build history. Wiring lives in build-wire.js;
// the runner in build-run.js; form helpers in build-form.js.
'use strict';

window.V.project = async function (path) {
  BH.view = 'project'; BH.sel = path; if (window.setShell) setShell('build');
  _body().innerHTML = '<div class="text-slate-400 text-sm">Loading…</div>';
  let data = null, err = '';
  try { const res = await fetch('/api/project?path=' + encodeURIComponent(path)); data = await res.json().catch(() => null); if (!res.ok || !data || !data.app) err = (data && data.error) || ('HTTP ' + res.status); } catch (e) { err = e.message || 'network error'; }
  if (err) { try { localStorage.setItem('bh:lastView', ''); } catch {} toast(`Can't open ${path} — ${err}`, 'err'); return V.dashboard(); }
  try { localStorage.setItem('bh:lastView', path); } catch {}
  CUR = data; renderProject();
};

function renderProject() {
  const a = CUR.app, g = CUR.git, next = CUR.nextBuildNumbers || {};
  const bv = baseVer(a.version), mem = loadMem(a.path);
  const av = { local: true, onedrive: !!CUR.onedriveConnected, testflight: !!(CUR.apple || CUR.globalApple), firebase: !!(CUR.firebaseApp && CUR.firebaseCli), play: !!(CUR.play || CUR.globalPlay) };
  const CONNECT = { onedrive: 'OneDrive not connected — connect it in Settings', testflight: 'No Apple account — add it in App Setup → Apple', firebase: 'No Firebase App ID — set it in App Setup → Firebase', play: 'No Google Play account — add it in App Setup → Google Play' };
  const envItems = (a.envs || []).map((e) => ({ key: e.key || (e.label || '').toLowerCase(), label: e.label || e.key, color: e.color }));
  const curEnv = (a.envs || []).find((e) => e.mode === a.currentMode) || {};
  const curKey = curEnv.key || (curEnv.label || '').toLowerCase() || null;
  _body().innerHTML = `
  <div class="flex items-center gap-3 mb-4">
    ${CUR.hasIcon ? `<img src="/api/icon?path=${encodeURIComponent(a.path)}" class="h-11 w-11 rounded-2xl object-cover ring-1 ring-white/10" alt=""/>` : ''}
    <div class="min-w-0"><div class="font-display text-xl leading-tight truncate">${a.name}</div><div class="text-xs text-slate-500 readout truncate">${a.path}</div></div>
    <button id="appsetup" class="ml-auto btn btn-secondary text-sm">${ICON.gear}App Setup</button>
    <div class="text-right pl-1"><div class="eyebrow" style="color:var(--muted)">Current</div><div class="readout text-sm mt-0.5" style="color:var(--ink)">${a.version || '—'} · ${a.currentMode || '?'}</div></div>
    <div class="text-right pl-1 border-l border-edge"><div class="eyebrow" style="color:var(--muted)">TestFlight</div><div id="tf-latest" class="readout text-sm mt-0.5" style="color:var(--muted)">${av.testflight ? 'checking…' : '<button id="tf-setup" class="underline decoration-dotted" style="color:var(--muted)">Set up</button>'}</div></div>
  </div>
  ${a.needsConfig ? `<div class="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-200 text-sm px-4 py-3 flex items-center gap-2.5"><span style="color:#F5B342">${ICON.warn}</span>This app needs setup — env constant not auto-detected. <button id="setupcta" class="btn text-xs ml-auto" style="background:#F5B342;color:#0A0B0F">Set up</button></div>` : ''}
  <div class="sticky top-14 z-30 -mx-1 mb-4 px-4 py-3 bg-ink/85 backdrop-blur-xl border border-edge rounded-2xl flex items-center gap-3 flex-wrap shadow-card">
    ${envItems.length > 1 ? `<span class="eyebrow">Pipeline</span><div class="flex items-center gap-4 overflow-x-auto">${pipelineHtml(envItems, curKey, false)}</div>` : '<span class="text-xs text-slate-500">Tick an environment below, then Build.</span>'}
    <div class="ml-auto flex items-center gap-2 flex-wrap">
      <label class="text-xs text-slate-400 flex items-center gap-1.5">Branch<select id="branch" class="rounded-lg bg-ink border border-edge px-2.5 py-1.5 text-sm">${(g.branches.length ? g.branches : ['(no git)']).map((b) => `<option ${b === g.current ? 'selected' : ''}>${b}</option>`).join('')}</select></label>
      <button id="analyticslink" class="btn btn-secondary text-xs">${ICON.chart}Analytics</button>
      <details id="advmenu" class="relative"><summary class="btn btn-secondary text-xs cursor-pointer list-none">${ICON.gear}Advanced ▾</summary>
        <div class="absolute right-0 mt-2 z-40 w-64 surface p-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm text-slate-400 shadow-card">
          ${[['clean', 'clean', mem.clean], ['pubget', 'pub get', mem.pubGet], ['committag', 'commit + tag', mem.commitTag], ['push', 'push', mem.push], ['runanalyze', 'analyze', mem.runAnalyze], ['runtest', 'test', mem.runTest]].map(([id, l, on]) => `<label class="flex items-center gap-1.5"><input id="${id}" type="checkbox" class="accent-emerald-500" ${on ? 'checked' : ''}/> ${l}</label>`).join('')}
          <label class="flex items-center gap-1.5 col-span-2"><input id="gatewarn" type="checkbox" class="accent-emerald-500" ${mem.gateWarnOnly ? 'checked' : ''}/> warn only <span class="text-slate-600">(gates warn, don't block)</span></label>
        </div></details>
      <button id="build" class="btn btn-primary px-7">${ICON.rocket}Build</button>
    </div>
  </div>
  <div class="grid lg:grid-cols-3 gap-5">
    <div class="lg:col-span-2 space-y-4">
      ${(a.envs || []).length ? '' : '<div class="rounded-2xl border border-amber-500/40 bg-amber-500/10 text-amber-200 text-sm px-4 py-3">No environments defined for this app. <button id="defenv" class="underline font-semibold">Define them in App Setup</button></div>'}
      ${(a.envs || []).map((e) => envCard(e, next, bv, mem, av, CONNECT, g)).join('')}
      <div class="surface p-5"><div class="flex items-center mb-2"><div class="font-semibold text-sm">Artifacts on disk</div><button id="refreshart" class="ml-auto text-xs rounded border border-edge px-2 py-1 hover:bg-panel">Refresh</button></div><div id="artbrowser" class="space-y-1"></div></div>
    </div>
    <div class="space-y-4">
      <div id="buildsummary" class="space-y-2"></div>
      <div class="surface p-5"><div class="card-head mb-3"><span style="color:var(--iris2)">${ICON.gitBranch}</span><div class="font-semibold text-sm">Live log</div>
        <label class="ml-auto text-xs text-slate-400 flex items-center gap-1.5"><input id="autoscroll" type="checkbox" class="accent-iris" checked/> auto</label>
        <button id="copylog" class="btn btn-secondary text-xs px-2 py-1">Copy</button><button id="dllog" class="btn btn-secondary text-xs px-2 py-1">Save</button></div>
        <div class="rounded-xl border border-edge overflow-hidden" style="background:var(--sunken)"><div class="flex items-center gap-1.5 px-3 py-2 border-b border-edge"><span class="h-2.5 w-2.5 rounded-full" style="background:#F0556A"></span><span class="h-2.5 w-2.5 rounded-full" style="background:#F5B342"></span><span class="h-2.5 w-2.5 rounded-full" style="background:#34C77B"></span><span class="readout text-[10px] text-slate-600 ml-2">build.log</span></div><div id="log" class="log h-80 overflow-auto p-3 text-slate-300">idle.</div></div>
      </div>
      <div class="surface p-5"><div class="flex items-center mb-3"><div class="font-semibold text-sm">Build history</div><label class="ml-auto text-xs text-slate-400 flex items-center gap-1.5 cursor-pointer"><input id="selall" type="checkbox" class="accent-brand"/> Select all</label></div><div id="history" class="space-y-2 max-h-96 overflow-auto"></div></div>
    </div>
  </div>`;
  wireProject(a, g, av);
}
