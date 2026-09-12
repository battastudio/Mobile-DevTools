// Build Helper frontend — Dashboard (source design). Renders into #bhbody under the kit nav.
// Release-console header, range/project/env filters, KPI cards, 2×2 charts + security posture, and
// the Project-health table + Storage/Activity right rail. Health rows live in health-table.js.
'use strict';

const SECURITY_URL = 'http://localhost:4110';
const DASH = { data: null, sec: null, range: 30, project: '', env: '', search: '', favOnly: false, sort: { key: '', dir: 1 }, density: (localStorage.getItem('bh:density') || 'comfortable') };
const deltaStr = (n) => (n > 0 ? `▲ ${n}` : n < 0 ? `▼ ${-n}` : '±0');
const _gcol = (l) => ({ A: 'emerald', B: 'emerald', C: 'amber', D: 'orange', F: 'rose' }[l] || 'slate');
const _cut = () => (DASH.range ? Date.now() - DASH.range * 864e5 : 0);
const filteredBuilds = () => (DASH.data ? DASH.data.builds.filter((b) => (!_cut() || +new Date(b.time) >= _cut()) && (!DASH.project || b.project === DASH.project) && (!DASH.env || b.env === DASH.env)) : []);
function prevBuilds() { const d = DASH.data; if (!d || !DASH.range) return []; const now = Date.now(), a = now - 2 * DASH.range * 864e5, b = now - DASH.range * 864e5; return d.builds.filter((x) => { const t = +new Date(x.time); return t >= a && t < b && (!DASH.project || x.project === DASH.project) && (!DASH.env || x.env === DASH.env); }); }

window.V.dashboard = async function () {
  BH.view = 'dashboard'; if (window.setShell) setShell('dashboard');
  _body().innerHTML = '<div id="dashbody" class="text-slate-400 text-sm">Loading…</div>';
  const [d, sec] = await Promise.all([API.dashboard().catch(() => null), fetch(SECURITY_URL + '/api/security/all').then((r) => r.json()).catch(() => null)]);
  if (!d) { el('#dashbody').textContent = 'Failed to load.'; return; }
  DASH.data = d; DASH.sec = sec; BH.projects = d.projects || []; BH.builds = d.builds || []; window.SECURITY_ONLINE = !!(sec && sec.overall);
  renderDashboard(); connectFeed();
};
const refreshDashboard = () => V.dashboard();

