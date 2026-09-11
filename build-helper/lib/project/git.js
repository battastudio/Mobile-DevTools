'use strict';
// Git metadata for a project (commit info, branches, changelog range), conventional-commit
// grouping, the tool's own self-version, the local build changelog, and the local build record.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { ROOT, BUILDS_JSON, CHANGELOGS_DIR, readJson, readConfig } = require('../state');
const { share } = require('../../../platform-kit');

// Build a web URL to a commit from a git remote (github/gitlab/bitbucket, https or ssh).
function commitUrl(remote, sha) {
  if (!remote || !sha) return null;
  let base = remote.replace(/\.git$/, '').replace(/^git@([^:]+):/, 'https://$1/').replace(/^ssh:\/\/git@/, 'https://');
  if (!/^https?:\/\//.test(base)) return null;
  if (/gitlab/.test(base)) return `${base}/-/commit/${sha}`;
  if (/bitbucket/.test(base)) return `${base}/commits/${sha}`;
  return `${base}/commit/${sha}`; // github + default
}
// Canonical project name = the git repo name (origin slug, minus .git), else the folder name.
function repoName(projectPath) {
  try {
    const remote = execFileSync('git', ['-C', projectPath, 'remote', 'get-url', 'origin'], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    const slug = remote.replace(/\.git$/, '').replace(/[/]+$/, '').split(/[/:]/).filter(Boolean).pop();
    if (slug) return slug;
  } catch {}
  return path.basename(projectPath);
}
// Last commit (short sha, subject, date, author, web url) of a branch (or current HEAD). null on failure.
function gitLastCommit(projectPath, branch) {
  try {
    const out = execFileSync('git', ['-C', projectPath, 'log', '-1', '--format=%h%x09%s%x09%cs%x09%an', branch || 'HEAD'], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    const [sha, subject, date, author] = out.split('\t');
    if (!sha) return null;
    let url = null; try { const remote = execFileSync('git', ['-C', projectPath, 'remote', 'get-url', 'origin'], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); url = commitUrl(remote, sha); } catch {}
    return { sha, subject: subject || '', date: date || '', author: author || '', url, branch: branch || null };
  } catch { return null; }
}
function gitBranches(projectPath) {
  try {
    const cur = execFileSync('git', ['-C', projectPath, 'rev-parse', '--abbrev-ref', 'HEAD']).toString().trim();
    const all = execFileSync('git', ['-C', projectPath, 'branch', '--format=%(refname:short)']).toString().split('\n').map((s) => s.trim()).filter(Boolean);
    return { current: cur, branches: all, lastCommit: gitLastCommit(projectPath) };
  } catch { return { current: null, branches: [], lastCommit: null }; }
}
function gitChangelog(projectPath, env) {
  const last = readJson(BUILDS_JSON, []).find((b) => b.path === projectPath && b.env === env && b.commit);
  const range = last ? `${last.commit}..HEAD` : '-20';
  try { return execFileSync('git', ['-C', projectPath, 'log', range, '--pretty=- %s'], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return ''; }
}
// Group commit subjects by conventional-commit type (feat/fix/…) into a tidy "What's new".
function groupConventional(text) {
  const lines = String(text || '').split('\n').map((l) => l.replace(/^-\s*/, '').trim()).filter(Boolean);
  if (!lines.length) return '';
  const order = ['feat', 'fix', 'perf', 'refactor', 'docs', 'style', 'test', 'build', 'ci', 'chore', 'revert', 'other'];
  const titles = { feat: '✨ Features', fix: '🐛 Fixes', perf: '⚡ Performance', refactor: '♻️ Refactors', docs: '📝 Docs', style: '🎨 Style', test: '✅ Tests', build: '📦 Build', ci: '🔧 CI', chore: '🔧 Chores', revert: '⏪ Reverts', other: '• Other' };
  const buckets = {}; for (const k of order) buckets[k] = [];
  for (const l of lines) { const m = l.match(/^(\w+)(?:\([^)]*\))?!?:\s*(.+)$/); const t = m && buckets[m[1].toLowerCase()] ? m[1].toLowerCase() : 'other'; buckets[t].push(m ? m[2] : l); }
  const out = [];
  for (const k of order) { if (buckets[k].length) { out.push(titles[k] + ':'); for (const s of buckets[k]) out.push('- ' + s); out.push(''); } }
  return out.join('\n').trim();
}

// ---------- the tool's own version + profile ----------
let _fetchAt = 0;
function bustVersionCache() { _fetchAt = 0; }
function toolVersion() {
  const git = (args) => { try { return execFileSync('git', ['-C', ROOT, ...args], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return ''; } };
  const current = git(['rev-parse', '--short', 'HEAD']) || 'unknown';
  const currentDate = git(['log', '-1', '--format=%cd', '--date=short']);
  if (Date.now() - _fetchAt > 60000) { try { execFileSync('git', ['-C', ROOT, 'fetch', '--quiet', 'origin'], { stdio: 'ignore', timeout: 15000 }); } catch {} _fetchAt = Date.now(); }
  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']) || 'main';
  const behind = parseInt(git(['rev-list', '--count', `HEAD..origin/${branch}`]) || '0', 10);
  const latest = git(['rev-parse', '--short', `origin/${branch}`]);
  return { current, currentDate, branch, behind, latest, updateAvailable: behind > 0 };
}
function profileName() {
  const cfg = readConfig();
  if (cfg.profile && cfg.profile.name) return cfg.profile.name;
  try { const n = execFileSync('git', ['-C', ROOT, 'config', 'user.name'], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); if (n) return n; } catch {}
  return os.userInfo().username;
}

// ---------- local build history + changelog (single-user; no cross-user cloud sync) ----------
// ponytail: removed the old OneDrive `_team/*.jsonl` cross-user sync — this pushes to the kit's
// LOCAL activity feed (shown at GET /api/team). To re-add team sync, rclone-copy a compacted
// record up to a shared folder here and merge on read, as the internal build did.
function pushTeamRecord(record) {
  try {
    share.pushRecord('build-helper', {
      kind: record.buildOk === false ? 'build-failed' : 'build', project: record.repo || record.project, env: record.env,
      version: record.version, buildOk: record.buildOk !== false, artifacts: (record.artifacts || []).map((a) => a.name), path: record.path || null,
    }, { by: record.by, now: record.time });
  } catch {}
}
function appendChangelog(app, version, whatsNew, dateStr) {
  if (!whatsNew) return;
  fs.mkdirSync(CHANGELOGS_DIR, { recursive: true });
  const file = path.join(CHANGELOGS_DIR, `${app.name}.md`);
  const header = `# ${app.name} — changelog\n\n`;
  const entry = `## ${version} — ${dateStr}\n\n${whatsNew}\n\n`;
  const prev = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : header;
  const body = prev.startsWith(header) ? prev.slice(header.length) : prev;
  fs.writeFileSync(file, header + entry + body); // newest first
}

module.exports = { commitUrl, repoName, gitLastCommit, gitBranches, gitChangelog, groupConventional, toolVersion, bustVersionCache, profileName, pushTeamRecord, appendChangelog };
