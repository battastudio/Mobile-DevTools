// Build Helper frontend — the build runner (source design). POSTs /api/build then drives the UI by
// POLLING /api/build/log (server buffers every event) so the live log survives navigation. Handles
// the step/line log, inline guard prompts, per-env build summary, and Stop.
'use strict';

async function syncStatus() {
  let st; try { st = await fetch('/api/build/status').then((r) => r.json()); } catch { return null; }
  BUILDING = !!st.busy; return st;
}

function logSetup() {
  const box = el('#log'); box.innerHTML = ''; let curBody = null;
  const auto = () => { if (el('#autoscroll') && el('#autoscroll').checked) box.scrollTop = box.scrollHeight; };
  return {
    step(text, ms) { const d = $(`<details class="step mt-1" open><summary class="text-emerald-300 font-semibold">▸ ${esc(text)} <span class="text-slate-500 font-normal">${ms != null ? '· ' + (ms / 1000).toFixed(1) + 's' : ''}</span></summary><div class="pl-3 border-l border-edge mt-1"></div></details>`); box.appendChild(d); curBody = d.querySelector('div'); auto(); },
    line(s, cls = '') { const line = stripAnsi(s); const d = document.createElement('div'); if (cls) d.className = cls; else if (/error|exception|✖|failed/i.test(line)) d.className = 'text-rose-400'; else if (/warning|⚠/i.test(line)) d.className = 'text-amber-300'; d.textContent = line; (curBody || box).appendChild(d); auto(); },
  };
}

async function tryBuild() {
  const st = await syncStatus();
  if (st && st.busy) { toast(`Building ${st.info?.project || ''} ${st.info?.env || ''} — press Stop to cancel`, 'warn'); return; }
  const p = collectPayload(); if (!p) return;
  const bs = el('#buildsummary'); if (bs) bs.innerHTML = '';
  runOne(p);
}

function setBuildBtn(running) {
  const btn = el('#build'); if (!btn) return;
  if (running) { btn.disabled = false; btn.textContent = '■ Stop'; btn.classList.remove('btn-primary'); btn.classList.add('bg-rose-500', 'text-white'); btn.onclick = () => { btn.disabled = true; btn.textContent = 'Stopping…'; fetch('/api/build/stop', { method: 'POST' }); }; }
  else { btn.disabled = false; btn.innerHTML = (window.ICON ? ICON.rocket : '') + 'Build'; btn.classList.remove('bg-rose-500', 'text-white'); btn.classList.add('btn-primary'); btn.onclick = tryBuild; }
}

function applyBuildEvent(t, d) {
  if (t === 'log') LOG && LOG.line(d.line);
  else if (t === 'step') LOG && LOG.step(d.text, d.elapsedMs);
  else if (t === 'done-env') { if (d.record && d.record.buildOk === false) LOG && LOG.line('✖ ' + d.env + ' failed', 'text-rose-400 font-semibold'); else { LOG && LOG.line('✔ ' + d.env + ' done', 'text-emerald-400 font-semibold'); if (d.record && BUILDLOG) BUILDLOG.records.push(d.record); } }
  else if (t === 'done') { if (BUILDLOG) BUILDLOG.gotDone = { built: d.built || 0, failed: d.failed || 0 }; }
  else if (t === 'error') handleBuildError(d, BUILDLOG && BUILDLOG.payload);
}

function pollBuildLog() {
  if (!BUILDLOG) return; BUILDLOG.timer = null;
  fetch('/api/build/log?since=' + (BUILDLOG.seq || 0)).then((r) => r.json()).then((r) => {
    if (!BUILDLOG) return;
    for (const ev of (r.events || [])) { BUILDLOG.seq = ev.seq; applyBuildEvent(ev.event, ev.data); }
    if (r.busy) BUILDLOG.timer = setTimeout(pollBuildLog, 1000); else finalizeBuild();
  }).catch(() => { if (BUILDLOG) BUILDLOG.timer = setTimeout(pollBuildLog, 1500); });
}

