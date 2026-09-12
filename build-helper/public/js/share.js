// Build Helper frontend — the Share modal (source design): the canvas build card + copy/download,
// team/client text, email-to-groups and Jira-release (in share-actions.js), and per-target re-upload.
'use strict';

function shareText(records, mode = 'team', jira) {
  const app = records[0].project;
  if (mode === 'client') {
    let t = `🚀 ${app} — new release\n\n`;
    for (const r of records) { const link = primaryLink(r); t += `• ${r.env.toUpperCase()} ${r.version}${link ? `\n  ${link}` : ''}\n`; }
    if (jira && jira.url) t += `\n📋 ${jira.url}`;
    return t.trim();
  }
  let t = `🚀 ${app} — new build${records.length > 1 ? 's' : ''}\n\n`;
  for (const r of records) {
    const art = (r.artifacts || []).map((a) => a.name || a).join(', '), link = r.onedriveUrl || (r.artifacts || []).map((a) => a.onedriveUrl).find(Boolean);
    t += `• ${r.env.toUpperCase()} ${r.version} — branch: ${r.branch || '—'}\n`;
    if (r.whatsNew || r.notes) t += `  What's new: ${(r.whatsNew || r.notes).replace(/\n/g, '; ')}\n`;
    if (art) t += `  📦 ${art}\n`; if (link) t += `  🔗 ${link}\n`;
    if (r.testflight && !r.testflight.error) { t += `  ✈️ TestFlight: ${r.testflight.state || 'processing'}\n`; if (r.testflight.tfLink) t += `  🧪 Install via TestFlight: ${r.testflight.tfLink}\n`; }
    t += '\n';
  }
  if (jira && jira.url) t += `📋 Jira release: ${jira.key || ''} ${jira.url}\n\n`;
  t += `Built ${new Date(records[0].time).toLocaleDateString()}${records[0].by ? ' by ' + records[0].by : ''} · Batta Build Helper`;
  return t.trim();
}
function composeEmailBody(records, opts, jira) {
  opts = opts || {}; let t = `🚀 ${records[0].project} — new release\n\n`;
  for (const r of records) { t += `• ${(r.env || '').toUpperCase()} ${r.version || ''}\n`; if (opts.whatsNew) { const wn = (r.whatsNew || r.notes || '').trim(); if (wn) t += `  What's new: ${wn.replace(/\n/g, '; ')}\n`; } if (r.testflight && r.testflight.tfLink) t += `  📲 Install (TestFlight): ${r.testflight.tfLink}\n`; const od = qrUrl(r); if (od) t += `  ⬇️ Download: ${od}\n`; t += '\n'; }
  if (opts.jira && jira && jira.url) t += `📋 Jira release: ${jira.key || ''} ${jira.url}\n\n`;
  return t.trim();
}

