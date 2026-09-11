// [split from app.js] AI test gen + settings + share/Jira modal + fix-code (genTest/shareModal/...).
// AI test generation — draft a test for an untested file, show it, save on confirm.
async function genTest(projPath, file, type = '') {
  const body = openModal({ title: 'AI-generated test', subtitle: file, size: '820px' });
  const ac = new AbortController();
  body.innerHTML = spinnerStop('Generating test with AI…');
  el('#ai-stop').onclick = () => { try { ac.abort(); } catch {} el('#cmdk').classList.add('hidden'); };
  let r; try { r = await aiFetch('/api/qa/ai/gen', { path: projPath, file, type }, ac.signal); } catch (e) { if (ac.signal.aborted) return; r = { error: e.message }; }
  if (!r || r.error) { body.innerHTML = `<div class="text-rose-400 text-sm">${esc((r && r.error) || 'AI request failed')}</div>`; return; }
  body.innerHTML = `<div class="text-[11px] text-slate-500 mb-2">${esc(r.suggestedPath)} · ${esc(r.model || '')}</div>
    <pre class="log text-[11px] whitespace-pre-wrap bg-ink rounded-lg p-3 max-h-[60vh] overflow-auto">${esc(r.code)}</pre>
    <div class="flex gap-2 mt-3"><button id="ai-save" class="btn btn-primary text-sm">${ICON.check}Save to ${esc(r.suggestedPath)}</button><button id="ai-copy" class="btn btn-secondary text-sm">Copy</button></div>`;
  el('#ai-copy').onclick = () => { navigator.clipboard.writeText(r.code); toast('Copied', 'ok'); };
  el('#ai-save').onclick = async () => { const s = await postJson('/api/qa/ai/save', { path: projPath, file: r.suggestedPath, content: r.code }); if (s.error) toast(s.error, 'err'); else { toast('Saved ' + s.written, 'ok'); el('#cmdk').classList.add('hidden'); } };
}
async function openAiSettings() {
  const cfg = await fetch('/api/qa/config').then(r => r.json()).catch(() => ({}));
  const body = openModal({ title: 'AI settings', subtitle: 'Test generation via the Claude API', size: '560px' });
  body.innerHTML = `<div class="space-y-3 text-sm">
    <div class="text-slate-400 text-xs">Key is stored locally (qa data dir), never in a repo, and never returned to the browser. Leave blank to keep the current key.</div>
    <div><div class="text-[11px] text-slate-500 mb-1">Anthropic API key ${cfg.hasKey ? '<span class="text-emerald-400">· configured</span>' : '<span class="text-slate-500">· not set</span>'}</div><input id="ai-key" type="password" class="field text-xs w-full font-mono" placeholder="sk-ant-…"/></div>
    <div><div class="text-[11px] text-slate-500 mb-1">Model</div><input id="ai-model" class="field text-xs w-full font-mono" value="${esc(cfg.aiModel || 'claude-sonnet-5')}"/></div>
    <button id="ai-save-cfg" class="btn btn-primary text-sm">${ICON.check}Save</button>
  </div>`;
  el('#ai-save-cfg').onclick = async () => { const patch = { aiModel: el('#ai-model').value.trim() }; const k = el('#ai-key').value.trim(); if (k) patch.anthropicApiKey = k; await postJson('/api/qa/config', patch); toast('AI settings saved', 'ok'); el('#cmdk').classList.add('hidden'); };
}
// ---------------- AI QA suite ----------------
const curPath = () => QA.detailPath || (QA.last && QA.last.path) || (QA.rec && QA.rec.path) || '';
// Abortable JSON POST for AI calls (so modals can Stop).
const aiFetch = (url, body, signal) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal }).then(r => r.json());
const spinnerStop = (text, id = 'ai-stop') => `<div class="py-10 text-center">${spinner(text)}<div class="mt-3"><button id="${id}" class="btn btn-ghost text-xs">■ Stop</button></div></div>`;
// Prioritized-case rows for the AI test plan (shared by the modal).
function planRowsHtml(items, p) {
  const PRI = { high: 'rose', med: 'amber', low: 'slate' };
  return items.map(it => `<div class="rounded-xl border border-edge px-3 py-2" style="background:var(--panel)">
    <div class="flex items-center gap-2 flex-wrap">${badge(it.priority || 'med', PRI[it.priority] || 'slate')}<span class="text-[10px] uppercase tracking-wide text-slate-500">${esc(it.type || '')}</span><span class="text-[13px] font-medium text-slate-200">${esc(it.title || '')}</span>${it.targetFile ? `<button class="btn btn-ghost text-[10px] px-2 py-0.5 gen-ai ml-auto" data-p="${esc(p)}" data-f="${esc(it.targetFile)}" data-t="${esc(it.type || '')}">${ICON.flask}AI test</button>` : ''}</div>
    ${(it.given || it.when || it.then) ? `<div class="text-[11px] text-slate-400 mt-1 font-mono">${it.given ? '<b class="text-slate-300">Given</b> ' + esc(it.given) + ' ' : ''}${it.when ? '<b class="text-slate-300">When</b> ' + esc(it.when) + ' ' : ''}${it.then ? '<b class="text-slate-300">Then</b> ' + esc(it.then) : ''}</div>` : ''}
    ${it.targetFile ? `<div class="text-[10px] text-slate-500 mt-0.5 font-mono">${esc(it.targetFile)}</div>` : ''}</div>`).join('');
}
// ---------------- Unified Share module (used by artifacts + AI results) ----------------
// opts: { title, text?, files?:[{path,url,name,kind}], jira?:{summary,description} }
function shareModal(opts = {}) {
  const files = opts.files || []; const text = opts.text || ''; const hasFiles = files.length > 0;
  const box = openModal({ title: opts.title || 'Share', subtitle: hasFiles ? `${files.length} file(s)` : 'result', size: '640px' });
  const jira = opts.jira || {};
  const row = (label, controls) => `<div class="flex items-center gap-2 rounded-xl border border-edge px-2.5 py-2" style="background:var(--panel)"><span class="text-slate-300">${label}</span><span class="ml-auto flex items-center gap-2">${controls}</span></div>`;
  box.innerHTML = `<div class="space-y-2 text-sm">
    ${row('Copy', `<button id="sh-copy" class="btn btn-secondary text-xs">Copy</button>`)}
    ${row('Save to device', `<button id="sh-dl" class="btn btn-secondary text-xs">${hasFiles ? 'Download file(s)' : 'Download .md'}</button>`)}
    ${hasFiles ? row('OneDrive', `<button id="sh-od" class="btn btn-secondary text-xs">Upload &amp; get link</button><span id="sh-od-out" class="text-[11px] text-slate-500"></span>`) : ''}
    ${row('Email', `<input id="sh-to" class="field text-xs" placeholder="to@team.com" style="width:150px"/><input id="sh-subj" class="field text-xs" placeholder="subject" value="${esc(opts.title || 'QA share')}" style="width:140px"/><button id="sh-email" class="btn btn-secondary text-xs">Send</button>`)}
    ${row('Team (Slack/Telegram)', `<button id="sh-team" class="btn btn-secondary text-xs">Send</button>`)}
    <div class="rounded-xl border border-edge p-2.5" data-cap="connectors" style="background:var(--panel)">
      <div class="flex items-center gap-2 mb-2"><span class="text-slate-300">Jira</span>
        <div class="seg ml-auto"><button class="seg-item active" data-jm="new">New issue</button>${hasFiles ? `<button class="seg-item" data-jm="attach">Attach</button>` : ''}<button class="seg-item" data-jm="comment">Comment</button></div></div>
      <select id="j-proj" class="field text-xs w-full mb-2"><option>Loading projects…</option></select>
      <div id="sh-jira"></div>
    </div></div>`;
  el('#sh-copy').onclick = async () => { try { await navigator.clipboard.writeText(hasFiles ? files.map(f => location.origin + f.url).join('\n') : text); toast('Copied', 'ok'); } catch { toast('Copy failed', 'err'); } };
  el('#sh-dl').onclick = () => { if (hasFiles) files.forEach(f => { const a = document.createElement('a'); a.href = f.url; a.download = f.name; document.body.appendChild(a); a.click(); a.remove(); }); else { const a = document.createElement('a'); a.href = 'data:text/markdown;charset=utf-8,' + encodeURIComponent(text); a.download = (opts.title || 'qa') + '.md'; a.click(); } };
  const od = el('#sh-od'); if (od) od.onclick = async () => { od.disabled = true; od.textContent = 'Uploading…'; const links = []; for (const f of files) { const r = await postJson('/api/qa/share/file', { path: f.path }); if (r.ok && r.url) links.push(r.url); else toast(r.error || 'upload failed', 'err'); } od.disabled = false; od.textContent = 'Upload & get link'; if (links.length) { el('#sh-od-out').textContent = links.length + ' link(s) copied'; try { navigator.clipboard.writeText(links.join('\n')); } catch {} } };
  el('#sh-email').onclick = async () => { const to = el('#sh-to').value.trim(); if (!to) { toast('Recipient?', 'warn'); return; } const r = await postJson('/api/qa/email', { to, subject: el('#sh-subj').value, text: hasFiles ? files.map(f => f.name).join('\n') : text, html: hasFiles ? '' : mdToHtml(text), paths: files.map(f => f.path) }); toast(r.ok ? 'Email sent' : (r.error || 'failed'), r.ok ? 'ok' : 'err'); };
  el('#sh-team').onclick = async () => { const r = await postJson('/api/qa/notify', { text: text || ('QA artifacts: ' + files.map(f => f.name).join(', ')) }); toast(r.ok ? 'Sent to team' : (r.error || 'failed'), r.ok ? 'ok' : 'warn'); };
  const jiraBox = el('#sh-jira');
  const getProject = () => (el('#j-proj') ? el('#j-proj').value : '');
  const loadTypes = async (key) => { const t = await fetch('/api/connectors/jira/issuetypes?key=' + encodeURIComponent(key)).then(r => r.json()).catch(() => ({})); const s = el('#j-type'); if (s) s.innerHTML = ((t.types && t.types.length) ? t.types : [{ name: 'Task' }]).map(x => `<option>${esc(x.name)}</option>`).join(''); };
  // Searchable multi-select issue picker (mirrors Build Helper).
  function issuePicker(mount, multi) {
    mount.innerHTML = `<input class="ip-q field text-xs w-full" placeholder="Search issues by text or key…"/>
      <div class="ip-list mt-1 space-y-0.5 max-h-40 overflow-auto text-xs rounded-lg border border-edge/60 p-1"></div>
      <div class="ip-sel mt-1 flex flex-wrap gap-1"></div>`;
    const sel = new Set(); let timer;
    const q = mount.querySelector('.ip-q'), list = mount.querySelector('.ip-list'), selBox = mount.querySelector('.ip-sel');
    const paintSel = () => { selBox.innerHTML = [...sel].map(k => `<span class="inline-flex items-center gap-1 text-[10px] rounded px-1.5 py-0.5" style="background:color-mix(in srgb,var(--brand) 16%,transparent);color:var(--brand2)">${esc(k)}<button data-k="${esc(k)}" class="ip-x">×</button></span>`).join(''); selBox.querySelectorAll('.ip-x').forEach(b => b.onclick = () => { sel.delete(b.dataset.k); paintSel(); list.querySelectorAll('.ip-chk').forEach(c => { c.checked = sel.has(c.dataset.k); }); }); };
    const search = async () => {
      list.innerHTML = `<div class="text-slate-500 px-1">Searching…</div>`;
      const r = await fetch(`/api/connectors/jira/search?q=${encodeURIComponent(q.value.trim())}&key=${encodeURIComponent(getProject())}`).then(x => x.json()).catch(() => ({}));
      if (!r.ok) { list.innerHTML = `<div class="text-amber-400 px-1">${esc(r.error || 'Search failed — is Jira connected?')}</div>`; return; }
      list.innerHTML = (r.issues || []).map(i => `<label class="flex items-start gap-2 cursor-pointer py-0.5 px-1 rounded hover:bg-raised/60"><input type="checkbox" class="ip-chk accent-brand mt-0.5" data-k="${esc(i.key)}" ${sel.has(i.key) ? 'checked' : ''}/><span><span class="font-mono text-slate-300">${esc(i.key)}</span> <span class="text-slate-400">${esc(i.summary || '')}</span></span></label>`).join('') || `<div class="text-slate-500 px-1">No matches.</div>`;
      list.querySelectorAll('.ip-chk').forEach(c => c.onchange = () => { if (!multi && c.checked) { sel.clear(); list.querySelectorAll('.ip-chk').forEach(o => { if (o !== c) o.checked = false; }); } if (c.checked) sel.add(c.dataset.k); else sel.delete(c.dataset.k); paintSel(); });
    };
    q.oninput = () => { clearTimeout(timer); timer = setTimeout(search, 300); };
    search();
    return { keys: () => [...sel] };
  }
  let picker = null;
  const drawJira = (mode) => {
    picker = null;
    if (mode === 'new') {
      jiraBox.innerHTML = `<div class="space-y-2"><select id="j-type" class="field text-xs w-full"></select>
        <input id="j-sum" class="field text-xs w-full" placeholder="Summary" value="${esc(jira.summary || opts.title || '')}"/>
        <textarea id="j-desc" class="field text-xs w-full font-mono" rows="3" placeholder="Description">${esc(jira.description || text || '')}</textarea>
        <button id="j-create" class="btn btn-primary text-xs">Create issue${hasFiles ? ' + attach' : ''}</button></div>`;
      loadTypes(getProject());
      el('#j-create').onclick = async () => { const r = await postJson('/api/qa/jira/create', { summary: el('#j-sum').value, description: el('#j-desc').value, projectKey: getProject(), issueType: el('#j-type').value, attachPath: hasFiles ? files[0].path : undefined }); if (r.ok || r.key) { toast('Created ' + (r.key || ''), 'ok'); if (r.url) window.open(r.url, '_blank', 'noopener'); } else toast(r.error || 'failed', 'err'); };
    } else if (mode === 'attach') {
      jiraBox.innerHTML = `<div id="ip-mount"></div><button id="j-att" class="btn btn-primary text-xs mt-2">Attach ${files.length} file(s)</button>`;
      picker = issuePicker(el('#ip-mount'), true);
      el('#j-att').onclick = async () => { const keys = picker.keys(); if (!keys.length) { toast('Pick at least one issue', 'warn'); return; } let ok = 0; for (const key of keys) for (const f of files) { const r = await postJson('/api/qa/jira/attach', { key, path: f.path }); if (r.ok) ok++; } toast(ok ? `Attached to ${keys.length} issue(s)` : 'attach failed', ok ? 'ok' : 'err'); };
    } else {
      jiraBox.innerHTML = `<div id="ip-mount"></div><textarea id="j-ctext" class="field text-xs w-full font-mono mt-2" rows="3" placeholder="Write a comment…">${esc(text || ('QA artifacts: ' + files.map(f => f.name).join(', ')))}</textarea><button id="j-com" class="btn btn-primary text-xs mt-2">Add comment</button>`;
      picker = issuePicker(el('#ip-mount'), true);
      el('#j-com').onclick = async () => { const keys = picker.keys(); const t = el('#j-ctext').value.trim(); if (!keys.length) { toast('Pick an issue', 'warn'); return; } if (!t) { toast('Write a comment', 'warn'); return; } let ok = 0; for (const key of keys) { const r = await postJson('/api/qa/jira/comment', { key, text: t }); if (r.ok) ok++; } toast(ok ? `Commented on ${ok} issue(s)` : 'comment failed', ok ? 'ok' : 'err'); };
    }
  };
  (async () => {
    const proj = el('#j-proj'); const pr = await fetch('/api/connectors/jira/projects').then(r => r.json()).catch(() => ({}));
    if (pr.ok && pr.projects && pr.projects.length) { proj.innerHTML = pr.projects.map(pp => `<option value="${esc(pp.key)}" ${pp.key === pr.defaultKey ? 'selected' : ''}>${esc(pp.key)} · ${esc(pp.name)}</option>`).join(''); proj.onchange = () => { const a = document.querySelector('#cmdk [data-jm].active'); drawJira(a ? a.dataset.jm : 'new'); }; }
    else proj.innerHTML = `<option value="">Jira not configured — add it in the hub</option>`;
    document.querySelectorAll('#cmdk [data-jm]').forEach(b => b.onclick = () => { document.querySelectorAll('#cmdk [data-jm]').forEach(x => x.classList.remove('active')); b.classList.add('active'); drawJira(b.dataset.jm); });
    drawJira('new');
  })();
}
// AI Fix-it: show the rewritten file, Apply overwrites (with .bak), then re-run.
async function fixCodeModal(p, file, instruction) {
  const box = openModal({ title: 'AI Fix — ' + file, subtitle: 'preview, then Apply (keeps a .bak backup)', size: '860px' });
  box.innerHTML = `<div class="py-10 text-center">${spinner('AI is rewriting ' + file + '…')}</div>`;
  let r; try { r = await postJson('/api/qa/ai/fix-code', { path: p, file, instruction }); } catch (e) { r = { error: e.message }; }
  if (!r || r.error) { box.innerHTML = `<div class="text-rose-400 text-sm">${esc((r && r.error) || 'AI request failed')}</div>`; return; }
  box.innerHTML = `<div class="text-[11px] text-slate-500 mb-2">${esc(r.path)} · ${esc(r.model || '')}</div>
    <pre class="log text-[11px] whitespace-pre-wrap bg-ink rounded-lg p-3 max-h-[58vh] overflow-auto">${esc(r.code)}</pre>
    <div class="flex gap-2 mt-3"><button id="fx-apply" class="btn btn-primary text-sm">${ICON.check}Apply to ${esc(r.path)}</button><button id="fx-copy" class="btn btn-secondary text-sm">Copy</button></div>`;
  el('#fx-copy').onclick = () => { navigator.clipboard.writeText(r.code); toast('Copied', 'ok'); };
  el('#fx-apply').onclick = async () => { const s = await postJson('/api/qa/apply-fix', { path: p, file: r.path, content: r.code }); if (s.error) return toast(s.error, 'err'); toast('Applied — backup at ' + s.backup, 'ok'); el('#cmdk').classList.add('hidden'); };
}
