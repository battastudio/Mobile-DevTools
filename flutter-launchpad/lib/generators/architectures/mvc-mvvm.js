'use strict';
// MVC + MVVM sample features (+ the shared main.dart) for GENERIC mode. Both use
// ChangeNotifier + ListenableBuilder (Flutter built-in) — no extra state package.
const f = (path, content) => ({ path, content: content.replace(/\n?$/, '\n') });
const pascal = (s) => s.replace(/(^|[_-\s])(\w)/g, (_m, _p, c) => c.toUpperCase());

function mainDart(app) {
  return `import 'package:flutter/material.dart';

import 'app.dart';

void main() {
  runApp(const ${pascal(app)}App());
}`;
}

function mvc(app, feat) {
  const F = pascal(feat);
  return [
    f(`lib/models/${feat}.dart`, `// Model — the data for the ${feat} screen.
class ${F} {
  const ${F}({required this.title});
  final String title;
}`),
    f(`lib/controllers/${feat}_controller.dart`, `import 'package:flutter/foundation.dart';

import 'package:${app}/models/${feat}.dart';

// Controller — holds state + logic; the View listens to it.
class ${F}Controller extends ChangeNotifier {
  ${F} model = const ${F}(title: '${F}');
  bool loading = false;

  Future<void> refresh() async {
    loading = true;
    notifyListeners();
    await Future<void>.delayed(const Duration(milliseconds: 300));
    model = const ${F}(title: '${F} loaded');
    loading = false;
    notifyListeners();
  }
}`),
    f(`lib/views/${feat}_view.dart`, `import 'package:flutter/material.dart';

import 'package:${app}/controllers/${feat}_controller.dart';

// View — renders the controller's model; no business logic here.
class ${F}View extends StatelessWidget {
  const ${F}View({super.key, required this.controller});
  final ${F}Controller controller;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('${F}')),
      body: ListenableBuilder(
        listenable: controller,
        builder: (BuildContext context, _) => Center(
          child: controller.loading ? const CircularProgressIndicator() : Text(controller.model.title),
        ),
      ),
      floatingActionButton: FloatingActionButton(onPressed: controller.refresh, child: const Icon(Icons.refresh)),
    );
  }
}`),
  ];
}

function mvvm(app, feat) {
  const F = pascal(feat);
  return [
    f(`lib/models/${feat}.dart`, `// Model — plain data.
class ${F} {
  const ${F}({required this.title});
  final String title;
}`),
    f(`lib/viewmodels/${feat}_viewmodel.dart`, `import 'package:flutter/foundation.dart';

import 'package:${app}/models/${feat}.dart';

// ViewModel — exposes view-ready state + commands; the View binds to it.
class ${F}ViewModel extends ChangeNotifier {
  ${F} _model = const ${F}(title: '${F}');
  bool _busy = false;

  String get title => _model.title;
  bool get busy => _busy;

  Future<void> load() async {
    _busy = true;
    notifyListeners();
    await Future<void>.delayed(const Duration(milliseconds: 300));
    _model = const ${F}(title: '${F} ready');
    _busy = false;
    notifyListeners();
  }
}`),
    f(`lib/views/${feat}_view.dart`, `import 'package:flutter/material.dart';

import 'package:${app}/viewmodels/${feat}_viewmodel.dart';

// View — binds to the ViewModel, renders its state.
class ${F}View extends StatefulWidget {
  const ${F}View({super.key, required this.viewModel});
  final ${F}ViewModel viewModel;

  @override
  State<${F}View> createState() => _${F}ViewState();
}

class _${F}ViewState extends State<${F}View> {
  @override
  void initState() {
    super.initState();
    widget.viewModel.load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('${F}')),
      body: ListenableBuilder(
        listenable: widget.viewModel,
        builder: (BuildContext context, _) => Center(
          child: widget.viewModel.busy ? const CircularProgressIndicator() : Text(widget.viewModel.title),
        ),
      ),
    );
  }
}`),
  ];
}

module.exports = { mvc, mvvm, mainDart };
