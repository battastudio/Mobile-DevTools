'use strict';

// Common components — image attach, file download, PDF viewer, share, and the
// tap-to-dismiss keyboard wrapper.

function imagePicker(app) {
  return `import 'package:image_picker/image_picker.dart';

import 'package:${app}/general_exports.dart';

// AppImagePicker — attach a photo from the camera or gallery. Returns null when
// the user cancels. Needs camera/photos permissions (see PermissionService).
class AppImagePicker {
  AppImagePicker._();

  static final ImagePicker _picker = ImagePicker();

  static Future<XFile?> fromGallery({int imageQuality = 80}) =>
      _picker.pickImage(source: ImageSource.gallery, imageQuality: imageQuality);

  static Future<XFile?> fromCamera({int imageQuality = 80}) =>
      _picker.pickImage(source: ImageSource.camera, imageQuality: imageQuality);

  static Future<List<XFile>> multiple({int imageQuality = 80}) =>
      _picker.pickMultiImage(imageQuality: imageQuality);
}
`;
}

function fileDownload(app) {
  return `import 'dart:io';

import 'package:dio/dio.dart';
import 'package:open_filex/open_filex.dart';
import 'package:path_provider/path_provider.dart';

import 'package:${app}/general_exports.dart';

// FileDownloader — download a url into the app documents dir and open it with the
// OS handler. Returns the saved path, or null (and toasts) on failure.
class FileDownloader {
  FileDownloader._();

  static Future<String?> download(String url, String fileName) async {
    try {
      final Directory dir = await getApplicationDocumentsDirectory();
      final String path = '\${dir.path}/\$fileName';
      await Dio().download(url, path);
      return path;
    } catch (e) {
      consoleLog('download failed: \$e', key: 'download');
      showMessage('Download failed');
      return null;
    }
  }

  static Future<void> open(String path) => OpenFilex.open(path);
}
`;
}

function pdfViewer(app) {
  return `import 'dart:io';

import 'package:syncfusion_flutter_pdfviewer/pdfviewer.dart';

import 'package:${app}/general_exports.dart';

// PdfViewerScreen — view a network OR local-file PDF in-app. Push it with your
// navigator: pass either [url] or [filePath].
class PdfViewerScreen extends StatelessWidget {
  const PdfViewerScreen({super.key, this.url, this.filePath, this.title})
      : assert(url != null || filePath != null, 'Provide url or filePath');

  final String? url;
  final String? filePath;
  final String? title;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(title ?? 'Document')),
      body: url != null ? SfPdfViewer.network(url!) : SfPdfViewer.file(File(filePath!)),
    );
  }
}
`;
}

function shareService(app) {
  return `import 'package:share_plus/share_plus.dart';

import 'package:${app}/general_exports.dart';

// ShareService — share plain text, a link, or files (e.g. a downloaded PDF) via
// the system share sheet (share_plus v12 ShareParams API).
class ShareService {
  ShareService._();

  static Future<void> text(String value, {String? subject}) =>
      SharePlus.instance.share(ShareParams(text: value, subject: subject));

  static Future<void> link(String url, {String? message}) =>
      SharePlus.instance.share(ShareParams(text: message == null ? url : '\$message \$url'));

  static Future<void> files(List<String> paths, {String? text}) =>
      SharePlus.instance.share(ShareParams(files: paths.map((String p) => XFile(p)).toList(), text: text));
}
`;
}

function keyboardDismiss(app) {
  return `import 'package:${app}/general_exports.dart';

// KeyboardDismiss — tap anywhere outside a field to dismiss the keyboard.
// AppScaffold wraps its body in this when keyboard handling is enabled.
class KeyboardDismiss extends StatelessWidget {
  const KeyboardDismiss({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.translucent,
      onTap: () => FocusScope.of(context).unfocus(),
      child: child,
    );
  }
}
`;
}

module.exports = { imagePicker, fileDownload, pdfViewer, shareService, keyboardDismiss };
