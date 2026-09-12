// Build Helper frontend — the build form (window.BF): per-env cards (version + M/m/p bump, build
// number + auto, per-env output matrix + Play track, release notes + fill/Jira), the artifact chips,
// the branch selector, and the Advanced menu. collectBuild() shapes the /api/build request body.
'use strict';

function _bump(v, kind) {
  const p = String(v || '1.0.0').split('.').map((n) => parseInt(n, 10) || 0); while (p.length < 3) p.push(0);
  if (kind === 'major') { p[0]++; p[1] = 0; p[2] = 0; } else if (kind === 'minor') { p[1]++; p[2] = 0; } else p[2]++;
  return p.slice(0, 3).join('.');
}

window.BF = {
  bump: _bump,
  // One environment card: selection, version+bump, build number+auto, outputs, notes.
  envCard(e, nextNum, base, f) {
    const out = (id, label, dis, title) => `<label class="flex items-center gap-1 text-[12px] ${dis ? 'opacity-40' : ''}" title="${title || ''}"><input type="checkbox" class="bh-out" data-out="${id}" ${dis ? 'disabled' : ''}/>${label}</label>`;
    return `<div class="surface p-3 bh-envcard" data-env="${e.key}">
      <div class="flex items-center gap-2 flex-wrap">
        <input type="checkbox" class="bh-env" data-env="${e.key}" data-num="${nextNum}"/>
        <span class="w-14">${_envChip(e)}</span>
        <input class="field text-xs font-mono w-20 bh-ver" data-env="${e.key}" value="${esc(base)}" title="version name"/>
        <div class="seg text-[10px]">${['major:M', 'minor:m', 'patch:p'].map((k) => `<button class="seg-item bh-bump" data-env="${e.key}" data-k="${k.split(':')[0]}" title="bump ${k.split(':')[0]}">${k.split(':')[1]}</button>`).join('')}</div>
        <input class="field text-xs font-mono w-14 bh-num" data-env="${e.key}" value="${esc(String(nextNum))}" title="build number"/>
        <label class="flex items-center gap-1 text-[11px] text-slate-400" title="auto next free build number"><input type="checkbox" class="bh-auto"/>auto</label>
      </div>
      <div class="flex items-center gap-3 mt-2 flex-wrap">
        ${out('onedrive', 'OneDrive', !f.onedriveConnected, 'Connect in Setup')}
        ${out('firebase', 'Firebase', !f.firebaseCli, 'Login in Setup')}
        ${out('play', 'Play', !(f.globalPlay || f.play), 'Configure Play')}
        <select class="field text-[11px] py-0.5 bh-track" title="Play track"><option>internal</option><option>alpha</option><option>beta</option><option>production</option></select>
        ${out('testflight', 'TestFlight', !(f.globalApple || f.apple), 'Configure Apple')}
      </div>
      <div class="mt-2">
        <textarea class="field text-xs w-full h-16 bh-notes" placeholder="Release notes / What's new…"></textarea>
        <div class="flex items-center gap-1.5 mt-1 flex-wrap">
          ${['template:Template', 'commits:Commits', 'tracker:Tasks'].map((s) => `<button class="btn btn-ghost text-[11px] !py-0.5 bh-fill" data-src="${s.split(':')[0]}" data-env="${e.key}">${s.split(':')[1]}</button>`).join('')}
          <button class="btn btn-ghost text-[11px] !py-0.5 bh-jira" data-env="${e.key}">${ICON.plus}Jira</button>
          <span class="bh-jira-sel text-[11px] text-slate-500" data-env="${e.key}"></span>
        </div>
      </div>
    </div>`;
  },
  advanced() {
    const opt = (id, l) => `<label class="flex items-center gap-2 text-sm"><input type="checkbox" id="adv-${id}"/>${l}</label>`;
    return `<details class="surface p-3"><summary class="cursor-pointer text-sm font-semibold">Advanced</summary>
      <div class="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
        ${opt('clean', 'flutter clean')}${opt('pub', 'pub get')}${opt('analyze', 'analyze')}${opt('test', 'test')}
        ${opt('warn', 'gate: warn only')}${opt('tag', 'git commit + tag')}${opt('push', 'git push')}
        ${opt('validate', 'validate IPA')}${opt('symbols', 'upload crash symbols')}
      </div></details>`;
  },
  branchSelect(git) {
    const bs = (git && git.branches) || []; const cur = (git && git.current) || '';
    if (!bs.length) return '';
    return `<label class="flex items-center gap-2 text-sm">Branch <select id="bh-branch" class="field text-xs">${bs.map((b) => `<option ${b === cur ? 'selected' : ''}>${esc(b)}</option>`).join('')}</select></label>`;
  },
  // Read the whole form into a /api/build body. `allow` merges guard-override flags on retry.
  collectBuild(allow) {
    const on = (id) => !!(el(id) && el(id).checked);
    const arts = [..._body().querySelectorAll('.bh-art.on')].map((a) => a.dataset.art);
    const validate = on('#adv-validate'), symbols = on('#adv-symbols'), tag = on('#adv-tag'), push = on('#adv-push');
    const envs = [..._body().querySelectorAll('.bh-envcard')].filter((c) => c.querySelector('.bh-env').checked).map((c) => {
      const env = c.dataset.env, q = (s) => c.querySelector(s), outOn = (id) => !!c.querySelector(`.bh-out[data-out="${id}"]`)?.checked;
      return {
        env, buildName: q('.bh-ver').value.trim() || '1.0.0', buildNumber: q('.bh-num').value.trim() || '1', autoNum: q('.bh-auto').checked,
        track: q('.bh-track').value, validate, uploadSymbols: symbols, commitTag: tag, push, whatsNew: q('.bh-notes').value.trim(), notes: q('.bh-notes').value.trim(),
        prod: env === 'prod', jiraTasks: (BH.jiraSel && BH.jiraSel[env]) || [],
        dest: { onedrive: outOn('onedrive') ? arts.slice() : [], firebase: outOn('firebase') ? arts.filter((a) => a === 'apk' || a === 'aab') : [], play: outOn('play') ? ['aab'] : [], testflight: outOn('testflight') ? ['ipa'] : [] },
      };
    });
    return { path: BH.sel, branch: (el('#bh-branch') && el('#bh-branch').value) || '', envs, artifacts: arts,
      clean: on('#adv-clean'), pubGet: on('#adv-pub'), runAnalyze: on('#adv-analyze'), runTest: on('#adv-test'), gateWarnOnly: on('#adv-warn'),
      allowDirty: false, allowDuplicate: false, confirmProd: false, allowLowVersion: false, ...(allow || {}) };
  },
};
