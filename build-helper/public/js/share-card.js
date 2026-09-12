// Build Helper frontend — the branded build card drawn on <canvas> (source-verbatim). Per-env panels
// with platform logo badges, filename chips, status pills, and same-origin QR codes. Plus offerShare
// (a Share button under the log) and postTeamCards (silent team-log upload).
'use strict';

const CARD = { bgTop: '#0f1626', bgBot: '#0b0f19', panel: '#131a2a', panelInner: '#0d1420', edge: '#1f2a44', ink: '#e7eaf1', ink2: '#9aa4b8', muted: '#8792ab', mono: '#cfe3ff', good: '#7dd3a8', bad: '#f87171', env: { dev: '#3987e5', demo: '#9085e9', qa: '#fab219', prod: '#199e70' }, envFallback: '#64748b' };

function offerShare(records) {
  const box = el('#log'); if (!box) return;
  const bar = $(`<div class="mt-2"><button class="rounded-lg bg-sky-500 text-white px-4 py-2 text-sm font-semibold">📤 Share build (${records.length} env)</button></div>`);
  bar.querySelector('button').onclick = () => showShareCard(records);
  box.appendChild(bar); box.scrollTop = box.scrollHeight;
}
const primaryLink = (r) => (r.testflight && r.testflight.tfLink) || r.onedriveUrl || (r.artifacts || []).map((a) => a.onedriveUrl).find(Boolean) || '';
const qrUrl = (r) => (r.artifacts || []).map((a) => a.onedriveUrl).find(Boolean) || r.onedriveUrl || '';
const artOf = (name) => { const m = /\.(apk|aab|ipa)$/i.exec(name || ''); return m ? m[1].toLowerCase() : ''; };
const truncText = (ctx, s, maxW) => { s = String(s); if (ctx.measureText(s).width <= maxW) return s; while (s.length > 1 && ctx.measureText(s + '…').width > maxW) s = s.slice(0, -1); return s + '…'; };
function wrapText(ctx, text, maxW) { const out = []; for (const para of String(text).split('\n')) { let line = ''; for (const w of para.split(' ')) { const test = line ? line + ' ' + w : w; if (ctx.measureText(test).width > maxW && line) { out.push(line); line = w; } else line = test; } out.push(line); } return out; }

function envPanels(r) {
  const arts = (r.artifacts || []).map((a) => typeof a === 'string' ? { art: artOf(a), name: a, onedriveUrl: null } : a);
  const android = arts.find((a) => a.art === 'apk') || arts.find((a) => a.art === 'aab'), ios = arts.find((a) => a.art === 'ipa'), tag = (a) => ((a && a.art) || '').toUpperCase();
  const out = [];
  if (android) out.push({ kind: 'android', logo: 'android', label: 'ANDROID', col: '#3ddc84', tag: tag(android), name: android.name, link: android.onedriveUrl || r.onedriveUrl || '', hint: 'scan to install' });
  if (ios) out.push({ kind: 'ios', logo: 'apple', label: 'iOS · TESTFLIGHT', col: '#3987e5', tag: 'IPA', name: ios.name, link: (r.testflight && r.testflight.tfLink) || '', hint: 'scan to open in TestFlight', state: r.testflight && !r.testflight.error ? (r.testflight.state || 'processing') : (r.testflight ? 'failed' : '') });
  if (!out.length && arts[0]) out.push({ kind: 'file', logo: null, label: 'ARTIFACT', col: '#64748b', tag: tag(arts[0]), name: arts[0].name, link: arts[0].onedriveUrl || r.onedriveUrl || '', hint: 'scan to open' });
  return out;
}
const LOGO_SVG = {
  apple: 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#e7eaf1" d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.67.91-1.377 0-2.332-1.26-3.428-2.8-1.287-1.82-2.323-4.63-2.323-7.28 0-4.28 2.797-6.55 5.552-6.55 1.448 0 2.675.95 3.6.95.865 0 2.222-1.01 3.902-1.01.613 0 2.886.06 4.374 2.19-.13.09-2.383 1.37-2.383 4.19 0 3.26 2.854 4.42 2.955 4.45z"/></svg>'),
  android: 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#3ddc84" d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85-.29-.15-.65-.06-.83.22l-1.88 3.24c-1.44-.66-3.06-1.02-4.79-1.02s-3.35.36-4.79 1.02L4.99 5.67c-.18-.28-.54-.37-.83-.22-.3.16-.42.54-.26.85L5.64 9.48C2.34 11.11.09 14.36 0 18h24c-.09-3.64-2.34-6.89-5.64-8.52zM7 15.25c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25 1.25.56 1.25 1.25-.56 1.25-1.25 1.25zm10 0c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25 1.25.56 1.25 1.25-.56 1.25-1.25 1.25z"/></svg>'),
};
const _logoCache = {};
async function loadLogo(kind) { if (!kind) return null; if (kind in _logoCache) return _logoCache[kind]; try { _logoCache[kind] = await loadImg(LOGO_SVG[kind]); } catch { _logoCache[kind] = null; } return _logoCache[kind]; }
const loadImg = (src) => new Promise((res, rej) => { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => res(im); im.onerror = rej; im.src = src; });
const roundRect = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); };
const roundImg = (ctx, img, x, y, s, r) => { ctx.save(); roundRect(ctx, x, y, s, s, r); ctx.clip(); ctx.drawImage(img, x, y, s, s); ctx.restore(); };

