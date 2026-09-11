'use strict';
// Git-history secret scan (TruffleHog/gitleaks style) — scans added lines across recent history for
// leaked keys/tokens, with an entropy gate for opaque strings. Stdlib child_process only.
const { execFileSync } = require('child_process');

const SECRET_RE = /(AIza[0-9A-Za-z_\-]{20,}|sk_live_[0-9A-Za-z]{10,}|AKIA[0-9A-Z]{16}|ghp_[0-9A-Za-z]{20,}|xox[baprs]-[0-9A-Za-z-]{10,}|-----BEGIN [A-Z ]*PRIVATE KEY|(?:api[_-]?key|secret|password|passwd|access[_-]?token|auth[_-]?token|token)\s*[:=]\s*['"][^'"]{12,}['"]|Bearer\s+[A-Za-z0-9._\-]{24,}|eyJ[A-Za-z0-9._\-]{20,}\.[A-Za-z0-9._\-]{10,})/i;
const redact = (s) => { s = String(s || ''); return s.length <= 8 ? '••••' : s.slice(0, 4) + '…(' + s.length + ' chars)'; };
function entropy(s) { const m = {}; for (const c of s) m[c] = (m[c] || 0) + 1; let e = 0; for (const k in m) { const p = m[k] / s.length; e -= p * Math.log2(p); } return e; }

// Return { scanned, findings:[{commit,date,file,kind,redacted}] } or { error }.
function scanGitSecrets(projectPath, maxCommits = 400) {
  let out;
  // --no-textconv / --no-ext-diff / core.pager=cat → emit raw patches regardless of repo .gitattributes
  // filters (which fail silently and truncate diffs when the tool runs with a minimal PATH).
  try { out = execFileSync('git', ['-C', projectPath, '-c', 'core.pager=cat', 'log', '-p', '-n', String(maxCommits), '--no-color', '--no-textconv', '--no-ext-diff', '--date=short'], { stdio: ['ignore', 'pipe', 'ignore'], timeout: 45000, maxBuffer: 64 * 1024 * 1024 }).toString(); }
  catch (e) { return { error: 'Not a git repository, or git history too large / unavailable.' }; }
  const findings = [], seen = new Set(); let commit = '', date = '', file = '', commits = 0;
  for (const line of out.split('\n')) {
    let m;
    if ((m = line.match(/^commit ([0-9a-f]{40})$/))) { commit = m[1].slice(0, 8); commits++; continue; }
    if ((m = line.match(/^Date:\s+(.+)/))) { date = m[1].trim(); continue; }
    if ((m = line.match(/^\+\+\+ b\/(.+)/))) { file = m[1]; continue; }
    if (line[0] !== '+' || line.startsWith('+++')) continue;              // added lines only
    const content = line.slice(1);
    if (/\.lock$|package-lock|pubspec\.lock|yarn\.lock/.test(file)) continue;   // lockfiles = noise
    let hit = SECRET_RE.exec(content), kind = 'secret pattern';
    if (!hit) {
      const tok = (content.match(/[A-Za-z0-9+/=_\-]{32,}/g) || []).find((t) => entropy(t) > 4.3);
      if (tok) { hit = [tok]; kind = 'high-entropy string'; } else continue;
    }
    const red = redact(hit[0]);
    const key = file + '|' + red;
    if (seen.has(key)) continue; seen.add(key);
    findings.push({ commit, date, file, kind, redacted: red });
    if (findings.length >= 50) break;
  }
  let total = 0;
  try { total = parseInt(execFileSync('git', ['-C', projectPath, 'rev-list', '--count', 'HEAD'], { stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000 }).toString().trim(), 10) || 0; } catch {}
  return { scanned: Math.min(total || commits, maxCommits), findings };
}

module.exports = { scanGitSecrets };
