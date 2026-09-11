'use strict';
// Shared outbound messaging for every Mobile DevTools tool: Slack/Telegram notifications + a zero-dep email
// sender (SMTP over net/tls, or Resend/SendGrid/Postmark APIs). Pure functions over plain config
// objects — the caller (team.js) reads each tool's config. No build-helper coupling.
const { httpsRequest, apiGet } = require('./connectors');

// ---------- notifications (Slack / Telegram) — best-effort, never throws ----------
async function notify(n, text) {
  n = n || {};
  try {
    if (n.slackWebhook) {
      const uu = new URL(n.slackWebhook); const b = JSON.stringify({ text });
      await httpsRequest({ method: 'POST', hostname: uu.hostname, path: uu.pathname + uu.search,
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(b) } }, b);
    }
    if (n.telegramToken && n.telegramChatId) {
      const b = JSON.stringify({ chat_id: n.telegramChatId, text });
      await httpsRequest({ method: 'POST', hostname: 'api.telegram.org', path: `/bot${n.telegramToken}/sendMessage`,
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(b) } }, b);
    }
    return { ok: true };
  } catch (e) { return { ok: false, error: e.message }; }
}
const notifyConfigured = (n) => !!(n && (n.slackWebhook || (n.telegramToken && n.telegramChatId)));

// ---------- email ----------
const escH = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const chunk64 = (s) => (String(s).match(/.{1,76}/g) || []).join('\r\n');
// Configured when the ACTIVE mode has what it needs: SMTP host+user, or an API key + From.
function emailConfigured(em) { return !!em && (em.mode === 'api' ? !!(em.apiKey && em.from) : !!(em.host && em.user)); }

