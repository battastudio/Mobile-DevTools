'use strict';

const maintenanceStatusModel = `// Immutable snapshot of the app's operational + version status.
class MaintenanceStatus {
  const MaintenanceStatus({
    this.isDown = false,
    this.message,
    this.imageUrl,
    this.contactEmail,
    this.updateAvailable = false,
    this.forceUpdate = false,
    this.latestVersion,
    this.storeUrl,
    this.updateMessage,
    this.announcementId,
    this.announcementMessage,
    this.announcementUrl,
  });

  final bool isDown;
  final String? message;
  final String? imageUrl;
  final String? contactEmail;
  final bool updateAvailable;
  final bool forceUpdate;
  final String? latestVersion;
  final String? storeUrl;
  final String? updateMessage;
  final String? announcementId;
  final String? announcementMessage;
  final String? announcementUrl;
}

// Segment-by-segment semver compare: is [current] behind [required]?
bool isOutdated(String current, String required) {
  final List<int> a = current.split('.').map((String e) => int.tryParse(e) ?? 0).toList();
  final List<int> b = required.split('.').map((String e) => int.tryParse(e) ?? 0).toList();
  final int n = a.length > b.length ? a.length : b.length;
  for (int i = 0; i < n; i++) {
    final int x = i < a.length ? a[i] : 0;
    final int y = i < b.length ? b[i] : 0;
    if (x != y) return x < y;
  }
  return false;
}`;

module.exports = { maintenanceStatusModel };
