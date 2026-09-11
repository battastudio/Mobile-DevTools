'use strict';
// Per-permission Android manifest <uses-permission> + iOS Info.plist usage keys.
const ANDROID = {
  camera: ['<uses-permission android:name="android.permission.CAMERA" />'],
  photos: ['<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />'],
  location: [
    '<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />',
    '<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />',
  ],
  notifications: ['<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />'],
  contacts: ['<uses-permission android:name="android.permission.READ_CONTACTS" />'],
  microphone: ['<uses-permission android:name="android.permission.RECORD_AUDIO" />'],
  storage: ['<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />'],
};

const IOS = {
  camera: [['NSCameraUsageDescription', 'We use the camera to let you take photos.']],
  photos: [['NSPhotoLibraryUsageDescription', 'We access your photos so you can pick images.']],
  location: [['NSLocationWhenInUseUsageDescription', 'We use your location while you use the app.']],
  contacts: [['NSContactsUsageDescription', 'We access contacts to help you share.']],
  microphone: [['NSMicrophoneUsageDescription', 'We use the microphone to record audio.']],
};

// MANIFEST.md — copy-paste permission snippets for both platforms. Only the
// permissions the config selected are emitted.
function manifest(config) {
  const android = [];
  const ios = [];
  for (const p of config.permissions) {
    (ANDROID[p] || []).forEach((l) => android.push(l));
    (IOS[p] || []).forEach(([k, v]) => ios.push(`<key>${k}</key>`, `<string>${v}</string>`));
  }
  const maps = config.maps.includes('google_maps');

  return [
    `# Manifest snippets — ${config.appName}`,
    '',
    config.permissions.length ? `Permissions: ${config.permissions.join(', ')}.` : 'No runtime permissions selected.',
    '',
    '## Android — `android/app/src/main/AndroidManifest.xml`',
    'Add inside `<manifest>` (above `<application>`):',
    '```xml',
    ...(android.length ? android : ['<!-- none -->']),
    ...(maps ? ['', '<!-- Google Maps: inside <application> -->', '<meta-data android:name="com.google.android.geo.API_KEY" android:value="YOUR_ANDROID_MAPS_KEY" />'] : []),
    '```',
    '',
    '## iOS — `ios/Runner/Info.plist`',
    'Add inside the top-level `<dict>`:',
    '```xml',
    ...(ios.length ? ios : ['<!-- none -->']),
    ...(maps ? ['<!-- Google Maps: set the key in AppDelegate via GMSServices.provideAPIKey(...) -->'] : []),
    '```',
    '',
  ].join('\n');
}

module.exports = { manifest };
