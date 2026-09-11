// [split from app.js] Integration-test device picker (deviceOptions/deviceRowHtml/detect/wire).
// ---------------- device picker (Flutter integration tests) ----------------
function deviceOptions() {
  return [`<option value="">Headless (no device)</option>`].concat((QA.devices || []).map(d =>
    `<option value="${esc(d.id)}" ${QA.device === d.id ? 'selected' : ''}>${esc(d.name)}${d.emulator ? ' (emulator)' : ''}</option>`)).join('');
}
function deviceRowHtml() {
  return `<div class="min-w-[200px]"><div class="text-[11px] text-slate-500 mb-1">Device (for integration tests)</div>
    <div class="flex gap-1.5"><select id="qadevice" class="field text-sm flex-1">${deviceOptions()}</select>
    <button id="qadetect" class="btn btn-ghost text-xs px-2" title="Detect connected devices / emulators">Detect</button></div></div>`;
}
async function detectDevices(btn) {
  if (btn) { btn.disabled = true; btn.textContent = '…'; }
  try { QA.devices = (await fetch('/api/qa/devices').then(r => r.json())).devices || []; } catch { QA.devices = []; }
  if (btn) { btn.disabled = false; btn.textContent = 'Detect'; }
  const sel = el('#qadevice'); if (sel) sel.innerHTML = deviceOptions();
  toast(QA.devices.length ? QA.devices.length + ' device(s) found' : 'No devices/emulators booted — boot one (flutter emulators --launch <id>), then Detect again', QA.devices.length ? 'ok' : 'warn');
}
function wireDevice() {
  const sel = el('#qadevice'); if (sel) sel.onchange = () => QA.device = sel.value;
  const det = el('#qadetect'); if (det) det.onclick = () => detectDevices(det);
}
