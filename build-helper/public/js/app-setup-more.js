// Build Helper frontend — per-app Setup, remaining tabs (registered into the AS registry from
// app-setup.js): Build defaults, Scheduled builds, per-app Trackers, and client email Groups.
'use strict';

const _lines = (s) => String(s || '').split('\n').map((x) => x.trim()).filter(Boolean);
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

AS.reg('build', 'Build', {
  render(d) {
    const s = d.settings || {};
    return `<div class="space-y-3">
      <label class="block"><span class="text-[11px] text-slate-500">Flutter flavor (optional)</span><input id="bs-flavor" class="field text-sm w-full mt-1" value="${esc(s.flavor || '')}" placeholder="production"/></label>
      <label class="block"><span class="text-[11px] text-slate-500">Extra build args</span><input id="bs-args" class="field text-sm w-full mt-1 font-mono" value="${esc(s.buildArgs || '')}" placeholder="--dart-define=FOO=bar"/></label>
      <label class="block"><span class="text-[11px] text-slate-500">Pre-build commands (one per line)</span><textarea id="bs-pre" class="field text-xs w-full font-mono h-20 mt-1">${esc((s.preBuild || []).join('\n'))}</textarea></label>
      <label class="block"><span class="text-[11px] text-slate-500">Post-build commands (one per line — env: BH_APP/BH_VERSION/BH_ENVS)</span><textarea id="bs-post" class="field text-xs w-full font-mono h-20 mt-1">${esc((s.postBuild || []).join('\n'))}</textarea></label>
      <button id="bs-save" class="btn btn-primary text-sm">Save build defaults</button></div>`;
  },
  wire(d) { el('#bs-save').onclick = () => AS.save(d.app.path, { settings: { flavor: el('#bs-flavor').value.trim(), buildArgs: el('#bs-args').value.trim(), preBuild: _lines(el('#bs-pre').value), postBuild: _lines(el('#bs-post').value) } }, 'Build defaults saved'); },
});

AS.reg('schedule', 'Schedule', {
  render(d) {
    const rows = (d.settings?.schedules || []).map((s) => AS.schedRow(d, s)).join('');
    return `<div class="text-xs text-slate-400 mb-2">Unattended builds run by the scheduler (checks every minute). Times are the server's local time.</div>
      <div id="sc-rows" class="space-y-2 mb-2">${rows || '<div class="text-xs text-slate-500">No schedules.</div>'}</div>
      <button id="sc-add" class="btn btn-ghost text-xs mb-3">${ICON.plus}Add schedule</button>
      <div><button id="sc-save" class="btn btn-primary text-sm">Save schedules</button></div>`;
  },
  wire(d, body) {
    const rowsBox = el('#sc-rows');
    el('#sc-add').onclick = () => { if (rowsBox.querySelector('.text-slate-500')) rowsBox.innerHTML = ''; rowsBox.insertAdjacentHTML('beforeend', AS.schedRow(d, {})); };
    body.addEventListener('click', (e) => { if (e.target.closest('.sc-rm')) e.target.closest('.sc-row').remove(); });
    el('#sc-save').onclick = () => {
      const schedules = [...body.querySelectorAll('.sc-row')].map((r) => ({
        env: r.querySelector('.sc-env').value, time: r.querySelector('.sc-time').value || '09:00',
        days: [...r.querySelectorAll('.sc-day:checked')].map((c) => +c.value),
        artifacts: [...r.querySelectorAll('.sc-art:checked')].map((c) => c.value),
      })).filter((s) => s.env && s.artifacts.length && s.days.length);
      AS.save(d.app.path, { settings: { schedules } }, 'Schedules saved');
    };
  },
});
AS.schedRow = (d, s) => `<div class="sc-row surface p-2 flex flex-wrap items-center gap-2 text-sm">
  <select class="field text-xs sc-env">${(d.app.envs || []).map((e) => `<option value="${esc(e.key)}" ${s.env === e.key ? 'selected' : ''}>${esc(e.label || e.key)}</option>`).join('')}</select>
  <input type="time" class="field text-xs sc-time" value="${esc(s.time || '09:00')}"/>
  <span class="flex gap-1">${DAYS.map((n, i) => `<label class="text-[10px] flex flex-col items-center"><input type="checkbox" class="sc-day" value="${i}" ${(s.days || []).includes(i) ? 'checked' : ''}/>${n[0]}</label>`).join('')}</span>
  <span class="flex gap-2">${ARTS.map((a) => `<label class="text-[11px] flex items-center gap-1"><input type="checkbox" class="sc-art" value="${a.id}" ${(s.artifacts || []).includes(a.id) ? 'checked' : ''}/>${a.label}</label>`).join('')}</span>
  <button class="sc-rm btn btn-ghost text-[11px] text-rose-300 ml-auto">✕</button></div>`;

