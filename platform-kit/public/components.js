// platform-kit Vue foundation — loaded AFTER kit.js, from a CDN Vue 3 global build.
// Zero-build: no npm, no bundler. Gives tools real reactivity + a small set of shared
// components that WRAP the existing kit.js helpers (esc, ICON, mdToHtml, streamSSE, postJson,
// pill) rather than reinventing them. See docs/FRONTEND.md.
//
//   const app = Kit.createApp({ setup() { ... } });   // components auto-registered
//   app.mount('#app');
//
(function () {
  'use strict';
  if (typeof Vue === 'undefined') { console.warn('[kit] Vue global build not loaded — did index.html include vue.global.prod.js before components.js?'); return; }
  const { h } = Vue;

  // ---- shared components (all lean on kit.js globals already on window) ----
  const components = {
    // Status pill: <status-pill ok /> or <status-pill state="run" label="scanning" />
    'status-pill': {
      props: { ok: Boolean, state: { type: String, default: '' }, label: { type: String, default: '' } },
      render() {
        const cls = this.state || (this.ok ? 'ok' : 'off');
        const txt = this.label || ({ ok: 'ok', run: 'running', fail: 'failed', off: 'off' }[cls] || cls);
        return h('span', { class: 'status ' + cls }, txt);
      },
    },

    // Markdown → HTML via kit.js mdToHtml (no deps). <md-view :src="report" />
    'md-view': {
      props: { src: { type: String, default: '' } },
      render() { return h('div', { class: 'md', innerHTML: mdToHtml(this.src || '') }); },
    },

    // Live SSE log panel via kit.js streamSSE. <stream-log url="/api/qa/run" :body="{...}" ref="log" />
    // Call .start() on the ref, or set autostart. Falls back to a scrollable <pre>.
    'stream-log': {
      props: { url: { type: String, required: true }, body: { type: Object, default: null }, autostart: Boolean, height: { type: String, default: '360px' } },
      mounted() { if (this.autostart) this.start(); },
      methods: {
        start() { const box = this.$refs.box; if (!box) return; box.textContent = ''; streamSSE(this.url, this.body || {}, box); },
      },
      render() { return h('pre', { ref: 'box', class: 'kit-log overflow-auto', style: { height: this.height, whiteSpace: 'pre-wrap' } }); },
    },

    // Ref-island live terminal for reactive apps: a managed <pre> that arbitrary streamers
    // write into (streamSSE, custom body.getReader() loops, seq-replay pollers). This is the
    // idiomatic Vue escape hatch for byte-streams — everything AROUND it stays reactive.
    //   <live-log ref="log" height="360px" />
    //   const box = this.$refs.log.box(); streamSSE(url, body, box, onDone);   // point any streamer at it
    //   this.$refs.log.start('/api/qa/run', { path });                         // or the simple url/body path
    'live-log': {
      props: { url: { type: String, default: '' }, body: { type: Object, default: null }, autostart: Boolean, height: { type: String, default: '360px' }, wrap: { type: Boolean, default: true } },
      emits: ['done'],
      mounted() { if (this.autostart && this.url) this.start(); },
      methods: {
        box() { return this.$refs.box; },                                   // the <pre> DOM node — hand to any streamer
        clear() { if (this.$refs.box) this.$refs.box.textContent = ''; },
        write(s) { const b = this.$refs.box; if (!b) return; b.insertAdjacentText('beforeend', s); b.scrollTop = b.scrollHeight; },
        start() { const b = this.$refs.box; if (!b) return; b.textContent = ''; streamSSE(this.url, this.body || {}, b, () => this.$emit('done')); },
      },
      render() { return h('pre', { ref: 'box', class: 'kit-log overflow-auto', style: { height: this.height, whiteSpace: this.wrap ? 'pre-wrap' : 'pre' } }); },
    },

    // A tool tile for grids/dashboards. <tool-card :tool="t" @open="..." />
    'tool-card': {
      props: { tool: { type: Object, required: true } },
      emits: ['open'],
      render() {
        const t = this.tool;
        const icon = (typeof ICON !== 'undefined' && ICON[t.icon]) || (typeof ICON !== 'undefined' ? ICON.grid : '');
        return h('button', { class: 'surface w-full text-left p-4 flex items-start gap-3 hover:border-edge2 transition', onClick: () => this.$emit('open', t) }, [
          h('span', { class: 'shrink-0 h-9 w-9 rounded-[10px] grid place-items-center', style: 'background:linear-gradient(135deg,var(--brand),var(--brand2))', innerHTML: icon }),
          h('span', { class: 'min-w-0 flex-1' }, [
            h('span', { class: 'flex items-center gap-2' }, [
              h('span', { class: 'font-display font-semibold text-[14px] truncate' }, t.name || t.id),
              t.status ? h(components['status-pill'], { state: t.status }) : null,
            ]),
            h('span', { class: 'block text-xs text-slate-400 mt-0.5 leading-snug' }, t.desc || ''),
          ]),
        ]);
      },
    },

    // A KPI tile for dashboards. <stat-tile label="Scans" :value="42" trend="+3" tone="ok" />
    'stat-tile': {
      props: { label: String, value: [String, Number], trend: { type: String, default: '' }, tone: { type: String, default: '' } },
      render() {
        const toneCls = { ok: 'text-emerald-300', warn: 'text-amber-300', fail: 'text-rose-300' }[this.tone] || 'text-slate-200';
        return h('div', { class: 'surface p-4' }, [
          h('div', { class: 'text-[11px] uppercase tracking-wider text-slate-500' }, this.label),
          h('div', { class: 'mt-1 flex items-baseline gap-2' }, [
            h('div', { class: 'font-display text-2xl ' + toneCls }, String(this.value ?? '—')),
            this.trend ? h('div', { class: 'text-xs text-slate-500' }, this.trend) : null,
          ]),
        ]);
      },
    },

    // Simple sortable table. <data-table :cols="[{key,label}]" :rows="[...]" @row="..." />
    'data-table': {
      props: { cols: { type: Array, required: true }, rows: { type: Array, default: () => [] } },
      emits: ['row'],
      data() { return { sortKey: '', asc: true }; },
      computed: {
        sorted() {
          if (!this.sortKey) return this.rows;
          const k = this.sortKey, dir = this.asc ? 1 : -1;
          return [...this.rows].sort((a, b) => (a[k] > b[k] ? 1 : a[k] < b[k] ? -1 : 0) * dir);
        },
      },
      methods: { sortBy(k) { if (this.sortKey === k) this.asc = !this.asc; else { this.sortKey = k; this.asc = true; } } },
      render() {
        const head = h('thead', {}, h('tr', {}, this.cols.map((c) => h('th', { class: 'cursor-pointer select-none', onClick: () => this.sortBy(c.key) }, c.label + (this.sortKey === c.key ? (this.asc ? ' ▲' : ' ▼') : '')))));
        const body = h('tbody', {}, this.sorted.map((r) => h('tr', { class: 'cursor-pointer', onClick: () => this.$emit('row', r) }, this.cols.map((c) => h('td', {}, c.render ? c.render(r) : (r[c.key] ?? ''))))));
        return h('table', { class: 'md-table w-full' }, [head, body]);
      },
    },
  };

  function register(app) { for (const [name, def] of Object.entries(components)) app.component(name, def); return app; }

  // Kit.createApp(options) → a Vue app with all kit components registered.
  window.Kit = Object.assign(window.Kit || {}, {
    components,
    register,
    createApp(options) { return register(Vue.createApp(options || {})); },
  });
})();
