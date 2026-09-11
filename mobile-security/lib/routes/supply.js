'use strict';
// Supply-chain + export routes: SBOM, OSV dependency CVEs, git-history secret scan, SARIF/JSON
// export for CI, a grade badge SVG, and the fleet heatmap. Controllers only.
const { buildSbom } = require('../sbom');
const { osvScan } = require('../osv');
const { scanGitSecrets } = require('../gitsecrets');

module.exports = function registerSupplyRoutes(app, { scan }) {
  const J = app.sendJson;

  app.r('GET', '/api/security/sbom', ({ res, q }) => { try { J(res, 200, buildSbom(q.get('path'))); } catch (e) { J(res, 400, { error: e.message }); } });
  // Dependency CVE lookup (OSV) — real advisories + fixed-in versions.
  app.r('GET', '/api/security/vulns', ({ res, q }) => { let sb; try { sb = buildSbom(q.get('path')); } catch (e) { return J(res, 400, { error: e.message }); } osvScan(sb.deps).then((x) => J(res, 200, { total: sb.count, ...x })).catch((e) => J(res, 200, { error: e.message, deps: [] })); });
  // Git-history secret scan (TruffleHog-style).
  app.r('GET', '/api/security/git-secrets', ({ res, q }) => { try { J(res, 200, scanGitSecrets(q.get('path'))); } catch (e) { J(res, 200, { error: e.message, findings: [] }); } });

  // Export findings for CI / code scanning: SARIF 2.1.0 or raw JSON (download).
  app.r('GET', '/api/security/export', ({ res, q }) => {
    const rec = scan.securityData(q.get('path')); if (!rec || rec.scanned === false) return J(res, 400, { error: 'Scan the project first.' });
    const fmt = (q.get('fmt') || 'json').toLowerCase();
    const data = fmt === 'sarif' ? scan.securitySarif(rec) : (rec.findings || []);
    res.writeHead(200, { 'Content-Type': 'application/json', 'Content-Disposition': `attachment; filename="${(rec.name || 'security')}.${fmt}.json"` });
    res.end(JSON.stringify(data, null, 2));
  });

  app.r('GET', '/api/security/fleet', ({ res }) => J(res, 200, { apps: scan.fleetData() }));

  // Grade badge (SVG) for README / CI.
  app.r('GET', '/api/security/badge', ({ res, q }) => {
    const rec = scan.securityData(q.get('path')); const g = (rec && rec.grade) || null;
    const letter = g ? g.letter : '?', score = g ? g.score : 0;
    const color = !g ? '#6a7285' : ({ A: '#34c77b', B: '#34c77b', C: '#f5b342', D: '#f0803c', F: '#f0556a' }[letter] || '#6a7285');
    const right = g ? `${letter} ${score}/100` : 'no scan';
    const rw = 8 + right.length * 7, w = 66 + rw;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="20" role="img" aria-label="security: ${right}"><linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient><rect rx="3" width="${w}" height="20" fill="#555"/><rect rx="3" x="66" width="${rw}" height="20" fill="${color}"/><rect rx="3" width="${w}" height="20" fill="url(#s)"/><g fill="#fff" text-anchor="middle" font-family="Verdana,DejaVu Sans,sans-serif" font-size="11"><text x="33" y="14">security</text><text x="${66 + rw / 2}" y="14" font-weight="bold">${right}</text></g></svg>`;
    res.writeHead(200, { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.end(svg);
  });
};
