// Build Helper frontend — Share follow-ups (source design): email the build to client groups (BCC)
// and file a Jira "Mobile Release". Both toggle an inline form under the share card and stream
// progress. `jref.cur` carries a created Jira release back to the card's client text.
'use strict';

function _sseInto(url, body, box, onEvt) {
  const write = (s, cls) => { const d = document.createElement('div'); if (cls) d.className = cls; d.textContent = s; box.appendChild(d); box.scrollTop = box.scrollHeight; };
  return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(async (res) => {
    const reader = res.body.getReader(), dec = new TextDecoder(); let buf = '';
    for (;;) { const { done, value } = await reader.read(); if (done) break; buf += dec.decode(value, { stream: true }); let i; while ((i = buf.indexOf('\n\n')) >= 0) { const chunk = buf.slice(0, i); buf = buf.slice(i + 2); const ev = /event: (.+)/.exec(chunk), dt = /data: ([\s\S]+)/.exec(chunk); if (!ev || !dt) continue; let d; try { d = JSON.parse(dt[1]); } catch { continue; } if (ev[1] === 'step') write('▸ ' + d.text, 'text-emerald-300'); else if (ev[1] === 'log') write(d.line); else if (ev[1] === 'error') write('✖ ' + d.message, 'text-rose-400 font-semibold'); else if (ev[1] === 'done') onEvt && onEvt(d); } }
  }).catch((e) => write('✖ ' + e.message, 'text-rose-400'));
}

