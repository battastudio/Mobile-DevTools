'use strict';
// Mobile Security UI markup (Vue template). Loaded before app.js (attaches to window.SEC_TEMPLATE).
window.SEC_TEMPLATE = `
<header class="flex items-center gap-3 mb-6 pb-4 border-b border-edge/70">
  <div class="h-9 w-9 rounded-xl grid place-items-center font-display font-bold text-lg" style="background:linear-gradient(135deg,var(--brand),var(--brand2))">S</div>
  <div><div class="font-display font-bold text-[17px] leading-none">Mobile Security</div><div class="text-[11px] text-slate-500 mt-0.5">OWASP Mobile Top 10 · Flutter static scanner</div></div>
  <nav class="seg ml-4">
    <button class="seg-item" :class="{active:view==='dashboard'}" @click="view='dashboard'">Dashboard</button>
    <button class="seg-item" :class="{active:view==='scan'}" @click="view='scan'">Scan</button>
  </nav>
  <div class="ml-auto flex items-center gap-2">
    <button class="btn btn-ghost text-sm" @click="settings">Settings</button>
  </div>
</header>

<section v-if="view==='dashboard'">
  <div class="surface p-4 mb-4 flex items-center gap-4">
    <span v-html="gradeHtml(overview.overall.letter, overview.overall.avg, true)"></span>
    <div><div class="text-sm font-semibold">Fleet posture</div><div class="text-xs text-slate-500">{{overview.overall.scanned||0}} app(s) scanned · {{overview.overall.totalFail||0}} failing checks</div></div>
    <button class="btn btn-primary text-sm ml-auto" @click="view='scan'">Scan an app</button>
  </div>
  <div v-if="(overview.apps||[]).length" class="space-y-2">
    <button v-for="a in overview.apps" :key="a.path" class="surface p-3 w-full flex items-center gap-3 text-left hover:ring-1 hover:ring-edge" @click="openProject(a.path)">
      <span v-html="gradeHtml(a.grade&&a.grade.letter, a.grade&&a.grade.score)"></span>
      <div class="min-w-0"><div class="text-sm font-medium truncate">{{a.name}}</div><div class="text-[11px] text-slate-500 truncate">{{a.path}}</div></div>
      <span class="ml-auto text-xs text-rose-300" v-if="a.grade">{{a.grade.counts.fail||0}} fail</span>
    </button>
  </div>
  <div v-else class="text-sm text-slate-500">No scans yet. Go to <b>Scan</b>, point at a Flutter project, and Run.</div>
</section>

<section v-if="view==='scan'">
  <div class="surface p-4 mb-4">
    <label class="text-[11px] text-slate-500">Flutter project path</label>
    <div class="flex gap-2 mt-1">
      <input v-model="pathInput" list="projlist" placeholder="/path/to/flutter/app" class="field flex-1 font-mono text-sm" @keyup.enter="runScan"/>
      <datalist id="projlist"><option v-for="p in projects" :key="p.path" :value="p.path">{{p.name}}</option></datalist>
      <button class="btn btn-primary text-sm" :disabled="scanning" @click="runScan">{{scanning?'Scanning…':'Run scan'}}</button>
    </div>
  </div>
  <div id="scanlog" v-show="scanning" class="log max-h-64 overflow-auto rounded-lg p-3 text-[12px] font-mono border border-edge mb-4" style="background:var(--sunken)"></div>

  <div v-if="scanned">
    <div class="surface p-4 mb-4 flex flex-wrap items-center gap-4">
      <span v-html="gradeHtml(record.grade.letter, record.grade.score, true)"></span>
      <div>
        <div class="text-sm font-semibold">{{record.name}} <span class="text-xs font-normal" :class="record.gate.pass?'text-emerald-400':'text-rose-400'">· gate {{record.gate.pass?'PASS':'FAIL'}}</span></div>
        <div class="text-[11px] text-slate-500">{{record.grade.counts.fail||0}} fail · {{record.grade.counts.warn||0}} review · {{record.grade.counts.ok||0}} pass · {{record.grade.counts.na||0}} n/a</div>
      </div>
      <div class="ml-auto flex flex-wrap gap-2">
        <button class="btn btn-secondary text-sm" @click="fixAll" :disabled="busy==='fixall'">Fix all</button>
        <button class="btn btn-secondary text-sm" @click="deepScan" :disabled="busy==='deep'">{{busy==='deep'?'AI…':'AI deep scan'}}</button>
        <button class="btn btn-ghost text-sm" @click="reportUrl">Report</button>
        <button class="btn btn-ghost text-sm" @click="exportSarif">SARIF</button>
      </div>
    </div>

    <div v-if="coverage" class="surface p-3 mb-4">
      <div class="text-xs text-slate-400 mb-2">OWASP Mobile coverage — {{coverage.pass}}/{{coverage.total}} categories passing</div>
      <div class="flex flex-wrap gap-1.5">
        <span v-for="k in coverage.categories" :key="k.owasp" class="status" :class="STATUS_CLASS[k.status]" :title="OWASP[k.owasp]||k.owasp" style="transform:scale(.85);transform-origin:left">{{k.owasp}}</span>
      </div>
    </div>

    <div class="space-y-2">
      <div v-for="f in findings" :key="f.id" class="surface overflow-hidden">
        <button class="w-full flex items-center gap-2 p-3 text-left" @click="open[f.id]=!open[f.id]">
          <span class="status" :class="STATUS_CLASS[f.status]">{{STATUS_TEXT[f.status]}}</span>
          <span v-if="f.kind==='ai'" class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300">AI</span>
          <span v-if="f.owasp" class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-300">{{f.owasp}}</span>
          <span class="text-[13px] font-medium">{{f.title}}</span>
          <span class="text-[10px] uppercase tracking-wide text-slate-500 hidden sm:inline">{{f.category}}</span>
          <span class="ml-auto" v-html="badge(SEV_LABEL[f.severity]||f.severity, SEV_COLOR[f.severity]||'slate')"></span>
        </button>
        <div v-show="open[f.id]" class="px-3 pb-3 text-[13px] text-slate-300 space-y-2 border-t border-edge/60 pt-2">
          <p v-if="f.scenario" class="text-slate-400"><b class="text-slate-300">Attack scenario:</b> {{f.scenario}}</p>
          <pre v-if="f.evidence" class="text-[11px] whitespace-pre-wrap rounded p-2 border border-edge" style="background:var(--sunken)">{{f.evidence}}</pre>
          <pre v-if="f.fix" class="text-[11px] whitespace-pre-wrap rounded p-2 border border-emerald-500/20 text-emerald-200/90" style="background:var(--sunken)">{{f.fix}}</pre>
          <div class="flex flex-wrap items-center gap-2 pt-1">
            <button v-if="f.fixable && (f.status==='fail'||f.status==='warn')" class="btn btn-primary text-xs" :disabled="busy===f.id" @click="applyFix(f)">One-click fix</button>
            <button class="btn btn-secondary text-xs" @click="explain(f)">AI explain</button>
            <label class="text-[11px] text-slate-500 ml-auto">Triage
              <select class="field text-xs ml-1 py-1" :value="f.triage||'open'" @change="triage(f,$event)">
                <option v-for="(lbl,st) in TRIAGE" :key="st" :value="st">{{lbl}}</option>
              </select>
            </label>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
`;