function renderDashboard() {
  const d = DASH.data; const B = filteredBuilds(), P = prevBuilds();
  const total = B.length, ok = B.filter((b) => b.buildOk !== false).length, success = total ? Math.round(ok / total * 100) : 0;
  const durs = B.filter((b) => b.durationMs).map((b) => b.durationMs), avg = durs.length ? durs.reduce((a, b) => a + b, 0) / durs.length : 0;
  const seg = (v, c) => `<button class="range px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${DASH.range === v ? 'bg-raised text-white shadow-[inset_0_0_0_1px_#2c3340]' : 'text-slate-400 hover:text-slate-200'}" data-r="${v}">${c}</button>`;
  const kpi = (l, val, sub) => `<div class="surface p-4"><div class="text-[11px] uppercase tracking-wider text-slate-500 font-medium">${l}</div><div class="font-display text-[32px] leading-none font-bold mt-2.5 tnum" style="color:var(--ink)">${val}</div><div class="text-[11px] text-slate-500 mt-2.5">${sub || ''}</div></div>`;
  const last = (d.builds || [])[0], lastShip = last ? relTime(last.time) : '—', activeApps = (d.projects || []).filter((p) => p.buildCount).length;
  const projOpts = ['<option value="">All projects</option>'].concat(d.projects.filter((p) => p.buildCount).map((p) => `<option ${DASH.project === p.path ? 'selected' : ''} value="${esc(p.path)}">${esc(p.name)}</option>`)).join('');
  const envUnion = [...new Set([...ENVS, ...(d.builds || []).map((b) => b.env)])].filter(Boolean);
  const envOpts = ['<option value="">All envs</option>'].concat(envUnion.map((e) => `<option ${DASH.env === e ? 'selected' : ''}>${esc(e)}</option>`)).join('');
  el('#dashbody').innerHTML = `
    <div class="mb-5"><div class="text-[11px] uppercase tracking-[.24em] font-semibold mb-1.5" style="color:var(--brand2)">Release console</div>
      <div class="flex items-baseline gap-3 flex-wrap"><h1 class="font-display text-2xl font-bold" style="color:var(--ink)">Overview</h1>
        <span class="readout text-xs text-slate-500">${total} builds · ${success}% ok · ${activeApps} active app${activeApps === 1 ? '' : 's'} · last ship ${lastShip}</span></div></div>
    <div class="flex flex-wrap items-center gap-2 mb-4">
      <div class="flex rounded-lg border border-edge bg-ink p-0.5">${seg(7, '7d')}${seg(30, '30d')}${seg(90, '90d')}${seg(0, 'All')}</div>
      <select id="fproj" class="field text-xs py-1.5">${projOpts}</select><select id="fenv" class="field text-xs py-1.5">${envOpts}</select>
      <a id="expcsv" class="ml-auto btn btn-secondary text-xs px-2.5 py-1.5" href="${API.reportUrl('csv', { range: DASH.range, project: DASH.project, env: DASH.env })}">Export CSV</a>
      <a id="expreport" target="_blank" class="btn btn-secondary text-xs px-2.5 py-1.5" href="${API.reportUrl('html', { range: DASH.range, project: DASH.project, env: DASH.env })}">Report</a></div>
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">${kpi('Success rate', success + '%', `${ok}/${total} builds ok`)}${kpi('Avg build time', fmtDur(avg), durs.length + ' timed')}${kpi('Builds', total, deltaStr(total - P.length) + ' vs prev')}${kpi('Storage', fmtBytes(d.storage.totalBytes), d.storage.files + ' files')}</div>
    ${securityPostureHtml()}
    <div class="grid lg:grid-cols-2 gap-3 mb-4">
      <div class="surface p-4"><div class="flex items-center mb-1"><div class="text-sm font-semibold">Builds over time</div><div class="ml-auto text-[11px] flex items-center gap-3"><span class="flex items-center gap-1"><span class="h-2 w-2 rounded-sm" style="background:var(--good)"></span>ok</span><span class="flex items-center gap-1"><span class="h-2 w-2 rounded-sm" style="background:var(--crit)"></span>failed</span></div></div>${stackedColumnsSvg(bucketDays(B, DASH.range || 90))}</div>
      <div class="surface p-4"><div class="text-sm font-semibold mb-1">Build duration</div>${lineSvg(B.filter((b) => b.durationMs).slice().reverse().map((b) => ({ label: b.project + ' ' + b.version, ms: b.durationMs })))}</div>
      <div class="surface p-4"><div class="text-sm font-semibold mb-2">Environment split</div>${hbarsSvg(envUnion.map((e) => ({ name: e.toUpperCase(), count: B.filter((b) => b.env === e).length, color: ENV_HEX[e] || '#64748b' })).filter((i) => i.count))}</div>
      <div class="surface p-4"><div class="text-sm font-semibold mb-2">Upload health by target</div>${uploadTargetsSvg(B)}</div></div>
    <div class="grid lg:grid-cols-3 gap-3">
      <div class="lg:col-span-2 surface p-4"><div class="flex items-center gap-3 mb-2"><div class="text-sm font-semibold">Project health</div>
        <select id="density" class="ml-auto rounded-lg bg-ink border border-edge px-2 py-1 text-xs text-slate-300" title="Row size">${['compact:Compact', 'comfortable:Comfortable', 'large:Large'].map((o) => { const [v, l] = o.split(':'); return `<option value="${v}" ${DASH.density === v ? 'selected' : ''}>${l}</option>`; }).join('')}</select>
        <label class="text-xs text-slate-400 flex items-center gap-1"><input id="favonly" type="checkbox" class="accent-amber-400" ${DASH.favOnly ? 'checked' : ''}/> ★ favorites</label></div>
        <div class="overflow-auto"><table class="health w-full text-xs"><thead class="text-slate-400"><tr class="text-left"><th class="py-1.5 pr-2"></th>${['name:App', 'version:Version', 'env:Env', 'last:Last build', 'status:Status', 'buildCount:Builds'].map((c) => { const [k, l] = c.split(':'); return `<th data-sort="${k}" class="py-1.5 pr-3 font-medium">${l}</th>`; }).join('')}<th class="py-1.5 pr-3 font-medium">Security</th><th></th></tr></thead><tbody id="healthbody"></tbody></table></div></div>
      <div class="space-y-3">
        <div class="surface p-4"><div class="flex items-center gap-1.5 mb-2"><div class="text-sm font-semibold">Storage</div><button id="cleanup" class="ml-auto text-[11px] rounded border border-edge px-2 py-0.5 hover:bg-panel">Clean &gt;30d</button></div>
          <div class="text-2xl font-bold" style="color:var(--ink)">${fmtBytes(d.storage.totalBytes)}</div>
          <div class="mt-2 space-y-1">${Object.entries(d.storage.perProject || {}).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([n, by]) => { const w = Math.round(by / Math.max(1, d.storage.totalBytes) * 100); return `<div class="text-[11px]"><div class="flex justify-between text-slate-400"><span class="truncate">${esc(n)}</span><span>${fmtBytes(by)}</span></div><div class="h-1.5 rounded bg-ink mt-0.5"><div class="h-1.5 rounded" style="width:${w}%;background:var(--blue)"></div></div></div>`; }).join('') || '<div class="text-[11px] text-slate-500">No artifacts.</div>'}</div></div>
        <div class="surface p-4"><div class="text-sm font-semibold mb-2">Activity <span class="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse ml-1"></span></div><div id="feed" class="space-y-1 text-xs text-slate-400 max-h-56 overflow-auto">waiting for build events…</div></div>
      </div></div>`;
  renderHealth(); wireDash();
}