async function shareEmailForm(records, canvas, jref) {
  const form = el('#emform'); if (!form.classList.contains('hidden')) { form.classList.add('hidden'); return; }
  form.classList.remove('hidden'); form.innerHTML = '<div class="text-xs text-slate-400">Loading groups…</div>';
  const repo = records[0].repo || records[0].project;
  const [gr, st] = await Promise.all([fetch('/api/groups?repo=' + encodeURIComponent(repo)).then((r) => r.json()).catch(() => ({ groups: [] })), fetch('/api/setup').then((r) => r.json()).catch(() => ({}))]);
  if (!st.email) { form.innerHTML = '<div class="text-xs text-amber-300">Email (SMTP) not configured — set it up in <b>Setup → Email</b> or the ⚙ gear.</div>'; return; }
  const groups = [...(gr.global || []).map((g) => ({ ...g, global: true })), ...(gr.own || [])], prod = records.find((r) => r.env === 'prod') || records[0];
  const subject = `${records[0].project} ${prod.version || records[0].version} — ready to test`;
  const tf = records.map((r) => r.testflight && r.testflight.tfLink).find(Boolean), od = records.map((r) => qrUrl(r)).find(Boolean), hasWn = records.some((r) => (r.whatsNew || r.notes || '').trim());
  const regen = () => { const d = el('#em-desc'); if (d) d.value = composeEmailBody(records, { whatsNew: el('#em-wn')?.checked, jira: el('#em-jira')?.checked }, jref.cur); };
  form.innerHTML = `<div class="text-xs text-slate-400 mb-2">From <b>${esc(st.emailFromName || st.emailFrom || st.emailUser || '')}</b> · recipients are BCC</div>
    ${groups.length ? '<div class="text-[11px] text-slate-400 mb-1">Groups:</div><div class="space-y-0.5 mb-2 max-h-28 overflow-auto">' + groups.map((g) => `<label class="flex items-center gap-2 text-xs py-0.5"><input type="checkbox" class="grpsel accent-brand" data-name="${esc(g.name)}"/> <span class="text-slate-200">${esc(g.name)}</span>${g.global ? ' <span class="text-[10px] text-slate-500">· global</span>' : ''} <span class="text-slate-500">· ${(g.emails || []).length} email(s)</span></label>`).join('') + '</div>' : '<div class="text-xs text-amber-300 mb-2">No groups yet — add them in App Setup → Client groups, or enter emails below.</div>'}
    <div class="grid gap-2"><input id="em-extra" class="field w-full text-sm" placeholder="Extra emails (comma separated) — optional"/><input id="em-subject" class="field w-full text-sm" value="${esc(subject)}"/><textarea id="em-desc" rows="6" class="field w-full text-xs">${esc(composeEmailBody(records, { whatsNew: hasWn, jira: false }, jref.cur))}</textarea>
    <div class="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs"><span class="text-slate-500">Include:</span><label class="flex items-center gap-1.5"><input id="em-wn" type="checkbox" class="accent-brand" ${hasWn ? 'checked' : ''}/> What's new</label><label class="flex items-center gap-1.5"><input id="em-jira" type="checkbox" class="accent-brand"/> Jira</label>${tf ? '<label class="flex items-center gap-1.5"><input id="em-tf" type="checkbox" class="accent-brand" checked/> TestFlight button</label>' : ''}${od ? '<label class="flex items-center gap-1.5"><input id="em-od" type="checkbox" class="accent-brand" checked/> Download button</label>' : ''}<label class="flex items-center gap-1.5"><input id="em-img" type="checkbox" class="accent-brand" checked/> Card image</label></div>
    <div class="flex gap-2 pt-1"><button id="em-send" type="button" class="rounded-lg bg-brand text-white px-4 py-2 text-sm font-semibold">Send</button><button id="em-testme" type="button" class="rounded-lg border border-edge px-4 py-2 text-sm">Send test to me</button><button id="em-cancel" type="button" class="rounded-lg border border-edge px-4 py-2 text-sm">Cancel</button></div></div>`;
  el('#em-cancel').onclick = () => form.classList.add('hidden');
  if (el('#em-wn')) el('#em-wn').onchange = regen; if (el('#em-jira')) el('#em-jira').onchange = regen;
  el('#em-testme').onclick = async () => { const box = el('#emlog'); box.classList.remove('hidden'); box.textContent = 'Sending test…'; const r = await fetch('/api/email/test').then((x) => x.json()); box.textContent = r.ok ? '✓ sent' : '✖ ' + (r.error || 'failed'); };
  el('#em-send').onclick = async () => {
    const buttons = []; if (tf && el('#em-tf')?.checked) buttons.push({ label: 'Install (TestFlight)', url: tf }); if (od && el('#em-od')?.checked) buttons.push({ label: 'Download (OneDrive)', url: od });
    const body = { repo, appName: records[0].project, version: prod.version || records[0].version, subject: el('#em-subject').value.trim(), description: el('#em-desc').value, groups: [...document.querySelectorAll('.grpsel:checked')].map((x) => x.dataset.name), extra: el('#em-extra').value, buttons };
    if (el('#em-img').checked) { try { body.pngBase64 = canvas.toDataURL('image/png'); } catch {} }
    const box = el('#emlog'); box.classList.remove('hidden'); box.innerHTML = ''; const btn = el('#em-send'); btn.disabled = true; btn.textContent = 'Sending…';
    await _sseInto('/api/email/send', body, box, (d) => { toast('Emailed ' + d.count + ' recipient(s)', 'ok'); form.classList.add('hidden'); });
    btn.disabled = false; btn.textContent = 'Send';
  };
}

