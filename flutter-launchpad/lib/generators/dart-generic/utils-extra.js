'use strict';

const transitions = () => `import 'package:flutter/material.dart';

// Custom route transitions — Navigator.of(context).push(fadeRoute(const Next())).
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
`;

const localeController = (app, locales) => `import 'package:flutter/material.dart';

import 'package:${app}/utils/app_keys.dart';
import 'package:${app}/utils/local_storage.dart';

// LocaleController — a ChangeNotifier holding the app Locale. Wire it into
// MaterialApp(locale: controller.locale, ...) with an AnimatedBuilder/Provider.
class LocaleController extends ChangeNotifier {
  static const List<Locale> supported = <Locale>[${locales.map((l) => `Locale('${l}')`).join(', ')}];

  Locale _locale = supported.first;
  Locale get locale => _locale;

  Future<void> load() async {
    final String? code = await LocalStorage.read(AppKeys.language);
    if (code != null) {
      _locale = Locale(code);
      notifyListeners();
    }
  }

  Future<void> setLocale(String code) async {
    await LocalStorage.write(AppKeys.language, code);
    _locale = Locale(code);
    notifyListeners();
  }
}
`;

const appAssets = () => `// Asset path constants — reference bundled assets ONLY via AppAssets.
class AppAssets {
  AppAssets._();

  static const String logo = 'assets/images/logo.png';
  static const String placeholder = 'assets/images/placeholder.png';
  static const String iconHome = 'assets/svg/home.svg';
}
`;

const ARB_STRINGS = {
  en: { appTitle: 'My App', welcome: 'Welcome', retry: 'Retry', somethingWentWrong: 'Something went wrong', noConnection: 'No connection', fieldRequired: 'This field is required', invalidEmail: 'Enter a valid email', invalidPhone: 'Enter a valid phone number' },
  ar: { appTitle: 'تطبيقي', welcome: 'مرحبا', retry: 'إعادة المحاولة', somethingWentWrong: 'حدث خطأ ما', noConnection: 'لا يوجد اتصال', fieldRequired: 'هذا الحقل مطلوب', invalidEmail: 'أدخل بريدًا صالحًا', invalidPhone: 'أدخل رقم هاتف صالح' },
};
const arbFor = (l) =>
  JSON.stringify({ '@@locale': l, ...(ARB_STRINGS[l] ?? ARB_STRINGS.en) }, null, 2);

module.exports = { transitions, localeController, appAssets, arbFor };
