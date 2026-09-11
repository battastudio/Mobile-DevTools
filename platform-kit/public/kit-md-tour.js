
// Minimal markdown → HTML (no deps). Handles headings, bold/italic, code, lists, tables, hr, links.
function mdToHtml(md) {
  const esc0 = (s) => esc(s);
  const inline = (s) => esc0(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  const lines = String(md || '').replace(/\r/g, '').split('\n');
  let out = '', i = 0, list = null;
  const closeList = () => { if (list) { out += `</${list}>`; list = null; } };
  while (i < lines.length) {
    let ln = lines[i];
    if (/^```/.test(ln)) { closeList(); i++; let code = ''; while (i < lines.length && !/^```/.test(lines[i])) code += lines[i++] + '\n'; i++; out += `<pre class="md-pre">${esc0(code)}</pre>`; continue; }
    if (/^\s*\|(.+)\|\s*$/.test(ln) && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1] || '')) {
      closeList(); const cells = (r) => r.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const head = cells(ln); i += 2; let rows = '';
      while (i < lines.length && /^\s*\|(.+)\|\s*$/.test(lines[i])) { rows += '<tr>' + cells(lines[i]).map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>'; i++; }
      out += `<table class="md-table"><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>`; continue;
    }
    if (/^\s*(---|\*\*\*|___)\s*$/.test(ln)) { closeList(); out += '<hr>'; i++; continue; }
    let m;
    if ((m = ln.match(/^(#{1,6})\s+(.*)$/))) { closeList(); const n = m[1].length; out += `<h${n}>${inline(m[2])}</h${n}>`; i++; continue; }
    if ((m = ln.match(/^\s*[-*+]\s+(.*)$/))) { if (list !== 'ul') { closeList(); list = 'ul'; out += '<ul>'; } out += `<li>${inline(m[1])}</li>`; i++; continue; }
    if ((m = ln.match(/^\s*\d+[.)]\s+(.*)$/))) { if (list !== 'ol') { closeList(); list = 'ol'; out += '<ol>'; } out += `<li>${inline(m[1])}</li>`; i++; continue; }
    if (/^\s*$/.test(ln)) { closeList(); i++; continue; }
    closeList(); out += `<p>${inline(ln)}</p>`; i++;
  }
  closeList();
  return out;
}

// ---------- guided tour (vanilla, no deps) — steps: {sel,title,body} ----------
function startTour(steps, key = 'tourSeen') {
  steps = (steps || []).filter((s) => el(s.sel));
  if (!steps.length) { toast('Nothing to tour on this page.', 'info'); return; }
  let i = 0;
  const lay = $(`<div id="tourlay"><div class="tour-spot"></div><div class="tour-pop"></div></div>`);
  document.body.appendChild(lay);
  const spot = lay.querySelector('.tour-spot'), pop = lay.querySelector('.tour-pop');
  const end = () => { document.removeEventListener('keydown', onKey); lay.remove(); try { localStorage.setItem(key, '1'); } catch {} };
  const show = () => {
    const s = steps[i], t = el(s.sel);
    if (!t) { i++; return i < steps.length ? show() : end(); }
    t.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => {
      const r = t.getBoundingClientRect(), pad = 8;
      spot.style.cssText = `left:${r.left - pad}px;top:${r.top - pad}px;width:${r.width + pad * 2}px;height:${r.height + pad * 2}px`;
      pop.innerHTML = `<div class="text-[11px] uppercase tracking-wider text-slate-500 mb-1">${i + 1} / ${steps.length}</div>
        <div class="font-semibold text-sm mb-1">${esc(s.title)}</div>
        <div class="text-xs text-slate-400 leading-relaxed mb-3">${esc(s.body)}</div>
        <div class="flex items-center gap-2">${i > 0 ? '<button class="tr-back btn btn-ghost text-xs">Back</button>' : ''}<button class="tr-skip btn btn-ghost text-xs text-slate-500">Skip</button><button class="tr-next btn btn-primary text-xs ml-auto">${i < steps.length - 1 ? 'Next' : 'Done'}</button></div>`;
      const pw = 300, ph = pop.offsetHeight || 160;
      const left = Math.min(Math.max(8, r.left), window.innerWidth - pw - 8);
      let top = r.bottom + 12; if (top + ph > window.innerHeight - 8) top = Math.max(8, r.top - ph - 12);
      pop.style.cssText = `width:${pw}px;left:${left}px;top:${top}px`;
      const bk = pop.querySelector('.tr-back'); if (bk) bk.onclick = () => { i--; show(); };
      pop.querySelector('.tr-skip').onclick = end;
      pop.querySelector('.tr-next').onclick = () => { if (i < steps.length - 1) { i++; show(); } else end(); };
    }, 240);
  };
  const onKey = (e) => { if (e.key === 'Escape') end(); else if (e.key === 'ArrowRight' || e.key === 'Enter') { if (i < steps.length - 1) { i++; show(); } else end(); } else if (e.key === 'ArrowLeft' && i > 0) { i--; show(); } };
  document.addEventListener('keydown', onKey);
  show();
}
// First-run nudge (bottom-right), suppressed after the key is set.
function tourPrompt(key, label, onStart) {
  try { if (localStorage.getItem(key)) return; } catch { return; }
  if (el('#tourprompt')) return;
  const b = $(`<div id="tourprompt" class="fixed bottom-4 right-4 z-[60] surface p-4 w-72 shadow-card">
    <div class="text-sm font-semibold mb-1">👋 New here?</div>
    <div class="text-xs text-slate-400 mb-3">Take a 60-second tour of ${esc(label)}.</div>
    <div class="flex gap-2"><button id="tp-start" class="btn btn-primary text-xs">Start tour</button><button id="tp-skip" class="btn btn-ghost text-xs ml-auto">Skip</button></div>
  </div>`);
  document.body.appendChild(b);
  el('#tp-start').onclick = () => { b.remove(); onStart(); };
  el('#tp-skip').onclick = () => { try { localStorage.setItem(key, '1'); } catch {} b.remove(); };
}
