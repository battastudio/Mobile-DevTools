'use strict';
// QA engine public API — the stable require site for the routes + CLI layers.
const { RUNNERS } = require('./runners');
module.exports = {
  RUNNERS,
  ...require('./engine'),   // runProject, runAll, buildCtx
  ...require('./store'),    // qaData, qaAll, mergeAiPlan, saveRecord, readCache
  ...require('./report'),   // qaReportHtml, junitXml, coverageHtml
  ...require('./autofix'),  // autofix
};
