// Build Helper frontend — Dashboard view (window.V.dashboard). KPIs + range/project/env filters +
// hand-rolled charts + the project-sources manager + the sortable/draggable health table. Loaded
// after views.js (reuses _body/_skel) and charts.js/health-table.js.
'use strict';

const _F = () => (BH.filter = BH.filter || { range: '30', project: '', env: '', search: '' });
const _cutoff = (r) => (r && +r ? Date.now() - +r * 864e5 : 0);
function _filteredBuilds() {
  const f = _F(), c = _cutoff(f.range);
  return (BH.builds || []).filter((b) => (!c || +new Date(b.time) >= c) && (!f.project || b.path === f.project) && (!f.env || b.env === f.env));
}

window.V.dashboard = async function () {
  BH.view = 'dashboard'; if (window.setShell) setShell('dashboard');
  _body().innerHTML = _skel(6);
  const [d, suggest, grades] = await Promise.all([
    API.dashboard().catch(() => ({ projects: [], builds: [], storage: {}, sources: {} })),
    API.suggestRoots(), API.securityGrades(),
  ]);
  BH.projects = (d.projects || []).map((p) => ({ ...p, grade: grades[p.path] || null }));
  BH.builds = d.builds || []; BH.storage = d.storage || {}; BH.running = d.running || {};
  BH.sources = d.sources || { roots: [], pinned: [], recursive: false };
  const f = _F(); const envs = [...new Set(BH.builds.map((b) => b.env).filter(Boolean))];
  const opt = (v, l, sel) => `<option value="${esc(v)}" ${sel === v ? 'selected' : ''}>${esc(l)}</option>`;
  _body().innerHTML = `
    <div id="bh-kpis" data-tour="kpis"></div>
    <div class="surface p-4 mb-4" data-tour="filters">
      <div class="flex flex-wrap items-end gap-3 mb-3">
        <label class="block"><span class="text-[11px] text-slate-500">Range</span><select id="f-range" class="field text-sm mt-1">${['7:7 days', '30:30 days', '90:90 days', '0:All time'].map((o) => opt(o.split(':')[0], o.split(':')[1], f.range)).join('')}</select></label>
        <label class="block"><span class="text-[11px] text-slate-500">Project</span><select id="f-project" class="field text-sm mt-1">${opt('', 'All', f.project)}${BH.projects.map((p) => opt(p.path, p.name, f.project)).join('')}</select></label>
        <label class="block"><span class="text-[11px] text-slate-500">Env</span><select id="f-env" class="field text-sm mt-1">${opt('', 'All', f.env)}${envs.map((e) => opt(e, e, f.env)).join('')}</select></label>
        <button id="f-density" class="btn btn-ghost text-xs px-2 py-1 ml-auto">${HT.density() === 'compact' ? 'Comfortable' : 'Compact'}</button>
      </div>
      <div id="bh-charts" class="grid sm:grid-cols-2 gap-4"></div>
    </div>
    ${C.sourcesPanel(BH, suggest)}
    <div class="flex items-center gap-2 mb-3">
      <div class="eyebrow" data-tour="projects">Projects</div>
      <input id="bh-search" class="field text-[12px] py-1 px-2" style="width:min(260px,50vw)" placeholder="Search projects…" spellcheck="false" value="${esc(f.search)}"/>
      <span id="bh-count" class="text-[11px] text-slate-500"></span>
      <button id="bh-refresh" class="btn btn-ghost text-xs px-2 py-1 ml-auto">${ICON.refresh}Refresh</button>
    </div>
    <div id="bh-table"></div>`;
  renderStats(); renderTable(); wireSources();
  const onFilter = (k) => (e) => { _F()[k] = e.target.value; renderStats(); if (k === 'project') renderTable(); };
  el('#f-range').onchange = onFilter('range'); el('#f-project').onchange = onFilter('project'); el('#f-env').onchange = onFilter('env');
  el('#bh-search').oninput = (e) => { _F().search = e.target.value; renderTable(); };
  el('#f-density').onclick = () => { localStorage.setItem('bh-density', HT.density() === 'compact' ? 'comfortable' : 'compact'); V.dashboard(); };
  el('#bh-refresh').onclick = () => V.dashboard();
  if (window.tourPrompt && BH.projects.length) tourPrompt('bh-tour-dashboard', 'the dashboard', () => startTourFor('dashboard'));
};

