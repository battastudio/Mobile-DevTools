// Build Helper frontend — reusable HTML-string builders (window.C). Pure functions: state in →
// markup out, no side effects, no event wiring (views do that). Lean on kit.js globals: esc, badge,
// pill, ICON, fmtBytes, relTime, gradeBox.
'use strict';

const _envChip = (e) => badge(esc(e.label || e.key), envColor(e.key)) +
  (e.mode && e.mode !== e.key ? `<span class="text-[10px] text-slate-500 ml-0.5">${esc(e.mode)}</span>` : '');

window.C = {
  // Small colored env pills for an app's environments.
  envChips(app) {
    const es = (app && app.envs) || [];
    return es.length ? `<span class="inline-flex flex-wrap gap-1">${es.map(_envChip).join('')}</span>`
      : '<span class="text-xs text-slate-500">no environments</span>';
  },

  // Green/amber/red status dot.
  dot(state) { const c = { ok: 'good', warn: 'warn', fail: 'crit', busy: 'brand' }[state] || 'muted'; return `<span class="bh-dot" style="background:var(--${c})"></span>`; },

  // KPI strip on the dashboard.
  kpis(d) {
    const b = d.builds || [];
    const ok = b.filter((x) => x.buildOk !== false).length;
    const st = d.storage || {};
    const tile = (label, val, sub) => `<div class="surface p-4"><div class="text-[11px] uppercase tracking-wider text-slate-500">${label}</div><div class="font-display text-2xl font-bold mt-1">${esc(String(val))}</div><div class="text-[11px] text-slate-500 mt-0.5">${sub || ''}</div></div>`;
    return `<div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
      ${tile('Projects', (d.projects || []).length, 'Flutter apps')}
      ${tile('Builds', b.length, `${ok} ok · ${b.length - ok} failed`)}
      ${tile('Artifacts', st.files || 0, fmtBytes(st.totalBytes || 0) + ' on disk')}
      ${tile('Last build', b[0] ? relTime(b[0].time) : '—', b[0] ? esc(b[0].project + ' ' + (b[0].env || '')) : 'nothing yet')}
    </div>`;
  },

  // A project tile for the dashboard grid.
  projectCard(p) {
    const lb = p.lastBuild;
    const health = p.needsConfig ? 'warn' : (p.healthOk ? 'ok' : 'warn');
    const lastHtml = lb ? `<span class="${lb.buildOk ? 'text-emerald-300' : 'text-rose-300'}">${lb.buildOk ? '✓' : '✗'} v${esc(verName(lb.version))}</span> <span class="text-slate-500">· ${esc(lb.env || '')} · ${relTime(lb.time)}</span>`
      : '<span class="text-slate-500">no builds yet</span>';
    return `<button class="bh-card surface p-4 text-left w-full flex flex-col gap-2" data-open="${esc(p.path)}">
      <div class="flex items-center gap-2">
        ${C.dot(health)}
        <span class="font-display font-semibold text-[14px] truncate flex-1">${esc(p.name)}</span>
        ${p.favorite ? '<span class="text-amber-300 text-xs">★</span>' : ''}
        <span class="text-[11px] font-mono text-slate-500">v${esc(verName(p.version))}</span>
      </div>
      ${C.envChips(p)}
      <div class="text-xs mt-0.5">${lastHtml}</div>
      ${p.needsConfig ? '<div class="text-[11px] text-amber-300">needs setup — no env detected</div>' : ''}
    </button>`;
  },

  // One artifact toggle chip for the build form.
  artChip(a, on) {
    return `<button class="bh-art surface px-3 py-2 text-left ${on ? 'on' : ''}" data-art="${a.id}">
      <div class="text-sm font-semibold">${a.label}</div><div class="text-[11px] text-slate-500">${a.hint}</div></button>`;
  },

  // One env row in the build form: checkbox + version name + build number.
  envRow(e, nextNum, baseVer) {
    return `<label class="flex items-center gap-2 py-1.5">
      <input type="checkbox" class="bh-env" data-env="${e.key}" data-num="${nextNum}"/>
      <span class="w-16">${_envChip(e)}</span>
      <input class="field text-xs font-mono w-24 bh-ver" data-env="${e.key}" value="${esc(baseVer)}" title="version name"/>
      <input class="field text-xs font-mono w-16 bh-num" data-env="${e.key}" value="${esc(String(nextNum))}" title="build number"/>
    </label>`;
  },

  // A build history row (used on the project screen + reports).
  buildRow(b) {
    const arts = (b.artifacts || []).map((a) => a.name || a);
    const first = arts[0] ? `/artifact?path=${encodeURIComponent(arts[0].path || '')}` : '';
    const up = Object.entries(b.upload || {}).filter(([, v]) => v === 'ok').map(([k]) => k);
    return `<div class="surface p-3 flex items-center gap-3 text-sm">
      ${C.dot(b.buildOk === false ? 'fail' : 'ok')}
      <div class="min-w-0"><div class="font-mono text-xs truncate">v${esc(verName(b.version))} · ${esc(b.env || '')}</div>
        <div class="text-[11px] text-slate-500">${relTime(b.time)}${b.durationMs ? ' · ' + fmtDur(b.durationMs) : ''}${up.length ? ' · ↑ ' + up.join(', ') : ''}</div></div>
      <div class="ml-auto flex items-center gap-2 shrink-0">
        <span class="text-[11px] text-slate-500">${arts.length} file${arts.length === 1 ? '' : 's'}</span>
      </div>
    </div>`;
  },
};
