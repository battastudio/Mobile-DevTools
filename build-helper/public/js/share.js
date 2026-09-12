// Build Helper frontend — share a build (window.openShare). Draws a branded card on <canvas> with a
// same-origin QR (so toDataURL stays untainted), copy/download, team + client text, and buttons that
// hand off to share-actions.js for emailing client groups and filing a Jira release.
'use strict';

function _installFull(p) { return location.origin + API.installUrl(p); }
function _upList(r) { return Object.entries(r.upload || {}).filter(([, v]) => v === 'ok').map(([k]) => k); }

function teamText(r) {
  const up = _upList(r);
  return `✅ ${r.project} v${verName(r.version)} (${r.env}) built`
    + (up.length ? `\n↑ ${up.join(', ')}` : '')
    + (r.onedriveUrl ? `\nOneDrive: ${r.onedriveUrl}` : '')
    + (r.tasks && r.tasks.length ? `\nTasks: ${r.tasks.map((t) => t.key).join(', ')}` : '');
}
function clientText(r) {
  const art = (r.artifacts || [])[0];
  return `${r.project} ${verName(r.version)} is ready to test.\n`
    + (art ? `Install: ${_installFull(art.url)}\n` : '')
    + (r.whatsNew ? `\nWhat's new:\n${r.whatsNew}` : '');
}

// Draw the card. Colors pulled from the live kit.css tokens so it matches the theme.
function drawCard(cv, r) {
  const g = cv.getContext('2d'), W = cv.width, H = cv.height;
  const css = getComputedStyle(document.documentElement), c = (v, f) => (css.getPropertyValue(v).trim() || f);
  g.fillStyle = c('--panel', '#131a2a'); g.fillRect(0, 0, W, H);
  g.fillStyle = c('--brand', '#6366f1'); g.fillRect(0, 0, W, 12);
  g.fillStyle = c('--ink', '#e7eaf1'); g.font = '700 46px Inter, system-ui, sans-serif';
  g.fillText(r.project || 'App', 48, 96);
  g.font = '600 30px Inter, system-ui, sans-serif'; g.fillStyle = c('--brand', '#8b93ff');
  g.fillText(`v${verName(r.version)}  ·  ${(r.env || '').toUpperCase()}`, 48, 146);
  g.font = '400 20px Inter, system-ui, sans-serif'; g.fillStyle = c('--muted', '#93a0b8');
  const up = _upList(r); g.fillText(up.length ? `Distributed to: ${up.join(', ')}` : 'Build ready', 48, 196);
  const arts = (r.artifacts || []).map((a) => a.name.split('.').pop().toUpperCase());
  g.fillText(arts.length ? `Artifacts: ${[...new Set(arts)].join(', ')}` : '', 48, 232);
  if (r.whatsNew) { g.font = '400 18px Inter, system-ui'; g.fillStyle = c('--ink', '#cbd5e1'); r.whatsNew.split('\n').slice(0, 4).forEach((ln, i) => g.fillText(ln.slice(0, 60), 48, 288 + i * 26)); }
  const art = (r.artifacts || [])[0];
  if (art) { const img = new Image(); img.onload = () => { g.fillStyle = '#fff'; g.fillRect(W - 236, H - 236, 196, 196); g.drawImage(img, W - 228, H - 228, 180, 180); }; img.src = API.qrUrl(_installFull(art.url), 300); }
}

window.openShare = function (r) {
  const b = openModal({ title: 'Share build', subtitle: `${r.project} v${verName(r.version)} (${r.env})`, size: '680px' });
  b.innerHTML = `<canvas id="sc" width="900" height="480" class="w-full rounded-xl border border-edge mb-3"></canvas>
    <div class="flex flex-wrap gap-2 mb-3">
      <button id="sc-dl" class="btn btn-primary text-sm">Download PNG</button>
      <button id="sc-copy" class="btn btn-secondary text-sm">Copy image</button>
      <button id="sc-team" class="btn btn-ghost text-sm">Copy team text</button>
      <button id="sc-client" class="btn btn-ghost text-sm">Copy client text</button>
      <button id="sc-email" class="btn btn-ghost text-sm">Email clients</button>
      <button id="sc-jira" class="btn btn-ghost text-sm">Jira release</button>
    </div>
    <div id="sc-extra"></div>`;
  const cv = el('#sc'); drawCard(cv, r);
  const copyText = (t, ok) => navigator.clipboard.writeText(t).then(() => toast(ok, 'ok')).catch(() => toast('Copy failed', 'err'));
  el('#sc-dl').onclick = () => { const a = document.createElement('a'); a.download = `${r.project}-${verName(r.version)}.png`; a.href = cv.toDataURL('image/png'); a.click(); };
  el('#sc-copy').onclick = () => cv.toBlob((bl) => navigator.clipboard.write([new ClipboardItem({ 'image/png': bl })]).then(() => toast('Image copied', 'ok')).catch(() => toast('Copy not supported here', 'err')));
  el('#sc-team').onclick = () => copyText(teamText(r), 'Team text copied');
  el('#sc-client').onclick = () => copyText(clientText(r), 'Client text copied');
  el('#sc-email').onclick = () => shareEmail(r, cv);
  el('#sc-jira').onclick = () => shareJira(r, cv);
};
