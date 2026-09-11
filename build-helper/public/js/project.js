// Build Helper frontend — Project view: env/flavor + version pickers, artifact selection, the
// build stream, Android signing, and this app's build history. This is the core workflow screen.
'use strict';

window.V.project = async function (projectPath) {
  BH.sel = projectPath; BH.view = 'project'; if (window.setShell) setShell('build');
  _body().innerHTML = _skel(2);
  const d = await API.project(projectPath).catch(() => null);
  if (!d || d.error) { _body().innerHTML = '<div class="surface p-6 text-rose-300 text-sm">Could not load this project.</div>'; return; }
  BH.project = d;
  const app = d.app, nn = d.nextBuildNumbers || {}, base = verName(app.version), h = d.health || {};
  const healthPill = (ok, on, off) => ok ? `<span class="status ok">${on}</span>` : `<span class="status off">${off}</span>`;

  _body().innerHTML = `
    <button id="bh-back" class="btn btn-ghost text-xs px-2 py-1 mb-3">← Dashboard</button>
    <div class="surface p-4 mb-4">
      <div class="flex items-center gap-3 flex-wrap">
        <div class="font-display text-lg font-bold">${esc(app.name)}</div>
        <span class="status">v${esc(base)}</span>
        ${app.currentMode ? `<span class="text-xs text-slate-400">on <b>${esc(app.currentMode)}</b></span>` : ''}
        <div class="ml-auto flex items-center gap-2">
          ${healthPill(h.envDetected, 'env ok', 'no env')}
          ${healthPill(h.signing, 'signed', 'unsigned')}
          <button id="bh-sign" class="btn btn-secondary text-xs">${ICON.link}Signing</button>
        </div>
      </div>
      <div class="text-[11px] font-mono text-slate-500 mt-1 truncate">${esc(app.path)}</div>
      ${app.needsConfig ? '<div class="text-[12px] text-amber-300 mt-2">This app has no detected AppMode env — set it up before building (see README / App Setup).</div>' : ''}
    </div>

    <div class="grid lg:grid-cols-2 gap-4">
      <div class="surface p-4">
        <div class="eyebrow mb-2">1 · Environments &amp; version</div>
        <div class="mb-3">${(app.envs || []).map((e) => C.envRow(e, nn[e.key] != null ? nn[e.key] : 1, base)).join('') || '<div class="text-xs text-slate-500">No environments.</div>'}</div>
        <div class="eyebrow mb-2">2 · Artifacts</div>
        <div class="grid grid-cols-3 gap-2 mb-3">${ARTS.map((a) => C.artChip(a, a.id === 'apk')).join('')}</div>
        <div class="eyebrow mb-2">3 · Options</div>
        <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mb-3">
          ${['clean:flutter clean', 'pub:pub get', 'analyze:analyze', 'test:test'].map((o) => { const [id, l] = o.split(':'); return `<label class="flex items-center gap-2"><input type="checkbox" id="bh-${id}"/>${l}</label>`; }).join('')}
        </div>
        <div class="eyebrow mb-2">Distribute <span class="text-[10px] font-normal text-slate-500">(configure in Setup)</span></div>
        <div class="grid grid-cols-3 gap-x-4 gap-y-1 text-sm mb-3">
          <label class="flex items-center gap-2"><input type="checkbox" id="bh-od"/>OneDrive</label>
          <label class="flex items-center gap-2"><input type="checkbox" id="bh-fb"/>Firebase</label>
          <label class="flex items-center gap-2"><input type="checkbox" id="bh-store"/>Store</label>
        </div>
        <label class="flex items-center gap-2 text-sm mb-3 text-amber-300"><input type="checkbox" id="bh-anyway"/>Build anyway (skip dirty/duplicate/prod guards)</label>
        <div class="flex gap-2">
          <button id="bh-build" class="btn btn-primary text-sm flex-1">${ICON.play}Build</button>
          <button id="bh-stop" class="btn btn-secondary text-sm">${ICON.stop}Stop</button>
        </div>
      </div>
      <div>
        <div class="eyebrow mb-2">Live log</div>
        <div id="bh-term" class="bh-term mb-4"></div>
        <div class="eyebrow mb-2">Recent builds</div>
        <div id="bh-builds" class="space-y-2"></div>
      </div>
    </div>`;

  el('#bh-back').onclick = () => V.dashboard();
  el('#bh-sign').onclick = () => signingModal(app);
  _body().querySelectorAll('.bh-art').forEach((a) => a.onclick = () => a.classList.toggle('on'));
  el('#bh-build').onclick = doBuild;
  el('#bh-stop').onclick = () => API.stopBuild().then(() => toast('Stopping current build…', 'info'));
  renderBuilds(d.builds || []);
};

function collectBuild() {
  const q = (s) => _body().querySelector(s), v = (s) => (q(s) ? q(s).value.trim() : '');
  const on = (id) => !!(el(id) && el(id).checked);
  const envs = [..._body().querySelectorAll('.bh-env:checked')].map((c) => ({
    env: c.dataset.env, buildName: v(`.bh-ver[data-env="${c.dataset.env}"]`) || '1.0.0', buildNumber: v(`.bh-num[data-env="${c.dataset.env}"]`) || '1',
    uploadOneDrive: on('#bh-od'), uploadFirebase: on('#bh-fb'), uploadStore: on('#bh-store'),
  }));
  const anyway = on('#bh-anyway');
  return { path: BH.sel, envs, artifacts: [..._body().querySelectorAll('.bh-art.on')].map((a) => a.dataset.art),
    clean: on('#bh-clean'), pubGet: on('#bh-pub'), runAnalyze: on('#bh-analyze'), runTest: on('#bh-test'),
    allowDirty: anyway, allowDuplicate: anyway, confirmProd: anyway, allowLowVersion: anyway };
}

function doBuild() {
  const req = collectBuild();
  if (!req.envs.length) return toast('Pick at least one environment', 'warn');
  if (!req.artifacts.length) return toast('Pick at least one artifact (APK/AAB/IPA)', 'warn');
  const box = el('#bh-term'); box.textContent = ''; const btn = el('#bh-build'); btn.disabled = true;
  API.stream('/api/build', req, box, () => { btn.disabled = false; API.builds(BH.sel).then((r) => renderBuilds(r.builds || [])); });
}

function renderBuilds(builds) {
  const box = el('#bh-builds'); if (!box) return;
  box.innerHTML = builds.length ? builds.slice(0, 20).map(C.buildRow).join('') : '<div class="text-xs text-slate-500">No builds yet for this app.</div>';
}

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
