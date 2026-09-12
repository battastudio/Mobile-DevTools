// Build Helper frontend — Project (Build) view: composes the build form (build-form.js), release
// notes / Jira picker (notes.js), and the poll-based runner (build-run.js). Renders the header,
// wires every control, and reattaches a running build's log on entry.
'use strict';

window.V.project = async function (projectPath) {
  BH.sel = projectPath; BH.view = 'project'; BH.jiraSel = {}; if (window.setShell) setShell('build');
  _body().innerHTML = _skel(2);
  const d = await API.project(projectPath).catch(() => null);
  if (!d || d.error) { _body().innerHTML = '<div class="surface p-6 text-rose-300 text-sm">Could not load this project.</div>'; return; }
  BH.project = d;
  const app = d.app, nn = d.nextBuildNumbers || {}, base = verName(app.version), h = d.health || {};
  const pill = (ok, on, off) => ok ? `<span class="status ok">${on}</span>` : `<span class="status off">${off}</span>`;
  const flags = { onedriveConnected: d.onedriveConnected, firebaseCli: d.firebaseCli, globalPlay: d.globalPlay, play: d.play, globalApple: d.globalApple, apple: d.apple };

  _body().innerHTML = `
    <button id="bh-back" class="btn btn-ghost text-xs px-2 py-1 mb-3">← Dashboard</button>
    <div class="surface p-4 mb-4">
      <div class="flex items-center gap-3 flex-wrap">
        <div class="font-display text-lg font-bold">${esc(app.name)}</div>
        <span class="status">v${esc(base)}</span>
        ${app.currentMode ? `<span class="text-xs text-slate-400">on <b>${esc(app.currentMode)}</b></span>` : ''}
        <div class="ml-auto flex items-center gap-2">
          ${pill(h.envDetected, 'env ok', 'no env')}${pill(h.signing, 'signed', 'unsigned')}
          <button id="bh-analytics" class="btn btn-ghost text-xs">${ICON.fileText || ''}Analytics</button>
          <button id="bh-appsetup" class="btn btn-ghost text-xs">${ICON.gear}App Setup</button>
          <button id="bh-sign" class="btn btn-secondary text-xs">${ICON.link}Signing</button>
        </div>
      </div>
      <div class="text-[11px] font-mono text-slate-500 mt-1 truncate">${esc(app.path)}</div>
      ${app.needsConfig ? '<div class="text-[12px] text-amber-300 mt-2">No AppMode env detected — open App Setup to configure it before building.</div>' : ''}
    </div>

    <div class="grid lg:grid-cols-2 gap-4">
      <div class="space-y-3">
        <div class="eyebrow" data-tour="envs">Environments &amp; version</div>
        ${(app.envs || []).map((e) => BF.envCard(e, nn[e.key] != null ? nn[e.key] : 1, base, flags)).join('') || '<div class="surface p-3 text-xs text-slate-500">No environments detected.</div>'}
        <div class="eyebrow" data-tour="outputs">Artifacts</div>
        <div class="grid grid-cols-3 gap-2">${ARTS.map((a) => C.artChip(a, a.id === 'apk')).join('')}</div>
        <div class="flex items-center justify-between gap-2 flex-wrap">${BF.branchSelect(d.git)}</div>
        ${BF.advanced()}
        <div id="bh-guard"></div>
        <div class="flex gap-2">
          <button id="bh-build" class="btn btn-primary text-sm flex-1">${ICON.play}Build</button>
          <button id="bh-stop" class="btn btn-secondary text-sm">${ICON.stop}Stop</button>
        </div>
      </div>
      <div>
        <div class="eyebrow mb-2" data-tour="log">Live log</div>
        <div id="bh-term" class="bh-term mb-3"></div>
        <div id="bh-summary" class="space-y-2 mb-4"></div>
        <div class="flex items-center gap-2 mb-2"><div class="eyebrow">Recent builds</div><span id="bh-bulk" class="ml-auto"></span></div>
        <div id="bh-builds" class="space-y-2"></div>
      </div>
    </div>`;

  el('#bh-back').onclick = () => V.dashboard();
  el('#bh-sign').onclick = () => signingModal(app);
  el('#bh-appsetup').onclick = () => (window.openAppSetup ? openAppSetup(BH.sel) : toast('App Setup coming soon', 'info'));
  el('#bh-analytics').onclick = () => (window.V.analytics ? V.analytics(BH.sel) : toast('Analytics coming soon', 'info'));
  _body().querySelectorAll('.bh-art').forEach((a) => a.onclick = () => a.classList.toggle('on'));
  _body().querySelectorAll('.bh-bump').forEach((b) => b.onclick = () => { const inp = _body().querySelector(`.bh-ver[data-env="${b.dataset.env}"]`); inp.value = BF.bump(inp.value, b.dataset.k); });
  _body().querySelectorAll('.bh-fill').forEach((b) => b.onclick = () => NOTES.fill(b));
  _body().querySelectorAll('.bh-jira').forEach((b) => b.onclick = () => NOTES.jiraPicker(b));
  el('#bh-build').onclick = () => doBuild();
  el('#bh-stop').onclick = () => API.stopBuild().then(() => toast('Stopping current build…', 'info'));
  renderBuilds(d.builds || []);
  reattachBuild();
};

// Generate a fresh upload keystore, or link an existing one — both stream keytool/gradle output.
function signingModal(app) {
  const b = openModal({ title: 'Android signing', subtitle: app.name, size: '540px' });
  b.innerHTML = `
    <div class="text-xs text-slate-400 mb-3">Generate a release keystore (stored in this tool's data dir) or link one you already have. Writes <span class="font-mono">android/key.properties</span> and wires build.gradle.</div>
    <div class="grid sm:grid-cols-2 gap-2 mb-2">
      <label class="block"><span class="text-[11px] text-slate-500">Key alias</span><input id="sg-alias" class="field text-sm w-full mt-1" value="upload"/></label>
      <label class="block"><span class="text-[11px] text-slate-500">Password (≥6 chars)</span><input id="sg-pw" type="password" class="field text-sm w-full mt-1"/></label>
    </div>
    <div class="flex gap-2 mb-3"><button id="sg-gen" class="btn btn-primary text-sm">${ICON.plus}Generate</button>
      <input id="sg-link" class="field text-sm flex-1" placeholder="…or absolute path to an existing .jks to link"/>
      <button id="sg-do-link" class="btn btn-secondary text-sm">Link</button></div>
    <div id="sg-log" class="bh-term" style="height:200px"></div>`;
  el('#sg-gen').onclick = () => API.stream('/api/signing/generate', { path: BH.sel, alias: el('#sg-alias').value.trim() || 'upload', password: el('#sg-pw').value }, el('#sg-log'));
  el('#sg-do-link').onclick = () => API.stream('/api/signing/link', { path: BH.sel, storeFile: el('#sg-link').value.trim(), storePassword: el('#sg-pw').value, keyAlias: el('#sg-alias').value.trim() || 'upload' }, el('#sg-log'));
}
