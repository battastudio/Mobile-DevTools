// [split from app.js] Reactive state (QA) + constant maps + NAV. Load order lives in index.html.
// QA & Testing — frontend. Vue owns #app: the topnav is a reactive v-html blob (re-wired on
// every view change via wireNav, mirroring the original shell rebuild), and #qabody is a
// persistent Vue-owned container that the imperative render*/modal/SSE helpers fill by id —
// exactly as before. Shared kit.js helpers (topnav/wireNav/gradeBox/streamSSE/openModal/…) stay
// imperative and are used by bare name. See docs/FRONTEND.md and public/js/app.js (Hub).
const { ref, onMounted, nextTick } = Vue;
const navHtml = ref('');
const QA = { data: { apps: [], overall: {} }, projects: [], sel: '', path: '', url: '', filter: 'all', last: null, view: 'dashboard', detailPath: '', tt: null, rec: null, sel2: new Set(), device: '', devices: [], platform: '', toolName: '', dlProject: '', dlDevice: '', devices2: [], recording: false, dlAbort: null, search: '', stages: [], stageStatus: {}, running: false, abort: null, arts: [], artSel: new Set() };
const PLATFORM_LABEL = { flutter: 'Flutter (mobile)', web: 'Web front-end', laravel: 'Laravel (backend)' };
const SEVORD = { crit: 0, high: 1, med: 2, low: 3, info: 4 };
const SEV_LABEL = { crit: 'Critical', high: 'High', med: 'Medium', low: 'Low', info: 'Info' };
const SEV_COLOR = { crit: 'rose', high: 'rose', med: 'amber', low: 'slate', info: 'slate' };
const ST_CHIP = { pass: 'status ok', ok: 'status ok', fail: 'status fail', warn: 'status run', na: 'status off' };
const ST_TEXT = { pass: 'PASS', ok: 'PASS', fail: 'FAIL', warn: 'REVIEW', na: 'N/A' };
const CAT_GROUP = ['Tests', 'Integration', 'Golden', 'E2E', 'Coverage', 'Types', 'Analyze', 'Lint', 'Build', 'Deps', 'SEO', 'Accessibility', 'Performance', 'Best Practices', 'Manual QA'];

const NAV = { dashboard: () => showApp('dashboard'), run: () => showApp('run'), device: () => showApp('device') };
const CAT_COLOR = { fail: 'crit', warn: 'warn', pass: 'good', ok: 'good', na: 'muted' };
