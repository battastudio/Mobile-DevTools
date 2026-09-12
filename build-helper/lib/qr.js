'use strict';
// Same-origin QR proxy. The share-card <canvas> can't drawImage a cross-origin QR without tainting
// the canvas (blocks toDataURL), so we pipe the PNG through our own origin. Binary-safe: kit.fetchUrl
// returns decoded text, so we stream raw bytes here instead.
// ponytail: proxies api.qrserver.com — swap for a local zero-dep QR encoder if offline use matters.
const https = require('https');

function proxyQr(res, text, size) {
  if (!text) { res.writeHead(400); return res.end('missing text'); }
  const s = Math.min(Math.max(parseInt(size, 10) || 220, 60), 600);
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=${s}x${s}&margin=0&data=${encodeURIComponent(text)}`;
  https.get(url, (r) => {
    if (r.statusCode !== 200) { r.resume(); res.writeHead(502); return res.end(); }
    res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' });
    r.pipe(res);
  }).on('error', () => { res.writeHead(502); res.end(); });
}

module.exports = { proxyQr };
