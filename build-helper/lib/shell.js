'use strict';
// Process runners. `run` streams lines and is cancellable via the shared running tracker.
const { spawn, execFileSync } = require('child_process');
const { running } = require('./state');

// ---------- process runner (streams to SSE, cancellable via Stop) ----------
function run(cmd, args, cwd, onLine, opts = {}) {
  return new Promise((resolve, reject) => {
    if (running.aborted) return reject(new Error('stopped'));
    onLine(`$ ${cmd} ${args.join(' ')}`);
    const p = spawn(cmd, args, { cwd, env: opts.env || process.env });
    running.children.add(p);
    if (opts.stdin != null) { p.stdin.write(opts.stdin); p.stdin.end(); }
    let buf = ''; const tail = [];
    const emit = (line) => { onLine(line); tail.push(line); if (tail.length > 20) tail.shift(); };
    const pump = (chunk) => {
      buf += chunk.toString();
      let i;
      while ((i = buf.indexOf('\n')) >= 0) { emit(buf.slice(0, i)); buf = buf.slice(i + 1); }
    };
    p.stdout.on('data', pump);
    p.stderr.on('data', pump);
    p.on('error', (e) => { running.children.delete(p); reject(e); });
    p.on('close', (code) => {
      running.children.delete(p);
      if (buf) emit(buf);
      if (running.aborted) return reject(new Error('stopped'));
      code === 0 ? resolve() : reject(new Error(`exit ${code}${tail.length ? '\n' + tail.slice(-12).join('\n') : ''}`));
    });
  });
}

// Run a command and resolve its stdout (non-blocking — for rclone link etc.).
function captureCmd(cmd, args, cwd) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { cwd, env: process.env });
    let out = '', err = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (err += d));
    p.on('error', reject);
    p.on('close', (code) => code === 0 ? resolve(out.trim()) : reject(new Error(err.trim() || `exit ${code}`)));
  });
}

const ARTIFACTS = {
  apk: { cmd: 'apk', out: 'build/app/outputs/flutter-apk/app-release.apk' },
  aab: { cmd: 'appbundle', out: 'build/app/outputs/bundle/release/app-release.aab' },
  ipa: { cmd: 'ipa', out: 'build/ios/ipa' },
};

function which(bin) { try { execFileSync('which', [bin]); return true; } catch { return false; } }
// rclone runs against the USER'S OWN rclone config (~/.config/rclone) — we never ship or fetch one.
// Just add bounded timeouts so a dead remote can't hang a build.
function rc(args) { return ['--timeout', '30s', '--contimeout', '15s', ...args]; }

module.exports = { run, captureCmd, ARTIFACTS, which, rc };