// KPI tiles + charts, recomputed from the current filter.
function renderStats() {
  const b = _filteredBuilds();
  const k = el('#bh-kpis'); if (k) k.innerHTML = C.kpis({ builds: b, projects: BH.projects, storage: BH.storage });
  const box = el('#bh-charts'); if (!box) return;
  const panel = (label, svg) => `<div><div class="eyebrow mb-1">${label}</div>${svg}</div>`;
  const days = +(_F().range) >= 90 || +(_F().range) === 0 ? 30 : 14;
  box.innerHTML = panel('Builds over time', CH.stackedColumns(b, days)) +
    panel('Build duration', CH.line(b, days)) + panel('Upload health', CH.hbars(b)) + panel('By environment', CH.envSplit(b));
}

// The health table, filtered by search + the project dropdown.
function renderTable() {
  const f = _F(), s = (f.search || '').trim().toLowerCase();
  let list = BH.projects;
  if (f.project) list = list.filter((p) => p.path === f.project);
  if (s) list = list.filter((p) => (p.name + ' ' + p.path).toLowerCase().includes(s));
  const cnt = el('#bh-count'); if (cnt) cnt.textContent = s || f.project ? `${list.length} of ${BH.projects.length}` : `${BH.projects.length} app${BH.projects.length === 1 ? '' : 's'}`;
  HT.render(el('#bh-table'), list, {
    open: (p) => V.project(p),
    setup: (p) => (window.openAppSetup ? openAppSetup(p) : V.project(p)),
    reveal: (p) => API.reveal(p),
    favorite: (p, fav) => API.post('/api/app/favorite', { path: p, favorite: fav }).then(() => V.dashboard()),
    reorder: (paths) => API.post('/api/app/order', { paths }).then(() => toast('Order saved', 'ok')),
  });
}

// Wire the sources panel: add/remove roots & pinned, recursive toggle, suggestions, reveal.
function wireSources() {
  const save = async () => {
    const r = await API.saveSources(BH.sources).catch(() => null);
    if (!r) return toast('Could not save sources', 'err');
    BH.sources = r.sources; (r.invalid || []).forEach((i) => toast(`Skipped ${i.path} — ${i.reason}`, 'err')); V.dashboard();
  };
  const add = (inputId, key) => { const v = el('#' + inputId).value.trim(); if (v) { BH.sources[key] = [...BH.sources[key], v]; save(); } };
  el('#bh-addroot').onclick = () => add('bh-add-root', 'roots');
  el('#bh-add-root').onkeydown = (e) => { if (e.key === 'Enter') add('bh-add-root', 'roots'); };
  el('#bh-addpin').onclick = () => add('bh-add-pin', 'pinned');
  el('#bh-add-pin').onkeydown = (e) => { if (e.key === 'Enter') add('bh-add-pin', 'pinned'); };
  el('#bh-recursive').onchange = (e) => { BH.sources.recursive = e.target.checked; save(); };
  _body().querySelectorAll('[data-rm]').forEach((b) => b.onclick = () => { const key = b.dataset.kind === 'pinned' ? 'pinned' : 'roots'; BH.sources[key] = BH.sources[key].filter((x) => x !== b.dataset.rm); save(); });
  _body().querySelectorAll('[data-suggest]').forEach((b) => b.onclick = () => { BH.sources.roots = [...new Set([...BH.sources.roots, b.dataset.suggest])]; save(); });
  _body().querySelectorAll('[data-reveal]').forEach((b) => b.onclick = (e) => { e.stopPropagation(); API.reveal(b.dataset.reveal); });
}
