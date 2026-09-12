// Build Helper frontend — build history (source design): per-build cards with upload chips + retry,
// multi-select bulk (Share / re-upload to a target), Details, and raw log. Plus the small SSE-into-a-
// box streamer used for retry/bulk. showDetail→V.detail, showShareCard→share.js.
'use strict';

const ART_FOR = { play: 'aab', testflight: 'ipa', firebase: 'apk', onedrive: 'apk' };
function artName(b, target) {
  const arts = Array.isArray(b.artifacts) ? b.artifacts.filter((x) => typeof x !== 'string') : [];
  const want = ART_FOR[target];
  return (arts.find((a) => a.art === want) || arts.find((a) => a.art === 'aab') || arts[0])?.name || '';
}

function renderHistory(builds) {
  const box = el('#history'); if (!box) return;
  if (!builds || !builds.length) { box.innerHTML = '<div class="text-xs text-slate-500">No builds yet.</div>'; return; }
  const label = { onedrive: 'OneDrive', firebase: 'Firebase', play: 'Play', testflight: 'TestFlight' };
  box.innerHTML = '<div id="bulkbar" class="hidden sticky top-0 z-10 mb-2 rounded-lg border border-sky-500/40 bg-sky-500/10 p-2 text-xs flex flex-wrap items-center gap-2"></div>' + builds.map((b, bi) => {
    const c = ENV_COLOR[b.env] || 'slate', u = b.upload || {};
    const chip = (k, v) => { if (!v || v === 'skipped') return ''; if (v === 'failed') { const n = artName(b, k); return `<span class="mr-1 text-rose-400">${label[k]}:failed</span>${n ? `<span class="text-slate-500 font-mono mr-1">${esc(n)}</span><button class="retry text-[10px] rounded border border-edge px-1.5 mr-2 hover:bg-panel" data-bi="${bi}" data-t="${k}">retry</button>` : ''}`; } return `<span class="mr-1 text-emerald-400">${label[k]}:ok</span>`; };
    const targets = chip('onedrive', u.onedrive) + chip('firebase', u.firebase) + chip('play', u.play) + chip('testflight', u.testflight);
    const arts = Array.isArray(b.artifacts) ? b.artifacts.map((x) => typeof x === 'string' ? x : x.name).join(', ') : '';
    const failed = b.buildOk === false;
    return `<div class="rounded-lg border ${failed ? 'border-rose-500/40' : 'border-edge'} bg-ink p-3 text-xs">
      <div class="flex items-center justify-between gap-2"><label class="flex items-center gap-2"><input type="checkbox" class="bsel accent-sky-500" data-i="${bi}"/><span class="font-mono">${b.version}</span></label><span class="flex items-center gap-1">${failed ? '<span class="text-rose-400 font-semibold">✗ build failed</span>' : ''}${badge(b.env.toUpperCase(), c)}</span></div>
      <div class="text-slate-500 mt-1">${new Date(b.time).toLocaleString()} · ${b.branch || '—'} · ${esc(arts)}${b.durationMs ? ` · ${(b.durationMs / 1000).toFixed(0)}s` : ''}${b.by ? ` · by ${esc(b.by)}` : ''}</div>
      ${failed && b.error ? `<div class="text-rose-300 mt-1">${esc(b.error)}</div>` : ''}
      ${b.tag ? `<div class="text-violet-300 mt-1">🏷 ${esc(b.tag)}</div>` : ''}
      ${targets ? `<div class="mt-1">${targets}</div>` : ''}
      ${b.whatsNew ? `<div class="text-emerald-300/90 mt-1">✨ ${esc(b.whatsNew)}</div>` : ''}
      <div class="mt-1 flex gap-3"><button class="detail text-sky-400" data-t="${esc(b.time)}">Details ▸</button>${b.logFile ? `<a href="/api/log?file=${encodeURIComponent(b.logFile)}" target="_blank" class="text-slate-400">raw log</a>` : ''}</div>
    </div>`;
  }).join('');
  box.querySelectorAll('.detail').forEach((btn) => btn.onclick = () => (window.V.detail ? V.detail(btn.dataset.t) : null));
  box.querySelectorAll('.retry').forEach((btn) => btn.onclick = async () => { const b = builds[+btn.dataset.bi], target = btn.dataset.t, name = artName(b, target); btn.textContent = '…'; btn.disabled = true; await new Promise((res) => streamSSEInto('/api/retry-upload', { path: CUR.app.path, artifactName: name, target, track: b.env === 'prod' ? 'production' : 'internal', notes: b.whatsNew }, el('#log'), res)); fetch('/api/project?path=' + encodeURIComponent(CUR.app.path)).then((r) => r.json()).then((d) => { CUR = d; renderHistory(d.builds); }); });
  const selected = () => [...box.querySelectorAll('.bsel:checked')].map((x) => builds[+x.dataset.i]);
  const bar = el('#bulkbar');
  const updateBulk = () => {
    const sel = selected(); if (!sel.length) { bar.classList.add('hidden'); return; }
    bar.classList.remove('hidden');
    bar.innerHTML = `<span class="font-semibold text-sky-300">${sel.length} selected</span><button class="bk rounded bg-sky-500 text-white px-2.5 py-1" data-a="share">📤 Share</button>${['onedrive:OneDrive', 'firebase:Firebase', 'testflight:TestFlight', 'play:Play'].map((t) => { const [k, l] = t.split(':'); return `<button class="bk rounded border border-edge px-2.5 py-1" data-a="up" data-t="${k}">${l}</button>`; }).join('')}<button class="bk rounded border border-edge px-2.5 py-1 ml-auto" data-a="clear">Clear</button>`;
    bar.querySelectorAll('.bk').forEach((btn) => btn.onclick = () => { const a = btn.dataset.a; if (a === 'share') { if (window.showShareCard) showShareCard(selected()); } else if (a === 'clear') { box.querySelectorAll('.bsel:checked').forEach((x) => x.checked = false); updateBulk(); } else if (a === 'up') bulkUpload(selected(), btn.dataset.t); });
  };
  box.querySelectorAll('.bsel').forEach((x) => x.onchange = () => { updateBulk(); const all = [...box.querySelectorAll('.bsel')]; const sa = el('#selall'); if (sa) sa.checked = all.length && all.every((x) => x.checked); });
  if (el('#selall')) { el('#selall').checked = false; el('#selall').onchange = () => { const on = el('#selall').checked; box.querySelectorAll('.bsel').forEach((x) => x.checked = on); updateBulk(); }; }
}

