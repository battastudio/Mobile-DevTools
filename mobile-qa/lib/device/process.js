'use strict';
// Child-process isolation for the Device Lab. Every adb / xcrun simctl / flutter shell-out in the
// device layer routes through here, so discover/capture/run stay free of child_process. Streaming
// ops use a detached spawn (so we can kill the whole process group) and are cancellable; stopAll()
// tears down every live child and in-flight recording.
const { spawn, execFile } = require('child_process');

const ADB = process.env.ADB_BIN || 'adb';
const CRASH_RE = /FATAL|EXCEPTION|\bANR\b|CRASH|Unhandled|E\/AndroidRuntime|SIGSEGV|SIGABRT/i;
const children = new Set();        // live streaming children (for stopAll)
const recordings = new Map();      // deviceId -> { child, file, remote? }

function spawnStream(cmd, args, cwd, onLine) {
  // detached so we can kill the whole process group (flutter → gradle/xcodebuild children).
  const child = spawn(cmd, args, { cwd: cwd || undefined, detached: true });
  children.add(child);
  let out = '', err = '';
  const feed = (buf, store) => { store.s += buf.toString(); let i; while ((i = store.s.indexOf('\n')) >= 0) { const ln = store.s.slice(0, i); store.s = store.s.slice(i + 1); onLine && onLine(ln); } };
  const so = { s: '' }, se = { s: '' };
  child.stdout.on('data', (b) => { out += b; feed(b, so); });
  child.stderr.on('data', (b) => { err += b; feed(b, se); });
  const promise = new Promise((resolve) => {
    child.on('close', (code) => { children.delete(child); if (so.s) onLine && onLine(so.s); if (se.s) onLine && onLine(se.s); resolve({ code, out, err }); });
    child.on('error', (e) => { children.delete(child); resolve({ code: -1, out, err: err + '\n' + e.message, spawnError: e }); });
  });
  return { child, promise };
}
function capture(cmd, args, cwd, timeout = 60000) {
  return new Promise((resolve) => { execFile(cmd, args, { cwd, timeout, maxBuffer: 1 << 24 }, (err, stdout, stderr) => resolve({ ok: !err, out: String(stdout || ''), err: String(stderr || (err && err.message) || '') })); });
}
function captureBuf(cmd, args, timeout = 60000) {
  return new Promise((resolve) => { execFile(cmd, args, { timeout, maxBuffer: 1 << 27, encoding: 'buffer' }, (err, stdout) => resolve({ ok: !err, buf: stdout })); });
}
function stopAll() {
  let n = 0;
  for (const c of children) { try { process.kill(-c.pid, 'SIGKILL'); n++; } catch { try { c.kill('SIGKILL'); n++; } catch {} } }
  children.clear();
  for (const [id, rec] of recordings) { try { rec.child.kill('SIGINT'); } catch {} recordings.delete(id); }
  return { stopped: true, killed: n };
}
module.exports = { ADB, CRASH_RE, children, recordings, spawnStream, capture, captureBuf, stopAll, execFile };
