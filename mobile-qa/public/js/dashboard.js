// [split from app.js] Dashboard + results rendering (render/appsList/results/runnerRow).
function render() {
  const ov = QA.data.overall || {};
  const opts = [`<option value="">Select a project…</option>`].concat(QA.projects.map(p => `<option value="${esc(p.path)}" ${QA.sel === p.path ? 'selected' : ''}>${esc(p.name)} · ${esc(p.type)}</option>`)).join('');
  const runForm = QA.view === 'run' ? `<div class="surface p-4 mb-4">
      <div class="card-head mb-3">${ICON.flask}<div class="font-semibold">Run QA on a project</div></div>
      <div class="flex flex-wrap items-end gap-2">
        <div class="min-w-[220px]"><div class="text-[11px] text-slate-500 mb-1">Project</div><select id="qaproj" class="field text-sm">${opts}</select></div>
        <div class="flex-1 min-w-[180px]"><div class="text-[11px] text-slate-500 mb-1">…or a path</div><input id="qapath" class="field text-sm w-full font-mono" placeholder="/Users/you/projects/app" value="${esc(QA.path || '')}"/></div>
        <button id="runone" data-cap="run" class="btn btn-primary text-sm">${ICON.play}Run QA</button>
      </div>
      <div class="flex flex-wrap items-end gap-2 mt-2">
        <div class="flex-1 min-w-[220px]"><div class="text-[11px] text-slate-500 mb-1">Live URL (adds SEO / accessibility / performance / best-practices audit)</div><input id="qaurl" class="field text-sm w-full font-mono" placeholder="https://your-site.com" value="${esc(QA.url || '')}"/></div>
        ${deviceRowHtml()}
      </div>
      <div class="text-[10px] text-slate-500 mt-2">Flutter: analyze/test/coverage/integration/golden · Laravel: artisan test/pint · Web: typecheck/lint/test/build/e2e + test-gap. Integration tests run on the selected device; everything else runs headless. Builds/tests can take a while.</div>
      <div id="qalog" class="log mt-3 h-40 overflow-auto rounded-xl p-3 text-slate-300 whitespace-pre-wrap hidden border border-edge" style="background:var(--sunken)"></div>
    </div>` : '';
  el('#qabody').innerHTML = `
    <div class="mb-5"><div class="text-[11px] uppercase tracking-[.24em] font-semibold mb-1.5" style="color:var(--brand2)">QA & Testing</div>
      <h1 class="font-display text-2xl font-bold" style="color:var(--ink)">Quality console</h1>
      <div class="readout text-xs text-slate-500 mt-1">Tests, coverage, analysis, lint and sign-off — one grade per project.</div></div>
    <div class="grid sm:grid-cols-4 gap-3 mb-5">
      <div class="surface p-4 flex items-center gap-3">${gradeBox(ov.avg != null ? ov.letter : null, ov.avg, true)}<div><div class="text-[11px] uppercase tracking-wider text-slate-500">Overall</div><div class="text-xs text-slate-400 mt-1">${ov.scanned || 0} project${ov.scanned === 1 ? '' : 's'} run</div></div></div>
      ${miniStat('Failing checks', ov.totalFail || 0, (ov.totalFail ? 'crit' : 'good'))}
      ${miniStat('Weakest', ov.worst ? ov.worst.name + ' (' + ov.worst.grade.letter + ')' : '—', 'slate')}
      <div class="surface p-4"><div class="text-[11px] uppercase tracking-wider text-slate-500 mb-2">Sweep</div><button id="runall" data-cap="run" class="btn btn-primary text-sm w-full">${ICON.flask}Run all</button></div>
    </div>
    ${runForm}
    <div id="qaresults">${QA.last ? resultsHtml(QA.last) : appsListHtml()}</div>`;
  wire();
}

