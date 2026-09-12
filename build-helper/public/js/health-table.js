// Build Helper frontend — the Project-health table body (source design). Renders rows into
// #healthbody: drag handle · ★ favorite · health dot · app icon (/api/icon, monogram fallback) ·
// name · version · env · last build · status · builds · security grade · Set up / Open. Sortable,
// drag-to-reorder (when unsorted/unfiltered), density-aware. Reads the DASH state from dashboard.js.
'use strict';

const DEN = {
  compact: { pad: 'py-1', icon: 'h-4 w-4', av: 'text-[7px]', text: 'text-[11px]' },
  comfortable: { pad: 'py-1.5', icon: 'h-5 w-5', av: 'text-[8px]', text: 'text-xs' },
  large: { pad: 'py-2.5', icon: 'h-8 w-8', av: 'text-xs', text: 'text-sm' },
};
let DRAG = null;

function renderHealth() {
  const body = el('#healthbody'); if (!body || !DASH.data) return;
  let rows = DASH.data.projects.slice();
  if (DASH.search) rows = rows.filter((p) => p.name.toLowerCase().includes(DASH.search));
  if (DASH.favOnly) rows = rows.filter((p) => p.favorite);
  const { key, dir } = DASH.sort;
  rows.sort((a, b) => {
    let av, bv;
    if (key === 'last') { av = a.lastBuild ? new Date(a.lastBuild.time) : 0; bv = b.lastBuild ? new Date(b.lastBuild.time) : 0; }
    else if (key === 'buildCount') { av = a.buildCount; bv = b.buildCount; }
    else if (key === 'env') { av = a.lastBuild?.env || ''; bv = b.lastBuild?.env || ''; }
    else if (key === 'version') { av = a.version || ''; bv = b.version || ''; }
    else if (key === 'name') { av = a.name; bv = b.name; }
    else return (b.favorite - a.favorite) || 0;
    return (av < bv ? -1 : av > bv ? 1 : 0) * dir;
  });
  const D = DEN[DASH.density] || DEN.comfortable;
  const dragOn = key === '' && !DASH.search;
  const tbl = document.querySelector('table.health'); if (tbl) tbl.className = 'health w-full ' + D.text;
  const secByPath = Object.fromEntries(((DASH.sec && DASH.sec.apps) || []).map((a) => [a.path, a.grade]));
  body.innerHTML = rows.map((p) => {
    const lb = p.lastBuild, c = ENV_COLOR[lb?.env] || 'slate';
    const ic = p.hasIcon ? `<img src="/api/icon?path=${encodeURIComponent(p.path)}" class="${D.icon} rounded object-cover"/>` : `<div class="${D.icon} rounded bg-slate-700 grid place-items-center ${D.av} font-bold">${esc(p.name.slice(0, 2).toUpperCase())}</div>`;
    const status = lb ? (lb.buildOk ? '<span class="status ok">ok</span>' : '<span class="status fail">failed</span>') : '<span class="text-slate-500">—</span>';
    const hdot = `<span class="inline-block h-2 w-2 rounded-full ${p.healthOk ? 'bg-emerald-400' : 'bg-rose-400'}" title="${p.healthOk ? 'release-ready' : 'needs setup (env/signing)'}"></span>`;
    const cta = p.needsConfig || !p.healthOk ? `<button class="setup text-amber-300 hover:text-amber-200 font-medium inline-flex items-center gap-1" data-p="${esc(p.path)}"><span style="display:inline-flex;width:14px;height:14px">${ICON.gear}</span>Set up</button>` : '<span class="font-medium" style="color:var(--brand2)">Open ▸</span>';
    const handle = dragOn ? '<span class="draghandle cursor-move text-slate-400 select-none mr-1" title="Drag to reorder">⠿</span>' : '';
    const g = secByPath[p.path];
    const gcell = g ? `<span class="secgrade inline-grid place-items-center h-6 w-6 rounded-md bg-${_gcol(g.letter)}-500/15 text-${_gcol(g.letter)}-300 font-display font-bold text-xs cursor-pointer" data-p="${esc(p.path)}" title="${g.score}/100 · ${g.counts.fail || 0} failing · click to view">${g.letter}</span>` : `<button class="secgrade text-slate-500 hover:text-slate-300 text-[11px] underline decoration-dotted" data-p="${esc(p.path)}" title="Not scanned — open Security to scan">scan</button>`;
    return `<tr class="border-t border-edge/50" data-open="${esc(p.path)}"${dragOn ? ' draggable="true"' : ''}>
      <td class="${D.pad} pr-2 whitespace-nowrap">${handle}<button class="fav ${p.favorite ? 'text-amber-300' : 'text-slate-400'}" data-p="${esc(p.path)}" data-f="${p.favorite ? 0 : 1}">★</button></td>
      <td class="${D.pad} pr-3 cursor-pointer"><div class="flex items-center gap-2">${hdot}${ic}<span class="font-medium">${esc(p.name)}</span></div></td>
      <td class="${D.pad} pr-3 font-mono tnum text-slate-300 cursor-pointer">${esc(p.version || '—')}</td>
      <td class="${D.pad} pr-3 cursor-pointer">${lb ? badge(lb.env.toUpperCase(), c) : '<span class="text-slate-400">—</span>'}</td>
      <td class="${D.pad} pr-3 text-slate-400 cursor-pointer">${lb ? relTime(lb.time) : 'never'}</td>
      <td class="${D.pad} pr-3 cursor-pointer">${status}</td>
      <td class="${D.pad} pr-3 tnum text-slate-300 cursor-pointer">${p.buildCount}</td>
      <td class="${D.pad} pr-3">${gcell}</td>
      <td class="${D.pad} text-right">${cta}</td></tr>`;
  }).join('') || '<tr><td colspan="9" class="py-3 text-slate-500">No projects.</td></tr>';
  body.querySelectorAll('td.cursor-pointer').forEach((td) => td.onclick = () => openProject(td.closest('[data-open]').dataset.open));
  body.querySelectorAll('.secgrade').forEach((g) => g.onclick = (e) => { e.stopPropagation(); showSecurity(g.dataset.p); });
  body.querySelectorAll('.setup').forEach((b) => b.onclick = (e) => { e.stopPropagation(); showAppSetup(b.dataset.p); });
  body.querySelectorAll('.fav').forEach((b) => b.onclick = async (e) => { e.stopPropagation(); await postJson('/api/app/favorite', { path: b.dataset.p, favorite: b.dataset.f === '1' }); refreshDashboard(); });
  if (dragOn) body.querySelectorAll('tr[data-open]').forEach((tr) => {
    tr.ondragstart = (e) => { DRAG = tr.dataset.open; e.dataTransfer.effectAllowed = 'move'; tr.classList.add('opacity-50'); };
    tr.ondragend = () => { DRAG = null; tr.classList.remove('opacity-50'); };
    tr.ondragover = (e) => e.preventDefault();
    tr.ondrop = (e) => { e.preventDefault(); reorderTo(DRAG, tr.dataset.open); };
  });
}

function reorderTo(fromPath, toPath) {
  if (!fromPath || fromPath === toPath) return;
  const ps = DASH.data.projects; const fi = ps.findIndex((p) => p.path === fromPath), ti = ps.findIndex((p) => p.path === toPath);
  if (fi < 0 || ti < 0) return;
  const [m] = ps.splice(fi, 1); ps.splice(ti, 0, m);
  renderHealth(); postJson('/api/app/order', { paths: ps.map((p) => p.path) });
}
