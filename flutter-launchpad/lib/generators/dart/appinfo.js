'use strict';

const { f } = require('./helpers');

// lib/constants/app_info.dart — app metadata (display name, version, support +
// legal links) referenced app-wide. Plus an opt-in Android signing scaffold.
const title = (s) => s.replace(/(^|[_-])(\w)/g, (_m, sep, c) => (sep ? ' ' : '') + c.toUpperCase()).trim();

function appInfoFile(config) {
  const id = config.identity;
  const name = id.displayName || title(config.appName);
  return f('lib/constants/app_info.dart', `// App metadata — display name, version, support + legal links. Reference these
// instead of hardcoding strings/URLs.
class AppInfo {
  AppInfo._();

  static const String displayName = '${name.replace(/'/g, "\\'")}';
  static const String version = '${id.version}';
  static const String supportEmail = '${id.supportEmail}';
  static const String privacyUrl = '${id.privacyUrl}';
  static const String termsUrl = '${id.termsUrl}';
}
`);
}

// Android release-signing scaffold (opt-in via identity.androidSigning).
function signingFiles(config) {
  if (!config.identity.androidSigning) return [];
  return [
    f('android/key.properties.example', `# Copy to android/key.properties (git-ignored) and fill in.
storePassword=REPLACE_ME
keyPassword=REPLACE_ME
keyAlias=upload
storeFile=upload-keystore.jks
`),
    f('platform/signing/build.gradle.kts.snippet', `// Paste into android/app/build.gradle.kts (Kotlin DSL). Reads android/key.properties.
import java.util.Properties

val keystoreProperties = Properties()
val keystoreFile = rootProject.file("key.properties")
if (keystoreFile.exists()) keystoreProperties.load(keystoreFile.inputStream())

android {
  signingConfigs {
    create("release") {
      keyAlias = keystoreProperties["keyAlias"] as String?
      keyPassword = keystoreProperties["keyPassword"] as String?
      storeFile = (keystoreProperties["storeFile"] as String?)?.let { file(it) }
      storePassword = keystoreProperties["storePassword"] as String?
    }
  }
  buildTypes {
    getByName("release") { signingConfig = signingConfigs.getByName("release") }
  }
}
`),
  ];
}

module.exports = { appInfoFile, signingFiles };
