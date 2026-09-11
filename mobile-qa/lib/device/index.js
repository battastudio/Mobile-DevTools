'use strict';
// Device Lab public API — the local bridge to adb / xcrun simctl / flutter. Stable require site
// for the routes layer; internals are split by responsibility (process/discover/artifacts/…).
module.exports = {
  ...require('./ids'),        // androidPackageId, iosBundleId
  ...require('./discover'),   // listDevices, findDevice, classify
  ...require('./artifacts'),  // listArtifacts, artifactRoot, keyFor, safeArtifact, mimeOf, …
  ...require('./capture'),    // screenshot, recordStart, recordStop
  ...require('./run'),        // logStream, installLaunch, smoke, appInfo
  stopAll: require('./process').stopAll,
};
