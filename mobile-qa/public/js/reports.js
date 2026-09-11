// [split from app.js] Reports: device matrix modal.
// ================= REPORTS (badge / JUnit / JSON / coverage / matrix) =================
async function matrixModal(p) {
  const box = openModal({ title: 'Device matrix run', subtitle: 'Run test types across several devices', size: '640px' });
  box.innerHTML = `<div class="py-8 text-center">${spinner('Loading devices…')}</div>`;
  let devs = []; try { devs = (await fetch('/api/qa/device/list').then(r => r.json())).devices || []; } catch {}
  box.innerHTML = `<div class="space-y-3 text-sm">
    <div><div class="text-[11px] text-slate-500 mb-1">Devices</div>${devs.length ? devs.map(d => `<label class="flex items-center gap-2 text-xs py-0.5"><input type="checkbox" class="mx-dev" value="${esc(d.id)}"/> ${esc(d.name)} · ${esc(d.platform)}${d.booted ? '' : ' (not booted)'}</label>`).join('') : '<div class="text-slate-500 text-xs">No devices — boot one and reopen.</div>'}</div>
    <div><div class="text-[11px] text-slate-500 mb-1">Test types (comma-separated ids, blank = all)</div><input id="mx-types" class="field text-xs w-full font-mono" placeholder="flutter-widget, flutter-a11y"/></div>
    <button id="mx-go" class="btn btn-primary text-sm">${ICON.play}Run matrix</button>
    <div id="mx-log" class="log mt-2 h-40 overflow-auto rounded-xl p-3 text-[11px] whitespace-pre-wrap font-mono hidden border border-edge" style="background:var(--sunken)"></div>
    <div id="mx-out" class="mt-2"></div></div>`;
  el('#mx-go').onclick = () => {
    const devices = [...document.querySelectorAll('.mx-dev:checked')].map(c => c.value);
    if (!devices.length) { toast('Pick at least one device', 'warn'); return; }
    const types = el('#mx-types').value.split(',').map(s => s.trim()).filter(Boolean);
    sseToBox('/api/qa/matrix', { path: p, devices, types }, el('#mx-log'), (d) => {
      el('#mx-out').innerHTML = `<div class="space-y-1">${(d.matrix || []).map(m => `<div class="flex items-center gap-2 text-xs rounded-lg border border-edge px-2 py-1">${m.grade ? gradeBox(m.grade.letter, m.grade.score) : '<span class="text-rose-400">error</span>'}<span class="font-mono">${esc(m.device)}</span>${m.error ? `<span class="text-rose-400">${esc(m.error)}</span>` : `<span class="text-slate-500">${m.grade.counts.fail || 0} failing</span>`}</div>`).join('')}</div>`;
    });
  };
}
