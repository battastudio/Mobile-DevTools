// Build Helper frontend — per-app Setup (window.openAppSetup). A tabbed modal registered via a small
// AS registry (this file adds Overview/Environments/Accounts; app-setup-more.js adds the rest). Each
// tab renders its own HTML and saves its slice through /api/app/save (or /api/groups/save).
'use strict';

window.AS = {
  tabs: {}, order: [],
  reg(id, label, def) { this.tabs[id] = Object.assign({ label }, def); if (!this.order.includes(id)) this.order.push(id); },
  save(path, patch, msg) { return API.post('/api/app/save', { path, ...patch }).then((r) => toast(r.ok ? (msg || 'Saved') : (r.error || 'Failed'), r.ok ? 'ok' : 'err')); },
};

window.openAppSetup = window.showAppSetup = async function (path) {
  const d = await API.project(path).catch(() => null);
  if (!d || d.error) return toast('Could not load this app.', 'err');
  const tabs = AS.order.map((id) => ({ id, label: AS.tabs[id].label }));
  const body = openModal({ title: 'App Setup', subtitle: d.app.name, size: '800px', tabs, active: AS.order[0], onTab: (id) => render(id) });
  const render = (id) => { body.innerHTML = AS.tabs[id].render(d); if (AS.tabs[id].wire) AS.tabs[id].wire(d, body); };
  render(AS.order[0]);
};

const _stat = (ok, label) => `<div class="flex items-center gap-2 py-1.5"><span class="status ${ok ? 'ok' : 'off'}">${ok ? 'ok' : 'todo'}</span><span class="text-sm">${label}</span></div>`;

AS.reg('overview', 'Overview', {
  render(d) {
    const h = d.health || {};
    return `<div class="text-xs text-slate-400 mb-3">Release-readiness for <b>${esc(d.app.name)}</b>.</div>
      <div class="surface p-3 divide-y divide-edge/40 mb-3">
        ${_stat(h.envDetected, 'AppMode environment detected')}${_stat(h.signing, 'Android release signing configured')}
        ${_stat(h.packageId, 'Android package id resolved')}${_stat(!!d.hasIcon, 'Launcher icon found')}
        ${_stat(!!d.firebaseApp, 'Firebase App ID set (for App Distribution)')}
        ${_stat(!!(d.apple || d.globalApple), 'Apple / TestFlight account')}${_stat(!!(d.play || d.globalPlay), 'Google Play account')}
        ${_stat(!!d.onedriveConnected, 'OneDrive connected')}
      </div>
      <button id="as-sign" class="btn btn-secondary text-sm">${ICON.link}Android signing…</button>`;
  },
  wire(d) { const b = el('#as-sign'); if (b) b.onclick = () => signingModal(d.app); },
});

AS.reg('env', 'Environments', {
  render(d) {
    const a = d.app, rows = (a.envs || []).map((e, i) => AS.envRow(e, i)).join('');
    return `<div class="grid grid-cols-2 gap-2 mb-3">
        <label class="block"><span class="text-[11px] text-slate-500">AppMode const name</span><input id="as-const" class="field text-sm w-full mt-1" value="${esc(a.constName || '')}" placeholder="appMode"/></label>
        <label class="block"><span class="text-[11px] text-slate-500">Env file (relative)</span><input id="as-envfile" class="field text-sm w-full mt-1" value="${esc(a.envFile || '')}" placeholder="lib/env.dart"/></label>
      </div>
      <div class="text-[11px] text-slate-500 mb-1">Environments (key · label · AppMode member · color · prod)</div>
      <div id="as-envs" class="space-y-1 mb-2">${rows}</div>
      <button id="as-addenv" class="btn btn-ghost text-xs mb-3">${ICON.plus}Add environment</button>
      <div class="text-[11px] text-slate-500">Detected enum members: ${(a.members || []).join(', ') || '—'}</div>
      <div class="mt-3"><button id="as-saveenv" class="btn btn-primary text-sm">Save environments</button></div>`;
  },
  wire(d, body) {
    const add = () => el('#as-envs').insertAdjacentHTML('beforeend', AS.envRow({ key: '', label: '', mode: '', color: 'slate', prod: false }, Math.random()));
    el('#as-addenv').onclick = add;
    body.addEventListener('click', (e) => { if (e.target.closest('.as-rmenv')) e.target.closest('.as-envrow').remove(); });
    el('#as-saveenv').onclick = () => {
      const envs = [...body.querySelectorAll('.as-envrow')].map((r) => ({ key: r.querySelector('.e-key').value.trim(), label: r.querySelector('.e-label').value.trim() || r.querySelector('.e-key').value.trim().toUpperCase(), mode: r.querySelector('.e-mode').value.trim(), color: r.querySelector('.e-color').value.trim() || 'slate', prod: r.querySelector('.e-prod').checked })).filter((x) => x.key && x.mode);
      AS.save(d.app.path, { override: { constName: el('#as-const').value.trim(), envFile: el('#as-envfile').value.trim(), envs } }, 'Environments saved').then(() => V.project(d.app.path));
    };
  },
});
AS.envRow = (e, i) => `<div class="as-envrow flex items-center gap-1.5">
  <input class="field text-xs w-16 e-key" value="${esc(e.key || '')}" placeholder="dev"/>
  <input class="field text-xs w-20 e-label" value="${esc(e.label || '')}" placeholder="DEV"/>
  <input class="field text-xs w-24 e-mode" value="${esc(e.mode || '')}" placeholder="dev"/>
  <input class="field text-xs w-20 e-color" value="${esc(e.color || 'slate')}" placeholder="sky"/>
  <label class="text-[11px] flex items-center gap-1"><input type="checkbox" class="e-prod" ${e.prod ? 'checked' : ''}/>prod</label>
  <button class="as-rmenv btn btn-ghost text-[11px] text-rose-300 ml-auto">✕</button></div>`;

