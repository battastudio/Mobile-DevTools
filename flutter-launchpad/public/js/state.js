'use strict';
// Flutter Launchpad — shared state helpers (loaded FIRST, before the components).
// Attaches window.FL: the /catalog+/generate+/export fetchers, dotted-key get/set
// (config keys like `platform.maintenance` are dot-paths), and a blob download.
// No framework here — just the plumbing the Vue app and its components lean on.
window.FL = {
  // The three backend routes (server.js). GET catalog, POST config → blueprint/zip.
  api: {
    catalog: () => fetch('/catalog').then((r) => r.json()),
    generate: (cfg) =>
      fetch('/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cfg) }).then((r) => r.json()),
  },

  // Dotted get/set so a field key ("platform.urlLauncher") maps to config.platform.urlLauncher.
  dget(o, k) { return k.split('.').reduce((a, p) => (a == null ? a : a[p]), o); },
  dset(o, k, v) {
    const ps = k.split('.'); const last = ps.pop(); let t = o;
    for (const p of ps) { if (t[p] == null) t[p] = {}; t = t[p]; } // seed missing branches
    t[last] = v;
  },
  clone: (v) => JSON.parse(JSON.stringify(v)), // reactive proxy → plain object before POST

  // POST config to /export → download the returned .zip. Backend sets Content-Disposition;
  // we honour its filename, falling back to app.zip. Throws on a JSON error body (400).
  async export(cfg) {
    const r = await fetch('/export', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cfg) });
    if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || 'export failed'); }
    const blob = await r.blob();
    const m = /filename="?([^"]+)"?/.exec(r.headers.get('Content-Disposition') || '');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = m ? m[1] : 'app.zip';
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(a.href);
  },

  // Blueprint file tabs (server groups every file under one of these `tab` values).
  TABS: [['structure', 'Structure'], ['code', 'Code'], ['pubspec', 'pubspec'], ['config', 'Config'], ['docs', 'Docs']],
};