async function showShareCard(records) {
  const modal = el('#cmdk'); modal.classList.remove('hidden'); modal.classList.add('flex');
  const upBtns = [['testflight', '✈️ TestFlight'], ['play', '▶ Play'], ['onedrive', '☁ OneDrive'], ['firebase', '🔥 Firebase']].map(([t, l]) => records.some((r) => artName(r, t)) ? `<button class="shup rounded-lg border border-edge px-3 py-2 text-sm hover:bg-panel" data-t="${t}">${l}</button>` : '').join('');
  modal.innerHTML = `<div class="w-[680px] max-w-[92vw] rounded-2xl border border-edge bg-panel shadow-2xl overflow-hidden max-h-[88vh] overflow-y-auto" onclick="event.stopPropagation()">
    <div class="p-4 border-b border-edge flex items-center"><div class="font-semibold">Share build</div><button id="shclose" class="ml-auto text-slate-400 hover:text-white">✕</button></div>
    <div class="p-4"><div id="shimg" class="rounded-lg overflow-hidden border border-edge">rendering…</div>
      <textarea id="shtext" rows="7" class="mt-3 w-full rounded-lg bg-ink border border-edge px-3 py-2 text-xs font-mono"></textarea>
      <div class="flex flex-wrap items-center gap-2 mt-3"><span class="text-xs text-slate-400 mr-1">Card:</span>
        <button id="shdl" class="rounded-lg bg-brand text-white px-4 py-2 text-sm font-semibold">Download PNG</button>
        <button id="shcopyimg" class="rounded-lg border border-edge px-4 py-2 text-sm">Copy image</button>
        <button id="shcopytxt" class="rounded-lg border border-edge px-4 py-2 text-sm">Copy for team</button>
        <button id="shcopyclient" class="rounded-lg border border-edge px-4 py-2 text-sm">Copy for client</button></div>
      <div class="mt-3 pt-3 border-t border-edge"><div class="flex items-center gap-2"><span class="text-xs font-semibold text-slate-300">Email to client groups</span><button id="emailbtn" class="ml-auto rounded-lg bg-brand text-white px-3 py-2 text-sm font-semibold">📧 Email to groups</button></div><div id="emform" class="hidden mt-3 rounded-lg border border-edge p-3"></div><div id="emlog" class="log mt-2 hidden max-h-32 overflow-auto bg-ink rounded p-2 text-slate-300"></div></div>
      <div class="mt-3 pt-3 border-t border-edge"><div class="flex items-center gap-2"><span class="text-xs font-semibold text-slate-300">Jira release</span><button id="jcreate" class="ml-auto rounded-lg bg-brand text-white px-3 py-2 text-sm font-semibold">🧩 Create Jira release</button></div><div id="jreferred" class="mt-2"></div><div id="jform" class="hidden mt-3 rounded-lg border border-edge p-3"></div><div id="jlog" class="log mt-2 hidden max-h-32 overflow-auto bg-ink rounded p-2 text-slate-300"></div></div>
      <div class="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-edge"><span class="text-xs text-slate-400">Upload build →</span>${upBtns}</div><div id="shlog" class="log mt-2 hidden max-h-28 overflow-auto bg-ink rounded p-2 text-slate-300"></div></div></div>`;
  modal.onclick = () => { modal.classList.add('hidden'); modal.classList.remove('flex'); modal.innerHTML = ''; };
  el('#shclose').onclick = modal.onclick;
  el('#shtext').value = shareText(records);
  const canvas = await drawShareCard(records);
  el('#shimg').innerHTML = ''; canvas.style.width = '100%'; canvas.style.display = 'block'; el('#shimg').appendChild(canvas);
  const fname = `${records[0].project}-${(records[0].version || '').replace(/[^\w.+-]/g, '')}-card.png`;
  const jref = { cur: null };
  el('#shdl').onclick = () => canvas.toBlob((b) => { const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = fname; a.click(); URL.revokeObjectURL(u); });
  el('#shcopyimg').onclick = () => canvas.toBlob(async (b) => { try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': b })]); toast('Image copied', 'ok'); } catch { toast('Copy image not supported — use Download', 'warn'); } });
  el('#shcopytxt').onclick = () => { navigator.clipboard.writeText(el('#shtext').value); toast('Team text copied', 'ok'); };
  el('#shcopyclient').onclick = () => { navigator.clipboard.writeText(shareText(records, 'client', jref.cur)); toast('Client text copied', 'ok'); };
  el('#emailbtn').onclick = () => shareEmailForm(records, canvas, jref);
  const referred = [...new Map(records.flatMap((r) => (r.tasks || []).filter((x) => x.tracker === 'jira')).map((x) => [x.key, x])).values()];
  el('#jreferred').innerHTML = (referred.length ? '<div class="text-xs text-slate-400 mb-1">Referred issues to link:</div>' : '<div class="text-xs text-slate-500">No Jira issues referenced in commits — you can search when creating.</div>') + referred.map((i) => `<label class="flex items-center gap-2 text-xs py-0.5"><input type="checkbox" class="jref accent-brand" data-k="${esc(i.key)}" checked/> <span class="font-mono text-slate-200">${esc(i.key)}</span> <span class="text-slate-400 truncate">${esc(i.title || '')}</span></label>`).join('');
  el('#jcreate').onclick = () => shareJiraForm(records, canvas, jref, fname);
  modal.querySelectorAll('.shup').forEach((btn) => btn.onclick = async () => {
    const t = btn.dataset.t, label = btn.textContent.trim(), box = el('#shlog'); box.classList.remove('hidden'); box.innerHTML = '';
    for (const r of records) { const name = artName(r, t); const sub = document.createElement('div'); sub.className = 'mt-1 border-t border-edge pt-1'; sub.innerHTML = `<div class="text-sky-300 font-semibold">→ ${esc(label)} · ${esc(r.env.toUpperCase())} ${esc(r.version)}${name ? '' : ' — no artifact on disk (rebuild)'}</div>`; box.appendChild(sub); if (!name) continue; const line = document.createElement('div'); sub.appendChild(line); await new Promise((res) => streamSSEInto('/api/retry-upload', { path: r.path, artifactName: name, target: t, track: r.env === 'prod' ? 'production' : 'internal', notes: r.whatsNew }, line, res)); }
    toast(label + ' — done, see log', 'ok');
  });
}
