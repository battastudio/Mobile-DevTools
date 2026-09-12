// Build Helper frontend — share follow-ups (window.shareEmail / shareJira). Rendered inline under the
// share card: email the build to client groups (BCC via /api/email/send) or file a Jira "Mobile
// Release" with the card attached (/api/tracker/release). Both stream progress into a log box.
'use strict';

async function shareEmail(r, cv) {
  const box = el('#sc-extra');
  const groups = await API.groups(r.repo || '');
  const art = (r.artifacts || [])[0];
  box.innerHTML = `<div class="surface p-3">
    <div class="text-[11px] text-slate-500 mb-1">Client groups</div>
    <div class="flex flex-wrap gap-2 mb-2">${groups.length ? groups.map((g) => `<label class="flex items-center gap-1 text-sm"><input type="checkbox" class="em-g" value="${esc(g.name)}"/>${esc(g.name)} <span class="text-[10px] text-slate-500">(${g.emails.length})</span></label>`).join('') : '<span class="text-xs text-slate-500">No groups — set them in App Setup, or add addresses below.</span>'}</div>
    <input id="em-extra" class="field text-sm w-full mb-2" placeholder="Extra emails (comma-separated)"/>
    <input id="em-subject" class="field text-sm w-full mb-2" value="${esc(`${r.project} ${verName(r.version)} (${r.env})`)}"/>
    <textarea id="em-desc" class="field text-sm w-full h-20 mb-2">${esc(clientText(r))}</textarea>
    <button id="em-send" class="btn btn-primary text-sm">Send</button>
    <div id="em-log" class="bh-term hidden mt-2" style="height:140px"></div></div>`;
  el('#em-send').onclick = () => {
    const chosen = [...box.querySelectorAll('.em-g:checked')].map((c) => c.value);
    const buttons = art ? [{ label: 'Install', url: location.origin + API.installUrl(art.url) }] : [];
    const log = el('#em-log'); log.classList.remove('hidden');
    API.stream('/api/email/send', { repo: r.repo || '', appName: r.project, version: verName(r.version), description: el('#em-desc').value, groups: chosen, extra: el('#em-extra').value, subject: el('#em-subject').value, buttons }, log);
  };
}

function shareJira(r, cv) {
  const box = el('#sc-extra');
  box.innerHTML = `<div class="surface p-3">
    <input id="jr-sum" class="field text-sm w-full mb-2" value="${esc(`Mobile Release: ${r.project} v${verName(r.version)}`)}"/>
    <textarea id="jr-desc" class="field text-sm w-full h-24 mb-2">${esc(teamText(r))}</textarea>
    <label class="flex items-center gap-2 text-sm mb-2"><input type="checkbox" id="jr-attach" checked/>Attach the build card</label>
    <button id="jr-go" class="btn btn-primary text-sm">Create Jira release</button>
    <div id="jr-log" class="bh-term hidden mt-2" style="height:150px"></div></div>`;
  el('#jr-go').onclick = () => {
    const fields = { [`${r.env}Version`]: verName(r.version), buildNumber: String(r.buildNumber || ''), releaseNotes: r.whatsNew || '', releaseDate: (r.time || '').slice(0, 10) };
    const body = { path: r.path, summary: el('#jr-sum').value, description: el('#jr-desc').value, fields, linkKeys: (r.tasks || []).map((t) => t.key) };
    if (el('#jr-attach').checked) { body.pngBase64 = cv.toDataURL('image/png'); body.filename = `${r.project}-${verName(r.version)}.png`; }
    const log = el('#jr-log'); log.classList.remove('hidden');
    API.stream('/api/tracker/release', body, log);
  };
}
