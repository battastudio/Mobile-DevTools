'use strict';

// UX-kit plain-Material pieces: empty/error/loading state widgets + the design
// tokens (spacing + text styles). Compile in every mode (no barrel dependency).

const stateWidgets = () => `import 'package:flutter/material.dart';

// Consistent empty / error / loading states — use these instead of ad-hoc UIs.
class AppLoading extends StatelessWidget {
  const AppLoading({super.key});
  @override
  Widget build(BuildContext context) => const Center(child: CircularProgressIndicator());
}

class AppEmptyState extends StatelessWidget {
  const AppEmptyState({super.key, this.message = 'Nothing here yet', this.icon = Icons.inbox_outlined});
  final String message;
  final IconData icon;
  @override
  Widget build(BuildContext context) => Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[Icon(icon, size: 56), const SizedBox(height: 12), Text(message, textAlign: TextAlign.center)],
        ),
      );
}

class AppErrorView extends StatelessWidget {
  const AppErrorView({super.key, required this.message, this.onRetry});
  final String message;
  final VoidCallback? onRetry;
  @override
  Widget build(BuildContext context) => Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            const Icon(Icons.error_outline, size: 56),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center),
            if (onRetry != null) ...<Widget>[const SizedBox(height: 12), FilledButton(onPressed: onRetry, child: const Text('Retry'))],
          ],
        ),
      );
}
`;

const spacing = () => `import 'package:flutter/material.dart';

// Spacing scale — use these instead of raw numbers for consistent rhythm.
class AppSpacing {
  AppSpacing._();
  static const double xs = 4;
  static const double sm = 8;
  static const double md = 16;
  static const double lg = 24;
  static const double xl = 32;
  static const EdgeInsets page = EdgeInsets.all(md);
  static const SizedBox gapSm = SizedBox(height: sm, width: sm);
  static const SizedBox gapMd = SizedBox(height: md, width: md);
}
`;

const textStyles = () => `import 'package:flutter/material.dart';

// Typography scale — reference these (or Theme.of(context).textTheme) app-wide.
class AppTextStyles {
  AppTextStyles._();
  static const TextStyle h1 = TextStyle(fontSize: 28, fontWeight: FontWeight.bold);
  static const TextStyle h2 = TextStyle(fontSize: 22, fontWeight: FontWeight.w600);
  static const TextStyle title = TextStyle(fontSize: 18, fontWeight: FontWeight.w600);
  static const TextStyle body = TextStyle(fontSize: 14);
  static const TextStyle caption = TextStyle(fontSize: 12, color: Colors.grey);
}
`;

module.exports = { stateWidgets, spacing, textStyles };