function appsListHtml() {
  let apps = (QA.data.apps || []).filter(a => a.grade).sort((a, b) => a.grade.score - b.grade.score);
  const q = (QA.search || '').toLowerCase();
  if (q) apps = apps.filter(a => (a.name || '').toLowerCase().includes(q));
  const search = `<div class="flex items-center gap-2 mb-3"><div class="text-sm font-semibold">Projects</div>${(QA.data.apps || []).filter(a => a.grade).length > 3 ? `<input id="qasearch" class="field text-xs ml-auto max-w-[220px]" placeholder="Search projects…  (⌘K)" value="${esc(QA.search || '')}"/>` : ''}</div>`;
  if (!apps.length) {
    if (q) return `<div class="surface p-4">${search}<div class="text-center text-slate-500 text-sm py-6">No project matches “${esc(q)}”.</div></div>`;
    return `<div class="surface p-8 text-center"><div class="mx-auto mb-3 opacity-60">${ICON.flask}</div><div class="text-slate-300 font-medium">No QA runs yet</div><div class="text-slate-500 text-sm mt-1 mb-4">Run quality checks on a project to see its grade, trends and fixes.</div><button id="empty-run" data-cap="run" class="btn btn-primary text-sm">${ICON.play}Run QA</button></div>`;
  }
  return `<div class="surface p-4">${search}<div class="space-y-1.5">${apps.map(a => `
    <button class="qaopen qa-card w-full flex items-center gap-3 rounded-xl border border-edge px-3 py-2.5 text-left" data-p="${esc(a.path)}" style="background:var(--panel)">
      ${gradeBox(a.grade.letter, a.grade.score)}<span class="text-[13px] font-medium text-slate-200 truncate">${esc(a.name)}</span>
      <span class="text-[10px] uppercase tracking-wide text-slate-500">${esc(a.type)}</span>
      <span class="text-xs text-slate-500 whitespace-nowrap">${a.grade.counts.fail || 0} failing · ${a.grade.counts.pass || 0} pass</span>
      ${a.history && a.history.length > 1 ? `<span class="ml-auto">${sparkline(a.history, 60, 18)}</span><span class="text-[11px] text-slate-500 whitespace-nowrap">${a.ranAt ? relTime(a.ranAt) : ''}</span>` : `<span class="ml-auto text-[11px] text-slate-500">${a.ranAt ? relTime(a.ranAt) : ''}</span>`}</button>`).join('')}</div></div>`;
}

