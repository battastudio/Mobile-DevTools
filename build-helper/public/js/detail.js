// Build Helper frontend — build detail (window.V.detail). Opens a modal for one build record:
// metadata, per-artifact download / copy-path / re-upload to a target, TestFlight re-manage, and
// Play rollback/re-promote. Streams every action into a shared log box in the modal.
'use strict';

function _upBtns(r, art) {
  const targets = [['onedrive', 'OneDrive'], ['firebase', 'Firebase'], ['play', 'Play'], ['testflight', 'TestFlight']];
  return targets.map(([id, l]) => `<button class="btn btn-ghost text-[11px] !py-0.5 bh-reup" data-art="${esc(art.name)}" data-target="${id}">↑ ${l}</button>`).join('');
}

window.V.detail = async function (time) {
  const d = await API.buildDetail(time).catch(() => null);
  if (!d || !d.build) return toast('Build not found', 'err');
  const r = d.build;
  const b = openModal({ title: `${r.project} v${verName(r.version)}`, subtitle: `${r.env} · ${relTime(r.time)}`, size: '680px' });
  const up = Object.entries(r.upload || {}).map(([k, v]) => `<span class="status ${v === 'ok' ? 'ok' : 'off'}">${esc(k)} ${v}</span>`).join(' ');
  b.innerHTML = `
    <div class="text-[12px] text-slate-400 mb-3 flex flex-wrap gap-x-4 gap-y-1">
      <span>build <b class="text-slate-200">${esc(String(r.buildNumber || ''))}</b></span>
      ${r.branch ? `<span>branch <b class="text-slate-200">${esc(r.branch)}</b></span>` : ''}
      ${r.commit ? `<span>commit ${d.commitUrl ? `<a class="text-brand" href="${esc(d.commitUrl)}" target="_blank">${esc(String(r.commit).slice(0, 8))}</a>` : esc(String(r.commit).slice(0, 8))}</span>` : ''}
      ${r.durationMs ? `<span>${fmtDur(r.durationMs)}</span>` : ''}${r.by ? `<span>by ${esc(r.by)}</span>` : ''}</div>
    <div class="mb-3">${up || '<span class="text-slate-500 text-xs">no uploads recorded</span>'}</div>
    <div class="eyebrow mb-1">Artifacts</div>
    <div class="space-y-2 mb-3">${(r.artifacts || []).length ? r.artifacts.map((a) => `<div class="surface p-2 text-sm">
      <div class="flex items-center gap-2 flex-wrap"><span class="font-mono text-[12px] flex-1 truncate">${esc(a.name)}</span>
        <span class="text-[11px] text-slate-500">${fmtBytes(a.size || 0)}</span>
        <a class="btn btn-ghost text-[11px] !py-0.5" href="/artifact?path=${encodeURIComponent(a.url || '')}" target="_blank">Download</a>
        <button class="btn btn-ghost text-[11px] !py-0.5 bh-cp" data-p="${esc(a.url || '')}">Copy path</button></div>
      <div class="flex flex-wrap gap-1 mt-1">${_upBtns(r, a)}</div></div>`).join('') : '<div class="text-xs text-slate-500">No artifacts on disk.</div>'}</div>
    <div class="flex flex-wrap gap-2 mb-3">
      <button id="dt-share" class="btn btn-secondary text-sm">Share</button>
      <button id="dt-tf" class="btn btn-ghost text-sm">Re-apply TestFlight notes</button>
      ${r.playVersionCode ? `<select id="dt-track" class="field text-xs"><option>internal</option><option>alpha</option><option>beta</option><option>production</option></select><button id="dt-rb" class="btn btn-ghost text-sm">Play rollback</button>` : ''}
    </div>
    <div id="dt-log" class="bh-term hidden" style="height:180px"></div>`;
  const logBox = () => { const x = el('#dt-log'); x.classList.remove('hidden'); return x; };
  b.querySelectorAll('.bh-cp').forEach((x) => x.onclick = () => navigator.clipboard.writeText(x.dataset.p).then(() => toast('Path copied', 'ok')));
  b.querySelectorAll('.bh-reup').forEach((x) => x.onclick = () => API.stream('/api/retry-upload', { path: r.path, artifactName: x.dataset.art, target: x.dataset.target, notes: r.whatsNew || '' }, logBox()));
  el('#dt-share').onclick = () => (window.openShare ? openShare(r) : null);
  el('#dt-tf').onclick = () => API.stream('/api/testflight/manage', { path: r.path, buildNumber: r.buildNumber, notes: r.whatsNew || '' }, logBox());
  const rb = el('#dt-rb'); if (rb) rb.onclick = () => API.stream('/api/rollback', { path: r.path, versionCode: r.playVersionCode, track: el('#dt-track').value }, logBox());
};
