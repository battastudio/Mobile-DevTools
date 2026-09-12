---
title: Signing & distribution
description: Set up signing.json, Android keystores, Apple and Play credentials, and every distribution channel — all local, nothing committed.
sidebar:
  order: 5
---

Build Helper needs credentials to sign Android releases and to upload to Google
Play, TestFlight, Firebase, and OneDrive. This page covers how to provide them.

The guiding rule: **nothing is committed and nothing leaves your machine.** All
credentials point at files already on your disk, and Build Helper's own copies
live under `~/.mobile-devtools/build-helper/`.

## Two ways to configure credentials

You can set credentials two ways, and per-app settings always win:

1. **`signing.json`** — a single git-ignored file of global defaults. Best when
   one team member's machine builds several apps with shared credentials.
2. **The Setup UI / per-app settings** — saved into Build Helper's local config.
   Per-app Apple/Play accounts, Firebase App IDs, and environment overrides take
   precedence over `signing.json`.

## signing.json

`signing.json` replaces the old central credential "vault": instead of fetching
certs from a server, it just **points at files already on your machine**. Build
Helper looks for it in two places (first found wins):

- `build-helper/signing.json` (next to `signing.example.json`)
- `~/.mobile-devtools/build-helper/signing.json`

Every field is optional — set only what you use.

### Create it from the example

Copy the provided example and fill in absolute paths to your own files:

```bash
cp build-helper/signing.example.json build-helper/signing.json
```

`signing.json` is git-ignored (the repo ignores `**/signing.json`), so it will
never be committed.

### The full shape

```json
{
  "android": {
    "keystore": "/absolute/path/to/upload-keystore.jks",
    "keyProperties": "/absolute/path/to/key.properties"
  },
  "apple": {
    "keyId": "ABCD1234EF",
    "issuerId": "00000000-0000-0000-0000-000000000000",
    "p8": "/absolute/path/to/AuthKey_ABCD1234EF.p8"
  },
  "play": {
    "serviceAccount": "/absolute/path/to/play-service-account.json",
    "defaultTrack": "internal"
  },
  "flavors": {
    "dev": {
      "baseUrl": "https://dev.api.example.com",
      "dist": { "onedrive": ["apk"], "firebase": ["apk"] }
    },
    "prod": {
      "baseUrl": "https://api.example.com",
      "dist": { "play": ["aab"], "testflight": ["ipa"] }
    }
  }
}
```

:::caution
Use **absolute** paths, and keep the referenced files (`.jks`, `.p8`,
service-account JSON) out of your git repos. `signing.json` only stores paths —
losing the underlying files means losing the ability to sign or upload.
:::

## Android release signing

An Android release needs a keystore and an `android/key.properties` that
`build.gradle` reads. You have three options.

### Option A — generate a keystore (recommended for a new app)

On the Build screen, click **Signing → Generate**. Set a **key alias** (defaults
to `upload`) and a **password** of 6+ characters. Build Helper runs `keytool`,
stores the `.jks` in its git-ignored data dir (`creds/keystores`), writes
`android/key.properties`, and wires `build.gradle` for release signing (keeping a
`.bak` backup).

### Option B — link an existing keystore

Click **Signing**, paste the absolute path to your existing `.jks`, provide its
passwords and alias, and click **Link**. Build Helper writes `key.properties` and
wires `build.gradle` to use it.

### Option C — point at it in signing.json

Set the `android` block to your keystore and `key.properties` paths. This is the
global default for every app that doesn't have its own.

:::caution
If your project uses Kotlin-DSL `build.gradle.kts`, Build Helper writes
`key.properties` but does **not** edit the file for you — it prints the exact
`signingConfigs { create("release") { … } }` and `buildTypes { release { … } }`
snippet to paste. Add it once, then release builds sign correctly.
:::

Back up your release keystore somewhere safe. If you lose it, you can't publish
updates to that app on Google Play.

## Apple / TestFlight

