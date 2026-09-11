'use strict';
// Shared helpers for the structure skeleton generators.
const PascalCase = (s) => s.replace(/(^|[_-])(\w)/g, (_, __, c) => c.toUpperCase());

const barrel = (title, exports) =>
  [`// ${title} — subtree barrel. Add every new file here (structured single-barrel rule).`, ...exports.map((e) => `export '${e}';`), ''].join('\n');

module.exports = { PascalCase, barrel };