function wireDash() {
  _body().querySelectorAll('.range').forEach((b) => b.onclick = () => { DASH.range = +b.dataset.r; renderDashboard(); });
  el('#fproj').onchange = (e) => { DASH.project = e.target.value; renderDashboard(); };
  el('#fenv').onchange = (e) => { DASH.env = e.target.value; renderDashboard(); };
  el('#density').onchange = (e) => { DASH.density = e.target.value; try { localStorage.setItem('bh:density', DASH.density); } catch {} renderHealth(); };
  el('#favonly').onchange = (e) => { DASH.favOnly = e.target.checked; renderHealth(); };
  el('#cleanup').onclick = () => API.post('/api/cleanup', { olderThanDays: 30 }).then((r) => { toast(`Freed ${fmtBytes(r.freed || 0)}`, 'ok'); refreshDashboard(); });
  _body().querySelectorAll('[data-sort]').forEach((th) => th.onclick = () => { const k = th.dataset.sort; DASH.sort = { key: DASH.sort.key === k ? '' : k, dir: DASH.sort.key === k ? -DASH.sort.dir : 1 }; renderHealth(); });
  const gs = el('#gotosec'); if (gs) gs.onclick = () => window.open(SECURITY_URL, '_blank');
  _body().querySelectorAll('.secjump').forEach((b) => b.onclick = () => window.open(SECURITY_URL, '_blank'));
  if (window.tourPrompt && d0().projects.length) tourPrompt('bh-tour-dashboard', 'the dashboard', () => startTourFor('dashboard'));
}
const d0 = () => DASH.data || { projects: [] };

function securityPostureHtml() {
  if (typeof SECURITY_ONLINE !== 'undefined' && !SECURITY_ONLINE) return '';
  const sec = DASH.sec; if (!sec || !sec.overall) return '';
  const ov = sec.overall, gc = _gcol(ov.letter);
  const apps = (sec.apps || []).filter((a) => a.grade).sort((a, b) => a.grade.score - b.grade.score).slice(0, 4);
  const banner = ov.totalFail > 0 ? `<span class="text-rose-300 font-medium">${ov.totalFail} issue${ov.totalFail === 1 ? '' : 's'} to fix before the security team finds them</span>` : (ov.scanned ? `<span class="text-emerald-300 font-medium">No failing checks across ${ov.scanned} scanned app${ov.scanned === 1 ? '' : 's'}</span>` : '<span class="text-slate-400">No security scans yet — run one from the Security tool</span>');
  return `<div class="surface p-4 mb-4"><div class="flex items-center gap-3 ${apps.length ? 'mb-3' : ''}"><span class="inline-grid place-items-center h-10 w-10 rounded-xl bg-${gc}-500/15 text-${gc}-300 ring-1 ring-inset ring-${gc}-500/30 font-display font-bold text-xl">${ov.avg != null ? ov.letter : '—'}</span><div><div class="text-sm font-semibold">Security posture</div><div class="text-xs text-slate-500 mt-0.5">${banner}</div></div><button id="gotosec" class="ml-auto btn btn-primary text-xs px-3 py-1.5">Open Security ▸</button></div>${apps.length ? `<div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">${apps.map((a) => { const c = _gcol(a.grade.letter); return `<button class="secjump flex items-center gap-2.5 rounded-xl border border-edge px-3 py-2 text-left hover:bg-raised/60" data-p="${esc(a.path)}" style="background:var(--panel)"><span class="inline-grid place-items-center h-7 w-7 rounded-lg bg-${c}-500/15 text-${c}-300 font-display font-bold text-sm shrink-0">${a.grade.letter}</span><span class="min-w-0"><span class="block text-[13px] font-medium truncate">${esc(a.name)}</span><span class="block text-[11px] text-slate-500">${a.grade.counts.fail || 0} failing · ${a.grade.counts.warn || 0} advisories</span></span></button>`; }).join('')}</div>` : ''}</div>`;
}

// One persistent activity-feed connection; appends into #feed when present.
let _feedES = null;
function connectFeed() {
  if (_feedES) return;
  try { _feedES = new EventSource('/api/feed'); } catch { return; }
  _feedES.addEventListener('feed', (e) => { const box = el('#feed'); if (!box) return; let d; try { d = JSON.parse(e.data); } catch { return; } if (box.textContent === 'waiting for build events…') box.innerHTML = ''; const icon = { start: '▶', done: '✅', error: '❌' }[d.kind] || '•'; box.insertAdjacentHTML('afterbegin', `<div><span class="text-slate-500">${new Date(d.time).toLocaleTimeString()}</span> ${icon} <span class="font-mono text-slate-300">${esc(d.project || '')}</span> ${esc(d.text || '')}</div>`); });
}
