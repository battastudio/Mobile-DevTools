// Build Helper frontend — build-page wiring (source-verbatim behaviour). Env checkboxes ↔ pipeline,
// outputs reveal Play-track / Validate-IPA, note fills, the Jira task picker, artifact browser, and
// history. Cross-tool refs resolve to our views (showAppSetup→openAppSetup, analytics→V.analytics).
'use strict';

function wireProject(a, g, av) {
  const showAppSetup = window.openAppSetup, showSetup = () => V.setup();
  document.querySelectorAll('[data-env]').forEach((card) => { const chk = card.querySelector('.envchk'), body = card.querySelector('.env-body'); if (chk) { const apply = () => body.classList.toggle('hidden', !chk.checked); chk.addEventListener('change', apply); chk.addEventListener('change', syncPipeline); apply(); } });
  function syncPipeline() {
    const stations = [...document.querySelectorAll('.pipeline .station')];
    stations.forEach((st) => { const c = document.querySelector(`[data-env="${st.dataset.pipe}"]`); const on = !!(c && c.querySelector('.envchk') && c.querySelector('.envchk').checked); st.classList.toggle('sel', on); });
    document.querySelectorAll('.pipeline .rail').forEach((rail, idx) => { const x = stations[idx], y = stations[idx + 1]; rail.classList.toggle('lit', !!(x && y && x.classList.contains('sel') && y.classList.contains('sel'))); });
  }
  document.querySelectorAll('.station[data-pipe]').forEach((st) => st.onclick = () => { const c = document.querySelector(`[data-env="${st.dataset.pipe}"]`); if (!c) return; const chk = c.querySelector('.envchk'); if (chk) { chk.checked = !chk.checked; chk.dispatchEvent(new Event('change')); } c.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
  syncPipeline();
  el('#appsetup').onclick = () => showAppSetup(a.path);
  ['#setupcta', '#defenv', '#tf-setup'].forEach((id) => { const b = el(id); if (b) b.onclick = () => showAppSetup(a.path); });
  if (av.testflight) loadTestFlightLatest(a.path);
  el('#build').onclick = tryBuild;
  document.querySelectorAll('[data-env]').forEach((card) => { const sync = () => { const on = (o) => !!card.querySelector(`.out[data-out="${o}"]`)?.checked; card.querySelector('.track-wrap')?.classList.toggle('hidden', !on('play')); card.querySelector('.validate-wrap')?.classList.toggle('hidden', !on('testflight')); }; card.querySelectorAll('.out').forEach((cb) => cb.addEventListener('change', sync)); sync(); });
  document.querySelectorAll('.out-connect').forEach((b) => b.onclick = (e) => { e.preventDefault(); e.stopPropagation(); if (b.dataset.connect === 'onedrive') showSetup(); else showAppSetup(a.path); });
  reattachBuildLog();
  el('#copylog').onclick = () => { navigator.clipboard.writeText(el('#log').innerText); toast('Log copied', 'ok'); };
  el('#dllog').onclick = () => { const b = new Blob([el('#log').innerText], { type: 'text/plain' }); const u = URL.createObjectURL(b); const x = document.createElement('a'); x.href = u; x.download = a.name + '-log.txt'; x.click(); URL.revokeObjectURL(u); };
  document.querySelectorAll('.bump').forEach((btn) => btn.onclick = () => { const inp = btn.closest('.env-body').querySelector('.bname'); inp.value = bumpVersion(inp.value, btn.dataset.kind); });
  document.querySelectorAll('.commitfill').forEach((btn) => btn.onclick = async () => { const card = btn.closest('[data-env]'); const r = await fetch(`/api/changelog?path=${encodeURIComponent(a.path)}&env=${card.dataset.env}&grouped=1`).then((r) => r.json()); card.querySelector('.notes').value = r.text || '(no commits since last build)'; toast('Filled from commits (grouped)', 'ok'); });
  document.querySelectorAll('.trackerfill').forEach((btn) => btn.onclick = async () => { const card = btn.closest('[data-env]'); const r = await fetch(`/api/tracker/tasks?path=${encodeURIComponent(a.path)}&env=${card.dataset.env}`).then((r) => r.json()); if (!r.count) { toast('No tasks found in commits (or no tracker configured)', 'warn'); return; } const ta = card.querySelector('.notes'); ta.value = [ta.value.trim(), r.text].filter(Boolean).join('\n\n'); toast(`Added ${r.count} task${r.count > 1 ? 's' : ''}`, 'ok'); });
  const curBranch = () => { const v = el('#branch').value; return v.startsWith('(') ? '' : v; };
  const getSel = (card) => { try { return JSON.parse(card.querySelector('.jiratasks').value || '[]'); } catch { return []; } };
  const setSel = (card, arr) => { card.querySelector('.jiratasks').value = JSON.stringify(arr); const c = card.querySelector('.jira-count'); if (c) c.textContent = arr.length ? `· ${arr.length} selected` : ''; };
  const refreshNote = async (card, force) => {
    const env = card.dataset.env, ta = card.querySelector('.notes'), br = curBranch();
    const [commit, ch] = await Promise.all([fetch(`/api/gitmeta?path=${encodeURIComponent(a.path)}&branch=${encodeURIComponent(br)}`).then((r) => r.json()).catch(() => null), fetch(`/api/changelog?path=${encodeURIComponent(a.path)}&env=${encodeURIComponent(env)}`).then((r) => r.json()).then((r) => r.text).catch(() => '')]);
    const sel = getSel(card);
    const tpl = noteTemplate(card.dataset.label || env, card.dataset.mode, br, (commit && commit.sha) ? commit : null, ch, fmtSelTasks(sel), sel.filter((t) => t.created).map((t) => ({ key: t.key, summary: t.title })));
    if (force || !ta.value.trim() || ta.value === ta.dataset.tpl) ta.value = tpl; ta.dataset.tpl = tpl;
  };
  document.querySelectorAll('.noteregen').forEach((btn) => btn.onclick = () => refreshNote(btn.closest('[data-env]'), true).then(() => toast('Notes regenerated', 'ok')));
  el('#branch').onchange = () => document.querySelectorAll('[data-env]').forEach((card) => refreshNote(card, false));
  document.querySelectorAll('[data-env]').forEach((card) => refreshNote(card, false));
  const renderJiraList = (card, results) => {
    const sel = getSel(card), selKeys = new Set(sel.map((t) => t.key)), map = new Map(); sel.forEach((t) => map.set(t.key, { ...t }));
    (results || []).forEach((r) => { const k = r.key; if (!map.has(k)) map.set(k, { key: k, title: r.summary || r.title || '', state: r.status || r.state || '' }); });
    const rows = [...map.values()], box = card.querySelector('.jira-list');
    box.innerHTML = rows.length ? rows.map((t) => `<label class="flex items-start gap-2 cursor-pointer py-0.5"><input type="checkbox" class="jira-chk accent-brand mt-0.5" data-key="${esc(t.key)}" ${selKeys.has(t.key) ? 'checked' : ''}/><span><span class="font-mono text-slate-300">${esc(t.key)}</span> ${esc(t.title || '')} ${t.state ? `<span class="text-slate-500">(${esc(t.state)})</span>` : ''}${t.created ? ' <span class="text-emerald-400">created</span>' : ''}</span></label>`).join('') : '<div class="text-slate-500">No tasks yet — search above or + New. (Jira must be connected in Setup.)</div>';
    box.querySelectorAll('.jira-chk').forEach((chk) => chk.onchange = () => { let s = getSel(card); const key = chk.dataset.key; if (chk.checked) { if (!s.find((t) => t.key === key)) { const info = map.get(key) || { key }; s.push({ key, title: info.title || '', state: info.state || '', created: info.created }); } } else s = s.filter((t) => t.key !== key); setSel(card, s); refreshNote(card, false); });
  };
  document.querySelectorAll('[data-env]').forEach((card) => {
    setSel(card, []);
    fetch(`/api/tracker/tasks?path=${encodeURIComponent(a.path)}&env=${card.dataset.env}`).then((r) => r.json()).then((r) => { if (r && r.items && r.items.length) { const jira = r.items.filter((i) => i.tracker === 'jira' || /^[A-Z][A-Z0-9]+-\d+$/.test(i.key)); if (jira.length) { setSel(card, jira.map((i) => ({ key: i.key, title: i.title || '', state: i.state || '' }))); refreshNote(card, false); } } renderJiraList(card, []); }).catch(() => renderJiraList(card, []));
    const search = card.querySelector('.jira-search'); let t;
    if (search) search.oninput = () => { clearTimeout(t); t = setTimeout(async () => { const r = await fetch(`/api/jira/search?path=${encodeURIComponent(a.path)}&q=${encodeURIComponent(search.value.trim())}`).then((x) => x.json()).catch(() => ({})); if (!r.ok) { card.querySelector('.jira-list').innerHTML = `<div class="text-amber-400">${esc(r.error || 'Search failed')}</div>`; return; } renderJiraList(card, r.issues || []); }, 300); };
    const newBtn = card.querySelector('.jira-new');
    if (newBtn) newBtn.onclick = async () => { const summary = prompt('New Jira issue — summary:'); if (!summary || !summary.trim()) return; newBtn.disabled = true; try { const r = await postJson('/api/tracker/issue', { path: a.path, summary: summary.trim() }); if (!r.ok) { toast(r.error || 'Create failed', 'err'); return; } const s = getSel(card); s.push({ key: r.key, title: r.summary || summary.trim(), state: '', created: true }); setSel(card, s); renderJiraList(card, []); refreshNote(card, false); toast('Created ' + r.key, 'ok'); } catch (e) { toast('Create failed: ' + e.message, 'err'); } finally { newBtn.disabled = false; } };
  });
  el('#refreshart').onclick = loadArtifactBrowser;
  el('#analyticslink').onclick = () => (window.V.analytics ? V.analytics(a.path) : null);
  loadArtifactBrowser();
  renderHistory(CUR.builds);
}
