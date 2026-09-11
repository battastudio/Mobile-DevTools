// [split from app.js] Command palette (Cmd-K).
// ================= COMMAND PALETTE (⌘K) =================
function paletteItems() {
  const items = [
    { label: 'Dashboard', run: () => showApp('dashboard') },
    { label: 'Run QA (pick a project)', run: () => showApp('run') },
    { label: 'Run all projects', run: () => showApp('run').then(() => runQa('')) },
  ];
  if (QA.platform === 'flutter') items.push({ label: 'Open Device Lab', run: () => showApp('device') });
  for (const p of (QA.projects || [])) items.push({ label: 'Open ' + p.name, sub: p.type, run: () => showProjectDetail(p.path) });
  return items;
}
function openPalette() {
  const box = el('#cmdk'); box.classList.remove('hidden'); box.classList.add('flex');
  box.innerHTML = `<div class="surface w-full max-w-lg mt-24 self-start mx-auto p-2" onclick="event.stopPropagation()">
    <input id="pal-q" class="field text-sm w-full mb-2" placeholder="Type a command or project…"/>
    <div id="pal-list" class="max-h-80 overflow-auto"></div></div>`;
  const all = paletteItems(); let active = 0, filtered = all;
  const paint = () => document.querySelectorAll('.cmdk-item').forEach((it, idx) => it.classList.toggle('active', idx === active));
  const render = () => {
    const q = (el('#pal-q').value || '').toLowerCase(); filtered = all.filter(i => i.label.toLowerCase().includes(q)); if (active >= filtered.length) active = 0;
    el('#pal-list').innerHTML = filtered.map((i, idx) => `<div class="cmdk-item flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer ${idx === active ? 'active' : ''}" data-i="${idx}"><span class="text-sm text-slate-200">${esc(i.label)}</span>${i.sub ? `<span class="text-[10px] text-slate-500 ml-auto">${esc(i.sub)}</span>` : ''}</div>`).join('') || '<div class="text-slate-500 text-sm px-3 py-4">No matches</div>';
    document.querySelectorAll('.cmdk-item').forEach(it => { it.onmouseenter = () => { active = +it.dataset.i; paint(); }; it.onclick = () => { const i = filtered[+it.dataset.i]; close(); i && i.run(); }; });
  };
  const close = () => { box.classList.add('hidden'); box.classList.remove('flex'); box.innerHTML = ''; document.removeEventListener('keydown', onKey); };
  const onKey = (e) => {
    if (e.key === 'ArrowDown') { active = Math.min(active + 1, filtered.length - 1); paint(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { active = Math.max(active - 1, 0); paint(); e.preventDefault(); }
    else if (e.key === 'Enter') { const i = filtered[active]; close(); i && i.run(); }
    else if (e.key === 'Escape') { close(); }
  };
  box.onclick = close; el('#pal-q').oninput = render; document.addEventListener('keydown', onKey); render(); el('#pal-q').focus();
}
