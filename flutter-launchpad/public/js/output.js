'use strict';
// <fl-output> — the generated blueprint viewer. The /generate response is
// { files:[{path,content,tab}], packages:{deps,dev}, warnings:[{level,message}] }.
// Files are grouped by their `tab`; we show only tabs that actually have files,
// a .fl-file list on the left, and the selected file's content in pre.fl-code.
// Advisories (warnings) and a resolved-dependency count sit above the tabs.
window.FL_OUTPUT = {
  props: { bp: Object },
  data() { return { tab: '', sel: '' }; },
  computed: {
    tabs() { return window.FL.TABS.filter(([id]) => this.files(id).length); },
    active() { return this.tab || (this.tabs[0] || [''])[0]; },
    list() { return this.files(this.active); },
    current() { return this.list.find((f) => f.path === this.sel) || this.list[0] || null; },
    depCount() { const p = this.bp.packages || {}; return (p.deps || []).length + (p.dev || []).length; },
  },
  methods: {
    files(tab) { return (this.bp.files || []).filter((f) => f.tab === tab); },
    pick(tab) { this.tab = tab; this.sel = (this.files(tab)[0] || {}).path || ''; },
  },
  template: `
  <div class="surface p-4 mt-4">
    <div class="flex items-center gap-3 mb-3">
      <div class="text-sm font-semibold">Blueprint</div>
      <span class="text-[11px] text-slate-500">{{(bp.files||[]).length}} files · {{depCount}} packages</span>
    </div>

    <div v-for="(w,i) in (bp.warnings||[])" :key="i" class="fl-cond mb-2"
         :style="w.level==='warn' ? 'border-color:var(--warn,#f59e0b)' : ''">
      <b class="uppercase text-[10px] tracking-wide mr-1">{{w.level}}</b>{{w.message}}
    </div>

    <div class="flex gap-1 flex-wrap mb-3">
      <button v-for="[id,label] in tabs" :key="id" class="fl-tab" :class="{on: active===id}" @click="pick(id)">{{label}}</button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-[minmax(180px,240px)_1fr] gap-3">
      <div class="flex flex-col gap-0.5 max-h-[66vh] overflow-auto pr-1">
        <div v-for="f in list" :key="f.path" class="fl-file" :class="{on: current && current.path===f.path}"
             :title="f.path" @click="sel=f.path">{{f.path}}</div>
      </div>
      <pre v-if="current" class="fl-code">{{current.content}}</pre>
    </div>
  </div>`,
};
