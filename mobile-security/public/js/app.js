'use strict';
// Mobile Security UI — Vue 3 (CDN, zero build) on the platform-kit frontend (kit.js helpers: gradeBox,
// badge, esc, mdToHtml, toast, streamSSE, openModal, openSettings). No login/company chrome — the tool
// runs open on localhost. Static maps + fetch helpers live in constants.js (window.SEC); markup in
// template.js (window.SEC_TEMPLATE). Everything talks to /api/security/*.
// ponytail: this surfaces the core loop (scan → grade → findings → fix/triage/AI-explain/deep-scan →
// report/SARIF). The server also exposes SBOM, OSV vulns, git-secrets, badge, fleet, threat-model,
// exec-summary, baseline, and gate config — add panels for those when someone actually wants them.
const { ref, computed, reactive, onMounted } = Vue;
const { OWASP, SEV_COLOR, SEV_LABEL, STATUS_CLASS, STATUS_TEXT, STATUS_ORDER, SEV_ORDER, TRIAGE, get, post, qp } = window.SEC;

const app = Kit.createApp({
  setup() {
    const view = ref('dashboard');
    const projects = ref([]);
    const overview = ref({ apps: [], overall: {} });
    const pathInput = ref('');
    const record = ref(null);
    const scanning = ref(false);
    const busy = ref('');
    const open = reactive({});   // finding id → expanded

    const scanned = computed(() => record.value && record.value.scanned !== false);
    const findings = computed(() => {
      if (!scanned.value) return [];
      return (record.value.findings || []).slice().sort((a, b) =>
        (STATUS_ORDER[a.status] - STATUS_ORDER[b.status]) || (SEV_ORDER[a.severity] - SEV_ORDER[b.severity]));
    });
    const coverage = computed(() => (record.value && record.value.compliance && record.value.compliance.mobile) || null);
    const gradeHtml = (letter, score, big) => gradeBox(letter, score, big);

    async function loadDash() { const [p, o] = await Promise.all([get('/api/projects'), get('/api/security/all')]); projects.value = p; overview.value = o; }
    async function loadRecord(p) { record.value = await get('/api/security?path=' + qp(p)); }
    async function openProject(p) { pathInput.value = p; view.value = 'scan'; await loadRecord(p); }

    function runScan() {
      const p = pathInput.value.trim(); if (!p) return toast('Enter a project path first', 'err');
      scanning.value = true; record.value = null;
      const box = document.getElementById('scanlog'); if (box) box.innerHTML = '';
      streamSSE('/api/security/scan', { path: p }, box, async () => { scanning.value = false; await loadRecord(p); loadDash(); });
    }
    async function applyFix(f) {
      busy.value = f.id;
      const r = await post('/api/security/fix', { path: pathInput.value, checkId: f.id });
      busy.value = '';
      if (r.error) return toast(r.error, 'err');
      toast('Applied: ' + r.note, 'ok'); await loadRecord(pathInput.value);
    }
    async function fixAll() {
      busy.value = 'fixall';
      const r = await post('/api/security/fix-all', { path: pathInput.value });
      busy.value = '';
      if (r.error) return toast(r.error, 'err');
      toast(`${r.applied.length} fix(es) applied${r.errors.length ? ', ' + r.errors.length + ' skipped' : ''}`, 'ok');
      await loadRecord(pathInput.value);
    }
    async function triage(f, e) {
      const r = await post('/api/security/triage', { path: pathInput.value, findingId: f.id, state: e.target.value });
      if (r.error) return toast(r.error, 'err');
      record.value = r; toast('Triage updated', 'ok');
    }
    async function deepScan() {
      busy.value = 'deep';
      const r = await post('/api/security/ai/deep-scan', { path: pathInput.value });
      busy.value = '';
      if (r.error) return toast(r.error + ' — configure AI in Settings.', 'err');
      record.value = r.record; toast(`AI added ${r.added} finding(s)`, 'ok');
    }
    function aiText(url, title, extra) {
      const body = openModal({ title, size: '760px' });
      body.innerHTML = '<div class="text-slate-500 text-sm">Thinking…</div>';
      post(url, { path: pathInput.value, ...extra }).then((r) => {
        body.innerHTML = r.error ? `<div class="text-rose-400 text-sm">${esc(r.error)} — configure AI in Settings.</div>`
          : `<div class="prose-kit text-sm leading-relaxed">${mdToHtml(r.text || '')}</div>`;
      });
    }
    const explain = (f) => aiText('/api/security/ai/explain', 'AI · ' + f.title, { findingId: f.id });
    const settings = () => openSettings({ aiUrl: '/api/security/ai/config' });
    const reportUrl = () => window.open('/api/security/report?path=' + qp(pathInput.value), '_blank');
    const exportSarif = () => window.open('/api/security/export?fmt=sarif&path=' + qp(pathInput.value), '_blank');

    onMounted(loadDash);
    return {
      view, projects, overview, pathInput, record, scanning, busy, open,
      scanned, findings, coverage, OWASP, SEV_COLOR, SEV_LABEL, STATUS_CLASS, STATUS_TEXT, TRIAGE,
      gradeHtml, badge, esc, openProject, runScan, applyFix, fixAll, triage, deepScan, explain, settings, reportUrl, exportSarif,
    };
  },
  template: window.SEC_TEMPLATE,
});
app.mount('#app');
