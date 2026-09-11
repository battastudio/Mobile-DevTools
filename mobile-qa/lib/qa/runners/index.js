'use strict';
// Runner catalog barrel — the Flutter QA runners, grouped one file per category and concatenated
// in display order. Each runner is DATA: { id, title, category, severity, kind, when, fix, run(ctx) }.
// Only runners whose when(ctx) matches actually execute for a given project.
module.exports = {
  RUNNERS: [].concat(
    require('./analyze'),
    require('./test'),
    require('./coverage'),
    require('./format'),
    require('./performance'),
    require('./manual'),
  ),
};
