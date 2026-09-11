'use strict';

const { pascal, f } = require('../helpers');

// ── sample feature (Riverpod) ─────────────────────────────────────────────
function featureRiverpod(app, feat, hero) {
  const Pascal = pascal(feat);
  const dir = `lib/screens/${feat}`;
  const heroBlock = hero
    ? `Hero(tag: '${feat}-logo', child: const FlutterLogo(size: 72)),
                  SizedBox(height: 24.h),
                  `
    : '';
  const controller = `import 'package:${app}/general_exports.dart';

// ${Pascal}Controller — raw Notifier + provider-in-file (the Riverpod mirror of the
// GetX controller). Mutable field bag; call ref.notifyListeners() to rebuild.
// No code generation — plain mutable fields, no immutable state objects.
final NotifierProvider<${Pascal}Controller, void> ${feat}Provider =
    NotifierProvider<${Pascal}Controller, void>(${Pascal}Controller.new);

class ${Pascal}Controller extends Notifier<void> {
  bool isLoading = true;
  Map<String, dynamic>? data;

  @override
  void build() {
    getData();
  }

  void getData() {
    isLoading = true;
    ref.notifyListeners();
    ApiRequest(
      path: ApiEndpoints.${feat},
      className: '${Pascal}Controller',
    ).request(
      onSuccess: (dynamic data, dynamic response) {
        this.data = data as Map<String, dynamic>?;
        isLoading = false;
        ref.notifyListeners();
      },
      onError: (dynamic error) {
        isLoading = false;
        ref.notifyListeners();
      },
    );
  }
}
`;
  const screen = `import 'package:${app}/general_exports.dart';

// ${Pascal} — ConsumerWidget (the Riverpod convention drops the _screen suffix). Watches the
// provider to rebuild, reads the notifier for actions.
class ${Pascal} extends ConsumerWidget {
  const ${Pascal}({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    ref.watch(${feat}Provider);
    final ${Pascal}Controller controller = ref.read(${feat}Provider.notifier);
    return Scaffold(
      appBar: AppBar(title: const Text('${Pascal}')),
      body: controller.isLoading
          ? const Center(child: CircularProgressIndicator())
          : Padding(
              padding: EdgeInsets.all(16.w),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: <Widget>[
                  ${heroBlock}Text('\${controller.data ?? '${Pascal} ready'}'),
                  SizedBox(height: 16.h),
                  AppButton(label: 'Reload', onPressed: controller.getData),
                ],
              ),
            ),
    );
  }
}
`;
  return [f(`${dir}/${feat}_controller.dart`, controller), f(`${dir}/${feat}.dart`, screen)];
}

module.exports = { featureRiverpod };
