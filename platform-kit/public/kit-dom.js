// platform-kit shared frontend core — every Mobile DevTools app loads this before its own /js/app.js.
// Generalized from build-helper/core.js: DOM + toast + icons + modal + SSE + a PARAMETERIZED topnav.
const $ = (h) => { const t = document.createElement('template'); t.innerHTML = h.trim(); return t.content.firstChild; };

// ---- theme: light/dark, persisted in localStorage. Default dark. Applied ASAP to limit flash. ----
const THEME_ICON = {
  sun: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19"/></svg>',
  moon: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
};
function applyTheme(t) {
  let saved = null; try { saved = localStorage.getItem('theme'); } catch {}
  const m = t || saved || 'dark';
  document.documentElement.setAttribute('data-theme', m);
  const btn = document.getElementById('themebtn'); if (btn) btn.innerHTML = m === 'light' ? THEME_ICON.moon : THEME_ICON.sun;
  return m;
}
function toggleTheme() {
  const next = (document.documentElement.getAttribute('data-theme') || 'dark') === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem('theme', next); } catch {}
  return applyTheme(next);
}
// Universal floating toggle so every tool gets light/dark with zero per-tool wiring.
function mountThemeToggle() {
  if (document.getElementById('themebtn')) return;
  const cur = document.documentElement.getAttribute('data-theme') || 'dark';
  const b = $(`<button id="themebtn" title="Toggle light / dark" aria-label="Toggle theme" class="btn btn-secondary" style="position:fixed;bottom:16px;left:16px;z-index:55;width:38px;height:38px;padding:0;border-radius:11px">${cur === 'light' ? THEME_ICON.moon : THEME_ICON.sun}</button>`);
  b.onclick = toggleTheme; document.body.appendChild(b);
}
applyTheme();
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountThemeToggle); else mountThemeToggle();
const el = (sel) => document.querySelector(sel);
const esc = (s) => (s == null ? '' : String(s)).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function badge(text, color) { return `<span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold tracking-wide uppercase bg-${color}-500/12 text-${color}-300 ring-1 ring-inset ring-${color}-500/25">${text}</span>`; }
function pill(ok, on = 'connected', off = 'not set') { return ok ? `<span class="status ok">${on}</span>` : `<span class="status off">${off}</span>`; }
function fmtBytes(n) { return n >= 1e6 ? (n / 1e6).toFixed(1) + ' MB' : (n / 1e3).toFixed(0) + ' KB'; }
function stripAnsi(s) { return String(s).replace(/\x1b\[[0-9;]*m/g, ''); }
function relTime(t) { const s = (Date.now() - new Date(t)) / 1000; if (isNaN(s)) return ''; if (s < 60) return 'just now'; if (s < 3600) return Math.floor(s / 60) + 'm ago'; if (s < 86400) return Math.floor(s / 3600) + 'h ago'; return Math.floor(s / 86400) + 'd ago'; }

function toast(msg, type = 'info') {
  const c = { info: 'sky', ok: 'emerald', warn: 'amber', err: 'rose' }[type] || 'sky';
  const box = el('#toasts'); if (!box) { console.log(type, msg); return; }
  const t = $(`<div class="rounded-xl border border-${c}-500/30 bg-raised/95 backdrop-blur border-l-2 border-l-${c}-400 text-${c}-100 text-sm px-4 py-3 shadow-card">${esc(msg)}</div>`);
  box.appendChild(t);
  setTimeout(() => { t.style.transition = 'opacity .4s'; t.style.opacity = '0'; setTimeout(() => t.remove(), 400); }, 4200);
}