// Minimal SMTP client over built-in net/tls (AUTH LOGIN). Recipients incl. bcc; only `to` appears in headers.
function smtpSend(cfg, msg) {
  const net = require('net'); const tls = require('tls');
  const host = cfg.host; const port = parseInt(cfg.port, 10) || 465; const secure = port === 465 || cfg.secure;
  return new Promise((resolve, reject) => {
    if (!host || !cfg.user) return reject(new Error('SMTP not configured'));
    let sock, buf = '', pending = null, timer = null;
    const fail = (e) => { if (timer) clearTimeout(timer); try { sock && sock.destroy(); } catch {} reject(e instanceof Error ? e : new Error(String(e))); };
    const flush = () => { if (!pending) return; const lines = buf.split('\n'); for (let i = 0; i < lines.length; i++) { if (/^\d{3} /.test(lines[i])) { const code = parseInt(lines[i], 10); buf = lines.slice(i + 1).join('\n'); const p = pending; pending = null; if (timer) clearTimeout(timer); if (p.codes.includes(code)) p.resolve(code); else p.reject(new Error('SMTP: ' + lines[i].trim())); return; } } };
    const onData = (d) => { buf += d; flush(); };
    const expect = (codes) => new Promise((res2, rej2) => { pending = { codes, resolve: res2, reject: rej2 }; timer = setTimeout(() => { pending = null; fail(new Error('SMTP timeout')); }, 20000); flush(); });
    const cmd = (s) => sock.write(s + '\r\n');
    const upgrade = () => new Promise((res2) => { const s = tls.connect({ socket: sock, servername: host, rejectUnauthorized: false }, () => res2()); s.setEncoding('utf8'); s.on('data', onData); s.on('error', fail); sock = s; });
    const dotStuff = (m) => m.split(/\r?\n/).map((l) => (l.startsWith('.') ? '.' + l : l)).join('\r\n');
    const converse = async () => {
      await expect([220]);
      cmd('EHLO mobile-devtools'); await expect([250]);
      if (!secure) { cmd('STARTTLS'); await expect([220]); await upgrade(); cmd('EHLO mobile-devtools'); await expect([250]); }
      cmd('AUTH LOGIN'); await expect([334]);
      cmd(Buffer.from(cfg.user).toString('base64')); await expect([334]);
      cmd(Buffer.from(cfg.pass || '').toString('base64')); await expect([235]);
      cmd(`MAIL FROM:<${cfg.from || cfg.user}>`); await expect([250]);
      for (const r of [...(msg.to || []), ...(msg.bcc || [])]) { cmd(`RCPT TO:<${r}>`); await expect([250, 251]); }
      cmd('DATA'); await expect([354]);
      sock.write(dotStuff(msg.mime) + '\r\n.\r\n'); await expect([250]);
      cmd('QUIT'); try { await expect([221]); } catch {}
    };
    if (secure) sock = tls.connect({ host, port, servername: host, rejectUnauthorized: false }); else sock = net.connect(port, host);
    sock.setEncoding('utf8'); sock.on('data', onData); sock.on('error', fail);
    sock.once(secure ? 'secureConnect' : 'connect', () => { converse().then(() => { if (timer) clearTimeout(timer); resolve(true); }).catch(fail); });
  });
}
function buildMime({ from, to, subject, html, text, attachments }) {
  const rel = 'rel_' + Date.now().toString(16), alt = 'alt_' + (Date.now() + 1).toString(16);
  const encSubj = `=?UTF-8?B?${Buffer.from(String(subject || '')).toString('base64')}?=`;
  let m = `From: ${from}\r\nTo: ${(to || []).join(', ')}\r\nSubject: ${encSubj}\r\nMIME-Version: 1.0\r\nContent-Type: multipart/related; boundary="${rel}"\r\n\r\n`;
  m += `--${rel}\r\nContent-Type: multipart/alternative; boundary="${alt}"\r\n\r\n`;
  m += `--${alt}\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${chunk64(Buffer.from(text || '').toString('base64'))}\r\n`;
  m += `--${alt}\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${chunk64(Buffer.from(html || '').toString('base64'))}\r\n--${alt}--\r\n`;
  for (const a of (attachments || [])) {
    m += `--${rel}\r\nContent-Type: ${a.type || 'application/octet-stream'}\r\nContent-Transfer-Encoding: base64\r\n`;
    m += a.cid ? `Content-ID: <${a.cid}>\r\nContent-Disposition: inline; filename="${a.filename || 'image.png'}"\r\n\r\n` : `Content-Disposition: attachment; filename="${a.filename || 'file'}"\r\n\r\n`;
    m += `${chunk64(a.contentBase64 || '')}\r\n`;
  }
  return m + `--${rel}--\r\n`;
}
function emailHtml({ appName, version, description, buttons, footer }) {
  const btn = (b) => `<a href="${escH(b.url)}" style="display:inline-block;background:#5B7CFA;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;font-size:15px;margin:4px 8px 4px 0">${escH(b.label)}</a>`;
  const linkify = (s) => s.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#5B7CFA;text-decoration:underline">$1</a>');
  return `<!doctype html><html><body style="margin:0;background:#f4f5f7;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2430">
  <div style="max-width:560px;margin:0 auto;padding:24px">
    <div style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 14px rgba(0,0,0,.06)">
      <div style="padding:22px 24px;border-bottom:1px solid #eef0f3">
        <div style="font-size:20px;font-weight:700">${escH(appName)}</div>
        ${version ? `<div style="color:#6b7280;font-size:13px;margin-top:3px"><b style="color:#5B7CFA">${escH(version)}</b></div>` : ''}
      </div>
      <div style="padding:22px 24px">
        ${description ? `<div style="font-size:15px;line-height:1.55;white-space:pre-wrap;color:#2b3240">${linkify(escH(description))}</div>` : ''}
        ${buttons && buttons.length ? `<div style="margin:18px 0 4px">${buttons.map(btn).join('')}</div>` : ''}
      </div>
      <div style="padding:14px 24px;border-top:1px solid #eef0f3;color:#9aa4b2;font-size:12px">${escH(footer || 'Sent via Mobile DevTools')}</div>
    </div>
  </div></body></html>`;
}
const emailFrom = (em) => em.fromName ? `${em.fromName} <${em.from || em.user}>` : (em.from || em.user);
async function resendSend(em, msg) {
  const r = await apiGet('https://api.resend.com/emails', { Authorization: `Bearer ${em.apiKey}` }, 'POST', JSON.stringify({
    from: emailFrom(em), to: msg.to, bcc: msg.bcc, subject: msg.subject, html: msg.html, text: msg.text,
  }));
  if (r.status >= 300) throw new Error(`Resend ${r.status}: ${((r.json && (r.json.message || r.json.name)) || r.body || '').toString().slice(0, 200)}`);
}
async function sendgridSend(em, msg) {
  const r = await apiGet('https://api.sendgrid.com/v3/mail/send', { Authorization: `Bearer ${em.apiKey}` }, 'POST', JSON.stringify({
    personalizations: [{ to: msg.to.map((e) => ({ email: e })), bcc: (msg.bcc || []).map((e) => ({ email: e })) }],
    from: { email: em.from || em.user, name: em.fromName || undefined }, subject: msg.subject,
    content: [{ type: 'text/plain', value: msg.text || ' ' }, { type: 'text/html', value: msg.html }],
  }));
  if (r.status >= 300) throw new Error(`SendGrid ${r.status}: ${(r.body || '').toString().slice(0, 200)}`);
}
async function postmarkSend(em, msg) {
  const r = await apiGet('https://api.postmarkapp.com/email', { 'X-Postmark-Server-Token': em.apiKey }, 'POST', JSON.stringify({
    From: emailFrom(em), To: msg.to.join(', '), Bcc: (msg.bcc || []).join(', '), Subject: msg.subject,
    HtmlBody: msg.html, TextBody: msg.text || ' ', MessageStream: 'outbound',
  }));
  if (r.status >= 300) throw new Error(`Postmark ${r.status}: ${((r.json && r.json.Message) || r.body || '').toString().slice(0, 200)}`);
}
// Recipients ride on BCC (to = from) so lists stay private, matching the SMTP path.
async function sendEmail(em, msg) {
  if (em.mode === 'api') {
    if (em.provider === 'sendgrid') return sendgridSend(em, msg);
    if (em.provider === 'postmark') return postmarkSend(em, msg);
    return resendSend(em, msg);
  }
  const from = em.fromName ? `"${em.fromName}" <${em.from || em.user}>` : (em.from || em.user);
  const mime = buildMime({ from, to: msg.to, subject: msg.subject, html: msg.html, text: msg.text, attachments: msg.attachments });
  return smtpSend(em, { to: msg.to, bcc: msg.bcc, mime });
}
// Send a self-test email to the From address; returns {ok, out}|{ok:false, error}. Never throws.
async function emailTest(em, toolName) {
  try {
    if (!emailConfigured(em)) return { ok: false, error: em && em.mode === 'api' ? 'Add an API key + From address, then Save.' : 'Configure SMTP (host + user), then Save.' };
    const to = em.from || em.user;
    const label = em.mode === 'api' ? (em.provider || 'API') : 'SMTP';
    const html = emailHtml({ appName: toolName || 'Mobile DevTools', version: `${label} test`, description: `Your ${label} email is configured correctly ✅`, buttons: [], footer: 'Mobile DevTools' });
    await sendEmail(em, { to: [to], bcc: [], subject: `${toolName || 'Mobile DevTools'} — ${label} test`, html, text: 'Email test OK' });
    return { ok: true, out: 'Test email sent to ' + to };
  } catch (e) { return { ok: false, error: e.message }; }
}

module.exports = {
  notify, notifyConfigured, emailConfigured, sendEmail, emailTest, emailHtml, buildMime, smtpSend, escH,
};
