// Build Helper frontend — source-faithful UI primitives shared by the views. Reuses kit globals
// (badge/relTime/fmtBytes/esc/pill/toast/stripAnsi from kit-dom, ICON from kit-icons) and only adds
// what the kit lacks: 4 icon glyphs, the env pipeline builder + color maps, the 3 brand logos the
// App Setup modal draws, and the Outputs warning map. Verbatim from the source design.
'use strict';

window.$ = (h) => { const t = document.createElement('template'); t.innerHTML = h.trim(); return t.content.firstChild; };
// No-auth kit: every capability is allowed; nothing is hidden.
window.bhCan = () => true; window.applyBhCaps = () => {};
window.ENVS = ['dev', 'demo', 'qa', 'prod'];
// Call-time aliases so source-verbatim markup handlers resolve to our views.
window.openProject = (p) => V.project(p);
window.showSecurity = () => window.open('http://localhost:4110', '_blank');
// Source-format duration (overrides state.js's terser one so every view reads the same).
window.fmtDur = (ms) => { if (!ms) return '—'; const s = Math.round(ms / 1000); return s < 60 ? s + 's' : Math.floor(s / 60) + 'm' + String(s % 60).padStart(2, '0') + 's'; };

// --- icon glyphs missing from kit-icons (same 18px stroke factory the kit uses) ---
const _svg = (p) => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
window.ICONX = Object.assign(ICON, {
  key: _svg('<circle cx="8" cy="15" r="4"/><path d="M10.8 12.2 20 3"/><path d="m16 7 3 3"/><path d="m14 9 2 2"/>'),
  layers: _svg('<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>'),
  chevron: _svg('<path d="m9 6 6 6-6 6"/>'),
  gitBranch: _svg('<circle cx="6" cy="6" r="2.4"/><circle cx="6" cy="18" r="2.4"/><circle cx="17" cy="8" r="2.4"/><path d="M6 8.4v7.2"/><path d="M17 10.4A6 6 0 0 1 11 16H8.4"/>'),
});

// --- env → color, station colors, and the DEV→PROD pipeline builder (source-verbatim) ---
window.ENV_HEX = { dev: 'var(--blue)', demo: 'var(--violet)', qa: 'var(--warn)', prod: 'var(--aqua)' };
window.COLOR_HEX = { sky: '#4C93F0', blue: '#4C93F0', violet: '#9E8CF2', amber: '#F5B342', emerald: '#34C77B', rose: '#F0556A', cyan: '#22B5C7', fuchsia: '#D26BF0', slate: '#64748b' };
window.stnHex = (it) => it.hex || COLOR_HEX[it.color] || ENV_HEX[it.key] || '#64748b';
window.pipelineHtml = function (items, curKey, mini) {
  if (!items || !items.length) return '';
  return `<div class="pipeline">${items.map((it, i) => {
    const c = stnHex(it);
    const rail = i < items.length - 1 ? `<span class="rail" style="--a:${c};--b:${stnHex(items[i + 1])}"></span>` : '';
    return `<button type="button" class="station${it.key === curKey ? ' cur' : ''}" data-pipe="${esc(it.key)}" style="--stn:${c}" title="${esc((it.label || it.key) + (it.key === curKey ? ' · current' : ''))}"><span class="node"></span>${mini ? '' : `<span class="lbl">${esc(it.label || it.key)}</span>`}</button>${rail}`;
  }).join('')}</div>`;
};

// --- Outputs cards: amber warning shown when a target isn't configured (source-verbatim) ---
window.CONNECT = {
  onedrive: 'OneDrive not connected — connect it in Settings',
  testflight: 'No Apple account — add it in App Setup → Apple',
  firebase: 'No Firebase App ID — set it in App Setup → Firebase',
  play: 'No Google Play account — add it in App Setup → Google Play',
};

// --- brand logos the App Setup cards draw (kit CX_LOGO only has the 6 trackers) ---
window.CXLOGO = {
  firebase: '<svg width="22" height="22" viewBox="0 0 24 24"><path d="M4.8 17.7 8.1 4.1c.17-.7 1.12-.8 1.43-.15l1.86 3.5-2.2 4.1z" fill="#FFA000"/><path d="M4.8 17.7 14.2 4.2c.35-.5 1.14-.33 1.27.27L19.2 17.7l-6.4 3.6a1.7 1.7 0 0 1-1.66 0z" fill="#FFCA28"/></svg>',
  apple: '<svg width="22" height="22" viewBox="0 0 24 24"><path fill="#e7eaf1" d="M17.05 12.54c-.03-3.06 2.5-4.53 2.61-4.6-1.42-2.08-3.63-2.36-4.42-2.4-1.88-.19-3.67 1.11-4.62 1.11-.95 0-2.42-1.08-3.98-1.05-2.05.03-3.94 1.19-4.99 3.03-2.13 3.69-.54 9.15 1.52 12.15 1.01 1.47 2.21 3.12 3.78 3.06 1.52-.06 2.09-.98 3.93-.98 1.83 0 2.35.98 3.95.95 1.63-.03 2.66-1.5 3.66-2.98 1.15-1.71 1.62-3.37 1.65-3.46-.04-.02-3.17-1.22-3.2-4.83zM14.11 4.13c.84-1.02 1.4-2.43 1.25-3.84-1.21.05-2.67.81-3.53 1.82-.77.9-1.45 2.34-1.27 3.72 1.35.1 2.72-.69 3.55-1.7z"/></svg>',
  play: '<svg width="22" height="22" viewBox="0 0 24 24"><path d="M3.6 2.4 13 12 3.6 21.6a1 1 0 0 1-.6-.92V3.32a1 1 0 0 1 .6-.92z" fill="#00C3FF"/><path d="M13 12 3.6 2.4a1 1 0 0 1 1.02.06L16.6 9.3z" fill="#00E676"/><path d="m16.6 14.7-12 6.84a1 1 0 0 1-1.02.06L13 12z" fill="#FF3D00"/><path d="m16.6 9.3 3.9 2.2a1 1 0 0 1 0 1.74l-3.9 2.2L13 12z" fill="#FFCE00"/></svg>',
};

// --- floating tooltip driven by any [data-tip] element (charts, station nodes) ---
document.addEventListener('mousemove', (e) => {
  const t = el('#tt'); if (!t) return;
  const m = e.target.closest && e.target.closest('[data-tip]');
  if (!m) { t.style.display = 'none'; return; }
  t.innerHTML = m.getAttribute('data-tip'); t.style.display = 'block';
  t.style.left = Math.min(e.clientX + 14, innerWidth - 250) + 'px';
  t.style.top = Math.min(e.clientY + 14, innerHeight - 60) + 'px';
});
