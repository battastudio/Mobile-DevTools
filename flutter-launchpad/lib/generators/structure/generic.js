'use strict';
// Generic layer-folder tree. clean / mvc / mvvm emit a real, wired sample feature
// (not empty dirs); the plain layer-folder default emits .gitkeep placeholders.
const { PascalCase } = require('./helpers');
const { architectureFiles, REAL_ARCHITECTURES } = require('../architectures');

function genericStructure(config) {
  if (REAL_ARCHITECTURES.has(config.architecture)) return architectureFiles(config);

  const app = config.appName;
  const keep = '// .gitkeep — folder placeholder (FL-2 fills the layer).\n';
  const dirs = ['core', 'data', 'domain', 'presentation', 'presentation/pages', 'presentation/widgets'];
  const files = dirs.map((d) => ({ path: `lib/${d}/.gitkeep`, content: keep }));
  files.push({
    path: 'lib/main.dart',
    content: ["import 'package:flutter/material.dart';", '', `void main() => runApp(const ${PascalCase(app)}App());`, '', `class ${PascalCase(app)}App extends StatelessWidget {`, `  const ${PascalCase(app)}App({super.key});`, '', '  @override', '  Widget build(BuildContext context) => const MaterialApp(home: SizedBox.shrink());', '}', ''].join('\n'),
  });
  return files;
}

module.exports = { genericStructure };
