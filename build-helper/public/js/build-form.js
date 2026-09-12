// Build Helper frontend — build-form helpers (source-verbatim): per-project form memory, the release
// note template, version bump, output→artifact mapping, collectPayload (→ /api/build body), and the
// on-disk artifact browser. Consumed by project.js (render) + build-wire.js (event wiring).
'use strict';

const memKey = (p) => 'bh:mem:' + p;
const loadMem = (p) => { try { return JSON.parse(localStorage.getItem(memKey(p)) || '{}'); } catch { return {}; } };
const saveMem = (p, data) => { try { localStorage.setItem(memKey(p), JSON.stringify(data)); } catch {} };
const baseVer = (v) => { if (!v) return { name: '1.0.0', num: 1 }; const [name, num] = v.split('+'); return { name, num: parseInt(num || '0', 10) }; };
const fmtSelTasks = (arr) => (arr && arr.length) ? 'Tasks in this release (' + arr.length + '):\n' + arr.map((t) => '- ' + t.key + (t.title ? ' ' + t.title : '') + (t.state ? ' (' + t.state + ')' : '')).join('\n') : '';

function noteTemplate(label, mode, branch, commit, changesText, tasksText, created) {
  const L = [`${(label || '').toString()} version`, '', 'Developer Notes:'];
  L.push(`Environment: ${label || '-'}${mode ? ' → AppMode.' + mode : ''}`);
  L.push(`Last Commit details: ${commit && commit.subject ? commit.subject : '----'}`);
  if (commit && (commit.author || commit.date)) L.push(`Author: ${commit.author || '-'}${commit.date ? ' · ' + commit.date : ''}`);
  L.push(`Commit Id: ${commit && commit.sha ? commit.sha : '---'}`);
  if (commit && commit.url) L.push(`Commit link: ${commit.url}`);
  L.push(`Branch name: ${branch || '-----'}`);
  if (changesText && String(changesText).trim()) L.push('', 'Changes:', String(changesText).trim());
  if (tasksText && String(tasksText).trim()) L.push('', String(tasksText).trim());
  if (created && created.length) L.push('', ...created.map((c) => `Created: ${c.key}${c.summary ? ' ' + c.summary : ''}`));
  return L.join('\n');
}

function bumpVersion(v, kind) {
  const m = /^(\d+)\.(\d+)\.(\d+)/.exec(v || '0.0.0'); if (!m) return v;
  let [, x, y, z] = m.map(Number);
  if (kind === 'major') { x++; y = 0; z = 0; } else if (kind === 'minor') { y++; z = 0; } else z++;
  return `${x}.${y}.${z}`;
}