async function drawShareCard(records) {
  const W = 1080, pad = 48, IN = 24, GAP = 20, QR = 110, HEADH = 150, HH = 78;
  const c = document.createElement('canvas'), ctx = c.getContext('2d'), per = records.map((r) => envPanels(r));
  const qrs = await Promise.all(per.map((panels) => Promise.all(panels.map(async (p) => { if (!p.link) return null; try { return await loadImg('/api/qr?size=300&data=' + encodeURIComponent(p.link)); } catch { return null; } }))));
  const logos = await Promise.all(per.map((panels) => Promise.all(panels.map((p) => loadLogo(p.logo)))));
  const panelH = (p, hasQR) => { const ch = 16 + 36 + 38 + 12 + (p.state ? 34 : 0) + (p.link ? 26 : 0), qh = hasQR ? 16 + QR + 4 + 14 + 16 : 0; return Math.max(ch, qh, 96); };
  const blockH = per.map((panels, i) => { const hs = panels.map((p, j) => panelH(p, !!qrs[i][j])); return HH + (hs.length ? Math.max(...hs) : 96) + 20; });
  const H = HEADH + blockH.reduce((s, h) => s + h + 18, 0) + 56;
  c.width = W; c.height = H;
  const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, CARD.bgTop); g.addColorStop(1, CARD.bgBot); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const app = records[0].project;
  try { const img = await loadImg('/api/icon?path=' + encodeURIComponent(records[0].path)); roundImg(ctx, img, pad, 40, 64, 16); } catch { ctx.fillStyle = CARD.edge; roundRect(ctx, pad, 40, 64, 64, 16); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = '700 26px system-ui'; ctx.fillText(app.slice(0, 2).toUpperCase(), pad + 16, 80); }
  ctx.fillStyle = CARD.ink; ctx.font = '700 34px system-ui'; ctx.fillText(app, pad + 84, 72);
  ctx.fillStyle = CARD.muted; ctx.font = '400 18px system-ui'; ctx.fillText('Build summary · ' + new Date(records[0].time).toLocaleString(), pad + 84, 100);
  ctx.strokeStyle = CARD.edge; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad, 128); ctx.lineTo(W - pad, 128); ctx.stroke();
  let y = HEADH;
  records.forEach((r, i) => {
    const panels = per[i], h = blockH[i], col = CARD.env[r.env] || CARD.envFallback;
    roundRect(ctx, pad, y, W - 2 * pad, h, 18); ctx.fillStyle = CARD.panel; ctx.fill(); ctx.strokeStyle = CARD.edge; ctx.lineWidth = 1; ctx.stroke();
    ctx.save(); roundRect(ctx, pad, y, W - 2 * pad, h, 18); ctx.clip(); ctx.fillStyle = col; ctx.fillRect(pad, y, 5, h); ctx.restore();
    ctx.font = '700 16px system-ui'; const et = r.env.toUpperCase(), ew = ctx.measureText(et).width + 28;
    ctx.fillStyle = col + '26'; roundRect(ctx, pad + IN, y + 20, ew, 32, 16); ctx.fill(); ctx.fillStyle = col; ctx.fillText(et, pad + IN + 14, y + 41);
    ctx.fillStyle = CARD.ink; ctx.font = '800 30px system-ui'; ctx.fillText(r.version, pad + IN + ew + 16, y + 46);
    ctx.font = '600 15px system-ui'; const br = '⎇ ' + (r.branch || '—'), bw = ctx.measureText(br).width + 24;
    ctx.fillStyle = CARD.edge; roundRect(ctx, W - pad - IN - bw, y + 22, bw, 28, 14); ctx.fill(); ctx.fillStyle = CARD.ink2; ctx.fillText(br, W - pad - IN - bw + 12, y + 41);
    const area = W - 2 * pad - 2 * IN, n = panels.length || 1, pw = n > 1 ? (area - GAP) / 2 : area;
    const hs = panels.map((p, j) => panelH(p, !!qrs[i][j])), ph = hs.length ? Math.max(...hs) : 96;
    panels.forEach((p, j) => {
      const px = pad + IN + j * (pw + GAP), py = y + HH, q = qrs[i][j];
      roundRect(ctx, px, py, pw, ph, 14); ctx.fillStyle = CARD.panelInner; ctx.fill(); ctx.strokeStyle = p.col + '55'; ctx.lineWidth = 1.5; ctx.stroke();
      const textR = px + pw - 18 - (q ? QR + 18 : 0); let ty = py + 16, lx = px + 18; const lg = logos[i][j];
      if (lg) { const S = 22; ctx.fillStyle = p.col + '22'; roundRect(ctx, lx - 6, ty, S + 12, S + 12, 8); ctx.fill(); ctx.drawImage(lg, lx, ty + 5, S, S); lx += S + 14; }
      ctx.fillStyle = p.col; ctx.font = '700 16px system-ui'; ctx.textBaseline = 'middle'; ctx.fillText(p.label, lx, ty + 16); ctx.textBaseline = 'alphabetic'; ty += 36;
      const chipX = px + 18, cp = 8, tag = p.tag || ''; ctx.font = '700 12px system-ui'; const tagW = tag ? ctx.measureText(tag).width + 16 : 0, nameX = chipX + cp + (tag ? tagW + 8 : 0);
      ctx.font = '500 15px ui-monospace, Menlo, monospace'; const nm = truncText(ctx, p.name, textR - nameX - cp), chipW = Math.min((tag ? tagW + 8 : 0) + ctx.measureText(nm).width + cp * 2, textR - chipX);
      ctx.fillStyle = '#ffffff0d'; roundRect(ctx, chipX, ty, chipW, 30, 8); ctx.fill();
      if (tag) { ctx.fillStyle = p.col + '26'; roundRect(ctx, chipX + cp, ty + 6, tagW, 18, 6); ctx.fill(); ctx.fillStyle = p.col; ctx.font = '700 12px system-ui'; ctx.textBaseline = 'middle'; ctx.fillText(tag, chipX + cp + 8, ty + 16); ctx.textBaseline = 'alphabetic'; }
      ctx.fillStyle = CARD.mono; ctx.font = '500 15px ui-monospace, Menlo, monospace'; ctx.textBaseline = 'middle'; ctx.fillText(nm, nameX, ty + 16); ctx.textBaseline = 'alphabetic'; ty += 38;
      if (p.state) { const sc = p.state === 'failed' ? CARD.bad : CARD.good; ctx.font = '600 14px system-ui'; const sw = ctx.measureText(p.state).width + 34; ctx.fillStyle = sc + '22'; roundRect(ctx, px + 18, ty, sw, 26, 13); ctx.fill(); ctx.fillStyle = sc; ctx.beginPath(); ctx.arc(px + 18 + 16, ty + 13, 4, 0, 7); ctx.fill(); ctx.textBaseline = 'middle'; ctx.fillText(p.state, px + 18 + 26, ty + 13); ctx.textBaseline = 'alphabetic'; ty += 34; }
      if (p.link) { ctx.fillStyle = CARD.muted; ctx.font = '400 13px system-ui'; ctx.fillText(truncText(ctx, p.link, textR - (px + 18)), px + 18, ty + 13); }
      if (q) { const qx = px + pw - 18 - QR, qy = py + (ph - QR - 18) / 2; ctx.fillStyle = '#fff'; roundRect(ctx, qx - 8, qy - 8, QR + 16, QR + 16, 10); ctx.fill(); ctx.drawImage(q, qx, qy, QR, QR); ctx.fillStyle = CARD.muted; ctx.font = '400 12px system-ui'; ctx.textAlign = 'center'; ctx.fillText(p.hint, qx + QR / 2, qy + QR + 22); ctx.textAlign = 'left'; }
    });
    y += h + 18;
  });
  ctx.strokeStyle = CARD.edge; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad, H - 44); ctx.lineTo(W - pad, H - 44); ctx.stroke();
  ctx.fillStyle = CARD.muted; ctx.font = '400 16px system-ui'; ctx.fillText('Generated with Batta Build Helper', pad, H - 18);
  return c;
}

// Auto-upload each env's card to the team log after a build (best-effort, silent).
async function postTeamCards(records) {
  for (const r of records) { if (r.buildOk === false) continue; try { const canvas = await drawShareCard([r]); postJson('/api/share/card', { project: r.repo || r.project, filename: `${(r.repo || r.project)}-${(r.version || '').replace(/[^\w.+-]/g, '')}.png`, pngBase64: canvas.toDataURL('image/png') }).catch(() => {}); } catch {} }
}