AS.reg('trackers', 'Trackers', {
  render(d) {
    const defs = d.trackerDefs || [], acc = d.trackerAccounts || {};
    return `<div class="text-xs text-slate-400 mb-2">Per-app tracker credentials override the shared connectors for this project.</div>
      <div class="space-y-3">${defs.map((t) => `<div class="surface p-3" data-tid="${esc(t.id)}"><div class="text-sm font-semibold mb-1">${esc(t.label)} ${d.globalTrackers?.[t.id] ? '<span class="text-[10px] text-slate-500">(global set)</span>' : ''}</div>
        <div class="grid grid-cols-2 gap-2">${(t.fields || []).map((f) => `<input class="field text-sm tk-f" data-f="${esc(f[0])}" placeholder="${esc(f[0])}" value="${esc((acc[t.id] || {})[f[0]] || '')}"/>`).join('')}</div></div>`).join('')}</div>
      <div class="mt-3"><button id="tk-save" class="btn btn-primary text-sm">Save trackers</button></div>`;
  },
  wire(d, body) {
    el('#tk-save').onclick = () => {
      const trackers = {};
      body.querySelectorAll('[data-tid]').forEach((box) => { const o = {}; box.querySelectorAll('.tk-f').forEach((i) => o[i.dataset.f] = i.value.trim()); trackers[box.dataset.tid] = o; });
      AS.save(d.app.path, { trackers }, 'Trackers saved');
    };
  },
});

AS.reg('groups', 'Groups', {
  render() { return '<div class="text-slate-500 text-sm">Loading groups…</div>'; },
  async wire(d, body) {
    const g = await API.appGroups(d.app.repo || '');
    const row = (x) => `<div class="gp-row flex items-center gap-2 mb-1"><input class="field text-sm w-32 gp-name" value="${esc(x.name || '')}" placeholder="Group"/><input class="field text-sm flex-1 gp-em" value="${esc((x.emails || []).join(', '))}" placeholder="a@x.com, b@y.com"/><button class="gp-rm btn btn-ghost text-[11px] text-rose-300">✕</button></div>`;
    body.innerHTML = `<div class="text-xs text-slate-400 mb-2">Client email groups for <b>${esc(d.app.repo || d.app.name)}</b> (used when emailing a build).</div>
      <div id="gp-rows">${(g.own || []).map(row).join('') || row({})}</div>
      <button id="gp-add" class="btn btn-ghost text-xs my-2">${ICON.plus}Add group</button>
      <div>${g.global && g.global.length ? `<div class="text-[11px] text-slate-500 mb-2">Global groups (all apps): ${g.global.map((x) => esc(x.name)).join(', ')}</div>` : ''}<button id="gp-save" class="btn btn-primary text-sm">Save groups</button></div>`;
    el('#gp-add').onclick = () => el('#gp-rows').insertAdjacentHTML('beforeend', row({}));
    body.addEventListener('click', (e) => { if (e.target.closest('.gp-rm')) e.target.closest('.gp-row').remove(); });
    el('#gp-save').onclick = () => {
      const groups = [...body.querySelectorAll('.gp-row')].map((r) => ({ name: r.querySelector('.gp-name').value.trim() || 'Group', emails: r.querySelector('.gp-em').value.split(/[\s,;]+/).filter(Boolean) })).filter((x) => x.emails.length);
      API.post('/api/groups/save', { repo: d.app.repo || '', groups }).then((r) => toast(r.ok ? 'Groups saved' : (r.error || 'Failed'), r.ok ? 'ok' : 'err'));
    };
  },
});
