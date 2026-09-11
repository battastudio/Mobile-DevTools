// [split from app.js] Generic HTML/UI helpers (stats, menus, sparkline, skeleton, toolbar, spinner).
function miniStat(label, val, tone) { const c = { crit: 'rose', good: 'emerald', slate: 'slate' }[tone] || 'slate';
  return `<div class="surface p-4"><div class="text-[11px] uppercase tracking-wider text-slate-500">${label}</div><div class="font-display text-2xl font-bold mt-1 text-${c}-300">${esc(String(val))}</div></div>`; }

// ---- shared UI helpers (redesign) ----
let _menuN = 0;
function dropdown(label, itemsHtml) { const id = 'menu' + (++_menuN); return `<div class="qa-menu"><button class="btn btn-secondary text-xs qa-menu-btn" data-menu="${id}">${esc(label)} ▾</button><div id="${id}" class="qa-menu-pop surface hidden">${itemsHtml}</div></div>`; }
function wireMenus() {
  document.querySelectorAll('.qa-menu-btn').forEach(b => b.onclick = (e) => { e.stopPropagation(); const pop = el('#' + b.dataset.menu); const open = !pop.classList.contains('hidden'); document.querySelectorAll('.qa-menu-pop').forEach(p => p.classList.add('hidden')); if (!open) pop.classList.remove('hidden'); });
}
function sparkline(hist, w = 72, h = 20) {
  const a = (hist || []).filter(n => n != null); if (a.length < 2) return '';
  const max = Math.max(...a, 1), min = Math.min(...a, 0), rng = Math.max(1, max - min);
  const pts = a.map((v, i) => `${(i / (a.length - 1) * w).toFixed(1)},${(h - ((v - min) / rng) * h).toFixed(1)}`).join(' ');
  const up = a[a.length - 1] >= a[0];
  return `<svg class="qa-spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><polyline fill="none" stroke="${up ? '#34C77B' : '#F0556A'}" stroke-width="1.5" stroke-linejoin="round" points="${pts}"/></svg>`;
}
function skeleton(rows = 3) { return `<div class="space-y-3">${Array.from({ length: rows }, () => `<div class="qa-skel" style="height:56px"></div>`).join('')}</div>`; }
function catBreakdownHtml(summary) {
  const cats = CAT_GROUP.filter(c => summary && summary[c]); if (!cats.length) return '';
  return `<div class="surface p-4 mb-3"><div class="text-sm font-semibold mb-2.5">By category <span class="text-[11px] font-normal text-slate-500">— click to jump to a test type</span></div><div class="grid grid-cols-2 sm:grid-cols-3 gap-2">${cats.map(c => { const s = summary[c]; return `<button type="button" class="qa-cat flex items-center gap-2 text-xs rounded-lg border border-edge px-2.5 py-1.5 text-left w-full" data-cat="${esc(c)}" style="background:var(--panel)"><span class="qa-dot" style="background:var(--${CAT_COLOR[s.status] || 'muted'})"></span><span class="text-slate-300">${esc(c)}</span><span class="ml-auto text-slate-500">${ST_TEXT[s.status]}${s.metric ? ' · ' + esc(s.metric) : ''}</span></button>`; }).join('')}</div></div>`;
}
// Jump to + expand + flash the first test-type card in a category.
function jumpToCategory(cat) {
  const card = document.querySelector(`.tt-card[data-cat="${cat}"]`);
  if (!card) { toast('No matching test type on this screen', 'warn'); return; }
  const id = card.dataset.t; if (id && !QA.sel2.has(id)) { QA.sel2.add(id); syncSelection(); }
  card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  card.classList.add('qa-flash'); setTimeout(() => card.classList.remove('qa-flash'), 1400);
}
// One clean toolbar: Run all / Run selected / Auto-fix · AI ▾ · Reports ▾ · Device (flutter).
function actionToolbar(path, opts = {}) {
  const P = esc(path), u = encodeURIComponent(path);
  // AI QA actions are VISIBLE buttons (important, not hidden in a menu).
  const aiBtns = `<span data-cap="ai" class="contents"><span class="text-[10px] uppercase tracking-wider text-slate-500">AI QA</span>
    <button class="btn btn-secondary text-xs ai-plan" data-p="${P}" title="AI drafts a prioritized test plan">${ICON.flask}Test plan</button>
    <button class="btn btn-secondary text-xs ai-scenario" data-p="${P}" title="Write BDD/Gherkin scenarios">Write scenario</button>
    ${QA.platform === 'flutter' ? `<button class="btn btn-secondary text-xs ai-smoke" data-p="${P}" title="AI writes an integration smoke that walks key screens">Smoke test</button>` : ''}
    <button class="btn btn-secondary text-xs ai-summary" data-p="${P}" title="Test-readiness briefing">QA summary</button>
    <button class="btn btn-ghost text-xs ai-untested" data-p="${P}" title="Source files with no matching test">Untested files</button></span>`;
  const repItems = `<a class="menu-item" data-cap="export" href="/api/qa/badge?path=${u}" target="_blank">Badge (SVG)</a><a class="menu-item" data-cap="export" href="/api/qa/export?path=${u}&fmt=junit">JUnit XML</a><a class="menu-item" data-cap="export" href="/api/qa/export?path=${u}&fmt=json">JSON</a><a class="menu-item" data-cap="export" href="/api/qa/coverage?path=${u}" target="_blank">Coverage</a>${QA.platform === 'flutter' ? `<button class="menu-item rp-matrix" data-p="${P}">Device matrix</button>` : ''}`;
  return `<div class="qa-toolbar rounded-2xl flex flex-wrap items-center gap-2 mb-4 px-3 py-2">
    ${opts.run ? `<button id="tb-runall" class="btn btn-primary text-xs">${ICON.play}Run all</button>${opts.selectable ? `<button id="tb-runsel" class="btn btn-secondary text-xs">Run selected</button>` : ''}` : ''}
    <button class="btn btn-ghost text-xs qa-autofix" data-p="${P}" title="Apply safe formatters (dart format / pint / prettier), then re-run">${ICON.check}Auto-fix</button>
    ${dropdown('Reports', repItems)}
    <span class="tb-div"></span>
    ${aiBtns}
    ${opts.device ? `<span class="tb-div"></span>${deviceRowHtml()}` : ''}
  </div>`;
}
// Inline spinner (Tailwind animate-spin). Reused by runs + every AI action.
function spinner(text = '') {
  return `<span class="inline-flex items-center gap-2 text-slate-400 text-sm"><svg class="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="3" opacity=".25"/><path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>${text ? esc(text) : ''}</span>`;
}
// After a run's re-render, restore the streamed log so it stays visible (the re-render replaces the box).
function restoreLog(logHtml) {
  if (!logHtml || !logHtml.trim()) return;
  const nb = el('#detaillog') || el('#qalog');
  if (nb) { nb.classList.remove('hidden'); nb.innerHTML = logHtml; nb.scrollTop = nb.scrollHeight; }
}
