'use strict';
// Flutter Launchpad UI — Vue 3 (CDN) on the platform-kit frontend, LOADED LAST.
// Fixes the blank page: index.html mounts #app and referenced this file, but the
// whole js/ tree was missing. Flow: GET /catalog → render each section's fields
// via <fl-field> into a reactive `config` (seeded from catalog.defaults) →
// POST /generate for the tabbed blueprint (<fl-output>) → POST /export for the zip.
// Helpers/components live in state.js, fields.js, output.js (loaded before us).
const { reactive, ref, onMounted } = Vue;

const FL_TEMPLATE = `
<header class="flex items-center gap-3 mb-6 pb-4 border-b border-edge/70">
  <div class="h-9 w-9 rounded-xl grid place-items-center font-display font-bold text-lg" style="background:linear-gradient(135deg,var(--brand),var(--brand2))">F</div>
  <div>
    <div class="font-display font-bold text-[17px] leading-none">Flutter Launchpad</div>
    <div class="text-[11px] text-slate-500 mt-0.5">Assemble a config → generate a best-practice Flutter scaffold</div>
  </div>
  <div class="ml-auto flex items-center gap-2">
    <button class="btn btn-secondary text-sm" :disabled="!!busy" @click="generate">{{busy==='gen'?'Generating…':'Generate'}}</button>
    <button class="btn btn-primary text-sm" :disabled="!!busy" @click="download">{{busy==='dl'?'Zipping…':'Download .zip'}}</button>
  </div>
</header>

<div v-if="!catalog" class="text-sm text-slate-500">Loading catalog…</div>

<template v-else>
  <div class="surface p-3 mb-4">
    <div class="text-[11px] text-slate-500 mb-2">Presets — apply a house stack, then tweak below</div>
    <div class="flex flex-wrap gap-2">
      <span v-for="r in catalog.recipes" :key="r.id" class="fl-chip" :title="r.description" @click="applyRecipe(r)">{{r.label}}</span>
    </div>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
    <section v-for="s in catalog.options.sections" :key="s.id" class="surface p-4">
      <div class="font-display font-semibold text-sm mb-1">{{s.title}}</div>
      <div v-if="s.note" class="text-[11px] text-slate-500 mb-3">{{s.note}}</div>
      <fl-field v-for="f in s.fields" :key="f.key" :field="f" :config="config" :cond="catalog.options.cond" />
    </section>
  </div>

  <fl-output v-if="bp" :bp="bp" />
</template>`;

const app = Kit.createApp({
  setup() {
    const catalog = ref(null);
    const config = reactive({});      // seeded from catalog.defaults once loaded
    const bp = ref(null);             // last /generate blueprint
    const busy = ref('');             // 'gen' | 'dl' — disables the action buttons

    async function load() {
      const c = await FL.api.catalog();
      Object.assign(config, FL.clone(c.defaults));
      catalog.value = c;
    }
    // Recipes are partial configs — top-level keys overwrite (arrays replace wholesale).
    function applyRecipe(r) { Object.assign(config, FL.clone(r.config)); toast('Applied ' + r.label, 'ok'); }

    async function generate() {
      busy.value = 'gen';
      try {
        const r = await FL.api.generate(FL.clone(config));
        if (r.error) return toast(r.error, 'err');
        bp.value = r; toast(r.files.length + ' files generated', 'ok');
      } finally { busy.value = ''; }
    }
    async function download() {
      busy.value = 'dl';
      try { await FL.export(FL.clone(config)); }
      catch (e) { toast(e.message, 'err'); }
      finally { busy.value = ''; }
    }

    onMounted(load);
    return { catalog, config, bp, busy, applyRecipe, generate, download };
  },
  template: FL_TEMPLATE,
});
app.component('fl-field', FL_FIELD);
app.component('fl-output', FL_OUTPUT);
app.mount('#app');
