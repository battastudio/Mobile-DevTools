// ---- connector cards (shared logos + metadata + the native <details> shell) ----
const CX_LOGO = {
  jira: '<svg width="22" height="22" viewBox="0 0 24 24"><path fill="#2684FF" d="M11.57 11.51H0a5.22 5.22 0 0 0 5.23 5.22h2.13v2.05A5.22 5.22 0 0 0 12.58 24V12.52a1 1 0 0 0-1.01-1.01zm5.72-5.75H5.74a5.22 5.22 0 0 0 5.21 5.21h2.13v2.06a5.22 5.22 0 0 0 5.22 5.21V6.76a1 1 0 0 0-1.01-1zM23.01 0H11.46a5.22 5.22 0 0 0 5.21 5.22h2.13v2.05A5.22 5.22 0 0 0 24 12.48V1a1 1 0 0 0-.99-1z"/></svg>',
  gitlab: '<svg width="22" height="22" viewBox="0 0 24 24"><path fill="#FC6D26" d="m23.6 9.59-.03-.09L20.3.98a.85.85 0 0 0-.34-.4.87.87 0 0 0-1 .05.87.87 0 0 0-.29.44l-2.2 6.75H7.53L5.33 1.07a.86.86 0 0 0-.29-.44.87.87 0 0 0-1 .05.86.86 0 0 0-.34.4L.43 9.5l-.03.09a6.07 6.07 0 0 0 2.01 7.01l.01.01.03.02 4.98 3.73 2.46 1.86 1.5 1.13a1.01 1.01 0 0 0 1.22 0l1.5-1.13 2.46-1.86 5.01-3.75.01-.01a6.07 6.07 0 0 0 2.01-7z"/></svg>',
  github: '<svg width="22" height="22" viewBox="0 0 24 24"><path fill="#e7eaf1" d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.82-.26.82-.58l-.01-2.04c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.08-.74.09-.73.09-.73 1.2.09 1.83 1.24 1.83 1.24 1.07 1.83 2.81 1.3 3.5 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.12-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.3-1.55 3.3-1.23 3.3-1.23.66 1.66.25 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.8 5.63-5.48 5.92.43.37.81 1.1.81 2.22l-.01 3.29c0 .32.22.69.83.57A12 12 0 0 0 12 .3z"/></svg>',
  azure: '<svg width="22" height="22" viewBox="0 0 24 24"><path fill="#0078D7" d="M0 8.88 2.25 5.9l8.4-3.42V.02l7.37 5.4L2.97 8.34v8.22L0 15.71zm24-4.45v14.65l-5.75 4.9-9.3-3.06v3.06l-5.98-7.42 15.05 1.8V5.42z"/></svg>',
  linear: '<svg width="22" height="22" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5" fill="#5E6AD2"/><path d="M6.8 14.6 14.6 6.8M9 17.2l8.2-8.2" stroke="#fff" stroke-width="1.5" stroke-linecap="round" opacity=".92"/></svg>',
  bitbucket: '<svg width="22" height="22" viewBox="0 0 24 24"><path fill="#2684FF" d="M.78 1.21a.77.77 0 0 0-.77.9l3.26 19.8c.09.5.52.87 1.03.88H19.95a.77.77 0 0 0 .77-.65l3.27-20.03a.77.77 0 0 0-.77-.9zM14.52 15.53H9.52L8.17 8.47h7.56z"/></svg>',
};
const CONNECTORS = {
  jira: { name: 'Jira', blurb: 'Count issues in commits + create issues from reports.', logo: CX_LOGO.jira, help: { docUrl: 'https://id.atlassian.com/manage-profile/security/api-tokens', docLabel: 'Atlassian API tokens', steps: ['Create an <b>API token</b> at Atlassian → Security → API tokens.', 'Enter your Jira <b>Site URL</b>, <b>email</b>, and the <b>token</b>.', 'For creating issues, also set the <b>Project key</b> (e.g. JSW) and release <b>work type</b>.', '<b>Save</b>, then <b>Test</b>.'], note: 'Every tool (Build Helper, QA, Security) uses this one connection. QA/Security "Jira issue" files a report issue with a link.' } },
  gitlab: { name: 'GitLab', blurb: 'Count GitLab issues referenced in commits.', logo: CX_LOGO.gitlab, help: { docUrl: 'https://gitlab.com/-/user_settings/personal_access_tokens', docLabel: 'GitLab access tokens', steps: ['In GitLab: <b>Settings → Access Tokens</b> → create a token with scope <b>read_api</b>.', 'Enter the <b>Host</b> + <b>Project ID</b> and the <b>token</b>, then <b>Save</b>.'], note: 'Issue refs like #45 are read from commit messages.' } },
  github: { name: 'GitHub', blurb: 'Count GitHub issues/PRs referenced in commits.', logo: CX_LOGO.github, help: { docUrl: 'https://github.com/settings/tokens', docLabel: 'GitHub tokens', steps: ['<b>GitHub → Settings → Developer settings → Personal access tokens</b> → generate one with <b>repo</b> scope.', 'Enter <b>owner</b>, <b>repo</b>, and the <b>token</b>, then <b>Save</b>.'], note: 'Refs like #123 are read from commit messages.' } },
  azure: { name: 'Azure DevOps', blurb: 'Count Azure Boards work items in commits.', logo: CX_LOGO.azure, help: { docUrl: 'https://dev.azure.com', docLabel: 'Azure DevOps', steps: ['<b>Azure DevOps → User settings → Personal access tokens</b> → create one with <b>Work Items (Read)</b>.', 'Enter your <b>organization</b>, <b>project</b>, and the <b>PAT</b>, then <b>Save</b>.'], note: 'Refs like AB#77 are read from commit messages.' } },
  linear: { name: 'Linear', blurb: 'Count Linear issues referenced in commits.', logo: CX_LOGO.linear, help: { docUrl: 'https://linear.app/settings/api', docLabel: 'Linear API', steps: ['<b>Linear → Settings → API → Personal API keys</b> → create a key.', 'Paste the <b>API key</b> and <b>Save</b>.'], note: 'Refs like ENG-42 are read from commit messages.' } },
  bitbucket: { name: 'Bitbucket', blurb: 'Count Bitbucket issues referenced in commits.', logo: CX_LOGO.bitbucket, help: { docUrl: 'https://bitbucket.org/account/settings/app-passwords/', docLabel: 'Bitbucket app passwords', steps: ['<b>Bitbucket → Personal settings → App passwords</b> → create one with <b>Issues: Read</b>.', 'Enter <b>workspace</b>, <b>repo</b>, <b>username</b>, and the <b>app password</b>, then <b>Save</b>.'], note: 'Refs like #12 are read from commit messages.' } },
};
function howTo(help) {
  if (!help || !help.steps) return '';
  const steps = help.steps.map(s => `<li>${s}</li>`).join('');
  const doc = help.docUrl ? `<div class="mt-1.5"><a href="${help.docUrl}" target="_blank" rel="noopener" class="text-sky-400 hover:underline">Open ${esc(help.docLabel || 'docs')} ▸</a></div>` : '';
  const note = help.note ? `<div class="text-slate-500 mt-1.5">${help.note}</div>` : '';
  return `<details class="mt-3 text-xs text-slate-400"><summary class="cursor-pointer select-none" style="color:var(--brand2)">How to connect ▸</summary><div class="mt-2 space-y-1.5 leading-relaxed"><ol class="list-decimal ml-4 space-y-1">${steps}</ol>${doc}${note}</div></details>`;
}
function connectorCard(meta, statusOk, bodyHtml, opts) {
  opts = opts || {};
  const open = opts.open !== undefined ? opts.open : !statusOk;
  return `<details ${opts.id ? `id="conn-${opts.id}"` : ''} class="conn surface" ${open ? 'open' : ''}>
    <summary class="flex items-center gap-3 p-4">
      <div class="h-10 w-10 rounded-xl bg-white/[.04] ring-1 ring-white/10 grid place-items-center shrink-0">${meta.logo || ''}</div>
      <div class="min-w-0"><div class="font-semibold leading-tight truncate">${esc(meta.name)}</div><div class="text-xs text-slate-400 truncate">${meta.blurb || ''}</div></div>
      <div class="ml-auto flex items-center gap-3 shrink-0">${pill(statusOk)}<span class="chev text-slate-500">▸</span></div>
    </summary>
    <div class="px-4 pb-4 pt-3 border-t border-edge/60">${bodyHtml}${meta.help ? howTo(meta.help) : ''}</div>
  </details>`;
}
async function renderTeamActivity(body) {
  let d; try { d = await fetch('/api/team').then((r) => r.json()); } catch { d = { records: [] }; }
  const recs = d.records || [];
  if (!recs.length) { body.innerHTML = `<div class="surface p-5 text-sm text-slate-400">No activity yet. Scans, builds, and reports you run on this machine appear here.</div>`; return; }
  body.innerHTML = `<div class="space-y-2">${recs.map((r) => `
    <div class="surface p-3 flex items-center gap-3 ${r.mine ? 'ring-1 ring-inset ring-brand/30' : ''}">
      ${r.grade ? gradeBox(r.grade.letter, r.grade.score) : ''}
      <div class="min-w-0"><div class="font-semibold text-sm truncate">${esc(r.name || r.key || '—')}</div>
        <div class="text-[11px] text-slate-500 truncate">${esc(r.by || '')}${r.type ? ' · ' + esc(r.type) : ''}${r.gate ? ' · ' + esc(r.gate) : ''}</div></div>
      <div class="ml-auto text-[11px] text-slate-500 shrink-0">${relTime(r.at)}${r.mine ? ' · you' : ''}</div>
    </div>`).join('')}</div>`;
}
async function renderTeamProfile(body) {
  const p = await fetch('/api/team/profile').then((r) => r.json()).catch(() => ({ name: '' }));
  body.innerHTML = `
    <div class="surface p-5">
      <div class="card-head mb-2">${ICON.users}<div class="font-semibold">Your profile</div></div>
      <div class="text-xs text-slate-500 mb-2">Your name is stamped on every report you run (shown in the local activity log). Everything stays on this machine — there are no accounts and no login.</div>
      <div class="flex gap-2"><input id="tm-name" class="field w-full text-sm" value="${esc(p.name || '')}" placeholder="Your name"/><button id="tm-name-save" class="btn btn-primary text-sm">Save</button></div>
    </div>`;
  el('#tm-name-save').onclick = async () => { const r = await postJson('/api/team/profile', { name: el('#tm-name').value.trim() }); r.ok ? toast('Profile saved', 'ok') : toast(r.error || 'Failed', 'err'); };
}
async function renderTeamNotify(body) {
  const [n, em] = await Promise.all([
    fetch('/api/team/notify').then((r) => r.json()).catch(() => ({})),
    fetch('/api/team/email').then((r) => r.json()).catch(() => ({})),
  ]);
  body.innerHTML = `
    <div class="surface p-5 mb-3">
      <div class="card-head mb-2">${ICON.bell}<div class="font-semibold">Slack / Telegram</div><span class="ml-auto">${pill(n.configured)}</span></div>
      <div class="grid sm:grid-cols-2 gap-2">
        <label class="block sm:col-span-2"><span class="text-[11px] text-slate-500">Slack webhook URL</span><input id="nt-slack" class="field w-full text-sm mt-1" value="${esc(n.slackWebhook || '')}" placeholder="https://hooks.slack.com/services/..."/></label>
        <label class="block"><span class="text-[11px] text-slate-500">Telegram bot token</span><input id="nt-tgtoken" type="password" class="field w-full text-sm mt-1" placeholder="${n.hasTelegramToken ? '•••••• set — blank keeps it' : '123456:ABC-...'}"/></label>
        <label class="block"><span class="text-[11px] text-slate-500">Telegram chat ID</span><input id="nt-tgchat" class="field w-full text-sm mt-1" value="${esc(n.telegramChatId || '')}" placeholder="-100..."/></label>
      </div>
      <div class="flex gap-2 mt-3"><button id="nt-save" class="btn btn-primary text-sm">Save</button><button id="nt-test" class="btn btn-secondary text-sm">Test</button><span id="nt-log" class="text-[11px] text-slate-400 self-center"></span></div>
    </div>
    <div class="surface p-5">
      <div class="card-head mb-2">${ICON.mail}<div class="font-semibold">Email</div><span class="ml-auto">${pill(em.configured)}</span></div>
      <div class="seg mb-2"><button class="seg-item em-mode ${(em.mode || 'smtp') === 'smtp' ? 'active' : ''}" data-mode="smtp">SMTP</button><button class="seg-item em-mode ${em.mode === 'api' ? 'active' : ''}" data-mode="api">Email API</button></div>
      <div id="em-smtp" class="grid sm:grid-cols-2 gap-2 ${em.mode === 'api' ? 'hidden' : ''}">
        <label class="block"><span class="text-[11px] text-slate-500">Host</span><input id="em-host" class="field w-full text-sm mt-1" value="${esc(em.host || '')}" placeholder="smtp.gmail.com"/></label>
        <label class="block"><span class="text-[11px] text-slate-500">Port</span><input id="em-port" class="field w-full text-sm mt-1" value="${esc(em.port || 465)}"/></label>
        <label class="block"><span class="text-[11px] text-slate-500">User</span><input id="em-user" class="field w-full text-sm mt-1" value="${esc(em.user || '')}"/></label>
        <label class="block"><span class="text-[11px] text-slate-500">Password</span><input id="em-pass" type="password" class="field w-full text-sm mt-1" placeholder="${em.hasPass ? '•••••• set — blank keeps it' : ''}"/></label>
      </div>
      <div id="em-api" class="grid sm:grid-cols-2 gap-2 ${em.mode === 'api' ? '' : 'hidden'}">
        <label class="block"><span class="text-[11px] text-slate-500">Provider</span><select id="em-provider" class="field w-full text-sm mt-1"><option value="resend"${em.provider === 'resend' ? ' selected' : ''}>Resend</option><option value="sendgrid"${em.provider === 'sendgrid' ? ' selected' : ''}>SendGrid</option><option value="postmark"${em.provider === 'postmark' ? ' selected' : ''}>Postmark</option></select></label>
        <label class="block"><span class="text-[11px] text-slate-500">API key</span><input id="em-key" type="password" class="field w-full text-sm mt-1" placeholder="${em.hasKey ? '•••••• set — blank keeps it' : ''}"/></label>
      </div>
      <div class="grid sm:grid-cols-2 gap-2 mt-2">
        <label class="block"><span class="text-[11px] text-slate-500">From address</span><input id="em-from" class="field w-full text-sm mt-1" value="${esc(em.from || '')}" placeholder="you@company.com"/></label>
        <label class="block"><span class="text-[11px] text-slate-500">From name</span><input id="em-fromname" class="field w-full text-sm mt-1" value="${esc(em.fromName || '')}"/></label>
      </div>
      <div class="flex gap-2 mt-3"><button id="em-save" class="btn btn-primary text-sm">Save</button><button id="em-test" class="btn btn-secondary text-sm">Test</button><span id="em-log" class="text-[11px] text-slate-400 self-center"></span></div>
    </div>`;
  el('#nt-save').onclick = async () => { const r = await postJson('/api/team/notify', { slackWebhook: el('#nt-slack').value.trim(), telegramToken: el('#nt-tgtoken').value.trim(), telegramChatId: el('#nt-tgchat').value.trim() }); r.ok ? toast('Saved', 'ok') : toast('Failed', 'err'); };
  el('#nt-test').onclick = async () => { const b = el('#nt-log'); b.textContent = 'Sending…'; const r = await fetch('/api/team/notify/test').then((x) => x.json()); b.textContent = r.ok ? '✓ ' + (r.out || 'sent') : '✖ ' + (r.error || 'failed'); };
  body.querySelectorAll('.em-mode').forEach((m) => m.onclick = () => { body.querySelectorAll('.em-mode').forEach((x) => x.classList.remove('active')); m.classList.add('active'); const api = m.dataset.mode === 'api'; el('#em-api').classList.toggle('hidden', !api); el('#em-smtp').classList.toggle('hidden', api); });
  const emBody = () => ({ mode: body.querySelector('.em-mode.active').dataset.mode, provider: el('#em-provider') && el('#em-provider').value, host: el('#em-host').value.trim(), port: el('#em-port').value.trim(), user: el('#em-user').value.trim(), pass: el('#em-pass').value.trim(), apiKey: el('#em-key').value.trim(), from: el('#em-from').value.trim(), fromName: el('#em-fromname').value.trim() });
  el('#em-save').onclick = async () => { const r = await postJson('/api/team/email', emBody()); r.ok ? toast('Saved', 'ok') : toast('Failed', 'err'); };
  el('#em-test').onclick = async () => { const b = el('#em-log'); b.textContent = 'Sending…'; const r = await fetch('/api/team/email/test').then((x) => x.json()); b.textContent = r.ok ? '✓ ' + (r.out || 'sent') : '✖ ' + (r.error || 'failed'); };
}

// Grade/score chip shared by security + qa (A–F letters).
const GRADE_COLOR = { A: 'emerald', B: 'emerald', C: 'amber', D: 'orange', F: 'rose' };
function gradeBox(letter, score, big) {
  const size = big ? 'h-12 w-12 text-2xl rounded-xl' : 'h-7 w-7 text-sm rounded-lg';
  if (!letter) return `<span class="inline-grid place-items-center ${size} bg-slate-700/40 text-slate-400 font-display font-bold">—</span>`;
  const c = GRADE_COLOR[letter] || 'slate';
  return `<span class="inline-grid place-items-center ${size} bg-${c}-500/15 text-${c}-300 ring-1 ring-inset ring-${c}-500/30 font-display font-bold" title="${score}/100">${letter}</span>`;
}
