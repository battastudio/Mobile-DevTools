// Build Helper frontend — release-notes helpers (window.NOTES): fill a per-env notes box from a
// template, the grouped commits since the last build, or the tracker tasks referenced in commits;
// plus the Jira issue picker (search existing + create new) whose selection rides along in the build.
'use strict';

const _tpl = (env) => `What's new in ${env.toUpperCase()}:\n- \n\nFixes:\n- `;
function _sel(env) { BH.jiraSel = BH.jiraSel || {}; return (BH.jiraSel[env] = BH.jiraSel[env] || []); }
function _renderChips(card, env) {
  const s = _sel(env), lbl = card.querySelector('.bh-jira-sel');
  if (lbl) lbl.textContent = s.length ? s.map((t) => t.key).join(', ') : '';
}

window.NOTES = {
  // Fill the notes textarea in the clicked button's env card.
  fill(btn) {
    const card = btn.closest('.bh-envcard'), env = btn.dataset.env, ta = card.querySelector('.bh-notes');
    if (btn.dataset.src === 'template') { ta.value = _tpl(env); return; }
    if (btn.dataset.src === 'commits') { ta.value = 'Loading commits…'; API.changelog(BH.sel, env).then((r) => ta.value = (r.text || '').trim() || 'No new commits since the last build.'); return; }
    // tracker: pull commit-scraped tasks, fill notes + preselect them in the Jira picker.
    ta.value = 'Loading tasks…';
    API.tasks(BH.sel, env).then((r) => {
      ta.value = (r.text || '').trim() || 'No tracker tasks referenced in commits.';
      BH.jiraSel = BH.jiraSel || {}; BH.jiraSel[env] = (r.items || []).map((i) => ({ key: i.key, title: i.title || '', state: i.state || '' }));
      _renderChips(card, env);
    });
  },
  // Modal: search existing Jira issues to attach, or create a new one. Selection stored per env.
  jiraPicker(btn) {
    const env = btn.dataset.env, card = btn.closest('.bh-envcard');
    const b = openModal({ title: 'Jira issues', subtitle: env.toUpperCase(), size: '560px' });
    b.innerHTML = `<div class="flex gap-2 mb-2"><input id="jq" class="field text-sm flex-1" placeholder="Search issues…" spellcheck="false"/><button id="jgo" class="btn btn-secondary text-sm">Search</button></div>
      <div id="jres" class="space-y-1 max-h-64 overflow-y-auto mb-3 text-sm"></div>
      <div class="border-t border-edge pt-3"><div class="text-[11px] text-slate-500 mb-1">Create a new issue</div>
        <div class="flex gap-2"><input id="jnew" class="field text-sm flex-1" placeholder="New issue summary…"/><button id="jcreate" class="btn btn-primary text-sm">Create</button></div></div>`;
    const cur = () => new Set(_sel(env).map((t) => t.key));
    const search = async () => {
      el('#jres').innerHTML = '<div class="text-slate-500 text-xs">Searching…</div>';
      const r = await API.jiraSearch(BH.sel, el('#jq').value.trim());
      const set = cur();
      el('#jres').innerHTML = (r.issues || []).length ? r.issues.map((i) => `<label class="flex items-center gap-2 py-0.5"><input type="checkbox" class="jpick" data-key="${esc(i.key)}" data-title="${esc(i.summary)}" ${set.has(i.key) ? 'checked' : ''}/><span class="font-mono text-[11px] text-brand">${esc(i.key)}</span><span class="truncate text-slate-300">${esc(i.summary)}</span></label>`).join('')
        : `<div class="text-slate-500 text-xs">${r.error ? esc(r.error) : 'No matches (is Jira connected in Setup?).'}</div>`;
      el('#jres').querySelectorAll('.jpick').forEach((c) => c.onchange = () => {
        const s = _sel(env), key = c.dataset.key;
        if (c.checked) { if (!s.find((t) => t.key === key)) s.push({ key, title: c.dataset.title, state: '' }); }
        else BH.jiraSel[env] = s.filter((t) => t.key !== key);
        _renderChips(card, env);
      });
    };
    el('#jgo').onclick = search; el('#jq').onkeydown = (e) => { if (e.key === 'Enter') search(); };
    el('#jcreate').onclick = async () => {
      const summary = el('#jnew').value.trim(); if (!summary) return;
      const r = await API.post('/api/tracker/issue', { path: BH.sel, summary });
      if (!r.ok) return toast(r.error || 'Create failed', 'err');
      _sel(env).push({ key: r.key, title: summary, state: '' }); _renderChips(card, env); toast(`Created ${r.key}`, 'ok'); el('#jnew').value = '';
    };
    search();
  },
};