AS.reg('accounts', 'Accounts', {
  render(d) {
    return `<div class="space-y-3">
      <div class="surface p-3"><div class="text-sm font-semibold mb-1">Firebase App ID</div>
        <input id="as-fb" class="field text-sm w-full font-mono" value="${esc(d.firebaseApp || '')}" placeholder="1:1234567890:android:abcdef"/>
        <button id="as-fbsave" class="btn btn-primary text-xs mt-2">Save</button></div>
      <div class="surface p-3"><div class="text-sm font-semibold mb-1">Apple / TestFlight ${d.globalApple ? '<span class="text-[10px] text-slate-500">(global set)</span>' : ''}</div>
        <div class="grid grid-cols-2 gap-2"><input id="as-akey" class="field text-sm" placeholder="Key ID" value="${esc(d.apple?.keyId || '')}"/><input id="as-aiss" class="field text-sm" placeholder="Issuer ID" value="${esc(d.apple?.issuerId || '')}"/></div>
        <textarea id="as-ap8" class="field text-xs w-full font-mono h-16 mt-2" placeholder="Paste the .p8 contents (leave blank to keep)…"></textarea>
        <button id="as-asave" class="btn btn-primary text-xs mt-2">Save</button> <button id="as-aclear" class="btn btn-ghost text-xs">Clear</button></div>
      <div class="surface p-3"><div class="text-sm font-semibold mb-1">Google Play ${d.globalPlay ? '<span class="text-[10px] text-slate-500">(global set)</span>' : ''}</div>
        <textarea id="as-plsa" class="field text-xs w-full font-mono h-16" placeholder="Paste service-account JSON (leave blank to keep)…"></textarea>
        <div class="flex gap-2 mt-2"><select id="as-pltrack" class="field text-sm"><option>internal</option><option>alpha</option><option>beta</option><option>production</option></select>
          <button id="as-plsave" class="btn btn-primary text-xs ml-auto">Save</button><button id="as-plclear" class="btn btn-ghost text-xs">Clear</button></div></div>
    </div>`;
  },
  wire(d) {
    const p = d.app.path;
    el('#as-fbsave').onclick = () => AS.save(p, { firebaseApp: el('#as-fb').value.trim() }, 'Firebase App ID saved');
    el('#as-asave').onclick = () => AS.save(p, { apple: { keyId: el('#as-akey').value.trim(), issuerId: el('#as-aiss').value.trim(), p8: el('#as-ap8').value } }, 'Apple saved');
    el('#as-aclear').onclick = () => AS.save(p, { apple: { clear: true } }, 'Apple cleared');
    el('#as-plsave').onclick = () => AS.save(p, { play: { serviceAccountJson: el('#as-plsa').value, defaultTrack: el('#as-pltrack').value } }, 'Play saved');
    el('#as-plclear').onclick = () => AS.save(p, { play: { clear: true } }, 'Play cleared');
    if (d.play && d.play.defaultTrack) el('#as-pltrack').value = d.play.defaultTrack;
  },
});
