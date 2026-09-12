---
title: Troubleshooting
description: Common Build Helper problems and how to fix them — PATH, signing, failed builds, distribution auth, and ports.
sidebar:
  order: 4
---

Most problems fall into a handful of buckets. Find the symptom below, then apply
the fix.

## Flutter isn't found

**Symptom.** Builds fail immediately, or the **Setup → Doctor** shows Flutter as
**missing**.

**Fix.** Build Helper runs `flutter` from your `PATH`.

- Confirm it's installed: `flutter --version` in a terminal.
- If it's installed but not on the `PATH` the server sees, launch Build Helper
  with an explicit path: `FLUTTER_BIN=/path/to/flutter node build-helper/server.js`.
- On macOS, the Doctor can install it for you with **brew install --cask
  flutter** — click **Install** next to Flutter.

## No apps show on the dashboard

**Symptom.** "No Flutter apps under `<path>`".

**Fix.** Build Helper only lists folders that contain both a `pubspec.yaml` and a
`lib/` directory, directly under the projects root.

- Set the root to where your apps actually live: `FLUTTER_PROJECTS=/path/to/apps
  node build-helper/server.js`, or change it in **Setup**.
- The default root is `~/mobileApps`.

## An app says "needs setup — no env detected"

**Symptom.** A card is flagged, and the Build screen warns there's no detected
`AppMode` environment.

**Fix.** Detection couldn't find the `AppMode` constant your app compiles, or its
defining file was ambiguous (defined in more than one place). Set a per-app
override with the constant name, the env file that declares
`const AppMode <name> = AppMode.<x>;`, and the environment list. Once the env
file resolves to a single file, detection succeeds and the environments appear.

## The build fails on signing

**Symptom.** The Android build fails and the log mentions `storeFile` or
`SigningConfig` — Build Helper adds the hint "release signing not configured for
this app".

**Fix.** The app has no release signing set up.

- Open the app, click **Signing**, and **Generate** an upload keystore (or
  **Link** an existing `.jks`). This writes `android/key.properties` and wires
  `build.gradle`.
- If your project uses Kotlin-DSL `build.gradle.kts`, Build Helper writes
  `key.properties` but can't edit the file automatically — it prints the exact
  `signingConfigs` / `buildTypes` snippet to paste. Add it, then rebuild.

## The IPA build produces no file

**Symptom.** The log says `ipa: build output not found (iOS signing may have
failed)`.

**Fix.** `flutter build ipa` couldn't sign the archive. Open the project in
Xcode, make sure a team and signing certificate/provisioning profile are
selected for the Runner target, then rebuild. Check **Setup → Doctor** shows
Xcode and CocoaPods as present.

## A build fails for another reason

**Symptom.** The build stops with a non-zero exit and the last lines of the tool
output in the log.

**Fix.** The **Live log** shows the exact command and its tail. Reproduce it in a
terminal (for example the `flutter build` line) to see the full error. Common
causes: failing `analyze`/`test` gates (fix the code, or untick those options),
missing dependencies (tick **pub get**), or a stale build (tick **flutter
clean**).

## A distribution upload fails

Each channel needs its own credentials. Build Helper checks them before building
and tells you exactly what's missing.

- **"OneDrive is selected but not connected"** — open **Setup** and **Connect
  OneDrive (rclone)**. It opens a browser to authorize and writes the remote into
  your own rclone config.
- **"Play upload needs Google Play configured"** — open **Setup → Google Play**
  and paste the service-account JSON (or set `play.serviceAccount` in
  `signing.json`). Make sure you also selected the **AAB** artifact.
- **"TestFlight upload needs Apple configured"** — open **Setup → Apple** and
  enter your Key ID, Issuer ID, and `.p8` contents (or set the `apple` block in
  `signing.json`). Make sure you also selected the **IPA** artifact.
- **"Firebase distribution needs firebase-tools"** — open **Setup** and **Login
  to Firebase CLI**. You also need the app's Firebase **App ID** set for
  distribution to run.

See [Signing & distribution](/Mobile-DevTools/build-helper/signing-and-distribution/)
for the full setup of each channel.

## TestFlight rejects the version

**Symptom.** The build is blocked with "App Store Connect already has version X",
or TestFlight rejects the upload as too low or a duplicate build number.

**Fix.** Apple requires each upload's marketing version to be higher than what's
already on App Store Connect, and each build number to be unique.

- Bump the **version name** to the suggested value (or higher).
- Bump the **build number** so it hasn't been used before.
- To upload anyway (rarely what you want for TestFlight), tick **Build anyway**.

## The build won't start — "a build is already running"

**Symptom.** Starting a build reports that another is in progress.

**Fix.** Build Helper runs one build at a time across the whole tool. Wait for the
current one to finish, or press **Stop** to cancel it, then start yours.

## The guards keep pausing the build

**Symptom.** The build stops on uncommitted changes, a duplicate build number, or
a production-publish confirmation.

**Fix.** Resolve the cause (commit/stash your changes, bump the build number), or
use the inline prompt's **Build anyway** (or **Use `<version>`** for a low
TestFlight version) to override that guard and re-run.

## iOS install from the LAN page fails

**Symptom.** The **Install on iPhone** button on the `/install` page does
nothing, or iOS refuses the install.

**Fix.** iOS ad-hoc install requires an **HTTPS** URL and the device UDID in the
provisioning profile. Plain LAN HTTP won't work. Use an HTTPS tunnel in front of
Build Helper, or distribute the iOS build through **TestFlight** instead. Android
installs fine directly from the page (allow unknown sources).

## The port is busy

**Symptom.** Build Helper starts on a different port than 4095.

**Fix.** This is expected — Build Helper automatically moves up to the next free
port when 4095 is taken. Check the startup log for the actual URL, or pin a port
with `PORT=4200 node build-helper/server.js`.

## Reset everything

To wipe Build Helper's state — config, build history, artifacts, logs, generated
keystores — delete its data directory:

```bash
rm -rf ~/.mobile-devtools/build-helper
```

:::caution
This also removes keystores that Build Helper **generated** (under
`creds/keystores`). Keep your own backup of any release keystore — losing it
means you can't update that app on Google Play.
:::
