// [split from app.js] AI QA modals + wiring + autofix (plan/untested/scenario/summary/smoke/explain).
// AI test plan — popup with Stop + Regenerate; shows an existing plan immediately.
async function aiPlanModal(p) {
  const box = openModal({ title: 'AI test plan', subtitle: 'prioritized cases to write', size: '900px' });
  const wireRows = () => document.querySelectorAll('#cmdk .gen-ai').forEach(b => b.onclick = () => genTest(b.dataset.p, b.dataset.f, b.dataset.t));
  const show = (items) => { box.innerHTML = `<div class="flex items-center gap-2 mb-2"><div class="text-sm text-slate-400">${items.length} case(s)</div><button id="pl-regen" class="btn btn-secondary text-xs ml-auto">${ICON.flask}Regenerate</button></div><div class="space-y-1.5 max-h-[64vh] overflow-auto">${planRowsHtml(items, p)}</div>`; el('#pl-regen').onclick = () => generate(); wireRows(); };
  const generate = async () => {
    const ac = new AbortController(); box.innerHTML = spinnerStop('AI is drafting a test plan…', 'pl-stop'); el('#pl-stop').onclick = () => { try { ac.abort(); } catch {} el('#cmdk').classList.add('hidden'); };
    let r; try { r = await aiFetch('/api/qa/ai/plan', { path: p }, ac.signal); } catch (e) { if (ac.signal.aborted) return; box.innerHTML = `<div class="text-rose-400 text-sm">${esc(e.message || 'failed')}</div>`; return; }
    if (r.error) { box.innerHTML = `<div class="text-rose-400 text-sm">${esc(r.error)}</div>`; return; }
    if (QA.detailPath === p) { QA.rec = await fetch('/api/qa?path=' + encodeURIComponent(p)).then(x => x.json()).catch(() => QA.rec); }
    show(r.items || []);
  };
  box.innerHTML = `<div class="py-10 text-center">${spinner('Loading…')}</div>`;
  const rec = (QA.rec && QA.rec.path === p) ? QA.rec : await fetch('/api/qa?path=' + encodeURIComponent(p)).then(r => r.json()).catch(() => null);
  const existing = rec && rec.aiPlan && (rec.aiPlan.items || []).length ? rec.aiPlan.items : null;
  if (existing) show(existing); else generate();
}
// Untested files — popup with filter (coverage gap).
async function untestedModal(p) {
  const box = openModal({ title: 'Untested files', subtitle: 'source files with no matching test', size: '900px' });
  box.innerHTML = `<div class="py-10 text-center">${spinner('Loading…')}</div>`;
  const rec = (QA.rec && QA.rec.path === p) ? QA.rec : await fetch('/api/qa?path=' + encodeURIComponent(p)).then(r => r.json()).catch(() => null);
  const files = (rec && rec.untested) || [];
  if (!files.length) { box.innerHTML = `<div class="text-slate-500 text-sm py-6 text-center">No untested files reported — run QA (test-gap) first.</div>`; return; }
  const draw = (q = '') => {
    const list = q ? files.filter(f => f.toLowerCase().includes(q.toLowerCase())) : files;
    el('#ut-list').innerHTML = list.slice(0, 300).map(f => `<div class="flex items-center gap-2 py-1 text-[12px]"><span class="font-mono text-slate-300 truncate flex-1">${esc(f)}</span><button class="btn btn-secondary text-[11px] px-2 py-0.5 gen-ai" data-p="${esc(p)}" data-f="${esc(f)}">${ICON.flask}AI test</button><button class="btn btn-ghost text-[11px] px-2 py-0.5 gen-stub" data-p="${esc(p)}" data-f="${esc(f)}">stub</button></div>`).join('') + (list.length > 300 ? `<div class="text-[10px] text-slate-500 mt-2">+${list.length - 300} more — filter to narrow</div>` : '');
    document.querySelectorAll('#cmdk .gen-ai').forEach(b => b.onclick = () => genTest(b.dataset.p, b.dataset.f));
    document.querySelectorAll('#cmdk .gen-stub').forEach(b => b.onclick = async () => { b.disabled = true; const r = await postJson('/api/qa/scaffold/test', { path: b.dataset.p, file: b.dataset.f }); if (r.error) { toast(r.error, 'err'); b.disabled = false; } else toast('Scaffolded ' + r.written, 'ok'); });
  };
  box.innerHTML = `<div class="mb-2"><input id="ut-q" class="field text-sm w-full" placeholder="Filter ${files.length} files…"/></div><div id="ut-list" class="divide-y divide-edge/40 max-h-[64vh] overflow-auto"></div>`;
  el('#ut-q').oninput = () => draw(el('#ut-q').value);
  draw();
}
function aiPlanHtml(rec) {
  const plan = rec && rec.aiPlan; if (!plan || !(plan.items || []).length) return '';
  const PRI = { high: 'rose', med: 'amber', low: 'slate' };
  const rows = plan.items.map(it => `<div class="rounded-xl border border-edge px-3 py-2" style="background:var(--panel)">
    <div class="flex items-center gap-2 flex-wrap">${badge(it.priority || 'med', PRI[it.priority] || 'slate')}
      <span class="text-[10px] uppercase tracking-wide text-slate-500">${esc(it.type || '')}</span>
      <span class="text-[13px] font-medium text-slate-200">${esc(it.title || '')}</span>
      ${it.targetFile ? `<button class="btn btn-ghost text-[10px] px-2 py-0.5 gen-ai ml-auto" data-p="${esc(rec.path)}" data-f="${esc(it.targetFile)}" data-t="${esc(it.type || '')}" title="Generate a test for ${esc(it.targetFile)}">${ICON.flask}AI test</button>` : ''}</div>
    ${(it.given || it.when || it.then) ? `<div class="text-[11px] text-slate-400 mt-1 font-mono">${it.given ? '<b class="text-slate-300">Given</b> ' + esc(it.given) + ' ' : ''}${it.when ? '<b class="text-slate-300">When</b> ' + esc(it.when) + ' ' : ''}${it.then ? '<b class="text-slate-300">Then</b> ' + esc(it.then) : ''}</div>` : ''}
    ${it.targetFile ? `<div class="text-[10px] text-slate-500 mt-0.5 font-mono">${esc(it.targetFile)}</div>` : ''}</div>`).join('');
  return `<div class="surface p-4 mt-3"><div class="text-sm font-semibold mb-2">AI test plan — ${plan.items.length} case(s)</div><div class="space-y-1.5">${rows}</div></div>`;
}
// Markdown result modal (summary / explain) with Stop + copy + share-to-team.
async function aiTextModal(title, subtitle, url, reqBody) {
  const box = openModal({ title, subtitle, size: '820px' });
  const ac = new AbortController();
  box.innerHTML = spinnerStop('Thinking…');
  el('#ai-stop').onclick = () => { try { ac.abort(); } catch {} el('#cmdk').classList.add('hidden'); };
  let r; try { r = await aiFetch(url, reqBody, ac.signal); } catch (e) { if (ac.signal.aborted) return; box.innerHTML = `<div class="text-rose-400 text-sm">${esc(e.message || 'AI request failed')}</div>`; return; }
  if (!r || r.error) { box.innerHTML = `<div class="text-rose-400 text-sm">${esc((r && r.error) || 'AI request failed')}</div>`; return; }
  const text = r.text || '';
  box.innerHTML = `<div class="text-sm text-slate-300 leading-relaxed max-h-[60vh] overflow-auto md-body">${mdToHtml(text)}</div>
    <div class="flex gap-2 mt-3"><button id="ai-copy" class="btn btn-secondary text-sm">Copy</button><button id="ai-share" class="btn btn-primary text-sm">Share ▸</button><span class="text-[11px] text-slate-500 ml-auto self-center">${esc(r.model || '')}</span></div>`;
  el('#ai-copy').onclick = () => { navigator.clipboard.writeText(text); toast('Copied', 'ok'); };
  el('#ai-share').onclick = () => shareModal({ title, text });
}
function aiScenario(p) {
  const box = openModal({ title: 'Write test scenarios (AI)', subtitle: 'BDD / Gherkin', size: '820px' });
  box.innerHTML = `<div class="space-y-2">
    <div class="text-[11px] text-slate-500">Describe a feature to test (or leave blank to scan the app). Optionally point at a source file.</div>
    <textarea id="sc-feature" class="field text-sm w-full font-mono" rows="3" placeholder="e.g. User logs in with email + password, lands on the dashboard, and can log out"></textarea>
    <input id="sc-file" class="field text-xs w-full font-mono" placeholder="optional source file, e.g. lib/screens/login.dart"/>
    <button id="sc-go" class="btn btn-primary text-sm">${ICON.flask}Generate scenarios</button>
    <div id="sc-out"></div></div>`;
  el('#sc-go').onclick = async () => {
    const go = el('#sc-go'); const feature = el('#sc-feature').value.trim(), file = el('#sc-file').value.trim();
    const out = el('#sc-out'); const ac = new AbortController();
    out.innerHTML = `<div class="py-6 text-center">${spinner('Generating scenarios…')}<div class="mt-2"><button id="sc-stop" class="btn btn-ghost text-xs">■ Stop</button></div></div>`;
    el('#sc-stop').onclick = () => { try { ac.abort(); } catch {} out.innerHTML = '<div class="text-amber-300 text-xs">stopped</div>'; };
    go.disabled = true; const goPrev = go.innerHTML; go.innerHTML = spinner('Generating…');
    let r; try { r = await aiFetch('/api/qa/ai/scenario', { path: p, feature, file }, ac.signal); } catch (e) { go.disabled = false; go.innerHTML = goPrev; if (ac.signal.aborted) return; out.innerHTML = `<div class="text-rose-400 text-sm">${esc(e.message)}</div>`; return; }
    go.disabled = false; go.innerHTML = goPrev;
    if (r.error) { out.innerHTML = `<div class="text-rose-400 text-sm">${esc(r.error)}</div>`; return; }
    out.innerHTML = `<pre class="log text-[11px] whitespace-pre-wrap bg-ink rounded-lg p-3 max-h-[50vh] overflow-auto mt-2">${esc(r.gherkin || '')}</pre>
      <div class="flex gap-2 mt-2 items-center flex-wrap"><button id="sc-copy" class="btn btn-secondary text-xs">Copy</button>
        <select id="sc-type" class="field text-xs py-1"><option value="widget">Widget test</option><option value="integration">Integration test</option></select>
        <button id="sc-code" class="btn btn-primary text-xs">${ICON.flask}Generate test code</button>
        <span class="text-[11px] text-slate-500 self-center ml-auto">${esc(r.model || '')}</span></div>
      <div id="sc-code-out"></div>`;
    el('#sc-copy').onclick = () => { navigator.clipboard.writeText(r.gherkin || ''); toast('Copied', 'ok'); };
    el('#sc-code').onclick = async () => {
      const btn = el('#sc-code'); const cout = el('#sc-code-out'); const cac = new AbortController();
      cout.innerHTML = `<div class="py-6 text-center">${spinner('Writing test code from scenarios…')}<div class="mt-2"><button id="sc-code-stop" class="btn btn-ghost text-xs">■ Stop</button></div></div>`;
      el('#sc-code-stop').onclick = () => { try { cac.abort(); } catch {} cout.innerHTML = '<div class="text-amber-300 text-xs">stopped</div>'; };
      btn.disabled = true; const prev = btn.innerHTML; btn.innerHTML = spinner('Generating…');
      let c; try { c = await aiFetch('/api/qa/ai/scenario-code', { path: p, gherkin: r.gherkin || '', type: el('#sc-type').value }, cac.signal); } catch (e) { btn.disabled = false; btn.innerHTML = prev; if (cac.signal.aborted) return; cout.innerHTML = `<div class="text-rose-400 text-sm">${esc(e.message)}</div>`; return; }
      btn.disabled = false; btn.innerHTML = prev;
      if (!c || c.error) { cout.innerHTML = `<div class="text-rose-400 text-sm">${esc((c && c.error) || 'AI request failed')}</div>`; return; }
      cout.innerHTML = `<input id="sc-path" class="field text-xs w-full font-mono mt-3" value="${esc(c.suggestedPath || '')}"/>
        <pre class="log text-[11px] whitespace-pre-wrap bg-ink rounded-lg p-3 max-h-[50vh] overflow-auto mt-2">${esc(c.code || '')}</pre>
        <div class="flex gap-2 mt-2"><button id="sc-save" class="btn btn-primary text-xs">${ICON.check}Save to project</button><button id="sc-code-copy" class="btn btn-secondary text-xs">Copy</button><span class="text-[11px] text-slate-500 self-center ml-auto">${esc(c.model || '')}</span></div>`;
      el('#sc-code-copy').onclick = () => { navigator.clipboard.writeText(c.code || ''); toast('Copied', 'ok'); };
      el('#sc-save').onclick = async () => { const s = await postJson('/api/qa/ai/save', { path: p, file: el('#sc-path').value.trim(), content: c.code }); if (s.error) toast(s.error, 'err'); else toast('Saved ' + s.written, 'ok'); };
    };
  };
}
const aiSummary = (p) => aiTextModal('QA summary', 'Test-readiness briefing', '/api/qa/ai/summary', { path: p });
async function genSmoke(p) {
  const body = openModal({ title: 'AI smoke journeys', subtitle: 'integration_test/smoke_test.dart', size: '820px' });
  const ac = new AbortController();
  body.innerHTML = spinnerStop('Writing a smoke test that walks key screens…');
  el('#ai-stop').onclick = () => { try { ac.abort(); } catch {} el('#cmdk').classList.add('hidden'); };
  let r; try { r = await aiFetch('/api/qa/ai/smoke-journeys', { path: p }, ac.signal); } catch (e) { if (ac.signal.aborted) return; r = { error: e.message }; }
  if (!r || r.error) { body.innerHTML = `<div class="text-rose-400 text-sm">${esc((r && r.error) || 'AI request failed')}</div>`; return; }
  body.innerHTML = `<div class="text-[11px] text-slate-500 mb-2">${esc(r.suggestedPath)} · ${esc(r.model || '')}</div>
    <pre class="log text-[11px] whitespace-pre-wrap bg-ink rounded-lg p-3 max-h-[60vh] overflow-auto">${esc(r.code)}</pre>
    <div class="flex gap-2 mt-3"><button id="ai-save" class="btn btn-primary text-sm">${ICON.check}Save to ${esc(r.suggestedPath)}</button><button id="ai-copy" class="btn btn-secondary text-sm">Copy</button></div>`;
  el('#ai-copy').onclick = () => { navigator.clipboard.writeText(r.code); toast('Copied', 'ok'); };
  el('#ai-save').onclick = async () => { const s = await postJson('/api/qa/ai/save', { path: p, file: r.suggestedPath, content: r.code }); if (s.error) toast(s.error, 'err'); else { toast('Saved ' + s.written, 'ok'); el('#cmdk').classList.add('hidden'); } };
}
const aiExplain = (detail, title) => aiTextModal('Explain failure — ' + title, 'AI root-cause + fix', '/api/qa/ai/explain', { path: curPath(), failure: detail });
function wireAi() {
  const help = el('#qahelp'); if (help) help.onclick = startQaTour;
  const settings = el('#qasettings'); if (settings) settings.onclick = () => openSettings({ aiUrl: '/api/qa/config' });
  wireDevice();
  document.querySelectorAll('.ai-plan').forEach(b => b.onclick = () => aiPlanModal(b.dataset.p));
  document.querySelectorAll('.ai-untested').forEach(b => b.onclick = () => untestedModal(b.dataset.p));
  document.querySelectorAll('.ai-scenario').forEach(b => b.onclick = () => aiScenario(b.dataset.p));
  document.querySelectorAll('.ai-summary').forEach(b => b.onclick = () => aiSummary(b.dataset.p));
  document.querySelectorAll('.ai-smoke').forEach(b => b.onclick = () => genSmoke(b.dataset.p));
  document.querySelectorAll('.ai-explain').forEach(b => b.onclick = () => aiExplain(b.dataset.detail, b.dataset.title));
  document.querySelectorAll('.rp-matrix').forEach(b => b.onclick = () => matrixModal(b.dataset.p));
  document.querySelectorAll('.ai-fixcode').forEach(b => b.onclick = () => fixCodeModal(b.dataset.p, b.dataset.f, b.dataset.instr || ''));
  document.querySelectorAll('.qa-autofix').forEach(b => b.onclick = () => runAutofix(b.dataset.p, b));
  wireMenus();
}
// One-click safe auto-fix, then re-run.
async function runAutofix(p, btn) {
  if (!confirm('Apply safe formatters (dart format / pint / prettier) to this project? Commit first — changes are written to disk.')) return;
  let prev; if (btn) { prev = btn.innerHTML; btn.disabled = true; btn.innerHTML = spinner('Fixing…'); }
  const r = await postJson('/api/qa/autofix', { path: p }).catch(e => ({ error: e.message }));
  if (btn) { btn.disabled = false; btn.innerHTML = prev; }
  if (r.error) return toast(r.error, 'err');
  if (!r.ok) return toast(r.note || 'No safe auto-fixers for this project', 'warn');
  toast('Auto-fix applied (' + r.steps.map(s => s.cmd).join(', ') + ') — re-running', 'ok');
  runQa(p, {});
}
