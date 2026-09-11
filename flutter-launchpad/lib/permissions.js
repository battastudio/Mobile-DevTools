'use strict';
// Single source of truth for runtime permissions. Modern permission_handler set
// only — DEPRECATED members are intentionally excluded: `storage` (dead on
// Android 13+), `calendar` (→ calendarFullAccess/WriteOnly), `mediaLibrary`,
// `unknown`.

const A = (name, maxSdk) => ({ name, maxSdk });

const PERMISSION_CATALOG = {
  camera: { handler: 'camera', android: [A('android.permission.CAMERA')], plist: ['NSCameraUsageDescription', 'This app needs camera access to take photos.'] },
  photos: { handler: 'photos', android: [A('android.permission.READ_MEDIA_IMAGES'), A('android.permission.READ_EXTERNAL_STORAGE', 32)], plist: ['NSPhotoLibraryUsageDescription', 'This app needs photo library access.'] },
  videos: { handler: 'videos', android: [A('android.permission.READ_MEDIA_VIDEO'), A('android.permission.READ_EXTERNAL_STORAGE', 32)], plist: ['NSPhotoLibraryUsageDescription', 'This app needs video library access.'] },
  audio: { handler: 'audio', android: [A('android.permission.READ_MEDIA_AUDIO'), A('android.permission.READ_EXTERNAL_STORAGE', 32)], plist: ['NSAppleMusicUsageDescription', 'This app needs access to your audio library.'] },
  location: { handler: 'location', android: [A('android.permission.ACCESS_FINE_LOCATION'), A('android.permission.ACCESS_COARSE_LOCATION')], plist: ['NSLocationWhenInUseUsageDescription', 'This app needs your location.'] },
  locationWhenInUse: { handler: 'locationWhenInUse', android: [A('android.permission.ACCESS_FINE_LOCATION'), A('android.permission.ACCESS_COARSE_LOCATION')], plist: ['NSLocationWhenInUseUsageDescription', 'This app needs your location while in use.'] },
  locationAlways: { handler: 'locationAlways', android: [A('android.permission.ACCESS_BACKGROUND_LOCATION')], plist: ['NSLocationAlwaysAndWhenInUseUsageDescription', 'This app needs background location.'], note: 'Background location triggers extra store review.' },
  notifications: { handler: 'notification', android: [A('android.permission.POST_NOTIFICATIONS')] },
  contacts: { handler: 'contacts', android: [A('android.permission.READ_CONTACTS')], plist: ['NSContactsUsageDescription', 'This app needs access to your contacts.'], note: 'Contacts access triggers data-safety review.' },
  microphone: { handler: 'microphone', android: [A('android.permission.RECORD_AUDIO')], plist: ['NSMicrophoneUsageDescription', 'This app needs microphone access.'] },
  calendarFullAccess: { handler: 'calendarFullAccess', android: [A('android.permission.READ_CALENDAR'), A('android.permission.WRITE_CALENDAR')], plist: ['NSCalendarsFullAccessUsageDescription', 'This app needs full calendar access.'] },
  calendarWriteOnly: { handler: 'calendarWriteOnly', android: [A('android.permission.WRITE_CALENDAR')], plist: ['NSCalendarsWriteOnlyAccessUsageDescription', 'This app needs to add calendar events.'] },
  reminders: { handler: 'reminders', android: [], plist: ['NSRemindersUsageDescription', 'This app needs access to your reminders.'] },
  phone: { handler: 'phone', android: [A('android.permission.CALL_PHONE'), A('android.permission.READ_PHONE_STATE')] },
  sms: { handler: 'sms', android: [A('android.permission.SEND_SMS'), A('android.permission.READ_SMS')] },
  speech: { handler: 'speech', android: [A('android.permission.RECORD_AUDIO')], plist: ['NSSpeechRecognitionUsageDescription', 'This app needs speech recognition.'] },
  sensors: { handler: 'sensors', android: [A('android.permission.BODY_SENSORS')], plist: ['NSMotionUsageDescription', 'This app needs motion & fitness data.'] },
  activityRecognition: { handler: 'activityRecognition', android: [A('android.permission.ACTIVITY_RECOGNITION')], plist: ['NSMotionUsageDescription', 'This app needs activity recognition.'] },
  bluetoothScan: { handler: 'bluetoothScan', android: [A('android.permission.BLUETOOTH_SCAN')], plist: ['NSBluetoothAlwaysUsageDescription', 'This app needs Bluetooth access.'] },
  bluetoothConnect: { handler: 'bluetoothConnect', android: [A('android.permission.BLUETOOTH_CONNECT')], plist: ['NSBluetoothAlwaysUsageDescription', 'This app needs Bluetooth access.'] },
  bluetoothAdvertise: { handler: 'bluetoothAdvertise', android: [A('android.permission.BLUETOOTH_ADVERTISE')] },
  nearbyWifiDevices: { handler: 'nearbyWifiDevices', android: [A('android.permission.NEARBY_WIFI_DEVICES')] },
  appTrackingTransparency: { handler: 'appTrackingTransparency', android: [], plist: ['NSUserTrackingUsageDescription', 'This identifier will be used to deliver personalized ads.'] },
  manageExternalStorage: { handler: 'manageExternalStorage', android: [A('android.permission.MANAGE_EXTERNAL_STORAGE')], note: 'All-files access needs a Play Console declaration.' },
  scheduleExactAlarm: { handler: 'scheduleExactAlarm', android: [A('android.permission.SCHEDULE_EXACT_ALARM')] },
  ignoreBatteryOptimizations: { handler: 'ignoreBatteryOptimizations', android: [A('android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS')] },
  systemAlertWindow: { handler: 'systemAlertWindow', android: [A('android.permission.SYSTEM_ALERT_WINDOW')] },
};

// UI options for the permissions chip group.
const permissionOptions = Object.keys(PERMISSION_CATALOG).map((k) => ({ value: k, label: k }));

const pascal = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const androidLine = (a) => `    <uses-permission android:name="${a.name}"${a.maxSdk ? ` android:maxSdkVersion="${a.maxSdk}"` : ''} />`;

// buildPermissions — turn selected keys into the Dart service methods + native
// manifest/plist snippets. Unknown/deprecated keys are dropped.
function buildPermissions(keys) {
  const sel = keys.filter((k) => k in PERMISSION_CATALOG);
  const methods = sel
    .map((k) => `  static Future<bool> request${pascal(k)}() => _ensure(Permission.${PERMISSION_CATALOG[k].handler});`)
    .join('\n');
  const androidNames = [...new Map(sel.flatMap((k) => PERMISSION_CATALOG[k].android).map((a) => [a.name, a])).values()];
  const android = androidNames.length
    ? `<!-- Paste these into android/app/src/main/AndroidManifest.xml inside <manifest>. -->\n<manifest>\n${androidNames.map(androidLine).join('\n')}\n</manifest>\n`
    : '';
  const plistLines = sel
    .map((k) => PERMISSION_CATALOG[k].plist)
    .filter((p) => !!p)
    .map(([key, desc]) => `  <key>${key}</key>\n  <string>${desc}</string>`)
    .join('\n');
  const plist = plistLines ? `<!-- Paste these keys into ios/Runner/Info.plist inside <dict>. -->\n<dict>\n${plistLines}\n</dict>\n` : null;
  return { keys: sel, methods, android, plist };
}

module.exports = { PERMISSION_CATALOG, permissionOptions, buildPermissions };
