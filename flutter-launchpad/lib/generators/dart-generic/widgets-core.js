'use strict';

// ── widgets (plain Flutter, no ScreenUtil) ──────────────────────────────────
function appButton(sfx) {
  const imports = sfx ? `import 'package:audioplayers/audioplayers.dart';\nimport 'package:vibration/vibration.dart';\n` : '';
  const field = sfx ? '\n  final AudioPlayer _player = AudioPlayer();\n' : '';
  const onTap = sfx ? '_feedback();\n              onPressed();' : 'onPressed();';
  const fb = sfx
    ? `

  Future<void> _feedback() async {
    await _player.play(AssetSource('sfx/tap.wav'));
    if (await Vibration.hasVibrator() ?? false) Vibration.vibrate(duration: 20);
  }`
    : '';
  return `import 'package:flutter/material.dart';
${imports}
// The one Material 3 button.${sfx ? ' Emits an SFX + haptic tick on tap.' : ''}
class AppButton extends StatelessWidget {
  ${sfx ? 'AppButton' : 'const AppButton'}({super.key, required this.label, required this.onPressed, this.enabled = true});

  final String label;
  final VoidCallback onPressed;
  final bool enabled;
${field}
  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: FilledButton(
        onPressed: enabled
            ? () {
              ${onTap}
              }
            : null,
        child: Text(label),
      ),
    );
  }${fb}
}
`;
}

const appTextField = () => `import 'package:flutter/material.dart';

// The one text field — consistent border + label across forms.
class AppTextField extends StatelessWidget {
  const AppTextField({super.key, required this.controller, this.label, this.hint, this.obscure = false, this.validator});

  final TextEditingController controller;
  final String? label;
  final String? hint;
  final bool obscure;
  final String? Function(String?)? validator;

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: controller,
      obscureText: obscure,
      validator: validator,
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }
}
`;

const bottomSheet = () => `import 'package:flutter/material.dart';

// One entry point for modal bottom sheets (Material 3 shape + drag handle).
class AppBottomSheet {
  AppBottomSheet._();

  static Future<T?> show<T>(BuildContext context, {required Widget child, bool isScrollControlled = true}) {
    return showModalBottomSheet<T>(
      context: context,
      isScrollControlled: isScrollControlled,
      showDragHandle: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (BuildContext _) => Padding(padding: const EdgeInsets.all(16), child: child),
    );
  }
}
`;

const datePicker = () => `import 'package:flutter/material.dart';

// Material 3 date + range pickers with sensible defaults.
class AppDatePicker {
  AppDatePicker._();

  static Future<DateTime?> pick(BuildContext context, {DateTime? initial, DateTime? first, DateTime? last}) {
    final DateTime now = DateTime.now();
    return showDatePicker(
      context: context,
      initialDate: initial ?? now,
      firstDate: first ?? DateTime(now.year - 100),
      lastDate: last ?? DateTime(now.year + 100),
    );
  }

  static Future<DateTimeRange?> pickRange(BuildContext context) {
    final DateTime now = DateTime.now();
    return showDateRangePicker(context: context, firstDate: DateTime(now.year - 100), lastDate: DateTime(now.year + 100));
  }
}
`;

const imagePicker = () => `import 'package:image_picker/image_picker.dart';

// Attach a photo from camera or gallery. Returns null on cancel.
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

module.exports = { appButton, appTextField, bottomSheet, datePicker, imagePicker };
