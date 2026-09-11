'use strict';

// Reusable form validators. Message source is mode-aware: GetX reads
// TranslationKeys.x.tr, riverpod/generic read the global l10n.x, and with
// localization off they fall back to English literals.

const validators = (app, config) => {
  const i18n = config.localization !== 'none';
  const getx = config.mode === 'structured-getx';
  const imp = i18n ? (getx ? `import 'package:${app}/general_exports.dart';\n\n` : `import 'package:${app}/utils/l10n.dart';\n\n`) : '';
  const msg = (key, en) => (i18n ? (getx ? `TranslationKeys.${key}.tr` : `l10n.${key}`) : `'${en}'`);
  const requiredMsg = i18n ? msg('fieldRequired', '') : `'\$field is required'`;
  return `${imp}// Reusable form validators — return null when valid, else a localized error string.
class Validators {
  Validators._();

  static String? required(String? v, {String field = 'This field'}) =>
      (v == null || v.trim().isEmpty) ? ${requiredMsg} : null;

  static String? email(String? v) {
    if (v == null || v.isEmpty) return ${msg('fieldRequired', 'This field is required')};
    final RegExp re = RegExp(r'^[\\w.+-]+@[\\w-]+\\.[\\w.-]+\$');
    return re.hasMatch(v) ? null : ${msg('invalidEmail', 'Enter a valid email')};
  }

  static String? minLength(String? v, int min) =>
      (v == null || v.length < min) ? 'Must be at least \$min characters' : null;

  static String? phone(String? v) {
    if (v == null || v.isEmpty) return ${msg('fieldRequired', 'This field is required')};
    return RegExp(r'^\\+?[0-9]{7,15}\$').hasMatch(v) ? null : ${msg('invalidPhone', 'Enter a valid phone number')};
  }
}
`;
};

module.exports = { validators };
