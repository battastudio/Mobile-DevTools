'use strict';
// OWASP Mobile M7/M6/M4 — Runtime & binary protections: root/jailbreak detection, anti-debug,
// screenshot (FLAG_SECURE) blocking, and tapjacking/overlay guards on sensitive screens.
const { libHas, readFileSafe, findMainActivity } = require('../files');

const FIX_JAILBREAK = 'Add flutter_jailbreak_detection and gate boot:\n  final jb = await FlutterJailbreakDetection.jailbroken;\n  final dev = await FlutterJailbreakDetection.developerMode;\n  if ((jb || dev) && enableSecurity) { runApp(CompromisedDeviceApp()); return; }';
const FIX_ANTIDEBUG = "Add a MethodChannel('security'): Android checks Debug.isDebuggerConnected()/waitingForDebugger()/TracerPid in /proc/self/status; iOS checks sysctl P_TRACED. Kill the process if attached.";
const FIX_FLAGSECURE = 'Android: getWindow().setFlags(FLAG_SECURE, FLAG_SECURE) in MainActivity for sensitive screens. iOS: blur/secure field on screenshot.';
const FIX_TAPJACK = 'Guard sensitive taps against overlays: Android setFilterTouchesWhenObscured(true) on sensitive views (or check FLAG_WINDOW_IS_(PARTIALLY_)OBSCURED); avoid processing touches while another app draws over yours.';

module.exports = [
  { id: 'root-jailbreak', title: 'No root / jailbreak detection', category: 'Runtime integrity', owasp: 'M7', severity: 'med',
    scenario: 'On a rooted/jailbroken device an attacker hooks the app with Frida/Objection at runtime, bypasses client checks, and reads secrets from memory — with no integrity gate to stop them.',
    run(ctx) {
      const pkg = /flutter_jailbreak_detection|freerasp|jailbreak_detection|safe_device/.test(ctx.pubspec);
      const gate = libHas(ctx, /jailbroken|isDeviceCompromised|developerMode|jailbreak/i);
      if (pkg && gate) return { status: 'ok', evidence: 'Jailbreak/root detection wired at boot.' };
      return { status: 'fail', evidence: `Missing root/jailbreak gate. package: ${pkg}, boot check: ${gate}.`, fix: FIX_JAILBREAK };
    } },
  { id: 'anti-debug', title: 'No anti-debugging', category: 'Runtime integrity', owasp: 'M7', severity: 'low',
    scenario: 'Without an anti-debug bridge, a reverse-engineer attaches a debugger/tracer to the running app to observe control flow and dump decrypted values in real time.',
    run(ctx) {
      if (libHas(ctx, /MethodChannel\(\s*['"]security['"]\s*\)|isDebuggerAttached/)) return { status: 'ok', evidence: "Anti-debug MethodChannel('security') present." };
      return { status: 'warn', evidence: 'No anti-debugging bridge (native TracerPid (Android) / P_TRACED (iOS) checks).', fix: FIX_ANTIDEBUG };
    } },
  { id: 'flag-secure', title: 'No screenshot / screen-recording block', category: 'Runtime integrity', owasp: 'M6', severity: 'low',
    scenario: 'Sensitive screens (OTP, card entry, account details) land in the OS screenshot/recents thumbnail or a screen recorder, leaking data to other apps or shoulder-surfers.',
    run(ctx) {
      const kt = readFileSafe(findMainActivity(ctx.projectPath));
      if (/FLAG_SECURE/.test(kt) || /secure_application|no_screenshot/.test(ctx.pubspec)) return { status: 'ok', evidence: 'FLAG_SECURE / screenshot block present.' };
      return { status: 'warn', evidence: 'No FLAG_SECURE — sensitive screens can be screenshotted/recorded.', fix: FIX_FLAGSECURE };
    } },
  { id: 'tapjacking', title: 'No tapjacking / overlay protection', category: 'Runtime integrity', owasp: 'M4', severity: 'low', fix: FIX_TAPJACK,
    scenario: 'A malicious app draws an invisible overlay over your sensitive screen (consent, payment, transfer) so the user’s taps are hijacked into unintended actions.',
    run(ctx) {
      const guard = libHas(ctx, /filterTouchesWhenObscured|FLAG_WINDOW_IS_OBSCURED/) || /filterTouchesWhenObscured/.test(readFileSafe(findMainActivity(ctx.projectPath)));
      if (guard) return { status: 'ok', evidence: 'Tapjacking/overlay guard present.' };
      return { status: 'warn', evidence: 'No overlay/tapjacking guard found — protect consent/payment screens with filterTouchesWhenObscured.' };
    } },
];
