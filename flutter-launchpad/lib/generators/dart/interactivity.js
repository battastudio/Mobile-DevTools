'use strict';

const { f } = require('./helpers');
const { refresher, shimmer, paginatedList } = require('./interactivity-bodies');

// Animation + list-interactivity building blocks, gated on the `interactivity`
// chips. transitions.dart lives under utils/; the rest are reusable components.
// All dependency-free (shimmer is hand-rolled).

// utils/transitions.dart — custom page-route animations (fade + slide). Emitted
// when hero / page-transitions / animations is selected. (Hero itself is a
// stock Flutter widget — the sample screen shows a Hero when 'hero' is on.)
function transitionsFile(app, config) {
  const anim = ['hero', 'page-transitions', 'animations'].some((k) => config.interactivity.includes(k));
  if (!anim) return null;
  return f('lib/utils/transitions.dart', `import 'package:${app}/general_exports.dart';

// Custom route transitions — use instead of MaterialPageRoute for animated pushes:
//   Navigator.of(context).push(fadeRoute(const NextScreen()));
Route<T> fadeRoute<T>(Widget page) => PageRouteBuilder<T>(
      transitionDuration: const Duration(milliseconds: 300),
      pageBuilder: (_, __, ___) => page,
      transitionsBuilder: (_, Animation<double> a, __, Widget child) =>
          FadeTransition(opacity: a, child: child),
    );

Route<T> slideRoute<T>(Widget page, {Offset begin = const Offset(1, 0)}) => PageRouteBuilder<T>(
      transitionDuration: const Duration(milliseconds: 300),
      pageBuilder: (_, __, ___) => page,
      transitionsBuilder: (_, Animation<double> a, __, Widget child) => SlideTransition(
        position: Tween<Offset>(begin: begin, end: Offset.zero)
            .animate(CurvedAnimation(parent: a, curve: Curves.easeOut)),
        child: child,
      ),
    );
`);
}

// interactivityComponents — the gated component widgets (refresher / shimmer /
// paginated list). transitions.dart is emitted separately (utils subtree).
function interactivityComponents(app, config) {
  const i = config.interactivity;
  const files = [];
  if (i.includes('pull-refresh')) files.push(f('lib/components/app_refresher.dart', refresher(app)));
  if (i.includes('shimmer')) files.push(f('lib/components/app_shimmer.dart', shimmer(app)));
  if (i.includes('infinite-scroll')) files.push(f('lib/components/paginated_list_view.dart', paginatedList(app)));
  return files;
}

module.exports = { interactivityComponents, transitionsFile };
