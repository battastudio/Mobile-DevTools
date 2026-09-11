'use strict';
// Optional AI routes (off by default — a local key configured in Settings enables them): explain a
// finding, deep-scan for issues the static checks miss, propose a fix patch, threat-model, and an
// executive risk briefing. Controllers only — prompt-building here, the API call is in the kit.
const TOOL_ID = 'mobile-security';

module.exports = function registerAiRoutes(app, { scan, kit }) {
  const { ai } = kit;
  const J = app.sendJson;

  app.r('GET', '/api/security/ai/config', ({ res }) => J(res, 200, ai.aiConfig(TOOL_ID)));
  app.r('POST', '/api/security/ai/config', ({ res, body }) => J(res, 200, ai.setAiConfig(TOOL_ID, body)), { body: true });
  app.r('POST', '/api/security/ai/config/test', ({ res }) => ai.testAI(TOOL_ID).then((x) => J(res, 200, x)));

  app.r('POST', '/api/security/ai/explain', ({ res, body }) => {
    const rec = scan.securityData(body.path); const f = (rec.findings || []).find((x) => x.id === body.findingId);
    if (!f) return J(res, 400, { error: 'finding not found (scan first)' });
    const prompt = `You are a senior application security engineer. Explain this finding to a developer and give a concrete, minimal fix. Be specific and practical.\n\nFinding: ${f.title}\nCategory: ${f.category} (${f.owasp || ''}, severity ${f.severity})\nAttack scenario: ${f.scenario || ''}\nEvidence:\n${f.evidence || ''}\nExisting remediation note: ${f.fix || ''}\n\nRespond with: 1) Why this is a risk (2-3 sentences), 2) The concrete fix (code/config), 3) How to verify it's fixed.`;
    ai.callAI(TOOL_ID, prompt, { maxTokens: 1500 }).then((x) => J(res, 200, x)).catch((e) => J(res, 400, { error: e.message }));
  }, { body: true });

  // AI deep scan — surface issues the static checks miss; folded into findings (count toward the grade).
  app.r('POST', '/api/security/ai/deep-scan', ({ res, body }) => {
    const rec = scan.securityData(body.path); if (!rec || rec.scanned === false) return J(res, 400, { error: 'Scan the app first.' });
    let actx; try { actx = scan.aiContext(body.path); } catch (e) { return J(res, 400, { error: e.message }); }
    const system = 'You are a senior mobile application security engineer reviewing a Flutter app. Find real, high-signal security issues and impactful bugs that simple regex scanners miss (insecure data flow, auth/session logic, injection, unsafe platform channels, crypto misuse, WebView bridge abuse, IDOR in API calls, hardcoded logic). Respond with STRICT JSON only — no prose, no markdown fences.';
    const prompt = `Return a JSON array (max 12) of NEW issues not already listed. Each item: {"title": str, "category": str, "owasp": "M1".."M10" or "", "severity": "crit"|"high"|"med"|"low"|"info", "evidence": str (file + short snippet/why), "fix": str (concrete remediation), "confidence": int 0-100}. Only include issues you are reasonably confident are real. If none, return [].\n\nApp type: ${actx.type}\nAlready reported (do NOT repeat): ${actx.alreadyFound.join('; ') || 'none'}\n\npubspec deps:\n${actx.deps}\n\nAndroidManifest (excerpt):\n${actx.manifest}\n\nInfo.plist (excerpt):\n${actx.plist}\n\nDart source (truncated):\n${actx.code}`;
    ai.callAI(TOOL_ID, prompt, { system, maxTokens: 3000, temperature: 0.2 })
      .then((out) => {
        const m = (out.text || '').match(/\[[\s\S]*\]/);
        let arr = []; try { arr = m ? JSON.parse(m[0]) : []; } catch { arr = []; }
        J(res, 200, { record: scan.mergeAiFindings(body.path, Array.isArray(arr) ? arr : []), added: Array.isArray(arr) ? arr.length : 0, model: out.model });
      }).catch((e) => J(res, 400, { error: e.message }));
  }, { body: true });

  // AI fix patch — a concrete code diff for one finding.
  app.r('POST', '/api/security/ai/patch', ({ res, body }) => {
    const rec = scan.securityData(body.path); const f = (rec.findings || []).find((x) => x.id === body.findingId);
    if (!f) return J(res, 400, { error: 'finding not found (scan first)' });
    const ctx = scan.patchContext(body.path, f);
    const prompt = `You are a senior application security engineer. Output ONLY a concrete fix as a unified diff (\`\`\`diff fenced) or exact before/after code — no explanation, no prose. Fix this finding minimally and safely.\n\nFinding: ${f.title}\nCategory: ${f.category} (${f.owasp || ''}, severity ${f.severity})\nEvidence:\n${f.evidence || ''}\nSuggested remediation: ${f.fix || ''}\n${ctx.file ? `\nFile: ${ctx.file}${ctx.line ? ' (around line ' + ctx.line + ')' : ''}\n${ctx.snippet ? '```\n' + ctx.snippet + '\n```' : ''}` : ''}`;
    ai.callAI(TOOL_ID, prompt, { maxTokens: 1500, temperature: 0.1 }).then((x) => J(res, 200, x)).catch((e) => J(res, 400, { error: e.message }));
  }, { body: true });

  // AI threat model (STRIDE) grounded in the scan.
  app.r('POST', '/api/security/ai/threat-model', ({ res, body }) => {
    const rec = scan.securityData(body.path); if (!rec || rec.scanned === false) return J(res, 400, { error: 'Scan the app first.' });
    const fails = (rec.findings || []).filter((x) => x.status === 'fail');
    const surface = (rec.findings || []).filter((x) => /webview|deep-link|exported|cleartext|intent/i.test(x.id)).map((x) => x.title);
    const prompt = `You are a senior mobile application security engineer. Produce a concise STRIDE threat model for the app "${rec.name}" (${rec.type}). Use markdown with these sections: **Assets**, **Entry points / attack surface**, then a table with columns | STRIDE | Threat | Related finding | Mitigation | covering Spoofing, Tampering, Repudiation, Information disclosure, Denial of service, Elevation of privilege; end with a short **Fix-first** list. Ground it in the scan.\n\nGrade ${rec.grade.letter} ${rec.grade.score}/100.\nAttack surface signals: ${surface.join('; ') || 'n/a'}\nFailing findings:\n${fails.slice(0, 40).map((f) => `- [${f.severity}] ${f.title} (${f.owasp || ''})`).join('\n') || 'none'}`;
    ai.callAI(TOOL_ID, prompt, { maxTokens: 2500, temperature: 0.3 }).then((x) => J(res, 200, x)).catch((e) => J(res, 400, { error: e.message }));
  }, { body: true });

  // AI executive risk briefing (read-only, from current findings).
  app.r('POST', '/api/security/ai/summary', ({ res, body }) => {
    const rec = scan.securityData(body.path); if (!rec || rec.scanned === false) return J(res, 400, { error: 'Scan the app first.' });
    const fails = (rec.findings || []).filter((f) => f.status === 'fail');
    const list = fails.slice(0, 40).map((f) => `- [${f.severity}] ${f.title}${f.owasp ? ' (' + f.owasp + ')' : ''}`).join('\n');
    const prompt = `You are a senior application security engineer. Give a concise executive risk briefing for the mobile app "${rec.name}" (grade ${rec.grade?.letter} ${rec.grade?.score}/100, ${fails.length} failing checks). Cover: 1) overall posture in 2 sentences, 2) the top 3 risks and their business impact, 3) a prioritized fix-first order (what to fix this week). Be specific and practical; use short markdown.\n\nFailing checks:\n${list || 'none'}`;
    ai.callAI(TOOL_ID, prompt, { maxTokens: 1200, temperature: 0.4 }).then((x) => J(res, 200, x)).catch((e) => J(res, 400, { error: e.message }));
  }, { body: true });
};
