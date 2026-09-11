'use strict';
// Flutter Launchpad UI — Vue 3 (CDN) on the platform-kit frontend, LOADED LAST.
// Fixes the blank page: index.html mounts #app and referenced this file, but the
// whole js/ tree was missing. Flow: GET /catalog → render each section's fields
// via <fl-field> into a reactive `config` (seeded from catalog.defaults) →
// POST /generate for the tabbed blueprint (<fl-output>) → POST /export for the zip.
// Helpers/components live in state.js, fields.js, output.js (loaded before us).
// The preview is LIVE: a deep watch on `config` re-runs /generate (debounced) so the
// sticky right-hand <fl-output> mirrors the scaffold as you edit — no Generate button.
const { reactive, ref, onMounted, watch } = Vue;

const FL_TEMPLATE = `
<header class="flex items-center gap-3 mb-6 pb-4 border-b border-edge/70">
  <div class="h-9 w-9 rounded-xl grid place-items-center font-display font-bold text-lg" style="background:linear-gradient(135deg,var(--brand),var(--brand2))">F</div>
  <div>
    <div class="font-display font-bold text-[17px] leading-none">Flutter Launchpad</div>
    <div class="text-[11px] text-slate-500 mt-0.5">Assemble a config → live-preview → generate a best-practice Flutter scaffold</div>
  </div>
  <div class="ml-auto flex items-center gap-2.5">
    <span v-if="gen" class="status run">updating…</span>
    <button class="btn btn-primary text-sm" :disabled="dl" @click="download">{{dl?'Zipping…':'Download .zip'}}</button>
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

  <div class="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-5 items-start">
    <div class="space-y-4 min-w-0">
      <section v-for="s in catalog.options.sections" :key="s.id" class="surface p-4">
        <div class="font-display font-semibold text-sm mb-1">{{s.title}}</div>
        <div v-if="s.note" class="text-[11px] text-slate-500 mb-3">{{s.note}}</div>
        <fl-field v-for="f in s.fields" :key="f.key" :field="f" :config="config" :cond="catalog.options.cond" />
      </section>
    </div>
    <div class="xl:sticky xl:top-4 min-w-0">
      <fl-output v-if="bp" :bp="bp" :busy="gen" />
    </div>
  </div>
</template>`;

const app = Kit.createApp({
  setup() {
    const catalog = ref(null);
    const config = reactive({});      // seeded from catalog.defaults once loaded
    const bp = ref(null);             // latest /generate blueprint (drives the live preview)
    const gen = ref(false);           // preview regenerating
    const dl = ref(false);            // zip download in flight
    let timer = null;                 // debounce handle for the live preview

    async function regen() {
      gen.value = true;
      try { const r = await FL.api.generate(FL.clone(config)); if (!r.error) bp.value = r; }
      catch {} finally { gen.value = false; }
    }
    function schedule() { clearTimeout(timer); timer = setTimeout(regen, 250); }

    async function load() {
      const c = await FL.api.catalog();
      Object.assign(config, FL.clone(c.defaults));
      catalog.value = c;
      await regen();                                  // populate the preview immediately
      watch(config, schedule, { deep: true });        // then live-update on every edit
    }
    // Recipes are partial configs — top-level keys overwrite (arrays replace wholesale).
    function applyRecipe(r) { Object.assign(config, FL.clone(r.config)); toast('Applied ' + r.label, 'ok'); }
    async function download() {
      dl.value = true;
      try { await FL.export(FL.clone(config)); }
      catch (e) { toast(e.message, 'err'); }
      finally { dl.value = false; }
    }

    onMounted(load);
    return { catalog, config, bp, gen, dl, applyRecipe, download };
  },
  template: FL_TEMPLATE,
});
app.component('fl-field', FL_FIELD);
app.component('fl-output', FL_OUTPUT);
app.mount('#app');
