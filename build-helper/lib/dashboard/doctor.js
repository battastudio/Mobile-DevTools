'use strict';
// Doctor: environment/preflight checks — is each tool installed, its version, and how to install it.
const { execFileSync, spawn } = require('child_process');
const { ROOT, FLUTTER, RCLONE } = require('../state');
const { setupStatus } = require('../setup');

// How to install each tool if missing. macOS-first (Homebrew). canInstall = safe to run
// (non-interactive, no sudo) via POST /api/doctor/install.
const TOOL_INSTALL = {
  homebrew: { cmd: '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"', canInstall: false },
  node: { cmd: 'brew install node', canInstall: true },
  npm: { cmd: 'brew install node', canInstall: true },
  git: { cmd: 'xcode-select --install', canInstall: false },
  flutter: { cmd: 'brew install --cask flutter', canInstall: true },
  xcode: { cmd: 'Install Xcode from the App Store, then run: xcode-select --install', canInstall: false },
  cocoapods: { cmd: 'brew install cocoapods', canInstall: true },
  rclone: { cmd: 'brew install rclone', canInstall: true },
  firebase: { cmd: 'npm install -g firebase-tools', canInstall: true },
};

function doctorData() {
  const st = setupStatus();
  const ver = (bin, args) => { try { return execFileSync(bin, args).toString().split('\n')[0].trim(); } catch { return null; } };
  const check = (key, label, bin, args, note) => {
    const version = ver(bin, args); const ok = !!version; const ins = TOOL_INSTALL[key] || {};
    return { key, label, ok, version: version || note || '', hint: ok ? '' : (ins.cmd || ''), canInstall: ok ? false : !!ins.canInstall };
  };
  const checks = [
    check('homebrew', 'Homebrew', 'brew', ['--version']),
    check('node', 'Node.js', 'node', ['-v']),
    check('npm', 'npm', 'npm', ['-v']),
    check('git', 'git', 'git', ['--version']),
    check('flutter', 'Flutter', FLUTTER, ['--version']),
    check('xcode', 'Xcode (xcrun)', 'xcrun', ['--version'], 'iOS builds need it'),
    check('cocoapods', 'CocoaPods', 'pod', ['--version']),
    check('rclone', 'rclone', RCLONE, ['version']),
    check('firebase', 'Firebase CLI', 'firebase', ['--version']),
  ];
  let disk = null;
  try { const l = execFileSync('df', ['-k', ROOT]).toString().trim().split('\n')[1].split(/\s+/); disk = `${(l[3] / 1048576).toFixed(1)} GB free`; } catch {}
  return {
    checks, diskFree: disk,
    flutter: checks.find((c) => c.key === 'flutter').version || null, node: process.version,
    git: checks.find((c) => c.key === 'git').version || null, xcode: checks.find((c) => c.key === 'xcode').ok,
    connectors: { onedrive: st.onedriveConnected, play: st.play, apple: st.apple, firebase: st.firebaseCli, notify: st.notify },
  };
}
const doctorInstallCmd = (tool) => { const t = TOOL_INSTALL[tool]; return t && t.canInstall ? t.cmd : null; };

// Live `flutter doctor -v` — streams each line to onLine, resolves on exit. Never rejects.
function doctorFull(onLine) {
  return new Promise((resolve) => {
    let buf = '';
    const pump = (c) => { buf += c.toString(); let i; while ((i = buf.indexOf('\n')) >= 0) { onLine(buf.slice(0, i)); buf = buf.slice(i + 1); } };
    let p; try { p = spawn(FLUTTER, ['doctor', '-v'], { env: process.env }); } catch (e) { onLine(`flutter doctor unavailable: ${e.message}`); return resolve(); }
    p.stdout.on('data', pump); p.stderr.on('data', pump);
    p.on('error', (e) => { onLine(`flutter doctor unavailable: ${e.message}`); resolve(); });
    p.on('close', () => { if (buf) onLine(buf); resolve(); });
  });
}

module.exports = { TOOL_INSTALL, doctorData, doctorInstallCmd, doctorFull };
