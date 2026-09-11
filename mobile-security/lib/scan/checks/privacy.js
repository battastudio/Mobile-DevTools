'use strict';
// OWASP Mobile M6/M9 — Inadequate Privacy Controls. PII leaking via session-replay SDKs, logs,
// keyboard cache, or the system clipboard.
const { grepLib, libHas, fmtHits } = require('../files');

const FIX_MASKING = 'Wrap card/CVV/password fields in the replay SDK mask (e.g. ClarityMask(child: TextField(...))) so PII is not captured.';
const FIX_CLIPBOARD = 'Do not copy passwords/OTPs/tokens to the clipboard. If a copy affordance is required, clear it shortly after (Clipboard.setData("")) and warn the user; prefer autofill/paste-free flows for secrets.';

module.exports = [
  { id: 'replay-masking', title: 'Session-replay SDK without field masking', category: 'Privacy', owasp: 'M6', severity: 'med',
    scenario: 'A session-replay SDK records the screen; without masking it captures card numbers, CVV, and passwords as the user types, then ships that PII to a third-party dashboard.',
    run(ctx) {
      const replay = /clarity_flutter|sentry_flutter|smartlook|fullstory/.test(ctx.pubspec);
      if (!replay) return { status: 'na', evidence: 'No session-replay SDK.' };
      const sensitive = grepLib(ctx, /cvv|card_?number|cardNumber|password/i).filter((h) => /TextField|TextFormField|TextInput/i.test(h.text));
      const masked = libHas(ctx, /ClarityMask|maskAllInputs|masking/i);
      if (masked && !sensitive.length) return { status: 'ok', evidence: 'Masking widget in use.' };
      if (sensitive.length && !masked) return { status: 'warn', evidence: 'Replay SDK present; card/CVV/password fields may be captured unmasked:\n' + fmtHits(sensitive), fix: FIX_MASKING };
      return { status: 'ok', evidence: 'Replay SDK present with masking.' };
    } },
  { id: 'secrets-in-logs', title: 'Sensitive data written to logs', category: 'Privacy', owasp: 'M6', severity: 'med',
    fix: 'Never print tokens/passwords/PII. Strip debug logging from release (kReleaseMode guard) and scrub sensitive fields before logging.',
    scenario: 'print()/log() of a token or password lands in logcat/console; any app with READ_LOGS, a shared device, or a crash-log SDK can harvest those secrets.',
    run(ctx) {
      const hits = grepLib(ctx, /(print|debugPrint|log|logger\.\w+)\s*\(.*(token|password|secret|authorization|api[_-]?key|otp)/i);
      if (hits.length) return { status: 'fail', evidence: 'Sensitive values passed to logging:\n' + fmtHits(hits) };
      return { status: 'ok', evidence: 'No obvious secret logging found.' };
    } },
  { id: 'keyboard-cache', title: 'Sensitive fields leak via keyboard cache / suggestions', category: 'Privacy', owasp: 'M6', severity: 'low',
    fix: 'On password/CVV/OTP fields set obscureText:true, enableSuggestions:false, autocorrect:false so values are not cached by the keyboard or shown as suggestions.',
    scenario: 'A password/CVV/OTP field without obscureText/suggestion-off lets the keyboard cache the value and surface it as a suggestion to the next app/user on the device.',
    run(ctx) {
      const sensitive = grepLib(ctx, /(password|passcode|cvv|otp|pin|card_?number)/i).filter((h) => /TextField|TextFormField|controller|decoration|label/i.test(h.text));
      if (!sensitive.length) return { status: 'na', evidence: 'No obvious password/CVV/OTP fields found.' };
      const guarded = libHas(ctx, /enableSuggestions\s*:\s*false/) && libHas(ctx, /autocorrect\s*:\s*false/);
      if (guarded) return { status: 'ok', evidence: 'Sensitive fields disable suggestions/autocorrect.' };
      return { status: 'warn', evidence: 'Sensitive input fields found without enableSuggestions:false + autocorrect:false (keyboard-cache leak risk):\n' + fmtHits(sensitive.slice(0, 5)) };
    } },
  { id: 'clipboard-sensitive', title: 'Sensitive value copied to the clipboard', category: 'Privacy', owasp: 'M9', severity: 'low',
    scenario: 'Copying a password, OTP, or token to the system clipboard (Clipboard.setData) exposes it to every other app — clipboard managers and background apps can read it until it is overwritten.',
    run(ctx) {
      const hits = grepLib(ctx, /Clipboard\.setData\s*\(.*(password|otp|token|cvv|card|secret|\bpin\b)/i);
      if (!hits.length) return { status: 'ok', evidence: 'No sensitive Clipboard.setData usage found.' };
      return { status: 'warn', evidence: 'Sensitive value copied to the clipboard:\n' + fmtHits(hits), fix: FIX_CLIPBOARD };
    } },
];
