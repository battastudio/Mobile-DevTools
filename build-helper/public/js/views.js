// Build Helper frontend — Dashboard + Reports views. Each attaches to window.V and renders into the
// persistent #bhbody that Vue owns (see app.js). Imperative render-then-wire, matching the sibling
// tools' pattern; keeps every view file small and independent.
'use strict';

const _body = () => el('#bhbody');
const _skel = (n = 4) => `<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">${Array.from({ length: n }, () => '<div class="surface p-4" style="height:118px;opacity:.5"></div>').join('')}</div>`;

window.V.dashboard = async function () {
  BH.view = 'dashboard'; if (window.setShell) setShell('dashboard');
  _body().innerHTML = _skel(6);
  const [d, suggest] = await Promise.all([
    API.dashboard().catch(() => ({ projects: [], builds: [], storage: {}, sources: {} })),
    API.suggestRoots(),
  ]);
  BH.projects = d.projects || []; BH.builds = d.builds || []; BH.storage = d.storage || {}; BH.running = d.running || {};
  BH.sources = d.sources || { roots: [], pinned: [], recursive: false };
  _body().innerHTML = `
    ${C.kpis(d)}
    ${C.sourcesPanel(BH, suggest)}
    <div class="flex items-center gap-2 mb-3">
      <div class="eyebrow">Projects</div>
      <input id="bh-search" class="field text-[12px] py-1 px-2" style="width:min(260px,50vw)" placeholder="Search projects…" spellcheck="false"/>
      <span id="bh-count" class="text-[11px] text-slate-500"></span>
      <button id="bh-refresh" class="btn btn-ghost text-xs px-2 py-1 ml-auto">${ICON.refresh}Refresh</button>
    </div>
    <div id="bh-grid"></div>`;
  wireSources();
  renderGrid('');
  el('#bh-search').oninput = (e) => renderGrid(e.target.value);
  el('#bh-refresh').onclick = () => V.dashboard();
};

// Filter the project grid client-side by name/path; (re)wire card open + reveal after each render.
function renderGrid(q) {
  const s = (q || '').trim().toLowerCase();
  const list = s ? BH.projects.filter((p) => (p.name + ' ' + p.path).toLowerCase().includes(s)) : BH.projects;
  el('#bh-count').textContent = s ? `${list.length} of ${BH.projects.length}` : `${BH.projects.length} app${BH.projects.length === 1 ? '' : 's'}`;
  el('#bh-grid').innerHTML = list.length
    ? `<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">${list.map(C.projectCard).join('')}</div>`
    : `<div class="surface p-6 text-sm text-slate-400">${BH.projects.length ? 'No projects match your search.' : 'No Flutter apps found. Add a scan root or pin a project in <b>Project sources</b> above.'}</div>`;
  el('#bh-grid').querySelectorAll('[data-open]').forEach((b) => b.onclick = () => V.project(b.dataset.open));
  el('#bh-grid').querySelectorAll('[data-reveal]').forEach((b) => b.onclick = (e) => { e.stopPropagation(); API.reveal(b.dataset.reveal); });
}

// Wire the sources panel: add/remove roots & pinned, recursive toggle, suggestions, reveal.
function wireSources() {
  const save = async () => {
    const r = await API.saveSources(BH.sources).catch(() => null);
    if (!r) return toast('Could not save sources', 'err');
    BH.sources = r.sources; (r.invalid || []).forEach((i) => toast(`Skipped ${i.path} — ${i.reason}`, 'err'));
    V.dashboard();
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

window.V.reports = async function () {
  BH.view = 'reports'; if (window.setShell) setShell('reports');
  const b = BH.builds.length ? BH.builds : (await API.dashboard().catch(() => ({ builds: [] }))).builds || [];
  BH.builds = b;
  const envs = [...new Set(b.map((x) => x.env).filter(Boolean))];
  _body().innerHTML = `
    <div class="eyebrow mb-3">Build reports</div>
    <div class="surface p-4 mb-4 flex flex-wrap items-end gap-3">
      <label class="block"><span class="text-[11px] text-slate-500">Range</span>
        <select id="rp-range" class="field text-sm mt-1"><option value="0">All time</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select></label>
      <label class="block"><span class="text-[11px] text-slate-500">Env</span>
        <select id="rp-env" class="field text-sm mt-1"><option value="">All</option>${envs.map((e) => `<option>${esc(e)}</option>`).join('')}</select></label>
      <div class="ml-auto flex gap-2">
        <a id="rp-csv" class="btn btn-secondary text-sm" href="#" target="_blank">${ICON.fileText}CSV</a>
        <a id="rp-html" class="btn btn-primary text-sm" href="#" target="_blank">${ICON.fileText}Print / PDF</a>
      </div>
    </div>
    <div id="rp-list" class="space-y-2"></div>`;
  const sync = () => {
    const f = { range: el('#rp-range').value, env: el('#rp-env').value };
    el('#rp-csv').href = API.reportUrl('csv', f);
    el('#rp-html').href = API.reportUrl('html', f);
    const cutoff = f.range ? Date.now() - f.range * 864e5 : 0;
    const rows = b.filter((x) => (!cutoff || new Date(x.time).getTime() >= cutoff) && (!f.env || x.env === f.env));
    el('#rp-list').innerHTML = rows.length ? rows.slice(0, 100).map(C.buildRow).join('') : '<div class="surface p-5 text-sm text-slate-400">No builds match.</div>';
  };
  el('#rp-range').onchange = sync; el('#rp-env').onchange = sync; sync();
};