TestFlight uploads use an **App Store Connect API key** (a `.p8` file plus its
Key ID and Issuer ID). Create the key in App Store Connect under **Users and
Access → Integrations → App Store Connect API**.

### Set it up

- **In the UI:** **Setup → Apple / TestFlight**. Enter the **Key ID** and
  **Issuer ID**, and paste the **.p8** contents. Build Helper saves the key to
  `~/.appstoreconnect/private_keys/AuthKey_<KeyID>.p8`.
- **In signing.json:** set the `apple` block (`keyId`, `issuerId`, `p8` path).
- **Per app:** save an Apple account for a single app to override the global one.

### What happens on upload

Build Helper uploads the IPA with `xcrun altool` (optionally validating first),
then automatically sets export compliance and the "What to Test" notes on the
build, and logs a TestFlight install link. It also declares export compliance in
`Info.plist` during the version step so builds aren't stuck on "Missing
Compliance".

## Google Play

Play uploads use a **service-account JSON** with access to your app in the Play
Console (Google Cloud service account, granted access under **Play Console →
Users and permissions**).

### Set it up

- **In the UI:** **Setup → Google Play**. Paste the service-account JSON and pick
  a default track (**internal / alpha / beta / production**). Build Helper stores
  it under its `creds` folder.
- **In signing.json:** set `play.serviceAccount` (path) and `play.defaultTrack`.
- **Per app:** save a Play account for a single app to override the global one.

### What happens on upload

Build Helper uploads the AAB through the Play Developer API, rolls it out to the
chosen track, and can upload the ProGuard `mapping.txt` for crash deobfuscation.
After a build you can **roll back** by re-promoting a stored version code to a
track without re-uploading.

## Firebase App Distribution

Firebase sends APK/AAB builds to your testers via the **Firebase CLI**.

### Set it up

1. **Setup → Login to Firebase CLI.** Build Helper installs `firebase-tools` if
   needed and runs `firebase login`.
2. **Set the Firebase App ID** for each app you want to distribute (the app's
   Firebase App ID, and optionally tester **groups**).

### What happens on upload

Build Helper distributes the APK (preferred) or AAB to your testers/groups with
the release notes attached. When an IPA is built it can also upload iOS **dSYMs**
to Crashlytics.

## OneDrive

OneDrive distribution uses **rclone** with *your own* rclone config — Build
Helper never ships, fetches, or imports a shared account.

### Set it up

**Setup → Connect OneDrive (rclone).** Build Helper installs rclone if needed
(Homebrew), then runs the rclone OAuth flow, which opens a browser and writes the
remote into your own `~/.config/rclone`. The remote name defaults to `onedrive`
and the base folder to `Mobile apps` (override with `ONEDRIVE_REMOTE` /
`ONEDRIVE_BASE`).

### What happens on upload

Artifacts are copied to `<remote>:<base>/<repo>/<env>/`, and Build Helper fetches
a share link for each file and the folder when rclone can produce one.

## Per-flavor distribution targets

The `flavors` block in `signing.json` lets you record a per-flavor `baseUrl` and
a default distribution matrix (`dist`). Each entry lists which artifacts go to
which channel:

```json
"flavors": {
  "prod": { "dist": { "play": ["aab"], "testflight": ["ipa"] } }
}
```

The channels are `onedrive`, `firebase`, `play`, and `testflight`, each mapped to
a list of artifact types (`apk`, `aab`, `ipa`).

## What gets stored where

| Item | Location |
|------|----------|
| Generated keystores | `~/.mobile-devtools/build-helper/creds/keystores/` |
| Play service-account JSON | `~/.mobile-devtools/build-helper/creds/` |
| Apple `.p8` | `~/.appstoreconnect/private_keys/` |
| rclone remote (OneDrive) | your own `~/.config/rclone` |
| `signing.json` | `build-helper/` or the data dir (git-ignored) |

None of these are committed to git, sent anywhere, or shared between users.
