'use strict';
// Dependency CVE lookup via OSV (osv.dev) — free, no API key. Stdlib https only.
const https = require('https');

function httpsJson(method, urlStr, body) {
  return new Promise((resolve) => {
    let u; try { u = new URL(urlStr); } catch { return resolve({ error: 'bad url' }); }
    const payload = body ? JSON.stringify(body) : null;
    const headers = { Accept: 'application/json' };
    if (payload) { headers['Content-Type'] = 'application/json'; headers['Content-Length'] = Buffer.byteLength(payload); }
    const req = https.request({ method, hostname: u.hostname, path: u.pathname + u.search, headers }, (res) => {
      let b = ''; res.on('data', (c) => (b += c));
      res.on('end', () => { try { resolve(JSON.parse(b)); } catch { resolve({ error: 'bad response' }); } });
    });
    req.on('error', (e) => resolve({ error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ error: 'timeout' }); });
    req.setTimeout(15000);
    if (payload) req.write(payload);
    req.end();
  });
}

const ECO = { npm: 'npm', composer: 'Packagist', pub: 'Pub' };
const isConcrete = (v) => /^\d+(\.\d+)*/.test(String(v || '').trim());
// Highest severity label from an OSV vuln.
function sevOf(v) {
  const ds = (v.database_specific && (v.database_specific.severity || v.database_specific.cvss)) || '';
  if (/crit/i.test(ds)) return 'crit'; if (/high/i.test(ds)) return 'high'; if (/mod|med/i.test(ds)) return 'med'; if (/low/i.test(ds)) return 'low';
  // fall back to CVSS score in severity[]
  const score = (v.severity || []).map((s) => parseFloat((s.score || '').match(/\d+(\.\d+)?/)?.[0] || '')).filter((n) => !isNaN(n)).sort((a, b) => b - a)[0];
  if (score == null) return 'info';
  return score >= 9 ? 'crit' : score >= 7 ? 'high' : score >= 4 ? 'med' : 'low';
}
// First "fixed" version across the vuln's affected ranges (any package).
function fixedOf(v) {
  for (const a of v.affected || []) for (const r of a.ranges || []) for (const e of r.events || []) if (e.fixed) return e.fixed;
  return '';
}

// deps: [{ecosystem,name,version}] → { checked, skipped, vulnerable, deps:[{name,ecosystem,version,vulns:[...]}] }.
async function osvScan(deps) {
  const q = (deps || []).map((d) => ({ d, eco: ECO[d.ecosystem] })).filter((x) => x.eco && isConcrete(x.d.version));
  const skipped = (deps || []).length - q.length;
  if (!q.length) return { checked: 0, skipped, vulnerable: 0, deps: [] };
  const batch = await httpsJson('POST', 'https://api.osv.dev/v1/querybatch', {
    queries: q.map((x) => ({ package: { name: x.d.name, ecosystem: x.eco }, version: String(x.d.version).trim() })),
  });
  if (batch.error || !Array.isArray(batch.results)) return { error: batch.error || 'OSV unavailable', checked: q.length, skipped, vulnerable: 0, deps: [] };
  // collect unique vuln ids (bounded)
  const ids = new Set();
  batch.results.forEach((r) => (r.vulns || []).forEach((v) => ids.size < 60 && ids.add(v.id)));
  const detail = {};
  for (const id of ids) { const v = await httpsJson('GET', `https://api.osv.dev/v1/vulns/${encodeURIComponent(id)}`); if (v && !v.error) detail[id] = v; }
  const out = [];
  q.forEach((x, i) => {
    const vulns = ((batch.results[i] || {}).vulns || []).map((ref) => {
      const v = detail[ref.id] || {};
      return { id: ref.id, severity: sevOf(v), summary: (v.summary || (v.details || '').split('\n')[0] || '').slice(0, 200), fixed: fixedOf(v), url: `https://osv.dev/vulnerability/${ref.id}` };
    });
    if (vulns.length) out.push({ name: x.d.name, ecosystem: x.d.ecosystem, version: x.d.version, vulns });
  });
  out.sort((a, b) => b.vulns.length - a.vulns.length);
  return { checked: q.length, skipped, vulnerable: out.length, deps: out };
}

module.exports = { osvScan };
