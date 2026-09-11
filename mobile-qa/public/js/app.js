// [split] Entry — Vue shell bootstrap (mount). MUST load LAST (all decls above already defined).
// Vue shell: Vue owns #app and renders the reactive topnav (v-html) + a persistent #qabody that the
// imperative helpers above fill. boot() runs on mount (registers the ⌘K + menu keydown/click
// listeners, loads the manifest, and shows the dashboard).
Kit.createApp({
  setup() { onMounted(() => { boot(); }); return { navHtml }; },
  template: `<div v-html="navHtml"></div><div id="qabody"></div>`,
}).mount('#app');
