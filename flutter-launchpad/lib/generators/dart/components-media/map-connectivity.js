'use strict';

function mapView(app) {
  return `import 'package:google_maps_flutter/google_maps_flutter.dart';

import 'package:${app}/general_exports.dart';

// Thin GoogleMap wrapper — feed it a center + optional markers. Keeps camera /
// controller setup out of feature screens.
class MapView extends StatelessWidget {
  const MapView({
    super.key,
    required this.center,
    this.markers = const <Marker>{},
    this.onMapCreated,
  });

  final LatLng center;
  final Set<Marker> markers;
  final void Function(GoogleMapController controller)? onMapCreated;

  @override
  Widget build(BuildContext context) {
    return GoogleMap(
      initialCameraPosition: CameraPosition(target: center, zoom: 14),
      markers: markers,
      onMapCreated: onMapCreated,
      myLocationButtonEnabled: false,
    );
  }
}
`;
}

function connectivityGate(app, config) {
  const i18n = config.localization !== 'none';
  const offline = i18n
    ? config.mode === 'structured-riverpod'
      ? 'l10n.noConnection'
      : 'TranslationKeys.noConnection.tr'
    : "'No connection'";
  return `import 'package:${app}/general_exports.dart';
import 'package:${app}/services/connectivity_service.dart';

// Wrap any subtree: overlays an offline banner on [child] when the connection
// drops. Usage: ConnectivityGate(child: yourScreen).
class ConnectivityGate extends StatelessWidget {
  const ConnectivityGate({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<bool>(
      stream: ConnectivityService.onlineStream,
      initialData: true,
      builder: (BuildContext context, AsyncSnapshot<bool> snap) {
        final bool online = snap.data ?? true;
        return Stack(
          children: <Widget>[
            child,
            if (!online)
              Positioned(
                left: 0,
                right: 0,
                bottom: 0,
                child: Container(
                  color: const Color(AppColors.error),
                  padding: EdgeInsets.symmetric(vertical: 8.h),
                  child: ${i18n ? '' : 'const '}Center(
                    child: Text(${offline}, style: const TextStyle(color: Colors.white)),
                  ),
                ),
              ),
          ],
        );
      },
    );
  }
}
`;
}

module.exports = { mapView, connectivityGate };
