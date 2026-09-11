// Build Helper frontend — thin API layer. Every server call funnels through here so views stay
// declarative. postJson / streamSSE come from kit.js (shared). GETs return parsed JSON.
'use strict';

const _get = (u) => fetch(u).then((r) => r.json());
const _q = (o) => Object.entries(o).filter(([, v]) => v != null && v !== '').map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');

window.API = {
  manifest: () => _get('/api/manifest').catch(() => ({})),
  dashboard: (root) => _get('/api/dashboard' + (root ? '?root=' + encodeURIComponent(root) : '')),
  project: (path) => _get('/api/project?path=' + encodeURIComponent(path)),
  builds: (path) => _get('/api/builds' + (path ? '?path=' + encodeURIComponent(path) : '')),
  status: () => _get('/api/build/status'),
  setup: () => _get('/api/setup'),
  doctor: () => _get('/api/doctor'),
  signing: (path) => _get('/api/signing/status?path=' + encodeURIComponent(path)),
  changelog: (path, env) => _get('/api/changelog?' + _q({ path, env, grouped: 1 })),

  post: (url, body) => postJson(url, body),          // kit.js
  stream: (url, body, box, done) => streamSSE(url, body, box, done),  // kit.js
  stopBuild: () => postJson('/api/build/stop', {}),
  reportUrl: (fmt, f) => `/api/report.${fmt}?` + _q(f || {}),
  installUrl: (p) => '/install?path=' + encodeURIComponent(p),
};
