
// ---------- APP SHELL (parameterized) ----------
// The tools that make up the platform. Static so the switcher works even with the hub down;
// health is probed live per tool (each tool serves /api/health with CORS *). Override ports
// via window.KIT_PORTS = { security:4096, ... } if you run on non-default ports.
const KIT_TOOLS = [
  { id: 'hub', name: 'Hub', icon: 'grid', port: 4090 },
  { id: 'build-helper', name: 'Build Helper', icon: 'rocket', port: 4095 },
  { id: 'mobile-qa', name: 'Mobile QA', icon: 'flask', port: 4113 },
  { id: 'mobile-security', name: 'Mobile Security', icon: 'shield', port: 4110 },
  { id: 'flutter-launchpad', name: 'Flutter Launchpad', icon: 'boxes', port: 4120 },
];
let KIT_ID = '';   // this tool's id (set from /api/manifest)
// When embedded in the hub (iframe), the HUB is the sole navigator — the tool hides its own
// switcher so you can't nest tool-inside-tool. Standalone tools keep the switcher.
const EMBEDDED = (() => { try { return window.self !== window.top; } catch { return true; } })();
function appSwitcherHtml() {
  if (EMBEDDED) return '';
  return `<div class="relative shrink-0">
    <button id="appsw" class="btn btn-ghost px-2 py-1.5" title="Switch tool">${ICON.grid}</button>
    <div id="appswmenu" class="appsw-menu hidden">
      <div class="text-[10px] uppercase tracking-wider text-slate-500 px-2 pb-1.5">Mobile DevTools</div>
      ${KIT_TOOLS.map((t) => `<a class="appsw-item" data-tool="${t.id}" data-port="${t.port}"><span class="appsw-ic">${ICON[t.icon] || ICON.grid}</span><span class="flex-1">${esc(t.name)}</span><span class="appsw-dot" data-port="${t.port}"></span></a>`).join('')}
    </div>
  </div>`;
}
// cfg: { title, icon, color, tabs:[{id,label}], active, right, home, onUpdate }
function topnav(cfg) {
  const { title = 'Mobile DevTools', icon = ICON.grid, color = 'brand', tabs = [], active, right = '', home = tabs[0] && tabs[0].id } = cfg;
  const tab = (t) => `<button class="navtab ${active === t.id ? 'active' : ''}" data-nav="${t.id}"${t.cap ? ` data-cap="${t.cap}"` : ''}>${esc(t.label)}</button>`;
  return `<header class="sticky top-0 z-50 -mt-6 -mx-5 px-5 mb-6 border-b border-edge/70 bg-ink/70 backdrop-blur-xl">
    <div class="flex items-center gap-3 h-14">
      <button data-nav="${home}" class="flex items-center gap-2.5 shrink-0" title="${esc(title)}">
        <div class="h-8 w-8 rounded-[10px] grid place-items-center shadow-[0_5px_14px_-4px_rgba(91,124,250,.7)]" style="background:linear-gradient(135deg,var(--brand),var(--brand2))">${icon}</div>
        <div class="font-display font-bold text-[15px] tracking-tight">${esc(title)}</div>
      </button>
      <nav class="flex items-center gap-1 ml-1 shrink-0">${tabs.map(tab).join('')}</nav>
      <div class="ml-auto flex items-center gap-2.5 shrink-0">${right}${appSwitcherHtml()}<button id="navver" class="hidden sm:inline text-[11px] font-mono text-slate-500 hover:text-slate-300 transition-colors"></button></div>
    </div>
  </header>`;
}
// handlers: { tabId: fn }. Also wires the app-switcher + refreshes the version pill.
function wireNav(handlers) {
  document.querySelectorAll('[data-nav]').forEach((b) => b.onclick = () => { const fn = handlers[b.dataset.nav]; if (fn) fn(); });
  const tb = el('#navteam'); if (tb) tb.onclick = openTeam;
  wireSwitcher();
  kitVersion();
  applyCaps();                                   // hide cap-gated controls in the freshly-rendered page…
  kitLoadMe().then(() => applyCaps());            // …and again once identity is known (first load)
}
function toolUrl(port) { const p = (window.KIT_PORTS || {}); const id = KIT_TOOLS.find((t) => t.port === port)?.id; return `http://${location.hostname}:${(id && p[id]) || port}/`; }
// Open-source edition has no accounts. KIT_ME stays null and the capability helpers below are
// always-permissive stubs, so tool code calling kitCan()/registerCapClass()/applyCaps() still works.
let KIT_ME = null, KIT_ME_LOADED = false;
function kitLoadMe() {
  // Open-source edition: no accounts, so there is no identity to load — capabilities stay ungated.
  KIT_ME_LOADED = true; KIT_ME = null; return Promise.resolve(null);
}
// Does the account have a capability for THIS tool? Uses the server-computed toolCaps ('*' = all).
// Not logged in / open dev / older server → allow (show everything; the server 403 is the real boundary).
function kitCan(cap) {
  if (!KIT_ME) return true;
  const tc = KIT_ME.toolCaps;
  if (tc == null || tc === '*') return true;
  return Array.isArray(tc) && tc.includes(cap);
}
// Tools register scattered gated controls by CSS class → capability (avoids tagging every occurrence).
const KIT_CAP_CLASS = {};
function registerCapClass(map) { Object.assign(KIT_CAP_CLASS, map || {}); if (KIT_ME) applyCaps(); }
// Hide any control the account can't use — both [data-cap] elements and registered classes. Hide
// (not remove) so id-based handlers wired elsewhere never hit a null. Only acts once KIT_ME is known.
const kitHide = (elm) => elm.style.setProperty('display', 'none', 'important');
function applyCaps(root) {
  if (!KIT_ME) return;
  const r = root || document;
  r.querySelectorAll('[data-cap]').forEach((elm) => { if (!kitCan(elm.dataset.cap)) kitHide(elm); });
  for (const [cls, cap] of Object.entries(KIT_CAP_CLASS)) if (!kitCan(cap)) r.querySelectorAll('.' + cls).forEach(kitHide);
}
function wireSwitcher() {
  const btn = el('#appsw'), menu = el('#appswmenu'); if (!btn || !menu) return;
  btn.onclick = (e) => { e.stopPropagation(); menu.classList.toggle('hidden'); if (!menu.classList.contains('hidden')) probeSwitcher(); };
  document.addEventListener('click', () => menu.classList.add('hidden'), { once: true });
  // Every tool is open on localhost — just navigate straight to the sibling's port.
  menu.querySelectorAll('.appsw-item').forEach((a) => {
    const id = a.dataset.tool;
    if (id === KIT_ID) { a.remove(); return; }   // never list the current tool in its own switcher
    a.onclick = () => { location.href = toolUrl(+a.dataset.port); };
  });
}
async function probeSwitcher() {
  for (const dot of document.querySelectorAll('.appsw-dot')) {
    const port = +dot.dataset.port;
    fetch(toolUrl(port) + 'api/health', { cache: 'no-store', signal: AbortSignal.timeout(1500) })
      .then((r) => r.ok ? dot.classList.add('on') : dot.classList.remove('on'))
      .catch(() => dot.classList.remove('on'));
  }
}
async function kitVersion() {
  try { const m = await fetch('/api/manifest', { cache: 'no-store' }).then((r) => r.json()); KIT_ID = m.id || ''; const b = el('#navver'); if (b) { b.textContent = 'v' + (m.version || '?'); b.title = m.name || ''; } const self = document.querySelector(`.appsw-item[data-tool="${KIT_ID}"]`); if (self) self.remove(); } catch {}
}
