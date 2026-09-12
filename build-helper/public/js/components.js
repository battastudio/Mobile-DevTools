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

  // The project-sources manager: scan roots + pinned projects + recursive toggle + suggestions.
  sourcesPanel(BH, suggest) {
    const s = BH.sources || { roots: [], pinned: [], recursive: false };
    const row = (val, kind) => `<div class="flex items-center gap-2 py-1">
      <span class="text-[12px] font-mono truncate flex-1" title="${esc(val)}">${esc(val)}</span>
      <button class="btn btn-ghost text-[11px] !px-1.5 !py-0.5 [&>svg]:w-3.5 [&>svg]:h-3.5" data-reveal="${esc(val)}" title="Reveal in Finder">${ICON.folder}</button>
      <button class="btn btn-ghost text-[11px] !px-1.5 !py-0.5 text-rose-300" data-rm="${esc(val)}" data-kind="${kind}" title="Remove">✕</button>
    </div>`;
    const list = (arr, kind, empty) => arr.length ? arr.map((v) => row(v, kind)).join('') : `<div class="text-[11px] text-slate-500 py-1">${empty}</div>`;
    const sugg = (suggest || []).filter((p) => !s.roots.includes(p));
    return `<div class="surface p-4 mb-4">
      <div class="flex items-center gap-2 mb-2">
        <div class="eyebrow">Project sources</div>
        <label class="ml-auto flex items-center gap-1.5 text-[12px] text-slate-400 cursor-pointer"><input id="bh-recursive" type="checkbox" ${s.recursive ? 'checked' : ''}/> Recursive scan</label>
      </div>
      <div class="grid sm:grid-cols-2 gap-5">
        <div>
          <div class="text-[11px] text-slate-500 mb-1">Scan roots</div>
          ${list(s.roots, 'root', 'No roots — add one below.')}
          <div class="flex gap-1.5 mt-2"><input id="bh-add-root" class="field text-[12px] font-mono py-1 px-2 flex-1" placeholder="/path/to/projects" spellcheck="false"/><button id="bh-addroot" class="btn btn-secondary text-xs px-2 py-1">Add root</button></div>
          ${sugg.length ? `<div class="flex flex-wrap gap-1.5 mt-2">${sugg.map((p) => `<button class="btn btn-ghost text-[11px] !px-2 !py-0.5" data-suggest="${esc(p)}">+ ${esc(p.replace(/^.*\//, '~/'))}</button>`).join('')}</div>` : ''}
        </div>
        <div>
          <div class="text-[11px] text-slate-500 mb-1">Pinned projects</div>
          ${list(s.pinned, 'pinned', 'No pinned projects.')}
          <div class="flex gap-1.5 mt-2"><input id="bh-add-pin" class="field text-[12px] font-mono py-1 px-2 flex-1" placeholder="/path/to/one/flutter/app" spellcheck="false"/><button id="bh-addpin" class="btn btn-secondary text-xs px-2 py-1">Pin app</button></div>
        </div>
      </div>
    </div>`;
  },

  // One artifact toggle chip for the build form.
  artChip(a, on) {
    return `<button class="bh-art surface px-3 py-2 text-left ${on ? 'on' : ''}" data-art="${a.id}">
      <div class="text-sm font-semibold">${a.label}</div><div class="text-[11px] text-slate-500">${a.hint}</div></button>`;
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
