'use strict';

const shimmer = () => `import 'package:flutter/material.dart';

// Dependency-free skeleton loader. Show these boxes while data loads.
class AppShimmer extends StatefulWidget {
  const AppShimmer({super.key, this.width = double.infinity, this.height = 16, this.radius = 8});

  final double width;
  final double height;
  final double radius;

  @override
  State<AppShimmer> createState() => _AppShimmerState();
}

class _AppShimmerState extends State<AppShimmer> with SingleTickerProviderStateMixin {
  late final AnimationController _c =
      AnimationController(vsync: this, duration: const Duration(milliseconds: 1200))..repeat();

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _c,
      builder: (BuildContext context, Widget? _) => Container(
        width: widget.width,
        height: widget.height,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(widget.radius),
          gradient: LinearGradient(
            begin: Alignment(-1 - 2 * _c.value, 0),
            end: Alignment(1 - 2 * _c.value, 0),
            colors: const <Color>[Color(0xFFE6E8EB), Color(0xFFF4F5F7), Color(0xFFE6E8EB)],
          ),
        ),
      ),
    );
  }
}
`;

const paginatedList = () => `import 'package:flutter/material.dart';

// Infinite scroll — calls onLoadMore near the bottom. Backend paging stays in your controller.
class PaginatedListView extends StatelessWidget {
  const PaginatedListView({
    super.key,
    required this.itemCount,
    required this.itemBuilder,
    required this.onLoadMore,
    this.threshold = 200,
  });

  final int itemCount;
  final IndexedWidgetBuilder itemBuilder;
  final Future<void> Function() onLoadMore;
  final double threshold;

  @override
  Widget build(BuildContext context) {
    return NotificationListener<ScrollNotification>(
      onNotification: (ScrollNotification n) {
        if (n.metrics.pixels >= n.metrics.maxScrollExtent - threshold) onLoadMore();
        return false;
      },
      child: ListView.builder(itemCount: itemCount, itemBuilder: itemBuilder),
    );
  }
}
`;

const mapView = () => `import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

// Thin GoogleMap wrapper — feed it a center + optional markers.
class MapView extends StatelessWidget {
  const MapView({super.key, required this.center, this.markers = const <Marker>{}, this.onMapCreated});

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

module.exports = { shimmer, paginatedList, mapView };
