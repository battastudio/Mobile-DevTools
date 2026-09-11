'use strict';

// components-media barrel — heavier gated components (image, dialogs, map, gate).
const { appImage, appDialogs } = require('./image-dialogs');
const { mapView, connectivityGate } = require('./map-connectivity');

module.exports = { appImage, appDialogs, mapView, connectivityGate };
