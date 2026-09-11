'use strict';

// Shared helpers for the Dart generators. pascal/f are used everywhere; hexToArgb
// and navigateBody back the theme colours and the mode-specific navigation body.

const pascal = (s) =>
  s.replace(/(^|[_-])(\w)/g, (_m, _p, c) => c.toUpperCase());

const f = (path, content) => ({ path, content: content.replace(/\n?$/, '\n') });

// '#1E5AF6' → '0xFF1E5AF6' (accepts #RGB6 or #ARGB8; falls back to the brand blue).
const hexToArgb = (hex) => {
  const h = (hex || '').replace('#', '').toUpperCase();
  if (/^[0-9A-F]{8}$/.test(h)) return `0x${h}`;
  if (/^[0-9A-F]{6}$/.test(h)) return `0xFF${h}`;
  return '0xFF1E5AF6';
};

// Navigate to a route string — mode-specific (GetX named route vs GoRouter push
// via the nav_extension). Used by push taps, deep links, and notification taps.
function navigateBody(config) {
  const call = config.mode === 'structured-riverpod' ? 'route.push();' : 'Get.toNamed<dynamic>(route);';
  return `    if (route == null || route.isEmpty) return;
    ${call}`;
}

module.exports = { pascal, f, hexToArgb, navigateBody };
