'use strict';
// Real architecture scaffolds for GENERIC mode (mode='generic'): clean / mvc / mvmm
// emit a working sample feature wired end-to-end, instead of empty dirs.
const { clean } = require('./clean');
const { mvc, mvvm, mainDart } = require('./mvc-mvvm');

const f = (path, content) => ({ path, content: content.replace(/\n?$/, '\n') });
const pascal = (s) => s.replace(/(^|[_-\s])(\w)/g, (_m, _p, c) => c.toUpperCase());

// The architectures that emit real code (vs the folder skeletons).
const REAL_ARCHITECTURES = new Set(['clean', 'mvc', 'mvmm', 'mvvm']);

function architectureFiles(config) {
  const app = config.appName;
  const feat = config.features[0] || 'home';
  const F = pascal(feat);
  const home =
    config.architecture === 'clean'
      ? `import 'package:${app}/core/network/dio_client.dart';
import 'package:${app}/features/${feat}/data/datasources/${feat}_remote_data_source.dart';
import 'package:${app}/features/${feat}/data/repositories/${feat}_repository_impl.dart';
import 'package:${app}/features/${feat}/domain/usecases/get_${feat}s.dart';
import 'package:${app}/features/${feat}/presentation/controllers/${feat}_controller.dart';
import 'package:${app}/features/${feat}/presentation/pages/${feat}_page.dart';`
      : '';
  let app2 =
    config.architecture === 'clean'
      ? `import 'package:flutter/material.dart';
${home}

// Composition root — wires data → domain → presentation for the sample feature.
class ${pascal(app)}App extends StatelessWidget {
  const ${pascal(app)}App({super.key});

  @override
  Widget build(BuildContext context) {
    final ds = ${F}RemoteDataSource(DioClient().dio);
    final controller = ${F}Controller(Get${F}s(${F}RepositoryImpl(ds)));
    return MaterialApp(home: ${F}Page(controller: controller));
  }
}`
      : config.architecture === 'mvc'
        ? `import 'package:flutter/material.dart';

import 'package:${app}/controllers/${feat}_controller.dart';
import 'package:${app}/views/${feat}_view.dart';

class ${pascal(app)}App extends StatelessWidget {
  const ${pascal(app)}App({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(home: ${F}View(controller: ${F}Controller()));
}`
        : `import 'package:flutter/material.dart';

import 'package:${app}/viewmodels/${feat}_viewmodel.dart';
import 'package:${app}/views/${feat}_view.dart';

class ${pascal(app)}App extends StatelessWidget {
  const ${pascal(app)}App({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(home: ${F}View(viewModel: ${F}ViewModel()));
}`;

  // Mount the MaintenanceGate at the app root when the gate is enabled (generic mode
  // gets its gate + navigatorKey from the capability layer in dart-generic).
  if (config.platform.maintenance !== 'none') {
    const imp = `import 'package:${app}/utils/navigator_key.dart';\nimport 'package:${app}/widgets/maintenance_gate.dart';\n`;
    app2 = app2
      .replace("import 'package:flutter/material.dart';\n", `import 'package:flutter/material.dart';\n${imp}`)
      .replace(
        /MaterialApp\(home:/g,
        'MaterialApp(navigatorKey: navigatorKey, builder: (_, Widget? child) => MaintenanceGate(child: child ?? const SizedBox.shrink()), home:',
      );
  }

  const files = [f('lib/main.dart', mainDart(app)), f('lib/app.dart', app2)];
  if (config.architecture === 'clean') files.push(...clean(app, feat));
  else if (config.architecture === 'mvc') files.push(...mvc(app, feat));
  else files.push(...mvvm(app, feat));
  return files;
}

module.exports = { REAL_ARCHITECTURES, architectureFiles };
