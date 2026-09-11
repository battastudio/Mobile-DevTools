
async function postJson(url, body) { return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json()); }
// Stream an SSE POST endpoint into a log box.
function streamSSE(url, body, box, onDone) {
  const write = (s, cls = '') => { const d = document.createElement('div'); if (cls) d.className = cls; d.textContent = stripAnsi(s); box.appendChild(d); box.scrollTop = box.scrollHeight; };
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((res) => {
    const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = '';
    const pump = () => reader.read().then(({ done, value }) => {
      if (done) { onDone && setTimeout(onDone, 500); return; }
      buf += dec.decode(value, { stream: true }); let i;
      while ((i = buf.indexOf('\n\n')) >= 0) { const chunk = buf.slice(0, i); buf = buf.slice(i + 2);
        const ev = /event: (.+)/.exec(chunk), dt = /data: ([\s\S]+)/.exec(chunk); if (!ev || !dt) continue;
        const t = ev[1]; let d; try { d = JSON.parse(dt[1]); } catch { continue; }
        if (t === 'log') write(d.line); else if (t === 'step') write('▸ ' + d.text, 'text-emerald-300 font-semibold mt-1');
        else if (t === 'error') write('✖ ' + d.message, 'text-rose-400 font-semibold');
        else if (t === 'done') write('✔ done', 'text-emerald-400 font-semibold');
      }
      return pump();
    });
    return pump();
  }).catch((e) => write('✖ ' + e.message, 'text-rose-400'));
}

// One shared modal shell.
function openModal({ title, subtitle, tabs, active, onTab, size = '1080px', bodyClass = 'p-5 md:p-6' }) {
  const box = el('#cmdk'); box.classList.remove('hidden'); box.classList.add('flex');
  const tabsHtml = tabs ? `<nav class="seg ml-1">${tabs.map((t) => `<button class="seg-item ${t.id === active ? 'active' : ''}" data-mtab="${t.id}">${esc(t.label)}</button>`).join('')}</nav>` : '';
  const close = () => { box.classList.add('hidden'); box.classList.remove('flex'); box.innerHTML = ''; };
  box.innerHTML = `<div class="w-[min(100vw-2rem,${size})] rounded-2xl border border-edge bg-panel shadow-2xl overflow-hidden max-h-[92vh] flex flex-col" onclick="event.stopPropagation()">
    <div class="aurora flex items-center gap-3 px-5 py-3.5 border-b border-edge" style="background:var(--sunken)">
      <div class="relative flex items-baseline gap-2.5 min-w-0"><span class="font-display text-[15px] truncate">${esc(title)}</span>${subtitle ? `<span class="readout text-xs text-slate-500 truncate">${esc(subtitle)}</span>` : ''}</div>
      ${tabsHtml}
      <button id="modal-close" class="ml-auto btn btn-ghost px-2 py-2" title="Close">${ICON.x}</button>
    </div>
    <div id="modalbody" class="overflow-y-auto ${bodyClass} text-slate-300"></div>
  </div>`;
  box.onclick = close; el('#modal-close').onclick = close;
  if (tabs && onTab) box.querySelectorAll('[data-mtab]').forEach((b) => b.onclick = () => { box.querySelectorAll('[data-mtab]').forEach((x) => x.classList.toggle('active', x === b)); onTab(b.dataset.mtab); });
  const onKey = (e) => { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); } };
  document.addEventListener('keydown', onKey);
  return el('#modalbody');
}
