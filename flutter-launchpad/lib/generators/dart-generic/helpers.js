'use strict';

// f — normalize a path + content into a GenFile (ensures a trailing newline).
const f = (path, content) => ({ path, content: content.replace(/\n?$/, '\n') });

module.exports = { f };
