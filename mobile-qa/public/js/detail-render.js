// [split from app.js] Detail rendering: renderDetail/testTypeCard/fixFiles/wireDetail/wireCards.
function renderDetail() {
  const tt = QA.tt, rec = QA.rec || {};
  if (!tt) { el('#qabody').innerHTML = `<div class="surface p-6 text-sm text-slate-400">Could not load test types. <button class="underline" onclick="showApp('dashboard')">Back</button></div>`; return; }
  const g = rec.grade || { letter: '—', score: 0, counts: {} };
  const needsUrl = tt.types.some(t => t.url);
  QA.stages = []; QA.stageStatus = {};
  el('#qabody').innerHTML = `
    <div class="flex items-center gap-3 mb-4">
      <button id="dback" class="btn btn-ghost text-xs px-2 py-1">← all projects</button><span id="qa-grade">${gradeBox(g.letter, g.score)}</span>
      <div class="min-w-0"><div class="font-semibold truncate">${esc(path0(tt.path))} <span class="text-[10px] uppercase tracking-wide text-slate-500">${esc(PLATFORM_LABEL[tt.platform] || tt.platform)}</span></div>
        <div id="qa-meta" class="text-xs text-slate-500">${metaLine(g, rec)}</div></div>
      ${rec.history && rec.history.length > 1 ? `<span class="ml-2" title="score trend">${sparkline(rec.history)}</span>` : ''}
      ${rec.path ? `<a href="/api/qa/report?path=${encodeURIComponent(rec.path)}" target="_blank" class="btn btn-secondary text-xs ml-auto">Report</a>` : '<span class="ml-auto"></span>'}
    </div>
    ${runBarHtml()}
    ${actionToolbar(QA.detailPath, { run: false, device: tt.platform === 'flutter' })}
    ${needsUrl ? `<div class="surface p-3 mb-3 flex items-end gap-2"><div class="flex-1"><div class="text-[11px] text-slate-500 mb-1">Live URL (for SEO / accessibility / performance tests)</div><input id="durl" class="field text-sm w-full font-mono" placeholder="https://your-site.com" value="${esc(QA.url || '')}"/></div></div>` : ''}
    <div class="grid lg:grid-cols-3 gap-4 items-start">
      <div id="qa-left" class="lg:col-span-2 space-y-3">${detailLeftHtml(tt, rec)}</div>
      <div class="lg:col-span-1">${runLogHtml()}</div>
    </div>`;
  wireDetail();
}
// Build-Helper env-card style: collapsed row, body expands only when selected.
function testTypeCard(t) {
  const sel = QA.sel2.has(t.id);
  const rail = { fail: 'crit', warn: 'warn', pass: 'good', ok: 'good', na: 'muted' }[t.status] || 'muted';
  const aiBtn = t.ai ? `<button class="btn btn-ghost text-[11px] px-2 py-0.5 tt-ai" data-t="${t.id}" title="Generate a starter test for this type with AI">${ICON.flask}AI</button>` : '';
  const scBtn = (t.scaffold || t.id === 'web-e2e') ? `<button class="btn btn-ghost text-[11px] px-2 py-0.5 tt-scaffold" data-t="${t.id}">Scaffold</button>` : '';
  return `<div id="ttcard-${t.id}" class="surface tt-card relative overflow-hidden ${sel ? 'tt-open' : ''}" data-cat="${esc(t.category || '')}" data-t="${t.id}">
    <div class="absolute left-0 top-0 bottom-0 w-1" style="background:var(--${rail})"></div>
    <div class="tt-head flex items-center gap-2.5 px-4 py-3 cursor-pointer select-none" data-t="${t.id}">
      <input type="checkbox" class="tt-check" data-t="${t.id}" ${sel ? 'checked' : ''}/>
      <span class="text-[13px] font-semibold text-slate-200">${esc(t.name)}</span>
      <span class="${ST_CHIP[t.status]}">${ST_TEXT[t.status]}</span>
      ${t.metric ? `<span class="text-[10px] font-mono text-slate-400">${esc(t.metric)}</span>` : ''}
      ${t.url ? '<span class="text-[9px] uppercase text-amber-400/70">needs URL</span>' : ''}
      <span id="ttchev-${t.id}" class="ml-auto text-slate-500 text-xs">${sel ? '▾' : '▸'}</span>
    </div>
    <div id="ttbody-${t.id}" class="tt-body px-4 pb-4 border-t border-edge/50 ${sel ? '' : 'hidden'}">
      <div class="text-[11px] text-slate-400 mt-2.5">${esc(t.what)}</div>
      <details class="mt-2"><summary class="text-[11px] cursor-pointer" style="color:var(--brand2)">How it works ▾</summary>
        <div class="text-[11px] text-slate-400 mt-1"><b class="text-slate-300">Why:</b> ${esc(t.why)}</div>
        <pre class="text-[11px] text-slate-300 whitespace-pre-wrap font-mono bg-ink/60 rounded-lg p-2.5 mt-1.5">${esc(t.flow)}</pre></details>
      <div class="flex gap-1.5 mt-2">
        <button class="btn btn-secondary text-[11px] px-2 py-0.5 tt-run" data-t="${t.id}">${ICON.play}Run</button>${scBtn}${aiBtn}
      </div>
      ${ttResultHtml(t)}
    </div></div>`;
}
// After a run, show what failed + how to improve + Explain (AI) right on the card.
function ttResultHtml(t) {
  const reviewable = (t.status === 'fail' || t.status === 'warn') && t.detail;
  if (!reviewable) return '';
  return `<details class="mt-2" open>
    <summary class="text-[11px] cursor-pointer text-rose-300/90">What's wrong &amp; how to fix ▾</summary>
    <pre class="text-[11px] text-slate-300 whitespace-pre-wrap font-mono bg-ink/60 rounded-lg p-2.5 mt-1.5 max-h-52 overflow-auto">${esc(t.detail)}</pre>
    ${t.fix ? `<div class="text-[10px] uppercase tracking-wide text-emerald-400/80 mt-2 mb-1">How to improve</div><pre class="text-[11px] text-slate-300 whitespace-pre-wrap font-mono bg-ink/60 rounded-lg p-2.5">${esc(t.fix)}</pre>` : ''}
    ${fixFilesHtml(QA.detailPath, t.files, t.fix)}
    <button class="btn btn-secondary text-[11px] px-2 py-0.5 mt-2 ai-explain" data-detail="${esc(t.detail).slice(0, 4000)}" data-title="${esc(t.name)}" title="AI: explain this and give a concrete fix">${ICON.flask}Explain (AI)</button>
  </details>`;
}
// Per-file "Fix (AI)" buttons for results that name offending files (e.g. accessibility).
function fixFilesHtml(path, files, fix) {
  if (!files || !files.length) return '';
  const instr = (fix || '').slice(0, 300);
  return `<div class="mt-2"><div class="text-[10px] uppercase tracking-wide text-slate-500 mb-1">Fix a file with AI</div><div class="space-y-1">${files.slice(0, 12).map(f => `<div class="flex items-center gap-2 text-[11px]"><span class="font-mono text-slate-400 truncate flex-1">${esc(f)}</span><button class="btn btn-ghost text-[10px] px-2 py-0.5 ai-fixcode" data-p="${esc(path)}" data-f="${esc(f)}" data-instr="${esc(instr)}">${ICON.flask}Fix (AI)</button></div>`).join('')}${files.length > 12 ? `<div class="text-[10px] text-slate-500">+${files.length - 12} more</div>` : ''}</div></div>`;
}
function wireDetail() {
  const back = el('#dback'); if (back) back.onclick = () => showApp('dashboard');
  const durl = el('#durl'); if (durl) durl.oninput = () => QA.url = durl.value.trim();
  const rs = el('#tb-runsel'); if (rs) rs.onclick = () => { if (!QA.sel2.size) { toast('Select at least one test type (click a chip)', 'warn'); return; } runPipeline(QA.detailPath, { types: [...QA.sel2] }); };
  const ra = el('#tb-runall'); if (ra) ra.onclick = () => runPipeline(QA.detailPath, {});
  wireSuite();
  wireCards();
}
// Controls inside the selected-type detail panels.
function wireCards() {
  document.querySelectorAll('.tt-head').forEach(h => h.onclick = (e) => { if (e.target.closest('.tt-check') || e.target.closest('button')) return; toggleType(h.dataset.t, false); });
  document.querySelectorAll('.tt-check').forEach(c => c.onchange = () => { if (c.checked) QA.sel2.add(c.dataset.t); else QA.sel2.delete(c.dataset.t); syncSelection(); });
  document.querySelectorAll('.tt-run').forEach(b => b.onclick = (e) => { e.stopPropagation(); runPipeline(QA.detailPath, { types: [b.dataset.t] }); });
  document.querySelectorAll('.tt-scaffold').forEach(b => b.onclick = async () => { b.disabled = true; const r = await postJson('/api/qa/scaffold/type', { path: QA.detailPath, type: b.dataset.t }); if (r.error) { toast(r.error, 'err'); b.disabled = false; } else toast('Scaffolded ' + (r.written || (r.written && r.written.join(', ')) || 'starter'), 'ok'); });
  document.querySelectorAll('.tt-ai').forEach(b => b.onclick = () => genTypeTest(QA.detailPath, b.dataset.t));
  document.querySelectorAll('.gen-ai').forEach(b => b.onclick = () => genTest(b.dataset.p, b.dataset.f, b.dataset.t));
  document.querySelectorAll('.gen-stub').forEach(b => b.onclick = async () => { b.disabled = true; const r = await postJson('/api/qa/scaffold/test', { path: b.dataset.p, file: b.dataset.f }); if (r.error) { toast(r.error, 'err'); b.disabled = false; } else toast('Scaffolded ' + r.written, 'ok'); });
  wireAi();
}
const path0 = (p) => (p || '').split('/').filter(Boolean).pop() || p;
// AI-generate a starter test for a whole test type (scaffold a representative file, then AI-fill it is overkill — just scaffold + toast to open it).
async function genTypeTest(path, typeId) {
  const r = await postJson('/api/qa/scaffold/type', { path, type: typeId });
  if (r.error) { toast(r.error + ' — use “AI test” on a specific file in the test plan instead.', 'err'); return; }
  toast('Starter created: ' + (r.written || (r.written && r.written.join(', '))) + '. Open it and use AI-generate per file in the test plan for full tests.', 'ok');
}
