// Build Helper frontend — shared view helpers (_body/_skel, used by every view) + the Reports view.
// The Dashboard lives in dashboard.js, Build in project.js, Setup in setup.js — each attaches to
// window.V and renders into the persistent #bhbody that Vue owns (see app.js).
'use strict';

const _body = () => el('#bhbody');
const _skel = (n = 4) => `<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">${Array.from({ length: n }, () => '<div class="surface p-4" style="height:118px;opacity:.5"></div>').join('')}</div>`;

window.V.reports = async function () {
  BH.view = 'reports'; if (window.setShell) setShell('reports');
  const b = BH.builds.length ? BH.builds : (await API.dashboard().catch(() => ({ builds: [] }))).builds || [];
  BH.builds = b;
  const envs = [...new Set(b.map((x) => x.env).filter(Boolean))];
  _body().innerHTML = `
    <div class="eyebrow mb-3">Build reports</div>
    <div class="surface p-4 mb-4 flex flex-wrap items-end gap-3">
      <label class="block"><span class="text-[11px] text-slate-500">Range</span>
        <select id="rp-range" class="field text-sm mt-1"><option value="0">All time</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select></label>
      <label class="block"><span class="text-[11px] text-slate-500">Env</span>
        <select id="rp-env" class="field text-sm mt-1"><option value="">All</option>${envs.map((e) => `<option>${esc(e)}</option>`).join('')}</select></label>
      <div class="ml-auto flex gap-2">
        <a id="rp-csv" class="btn btn-secondary text-sm" href="#" target="_blank">${ICON.fileText}CSV</a>
        <a id="rp-html" class="btn btn-primary text-sm" href="#" target="_blank">${ICON.fileText}Print / PDF</a>
      </div>
    </div>
    <div id="rp-list" class="space-y-2"></div>`;
  const sync = () => {
    const f = { range: el('#rp-range').value, env: el('#rp-env').value };
    el('#rp-csv').href = API.reportUrl('csv', f);
    el('#rp-html').href = API.reportUrl('html', f);
    const cutoff = f.range ? Date.now() - f.range * 864e5 : 0;
    const rows = b.filter((x) => (!cutoff || new Date(x.time).getTime() >= cutoff) && (!f.env || x.env === f.env));
    el('#rp-list').innerHTML = rows.length ? rows.slice(0, 100).map(C.buildRow).join('') : '<div class="surface p-5 text-sm text-slate-400">No builds match.</div>';
  };
  el('#rp-range').onchange = sync; el('#rp-env').onchange = sync; sync();
};
