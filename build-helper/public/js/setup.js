// Build Helper frontend — Setup view: environment Doctor (installable tool checks) + the
// distribution connectors this tool owns (OneDrive, Google Play, Apple, Firebase). Issue-tracker,
// team profile, Slack/Telegram + email live in the shared kit gear (openSettings) — see app.js.
'use strict';

window.V.setup = async function () {
  BH.view = 'setup'; if (window.setShell) setShell('setup');
  _body().innerHTML = _skel(3);
  const [s, doc] = await Promise.all([API.setup().catch(() => ({})), API.doctor().catch(() => ({ checks: [] }))]);
  _body().innerHTML = `
    <div class="eyebrow mb-2">Doctor <span class="text-[10px] font-normal text-slate-500">— toolchain preflight${doc.diskFree ? ' · ' + esc(doc.diskFree) : ''}</span></div>
    <div class="surface p-3 mb-5 divide-y divide-edge/50">${(doc.checks || []).map(_check).join('')}</div>

    <div class="eyebrow mb-2">Distribution connectors</div>
    <div class="grid sm:grid-cols-2 gap-3 mb-3">
      ${_conn('OneDrive', s.onedriveConnected, `<button id="cn-od" class="btn btn-primary text-sm">${ICON.link}Connect OneDrive (rclone)</button><div class="text-[11px] text-slate-500 mt-2">Base folder: <span class="font-mono">${esc(s.onedriveBase || '')}</span></div>`)}
      ${_conn('Firebase App Distribution', s.firebaseCli, `<button id="cn-fb" class="btn btn-primary text-sm">${ICON.link}Login to Firebase CLI</button><div class="text-[11px] text-slate-500 mt-2">Then set the Firebase App ID per app in App Setup.</div>`)}
    </div>
    <div class="grid sm:grid-cols-2 gap-3">
      ${_conn('Google Play', s.play, `
        <textarea id="pl-sa" class="field text-xs w-full font-mono h-20" placeholder="Paste the service-account JSON…"></textarea>
        <div class="flex gap-2 mt-2"><select id="pl-track" class="field text-sm"><option>internal</option><option>alpha</option><option>beta</option><option>production</option></select>
        <button id="cn-play" class="btn btn-primary text-sm ml-auto">${ICON.check}Save</button></div>${s.playEmail ? `<div class="text-[11px] text-slate-500 mt-1">${esc(s.playEmail)}</div>` : ''}`)}
      ${_conn('Apple / TestFlight', s.apple, `
        <div class="grid grid-cols-2 gap-2"><input id="ap-key" class="field text-sm" placeholder="Key ID" value="${esc(s.appleKeyId || '')}"/><input id="ap-iss" class="field text-sm" placeholder="Issuer ID"/></div>
        <textarea id="ap-p8" class="field text-xs w-full font-mono h-16 mt-2" placeholder="Paste the .p8 private key contents…"></textarea>
        <button id="cn-apple" class="btn btn-primary text-sm mt-2">${ICON.check}Save</button>`)}
    </div>
    <div id="su-log" class="bh-term mt-4 hidden" style="height:180px"></div>`;

  const logBox = () => { const b = el('#su-log'); b.classList.remove('hidden'); b.textContent = ''; return b; };
  el('#cn-od').onclick = () => API.stream('/api/setup/onedrive', {}, logBox(), () => V.setup());
  el('#cn-fb').onclick = () => API.stream('/api/setup/firebase-login', {}, logBox(), () => V.setup());
  el('#cn-play').onclick = async () => { const r = await API.post('/api/setup/play', { serviceAccountJson: el('#pl-sa').value, defaultTrack: el('#pl-track').value }); r.ok ? (toast('Google Play saved', 'ok'), V.setup()) : toast(r.error || 'Failed', 'err'); };
  el('#cn-apple').onclick = async () => { const r = await API.post('/api/setup/apple', { keyId: el('#ap-key').value.trim(), issuerId: el('#ap-iss').value.trim(), p8: el('#ap-p8').value }); r.ok ? (toast('Apple saved', 'ok'), V.setup()) : toast(r.error || 'Failed', 'err'); };
  _body().querySelectorAll('[data-install]').forEach((b) => b.onclick = () => API.stream('/api/doctor/install', { tool: b.dataset.install }, logBox(), () => V.setup()));
};

function _check(c) {
  const right = c.ok ? `<span class="text-[11px] font-mono text-slate-500 truncate max-w-[220px]">${esc(c.version || '')}</span>`
    : (c.canInstall ? `<button class="btn btn-secondary text-xs" data-install="${esc(c.key)}">Install</button>` : `<span class="text-[11px] text-slate-500 font-mono truncate max-w-[220px]" title="${esc(c.hint || '')}">${esc(c.hint || 'not found')}</span>`);
  return `<div class="flex items-center gap-3 py-2"><span class="status ${c.ok ? 'ok' : 'off'}">${c.ok ? 'ok' : 'missing'}</span><span class="text-sm">${esc(c.label)}</span><span class="ml-auto">${right}</span></div>`;
}

function _conn(name, ok, body) {
  return `<div class="surface p-4"><div class="flex items-center gap-2 mb-2"><div class="font-semibold text-sm">${esc(name)}</div><span class="ml-auto">${pill(ok)}</span></div>${body}</div>`;
}
