// [split from app.js] Device Lab: render/devices/artifacts/lightbox/SSE/wiring.
// ================= DEVICE LAB — connect to the app on a device =================
function renderDeviceLab() {
  const projOpts = [`<option value="">Select app…</option>`].concat(QA.projects.map(p => `<option value="${esc(p.path)}" ${QA.dlProject === p.path ? 'selected' : ''}>${esc(p.name)}</option>`)).join('');
  el('#qabody').innerHTML = `
    <div class="mb-4"><div class="text-[11px] uppercase tracking-[.24em] font-semibold mb-1.5" style="color:var(--brand2)">Device Lab</div>
      <h1 class="font-display text-2xl font-bold" style="color:var(--ink)">Check the app on a device</h1>
      <div class="text-xs text-slate-500 mt-1">Install &amp; launch, screenshot, screen-record, stream live logs, and stress-test the real app. Full support on Android devices + iOS simulators; physical iOS is install/launch only.</div></div>
    <div class="surface p-4 mb-3 flex flex-wrap items-end gap-2">
      <div class="min-w-[200px]"><div class="text-[11px] text-slate-500 mb-1">App</div><select id="dlproj" class="field text-sm">${projOpts}</select></div>
      <div class="min-w-[240px]"><div class="text-[11px] text-slate-500 mb-1">Device</div><select id="dldevice" class="field text-sm"><option>Loading…</option></select></div>
      <button id="dlrefresh" class="btn btn-ghost text-xs" title="Re-scan booted devices/emulators">Refresh</button>
      <button id="dlinfo" class="btn btn-ghost text-xs">App info</button>
    </div>
    <div class="surface p-4 mb-3">
      <div class="flex flex-wrap gap-2 items-center">
        <button id="dl-install" class="btn btn-primary text-sm">${ICON.play}Install &amp; Launch</button>
        <button id="dl-shot" class="btn btn-secondary text-sm">Screenshot</button>
        <button id="dl-rec" class="btn btn-secondary text-sm">● Record</button>
        <button id="dl-logs" class="btn btn-secondary text-sm">Live logs</button>
        <button id="dl-smoke" class="btn btn-secondary text-sm">Smoke</button>
        <input id="dl-events" class="field text-xs w-16" value="200" title="monkey events (Android)"/>
        <button id="dl-stop" class="btn btn-ghost text-sm">Stop</button>
        <button id="dl-triage" class="btn btn-ghost text-sm ml-auto" title="AI: triage the console for crashes">${ICON.flask}AI triage</button>
      </div>
      <div id="dllog" class="log mt-3 h-56 overflow-auto rounded-xl p-3 text-[11px] text-slate-300 whitespace-pre-wrap font-mono border border-edge hidden" style="background:var(--sunken)"></div>
    </div>
    <div id="dlgallery"></div>`;
  wireDeviceLab();
  loadDlDevices();
  loadArtifacts();
}
async function loadDlDevices() {
  const sel = el('#dldevice'); if (!sel) return;
  let devices = []; try { devices = (await fetch('/api/qa/device/list').then(r => r.json())).devices || []; } catch {}
  QA.devices2 = devices;
  sel.innerHTML = devices.length
    ? devices.map(d => `<option value="${esc(d.id)}" ${QA.dlDevice === d.id ? 'selected' : ''}>${esc(d.name)} · ${esc(d.platform)}${d.booted ? '' : ' (not booted)'}</option>`).join('')
    : `<option value="">No devices — boot a simulator/emulator, then Refresh</option>`;
  if (!QA.dlDevice && devices[0]) QA.dlDevice = devices[0].id;
}
async function loadArtifacts() {
  const g = el('#dlgallery'); if (!g) return;
  QA.artSel = QA.artSel || new Set();
  if (!QA.dlProject) { g.innerHTML = ''; QA.arts = []; return; }
  let arts = []; try { arts = (await fetch('/api/qa/artifacts?path=' + encodeURIComponent(QA.dlProject)).then(r => r.json())).artifacts || []; } catch {}
  QA.arts = arts;
  // drop selections for files that no longer exist
  QA.artSel = new Set([...QA.artSel].filter(p => arts.some(a => a.path === p)));
  if (!arts.length) { g.innerHTML = ''; return; }
  g.innerHTML = `<div class="surface p-4">
    <div class="flex items-center gap-2 mb-2"><div class="text-sm font-semibold">Captured artifacts</div>
      <button id="art-all" class="btn btn-ghost text-[11px] px-2 py-0.5">Select all</button>
      <button id="art-clear" class="btn btn-ghost text-[11px] px-2 py-0.5">Clear</button>
      <span class="flex-1"></span>
      <button id="art-share" class="btn btn-secondary text-[11px] px-2 py-0.5">Share (${QA.artSel.size})</button>
      <button id="art-remove" class="btn btn-ghost text-[11px] px-2 py-0.5 text-rose-300">Remove (${QA.artSel.size})</button></div>
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">${arts.map(artThumb).join('')}</div></div>`;
  wireArtifacts();
}
function artThumb(a) {
  const sel = QA.artSel.has(a.path);
  const preview = a.kind === 'image' ? `<img src="${a.url}" class="w-full h-28 object-cover" loading="lazy"/>` : `<div class="flex items-center justify-center h-28 text-slate-300 text-2xl">${a.kind === 'video' ? '▶' : '📄'}</div>`;
  return `<div class="art-cell relative rounded-lg overflow-hidden border ${sel ? 'border-brand' : 'border-edge'}" data-path="${esc(a.path)}">
    <input type="checkbox" class="art-check absolute top-1 left-1 z-10" data-path="${esc(a.path)}" ${sel ? 'checked' : ''}/>
    <button class="art-open block w-full text-left" data-path="${esc(a.path)}" data-kind="${a.kind}" data-url="${a.url}" data-name="${esc(a.name)}">${preview}<div class="text-[10px] text-slate-500 p-1 truncate">${esc(a.name)}</div></button></div>`;
}
function wireArtifacts() {
  const arts = QA.arts || [];
  const fileOf = (p) => arts.find(a => a.path === p);
  document.querySelectorAll('.art-check').forEach(c => c.onchange = () => { c.checked ? QA.artSel.add(c.dataset.path) : QA.artSel.delete(c.dataset.path); loadArtifacts(); });
  document.querySelectorAll('.art-open').forEach(b => b.onclick = () => lightbox(fileOf(b.dataset.path)));
  const all = el('#art-all'); if (all) all.onclick = () => { arts.forEach(a => QA.artSel.add(a.path)); loadArtifacts(); };
  const clr = el('#art-clear'); if (clr) clr.onclick = () => { QA.artSel.clear(); loadArtifacts(); };
  const rm = el('#art-remove'); if (rm) rm.onclick = async () => { if (!QA.artSel.size) { toast('Select artifacts first', 'warn'); return; } if (!confirm(`Remove ${QA.artSel.size} artifact(s)?`)) return; await postJson('/api/qa/artifact/delete', { paths: [...QA.artSel] }); QA.artSel.clear(); toast('Removed', 'ok'); loadArtifacts(); };
  const sh = el('#art-share'); if (sh) sh.onclick = () => { const sel = arts.filter(a => QA.artSel.has(a.path)); if (!sel.length) { toast('Select artifacts first', 'warn'); return; } shareModal({ title: 'Share artifacts', files: sel }); };
}
// Open an image/video artifact in a same-page lightbox.
function lightbox(a) {
  if (!a) return;
  const box = openModal({ title: a.name, subtitle: a.kind, size: '1000px' });
  const media = a.kind === 'video' ? `<video src="${a.url}" controls class="max-h-[70vh] w-full rounded-lg bg-black"></video>` : `<img src="${a.url}" class="max-h-[70vh] mx-auto rounded-lg"/>`;
  box.innerHTML = `${media}<div class="flex gap-2 mt-3"><a href="${a.url}" download="${esc(a.name)}" class="btn btn-secondary text-sm">Download</a><button id="lb-share" class="btn btn-primary text-sm">Share ▸</button></div>`;
  el('#lb-share').onclick = () => shareModal({ title: 'Share ' + a.name, files: [a] });
}
// Generic SSE→box streamer with crash highlighting + Stop (device ops + matrix).
function sseToBox(url, body, box, onResult) {
  box.classList.remove('hidden'); box.innerHTML = '';
  const spin = document.createElement('div'); spin.className = 'dl-spin py-1'; spin.innerHTML = spinner('Working…'); box.appendChild(spin);
  const rmSpin = () => { const s = box.querySelector('.dl-spin'); if (s) s.remove(); };
  const write = (s, cls) => { const d = document.createElement('div'); if (cls) d.className = cls; d.textContent = s; box.appendChild(d); box.scrollTop = box.scrollHeight; };
  const ac = new AbortController(); QA.dlAbort = ac;
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ac.signal }).then((res) => {
    const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = '';
    const pump = () => reader.read().then(({ done, value }) => {
      if (done) { rmSpin(); QA.dlAbort = null; return; }
      buf += dec.decode(value, { stream: true }); let i;
      while ((i = buf.indexOf('\n\n')) >= 0) { const chunk = buf.slice(0, i); buf = buf.slice(i + 2);
        const ev = /event: (.+)/.exec(chunk), dt = /data: ([\s\S]+)/.exec(chunk); if (!ev || !dt) continue;
        let d; try { d = JSON.parse(dt[1]); } catch { continue; }
        if (ev[1] === 'log') write(d.line, d.crash ? 'text-rose-400 font-semibold' : '');
        else if (ev[1] === 'error') { rmSpin(); write('✖ ' + d.message, 'text-rose-400 font-semibold'); }
        else if (ev[1] === 'result') { onResult && onResult(d); }
        else if (ev[1] === 'done') { rmSpin(); write('✔ done', 'text-emerald-400 font-semibold'); }
      }
      return pump();
    });
    return pump();
  }).catch((e) => { rmSpin(); QA.dlAbort = null; if (ac.signal.aborted) write('■ stopped', 'text-amber-300 font-semibold'); else write('✖ ' + (e.message || e), 'text-rose-400'); });
  return ac;
}
function wireDeviceLab() {
  const proj = el('#dlproj'); if (proj) proj.onchange = () => { QA.dlProject = proj.value; loadArtifacts(); };
  const dev = el('#dldevice'); if (dev) dev.onchange = () => QA.dlDevice = dev.value;
  const rf = el('#dlrefresh'); if (rf) rf.onclick = () => loadDlDevices();
  const need = () => { if (!QA.dlProject) { toast('Pick an app first', 'warn'); return false; } if (!QA.dlDevice) { toast('Pick a device first', 'warn'); return false; } return true; };
  const info = el('#dlinfo'); if (info) info.onclick = async () => { if (!need()) return; const r = await postJson('/api/qa/device/appinfo', { path: QA.dlProject, device: QA.dlDevice }); toast((`${r.appId || '?'} ${r.version || ''} ${r.size || ''}`).trim() || 'no info', 'info'); };
  const inst = el('#dl-install'); if (inst) inst.onclick = () => { if (!need()) return; sseToBox('/api/qa/device/install-launch', { path: QA.dlProject, device: QA.dlDevice }, el('#dllog'), () => loadArtifacts()); };
  const shot = el('#dl-shot'); if (shot) shot.onclick = async () => { if (!need()) return; toast('Capturing…', 'info'); const r = await postJson('/api/qa/device/screenshot', { path: QA.dlProject, device: QA.dlDevice }); if (r.ok) { toast('Screenshot saved', 'ok'); loadArtifacts(); } else toast(r.error || 'failed', 'err'); };
  const rec = el('#dl-rec'); if (rec) rec.onclick = async () => {
    if (!need()) return;
    if (!QA.recording) { const r = await postJson('/api/qa/device/record/start', { path: QA.dlProject, device: QA.dlDevice }); if (r.ok) { QA.recording = true; rec.textContent = '■ Stop rec'; rec.classList.add('btn-primary'); toast('Recording…', 'ok'); } else toast(r.error || 'failed', 'err'); }
    else { const r = await postJson('/api/qa/device/record/stop', { path: QA.dlProject, device: QA.dlDevice }); QA.recording = false; rec.textContent = '● Record'; rec.classList.remove('btn-primary'); if (r.ok) { toast('Saved recording', 'ok'); loadArtifacts(); } else toast(r.error || 'failed', 'err'); }
  };
  const logs = el('#dl-logs'); if (logs) logs.onclick = () => { if (!need()) return; sseToBox('/api/qa/device/logs', { path: QA.dlProject, device: QA.dlDevice }, el('#dllog')); };
  const smoke = el('#dl-smoke'); if (smoke) smoke.onclick = () => { if (!need()) return; sseToBox('/api/qa/device/smoke', { path: QA.dlProject, device: QA.dlDevice, events: +el('#dl-events').value || 200 }, el('#dllog'), (d) => toast(d.crashed ? 'Crash/ANR detected — see log' : (d.detail || 'Smoke done'), d.crashed ? 'err' : 'ok')); };
  const stop = el('#dl-stop'); if (stop) stop.onclick = async () => {
    if (QA.dlAbort) { try { QA.dlAbort.abort(); } catch {} QA.dlAbort = null; }
    if (QA.recording) { QA.recording = false; const r = el('#dl-rec'); if (r) { r.textContent = '● Record'; r.classList.remove('btn-primary'); } }
    await postJson('/api/qa/device/stop', {}).catch(() => {});
    toast('Stopped', 'info');
  };
  const triage = el('#dl-triage'); if (triage) triage.onclick = () => { const box = el('#dllog'); const txt = box ? box.textContent : ''; if (!txt || !txt.trim()) { toast('Run logs/smoke first — nothing to triage', 'warn'); return; } aiExplain(txt.slice(-6000), 'device log'); };
  wireAi();
}
