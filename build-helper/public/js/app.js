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
    right: `<button id="bh-gear" class="btn btn-ghost text-xs px-2 py-1" title="Connectors &amp; team settings">${ICON.gear}</button>`,
  });
}

// (Re)render the reactive topnav for a tab and wire it once the new DOM exists. #bhbody persists.
// Views call this at their start so any entry path (tab click, card click, Back) highlights right.
window.setShell = async function (active) {
  navHtml.value = shell(active); await nextTick();
  wireNav(NAV);
  const g = el('#bh-gear'); if (g) g.onclick = () => openSettings({});
};

async function boot() {
  try { const m = await API.manifest(); if (m.name) BH.toolName = m.name; } catch {}
  await V.dashboard();
}

Kit.createApp({
  setup() { onMounted(boot); return { navHtml }; },
  template: `<div v-html="navHtml"></div><div id="bhbody"></div>`,
}).mount('#app');