// One environment card: colored left bar, selection, version+bump, notes+fills, Jira picker, and the
// big Outputs matrix (with amber "connect it" links when an account/connector is missing).
function envCard(e, next, bv, mem, av, CONNECT, g) {
  const env = e.key, c = e.color || 'slate';
  const num = mem['num_' + env] || next[env] || (bv.num + 1);
  const name = mem['name_' + env] || bv.name;
  const tpl = noteTemplate(e.label || env, e.mode, g.current, g.lastCommit, '');
  const val = mem['notes_' + env] || tpl;
  const outs = [['local', 'Build only', 'Compile locally and keep the APK on this machine — no upload.'], ['onedrive', 'Upload to OneDrive', 'Upload the APK to your shared OneDrive folder; testers get a link + QR.'], ['testflight', 'TestFlight', 'Upload the iOS build to App Store Connect for TestFlight testers.'], ['firebase', 'Firebase (Android)', 'Distribute the Android APK to your Firebase tester groups.'], ['play', 'Google Play', 'Upload the Android App Bundle (AAB) to a Google Play track.']];
  return `<div class="surface p-5 pl-6 relative overflow-hidden" data-env="${esc(env)}" data-label="${esc(e.label || env)}" data-mode="${esc(e.mode || '')}" data-prod="${e.prod ? 1 : 0}">
    <div class="absolute left-0 top-0 bottom-0 w-1.5" style="background:${ENV_HEX[env] || 'var(--base)'};box-shadow:0 0 20px -2px ${ENV_HEX[env] || 'transparent'}"></div>
    <div class="flex items-center gap-3"><label class="flex items-center gap-2.5 font-semibold cursor-pointer"><input type="checkbox" class="envchk accent-${c}-500 h-4 w-4"/> ${badge(esc((e.label || env).toUpperCase()), c)}</label><span class="readout text-[11px] text-slate-500">AppMode.${esc(e.mode || '?')}</span>${e.prod ? '<span class="status ok ml-auto" style="font-size:.62rem">production</span>' : ''}</div>
    <div class="env-body hidden mt-4 grid sm:grid-cols-2 gap-3">
      <div><div class="text-xs text-slate-400">Build version <span class="text-rose-400">*</span></div><div class="flex items-center gap-1 mt-1"><input class="bname field flex-1 font-mono text-sm" value="${name}"/>${['major:M', 'minor:m', 'patch:p'].map((k) => `<button type="button" class="bump text-[10px] rounded border border-edge px-1.5 py-1 hover:bg-panel" data-kind="${k.split(':')[0]}" title="${k.split(':')[0]}">${k.split(':')[1]}</button>`).join('')}</div></div>
      <label class="text-xs text-slate-400">Build number <span class="text-rose-400">*</span><input class="bnum field w-full font-mono text-sm mt-1 block" value="${num}"/></label>
      <div class="sm:col-span-2"><div class="flex items-center flex-wrap gap-1"><div class="text-xs text-slate-400">Release notes <span class="text-rose-400">*</span></div><div class="ml-auto flex items-center gap-1"><button type="button" class="noteregen text-[11px] rounded border border-edge px-2 py-0.5 hover:bg-panel" title="Reset to the auto-generated template">↻ template</button><button type="button" class="trackerfill text-[11px] rounded border border-edge px-2 py-0.5 hover:bg-panel" title="Append tracker tasks referenced in commits">↻ tracker</button><button type="button" class="commitfill text-[11px] rounded border border-edge px-2 py-0.5 hover:bg-panel" title="Grouped changelog from commits since the last build">↻ commits</button></div></div>
        <textarea class="notes field w-full text-sm mt-1" rows="6" placeholder="Shown to testers / stores and saved with the build" data-tpl="${esc(tpl)}">${esc(val)}</textarea>
        <div class="text-[10px] text-slate-500 mt-1 leading-relaxed">Fill from — <b class="text-slate-400">template</b>: internal note (environment + last commit) · <b class="text-slate-400">tracker</b>: Jira tickets referenced in commits · <b class="text-slate-400">commits</b>: grouped changelog since the last build.</div></div>
      <div class="sm:col-span-2"><input type="hidden" class="jiratasks" value="[]"/><details class="jira-picker rounded-lg border border-edge/70 bg-white/[.02] px-3 py-2"><summary class="cursor-pointer text-xs text-slate-400 select-none flex items-center gap-2"><span style="color:var(--iris2)">${ICON.layers}</span>Jira tasks for this build<span class="jira-count text-slate-500"></span></summary><div class="mt-2"><div class="flex gap-2"><input class="jira-search field flex-1 text-sm" placeholder="Search Jira by text or key…"/><button type="button" class="jira-new btn btn-secondary text-xs">+ New</button></div><div class="jira-list mt-2 space-y-1 max-h-44 overflow-auto text-xs text-slate-500">Loading…</div></div></details></div>
      <div class="sm:col-span-2"><div class="text-xs text-slate-400 mb-1.5">Outputs — where should this build go? <span class="text-rose-400">*</span></div><div class="grid sm:grid-cols-2 gap-2">${outs.map(([id, lbl, desc]) => { const ok = av[id], checked = ok && (mem['out_' + env] || []).includes(id); return `<label class="out-opt flex items-start gap-2.5 rounded-lg border px-3 py-2 ${ok ? 'border-edge/70 bg-white/[.02] cursor-pointer hover:border-brand/40' : 'border-edge/40 bg-white/[.01] opacity-60 cursor-not-allowed'}"><input type="checkbox" class="out accent-brand mt-0.5 h-4 w-4" data-out="${id}" ${checked ? 'checked' : ''} ${ok ? '' : 'disabled'}/><span class="min-w-0"><span class="text-sm ${ok ? 'text-slate-200' : 'text-slate-400'}">${lbl}</span><span class="block text-[11px] text-slate-500 leading-snug">${desc}</span>${ok ? '' : `<button type="button" class="out-connect mt-1 block text-left text-[11px] text-amber-400 hover:underline" data-connect="${id}">⚠ ${CONNECT[id]} ▸</button>`}</span></label>`; }).join('')}</div></div>
      <label class="track-wrap text-xs text-slate-400 hidden">Play track<select class="track mt-1 field text-sm ml-2 py-1.5">${['internal', 'alpha', 'beta', 'production'].map((t) => `<option ${(e.prod ? (CUR.settings && CUR.settings.defaultTrack) || 'internal' : 'internal') === t ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <div class="sm:col-span-2 text-xs text-slate-400 rounded-lg bg-white/[.02] border border-edge/60 px-3 py-2 space-y-1.5"><div class="text-slate-500">Options</div>
        <label class="validate-wrap hidden items-start gap-2 cursor-pointer flex"><input type="checkbox" class="uvalidate accent-brand mt-0.5" ${mem['val_' + env] ? 'checked' : ''}/><span>Validate IPA first<span class="block text-[11px] text-slate-500">Run Apple's validation before uploading to catch signing/asset errors early.</span></span></label>
        <label class="flex items-start gap-2 cursor-pointer"><input type="checkbox" class="uautonum accent-brand mt-0.5" ${mem['auto_' + env] ? 'checked' : ''}/><span>Auto build number<span class="block text-[11px] text-slate-500">Ignore the number above; use the next free build number automatically.</span></span></label>
        <label class="flex items-start gap-2 cursor-pointer"><input type="checkbox" class="usymbols accent-brand mt-0.5"/><span>Upload crash symbols<span class="block text-[11px] text-slate-500">Upload debug symbols (dSYMs) so Crashlytics can symbolicate crashes.</span></span></label></div>
    </div></div>`;
}

const ART_FOR_OUT = { local: 'apk', onedrive: 'apk', firebase: 'apk', testflight: 'ipa', play: 'aab' };
function collectPayload() {
  const a = CUR.app;
  if (![...document.querySelectorAll('.envchk')].some((c) => c.checked)) { toast('Check at least one environment to build.', 'warn'); return null; }
  const envs = [], artSet = new Set(), missing = [];
  document.querySelectorAll('[data-env]').forEach((card) => {
    const chk = card.querySelector('.envchk'); if (!chk || !chk.checked) return;
    const label = card.dataset.label || card.dataset.env;
    const outs = [...card.querySelectorAll('.out:checked')].map((x) => x.dataset.out);
    const buildName = card.querySelector('.bname').value.trim(), buildNumber = card.querySelector('.bnum').value.trim(), notes = card.querySelector('.notes').value.trim();
    const need = []; if (!buildName) need.push('build version'); if (!buildNumber) need.push('build number'); if (!notes) need.push('release notes'); if (!outs.length) need.push('an output');
    if (need.length) { missing.push(`${label} → ${need.join(', ')}`); return; }
    const dest = { onedrive: [], firebase: [], play: [], testflight: [] };
    outs.forEach((o) => { const art = ART_FOR_OUT[o]; artSet.add(art); if (o !== 'local') dest[o].push(art); });
    envs.push({ env: card.dataset.env, prod: card.dataset.prod === '1', buildName, buildNumber, notes, whatsNew: notes, track: card.querySelector('.track')?.value || '', dest, validate: !!card.querySelector('.uvalidate')?.checked, autoNum: !!card.querySelector('.uautonum')?.checked, uploadSymbols: !!card.querySelector('.usymbols')?.checked, jiraTasks: (() => { try { return JSON.parse(card.querySelector('.jiratasks')?.value || '[]'); } catch { return []; } })() });
  });
  if (missing.length) { toast('Fill required fields — ' + missing.join(' · '), 'warn'); return null; }
  if (!envs.length) return null;
  const branchSel = el('#branch'), branch = branchSel.value.startsWith('(') ? null : branchSel.value;
  const commitTag = el('#committag').checked, push = el('#push').checked, runTest = el('#runtest').checked, runAnalyze = el('#runanalyze').checked, gateWarnOnly = el('#gatewarn').checked;
  envs.forEach((e) => { e.commitTag = commitTag; e.push = push; });
  const mem = { clean: el('#clean').checked, pubGet: el('#pubget').checked, commitTag, push, runTest, runAnalyze, gateWarnOnly };
  document.querySelectorAll('[data-env]').forEach((card) => { const env = card.dataset.env; mem['name_' + env] = card.querySelector('.bname').value.trim(); mem['num_' + env] = card.querySelector('.bnum').value.trim(); mem['notes_' + env] = card.querySelector('.notes').value.trim(); mem['out_' + env] = [...card.querySelectorAll('.out:checked')].map((x) => x.dataset.out); mem['val_' + env] = !!card.querySelector('.uvalidate')?.checked; mem['auto_' + env] = !!card.querySelector('.uautonum')?.checked; });
  saveMem(a.path, mem);
  return { path: a.path, branch, envs, artifacts: [...artSet], clean: el('#clean').checked, pubGet: el('#pubget').checked, runTest, runAnalyze, gateWarnOnly };
}

async function loadArtifactBrowser() {
  const box = el('#artbrowser'); if (!box) return;
  const r = await fetch('/api/artifacts?project=' + encodeURIComponent(CUR.app.name)).then((r) => r.json()).catch(() => ({ files: [] }));
  if (!r.files || !r.files.length) { box.innerHTML = '<div class="text-xs text-slate-500">No collected artifacts yet.</div>'; return; }
  box.innerHTML = r.files.map((f) => `<div class="flex items-center gap-2 text-xs"><span class="font-mono flex-1 truncate">${esc(f.name)}</span><span class="text-slate-500">${fmtBytes(f.size)}</span><a href="/artifact?path=${encodeURIComponent(f.path)}" class="text-emerald-400">↓</a><button class="revealf text-slate-400" data-p="${esc(f.path)}">reveal</button><button class="delf text-rose-400" data-p="${esc(f.path)}">✕</button></div>`).join('');
  box.querySelectorAll('.revealf').forEach((b) => b.onclick = () => API.reveal(b.dataset.p));
  box.querySelectorAll('.delf').forEach((b) => b.onclick = async () => { await postJson('/api/artifact/delete', { path: b.dataset.p }).catch(() => {}); toast('Deleted', 'ok'); loadArtifactBrowser(); });
}
