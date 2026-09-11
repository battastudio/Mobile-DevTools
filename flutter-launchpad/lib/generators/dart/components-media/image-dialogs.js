'use strict';

function appImage(app, opts) {
  const imports = [
    opts.cached ? "import 'package:cached_network_image/cached_network_image.dart';" : '',
    opts.svg ? "import 'package:flutter_svg/flutter_svg.dart';" : '',
    `import 'package:${app}/general_exports.dart';`,
  ]
    .filter(Boolean)
    .join('\n');
  const svgBranch = opts.svg
    ? `    if (source.endsWith('.svg')) {
      return SvgPicture.asset(source, width: width, height: height, fit: fit);
    }
`
    : '';
  const netBranch = opts.cached
    ? `    if (source.startsWith('http')) {
      return CachedNetworkImage(imageUrl: source, width: width, height: height, fit: fit);
    }
`
    : '';
  return `${imports}

// One image entry point: ${opts.svg ? 'SVG (.svg asset), ' : ''}${opts.cached ? 'cached network (http…), ' : ''}bundled asset.
// Keeps image-loading choices out of feature screens.
class AppImage extends StatelessWidget {
  const AppImage(this.source, {super.key, this.width, this.height, this.fit = BoxFit.cover});

  final String source;
  final double? width;
  final double? height;
  final BoxFit fit;

  @override
  Widget build(BuildContext context) {
${svgBranch}${netBranch}    return Image.asset(source, width: width, height: height, fit: fit);
  }
}
`;
}

function appDialogs(app) {
  return `import 'package:flutter_smart_dialog/flutter_smart_dialog.dart';

import 'package:${app}/general_exports.dart';

// Confirm/alert helpers on top of SmartDialog — one place for dialog styling.
class AppDialogs {
  AppDialogs._();

  static Future<bool> confirm(
    String message, {
    String confirmLabel = 'OK',
    String cancelLabel = 'Cancel',
  }) async {
    bool result = false;
    await SmartDialog.show(
      builder: (BuildContext context) => AlertDialog(
        content: Text(message),
        actions: <Widget>[
          TextButton(onPressed: SmartDialog.dismiss, child: Text(cancelLabel)),
          TextButton(
            onPressed: () {
              result = true;
              SmartDialog.dismiss();
            },
            child: Text(confirmLabel),
          ),
        ],
      ),
    );
    return result;
  }
}
`;
}

module.exports = { appImage, appDialogs };