async function bulkUpload(records, target) {
  const label = { onedrive: 'OneDrive', firebase: 'Firebase', testflight: 'TestFlight', play: 'Play' }[target] || target;
  const host = el('#log'); if (host) host.innerHTML = '';
  for (const b of records) {
    const name = artName(b, target);
    const sub = document.createElement('div'); sub.className = 'mt-2 border-t border-edge pt-1';
    sub.innerHTML = `<div class="text-sky-300 font-semibold">→ ${label} · ${b.env.toUpperCase()} ${b.version}${name ? '' : ' — no artifact on disk (rebuild)'}</div>`;
    if (host) host.appendChild(sub); if (!name) continue;
    const line = document.createElement('div'); sub.appendChild(line);
    await new Promise((res) => streamSSEInto('/api/retry-upload', { path: b.path, artifactName: name, target, track: b.env === 'prod' ? 'production' : 'internal', notes: b.whatsNew }, line, res));
  }
  toast(`${label}: done for ${records.length} build${records.length > 1 ? 's' : ''} — see log`, 'ok');
  fetch('/api/project?path=' + encodeURIComponent(CUR.app.path)).then((r) => r.json()).then((d) => { CUR = d; renderHistory(d.builds); });
}

function streamSSEInto(url, body, box, onDone) {
  box.innerHTML = '';
  const write = (s, cls = '') => { const d = document.createElement('div'); if (cls) d.className = cls; d.textContent = stripAnsi(s); box.appendChild(d); box.scrollTop = box.scrollHeight; };
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((res) => {
    const reader = res.body.getReader(), dec = new TextDecoder(); let buf = '';
    const pump = () => reader.read().then(({ done, value }) => {
      if (done) { onDone && onDone(); return; }
      buf += dec.decode(value, { stream: true }); let i;
      while ((i = buf.indexOf('\n\n')) >= 0) { const chunk = buf.slice(0, i); buf = buf.slice(i + 2); const ev = /event: (.+)/.exec(chunk), dt = /data: ([\s\S]+)/.exec(chunk); if (!ev || !dt) continue; const t = ev[1]; let d; try { d = JSON.parse(dt[1]); } catch { continue; } if (t === 'log') write(d.line); else if (t === 'step') write('▸ ' + d.text, 'text-emerald-300 font-semibold'); else if (t === 'error') { write('✖ ' + d.message, 'text-rose-400'); toast(d.message, 'err'); } else if (t === 'done') { write('✔ done', 'text-emerald-400'); toast('Retry ok', 'ok'); } }
      return pump();
    });
    return pump();
  }).catch((e) => { write('✖ ' + e.message, 'text-rose-400'); onDone && onDone(); });
}
