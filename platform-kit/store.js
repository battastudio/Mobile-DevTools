'use strict';
// platform-kit persistent store — one JSON dir per tool under ~/.mobile-devtools/<id>/.
const fs = require('fs');
const path = require('path');
const os = require('os');

const PLATFORM_HOME = process.env.MOBILE_DEVTOOLS_HOME || path.join(os.homedir(), '.mobile-devtools');
function dataDir(id) {
  const d = path.join(PLATFORM_HOME, id);
  try { fs.mkdirSync(d, { recursive: true }); } catch {}
  return d;
}
function readJson(file, fallback) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; } }
function writeJson(file, data) { try { fs.mkdirSync(path.dirname(file), { recursive: true }); } catch {} fs.writeFileSync(file, JSON.stringify(data, null, 2)); }

module.exports = { PLATFORM_HOME, dataDir, readJson, writeJson };
