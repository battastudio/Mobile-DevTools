'use strict';

// maintenance_screens.dart — the full-screen off-mode + force-update blocks and
// the openExternal helper the gate + screens share.

const { f } = require('../helpers');

// maintenanceScreensFile — lib/components/maintenance_screens.dart (null when off).
function maintenanceScreensFile(app, config) {
  if (config.platform.maintenance === 'none') return null;
  return f('lib/components/maintenance_screens.dart', `import 'package:url_launcher/url_launcher.dart';

import 'package:${app}/general_exports.dart';
import 'package:${app}/services/maintenance_service.dart';

// Open a url / mailto in the OS handler (used by the gate + screens).
Future<void> openExternal(String url) async {
  final Uri uri = Uri.parse(url);
  if (await canLaunchUrl(uri)) {
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }
}

// Full-screen block shown while the app is in maintenance / off mode.
class OffModeScreen extends StatelessWidget {
  const OffModeScreen({super.key, required this.status});

  final MaintenanceStatus status;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: const Color(AppColors.background),
      child: SafeArea(
        child: Center(
          child: Padding(
            padding: EdgeInsets.all(24.w),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: <Widget>[
                if (status.imageUrl != null)
                  Image.network(status.imageUrl!, height: 160.h,
                      errorBuilder: (_, __, ___) => const SizedBox.shrink()),
                SizedBox(height: 16.h),
                Text(status.message ?? 'We are under maintenance. Please check back soon.',
                    textAlign: TextAlign.center),
                if (status.contactEmail != null) ...<Widget>[
                  SizedBox(height: 16.h),
                  TextButton(
                    onPressed: () => openExternal('mailto:\${status.contactEmail}'),
                    child: Text(status.contactEmail!),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// Blocking screen requiring an update. The Update button opens the store.
class ForceUpdateScreen extends StatelessWidget {
  const ForceUpdateScreen({super.key, required this.status});

  final MaintenanceStatus status;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: const Color(AppColors.background),
      child: SafeArea(
        child: Center(
          child: Padding(
            padding: EdgeInsets.all(24.w),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: <Widget>[
                Icon(Icons.system_update, size: 64.r),
                SizedBox(height: 16.h),
                Text(status.updateMessage ?? 'Please update to the latest version to continue.',
                    textAlign: TextAlign.center),
                SizedBox(height: 24.h),
                FilledButton(
                  onPressed: status.storeUrl == null ? null : () => openExternal(status.storeUrl!),
                  child: const Text('Update'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
`);
}

module.exports = { maintenanceScreensFile };
