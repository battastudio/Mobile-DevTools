'use strict';
// Post-build hook into the standalone Mobile Security tool: POST /api/security/scan (SSE). We consume
// it to completion, log the final grade, and give up quietly if the tool isn't reachable. Never fatal.
const http = require('http');
const { readConfig } = require('../state');

function triggerSecurityScan(projectPath, log) {
  return new Promise((resolve) => {
    let base; try { base = readConfig().securityUrl || process.env.SECURITY_URL || 'http://localhost:4110'; } catch { base = 'http://localhost:4110'; }
    let u; try { u = new URL(base + '/api/security/scan'); } catch { log('⚠ security scan skipped (bad securityUrl)'); return resolve(); }
    const payload = JSON.stringify({ path: projectPath });
    const req = http.request(u, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }, timeout: 120000 }, (res) => {
      let buf = '';
      res.on('data', (c) => { buf += c; });
      res.on('end', () => {
        const m = /event: result\ndata: (.+)/.exec(buf);
        try { const g = m && JSON.parse(m[1]).record.grade; if (g) log(`▸ Security: grade ${g.letter} (${g.score}/100) — ${g.counts.fail || 0} failing. Open the Security tool.`); else log('▸ Security scan complete.'); } catch { log('▸ Security scan complete.'); }
        resolve();
      });
    });
    req.on('timeout', () => { req.destroy(); log('⚠ security scan timed out (non-fatal)'); resolve(); });
    req.on('error', () => { log('⚠ Security tool not reachable — start it (or enable it in the hub) to scan after builds.'); resolve(); });
    req.end(payload);
  });
}

module.exports = { triggerSecurityScan };
