---
title: Device setup
description: Wire up local Android and iOS devices for the Build Helper and Mobile QA device lab.
sidebar:
  order: 3
---

Mobile DevTools talks to your devices **locally** — there is no agent daemon, no
pairing, and no tokens. Build Helper shells out to your local `flutter`, `git`,
and Xcode; the Mobile QA device lab talks to local `adb` and `simctl`. If those
tools work in your terminal, they work here.

## Android

1. Install the **Android platform-tools** (ships with Android Studio, or install
   `platform-tools` standalone) so `adb` is on your `PATH`.
2. Enable **USB debugging** on the device (Developer options) and connect it, or
   start an emulator.
3. Confirm it's visible:
   ```sh
   adb devices
   ```

## iOS (macOS only)

1. Install **Xcode** and its command-line tools.
2. Boot a simulator, or connect a device you've set up for development.
3. Confirm it's visible:
   ```sh
   xcrun simctl list devices booted   # simulators
   xcrun xctrace list devices         # physical devices
   ```

## Troubleshooting

- **Device not showing up?** Restart the tool after plugging in — device discovery
  runs when the device lab loads. Make sure `adb devices` / `simctl list` show it
  first; the tool can only see what your shell can.
- **Builds fail but the device is fine?** Run `flutter doctor` — the tool uses the
  same toolchain your terminal does.
