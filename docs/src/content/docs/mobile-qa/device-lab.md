---
title: Device Lab
description: Drive a real Android device or iOS simulator — install, launch, screenshot, record, stream logs, and smoke-test.
sidebar:
  order: 5
---

The Device Lab connects to a booted device or simulator and lets you check the real app: install &
launch, capture screenshots and video, stream crash-highlighted logs, and run an automated smoke.

It's all local shell-outs — Mobile QA talks straight to your `adb`, `xcrun simctl`, and `flutter`.
There's **no agent daemon and no pairing**. Full support is on **Android devices** and **iOS
simulators**; physical iOS is install/launch only.

## Connecting a device

Mobile QA discovers targets by merging three local sources:

- `flutter devices --machine` — the master list of known targets.
- `adb devices` — which Android serials are actually connected and authorized.
- `xcrun simctl list devices booted` — which iOS simulators are booted.

A target only shows as **booted** if it's live in `adb`/`simctl`, so the list reflects reality.

### Android

1. Boot an emulator or connect a device with USB debugging enabled.
2. Confirm `adb devices` lists it as `device` (not `unauthorized`).
3. In the Device Lab, click **Refresh** and pick it from the **Device** dropdown.

If your `adb` isn't on the default `PATH`, set the `ADB_BIN` environment variable to its location.

### iOS simulator

1. Boot a simulator (from Xcode, or `xcrun simctl boot <udid>`).
2. Confirm it appears in `xcrun simctl list devices booted`.
3. Click **Refresh** and select it.

:::caution
Physical iOS devices are install/launch only. Screenshots and screen recording need an iOS
**simulator**, and installing to a real device needs a configured Xcode signing team (open
`ios/Runner.xcworkspace` once) or `ios-deploy`.
:::

## Listing and selecting a device

On the **Device Lab** screen, choose your project in the **App** dropdown and your target in the
**Device** dropdown. Not-yet-booted targets are marked `(not booted)`. **App info** reads the
installed app's id, version, and (on a simulator) its on-disk size.

## Install and launch

**Install & Launch** builds a debug build, installs it, launches it, and captures a launch
screenshot — streaming the whole build log as it goes:

- **Android:** `flutter build apk --debug` → `adb install -r` → launch via the `LAUNCHER` intent.
- **iOS simulator:** `flutter build ios --simulator --debug` → `simctl install` → `simctl launch`.

The first build can take a few minutes. Navigating away or clicking **Stop** kills the whole build
tree.

## Capturing screenshots, video, and logs

- **Screenshot** — saves a PNG. Android uses `adb exec-out screencap`; the iOS simulator uses
  `simctl io … screenshot`.
- **Record** — starts a screen recording (button becomes **■ Stop rec**); click again to stop and
  save the MP4. Android records with `screenrecord` (180s limit) then pulls the file; the iOS
  simulator uses `simctl io … recordVideo`.
- **Live logs** — streams the device console. Android tails `logcat`; the iOS simulator streams the
  syslog for the `Runner` process. Lines that look like crashes (FATAL, EXCEPTION, ANR, SIGSEGV, …)
  are **highlighted in red**. Click **AI triage** to have AI summarize the console for crashes.
- **Smoke** — an automated exploration. On Android it runs `monkey` with the number of events in
  the field next to the button (default 200, 20–5000) and reports whether it hit a crash or ANR. On
  an iOS simulator it runs your `integration_test/` instead (monkey is Android-only). No
  `integration_test/`? Generate one with **AI QA → Smoke test**.

Click **Stop** to end any streaming operation and kill its process tree.

## Where artifacts are stored

Screenshots and recordings are saved under your local data dir, keyed by app:

```
~/.mobile-devtools/mobile-qa/artifacts/<app>/
```

Files are timestamped — `shot-<date>.png`, `rec-<date>.mp4`. They appear in the **Captured
artifacts** gallery on the Device Lab screen, where you can:

- Open any image or video in a **lightbox**, or **Download** it.
- **Select all** / **Clear**, then **Share** the selection to your team or **Remove** it.

:::note
Artifact serving is path-guarded — Mobile QA only serves files that live inside the artifacts root,
so a crafted path can't read anything else on disk.
:::