async function shareJiraForm(records, canvas, jref, fname) {
  const form = el('#jform'); if (!form.classList.contains('hidden')) { form.classList.add('hidden'); return; }
  form.classList.remove('hidden'); form.innerHTML = '<div class="text-xs text-slate-400">Loading Jira project…</div>';
  const meta = await fetch('/api/jira/meta?path=' + encodeURIComponent(records[0].path)).then((r) => r.json()).catch(() => ({ ok: false, error: 'network error' }));
  if (!meta.ok) { form.innerHTML = `<div class="text-xs text-amber-300">${esc(meta.error || 'Jira not ready')}<br>Set the <b>Project key</b> + <b>work type</b> in the ⚙ gear → Jira.</div>`; return; }
  const byEnv = (e) => records.find((r) => r.env === e), dev = byEnv('dev'), demo = byEnv('demo'), prod = byEnv('prod') || records[0];
  const bn = prod.buildNumber || records[0].buildNumber || '', store = primaryLink(prod) || primaryLink(records[0]), notes = [...new Set(records.map((r) => r.whatsNew).filter(Boolean))].join('\n'), today = new Date().toISOString().slice(0, 10);
  const summary = `${records[0].project} — ${meta.issueType || 'Mobile Release'} ${(prod.buildName || records[0].buildName || '')}${bn ? ` (build ${bn})` : ''}`;
  const has = (k) => !!(meta.fieldMap && meta.fieldMap[k]);
  const fld = (id, label, val, type) => `<div><label class="text-[11px] text-slate-400">${label}${has(id.replace('jf-', '')) ? '' : ' <span class="text-slate-600">(not in Jira)</span>'}</label><input id="${id}" type="${type || 'text'}" ${has(id.replace('jf-', '')) ? '' : 'disabled'} class="field w-full text-sm mt-0.5" value="${esc(val || '')}"/></div>`;
  form.innerHTML = `<div class="text-xs text-slate-400 mb-2">Create <b>${esc(meta.issueType || 'Mobile Release')}</b> in <b>${esc(meta.projectKey)}</b></div>
    <div class="grid gap-2"><div><label class="text-[11px] text-slate-400">Summary</label><input id="jf-summary" class="field w-full text-sm mt-0.5" value="${esc(summary)}"/></div>
    <div class="grid grid-cols-3 gap-2">${fld('jf-devVersion', 'Dev Version', dev && dev.version)}${fld('jf-demoVersion', 'Demo Version', demo && demo.version)}${fld('jf-prodVersion', 'Prod Version', prod && prod.version)}</div>
    <div class="grid grid-cols-2 gap-2">${fld('jf-buildNumber', 'Build Number', bn)}${fld('jf-releaseDate', 'Release Date', today, 'date')}</div>${fld('jf-storeUrl', 'Store / install URL', store)}
    <div><label class="text-[11px] text-slate-400">Release Notes</label><textarea id="jf-releaseNotes" ${has('releaseNotes') ? '' : 'disabled'} rows="2" class="field w-full text-sm mt-0.5">${esc(notes)}</textarea></div>
    <div><label class="text-[11px] text-slate-400">Description</label><textarea id="jf-desc" rows="4" class="field w-full text-xs mt-0.5 font-mono">${esc(shareText(records, 'team'))}</textarea></div>
    <div class="flex items-center gap-4 text-xs"><label class="flex items-center gap-1.5"><input id="jf-assign" type="checkbox" class="accent-brand" ${meta.me ? 'checked' : 'disabled'}/> Assign to me</label><label class="flex items-center gap-1.5"><input id="jf-img" type="checkbox" class="accent-brand" checked/> Attach card image</label></div>
    <div class="flex gap-2 pt-1"><button id="jf-create" type="button" class="rounded-lg bg-brand text-white px-4 py-2 text-sm font-semibold">Create release</button><button id="jf-cancel" type="button" class="rounded-lg border border-edge px-4 py-2 text-sm">Cancel</button></div></div>`;
  el('#jf-cancel').onclick = () => form.classList.add('hidden');
  el('#jf-create').onclick = async () => {
    const gv = (id) => { const e = el('#' + id); return e && !e.disabled ? e.value.trim() : ''; };
    const body = { path: records[0].path, summary: el('#jf-summary').value.trim(), description: el('#jf-desc').value, assignMe: el('#jf-assign').checked, fields: { devVersion: gv('jf-devVersion'), demoVersion: gv('jf-demoVersion'), prodVersion: gv('jf-prodVersion'), buildNumber: gv('jf-buildNumber'), storeUrl: gv('jf-storeUrl'), releaseNotes: gv('jf-releaseNotes'), releaseDate: gv('jf-releaseDate') }, linkKeys: [...document.querySelectorAll('.jref:checked')].map((x) => x.dataset.k), filename: fname };
    if (el('#jf-img').checked) { try { body.pngBase64 = canvas.toDataURL('image/png'); } catch {} }
    const box = el('#jlog'); box.classList.remove('hidden'); box.innerHTML = ''; const btn = el('#jf-create'); btn.disabled = true; btn.textContent = 'Creating…';
    await _sseInto('/api/jira/create-release', body, box, (d) => { jref.cur = { key: d.key, url: d.url }; el('#shtext').value = shareText(records, 'team', jref.cur); form.classList.add('hidden'); toast('Jira release ' + d.key + ' created', 'ok'); });
    btn.disabled = false; btn.textContent = 'Create release';
  };
}
