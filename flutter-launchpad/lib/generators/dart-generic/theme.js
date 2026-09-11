'use strict';

// '#1E5AF6' → '0xFF1E5AF6' (accepts #RGB6 or #ARGB8; falls back to the brand blue).
const hexToArgb = (hex) => {
  const h = (hex || '').replace('#', '').toUpperCase();
  if (/^[0-9A-F]{8}$/.test(h)) return `0x${h}`;
  if (/^[0-9A-F]{6}$/.test(h)) return `0xFF${h}`;
  return '0xFF1E5AF6';
};

// ── theme ────────────────────────────────────────────────────────────────
const appColors = (brand) => `import 'package:flutter/material.dart';

// Palette — reference colors only via AppColors.
class AppColors {
  AppColors._();

  static const Color primary = Color(${hexToArgb(brand)});
  static const Color secondary = Color(0xFF11B981);
  static const Color background = Color(0xFFF8F9FB);
  static const Color error = Color(0xFFE24C4C);
}
`;

const appTheme = (app, dark) => `import 'package:flutter/material.dart';

import 'package:${app}/theme/app_colors.dart';

// Material 3 themes seeded from AppColors.
ThemeData get lightTheme => ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(seedColor: AppColors.primary),
      scaffoldBackgroundColor: AppColors.background,
    );
${dark ? `
ThemeData get darkTheme => ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: ColorScheme.fromSeed(seedColor: AppColors.primary, brightness: Brightness.dark),
    );
` : ''}`;

const themeController = (app) => `import 'package:flutter/material.dart';

import 'package:${app}/utils/app_keys.dart';
import 'package:${app}/utils/local_storage.dart';

// Persisted light/dark toggle. Wire into MaterialApp(themeMode: controller.mode).
class ThemeController extends ChangeNotifier {
  ThemeMode _mode = ThemeMode.system;
  ThemeMode get mode => _mode;

  Future<void> load() async {
    final String? saved = await LocalStorage.read(AppKeys.themeMode);
    _mode = saved == 'dark'
        ? ThemeMode.dark
        : saved == 'light'
            ? ThemeMode.light
            : ThemeMode.system;
    notifyListeners();
  }

  Future<void> set(ThemeMode mode) async {
    await LocalStorage.write(AppKeys.themeMode, mode.name);
    _mode = mode;
    notifyListeners();
  }
}
`;

module.exports = { appColors, appTheme, themeController };
