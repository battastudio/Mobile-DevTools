// Build Helper frontend — App Setup wiring + save (source design). Collects the whole modal into a
// single /api/app/save (override/firebase/apple/play/settings+schedules/trackers), saves client
// groups via /api/groups/save, and streams keystore generate/link. Reloads modal + build page.
'use strict';

const _slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function wireAppSetup(d, a, pth) {
  const wireEnvDel = () => document.querySelectorAll('.el-del').forEach((b) => b.onclick = () => b.closest('.envrow').remove());
  wireEnvDel();
  el('#envadd').onclick = () => { el('#envrows').insertAdjacentHTML('beforeend', asEnvRow({ color: 'sky' })); wireEnvDel(); };
  const wireCmdDel = () => document.querySelectorAll('.cmd-del').forEach((b) => b.onclick = () => b.closest('.flex').remove());
  wireCmdDel();
  if (el('#preadd')) el('#preadd').onclick = () => { el('#prebox').insertAdjacentHTML('beforeend', asCmdRow('pre-cmd', '')); wireCmdDel(); };
  if (el('#postadd')) el('#postadd').onclick = () => { el('#postbox').insertAdjacentHTML('beforeend', asCmdRow('post-cmd', '')); wireCmdDel(); };
  const wireSchedDel = () => document.querySelectorAll('.sc-del').forEach((b) => b.onclick = () => b.closest('.schedrow').remove());
  wireSchedDel();
  if (el('#schedadd')) el('#schedadd').onclick = () => { const box = el('#schedbox'); const n = box.querySelector('.nosched'); if (n) n.remove(); box.insertAdjacentHTML('beforeend', asSchedRow(a, {})); wireSchedDel(); };
  const collectEnvs = () => { const out = [], used = new Set(); document.querySelectorAll('.envrow').forEach((row) => { const label = row.querySelector('.el-label').value.trim(), mode = row.querySelector('.el-mode').value.trim(); if (!label || !mode) return; let key = row.dataset.key || _slug(label) || 'env'; while (used.has(key)) key += '_2'; used.add(key); out.push({ key, label, mode, color: row.querySelector('.el-color').value, prod: row.querySelector('.el-prod').checked }); }); return out; };
  let appleClear = false, playClear = false;
  if (el('#ap-aclear')) el('#ap-aclear').onclick = () => { appleClear = true; el('#ap-akey').value = ''; el('#ap-aiss').value = ''; el('#ap-ap8').value = ''; toast('Apple account will be removed on Save', 'info'); };
  if (el('#pl-aclear')) el('#pl-aclear').onclick = () => { playClear = true; el('#pl-ajson').value = ''; toast('Play account will be removed on Save', 'info'); };
  // Client groups (team-shared store).
  const grpRepo = a.repo || a.name;
  const grpRow = (g = {}) => `<div class="grouprow rounded-lg border border-edge p-3"><div class="flex items-center gap-2 mb-1.5"><input class="g-name field text-sm flex-1" placeholder="Group name (e.g. Beta clients)" value="${esc(g.name || '')}"/><button type="button" class="g-del text-rose-400 text-xs shrink-0">Remove</button></div><textarea class="g-emails field w-full text-xs font-mono" rows="2" placeholder="client1@x.com, client2@x.com">${esc((g.emails || []).join(', '))}</textarea></div>`;
  const wireGrpDel = () => document.querySelectorAll('.g-del').forEach((b) => b.onclick = () => b.closest('.grouprow').remove());
  const fillBox = (sel, rows) => { const box = el(sel); if (!box) return; box.innerHTML = (rows && rows.length) ? rows.map(grpRow).join('') : '<div class="text-xs text-slate-500 nogroups">None yet — add one.</div>'; };
  fetch('/api/groups?repo=' + encodeURIComponent(grpRepo)).then((r) => r.json()).then((r) => { fillBox('#gglobalbox', r.global); fillBox('#groupsbox', r.own); wireGrpDel(); }).catch(() => { fillBox('#gglobalbox', []); fillBox('#groupsbox', []); });
  const addRow = (sel) => { const box = el(sel); const ng = box.querySelector('.nogroups'); if (ng) ng.remove(); box.insertAdjacentHTML('beforeend', grpRow()); wireGrpDel(); };
  if (el('#gaddgrp')) el('#gaddgrp').onclick = () => addRow('#groupsbox');
  if (el('#gaddglobal')) el('#gaddglobal').onclick = () => addRow('#gglobalbox');
  const collectGroups = (sel) => [...el(sel).querySelectorAll('.grouprow')].map((row) => ({ name: row.querySelector('.g-name').value.trim(), emails: row.querySelector('.g-emails').value.split(/[\s,;]+/).map((e) => e.trim()).filter(Boolean) })).filter((g) => g.name || g.emails.length);
  if (el('#gsave')) el('#gsave').onclick = async () => { const g1 = await postJson('/api/groups/save', { repo: '*', groups: collectGroups('#gglobalbox') }); const g2 = await postJson('/api/groups/save', { repo: grpRepo, groups: collectGroups('#groupsbox') }); (g1.ok && g2.ok) ? toast('Client groups saved (shared with team)', 'ok') : toast(g1.error || g2.error || 'Save failed', 'err'); };
  const trackerDirty = new Set(), trackerClear = new Set();
  document.querySelectorAll('[id^="astr-"]').forEach((inp) => inp.addEventListener('input', () => { const id = inp.id.split('-')[1]; trackerDirty.add(id); trackerClear.delete(id); }));
  document.querySelectorAll('.astr-clear').forEach((b) => b.onclick = () => { const id = b.dataset.id; trackerClear.add(id); trackerDirty.delete(id); ((d.trackerDefs || []).find((t) => t.id === id)?.fields || []).forEach(([n]) => { const e = el(`#astr-${id}-${n}`); if (e) e.value = ''; }); toast('Will use global on Save', 'info'); });
  const reloadAppSetup = async () => { const sc = el('#modalbody')?.scrollTop || 0; try { CUR = await API.project(pth); if (CUR && CUR.app && BH.view === 'project') renderProject(); } catch {} await showAppSetup(pth); const mb = el('#modalbody'); if (mb) mb.scrollTop = sc; };
  el('#assave').onclick = async () => {
    const override = { envs: collectEnvs() }; const f = el('#ovfile').value.trim(), cn = el('#ovconst').value.trim();
    if (f) override.envFile = f; if (cn) override.constName = cn;
    const body = { path: pth, override, firebaseApp: { appId: el('#asfbid').value.trim(), groups: el('#asfbgroups').value.trim() },
      apple: appleClear ? { clear: true } : { keyId: el('#ap-akey').value.trim(), issuerId: el('#ap-aiss').value.trim(), p8: el('#ap-ap8').value.trim() },
      play: playClear ? { clear: true } : { serviceAccountJson: el('#pl-ajson').value.trim(), defaultTrack: el('#pl-atrack').value },
      settings: { defaultTrack: el('#astrack').value, defaultArtifacts: [...document.querySelectorAll('.asart:checked')].map((x) => x.value), preBuild: [...document.querySelectorAll('.pre-cmd')].map((i) => i.value.trim()).filter(Boolean), postBuild: [...document.querySelectorAll('.post-cmd')].map((i) => i.value.trim()).filter(Boolean), buildArgs: el('#asbuildargs')?.value.trim() || '', flavor: el('#asflavor')?.value.trim() || '',
        schedules: [...document.querySelectorAll('.schedrow')].map((row) => { const arts = [...row.querySelectorAll('.sc-art:checked')].map((x) => x.value); const dest = { onedrive: [], firebase: [], play: [], testflight: [] }; [...row.querySelectorAll('.sc-dst:checked')].forEach((x) => dest[x.value] = (arts.length ? arts : ['apk']).slice()); return { id: row.dataset.id || ('s' + Math.round(performance.now()).toString(36)), enabled: row.querySelector('.sc-en').checked, env: row.querySelector('.sc-env').value, time: row.querySelector('.sc-time').value, days: row.querySelector('.sc-days').value, artifacts: arts.length ? arts : ['apk'], dest, autoNum: true, lastRunYmd: row.dataset.last || '' }; }).filter((s) => s.env) } };
    const trackers = {};
    (d.trackerDefs || []).forEach((t) => { if (trackerClear.has(t.id)) trackers[t.id] = { clear: true }; else if (trackerDirty.has(t.id)) { const o = {}; t.fields.forEach(([n]) => o[n] = (el(`#astr-${t.id}-${n}`)?.value || '').trim()); trackers[t.id] = o; } });
    if (Object.keys(trackers).length) body.trackers = trackers;
    const r = await postJson('/api/app/save', body);
    if (!r.ok) { toast(r.error || 'Save failed', 'err'); return; }
    toast('App setup saved', 'ok'); await reloadAppSetup();
  };
  const runSign = (url, extra) => { const box = el('#sglog'); box.classList.remove('hidden'); streamSSEInto(url, { path: pth, ...extra }, box, () => reloadAppSetup()); };
  el('#sggen').onclick = () => { const pw = el('#sgpw').value; if (pw.length < 6) { toast('Password ≥6 chars', 'warn'); return; } runSign('/api/signing/generate', { password: pw, alias: el('#sgalias').value.trim() || 'upload' }); };
  el('#sglinkbtn').onclick = () => { const sf = el('#sglink').value.trim(); if (!sf) { toast('Enter a .jks path', 'warn'); return; } const pw = prompt('Keystore password?') || ''; const al = prompt('Key alias?', 'upload') || 'upload'; runSign('/api/signing/link', { storeFile: sf, storePassword: pw, keyPassword: pw, keyAlias: al }); };
}
