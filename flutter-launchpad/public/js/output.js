'use strict';
// <fl-output> — the LIVE blueprint viewer. /generate returns
// { files:[{path,content,tab}], packages:{deps,dev}, warnings:[{level,message}] }.
// Files group by `tab`; every tab renders a nested file tree (basenames, readable) and the
// selected file's content shows in pre.fl-code. `busy` dims it during regen.

// Fold flat paths into ASCII-connector tree rows. File rows carry `path` (clickable);
// directory rows have path=null.
function buildTreeRows(paths) {
  const root = {};
  for (const p of paths) {
    let node = root;
    const parts = p.split('/');
    parts.forEach((part, i) => {
      node[part] = node[part] || { c: {}, file: i === parts.length - 1 ? p : null };
      node = node[part].c;
    });
  }
  const rows = [];
  const walk = (obj, prefix) => {
    const keys = Object.keys(obj).sort((a, b) => {
      const ad = !obj[a].file, bd = !obj[b].file;      // directories first, then files, alpha
      return ad !== bd ? (ad ? -1 : 1) : a.localeCompare(b);
    });
    keys.forEach((k, i) => {
      const last = i === keys.length - 1, n = obj[k];
      rows.push({ prefix: prefix + (last ? '└─ ' : '├─ '), name: k, path: n.file, dir: !n.file });
      if (Object.keys(n.c).length) walk(n.c, prefix + (last ? '   ' : '│  '));
    });
  };
  walk(root, '');
  return rows;
}

window.FL_OUTPUT = {
  props: { bp: Object, busy: Boolean },
  data() { return { tab: '', sel: '' }; },
  computed: {
    tabs() { return window.FL.TABS.filter(([id]) => this.files(id).length); },
    active() { return this.tab || (this.tabs[0] || [''])[0]; },
    list() { return this.files(this.active); },
    tree() { return buildTreeRows(this.list.map((f) => f.path)); },
    current() { return this.list.find((f) => f.path === this.sel) || this.list[0] || null; },
    depCount() { const p = this.bp.packages || {}; return (p.deps || []).length + (p.dev || []).length; },
  },
  methods: {
    files(tab) { return (this.bp.files || []).filter((f) => f.tab === tab); },
    pick(tab) { this.tab = tab; this.sel = (this.files(tab)[0] || {}).path || ''; },
    copy() { if (this.current) { navigator.clipboard.writeText(this.current.content); toast('Copied ' + this.current.path, 'ok'); } },
  },
  template: `
  <div class="surface p-4" :class="{'fl-updating': busy}">
    <div class="flex items-center gap-3 mb-3">
      <div class="text-sm font-semibold">Live preview</div>
      <span class="text-[11px] text-slate-500">{{(bp.files||[]).length}} files · {{depCount}} packages</span>
      <span v-if="busy" class="text-[11px] text-slate-500 ml-auto">updating…</span>
    </div>

    <div v-for="(w,i) in (bp.warnings||[])" :key="i" class="fl-cond mb-2"
         :style="w.level==='warn' ? 'border-color:var(--warn,#f59e0b)' : ''">
      <b class="uppercase text-[10px] tracking-wide mr-1">{{w.level}}</b>{{w.message}}
    </div>

    <div class="flex gap-1 flex-wrap mb-3">
      <button v-for="[id,label] in tabs" :key="id" class="fl-tab" :class="{on: active===id}" @click="pick(id)">{{label}}</button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-[minmax(190px,260px)_1fr] gap-3">
      <div class="flex flex-col gap-0.5 fl-scroll pr-1">
        <div v-for="r in tree" :key="r.prefix+r.name" class="fl-file" :class="{on: current && current.path===r.path, dir: r.dir}"
             :title="r.path||r.name" @click="r.path && (sel=r.path)"><span class="tree-prefix">{{r.prefix}}</span><span class="fl-name">{{r.name}}</span></div>
      </div>
      <div class="min-w-0">
        <div v-if="current" class="flex items-center gap-2 mb-1.5">
          <span class="text-[11px] font-mono text-slate-500 truncate">{{current.path}}</span>
          <button class="btn btn-ghost text-[11px] !px-2 !py-0.5 ml-auto" @click="copy">Copy</button>
        </div>
        <pre v-if="current" class="fl-code">{{current.content}}</pre>
      </div>
    </div>
  </div>`,
};
