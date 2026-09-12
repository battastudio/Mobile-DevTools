// Build Helper frontend — running a build. Fires /api/build, then drives the UI by POLLING
// /api/build/log (the server buffers every event in running.log) so the live log survives navigating
// away and back. Handles inline guard prompts, per-env summaries, and the build-history list.
'use strict';

let _pollTimer = null, _lastSeq = 0;

function writeLine(box, s, cls) {
  if (!box) return;
  const d = document.createElement('div'); if (cls) d.className = cls;
  d.textContent = window.stripAnsi ? stripAnsi(s) : s;
  box.appendChild(d); box.scrollTop = box.scrollHeight;
}

function doBuild(allow) {
  const req = BF.collectBuild(allow);
  if (!req.envs.length) return toast('Pick at least one environment', 'warn');
  if (!req.artifacts.length) return toast('Pick at least one artifact (APK/AAB/IPA)', 'warn');
  ['#bh-term', '#bh-guard', '#bh-summary'].forEach((s) => { const b = el(s); if (b) b.innerHTML = ''; });
  const btn = el('#bh-build'); if (btn) btn.disabled = true;
  _lastSeq = 0;
  // Fire-and-forget: the server keeps building even if this response is never read; the poller drives UI.
  fetch('/api/build', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req) }).catch(() => {});
  setTimeout(() => pollLog(true), 250);
}

async function pollLog(reset) {
  if (BH.view !== 'project') { clearTimeout(_pollTimer); return; } // stop when we leave the build screen
  if (reset) _lastSeq = 0;
  const r = await API.buildLog(_lastSeq).catch(() => null);
  const term = el('#bh-term');
  if (r && term && (!r.path || r.path === BH.sel)) for (const e of (r.events || [])) { _lastSeq = Math.max(_lastSeq, e.seq); handleEvent(e.event, e.data); }
  const btn = el('#bh-build'); if (btn) btn.disabled = !!(r && r.busy);
  if (r && r.busy) _pollTimer = setTimeout(() => pollLog(false), 1200);
}

function handleEvent(event, data) {
  const term = el('#bh-term');
  if (event === 'log') writeLine(term, data.line);
  else if (event === 'step') writeLine(term, '▸ ' + data.text, 'text-emerald-300 font-semibold mt-1');
  else if (event === 'error') data.kind ? renderGuard(data) : writeLine(term, '✖ ' + data.message, 'text-rose-400 font-semibold');
  else if (event === 'done-env') renderEnvSummary(data.record);
  else if (event === 'done') { writeLine(term, `✔ done — ${data.built || 0} built, ${data.failed || 0} failed`, 'text-emerald-400 font-semibold'); API.builds(BH.sel).then((x) => renderBuilds(x.builds || [])); }
}

// Inline guard prompt: dirty / duplicate / prod-confirm / low-version → override + rebuild.
function renderGuard(g) {
  const box = el('#bh-guard'); if (!box) return;
  const flag = { dirty: 'allowDirty', duplicate: 'allowDuplicate', confirm: 'confirmProd', lowVersion: 'allowLowVersion' }[g.kind];
  const use = g.kind === 'lowVersion' ? `<button id="g-use" class="btn btn-primary text-xs">Use ${esc(g.suggested || '')}</button>` : '';
  box.innerHTML = `<div class="surface p-3" style="border:1px solid color-mix(in srgb,var(--warn) 45%,var(--edge))">
    <div class="text-[12px] whitespace-pre-wrap mb-2" style="color:var(--warn)">${esc(g.message)}</div>
    <div class="flex gap-2">${use}<button id="g-anyway" class="btn btn-secondary text-xs">${g.kind === 'confirm' ? 'Publish anyway' : 'Build anyway'}</button><button id="g-cancel" class="btn btn-ghost text-xs">Cancel</button></div></div>`;
  el('#g-anyway').onclick = () => { box.innerHTML = ''; doBuild({ [flag]: true }); };
  el('#g-cancel').onclick = () => { box.innerHTML = ''; };
  const u = el('#g-use'); if (u) u.onclick = () => { (g.fixes || []).forEach((f) => { const inp = _body().querySelector(`.bh-ver[data-env="${f.env}"]`); if (inp) inp.value = f.suggested; }); box.innerHTML = ''; doBuild({ allowLowVersion: true }); };
}

// Per-env result card appended under the log as each env finishes.
function renderEnvSummary(r) {
  const box = el('#bh-summary'); if (!box || !r) return;
  const up = Object.entries(r.upload || {}).filter(([, v]) => v === 'ok').map(([k]) => k);
  const arts = (r.artifacts || []).map((a) => `<a class="text-brand hover:underline" href="/artifact?path=${encodeURIComponent(a.url || '')}" target="_blank">${esc(a.name)}</a>`).join(' · ');
  box.insertAdjacentHTML('beforeend', `<div class="surface p-3 text-sm">
    <div class="flex items-center gap-2"><span class="${r.buildOk === false ? 'text-rose-300' : 'text-emerald-300'}">${r.buildOk === false ? '✗' : '✓'}</span>
      <b>${esc(r.env || '')}</b> v${esc(verName(r.version))} <span class="text-slate-500 text-xs">${up.length ? '↑ ' + up.join(', ') : ''}</span>
      <button class="btn btn-ghost text-[11px] ml-auto" data-share="1">Share</button><button class="btn btn-ghost text-[11px]" data-detail="1">Details</button></div>
    ${arts ? `<div class="text-[11px] mt-1">${arts}</div>` : ''}</div>`);
  const last = box.lastElementChild;
  last.querySelector('[data-share]').onclick = () => (window.openShare ? openShare(r) : toast('Open the build detail to share.', 'info'));
  last.querySelector('[data-detail]').onclick = () => (window.V.detail ? V.detail(r.time) : null);
}

function renderBuilds(builds) {
  const box = el('#bh-builds'); if (!box) return;
  window.renderHistory ? renderHistory(box, builds) : (box.innerHTML = builds.length ? builds.slice(0, 20).map((b) => `<div data-detail="${esc(b.time)}" class="cursor-pointer">${C.buildRow(b)}</div>`).join('') : '<div class="text-xs text-slate-500">No builds yet for this app.</div>');
  if (!window.renderHistory) box.querySelectorAll('[data-detail]').forEach((d) => d.onclick = () => (window.V.detail ? V.detail(d.dataset.detail) : null));
}

// On entering the build screen: if a build for THIS project is already running, replay + keep polling.
async function reattachBuild() {
  const r = await API.buildLog(0).catch(() => null);
  if (r && r.busy && r.path === BH.sel) pollLog(true);
}
