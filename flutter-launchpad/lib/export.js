'use strict';
// packageZip — bundle a generated blueprint into a .zip (files nested under
// <root>/). Prefers the system `zip` (real compression); falls back to the
// dependency-free stored-mode writer in ./zip when `zip` is absent.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { zipStore } = require('./zip');

function packageZip(root, files) {
  try {
    return systemZip(root, files);
  } catch {
    // stored-mode fallback: same nesting under <root>/.
    return zipStore(files.map((f) => ({ path: `${root}/${f.path}`, content: f.content })));
  }
}

function systemZip(root, files) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'flp-'));
  try {
    const base = path.join(tmp, root);
    for (const f of files) {
      const abs = path.join(base, f.path);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, f.content);
    }
    const zipPath = path.join(tmp, `${root}.zip`);
    execFileSync('zip', ['-q', '-r', '-X', zipPath, root], { cwd: tmp, stdio: ['ignore', 'ignore', 'ignore'] });
    return fs.readFileSync(zipPath);
  } finally {
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {}
  }
}

module.exports = { packageZip };
