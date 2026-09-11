'use strict';

const { f } = require('./helpers');
const { componentsBarrel } = require('./barrels');
const { appButton, appTextField, appScaffold } = require('./components-core');
const { appImage, appDialogs, mapView, connectivityGate } = require('./components-media');
const { commonComponents } = require('./common-components');
const { interactivityComponents } = require('./interactivity');
const { uiKitComponents } = require('./uikit');
const { maintenanceGateFile, maintenanceScreensFile } = require('./maintenance');

// Emit app_button + the gated heavier components, plus their barrel.
function componentFiles(app, config) {
  const svg = config.components.includes('flutter_svg');
  const cached = config.components.includes('cached_network_image');
  const files = [
    f('lib/components/app_button.dart', appButton(app, config.platform.sfx)),
    f('lib/components/app_text_field.dart', appTextField(app)),
    f('lib/components/app_scaffold.dart', appScaffold(app, config.platform.keyboard)),
  ];
  if (svg || cached) files.push(f('lib/components/app_image.dart', appImage(app, { svg, cached })));
  if (config.components.includes('flutter_smart_dialog')) {
    files.push(f('lib/components/app_dialogs.dart', appDialogs(app)));
  }
  if (config.maps.includes('google_maps')) files.push(f('lib/components/map_view.dart', mapView(app)));
  if (config.connectivity.length > 0) {
    files.push(f('lib/components/connectivity_gate.dart', connectivityGate(app, config)));
  }
  // Gated common UI + interactivity + maintenance components (own modules).
  files.push(...commonComponents(app, config));
  files.push(...interactivityComponents(app, config));
  files.push(...uiKitComponents(app, config));
  const maintenanceGate = maintenanceGateFile(app, config);
  if (maintenanceGate) files.push(maintenanceGate);
  const maintenanceScreens = maintenanceScreensFile(app, config);
  if (maintenanceScreens) files.push(maintenanceScreens);
  files.push(componentsBarrel(files.map((file) => file.path.replace('lib/components/', ''))));
  return files;
}

module.exports = { componentFiles };
