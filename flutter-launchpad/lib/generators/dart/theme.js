'use strict';

const { hexToArgb } = require('./helpers');

// theme/app_colors.dart, theme/app_theme.dart, theme/theme_controller.dart
function appColors(config) {
  return `// Palette — reference every colour via AppColors (ints, wrapped in Color()).
class AppColors {
  AppColors._();

  static const int primary = ${hexToArgb(config.identity.brandColor)};
  static const int secondary = 0xFF11B981;
  static const int background = 0xFFF8F9FB;
  static const int surface = 0xFFFFFFFF;
  static const int error = 0xFFE24C4C;
  static const int textDark = 0xFF15181E;
  static const int textLight = 0xFFF8F9FB;
  static const int muted = 0xFF8A94A6;
}
`;
}

function appTheme(app, themes) {
  const dark = themes.includes('dark');
  const darkGetter = dark
    ? `
ThemeData get darkTheme => ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: const Color(AppColors.textDark),
      colorScheme: ColorScheme.fromSeed(
        seedColor: const Color(AppColors.primary),
        brightness: Brightness.dark,
      ),
    );
`
    : '';
  return `import 'package:${app}/general_exports.dart';

// Material 3 themes seeded from AppColors. light${dark ? '/dark' : ''} wired into MyApp.
ThemeData get lightTheme => ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      scaffoldBackgroundColor: const Color(AppColors.background),
      colorScheme: ColorScheme.fromSeed(
        seedColor: const Color(AppColors.primary),
      ),
    );
${darkGetter}`;
}

// theme/theme_controller.dart — runtime light/dark toggle + persistence.
function themeControllerGetx(app) {
  return `import 'package:${app}/general_exports.dart';

// ThemeController — persisted light/dark toggle. GetX applies it via
// Get.changeThemeMode; MyApp seeds GetMaterialApp.themeMode with [initial].
class ThemeController {
  ThemeController._();

  static ThemeMode get initial {
    switch (LocalStorage.read(AppKeys.themeMode)) {
      case 'dark':
        return ThemeMode.dark;
      case 'light':
        return ThemeMode.light;
      default:
        return ThemeMode.system;
    }
  }

  static Future<void> set(ThemeMode mode) async {
    await LocalStorage.write(AppKeys.themeMode, mode.name);
    Get.changeThemeMode(mode);
  }
}
`;
}

function themeControllerRiverpod(app) {
  return `import 'package:${app}/general_exports.dart';

// themeModeProvider — persisted light/dark toggle. Call load() at startup;
// MaterialApp watches it for themeMode. Raw Notifier, no code generation.
final NotifierProvider<ThemeController, ThemeMode> themeModeProvider =
    NotifierProvider<ThemeController, ThemeMode>(ThemeController.new);

class ThemeController extends Notifier<ThemeMode> {
  @override
  ThemeMode build() => ThemeMode.system;

  Future<void> load() async {
    switch (await LocalStorage.read(AppKeys.themeMode)) {
      case 'dark':
        state = ThemeMode.dark;
      case 'light':
        state = ThemeMode.light;
      default:
        state = ThemeMode.system;
    }
  }

  Future<void> set(ThemeMode mode) async {
    await LocalStorage.write(AppKeys.themeMode, mode.name);
    state = mode;
  }
}
`;
}

module.exports = { appColors, appTheme, themeControllerGetx, themeControllerRiverpod };