function summaryHtml(sum) {
  const keys = Object.keys(sum || {}); if (!keys.length) return '';
  return `<div class="surface p-4 mb-3"><div class="text-sm font-semibold mb-2.5">Quality summary</div><div class="flex flex-wrap gap-2">${CAT_GROUP.filter(c => sum[c]).map(c => {
    const s = sum[c]; return `<span class="${ST_CHIP[s.status]}">${esc(c)}: ${ST_TEXT[s.status]}${s.metric ? ' · ' + esc(s.metric) : ''}</span>`;
  }).join('')}</div></div>`;
}
function trendHtml(rec) {
  const d = rec.delta; if (!d && !(rec.history || []).length) return '';
  const chg = d ? d.scoreChange : 0;
  const arrow = chg > 0 ? `<span class="text-emerald-400">▲ +${chg}</span>` : chg < 0 ? `<span class="text-rose-400">▼ ${chg}</span>` : `<span class="text-slate-500">no change</span>`;
  return `<div class="surface p-3 mb-3 flex items-center gap-4 text-xs"><div class="flex items-center gap-1.5"><span class="text-slate-500">Since last run</span> ${arrow}</div>${d && d.newFailures.length ? `<span class="text-rose-400">${d.newFailures.length} new failing</span>` : ''}${d && d.fixed.length ? `<span class="text-emerald-400">${d.fixed.length} fixed</span>` : ''}</div>`;
}
function resultsHtml(rec) {
  if (!rec || rec.ran === false) return appsListHtml();
  const g = rec.grade || { letter: '—', score: 0, counts: {} };
  const order = { fail: 0, warn: 1, pass: 2, ok: 2, na: 3 };
  const all = (rec.results || []).slice().sort((a, b) => (order[a.status] - order[b.status]) || (SEVORD[a.severity] - SEVORD[b.severity]));
  const newIds = new Set((rec.delta && rec.delta.newFailures) || []);
  return `<div class="flex items-center gap-3 mb-3">
      <button id="qaback" class="btn btn-ghost text-xs px-2 py-1">← all projects</button>${gradeBox(g.letter, g.score)}
      <div><div class="font-semibold">${esc(rec.name)} <span class="text-[10px] uppercase tracking-wide text-slate-500">${esc(rec.type || '')}</span></div>
      <div class="text-xs text-slate-500">${g.score}/100 · ${g.counts.fail || 0} failing · ${g.counts.pass || 0} pass · ran ${rec.ranAt ? relTime(rec.ranAt) : '—'}</div></div>
      <a href="/api/qa/report?path=${encodeURIComponent(rec.path)}" target="_blank" class="btn btn-secondary text-xs ml-auto">Export report</a>
      <button class="btn btn-ghost text-xs qashare" data-p="${esc(rec.path)}" title="Share results + report with the team via OneDrive">${ICON.link || ''}Share to team</button>
      <button class="btn btn-ghost text-xs qajira" data-p="${esc(rec.path)}" title="Create a Jira issue from this report">${ICON.plug || ''}Jira issue</button></div>
    ${actionToolbar(rec.path, {})}
    ${trendHtml(rec)}${catBreakdownHtml(rec.summary)}
    <div class="space-y-2">${all.map(f => runnerRow(f, newIds.has(f.id), rec.path)).join('')}</div>
    ${aiPlanHtml(rec)}${testPlanHtml(rec)}`;
}
// TestSprite-style "test plan": untested files with AI-generate + scaffold actions.
function testPlanHtml(rec) {
  const files = rec.untested || []; if (!files.length) return '';
  const rows = files.slice(0, 40).map(f => `<div class="flex items-center gap-2 py-1 text-[12px]">
      <span class="font-mono text-slate-300 truncate flex-1">${esc(f)}</span>
      <button class="btn btn-secondary text-[11px] px-2 py-0.5 gen-ai" data-p="${esc(rec.path)}" data-f="${esc(f)}" title="Generate a test with AI">${ICON.flask}AI test</button>
      <button class="btn btn-ghost text-[11px] px-2 py-0.5 gen-stub" data-p="${esc(rec.path)}" data-f="${esc(f)}" title="Scaffold an empty test stub">stub</button>
    </div>`).join('');
  return `<details class="surface p-4 mt-3">
      <summary class="flex items-center gap-2 cursor-pointer select-none"><div class="text-sm font-semibold">Test plan — ${files.length} untested file${files.length === 1 ? '' : 's'}</div><span class="text-[11px] text-slate-500">▾ show</span>
        ${QA.platform === 'web' ? `<button id="scaffold-e2e" class="btn btn-ghost text-[11px] px-2 py-0.5 ml-auto" title="Scaffold a Playwright smoke suite">Scaffold E2E</button>` : ''}</summary>
      <div class="divide-y divide-edge/40 mt-2 max-h-[30rem] overflow-auto">${rows}</div>
      ${files.length > 40 ? `<div class="text-[10px] text-slate-500 mt-2">+${files.length - 40} more…</div>` : ''}</details>`;
}
function runnerRow(f, isNew, projPath) {
  const ring = f.status === 'fail' ? ' ring-1 ring-inset ring-rose-500/25' : '';
  const newTag = isNew ? `<span class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300">NEW</span>` : '';
  const canExplain = (f.status === 'fail' || f.status === 'warn') && f.kind !== 'manual' && !!f.detail;
  const explainBtn = canExplain ? `<button class="btn btn-secondary text-[11px] px-2 py-0.5 mt-2 ai-explain" data-detail="${esc(f.detail || '').slice(0, 4000)}" data-title="${esc(f.title)}" title="AI: explain this failure and how to fix it">${ICON.flask}Explain (AI)</button>` : '';
  return `<details class="surface p-0 overflow-hidden${ring}">
    <summary class="flex items-center gap-3 px-4 py-2.5 cursor-pointer select-none">
      <span class="${ST_CHIP[f.status]}">${ST_TEXT[f.status]}</span>${newTag}
      <span class="text-[13px] font-medium text-slate-200">${esc(f.title)}</span>
      ${f.metric ? `<span class="text-[11px] font-mono text-slate-400">${esc(f.metric)}</span>` : ''}
      <span class="text-[10px] uppercase tracking-wide text-slate-500 hidden sm:inline">${esc(f.category)}</span>
      <span class="ml-auto">${badge(SEV_LABEL[f.severity] || f.severity, SEV_COLOR[f.severity] || 'slate')}</span>
    </summary>
    <div class="px-4 pb-3 pt-1 border-t border-edge/50">
      ${f.detail ? `<pre class="text-[11px] text-slate-400 whitespace-pre-wrap font-mono mt-2">${esc(f.detail)}</pre>` : ''}
      ${f.fix ? `<div class="mt-2.5 text-[10px] uppercase tracking-wide text-emerald-400/80 mb-1">How to improve${f.kind === 'manual' ? ' (manual)' : ''}</div><pre class="text-[11px] text-slate-300 whitespace-pre-wrap font-mono bg-ink/60 rounded-lg p-2.5">${esc(f.fix)}</pre>` : ''}
      ${fixFilesHtml(projPath || curPath(), f.files, f.fix)}
      ${explainBtn}
    </div></details>`;
}
