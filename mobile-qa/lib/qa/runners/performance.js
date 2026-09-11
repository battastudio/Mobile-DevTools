'use strict';
// Performance & quality category — startup trace, frame/jank profiling, release app size, and a
// static + guideline accessibility scan. The perf runners drive a booted device; a11y is headless.
const path = require('path');
const fs = require('fs');
const { runCmd, tail, isFl, walkExt } = require('./helpers');

module.exports = [
  { id: 'perf-startup', title: 'Startup performance', category: 'Performance', severity: 'med', kind: 'perf', when: isFl,
    fix: 'Trim work before the first frame: defer heavy init, lazy-load, precache less, and avoid sync I/O in main(). Aim for time-to-first-frame under ~2s.',
    run(ctx) {
      const dev = ctx.device && ctx.device !== 'headless' ? ctx.device : '';
      if (!dev) return { status: 'na', detail: 'Startup profiling drives the app — pick a device/emulator in the run bar, then re-run.' };
      const r = runCmd('flutter', ['run', '--profile', '--trace-startup', '-d', dev], ctx.projectPath, 600000);
      if (r.unavailable) return { status: 'na', detail: 'flutter not found.' };
      const info = path.join(ctx.projectPath, 'build', 'start_up_info.json');
      if (!fs.existsSync(info)) return { status: 'warn', detail: 'Ran, but no start_up_info.json produced (device may need --profile support).\n' + tail(r.out) };
      let j = {}; try { j = JSON.parse(fs.readFileSync(info, 'utf8')); } catch {}
      const ms = Math.round((j.timeToFirstFrameMicros || j.timeToFirstFrameRasterizedMicros || 0) / 1000);
      if (!ms) return { status: 'warn', detail: 'Startup trace captured but no first-frame time found.' };
      return { status: ms <= 2000 ? 'pass' : ms <= 3500 ? 'warn' : 'fail', metric: ms + 'ms', detail: `Time to first frame: ${ms}ms on ${dev}. (engine→framework ${Math.round((j.timeToFrameworkInitMicros || 0) / 1000)}ms)` };
    } },
  { id: 'perf-jank', title: 'Frame / jank profiling', category: 'Performance', severity: 'low', kind: 'perf', when: isFl,
    fix: 'Add a perf integration test that scrolls/animates key screens and reports frame timings, then fix jank (build/raster over 16ms): const widgets, RepaintBoundary, avoid rebuilds, cache images.',
    run(ctx) {
      const perf = path.join(ctx.projectPath, 'integration_test', 'perf_test.dart');
      if (!fs.existsSync(perf)) return { status: 'na', detail: 'No integration_test/perf_test.dart — scaffold one (Test types → Frame/jank → Scaffold) to measure frame timings.' };
      const dev = ctx.device && ctx.device !== 'headless' ? ctx.device : '';
      if (!dev) return { status: 'na', detail: 'Jank profiling drives the app — pick a device/emulator, then re-run.' };
      const r = runCmd('flutter', ['test', 'integration_test/perf_test.dart', '--profile', '-d', dev], ctx.projectPath, 600000);
      if (r.unavailable) return { status: 'na', detail: 'flutter not found.' };
      let sum = null; try { const b = path.join(ctx.projectPath, 'build'); const f = fs.readdirSync(b).find((n) => /timeline_summary\.json$/.test(n)); if (f) sum = JSON.parse(fs.readFileSync(path.join(b, f), 'utf8')); } catch {}
      if (!sum) return { status: r.ok ? 'pass' : 'fail', detail: (r.ok ? 'Perf test ran.' : 'Perf test failed.') + '\n' + tail(r.out) };
      const pct = Math.round((sum['frame_count'] ? (sum['missed_frame_build_budget_count'] || 0) / sum['frame_count'] * 100 : 0));
      const p90 = Math.round((sum['90th_percentile_frame_build_time_millis'] || 0));
      return { status: pct <= 5 ? 'pass' : pct <= 15 ? 'warn' : 'fail', metric: pct + '% jank', detail: `Missed-frame budget ${pct}% · 90p build ${p90}ms on ${dev}.` };
    } },
  { id: 'flutter-app-size', title: 'App size', category: 'Performance', severity: 'low', kind: 'size', when: isFl,
    fix: 'Shrink the app: remove unused assets/fonts/packages, enable resource shrinking + R8, split per-ABI, compress images, and drop large transitive deps.',
    run(ctx) {
      const r = runCmd('flutter', ['build', 'apk', '--analyze-size', '--target-platform', 'android-arm64', '--release'], ctx.projectPath, 900000);
      if (r.unavailable) return { status: 'na', detail: 'flutter not found.' };
      const apk = path.join(ctx.projectPath, 'build', 'app', 'outputs', 'flutter-apk', 'app-release.apk');
      if (!fs.existsSync(apk)) {
        return { status: 'warn', detail: 'The Android release build did not produce an APK, so size could not be measured — usually a missing Android SDK/licenses or unconfigured release signing. Run `flutter build apk --release` in the project to see the exact error, then re-run this check.\n\nBuild output:\n' + tail(r.out) };
      }
      const n = +(fs.statSync(apk).size / (1024 * 1024)).toFixed(1);
      const big = (r.out.split('\n').filter((l) => /\d\s*MB/.test(l)).slice(0, 8).join('\n')).trim();
      const detail = `Release APK (android-arm64): ${n} MB.` + (big ? '\n\nLargest contributors:\n' + big : '') + '\n\nTo shrink: enable R8/resource-shrinking, split per-ABI, compress images/fonts, and drop large packages.';
      return { status: n <= 40 ? 'pass' : n <= 70 ? 'warn' : 'fail', metric: n + ' MB', detail };
    } },
  { id: 'flutter-a11y', title: 'Accessibility', category: 'Accessibility', severity: 'med', kind: 'a11y', when: isFl,
    fix: 'Add semanticLabel to images/icon buttons, tooltips to icon-only controls, ensure 48x48 tap targets and 4.5:1 text contrast. Add a11y guideline tests (meetsGuideline).',
    run(ctx) {
      let guideline = '';
      const a11yTests = walkExt(path.join(ctx.projectPath, 'test'), ['.dart']).filter((f) => { try { return /meetsGuideline/.test(fs.readFileSync(f, 'utf8')); } catch { return false; } });
      if (a11yTests.length) { const r = runCmd('flutter', ['test', ...a11yTests.map((f) => path.relative(ctx.projectPath, f))], ctx.projectPath, 300000); guideline = r.unavailable ? '' : (r.ok ? `Guideline tests passed (${a11yTests.length} file(s)).` : 'Guideline tests FAILED:\n' + tail(r.out)); if (!r.unavailable && !r.ok) return { status: 'fail', metric: 'guideline fail', detail: guideline }; }
      const files = walkExt(path.join(ctx.projectPath, 'lib'), ['.dart']);
      let img = 0, icon = 0, scanned = 0; const offenders = [];
      for (const f of files) { let s; try { s = fs.readFileSync(f, 'utf8'); } catch { continue; } scanned++;
        const fi = Math.max(0, (s.match(/\bImage\.(asset|network|file|memory)\(/g) || []).length - (s.match(/semanticLabel\s*:/g) || []).length);
        const fc = Math.max(0, (s.match(/\bIconButton\(/g) || []).length - (s.match(/tooltip\s*:/g) || []).length);
        img += fi; icon += fc;
        if (fi || fc) offenders.push({ file: path.relative(ctx.projectPath, f), fi, fc, n: fi + fc });
      }
      const total = img + icon;
      offenders.sort((a, b) => b.n - a.n);
      const list = offenders.slice(0, 10).map((o) => `  ${o.file} — ${[o.fi ? o.fi + ' image(s) without semanticLabel' : '', o.fc ? o.fc + ' icon button(s) without tooltip' : ''].filter(Boolean).join(', ')}`).join('\n');
      const detail = [
        guideline,
        `Static scan of ${scanned} file(s): ${img} image(s) without semanticLabel, ${icon} IconButton(s) without tooltip.`,
        list ? 'Top files to fix:\n' + list + (offenders.length > 10 ? `\n  …and ${offenders.length - 10} more file(s)` : '') : '',
        total ? 'Fix: add `semanticLabel: \'…\'` to images and `tooltip: \'…\'` to icon buttons so screen readers can describe them.' : '',
      ].filter(Boolean).join('\n');
      return { status: total === 0 ? (guideline ? 'pass' : 'warn') : total <= 8 ? 'warn' : 'fail', metric: total ? total + ' smells' : (guideline ? 'guidelines ok' : ''), detail, files: offenders.slice(0, 20).map((o) => o.file) };
    } },
];
