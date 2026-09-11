'use strict';

const { pascal, f } = require('../helpers');

// ── sample feature (GetX) ─────────────────────────────────────────────────
function featureGetx(app, feat, hero) {
  const Pascal = pascal(feat);
  const dir = `lib/screens/${feat}`;
  const heroBlock = hero
    ? `Hero(tag: '${feat}-logo', child: const FlutterLogo(size: 72)),
                      SizedBox(height: 24.h),
                      `
    : '';
  const controller = `import 'package:${app}/general_exports.dart';

// ${Pascal}Controller — GetxController. A mutable field bag; call update() to
// rebuild the GetBuilder. Network calls go inline through ApiRequest. No codegen.
class ${Pascal}Controller extends GetxController {
  bool isLoading = true;
  Map<String, dynamic>? data;

  @override
  void onInit() {
    super.onInit();
    getData();
  }

  void getData() {
    isLoading = true;
    update();
    ApiRequest(
      path: ApiEndpoints.${feat},
      method: getMethod,
      className: '${Pascal}Controller',
    ).request(
      onSuccess: (dynamic data, dynamic response) {
        this.data = data as Map<String, dynamic>?;
        isLoading = false;
        update();
      },
      onError: (dynamic error) {
        isLoading = false;
        update();
      },
    );
  }
}
`;
  const screen = `import 'package:${app}/general_exports.dart';

// ${Pascal}Screen — StatelessWidget wrapped in GetBuilder<${Pascal}Controller>.
class ${Pascal}Screen extends StatelessWidget {
  const ${Pascal}Screen({super.key});

  @override
  Widget build(BuildContext context) {
    return GetBuilder<${Pascal}Controller>(
      init: ${Pascal}Controller(),
      builder: (${Pascal}Controller controller) {
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
      },
    );
  }
}
`;
  return [f(`${dir}/${feat}_controller.dart`, controller), f(`${dir}/${feat}_screen.dart`, screen)];
}

// ── feature unit test (structured testing style, no mockito) ──────────────
function featureTest(app, feat, riverpod) {
  const Pascal = pascal(feat);
  if (riverpod) {
    return f(`test/${feat}_controller_test.dart`, `import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:${app}/screens/${feat}/${feat}_controller.dart';

// Structured testing seam: drive the Notifier through a ProviderContainer, assert on
// its plain mutable fields. No mockito, no network — pure state checks.
void main() {
  test('${Pascal}Controller starts loading', () {
    final ProviderContainer container = ProviderContainer();
    addTearDown(container.dispose);
    final ${Pascal}Controller controller =
        container.read(${feat}Provider.notifier);
    expect(controller.isLoading, isTrue);
    expect(controller.data, isNull);
  });
}
`);
  }
  return f(`test/${feat}_controller_test.dart`, `import 'package:flutter_test/flutter_test.dart';
import 'package:${app}/screens/${feat}/${feat}_controller.dart';

// Structured testing seam: construct the GetxController directly and assert on its
// plain mutable fields. No mockito, no network — pure state checks.
void main() {
  test('${Pascal}Controller default state', () {
    final ${Pascal}Controller controller = ${Pascal}Controller();
    expect(controller.isLoading, isTrue);
    expect(controller.data, isNull);
  });
}
`);
}

module.exports = { featureGetx, featureTest };
