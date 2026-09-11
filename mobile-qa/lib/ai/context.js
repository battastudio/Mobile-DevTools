'use strict';
// AI helpers with no model call — framework detection, code/JSON extraction from model output,
// a bounded source-context builder, a path guard, and the source→test path convention. Shared by
// the generate/fix/scaffold modules so the prompts stay declarative.
const fs = require('fs');
const path = require('path');

// Detect the test framework so generated tests fit the repo.
function frameworkFor(projectPath) {
  try { const pkg = JSON.parse(fs.readFileSync(path.join(projectPath, 'package.json'), 'utf8')); const d = { ...pkg.dependencies, ...pkg.devDependencies };
    if (d.vitest) return 'vitest'; if (d.jest || d['@jest/core']) return 'jest'; if (d['@playwright/test']) return 'playwright'; if (d['@testing-library/react']) return 'vitest + @testing-library/react'; return 'vitest'; } catch {}
  if (fs.existsSync(path.join(projectPath, 'pubspec.yaml'))) return 'flutter_test';
  return 'the project’s existing test framework';
}
const codeFence = (s) => { const m = /```(?:\w+)?\n([\s\S]*?)```/.exec(s); return m ? m[1].trim() : String(s || '').trim(); };
const jsonBlock = (s) => { const m = String(s || '').match(/\[[\s\S]*\]/); if (!m) return []; try { return JSON.parse(m[0]); } catch { return []; } };

// Concatenate a bounded slice of the app's source (Flutter lib/, else repo root) for model context.
function sourceContext(projectPath, budget = 40000) {
  const root = fs.existsSync(path.join(projectPath, 'lib')) ? path.join(projectPath, 'lib') : projectPath;
  const skip = new Set(['node_modules', '.git', 'build', 'dist', '.next', 'coverage', '.dart_tool', 'ios', 'android', 'Pods', 'test', 'tests']);
  const exts = ['.dart', '.ts', '.tsx', '.js', '.jsx', '.vue', '.svelte'];
  const files = [];
  const walk = (d, depth) => { if (depth > 8 || files.length > 400) return; let ents; try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { return; } for (const e of ents) { const p = path.join(d, e.name); if (e.isDirectory()) { if (!skip.has(e.name)) walk(p, depth + 1); } else if (exts.some((x) => e.name.endsWith(x))) files.push(p); } };
  walk(root, 0);
  let out = '', used = 0;
  for (const f of files) { if (used >= budget) break; let src; try { src = fs.readFileSync(f, 'utf8'); } catch { continue; } const chunk = src.slice(0, 4000); out += `\n// ==== ${path.relative(projectPath, f)} ====\n${chunk}\n`; used += chunk.length; }
  return out || '(no source files found)';
}
const guard = (projectPath, file) => { const abs = path.isAbsolute(file) ? file : path.join(projectPath, file); if (!abs.startsWith(path.resolve(projectPath))) throw new Error('file outside project'); return abs; };
function suggestTestPath(rel, fw) {
  if (fw === 'flutter_test') return rel.replace(/^lib\//, 'test/').replace(/\.dart$/, '_test.dart');
  return rel.replace(/(\.[jt]sx?|\.vue|\.svelte)$/, '.test$1');
}
module.exports = { frameworkFor, codeFence, jsonBlock, sourceContext, guard, suggestTestPath };
