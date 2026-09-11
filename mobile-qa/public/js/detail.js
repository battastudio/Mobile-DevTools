// [split from app.js] Project detail: suite chips, selection, log setup, run bar/log/left panels.
// ---------------- PROJECT DETAIL: pick test types → guided flow → run ----------------
async function showProjectDetail(path) {
  QA.detailPath = path; QA.sel2 = new Set();
  await setShell('dashboard');
  el('#qabody').innerHTML = skeleton(4);
  const [tt, rec] = await Promise.all([
    fetch('/api/qa/testtypes?path=' + encodeURIComponent(path)).then(r => r.json()).catch(() => null),
    fetch('/api/qa?path=' + encodeURIComponent(path)).then(r => r.json()).catch(() => null),
  ]);
  QA.tt = tt; QA.rec = rec; renderDetail();
}
const metaLine = (g, rec) => `${g.score ?? '—'}/100 · ${g.counts.fail || 0} failing · ${g.counts.pass || 0} pass · ran ${rec.ranAt ? relTime(rec.ranAt) : 'never'}`;
const shortTitle = (t) => String(t || '').replace(/\s*\(.*?\)\s*/g, '').trim().slice(0, 22);
// Merged pipeline + By-category: one grid of selectable test-type chips (dimmed when unselected).
function suiteChipsHtml() {
  const types = (QA.tt && QA.tt.types) || [];
  return types.map(t => {
    const s = QA.stageStatus[t.id] || t.status || 'na';
    const sel = QA.sel2.has(t.id);
    const col = { fail: 'crit', warn: 'warn', pass: 'good', ok: 'good', running: 'brand', na: 'muted' }[s] || 'muted';
    return `<button type="button" class="suite-chip ${sel ? 'sel' : 'dim'}${s === 'running' ? ' run' : ''} flex items-center gap-2 rounded-xl border border-edge px-3 py-2 text-left" data-t="${esc(t.id)}" title="${esc(t.name)}">
      <span class="qa-dot" style="background:var(--${col})"></span>
      <span class="text-[12px] font-medium text-slate-200 truncate">${esc(t.name)}</span>
      <span class="ml-auto text-[10px] text-slate-500 whitespace-nowrap">${ST_TEXT[s] || ''}${t.metric ? ' · ' + esc(t.metric) : ''}</span>
    </button>`;
  }).join('');
}
// Detail panels shown ONLY for selected test types (unselected live as dimmed chips above).
function selectedDetailsHtml(tt) {
  const sel = (tt.types || []).filter(t => QA.sel2.has(t.id));
  if (!sel.length) return `<div class="text-[11px] text-slate-500 px-1">Select a test type above to see details, run it, and fix issues.</div>`;
  return sel.map(t => testTypeCard(t)).join('');
}
// Called during a run to update chip dots (selection unchanged).
function renderPipe() { const g = el('#qa-suite'); if (g) { g.innerHTML = suiteChipsHtml(); wireSuite(); } }
// Re-render chips + selected detail panels after a selection change.
function syncSelection() {
  const g = el('#qa-suite'); if (g) g.innerHTML = suiteChipsHtml();
  const d = el('#qa-details'); if (d && QA.tt) d.innerHTML = selectedDetailsHtml(QA.tt);
  wireSuite(); wireCards();
}
function toggleType(id, scroll) {
  if (QA.sel2.has(id)) QA.sel2.delete(id); else QA.sel2.add(id);
  syncSelection();
  if (scroll && QA.sel2.has(id)) { const c = el('#ttcard-' + id); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
}
function wireSuite() { document.querySelectorAll('.suite-chip').forEach(b => b.onclick = () => toggleType(b.dataset.t, true)); }
// Collapsible per-stage terminal log (one <details> fold per stage).
function logSetup(box) {
  box.innerHTML = ''; let curBody = null;
  const clean = (s) => String(s).replace(/\x1b\[[0-9;]*m/g, '');
  const auto = () => { const a = el('#rp-auto'); if (!a || a.checked) box.scrollTop = box.scrollHeight; };
  return {
    step(text) { const d = document.createElement('details'); d.className = 'step mt-1'; d.open = true; d.innerHTML = `<summary class="text-emerald-300 font-semibold">▸ ${esc(text)}</summary><div class="pl-3 border-l border-edge mt-1"></div>`; box.appendChild(d); curBody = d.querySelector('div'); auto(); },
    finish(text, ms) { if (!curBody) return; const sum = curBody.parentElement.querySelector('summary'); if (sum) sum.innerHTML = `▸ ${esc(text)} <span class="text-slate-500 font-normal">${ms != null ? '· ' + (ms / 1000).toFixed(1) + 's' : ''}</span>`; },
    line(s, cls = '') { const t = clean(s); const d = document.createElement('div'); if (cls) d.className = cls; else if (/✖|error|exception|failed|\[fail\]/i.test(t)) d.className = 'text-rose-400'; else if (/⚠|warn|\[warn\]/i.test(t)) d.className = 'text-amber-300'; d.textContent = t; (curBody || box).appendChild(d); auto(); },
  };
}
// Clean run bar (no wrapping strip): status + elapsed + Stop + Run selected/all.
function runBarHtml() {
  return `<div class="qa-toolbar rounded-2xl flex items-center gap-2 mb-3 px-3 py-2">
    <span class="text-[10px] uppercase tracking-[.24em] font-semibold" style="color:var(--brand2)">Test suite</span>
    <span id="rp-status" class="status off ml-1">idle</span><span id="rp-elapsed" class="text-[11px] text-slate-500"></span>
    <span class="flex-1"></span>
    <button id="rp-stop" class="btn btn-ghost text-xs hidden">■ Stop</button>
    <button id="tb-runsel" class="btn btn-secondary text-xs">Run selected</button>
    <button id="tb-runall" class="btn btn-primary text-xs">${ICON.play}Run all</button>
  </div>`;
}
// Right column: the fake-terminal live log.
function runLogHtml() {
  return `<div class="qa-runpanel qa-term">
    <div class="qa-term-head"><span class="qa-term-dot" style="background:#F0556A"></span><span class="qa-term-dot" style="background:#F5B342"></span><span class="qa-term-dot" style="background:#34C77B"></span><span class="readout text-[10px] text-slate-600 ml-2">qa.log</span><label class="ml-auto text-[10px] text-slate-500 flex items-center gap-1"><input id="rp-auto" type="checkbox" checked class="accent-brand"/> auto</label></div>
    <div id="detaillog" class="log h-[30rem] overflow-auto p-3 text-slate-300">idle — pick test types and Run.</div>
  </div>`;
}
function detailLeftHtml(tt, rec) {
  return `<div class="flex items-center gap-2 mb-1"><div class="text-sm font-semibold">Test suite</div><div class="text-[11px] text-slate-500">click a chip to select — selected run together &amp; show details below</div></div>
    <div id="qa-suite" class="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">${suiteChipsHtml()}</div>
    <div id="qa-details" class="space-y-2">${selectedDetailsHtml(tt)}</div>`;
}
