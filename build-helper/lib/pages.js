'use strict';
// Server-generated pages for testers: the install/share page and the iOS ad-hoc manifest.
const path = require('path');
const { PORT, esc } = require('./state');
const { lanIp } = require('./project');

// ---------- install / share page (+ iOS ad-hoc manifest) ----------
function installPage(p) {
  const name = path.basename(p);
  const lan = `http://${lanIp()}:${PORT}`;
  const dl = `${lan}/artifact?path=${encodeURIComponent(p)}`;
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(p.endsWith('.ipa') ? 'itms-services://?action=download-manifest&url=' + encodeURIComponent(`${lan}/manifest.plist?path=${encodeURIComponent(p)}`) : dl)}`;
  const isIpa = p.endsWith('.ipa');
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Install ${name}</title>
<style>body{font:15px system-ui;margin:0;background:#0b0f19;color:#e7eaf1;display:grid;place-items:center;min-height:100vh}.c{background:#131a2a;border:1px solid #1f2a44;border-radius:20px;padding:28px;max-width:340px;text-align:center}img{border-radius:12px;background:#fff;padding:8px}a.btn{display:block;margin-top:16px;background:#10b981;color:#04231a;text-decoration:none;padding:12px;border-radius:12px;font-weight:700}.note{color:#93a0b8;font-size:12px;margin-top:14px}</style>
<div class="c"><div style="font-weight:700;font-size:18px;word-break:break-all">${esc(name)}</div>
<img src="${qr}" width="200" height="200" alt="QR"><br>
${isIpa ? `<a class="btn" href="itms-services://?action=download-manifest&url=${encodeURIComponent(`${lan}/manifest.plist?path=${encodeURIComponent(p)}`)}">Install on iPhone</a><div class="note">iOS ad-hoc install requires the device to be in the provisioning profile <b>and an HTTPS URL</b> — over plain LAN HTTP iOS will refuse it (use an HTTPS tunnel).</div>` :
  `<a class="btn" href="${dl}">Download &amp; install</a><div class="note">On Android, open this page on the phone (same Wi-Fi) and allow install from unknown sources.</div>`}
</div>`;
}
function manifestPlist(p) {
  const lan = `http://${lanIp()}:${PORT}`;
  const url = `${lan}/artifact?path=${encodeURIComponent(p)}`;
  const bundle = 'com.example.app', ver = (path.basename(p).match(/(\d+\.\d+\.\d+)/) || [, '1.0.0'])[1];
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict><key>items</key><array><dict>
<key>assets</key><array><dict><key>kind</key><string>software-package</string><key>url</key><string>${url}</string></dict></array>
<key>metadata</key><dict><key>bundle-identifier</key><string>${bundle}</string><key>bundle-version</key><string>${ver}</string><key>kind</key><string>software</string><key>title</key><string>${path.basename(p)}</string></dict>
</dict></array></dict></plist>`;
}

module.exports = { installPage, manifestPlist };
