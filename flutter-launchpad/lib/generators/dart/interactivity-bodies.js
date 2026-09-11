'use strict';

// Reusable interactivity widget bodies (pull-to-refresh, hand-rolled shimmer,
// infinite-scroll list). Split from interactivity.js to stay under the line cap.

function refresher(app) {
  return `import 'package:${app}/general_exports.dart';

// AppRefresher — pull-to-refresh wrapper. Give it a scrollable [child] and an
// async [onRefresh]. Keeps RefreshIndicator styling in one place.
class AppRefresher extends StatelessWidget {
  const AppRefresher({super.key, required this.onRefresh, required this.child});

  final Future<void> Function() onRefresh;
  final Widget child;

  @override
  Widget build(BuildContext context) =>
      RefreshIndicator(onRefresh: onRefresh, child: child);
}
`;
}

function shimmer(app) {
  return `import 'package:${app}/general_exports.dart';

// AppShimmer — dependency-free skeleton loader. Show these boxes while data loads.
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
      builder: (BuildContext context, Widget? _) {
        return Container(
          width: widget.width == double.infinity ? double.infinity : widget.width.w,
          height: widget.height.h,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(widget.radius.r),
            gradient: LinearGradient(
              begin: Alignment(-1 - 2 * _c.value, 0),
              end: Alignment(1 - 2 * _c.value, 0),
              colors: const <Color>[Color(0xFFE6E8EB), Color(0xFFF4F5F7), Color(0xFFE6E8EB)],
            ),
          ),
        );
      },
    );
  }
}
`;
}

function paginatedList(app) {
  return `import 'package:${app}/general_exports.dart';

// PaginatedListView — infinite scroll. Calls [onLoadMore] when the user scrolls
// within [threshold] px of the bottom. Backend paging stays in your controller.
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
        if (n.metrics.pixels >= n.metrics.maxScrollExtent - threshold) {
          onLoadMore();
        }
        return false;
      },
      child: ListView.builder(itemCount: itemCount, itemBuilder: itemBuilder),
    );
  }
}
`;
}

module.exports = { refresher, shimmer, paginatedList };
