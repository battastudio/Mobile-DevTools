// Build Helper frontend — shell + boot. Vue owns #app: a reactive v-html topnav (re-wired on every
// tab change via wireNav, mirroring the sibling tools) plus a persistent #bhbody that the imperative
// view renderers (state/api/components/views/project/setup) fill by id. Shared kit.js helpers
// (topnav/wireNav/openSettings/ICON/toast/…) stay imperative and are used by bare name.
'use strict';

const { ref, onMounted, nextTick } = Vue;
const navHtml = ref('');

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'build', label: 'Build' },
  { id: 'reports', label: 'Reports' },
  { id: 'setup', label: 'Setup' },
];
// The Build tab needs a selected app; without one, bounce to the dashboard to pick.
const NAV = {
  dashboard: () => V.dashboard(),
  build: () => (BH.sel ? V.project(BH.sel) : (toast('Pick an app on the dashboard first', 'info'), V.dashboard())),
  reports: () => V.reports(),
  setup: () => V.setup(),
};

function shell(active) {
  return topnav({
    title: BH.toolName, icon: ICON.rocket, tabs: TABS, active,
    right: `<button id="bh-update" class="btn btn-ghost text-xs px-2 py-1" title="Version & update">⬆</button><button id="bh-tour" class="btn btn-ghost text-xs px-2 py-1" title="Guided tour">?</button><button id="bh-gear" class="btn btn-ghost text-xs px-2 py-1" title="Connectors &amp; team settings">${ICON.gear}</button>`,
  });
}

// Guided-tour steps per screen (selectors resolve against the [data-tour] anchors the views render).
const TOURS = {
  dashboard: [
    { sel: '[data-tour=kpis]', title: 'Your build KPIs', body: 'Success rate, counts, and storage — filtered by the range/project/env pickers below.' },
    { sel: '[data-tour=filters]', title: 'Filters & charts', body: 'Slice builds by range, project, and environment. The charts update live.' },
    { sel: '[data-tour=projects]', title: 'Project health', body: 'Every Flutter app: sort columns, drag to reorder, favorite ★, and open to build.' },
  ],
  project: [
    { sel: '[data-tour=envs]', title: 'Environments & version', body: 'Tick the envs to build; set version name (bump with M/m/p) and build number per env.' },
    { sel: '[data-tour=outputs]', title: 'Outputs & distribution', body: 'Pick artifacts and where each goes — OneDrive, TestFlight, Firebase, Play.' },
    { sel: '[data-tour=log]', title: 'Live log', body: 'Streams while building and survives navigation. Recent builds and history sit below.' },
  ],
};
window.startTourFor = (view) => startTour(TOURS[view] || TOURS.dashboard, 'bh-tour-' + (view || 'dashboard'));

// (Re)render the reactive topnav for a tab and wire it once the new DOM exists. #bhbody persists.
// Views call this at their start so any entry path (tab click, card click, Back) highlights right.
window.setShell = async function (active) {
  navHtml.value = shell(active); await nextTick();
  wireNav(NAV);
  const g = el('#bh-gear'); if (g) g.onclick = () => openSettings({});
  const t = el('#bh-tour'); if (t) t.onclick = () => startTourFor(BH.view);
  const u = el('#bh-update'); if (u) u.onclick = openUpdate;
};

// Version + self-update modal: current version, commits behind, tool changelog, and "Update now".
async function openUpdate() {
  const [v, cl] = await Promise.all([
    fetch('/api/version').then((r) => r.json()).catch(() => ({})),
    fetch('/api/changelog/tool').then((r) => r.json()).catch(() => ({ commits: [] })),
  ]);
  const b = openModal({ title: BH.toolName, subtitle: `version ${v.version || '?'}${v.behind ? ` · ${v.behind} behind` : ''}`, size: '560px' });
  b.innerHTML = `<div class="mb-3 text-sm">${v.behind ? `<span class="text-amber-300">${v.behind} update(s) available.</span>` : '<span class="text-emerald-300">Up to date.</span>'}</div>
    <button id="up-go" class="btn btn-primary text-sm mb-3">Update now (git pull)</button>
    <div id="up-log" class="bh-term hidden mb-3" style="height:150px"></div>
    <div class="eyebrow mb-1">Recent changes</div>
    <div class="space-y-1 text-xs">${(cl.commits || []).slice(0, 12).map((c) => `<div class="flex gap-2"><span class="font-mono text-slate-500">${esc(c.sha || '')}</span><span class="flex-1 truncate">${esc(c.subject || '')}</span><span class="text-slate-500">${esc(c.date || '')}</span></div>`).join('') || '<div class="text-slate-500">No history.</div>'}</div>`;
  el('#up-go').onclick = () => { const l = el('#up-log'); l.classList.remove('hidden'); streamSSE('/api/self-update', {}, l, () => toast('Updated — restart to apply', 'ok')); };
}

async function boot() {
  try { const m = await API.manifest(); if (m.name) BH.toolName = m.name; } catch {}
  await V.dashboard();
}

Kit.createApp({
  setup() { onMounted(boot); return { navHtml }; },
  template: `<div v-html="navHtml"></div><div id="bhbody"></div>`,
}).mount('#app');
