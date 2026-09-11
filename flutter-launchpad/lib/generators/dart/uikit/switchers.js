'use strict';

// Settings switchers (theme + language). Mode-aware: riverpod ConsumerWidget,
// GetX stateless statics, generic ChangeNotifier controllers passed in.

function switchers(app, config, mode) {
  const dark = config.themes.includes('dark');
  const i18n = config.localization !== 'none';
  if (mode === 'structured-riverpod') {
    return `import 'package:${app}/general_exports.dart';

// Settings widgets — theme + language switchers (Riverpod).
${dark ? `class ThemeSwitch extends ConsumerWidget {
  const ThemeSwitch({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ThemeMode mode = ref.watch(themeModeProvider);
    return SwitchListTile(
      title: const Text('Dark mode'),
      value: mode == ThemeMode.dark,
      onChanged: (bool v) => ref.read(themeModeProvider.notifier).set(v ? ThemeMode.dark : ThemeMode.light),
    );
  }
}
` : ''}${i18n ? `class LanguageSwitch extends ConsumerWidget {
  const LanguageSwitch({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final Locale locale = ref.watch(localeProvider);
    return DropdownButton<String>(
      value: locale.languageCode,
      items: LocaleController.supported
          .map((Locale l) => DropdownMenuItem<String>(value: l.languageCode, child: Text(l.languageCode.toUpperCase())))
          .toList(),
      onChanged: (String? c) => c == null ? null : ref.read(localeProvider.notifier).setLocale(c),
    );
  }
}
` : ''}`;
  }
  if (mode === 'structured-getx') {
    return `import 'package:${app}/general_exports.dart';

// Settings widgets — theme + language switchers (GetX).
${dark ? `class ThemeSwitch extends StatelessWidget {
  const ThemeSwitch({super.key});
  @override
  Widget build(BuildContext context) => SwitchListTile(
        title: const Text('Dark mode'),
        value: ThemeController.initial == ThemeMode.dark,
        onChanged: (bool v) => ThemeController.set(v ? ThemeMode.dark : ThemeMode.light),
      );
}
` : ''}${i18n ? `class LanguageSwitch extends StatelessWidget {
  const LanguageSwitch({super.key});
  @override
  Widget build(BuildContext context) => DropdownButton<String>(
        value: LocaleController.initial.languageCode,
        items: LocaleController.supported
            .map((Locale l) => DropdownMenuItem<String>(value: l.languageCode, child: Text(l.languageCode.toUpperCase())))
            .toList(),
        onChanged: (String? c) => c == null ? null : LocaleController.setLocale(c),
      );
}
` : ''}`;
  }
  // generic — controllers are ChangeNotifiers passed in.
  const imports = [
    "import 'package:flutter/material.dart';",
    dark ? `import 'package:${app}/theme/theme_controller.dart';` : '',
    i18n ? `import 'package:${app}/utils/locale_controller.dart';` : '',
  ].filter(Boolean).join('\n');
  return `${imports}

// Settings widgets — pass the ChangeNotifier controllers from your app root.
${dark ? `class ThemeSwitch extends StatelessWidget {
  const ThemeSwitch({super.key, required this.controller});
  final ThemeController controller;
  @override
  Widget build(BuildContext context) => ListenableBuilder(
        listenable: controller,
        builder: (BuildContext context, _) => SwitchListTile(
          title: const Text('Dark mode'),
          value: controller.mode == ThemeMode.dark,
          onChanged: (bool v) => controller.set(v ? ThemeMode.dark : ThemeMode.light),
        ),
      );
}
` : ''}${i18n ? `class LanguageSwitch extends StatelessWidget {
  const LanguageSwitch({super.key, required this.controller});
  final LocaleController controller;
  @override
  Widget build(BuildContext context) => ListenableBuilder(
        listenable: controller,
        builder: (BuildContext context, _) => DropdownButton<String>(
          value: controller.locale.languageCode,
          items: LocaleController.supported
              .map((Locale l) => DropdownMenuItem<String>(value: l.languageCode, child: Text(l.languageCode.toUpperCase())))
              .toList(),
          onChanged: (String? c) => c == null ? null : controller.setLocale(c),
        ),
      );
}
` : ''}`;
}

module.exports = { switchers };
