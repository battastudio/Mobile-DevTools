'use strict';
// Build-helper messaging: a thin layer over the shared kit messaging (Slack/Telegram + email).
// Kit owns the SMTP client, email API providers, and HTML template. This file keeps only the
// build-helper-specific bits: reading config for notify(), and the per-repo client email groups.
// ponytail: groups are LOCAL only now (email-groups.json under the data dir). The internal build
// rclone-synced them across the team; re-add a shared-folder push/merge here to restore that.
const fs = require('fs');
const path = require('path');
const { CREDS_DIR, readConfig, sendJson } = require('./state');
const kit = require('../../platform-kit').messaging;

const emailConfigured = kit.emailConfigured;

// Slack/Telegram notification for a build event (best-effort; reads this tool's notify config).
function notify(text) { return kit.notify(readConfig().notify || {}, text); }

// Per-app client email groups: one local JSON, keyed by repo.
const GROUPS_FILE = path.join(CREDS_DIR, 'email-groups.json');
function readGroups() { try { return JSON.parse(fs.readFileSync(GROUPS_FILE, 'utf8')); } catch { return {}; } }
function handleGroupsSave(res, body) {
  try {
    const repo = (body.repo || '').trim(); if (!repo) throw new Error('repo required');
    const groups = (body.groups || []).map((g) => ({ name: String(g.name || '').trim() || 'Group', emails: [...new Set((g.emails || []).map((e) => String(e).trim().toLowerCase()).filter((e) => /.+@.+\..+/.test(e)))] })).filter((g) => g.emails.length || g.name !== 'Group');
    const all = readGroups();
    all[repo] = groups;
    fs.mkdirSync(CREDS_DIR, { recursive: true });
    fs.writeFileSync(GROUPS_FILE, JSON.stringify(all, null, 2));
    return sendJson(res, 200, { ok: true, groups });
  } catch (e) { return sendJson(res, 400, { error: e.message }); }
}
function handleEmailTest(res) { kit.emailTest(readConfig().email || {}, 'Build Helper').then((r) => sendJson(res, 200, r)); }

// Send a build announcement to picked groups + extra addresses (recipients ride BCC for privacy).
async function handleEmailSend(req, res, body) {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  const send = (e, d) => res.write(`event: ${e}\ndata: ${JSON.stringify(d)}\n\n`);
  const log = (line) => send('log', { line });
  try {
    const em = readConfig().email; if (!emailConfigured(em)) throw new Error('Email not configured (Setup → Email).');
    const repo = body.repo || ''; const all = readGroups(); const groupsForApp = [...(all['*'] || []), ...(all[repo] || [])];
    let recips = [];
    for (const name of (body.groups || [])) { const g = groupsForApp.find((x) => x.name === name); if (g) recips.push(...g.emails); }
    for (const e of String(body.extra || '').split(/[\s,;]+/)) { if (/.+@.+\..+/.test(e)) recips.push(e.trim().toLowerCase()); }
    recips = [...new Set(recips.map((e) => e.toLowerCase()))];
    if (!recips.length) throw new Error('No recipients — pick a group or add emails.');
    const html = kit.emailHtml({ appName: body.appName || repo, version: body.version || '', description: body.description || '', buttons: (body.buttons || []).filter((b) => b && b.url), footer: `Sent by ${em.fromName || em.from || em.user} · Build Helper` });
    const fromAddr = em.from || em.user;
    send('step', { text: `Sending to ${recips.length} recipient(s) (BCC)…` });
    await kit.sendEmail(em, { to: [fromAddr], bcc: recips, subject: body.subject || `${body.appName || repo} ${body.version || ''}`, html, text: body.description || '' });
    log(`✓ emailed ${recips.length} recipient(s)`); send('done', { ok: true, count: recips.length });
  } catch (e) { send('error', { message: e.message }); }
  res.end();
}

module.exports = { notify, emailConfigured, GROUPS_FILE, readGroups, handleGroupsSave, handleEmailTest, handleEmailSend };
