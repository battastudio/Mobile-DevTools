'use strict';

// maintenance_gate.dart — wraps the app root (MaterialApp.builder): off-mode /
// force-update blocks, a dismissible soft-update dialog, and an announcement banner.

const { f } = require('../helpers');

// maintenanceGateFile — lib/components/maintenance_gate.dart (null when off).
function maintenanceGateFile(app, config) {
  if (config.platform.maintenance === 'none') return null;
  const riverpod = config.mode === 'structured-riverpod';
  const readSkip = riverpod ? 'await LocalStorage.read' : 'LocalStorage.read';
  const writeSkip = riverpod ? 'await LocalStorage.write' : 'LocalStorage.write';
  return f('lib/components/maintenance_gate.dart', `import 'package:${app}/general_exports.dart';
import 'package:${app}/services/maintenance_service.dart';

// Wrap the app root (MaterialApp.builder). On launch it checks the status and:
//  • off mode      -> OffModeScreen (block)
//  • below min ver -> ForceUpdateScreen (block)
//  • newer ver     -> a dismissible "update available" dialog (remind me later)
//  • announcement  -> a non-blocking banner at the top
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
    final String? dismissed = ${readSkip}(AppKeys.dismissedAnnouncement);
    setState(() {
      _status = s;
      _bannerHidden = s.announcementId != null && s.announcementId == dismissed;
    });
    await _maybeSoftUpdate(s);
  }

  Future<void> _maybeSoftUpdate(MaintenanceStatus s) async {
    if (!s.updateAvailable || s.forceUpdate) return;
    final String? skipped = ${readSkip}(AppKeys.skippedVersion);
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
              ${writeSkip}(AppKeys.skippedVersion, s.latestVersion ?? '');
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
    ${writeSkip}(AppKeys.dismissedAnnouncement, id);
    setState(() => _bannerHidden = true);
  }

  @override
  Widget build(BuildContext context) {
    final MaintenanceStatus? s = _status;
    if (s == null) return widget.child;
    if (s.isDown) return OffModeScreen(status: s);
    if (s.forceUpdate) return ForceUpdateScreen(status: s);
    final bool showBanner = !_bannerHidden && s.announcementMessage != null;
    if (!showBanner) return widget.child;
    return Stack(
      children: <Widget>[
        widget.child,
        Positioned(
          top: 0,
          left: 0,
          right: 0,
          child: SafeArea(
            child: Material(
              color: const Color(AppColors.primary),
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
`);
}

module.exports = { maintenanceGateFile };
