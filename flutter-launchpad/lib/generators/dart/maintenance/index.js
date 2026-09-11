'use strict';

// maintenance barrel — the force-update / maintenance gate (structured mode):
// the service+model, the root gate widget, and the blocking screens.

const { maintenanceServiceFile } = require('./service');
const { maintenanceScreensFile } = require('./screens');
const { maintenanceGateFile } = require('./gate');

module.exports = { maintenanceServiceFile, maintenanceScreensFile, maintenanceGateFile };
