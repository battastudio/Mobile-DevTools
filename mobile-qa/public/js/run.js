// [split from app.js] Pipeline/QA run + SSE + top-level wiring (runPipeline/runQa/wire).
// ---- Build-Helper-style pipeline run (detail view): live stages + terminal log in the sticky panel ----
function runPipeline(path, opts = {}) {
  if (QA.running) { toast('A run is already in progress', 'warn'); return; }
  const box = el('#detaillog'); const statusEl = el('#rp-status'), stopBtn = el('#rp-stop'), elapsedEl = el('#rp-elapsed');
  if (!box) { return runQa(path, opts); }   // fallback if the panel isn't present
  QA.running = true; QA.stages = []; QA.stageStatus = {};
  const LOG = logSetup(box);
  const t0 = Date.now(); const timer = setInterval(() => { if (elapsedEl) elapsedEl.textContent = ((Date.now() - t0) / 1000).toFixed(0) + 's'; }, 500);
  if (statusEl) { statusEl.className = 'status run'; statusEl.textContent = 'Running…'; }
  const ac = new AbortController(); QA.abort = ac;
  if (stopBtn) { stopBtn.classList.remove('hidden'); stopBtn.onclick = () => { try { ac.abort(); } catch {} }; }
  const titleOf = (id) => (QA.stages.find(s => s.id === id) || {}).title || id;
  // map a runner id → the test types it backs, so run steps light the right stations.
  const typesByRunner = {}; ((QA.tt && QA.tt.types) || []).forEach(t => (t.runnerIds || []).forEach(rid => { (typesByRunner[rid] = typesByRunner[rid] || []).push(t.id); }));
  const setRunnerStatus = (rid, st) => { (typesByRunner[rid] || []).forEach(tid => { QA.stageStatus[tid] = st; }); renderPipe(); };
  const body = { path, url: opts.url ?? QA.url ?? '', types: opts.types || null, device: opts.device ?? QA.device ?? '' };
  LOG.line('▸ starting…', 'text-slate-500');
  fetch('/api/qa/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ac.signal }).then((res) => {
    const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = '';
    const pump = () => reader.read().then(({ done, value }) => {
      if (done) return finish();
      buf += dec.decode(value, { stream: true }); let i;
      while ((i = buf.indexOf('\n\n')) >= 0) { const chunk = buf.slice(0, i); buf = buf.slice(i + 2);
        const ev = /event: (.+)/.exec(chunk), dt = /data: ([\s\S]+)/.exec(chunk); if (!ev || !dt) continue;
        let d; try { d = JSON.parse(dt[1]); } catch { continue; }
        const t = ev[1];
        if (t === 'step') {
          if (d.kind === 'stages') { QA.stages = d.stages || []; }
          else if (d.kind === 'step') {
            if (d.status === 'running') { setRunnerStatus(d.id, 'running'); LOG.step(titleOf(d.id)); }
            else { setRunnerStatus(d.id, d.status); LOG.finish(titleOf(d.id) + (d.metric ? ' — ' + d.metric : ''), d.ms); }
          }
        } else if (t === 'log') { if (!/^\s*(▸ QA |  … |  [✔✖!·] )/.test(d.line)) LOG.line(d.line); }
        else if (t === 'error') { LOG.line('✖ ' + d.message, 'text-rose-400 font-semibold'); }
      }
      return pump();
    });
    return pump();
  }).catch((e) => { if (ac.signal.aborted) LOG.line('■ stopped', 'text-amber-300 font-semibold'); else LOG.line('✖ ' + (e.message || e), 'text-rose-400'); finish(); });

  async function finish() {
    if (!QA.running) return; QA.running = false; clearInterval(timer);
    if (stopBtn) stopBtn.classList.add('hidden');
    const aborted = ac.signal.aborted;
    QA.data = await fetch('/api/qa/all').then(r => r.json()).catch(() => QA.data);
    const rec = await fetch('/api/qa?path=' + encodeURIComponent(path)).then(r => r.json()).catch(() => QA.rec);
    const tt = await fetch('/api/qa/testtypes?path=' + encodeURIComponent(path)).then(r => r.json()).catch(() => QA.tt);
    QA.rec = rec; QA.tt = tt;
    const g = rec && rec.grade;
    if (statusEl) { if (aborted) { statusEl.className = 'status off'; statusEl.textContent = 'stopped'; } else if (g) { statusEl.className = 'status ' + (g.counts.fail ? 'fail' : g.counts.warn ? 'run' : 'ok'); statusEl.textContent = 'Grade ' + g.letter + ' · ' + g.score + '/100'; } else { statusEl.className = 'status off'; statusEl.textContent = 'done'; } }
    if (el('#qa-grade') && g) el('#qa-grade').innerHTML = gradeBox(g.letter, g.score);
    if (el('#qa-meta') && g) el('#qa-meta').textContent = metaLine(g, rec);
    if (el('#qa-left') && tt) { el('#qa-left').innerHTML = detailLeftHtml(tt, rec); wireDetail(); }
  }
}
function runQa(projPath, opts = {}) {
  QA.sel = projPath;
  let box = el('#qalog') || el('#detaillog'); if (box) { box.classList.remove('hidden'); box.innerHTML = ''; } else box = { appendChild() {}, scrollTop: 0, innerHTML: '', querySelector() { return null; }, classList: { remove() {} } };
  const label = (opts.types && opts.types.length) ? opts.types.join(', ') : (projPath ? 'all test types' : 'all projects');
  const spin = document.createElement('div'); spin.id = 'runspin'; spin.className = 'py-1'; spin.innerHTML = spinner('Running ' + label + '… (real test runs can take a while)');
  box.appendChild(spin);
  const body = projPath ? { path: projPath, url: opts.url ?? QA.url ?? '', types: opts.types || null, device: opts.device ?? QA.device ?? '' } : {};
  streamSSE('/api/qa/run', body, box, async () => {
    const sp = box.querySelector && box.querySelector('#runspin'); if (sp) sp.remove();
    const logHtml = box.innerHTML;
    QA.data = await fetch('/api/qa/all').then(r => r.json()).catch(() => QA.data);
    if (QA.detailPath && projPath === QA.detailPath) { await refreshDetail(projPath); return restoreLog(logHtml); }   // update in place, no flash
    QA.last = projPath ? await fetch('/api/qa?path=' + encodeURIComponent(projPath)).then(r => r.json()).catch(() => null) : null;
    if (QA.last && QA.last.ran === false) QA.last = null;
    const y = window.scrollY; render(); window.scrollTo(0, y);
    restoreLog(logHtml);
  });
}
// Re-fetch + re-render the detail view in place (only #qabody) — no #app teardown, no "Loading…" flash.
async function refreshDetail(path) {
  const y = window.scrollY;
  const [tt, rec] = await Promise.all([
    fetch('/api/qa/testtypes?path=' + encodeURIComponent(path)).then(r => r.json()).catch(() => QA.tt),
    fetch('/api/qa?path=' + encodeURIComponent(path)).then(r => r.json()).catch(() => QA.rec),
  ]);
  QA.tt = tt; QA.rec = rec; renderDetail();
  window.scrollTo(0, y);
}
function wire() {
  const proj = el('#qaproj'); if (proj) proj.onchange = () => QA.sel = proj.value;
  const pathIn = el('#qapath'); if (pathIn) pathIn.oninput = () => QA.path = pathIn.value.trim();
  const urlIn = el('#qaurl'); if (urlIn) urlIn.oninput = () => QA.url = urlIn.value.trim();
  const one = el('#runone'); if (one) one.onclick = () => { const p = (el('#qapath')?.value || '').trim() || el('#qaproj').value; if (!p && !QA.url) { toast('Pick a project, a path, or a live URL', 'warn'); return; } runQa(p); };
  const all = el('#runall'); if (all) all.onclick = async () => { QA.last = null; if (QA.view !== 'run') await showApp('run'); runQa(''); };
  const back = el('#qaback'); if (back) back.onclick = () => { QA.last = null; render(); };
  const settings = el('#qasettings'); if (settings) settings.onclick = () => openSettings({ aiUrl: '/api/qa/config' });
  document.querySelectorAll('.qaopen').forEach(b => b.onclick = () => showProjectDetail(b.dataset.p));
  const sh = el('#qasearch'); if (sh) sh.oninput = () => { QA.search = sh.value; const box = el('#qaresults'); if (box) { box.innerHTML = QA.last ? resultsHtml(QA.last) : appsListHtml(); wire(); const n = el('#qasearch'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } } };
  const er = el('#empty-run'); if (er) er.onclick = () => showApp('run');
  document.querySelectorAll('.qashare').forEach(b => b.onclick = async () => {
    b.disabled = true; b.textContent = 'Sharing…';
    const r = await postJson('/api/qa/share', { path: b.dataset.p });
    b.disabled = false; b.textContent = 'Share to team';
    if (r.error) return toast(r.error, 'err');
    if (!r.shared) return toast('OneDrive not connected (' + (r.reason || '') + ')', 'warn');
    toast('Shared to team' + (r.report && r.report.url ? ' — link copied' : ''), 'ok');
    if (r.report && r.report.url) { try { navigator.clipboard.writeText(r.report.url); } catch {} }
  });
  document.querySelectorAll('.qajira').forEach(b => b.onclick = async () => {
    b.disabled = true; b.textContent = 'Creating…';
    const r = await postJson('/api/qa/share-jira', { path: b.dataset.p });
    b.disabled = false; b.textContent = 'Jira issue';
    if (!r.ok) return toast(r.error || 'Failed to create Jira issue', 'err');
    toast('Created ' + r.key, 'ok');
    if (r.url) window.open(r.url, '_blank', 'noopener');
  });
  document.querySelectorAll('.gen-ai').forEach(b => b.onclick = () => genTest(b.dataset.p, b.dataset.f, b.dataset.t));
  document.querySelectorAll('.gen-stub').forEach(b => b.onclick = async () => { b.disabled = true; const r = await postJson('/api/qa/scaffold/test', { path: b.dataset.p, file: b.dataset.f }); if (r.error) { toast(r.error, 'err'); b.disabled = false; } else toast('Scaffolded ' + r.written, 'ok'); });
  const e2e = el('#scaffold-e2e'); if (e2e) e2e.onclick = async () => { const r = await postJson('/api/qa/scaffold/e2e', { path: QA.last.path }); if (r.error) toast(r.error, 'err'); else toast('E2E scaffold: ' + (r.written.join(', ') || 'already present'), 'ok'); };
  wireAi();
}
