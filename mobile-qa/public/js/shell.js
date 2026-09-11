// [split from app.js] Topnav shell + view switching (setShell/shell/boot/showApp).
// Set the topnav for a view and (re)wire it once the new DOM exists. #qabody persists across this.
async function setShell(view) { navHtml.value = shell(view); await nextTick(); wireNav(NAV); }
// No auth: there are no accounts, so no capability gate — every control is always available.
function shell(active) {
  const tabs = [{ id: 'dashboard', label: 'Dashboard' }, { id: 'run', label: 'Run QA' }];
  if (QA.platform === 'flutter') tabs.push({ id: 'device', label: 'Device Lab' });
  return topnav({ title: QA.toolName || 'Mobile QA', icon: ICON.flask, tabs, active, right: `${teamButtonHtml()}<button id="qahelp" class="btn btn-ghost text-xs px-2 py-1" title="QA help & guided tour">${ICON.help}</button><button id="qasettings" class="btn btn-ghost text-xs px-2 py-1" title="AI settings">${ICON.gear}</button>` });
}
async function boot() {
  document.addEventListener('keydown', (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openPalette(); } });
  document.addEventListener('click', (e) => { if (!e.target.closest('.qa-menu')) document.querySelectorAll('.qa-menu-pop').forEach(p => p.classList.add('hidden')); });
  try { const m = await fetch('/api/manifest').then(r => r.json()); QA.platform = m.platform || ''; QA.toolName = m.name || ''; } catch { QA.platform = ''; }
  await showApp('dashboard');
  tourPrompt('qaTourSeen', 'QA & Testing', startQaTour);
}
async function showApp(view) {
  QA.view = view; QA.detailPath = '';
  await setShell(view);
  el('#qabody').innerHTML = skeleton(4);
  try { QA.projects = await fetch('/api/projects').then(r => r.json()); } catch { QA.projects = []; }
  if (view === 'device') return renderDeviceLab();
  QA.data = await fetch('/api/qa/all').then(r => r.json()).catch(() => ({ apps: [], overall: {} }));
  render();
}