function finalizeBuild() {
  const bl = BUILDLOG; BUILDLOG = null; BUILDING = false;
  if (bl && bl.timer) clearTimeout(bl.timer);
  setBuildBtn(false);
  if (bl && bl.gotDone) toast(`Done — built ${bl.gotDone.built} · failed ${bl.gotDone.failed}`, bl.gotDone.failed ? 'warn' : 'ok');
  const recs = (bl && bl.records) || [];
  renderBuildSummary(recs);
  if (recs.length && window.offerShare) offerShare(recs);
  if (recs.length && window.postTeamCards) postTeamCards(recs);
  if (CUR && CUR.app) fetch('/api/project?path=' + encodeURIComponent(CUR.app.path)).then((r) => r.json()).then((d) => { CUR = d; if (el('#history')) renderHistory(d.builds); });
  if (bl && bl.done) bl.done();
}

function runOne(payload, extra = {}) {
  if (BUILDLOG) { toast('A build is already running', 'warn'); return Promise.resolve(); }
  BUILDING = true; LOG = logSetup();
  return new Promise((resolve) => {
    BUILDLOG = { seq: 0, payload: { ...payload, ...extra }, records: [], timer: null, active: true, path: (CUR && CUR.app && CUR.app.path) || '', done: resolve };
    setBuildBtn(true);
    fetch('/api/build', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, ...extra }) }).then((res) => { const rd = res.body.getReader(); const drain = () => rd.read().then(({ done }) => done ? null : drain()).catch(() => {}); return drain(); }).catch(() => {});
    pollBuildLog();
  });
}

function renderBuildSummary(recs) {
  const box = el('#buildsummary'); if (!box) return;
  if (!recs || !recs.length) { box.innerHTML = ''; return; }
  const DLBL = { onedrive: 'OneDrive', firebase: 'Firebase', play: 'Play', testflight: 'TestFlight' };
  const rows = recs.map((r) => {
    const env = (r.env || '').toUpperCase(), c = ENV_COLOR[r.env] || 'slate', ok = r.buildOk !== false;
    const ver = r.version || ((r.buildName || '') + (r.buildNumber ? '+' + r.buildNumber : '')), up = r.upload || {};
    const link = (dest) => dest === 'onedrive' ? (r.onedriveUrl || ((r.artifacts || []).find((x) => x && x.onedriveUrl) || {}).onedriveUrl || '') : (dest === 'testflight' ? ((r.testflight && r.testflight.url) || '') : '');
    const chips = Object.keys(DLBL).filter((dest) => up[dest] && up[dest] !== 'skipped').map((dest) => { const okd = up[dest] === 'ok', u = link(dest), inner = (okd ? '✓ ' : '✗ ') + DLBL[dest], cls = okd ? 'text-emerald-300 bg-emerald-500/10' : 'text-rose-300 bg-rose-500/10'; return (u && okd) ? `<a href="${esc(u)}" target="_blank" rel="noopener" class="rounded px-1.5 py-0.5 ${cls} hover:underline">${inner} ↗</a>` : `<span class="rounded px-1.5 py-0.5 ${cls}">${inner}</span>`; }).join(' ');
    return `<div class="flex items-start gap-2 text-xs py-1"><span class="mt-0.5">${badge(env, c)}</span><div class="min-w-0"><span class="font-mono text-slate-300">${esc(ver)}</span> ${ok ? '<span class="text-emerald-400">✓ built</span>' : '<span class="text-rose-400">✗ failed</span>'}<div class="flex flex-wrap gap-1 mt-1">${chips || '<span class="text-slate-500">built locally · no upload</span>'}</div></div></div>`;
  }).join('');
  box.innerHTML = `<div class="surface p-4"><div class="flex items-center mb-2"><div class="font-semibold text-sm">Build summary</div><button id="bs-close" class="ml-auto text-slate-500 hover:text-slate-300 text-xs" title="Dismiss">✕</button></div>${rows}</div>`;
  const cl = el('#bs-close'); if (cl) cl.onclick = () => { box.innerHTML = ''; };
}

