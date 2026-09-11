'use strict';

const maintenanceGateGeneric = (app) => `import 'package:flutter/material.dart';

import 'package:${app}/services/maintenance_service.dart';
import 'package:${app}/utils/app_keys.dart';
import 'package:${app}/utils/local_storage.dart';
import 'package:${app}/widgets/maintenance_screens.dart';

// Wrap the app root (MaterialApp.builder): off mode / force update block the UI;
// a newer version shows a dismissible prompt; an announcement shows a top banner.
class MaintenanceGate extends StatefulWidget {
  const MaintenanceGate({super.key, required this.child});

  final Widget child;

  @override
  State<MaintenanceGate> createState() => _MaintenanceGateState();
}

class _MaintenanceGateState extends State<MaintenanceGate> {
  MaintenanceStatus? _status;
  bool _bannerHidden = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final MaintenanceStatus s = await MaintenanceService.check();
    if (!mounted) return;
    final String? dismissed = await LocalStorage.read(AppKeys.dismissedAnnouncement);
    setState(() {
      _status = s;
      _bannerHidden = s.announcementId != null && s.announcementId == dismissed;
    });
    await _maybeSoftUpdate(s);
  }

  Future<void> _maybeSoftUpdate(MaintenanceStatus s) async {
    if (!s.updateAvailable || s.forceUpdate) return;
    final String? skipped = await LocalStorage.read(AppKeys.skippedVersion);
    if (skipped != null && skipped == s.latestVersion) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _showSoftDialog(s);
    });
  }

  void _showSoftDialog(MaintenanceStatus s) {
    showDialog<void>(
      context: context,
      builder: (BuildContext ctx) => AlertDialog(
        title: const Text('Update available'),
        content: Text(s.updateMessage ?? 'A new version is available.'),
        actions: <Widget>[
          TextButton(
            onPressed: () async {
              await LocalStorage.write(AppKeys.skippedVersion, s.latestVersion ?? '');
              if (ctx.mounted) Navigator.of(ctx).pop();
            },
            child: const Text('Remind me later'),
          ),
          FilledButton(
            onPressed: () => s.storeUrl == null ? null : openExternal(s.storeUrl!),
            child: const Text('Update'),
          ),
        ],
      ),
    );
  }

  Future<void> _dismissBanner(String id) async {
    await LocalStorage.write(AppKeys.dismissedAnnouncement, id);
    setState(() => _bannerHidden = true);
  }

  @override
  Widget build(BuildContext context) {
    final MaintenanceStatus? s = _status;
    if (s == null) return widget.child;
    if (s.isDown) return OffModeScreen(status: s);
    if (s.forceUpdate) return ForceUpdateScreen(status: s);
    if (_bannerHidden || s.announcementMessage == null) return widget.child;
    return Stack(
      children: <Widget>[
        widget.child,
        Positioned(
          top: 0,
          left: 0,
          right: 0,
          child: SafeArea(
            child: Material(
              color: Theme.of(context).colorScheme.primary,
              child: ListTile(
                title: Text(s.announcementMessage!, style: const TextStyle(color: Colors.white)),
                trailing: IconButton(
                  icon: const Icon(Icons.close, color: Colors.white),
                  onPressed: () => _dismissBanner(s.announcementId ?? ''),
                ),
                onTap: s.announcementUrl == null ? null : () => openExternal(s.announcementUrl!),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
`;

module.exports = { maintenanceGateGeneric };
