---
title: Troubleshooting
description: Common Mobile QA problems and their fixes — missing tools, no devices, timeouts, empty coverage, and AI keys.
sidebar:
  order: 4
---

Most Mobile QA problems come down to a tool not being on your `PATH` or a device not being booted.
Mobile QA is honest about it — a check that can't run reports **N/A** with a reason, rather than
failing. Run the self-check first to see what's wired up:

```sh
node mobile-qa/server.js --selftest
```

It lists the runners and probes for attached devices, and never crashes even with nothing connected.

## Flutter / Dart not found

**Symptom:** checks report *"flutter not found on PATH"* or *"dart not found"* and show as N/A.

**Fix:** Mobile QA shells out to your local Flutter SDK. Make sure both are on your `PATH`:

```sh
flutter --version
dart --version
```

If those work in your terminal but not in Mobile QA, launch Mobile QA from a shell where Flutter is
on the `PATH` (it inherits your environment).

## adb not found or device unauthorized

**Symptom:** the Device Lab shows *"No devices"*, or a run's integration test stays N/A.

**Fix:** Mobile QA talks to your **local** `adb` — there's no daemon or pairing. Check it directly:

```sh
adb devices    # should list your device as "device", not "unauthorized" or "offline"
```

- **Unauthorized?** Accept the "Allow USB debugging" prompt on the phone.
- **adb in a nonstandard location?** Point Mobile QA at it with the `ADB_BIN` environment variable.
- **Emulator not showing?** Boot it first (`flutter emulators --launch <id>`), then click
  **Refresh** in the Device Lab.

## simctl / no iOS simulator

**Symptom:** iOS screenshots, recording, or install do nothing, or the device list is empty.

**Fix:** Mobile QA uses `xcrun simctl`, which needs Xcode's command-line tools and a **booted**
simulator:

```sh
xcrun simctl list devices booted    # your simulator should appear here
```

Open a simulator from Xcode (or `xcrun simctl boot <udid>`), then **Refresh**. Physical iOS devices
have limited support — screenshots and recording need a simulator, and installing needs a configured
Xcode signing team.

## Tests or builds time out

**Symptom:** a runner ends with a timeout, or an app-size / integration run stops partway.

**Fix:** real Flutter runs are slow, and each runner has its own ceiling — integration tests and
app-size builds allow several minutes, but a cold Gradle or Xcode build can still exceed it.

- Warm the caches by running the command once in the project yourself
  (`flutter test`, `flutter build apk --debug`) so the next Mobile QA run is faster.
- App size builds a **release** APK — make sure `flutter build apk --release` works on its own
  first (it needs the Android SDK, licenses, and release signing).

## Coverage is empty or N/A

**Symptom:** the Coverage check says *"No coverage/lcov.info — run tests with --coverage"*.

**Fix:** coverage reads `coverage/lcov.info`, which is written by the **Unit / widget tests**
runner. So:

- Make sure the project has a `test/` directory with at least one passing test — the test runner
  produces the lcov file the Coverage check reads.
- If tests fail hard before finishing, no lcov is written. Fix the failing tests, then re-run.

## App size can't measure the APK

**Symptom:** App size returns **REVIEW** with *"the Android release build did not produce an APK"*.

**Fix:** this is almost always a missing Android SDK / licenses or unconfigured release signing.
Run the exact build in your project to see the real error, then re-run the check:

```sh
flutter build apk --release
```

## AI features ask for a key

**Symptom:** **Test plan**, **AI test**, **QA summary**, or any AI action returns an error about a
missing provider or key.

**Fix:** AI is opt-in. Open **Settings → AI**, set your provider and API key, and save. The key is
stored under `~/.mobile-devtools/mobile-qa/` and never sent to the browser. Prefer no AI? Use the
deterministic **Scaffold** buttons instead — they need no key.

## Reset everything

All local config, QA records, and captured artifacts live under one folder. Delete it to start
fresh:

```sh
rm -rf ~/.mobile-devtools/mobile-qa
```
