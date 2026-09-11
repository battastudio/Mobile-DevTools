'use strict';
// OWASP Mobile M10 — Insufficient Cryptography. Broken ciphers/hashes and non-crypto randomness
// used for security-sensitive values.
const { grepLib, fmtHits } = require('../files');

module.exports = [
  { id: 'weak-crypto', title: 'Weak / broken cryptography', category: 'Cryptography', owasp: 'M10', severity: 'med',
    fix: 'Replace MD5/SHA1 with SHA-256+ for integrity; replace DES/RC4/ECB with AES-GCM (authenticated). Never use ECB mode. Use a vetted crypto package, not hand-rolled ciphers.',
    scenario: 'Data protected with MD5/SHA1/DES/RC4 or AES-ECB is broken offline (collisions, known-plaintext, block patterns), so "encrypted" local data or signatures give no real protection.',
    run(ctx) {
      const hits = grepLib(ctx, /\b(md5|sha1)\b|DES\b|\bRC4\b|AES\/ECB|ECB\b|Cipher\.getInstance\(\s*['"]DES/i);
      if (hits.length) return { status: 'fail', evidence: 'Weak crypto primitives referenced:\n' + fmtHits(hits) };
      return { status: 'ok', evidence: 'No MD5/SHA1/DES/RC4/ECB usage found.' };
    } },
  { id: 'insecure-random', title: 'Insecure randomness for tokens / OTP', category: 'Cryptography', owasp: 'M10', severity: 'low',
    fix: "Use Random.secure() (Dart) for anything security-relevant — OTPs, tokens, nonces, salts. Plain Random() is predictable.",
    scenario: 'Tokens/OTPs generated with non-crypto Random() are predictable; an attacker who observes a few values can reproduce the PRNG stream and forge the next token.',
    run(ctx) {
      const hits = grepLib(ctx, /\bRandom\(\)/).filter((h) => /token|otp|nonce|salt|secret|code/i.test(h.text));
      if (hits.length) return { status: 'warn', evidence: 'Non-secure Random() near security-sensitive values (use Random.secure()):\n' + fmtHits(hits) };
      return { status: 'ok', evidence: 'No insecure Random() near tokens/OTP.' };
    } },
];
