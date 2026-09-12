// Build Helper frontend — hand-rolled inline-SVG charts (source-verbatim builders). Pure functions:
// bucketed build records in → <svg> out, inheriting kit.css color tokens (var(--good)/--crit/--blue).
'use strict';

const LABELS = { onedrive: 'OneDrive', firebase: 'Firebase', play: 'Play', testflight: 'TestFlight' };
function dayKey(d) { const t = new Date(d); return t.getFullYear() + '-' + (t.getMonth() + 1) + '-' + t.getDate(); }

function bucketDays(builds, days) {
  days = Math.min(days || 30, 90) || 30;
  const slots = [], idx = {}; const today = new Date(); today.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) { const dt = new Date(today.getTime() - i * 864e5); const k = dayKey(dt); const s = { label: (dt.getMonth() + 1) + '/' + dt.getDate(), ok: 0, fail: 0 }; idx[k] = s; slots.push(s); }
  for (const b of builds) { const s = idx[dayKey(b.time)]; if (s) { if (b.buildOk === false) s.fail++; else s.ok++; } }
  return slots;
}
const chartEmpty = () => `<div class="h-[150px] grid place-items-center text-xs text-slate-500">No data in range.</div>`;

function stackedColumnsSvg(slots) {
  if (!slots.some((s) => s.ok || s.fail)) return chartEmpty();
  const n = slots.length, step = Math.max(6, Math.min(16, 300 / n)), W = n * step, H = 104, base = 86, ph = 72;
  const max = Math.max(1, ...slots.map((s) => s.ok + s.fail)), bw = step * 0.66, off = (step - bw) / 2;
  let bars = '', labs = ''; const sl = Math.ceil(n / 8);
  slots.forEach((s, i) => {
    const x = i * step + off, tip = `${esc(s.label)}<br>ok ${s.ok} · failed ${s.fail}`;
    const okH = s.ok / max * ph, failH = s.fail / max * ph; let y = base;
    if (okH) { y -= okH; bars += `<rect data-tip="${tip}" x="${x}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${okH.toFixed(1)}" rx="1.4" fill="var(--good)"/>`; }
    if (failH) { const fy = y - 2 - failH; bars += `<rect data-tip="${tip}" x="${x}" y="${fy.toFixed(1)}" width="${bw.toFixed(1)}" height="${failH.toFixed(1)}" rx="1.4" fill="var(--crit)"/>`; }
    if (i % sl === 0) labs += `<text x="${(i * step + step / 2).toFixed(1)}" y="100" font-size="6" fill="var(--muted)" text-anchor="middle">${esc(s.label)}</text>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" class="w-full" style="height:150px"><line x1="0" y1="${base}" x2="${W}" y2="${base}" stroke="var(--base)" stroke-width="0.6"/>${bars}${labs}</svg>`;
}

function lineSvg(pts) {
  if (pts.length < 2) return `<div class="h-[150px] grid place-items-center text-xs text-slate-500">Need ≥2 timed builds.</div>`;
  const n = pts.length, W = Math.max(120, n * 12), H = 104, base = 86, ph = 72, max = Math.max(1, ...pts.map((p) => p.ms));
  const X = (i) => (i / (n - 1) * (W - 8) + 4), Y = (v) => base - v / max * ph;
  const poly = pts.map((p, i) => `${X(i).toFixed(1)},${Y(p.ms).toFixed(1)}`).join(' ');
  const dots = pts.map((p, i) => `<circle data-tip="${esc(p.label)}<br>${fmtDur(p.ms)}" cx="${X(i).toFixed(1)}" cy="${Y(p.ms).toFixed(1)}" r="2.6" fill="var(--blue)" stroke="#0b0f19" stroke-width="1.3"/>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="w-full" style="height:150px"><line x1="0" y1="${base}" x2="${W}" y2="${base}" stroke="var(--base)" stroke-width="0.6"/><polyline points="${poly}" fill="none" stroke="var(--blue)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>${dots}</svg>`;
}

function hbarsSvg(items) {
  if (!items.length) return chartEmpty();
  const max = Math.max(1, ...items.map((i) => i.count)), rowH = 22, W = 100, H = items.length * rowH;
  let rows = ''; items.forEach((it, i) => {
    const y = i * rowH + 4, w = Math.max(0.5, it.count / max * (W - 40));
    rows += `<text x="0" y="${y + 9}" font-size="7" fill="var(--ink2)">${esc(it.name)}</text>` +
      `<rect data-tip="${esc(it.name)}: ${it.count}" x="26" y="${y}" width="${w.toFixed(1)}" height="12" rx="2.5" fill="${it.color || 'var(--blue)'}"/>` +
      `<text x="${(26 + w + 2).toFixed(1)}" y="${y + 9}" font-size="7" fill="var(--muted)">${it.count}</text>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" class="w-full" style="height:${Math.max(56, H + 4)}px">${rows}</svg>`;
}

function uploadTargetsSvg(builds) {
  const targets = ['onedrive', 'firebase', 'play', 'testflight'];
  const rows = targets.map((t) => { let ok = 0, fail = 0; for (const b of builds) { const v = (b.upload || {})[t]; if (v === 'ok') ok++; else if (v === 'failed') fail++; } return { t, ok, fail }; }).filter((r) => r.ok || r.fail);
  if (!rows.length) return `<div class="h-[100px] grid place-items-center text-xs text-slate-500">No uploads in range.</div>`;
  const max = Math.max(1, ...rows.map((r) => r.ok + r.fail)), rowH = 24, W = 100, H = rows.length * rowH;
  let out = ''; rows.forEach((r, i) => {
    const y = i * rowH + 5, okW = r.ok / max * (W - 42), failW = r.fail / max * (W - 42);
    out += `<text x="0" y="${y + 9}" font-size="7" fill="var(--ink2)">${LABELS[r.t]}</text>`;
    let x = 34; if (okW) { out += `<rect data-tip="${LABELS[r.t]} ok: ${r.ok}" x="${x}" y="${y}" width="${okW.toFixed(1)}" height="12" rx="2" fill="var(--good)"/>`; x += okW + 1.2; }
    if (failW) { out += `<rect data-tip="${LABELS[r.t]} failed: ${r.fail}" x="${x}" y="${y}" width="${failW.toFixed(1)}" height="12" rx="2" fill="var(--crit)"/>`; }
  });
  return `<svg viewBox="0 0 ${W} ${H}" class="w-full" style="height:${Math.max(56, H + 4)}px">${out}</svg>`;
}
