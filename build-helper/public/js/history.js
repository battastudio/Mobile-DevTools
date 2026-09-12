// Build Helper frontend — build-history list (window.renderHistory) with multi-select bulk actions:
// re-upload selected builds' artifacts to a target, share, or open details. Rows also open the
// detail view. Used by build-run.js renderBuilds() on the project screen.
'use strict';

function _selected(box) { return [...box.querySelectorAll('.bh-hsel:checked')].map((c) => c.dataset.time); }
function _byTime(t) { return (BH.project && BH.project.builds || []).find((b) => b.time === t) || (BH.builds || []).find((b) => b.time === t); }

function renderHistory(box, builds) {
  BH.project = BH.project || {}; BH.project.builds = builds;
  if (!builds.length) { box.innerHTML = '<div class="text-xs text-slate-500">No builds yet for this app.</div>'; return; }
  box.innerHTML = builds.slice(0, 30).map((b) => `<div class="flex items-center gap-2">
    <input type="checkbox" class="bh-hsel" data-time="${esc(b.time)}"/>
    <div class="flex-1 cursor-pointer" data-detail="${esc(b.time)}">${C.buildRow(b)}</div>
    <button class="btn btn-ghost text-[11px] !py-0.5" data-share="${esc(b.time)}">Share</button></div>`).join('');
  const bulk = el('#bh-bulk');
  const sync = () => { const n = _selected(box).length; if (bulk) bulk.innerHTML = n ? `<span class="text-[11px] text-slate-400 mr-1">${n} selected</span>
    <select id="bulk-target" class="field text-[11px] py-0.5"><option value="onedrive">OneDrive</option><option value="firebase">Firebase</option><option value="play">Play</option><option value="testflight">TestFlight</option></select>
    <button id="bulk-up" class="btn btn-secondary text-[11px] !py-0.5">Re-upload</button>` : ''; wireBulk(box); };
  box.querySelectorAll('.bh-hsel').forEach((c) => c.onchange = sync);
  box.querySelectorAll('[data-detail]').forEach((d) => d.onclick = () => (window.V.detail ? V.detail(d.dataset.detail) : null));
  box.querySelectorAll('[data-share]').forEach((d) => d.onclick = () => { const b = _byTime(d.dataset.share); if (b && window.openShare) openShare(b); });
  sync();
}

// Bulk re-upload: run /api/retry-upload for each selected build's first artifact into a shared log.
function wireBulk(box) {
  const up = el('#bulk-up'); if (!up) return;
  up.onclick = async () => {
    const target = el('#bulk-target').value, times = _selected(box);
    const b = openModal({ title: `Re-upload ${times.length} build(s) → ${target}`, size: '560px' });
    b.innerHTML = '<div id="bulk-log" class="bh-term" style="height:260px"></div>';
    const log = el('#bulk-log');
    for (const t of times) {
      const rec = _byTime(t); const art = (rec && rec.artifacts || [])[0];
      if (!art) continue;
      await new Promise((res) => API.stream('/api/retry-upload', { path: rec.path, artifactName: art.name, target, notes: rec.whatsNew || '' }, log, res));
    }
    toast('Re-upload finished', 'ok');
  };
}
