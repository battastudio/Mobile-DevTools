'use strict';

// common-components barrel — the gated common UI set (bottom sheet, date picker,
// image attach, file download, pdf viewer, share, keyboard dismiss). Each file
// imports ONLY general_exports and stays under the 150-line house rule.

const { f } = require('../helpers');
const { bottomSheet, datePicker } = require('./sheets');
const { imagePicker, fileDownload, pdfViewer, shareService, keyboardDismiss } = require('./media');

function commonComponents(app, config) {
  const c = config.components;
  const files = [];
  if (c.includes('bottom_sheet')) files.push(f('lib/components/app_bottom_sheet.dart', bottomSheet(app)));
  if (c.includes('date_picker')) files.push(f('lib/components/app_date_picker.dart', datePicker(app)));
  if (c.includes('image_attach')) files.push(f('lib/components/app_image_picker.dart', imagePicker(app)));
  if (c.includes('file_download')) files.push(f('lib/components/app_file_download.dart', fileDownload(app)));
  if (c.includes('pdf')) files.push(f('lib/components/app_pdf_viewer.dart', pdfViewer(app)));
  if (c.includes('share')) files.push(f('lib/components/app_share.dart', shareService(app)));
  if (config.platform.keyboard) files.push(f('lib/components/keyboard_dismiss.dart', keyboardDismiss(app)));
  return files;
}

module.exports = { commonComponents };
