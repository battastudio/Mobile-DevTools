'use strict';

// Multi-language wiring for structured mode, gated on localization != none.
//   • GetX      — native Translations map (TranslationKeys.welcome.tr) + Get.updateLocale
//   • Riverpod  — flutter gen-l10n (.arb -> AppLocalizations) + a Locale Notifier
// Both persist the chosen locale via LocalStorage(AppKeys.language) and ship en + ar
// (ar seeds RTL support out of the box). Generic mode does its own i18n inline.

const { f } = require('./helpers');

// Known translations; unknown locales fall back to English placeholders. These
// keys back the shared widgets (connectivity banner, validators) — one definition.
const STRINGS = {
  en: { appTitle: 'My App', welcome: 'Welcome', retry: 'Retry', somethingWentWrong: 'Something went wrong', noConnection: 'No connection', fieldRequired: 'This field is required', invalidEmail: 'Enter a valid email', invalidPhone: 'Enter a valid phone number' },
  ar: { appTitle: 'تطبيقي', welcome: 'مرحبا', retry: 'إعادة المحاولة', somethingWentWrong: 'حدث خطأ ما', noConnection: 'لا يوجد اتصال', fieldRequired: 'هذا الحقل مطلوب', invalidEmail: 'أدخل بريدًا صالحًا', invalidPhone: 'أدخل رقم هاتف صالح' },
};
const KEY_NAMES = ['appTitle', 'welcome', 'retry', 'somethingWentWrong', 'noConnection', 'fieldRequired', 'invalidEmail', 'invalidPhone'];
const stringsFor = (l) => STRINGS[l] ?? STRINGS.en;
const localesOf = (config) => (config.identity.supportedLocales.length ? config.identity.supportedLocales : ['en']);
const supportedLiteral = (locales) => `<Locale>[${locales.map((l) => `Locale('${l}')`).join(', ')}]`;

function getxTranslations(app, locales) {
  const maps = locales
    .map((l) => {
      const s = stringsFor(l);
      const entries = KEY_NAMES.map((k) => `          TranslationKeys.${k}: '${s[k].replace(/'/g, "\\'")}',`).join('\n');
      return `        '${l}': <String, String>{\n${entries}\n        },`;
    })
    .join('\n');
  return `import 'package:${app}/general_exports.dart';

// AppTranslations — GetX native i18n. Resolve any string with \`TranslationKeys.x.tr\`.
// Add a language by adding a top-level map; add a string by adding a key to each.
class AppTranslations extends Translations {
  @override
  Map<String, Map<String, String>> get keys => <String, Map<String, String>>{
${maps}
      };
}
`;
}

function localeControllerGetx(app, locales) {
  return `import 'package:${app}/general_exports.dart';

// LocaleController — switch + persist the app locale (GetX native). Read
// [initial] in MyApp; call setLocale('ar') from a settings screen.
class LocaleController {
  LocaleController._();

  static const List<Locale> supported = ${supportedLiteral(locales)};

  static Locale get initial {
    final String? code = LocalStorage.read(AppKeys.language);
    return code != null ? Locale(code) : supported.first;
  }

  static Future<void> setLocale(String code) async {
    await LocalStorage.write(AppKeys.language, code);
    Get.updateLocale(Locale(code));
  }
}
`;
}

function localeControllerRiverpod(app, locales) {
  return `import 'package:${app}/general_exports.dart';

// localeProvider — the current app Locale. Call load() at startup to restore the
// saved locale; setLocale('ar') persists + rebuilds MaterialApp. Raw Notifier, no
// code generation.
final NotifierProvider<LocaleController, Locale> localeProvider =
    NotifierProvider<LocaleController, Locale>(LocaleController.new);

class LocaleController extends Notifier<Locale> {
  static const List<Locale> supported = ${supportedLiteral(locales)};

  @override
  Locale build() => supported.first;

  Future<void> load() async {
    final String? code = await LocalStorage.read(AppKeys.language);
    if (code != null) state = Locale(code);
  }

  Future<void> setLocale(String code) async {
    await LocalStorage.write(AppKeys.language, code);
    state = Locale(code);
  }
}
`;
}

// i18nFiles — the locale files (+ .arb / l10n.yaml for Riverpod's gen-l10n).
function i18nFiles(app, config) {
  if (config.localization === 'none') return [];
  const locales = localesOf(config);
  const riverpod = config.mode === 'structured-riverpod';
  if (!riverpod) {
    return [
      f('lib/utils/app_translations.dart', getxTranslations(app, locales)),
      f('lib/utils/locale_controller.dart', localeControllerGetx(app, locales)),
    ];
  }
  const arb = (l) => {
    const s = stringsFor(l);
    const obj = { '@@locale': l };
    for (const k of KEY_NAMES) obj[k] = s[k];
    return JSON.stringify(obj, null, 2);
  };
  const template = locales.includes('en') ? 'en' : locales[0];
  return [
    f('lib/utils/locale_controller.dart', localeControllerRiverpod(app, locales)),
    f('lib/utils/l10n.dart', `import 'package:${app}/general_exports.dart';
import 'package:${app}/l10n/app_localizations.dart';

// Global l10n accessor — reference any string anywhere (l10n.welcome), no context.
AppLocalizations get l10n => AppLocalizations.of(rootNavigatorKey.currentContext!)!;
`),
    f('l10n.yaml', `# flutter gen-l10n config. Run \`flutter gen-l10n\` (or \`flutter pub get\` with
# generate: true) to emit AppLocalizations from the .arb files below.
arb-dir: lib/l10n
template-arb-file: app_${template}.arb
output-localization-file: app_localizations.dart
output-class: AppLocalizations
`),
    ...locales.map((l) => f(`lib/l10n/app_${l}.arb`, arb(l))),
  ];
}

module.exports = { i18nFiles };
