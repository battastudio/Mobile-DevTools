// Build Helper frontend — hand-rolled inline-SVG charts (window.CH). Zero chart libs: each builder
// takes plain build records and returns an <svg> string that inherits kit.css color tokens
// (var(--good)/var(--crit)/var(--brand) and per-env var(--dev|demo|qa|prod)). Pure functions.
'use strict';

const _day = (t) => new Date(t).toISOString().slice(0, 10);
const _envVar = (e) => `var(--${['dev', 'demo', 'qa', 'prod'].includes(e) ? e : 'brand'})`;
const _empty = (h, msg) => `<div class="text-[11px] text-slate-500 grid place-items-center" style="height:${h}px">${msg || 'No data yet.'}</div>`;

// Group builds into the last N day-buckets (oldest→newest), each with its records.
function bucketDays(builds, days) {
  const n = days || 14;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const out = [];
  for (let i = n - 1; i >= 0; i--) { const d = new Date(today - i * 864e5); out.push({ key: d.toISOString().slice(0, 10), label: d.toISOString().slice(5, 10), items: [] }); }
  const idx = Object.fromEntries(out.map((b, i) => [b.key, i]));
  for (const b of builds || []) { const k = _day(b.time); if (k in idx) out[idx[k]].items.push(b); }
  return out;
}

window.CH = {
  bucketDays,
  // Builds per day, stacked ok (green) over failed (red).
  stackedColumns(builds, days) {
    const bk = bucketDays(builds, days || 14);
    const max = Math.max(1, ...bk.map((b) => b.items.length));
    const W = 640, H = 130, pad = 18, bw = (W - pad * 2) / bk.length;
    if (!(builds || []).length) return _empty(H);
    const cols = bk.map((b, i) => {
      const ok = b.items.filter((x) => x.buildOk !== false).length, fail = b.items.length - ok;
      const x = pad + i * bw + bw * 0.15, w = bw * 0.7;
      const okH = (ok / max) * (H - pad * 2), failH = (fail / max) * (H - pad * 2);
      const okY = H - pad - okH, failY = okY - failH;
      return `<rect x="${x.toFixed(1)}" y="${okY.toFixed(1)}" width="${w.toFixed(1)}" height="${okH.toFixed(1)}" fill="var(--good)" rx="2"/>` +
        (fail ? `<rect x="${x.toFixed(1)}" y="${failY.toFixed(1)}" width="${w.toFixed(1)}" height="${failH.toFixed(1)}" fill="var(--crit)" rx="2"/>` : '') +
        (i % 2 === 0 ? `<text x="${(x + w / 2).toFixed(1)}" y="${H - 4}" font-size="8" fill="var(--muted)" text-anchor="middle">${b.label}</text>` : '');
    }).join('');
    return `<svg viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="none" role="img">${cols}</svg>`;
  },
  // Average build duration (seconds) per day as a line.
  line(builds, days) {
    const bk = bucketDays((builds || []).filter((b) => b.durationMs), days || 14);
    const avg = bk.map((b) => b.items.length ? b.items.reduce((s, x) => s + (x.durationMs || 0), 0) / b.items.length / 1000 : 0);
    const max = Math.max(1, ...avg), W = 640, H = 130, pad = 18;
    if (!avg.some((v) => v)) return _empty(H, 'No timed builds yet.');
    const pts = avg.map((v, i) => `${(pad + i * ((W - pad * 2) / (bk.length - 1 || 1))).toFixed(1)},${(H - pad - (v / max) * (H - pad * 2)).toFixed(1)}`);
    const dots = pts.map((p) => { const [x, y] = p.split(','); return `<circle cx="${x}" cy="${y}" r="2.2" fill="var(--brand)"/>`; }).join('');
    return `<svg viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="none" role="img"><polyline points="${pts.join(' ')}" fill="none" stroke="var(--brand)" stroke-width="2"/>${dots}<text x="${pad}" y="12" font-size="8" fill="var(--muted)">peak ${Math.round(max)}s</text></svg>`;
  },
  // Upload health per target: ok vs failed counts as horizontal bars.
  hbars(builds) {
    const targets = ['onedrive', 'firebase', 'play', 'testflight'];
    const rows = targets.map((t) => { let ok = 0, fail = 0; for (const b of builds || []) { const v = (b.upload || {})[t]; if (v === 'ok') ok++; else if (v === 'failed') fail++; } return { t, ok, fail }; }).filter((r) => r.ok || r.fail);
    if (!rows.length) return _empty(96, 'No uploads yet.');
    const max = Math.max(1, ...rows.map((r) => r.ok + r.fail)), W = 640, rh = 22;
    const bars = rows.map((r, i) => {
      const y = i * rh + 4, okW = (r.ok / max) * (W - 160), failW = (r.fail / max) * (W - 160);
      return `<text x="0" y="${y + 12}" font-size="11" fill="var(--ink)">${r.t}</text>` +
        `<rect x="90" y="${y}" width="${okW.toFixed(1)}" height="14" fill="var(--good)" rx="3"/>` +
        `<rect x="${(90 + okW).toFixed(1)}" y="${y}" width="${failW.toFixed(1)}" height="14" fill="var(--crit)" rx="3"/>` +
        `<text x="${(96 + okW + failW).toFixed(1)}" y="${y + 12}" font-size="10" fill="var(--muted)">${r.ok}✓ ${r.fail}✗</text>`;
    }).join('');
    return `<svg viewBox="0 0 ${W} ${rows.length * rh + 8}" width="100%" role="img">${bars}</svg>`;
  },
  // Builds per environment as colored bars.
  envSplit(builds) {
    const by = {}; for (const b of builds || []) if (b.env) by[b.env] = (by[b.env] || 0) + 1;
    const entries = Object.entries(by); if (!entries.length) return _empty(96);
    const max = Math.max(1, ...entries.map(([, n]) => n)), W = 640, rh = 22;
    const bars = entries.map(([e, n], i) => { const y = i * rh + 4, w = (n / max) * (W - 140); return `<text x="0" y="${y + 12}" font-size="11" fill="var(--ink)">${e}</text><rect x="70" y="${y}" width="${w.toFixed(1)}" height="14" rx="3" fill="${_envVar(e)}"/><text x="${(76 + w).toFixed(1)}" y="${y + 12}" font-size="10" fill="var(--muted)">${n}</text>`; }).join('');
    return `<svg viewBox="0 0 ${W} ${entries.length * rh + 8}" width="100%" role="img">${bars}</svg>`;
  },
};
