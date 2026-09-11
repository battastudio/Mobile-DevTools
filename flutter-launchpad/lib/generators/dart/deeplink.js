'use strict';

const { f } = require('./helpers');

// Deep-link native config from config.deepLink: Android intent-filters (custom
// scheme + autoVerify universal-link hosts) and the iOS Associated Domains +
// CFBundleURLTypes steps. Emitted when notifications includes 'deeplink'.

// Dart literal map of path → route for the deep-link service (fallback: path).
function deepLinkRoutesLiteral(config) {
  const routes = config.deepLink.routes.filter((r) => r.path && r.route);
  if (!routes.length) return 'const <String, String>{}';
  const entries = routes.map((r) => `    '${r.path}': '${r.route}',`).join('\n');
  return `const <String, String>{\n${entries}\n  }`;
}

function deeplinkFiles(config) {
  if (!config.notifications.includes('deeplink')) return [];
  const scheme = config.deepLink.scheme.trim() || 'myapp';
  const hosts = config.deepLink.hosts.map((h) => h.trim()).filter(Boolean);
  const universal = hosts
    .map(
      (h) => `<intent-filter android:autoVerify="true">
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="https" android:host="${h}" />
</intent-filter>`,
    )
    .join('\n');
  const android = f('platform/deeplink/AndroidManifest.intent-filter.xml', `<!-- Paste inside <activity android:name=".MainActivity"> in
     android/app/src/main/AndroidManifest.xml. -->

<!-- Custom scheme: ${scheme}://<path> -->
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="${scheme}" />
</intent-filter>
${universal || '<!-- No universal-link hosts configured. -->'}
`);
  const ios = f('platform/deeplink/ios.md', `# iOS deep links

## Custom scheme (${scheme}://)
Add to \`ios/Runner/Info.plist\`:
\`\`\`xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array><string>${scheme}</string></array>
  </dict>
</array>
\`\`\`

## Universal links${hosts.length ? '' : ' (add hosts in the generator to fill this in)'}
1. Xcode → Signing & Capabilities → **Associated Domains**:
${(hosts.length ? hosts : ['app.example.com']).map((h) => `   - \`applinks:${h}\``).join('\n')}
2. Host \`.well-known/apple-app-site-association\` on each domain, mapping paths to your app.
`);
  return [android, ios];
}

module.exports = { deeplinkFiles, deepLinkRoutesLiteral };
