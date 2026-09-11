'use strict';

const maintenanceScreensGeneric = (app) => `import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import 'package:${app}/services/maintenance_service.dart';

// Open a url / mailto in the OS handler.
Future<void> openExternal(String url) async {
  final Uri uri = Uri.parse(url);
  if (await canLaunchUrl(uri)) await launchUrl(uri, mode: LaunchMode.externalApplication);
}

// Full-screen block shown while the app is in maintenance / off mode.
class OffModeScreen extends StatelessWidget {
  const OffModeScreen({super.key, required this.status});

  final MaintenanceStatus status;

  @override
  Widget build(BuildContext context) {
    return Material(
      child: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: <Widget>[
                if (status.imageUrl != null)
                  Image.network(status.imageUrl!, height: 160, errorBuilder: (_, __, ___) => const SizedBox.shrink()),
                const SizedBox(height: 16),
                Text(status.message ?? 'We are under maintenance. Please check back soon.', textAlign: TextAlign.center),
                if (status.contactEmail != null) ...<Widget>[
                  const SizedBox(height: 16),
                  TextButton(onPressed: () => openExternal('mailto:\${status.contactEmail}'), child: Text(status.contactEmail!)),
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
      child: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: <Widget>[
                const Icon(Icons.system_update, size: 64),
                const SizedBox(height: 16),
                Text(status.updateMessage ?? 'Please update to the latest version to continue.', textAlign: TextAlign.center),
                const SizedBox(height: 24),
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
`;

module.exports = { maintenanceScreensGeneric };
