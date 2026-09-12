// Build Helper frontend — the project-health table (window.HT). Sortable columns, drag-to-reorder
// (persisted via /api/app/order, only while unsorted), favorite toggle, density toggle, per-row
// security grade, and a "Set up" / "Open" call-to-action. Renders into a container + wires events;
// data ops call back into the dashboard, which re-fetches and re-renders.
'use strict';

const _gradeCls = (l) => ({ A: 'good', B: 'brand', C: 'warn', D: 'crit', F: 'crit' }[l] || 'muted');
function _gradeBadge(g) {
  if (!g || !g.letter) return '<span class="text-[11px] text-slate-600">—</span>';
  return `<span class="bh-dot" style="background:var(--${_gradeCls(g.letter)})" title="score ${g.score}"></span> <span class="text-[11px] font-mono">${esc(g.letter)}</span>`;
}
const _sorters = {
  name: (a, b) => a.name.localeCompare(b.name),
  builds: (a, b) => (b.buildCount || 0) - (a.buildCount || 0),
  last: (a, b) => (b.lastBuild ? +new Date(b.lastBuild.time) : 0) - (a.lastBuild ? +new Date(a.lastBuild.time) : 0),
  grade: (a, b) => ((b.grade ? b.grade.score : -1) - (a.grade ? a.grade.score : -1)),
};

window.HT = {
  density() { return localStorage.getItem('bh-density') || 'comfortable'; },
  render(container, projects, h) {
    const sort = BH.tableSort || '';
    const list = sort ? [...projects].sort(_sorters[sort]) : projects; // server order = favorites+order
    const dense = this.density() === 'compact';
    const pad = dense ? 'py-1' : 'py-2';
    const th = (key, label, extra) => `<th class="text-left text-[11px] uppercase tracking-wider text-slate-500 font-medium ${key ? 'cursor-pointer select-none' : ''} ${extra || ''}" ${key ? `data-sort="${key}"` : ''}>${label}${sort === key ? ' ↓' : ''}</th>`;
    container.innerHTML = list.length ? `<div class="surface overflow-hidden"><table class="w-full text-sm"><thead><tr class="border-b border-edge/60 px-3">
      <th class="w-6"></th>${th('name', 'App')}${th('', 'Envs')}${th('', 'Version')}${th('last', 'Last build')}${th('builds', 'Builds')}${th('grade', 'Sec')}<th class="w-8"></th><th class="w-8"></th></tr></thead>
      <tbody>${list.map((p) => this.row(p, pad, !sort)).join('')}</tbody></table></div>`
      : `<div class="surface p-6 text-sm text-slate-400">${projects.length ? 'No projects match your search.' : 'No Flutter apps found. Add a scan root or pin a project in <b>Project sources</b> above.'}</div>`;
    this.wire(container, list, h, !sort);
  },
  row(p, pad, canDrag) {
    const lb = p.lastBuild, health = p.needsConfig ? 'warn' : (p.healthOk ? 'ok' : 'warn');
    const last = lb ? `<span class="${lb.buildOk ? 'text-emerald-300' : 'text-rose-300'}">${lb.buildOk ? '✓' : '✗'} v${esc(verName(lb.version))}</span> <span class="text-slate-500">· ${esc(lb.env || '')} · ${relTime(lb.time)}</span>` : '<span class="text-slate-500">—</span>';
    const cta = p.needsConfig ? `<button class="btn btn-secondary text-[11px] !py-0.5 !px-2" data-setup="${esc(p.path)}">Set up</button>` : `<button class="btn btn-ghost text-[11px] !py-0.5 !px-2" data-open="${esc(p.path)}">Open</button>`;
    return `<tr class="border-b border-edge/40 hover:bg-white/[.02]" data-path="${esc(p.path)}" ${canDrag ? 'draggable="true"' : ''}>
      <td class="${pad} pl-3">${C.dot(health)}</td>
      <td class="${pad}"><button class="font-display font-semibold text-left hover:text-brand" data-${p.needsConfig ? 'setup' : 'open'}="${esc(p.path)}">${esc(p.name)}</button></td>
      <td class="${pad}">${C.envChips(p)}</td>
      <td class="${pad} font-mono text-[11px] text-slate-400">v${esc(verName(p.version))}</td>
      <td class="${pad} text-[12px]">${last}</td>
      <td class="${pad} text-[12px] text-slate-400">${p.buildCount || 0}</td>
      <td class="${pad}">${_gradeBadge(p.grade)}</td>
      <td class="${pad} text-center"><button data-fav="${esc(p.path)}" class="text-sm ${p.favorite ? 'text-amber-300' : 'text-slate-600 hover:text-amber-300'}" title="Favorite">★</button></td>
      <td class="${pad} pr-3 text-center"><button class="text-slate-500 hover:text-slate-200 [&>svg]:w-3.5 [&>svg]:h-3.5" data-reveal="${esc(p.path)}" title="Reveal in Finder">${ICON.folder}</button></td>
      ${cta ? `<td class="${pad} pr-3">${cta}</td>` : ''}</tr>`;
  },
  wire(container, list, h, canDrag) {
    container.querySelectorAll('[data-sort]').forEach((t) => t.onclick = () => { BH.tableSort = BH.tableSort === t.dataset.sort ? '' : t.dataset.sort; this.render(container, list, h); });
    container.querySelectorAll('[data-open]').forEach((b) => b.onclick = () => h.open(b.dataset.open));
    container.querySelectorAll('[data-setup]').forEach((b) => b.onclick = () => h.setup(b.dataset.setup));
    container.querySelectorAll('[data-reveal]').forEach((b) => b.onclick = (e) => { e.stopPropagation(); h.reveal(b.dataset.reveal); });
    container.querySelectorAll('[data-fav]').forEach((b) => b.onclick = () => h.favorite(b.dataset.fav, !list.find((p) => p.path === b.dataset.fav)?.favorite));
    if (canDrag) this.wireDrag(container, h);
  },
  // HTML5 drag-reorder: on drop, emit the new path order for /api/app/order.
  wireDrag(container, h) {
    let from = null;
    container.querySelectorAll('tr[draggable]').forEach((tr) => {
      tr.ondragstart = () => { from = tr; tr.style.opacity = '.4'; };
      tr.ondragend = () => { tr.style.opacity = ''; };
      tr.ondragover = (e) => e.preventDefault();
      tr.ondrop = (e) => { e.preventDefault(); if (!from || from === tr) return; const rows = [...container.querySelectorAll('tr[draggable]')]; const fi = rows.indexOf(from), ti = rows.indexOf(tr); tr.parentNode.insertBefore(from, fi < ti ? tr.nextSibling : tr); h.reorder([...container.querySelectorAll('tr[draggable]')].map((r) => r.dataset.path)); };
    });
  },
};