function handleBuildError(d, payload) {
  const LG = el('#log');
  if (!LG || !payload) { const m = document.createElement('div'); m.className = 'text-rose-400 font-semibold'; m.textContent = '✖ ' + (d.message || ''); if (LG) LG.appendChild(m); toast(d.message || 'Build error', 'err'); return; }
  if (d.kind === 'confirm') { const bar = $(`<div class="mt-2 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-200"><div class="mb-2">⚠ ${esc(d.message)}</div><button class="rounded bg-rose-500 text-white px-3 py-1 font-semibold">Publish to production</button> <button class="cancel rounded border border-edge px-3 py-1 ml-1">Cancel</button></div>`); bar.querySelector('button').onclick = () => { bar.remove(); runOne({ ...payload, confirmProd: true }); }; bar.querySelector('.cancel').onclick = () => bar.remove(); LG.appendChild(bar); }
  else if (d.kind === 'dirty' || d.kind === 'duplicate') { toast(d.message.split('\n')[0] + ' — click Build anyway', 'warn'); const bar = $(`<div class="mt-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200"><div class="whitespace-pre-wrap mb-2">${esc(d.message)}</div><button class="rounded bg-amber-500 text-ink px-3 py-1 font-semibold">Build anyway</button></div>`); bar.querySelector('button').onclick = () => { bar.remove(); runOne({ ...payload, allowDirty: true, allowDuplicate: true }); }; LG.appendChild(bar); }
  else if (d.kind === 'lowVersion') { toast(d.message.split('\n')[0] + ' — bump the app version', 'warn'); const useLbl = d.suggested ? `Use ${esc(d.suggested)} &amp; build` : 'Fix &amp; build'; const bar = $(`<div class="mt-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200"><div class="whitespace-pre-wrap mb-2">⚠ ${esc(d.message)}</div><button class="usefix rounded bg-amber-500 text-ink px-3 py-1 font-semibold">${useLbl}</button> <button class="anyway rounded border border-edge px-3 py-1 ml-1">Build anyway</button></div>`); bar.querySelector('.usefix').onclick = () => { const fixes = d.fixes || []; const envs = (payload.envs || []).map((e) => { const f = fixes.find((x) => x.env === e.env); return f ? { ...e, buildName: f.suggested } : e; }); fixes.forEach((f) => { const inp = document.querySelector(`[data-env="${f.env}"] .bname`); if (inp) inp.value = f.suggested; }); bar.remove(); runOne({ ...payload, envs, allowLowVersion: true }); }; bar.querySelector('.anyway').onclick = () => { bar.remove(); runOne({ ...payload, allowLowVersion: true }); }; LG.appendChild(bar); }
  else { const m = document.createElement('div'); m.className = 'text-rose-400 font-semibold'; m.textContent = '✖ ' + d.message; LG.appendChild(m); toast(d.message, 'err'); }
}

function reattachBuildLog() {
  fetch('/api/build/log?since=0').then((r) => r.json()).then((r) => {
    if (!r.busy) return;
    const forThis = CUR && CUR.app && (r.path === CUR.app.path || (r.info && r.info.project === CUR.app.name));
    if (!forThis) return;
    BUILDING = true; LOG = logSetup(); setBuildBtn(true);
    if (!BUILDLOG) BUILDLOG = { seq: 0, payload: null, records: [], timer: null, active: true, path: r.path || '' };
    else { if (BUILDLOG.timer) clearTimeout(BUILDLOG.timer); BUILDLOG.seq = 0; }
    pollBuildLog();
  }).catch(() => {});
}

// Best-effort header TestFlight readout (tolerant of our /api/testflight/latest shape).
async function loadTestFlightLatest(path) {
  const set = (html) => { const t = el('#tf-latest'); if (t && CUR && CUR.app && CUR.app.path === path) t.innerHTML = html; };
  try {
    const r = await fetch('/api/testflight/latest?path=' + encodeURIComponent(path)).then((r) => r.json());
    if (r && r.url) set(`<a href="${esc(r.url)}" target="_blank" rel="noopener" style="color:var(--iris2)">${esc(r.state || 'App Store Connect')} ▸</a>`);
    else set('<span style="color:var(--muted)">—</span>');
  } catch { set('<span style="color:var(--muted)">unavailable</span>'); }
}
