'use strict';

const fileDownload = (app) => `import 'dart:io';

import 'package:dio/dio.dart';
import 'package:open_filex/open_filex.dart';
import 'package:path_provider/path_provider.dart';

import 'package:${app}/utils/navigator_key.dart';

// Download a url into the app documents dir and open it with the OS handler.
class FileDownloader {
  FileDownloader._();

  static Future<String?> download(String url, String fileName) async {
    try {
      final Directory dir = await getApplicationDocumentsDirectory();
      final String path = '\${dir.path}/\$fileName';
      await Dio().download(url, path);
      return path;
    } catch (_) {
      showMessage('Download failed');
      return null;
    }
  }

  static Future<void> open(String path) => OpenFilex.open(path);
}
`;

const pdfViewer = () => `import 'dart:io';

import 'package:flutter/material.dart';
import 'package:syncfusion_flutter_pdfviewer/pdfviewer.dart';

// View a network OR local-file PDF in-app. Pass either [url] or [filePath].
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

const shareService = () => `import 'package:share_plus/share_plus.dart';

// Share plain text, a link, or files via the system share sheet (share_plus v12).
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

const keyboardDismiss = () => `import 'package:flutter/material.dart';

// Wrap a screen body: tap outside a field to dismiss the keyboard.
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

const refresher = () => `import 'package:flutter/material.dart';

// Pull-to-refresh wrapper. Give it a scrollable child + async onRefresh.
class AppRefresher extends StatelessWidget {
  const AppRefresher({super.key, required this.onRefresh, required this.child});

  final Future<void> Function() onRefresh;
  final Widget child;

  @override
  Widget build(BuildContext context) => RefreshIndicator(onRefresh: onRefresh, child: child);
}
`;

module.exports = { fileDownload, pdfViewer, shareService, keyboardDismiss, refresher };
