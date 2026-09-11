'use strict';
// <fl-field> — renders ONE catalog field by its `type`, writing straight into the
// shared reactive `config` (passed by ref, so nested mutations stay reactive).
// Catalog field.type → control (all classes are pre-defined in index.html):
//   text   → .fl-in input        seg    → .fl-seg single-choice buttons
//   switch → .fl-sw toggle        chips  → .fl-chip multi-select set
// `field.help` renders as .fl-help; `cond[field.key][value]` (per-value blurbs the
// catalog ships) renders as .fl-cond under the control — one per selected value.
window.FL_FIELD = {
  props: { field: Object, config: Object, cond: { type: Object, default: () => ({}) } },
  computed: {
    val() { return window.FL.dget(this.config, this.field.key); },
    // Scalar fields → look up the one selected value; chips → the blurb for each pick.
    condTexts() {
      const map = this.cond[this.field.key]; if (!map) return [];
      const vals = Array.isArray(this.val) ? this.val : [this.val];
      return vals.map((v) => map[v]).filter(Boolean);
    },
  },
  methods: {
    set(v) { window.FL.dset(this.config, this.field.key, v); },
    has(v) { return Array.isArray(this.val) && this.val.includes(v); },
    toggle(v) { // chips: clone the array so the assignment is a fresh reactive value
      const cur = Array.isArray(this.val) ? this.val.slice() : [];
      const i = cur.indexOf(v); i < 0 ? cur.push(v) : cur.splice(i, 1);
      this.set(cur);
    },
  },
  template: `
  <div class="mb-3.5">
    <div v-if="field.type!=='switch'" class="text-[12px] font-semibold text-slate-200 mb-1.5">{{field.label}}</div>

    <input v-if="field.type==='text'" class="fl-in" :value="val" @input="set($event.target.value)" spellcheck="false" />

    <div v-else-if="field.type==='seg'" class="fl-seg">
      <button v-for="o in field.opts" :key="o.value" :class="{on: val===o.value}" @click="set(o.value)">{{o.label}}</button>
    </div>

    <div v-else-if="field.type==='chips'" class="flex flex-wrap gap-2">
      <span v-for="o in field.opts" :key="o.value" class="fl-chip" :class="{on: has(o.value)}" @click="toggle(o.value)">{{o.label}}</span>
    </div>

    <div v-else-if="field.type==='switch'" class="flex items-center gap-2 cursor-pointer" @click="set(!val)">
      <div class="fl-sw" :class="{on: !!val}"><i></i></div>
      <span class="text-[12px] font-semibold text-slate-200">{{field.label}}</span>
    </div>

    <div v-if="field.help" class="fl-help">{{field.help}}</div>
    <div v-for="(t,i) in condTexts" :key="i" class="fl-cond">{{t}}</div>
  </div>`,
};
