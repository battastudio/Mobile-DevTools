// Build Helper frontend — ⌘K quick-jump palette (window.CMDK). Its own overlay (kit openModal owns
// #cmdk), a fuzzy-ish substring filter over nav actions + every scanned project, keyboard-driven.
'use strict';

let _sel = 0, _items = [];

function _overlay() {
  let o = el('#bh-cmdk');
  if (o) return o;
  o = document.createElement('div');
  o.id = 'bh-cmdk';
  o.className = 'fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm hidden items-start justify-center p-4';
  o.style.paddingTop = '14vh';
  o.innerHTML = `<div class="w-[min(100vw-2rem,560px)] surface overflow-hidden p-0" onclick="event.stopPropagation()">
    <input id="cmdk-in" class="w-full bg-transparent px-4 py-3 text-sm outline-none border-b border-edge" placeholder="Jump to a project or action…" spellcheck="false"/>
    <div id="cmdk-list" class="max-h-[52vh] overflow-y-auto py-1"></div></div>`;
  document.body.appendChild(o);
  o.onclick = () => CMDK.close();
  return o;
}

function _catalog() {
  const nav = [
    { label: 'Dashboard', hint: 'view', run: () => V.dashboard() },
    { label: 'Reports', hint: 'view', run: () => V.reports() },
    { label: 'Setup & Doctor', hint: 'view', run: () => V.setup() },
    { label: 'Connectors & team settings', hint: 'action', run: () => openSettings({}) },
  ];
  const projects = (BH.projects || []).map((p) => ({ label: p.name, hint: p.needsConfig ? 'set up' : 'build', run: () => (p.needsConfig && window.openAppSetup ? openAppSetup(p.path) : V.project(p.path)) }));
  return nav.concat(projects);
}

function _render(q) {
  const s = (q || '').trim().toLowerCase();
  _items = _catalog().filter((it) => !s || it.label.toLowerCase().includes(s));
  _sel = 0;
  const list = el('#cmdk-list');
  list.innerHTML = _items.length ? _items.map((it, i) => `<button data-i="${i}" class="cmdk-row w-full text-left px-4 py-2 flex items-center gap-2 text-sm ${i === 0 ? 'bg-white/[.05]' : ''}">
    <span class="flex-1 truncate">${esc(it.label)}</span><span class="text-[10px] uppercase tracking-wider text-slate-500">${esc(it.hint)}</span></button>`).join('')
    : '<div class="px-4 py-6 text-center text-xs text-slate-500">No matches.</div>';
  list.querySelectorAll('[data-i]').forEach((b) => { b.onmouseenter = () => _highlight(+b.dataset.i); b.onclick = () => _run(+b.dataset.i); });
}

function _highlight(i) {
  _sel = Math.max(0, Math.min(_items.length - 1, i));
  el('#cmdk-list').querySelectorAll('.cmdk-row').forEach((r, j) => r.classList.toggle('bg-white/[.05]', j === _sel));
}
function _run(i) { const it = _items[i]; if (!it) return; CMDK.close(); it.run(); }

window.CMDK = {
  open() {
    const o = _overlay(); o.classList.remove('hidden'); o.classList.add('flex');
    const inp = el('#cmdk-in'); inp.value = ''; _render(''); inp.focus();
    inp.oninput = () => _render(inp.value);
    inp.onkeydown = (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); _highlight(_sel + 1); el('#cmdk-list').children[_sel]?.scrollIntoView({ block: 'nearest' }); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); _highlight(_sel - 1); el('#cmdk-list').children[_sel]?.scrollIntoView({ block: 'nearest' }); }
      else if (e.key === 'Enter') { e.preventDefault(); _run(_sel); }
      else if (e.key === 'Escape') this.close();
    };
  },
  close() { const o = el('#bh-cmdk'); if (o) { o.classList.add('hidden'); o.classList.remove('flex'); } },
};

// Global shortcut: ⌘K / Ctrl-K toggles the palette.
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
    e.preventDefault();
    const open = el('#bh-cmdk') && !el('#bh-cmdk').classList.contains('hidden');
    open ? CMDK.close() : CMDK.open();
  }
});
