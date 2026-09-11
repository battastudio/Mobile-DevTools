'use strict';

// Testing depth — a widget smoke test, an integration_test boot test, and a
// coverage script that enforces a minimum line-coverage threshold.

const { f } = require('../helpers');

function testingFiles(config) {
  if (!config.testing) return [];
  return [
    f('test/widget_test.dart', `import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

// Smoke widget test — replace the pumped widget with a real screen as you build.
void main() {
  testWidgets('renders a widget', (WidgetTester tester) async {
    await tester.pumpWidget(const MaterialApp(home: Scaffold(body: Center(child: Text('ok')))));
    expect(find.text('ok'), findsOneWidget);
  });
}
`),
    f('integration_test/app_test.dart', `import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

// End-to-end smoke test. Run: flutter test integration_test/app_test.dart
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets('app boots', (WidgetTester tester) async {
    await tester.pumpWidget(const MaterialApp(home: SizedBox.shrink()));
    await tester.pumpAndSettle();
    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
`),
    f('tool/coverage.sh', `#!/bin/sh
# Run tests with coverage + enforce a minimum line-coverage threshold.
# HTML: genhtml coverage/lcov.info -o coverage/html
set -e
THRESHOLD=60
flutter test --coverage
pct=$(awk -F: '/^LF:/{found+=$2} /^LH:/{hit+=$2} END{if(found==0){print 0}else{printf "%d", hit*100/found}}' coverage/lcov.info)
echo "Line coverage: \${pct}% (threshold \${THRESHOLD}%)"
[ "\$pct" -ge "\$THRESHOLD" ] || { echo "Coverage \${pct}% is below \${THRESHOLD}%"; exit 1; }
`),
  ];
}

module.exports = { testingFiles };
