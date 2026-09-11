'use strict';

// components/app_button.dart (+ SFX/haptics when config.platform.sfx)
function appButton(app, sfx) {
  const sfxImports = sfx
    ? `import 'package:audioplayers/audioplayers.dart';
import 'package:vibration/vibration.dart';

`
    : '';
  const sfxField = sfx
    ? `
  final AudioPlayer _player = AudioPlayer();
`
    : '';
  const onTapBody = sfx
    ? `        _feedback();
        onPressed();`
    : `        onPressed();`;
  const feedbackFn = sfx
    ? `
  Future<void> _feedback() async {
    await _player.play(AssetSource('sfx/tap.wav'));
    if (await Vibration.hasVibrator() ?? false) {
      Vibration.vibrate(duration: 20);
    }
  }
`
    : '';
  return `${sfxImports}import 'package:${app}/general_exports.dart';

// AppButton — the ONE Material 3 button. ${sfx ? 'Emits an SFX + haptic tick on tap.' : 'Plain tap.'}
class AppButton extends StatelessWidget {
  const AppButton({
    required this.label,
    required this.onPressed,
    this.enabled = true,
    super.key,
  });

  final String label;
  final VoidCallback onPressed;
  final bool enabled;
${sfxField}
  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: FilledButton(
        onPressed: enabled
            ? () {
${onTapBody}
              }
            : null,
        style: FilledButton.styleFrom(
          backgroundColor: const Color(AppColors.primary),
          padding: EdgeInsets.symmetric(vertical: 14.h),
        ),
        child: Text(label),
      ),
    );
  }
${feedbackFn}}
`;
}

function appTextField(app) {
  return `import 'package:${app}/general_exports.dart';

// The one text field. Wraps TextFormField with the app border + label style so
// every form stays consistent. Pass a validator for inline validation.
class AppTextField extends StatelessWidget {
  const AppTextField({
    super.key,
    required this.controller,
    this.label,
    this.hint,
    this.obscure = false,
    this.keyboardType,
    this.validator,
  });

  final TextEditingController controller;
  final String? label;
  final String? hint;
  final bool obscure;
  final TextInputType? keyboardType;
  final String? Function(String?)? validator;

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: controller,
      obscureText: obscure,
      keyboardType: keyboardType,
      validator: validator,
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12.r)),
      ),
    );
  }
}
`;
}

function appScaffold(app, keyboard) {
  const bodyWidget = 'SafeArea(child: Padding(padding: EdgeInsets.all(16.w), child: body))';
  const wrapped = keyboard ? `KeyboardDismiss(child: ${bodyWidget})` : bodyWidget;
  return `import 'package:${app}/general_exports.dart';

// Standard screen shell — consistent AppBar + safe-area padded body. Prefer this
// over a bare Scaffold so background/padding stay uniform across features.${keyboard ? '\n// Taps outside a field dismiss the keyboard (KeyboardDismiss).' : ''}
class AppScaffold extends StatelessWidget {
  const AppScaffold({
    super.key,
    required this.body,
    this.title,
    this.actions,
    this.floatingActionButton,
  });

  final Widget body;
  final String? title;
  final List<Widget>? actions;
  final Widget? floatingActionButton;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(AppColors.background),
      appBar: title == null ? null : AppBar(title: Text(title!), actions: actions),
      floatingActionButton: floatingActionButton,
      body: ${wrapped},
    );
  }
}
`;
}

module.exports = { appButton, appTextField, appScaffold };
