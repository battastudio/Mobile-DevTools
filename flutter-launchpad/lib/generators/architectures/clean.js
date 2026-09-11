'use strict';
// Clean-architecture sample feature for GENERIC mode: a working feature wired
// end-to-end (data → domain → presentation) using ChangeNotifier + ListenableBuilder.
const f = (path, content) => ({ path, content: content.replace(/\n?$/, '\n') });
const pascal = (s) => s.replace(/(^|[_-\s])(\w)/g, (_m, _p, c) => c.toUpperCase());

function clean(app, feat) {
  const F = pascal(feat);
  const base = `lib/features/${feat}`;
  return [
    f(`${base}/domain/entities/${feat}_entity.dart`, `// Domain entity — pure, no JSON/framework concerns.
class ${F}Entity {
  const ${F}Entity({required this.id, required this.title});
  final int id;
  final String title;
}`),
    f(`${base}/domain/repositories/${feat}_repository.dart`, `import 'package:${app}/core/result.dart';
import 'package:${app}/features/${feat}/domain/entities/${feat}_entity.dart';

// Repository contract — the domain depends on this abstraction, not on data.
abstract class ${F}Repository {
  Future<Result<List<${F}Entity>>> get${F}s();
}`),
    f(`${base}/domain/usecases/get_${feat}s.dart`, `import 'package:${app}/core/base/base_usecase.dart';
import 'package:${app}/core/result.dart';
import 'package:${app}/features/${feat}/domain/entities/${feat}_entity.dart';
import 'package:${app}/features/${feat}/domain/repositories/${feat}_repository.dart';

// One business action. Controller → UseCase → Repository.
class Get${F}s implements UseCase<List<${F}Entity>, NoParams> {
  const Get${F}s(this._repo);
  final ${F}Repository _repo;

  @override
  Future<Result<List<${F}Entity>>> call(NoParams params) => _repo.get${F}s();
}`),
    f(`${base}/data/models/${feat}_model.dart`, `import 'package:${app}/features/${feat}/domain/entities/${feat}_entity.dart';

// Data model — JSON in/out; extends the entity so the domain stays JSON-free.
class ${F}Model extends ${F}Entity {
  const ${F}Model({required super.id, required super.title});

  factory ${F}Model.fromJson(Map<String, dynamic> json) =>
      ${F}Model(id: json['id'] as int, title: json['title'] as String);

  Map<String, dynamic> toJson() => <String, dynamic>{'id': id, 'title': title};
}`),
    f(`${base}/data/datasources/${feat}_remote_data_source.dart`, `import 'package:dio/dio.dart';

import 'package:${app}/features/${feat}/data/models/${feat}_model.dart';

// Remote data source — the only place that talks to Dio for this feature.
class ${F}RemoteDataSource {
  const ${F}RemoteDataSource(this._dio);
  final Dio _dio;

  Future<List<${F}Model>> fetch${F}s() async {
    final Response<dynamic> res = await _dio.get<dynamic>('/${feat}s');
    return (res.data as List<dynamic>)
        .map((dynamic e) => ${F}Model.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}`),
    f(`${base}/data/repositories/${feat}_repository_impl.dart`, `import 'package:${app}/core/base/base_repository.dart';
import 'package:${app}/core/result.dart';
import 'package:${app}/features/${feat}/data/datasources/${feat}_remote_data_source.dart';
import 'package:${app}/features/${feat}/domain/entities/${feat}_entity.dart';
import 'package:${app}/features/${feat}/domain/repositories/${feat}_repository.dart';

// Repository implementation — maps data-source calls into Result<Entity> via guard().
class ${F}RepositoryImpl extends BaseRepository implements ${F}Repository {
  ${F}RepositoryImpl(this._remote);
  final ${F}RemoteDataSource _remote;

  @override
  Future<Result<List<${F}Entity>>> get${F}s() => guard(() => _remote.fetch${F}s());
}`),
    f(`${base}/presentation/controllers/${feat}_controller.dart`, `import 'package:flutter/foundation.dart';

import 'package:${app}/core/error/failure.dart';
import 'package:${app}/core/base/base_usecase.dart';
import 'package:${app}/features/${feat}/domain/entities/${feat}_entity.dart';
import 'package:${app}/features/${feat}/domain/usecases/get_${feat}s.dart';

// Presentation controller — a ChangeNotifier the view listens to.
class ${F}Controller extends ChangeNotifier {
  ${F}Controller(this._get${F}s);
  final Get${F}s _get${F}s;

  bool loading = false;
  Failure? error;
  List<${F}Entity> items = <${F}Entity>[];

  Future<void> load() async {
    loading = true;
    error = null;
    notifyListeners();
    final result = await _get${F}s(const NoParams());
    result.when(
      success: (List<${F}Entity> data) => items = data,
      failure: (Failure fail) => error = fail,
    );
    loading = false;
    notifyListeners();
  }
}`),
    f(`${base}/presentation/pages/${feat}_page.dart`, `import 'package:flutter/material.dart';

import 'package:${app}/features/${feat}/presentation/controllers/${feat}_controller.dart';

// Presentation page — binds to the controller with a built-in ListenableBuilder.
class ${F}Page extends StatefulWidget {
  const ${F}Page({super.key, required this.controller});
  final ${F}Controller controller;

  @override
  State<${F}Page> createState() => _${F}PageState();
}

class _${F}PageState extends State<${F}Page> {
  @override
  void initState() {
    super.initState();
    widget.controller.load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('${F}')),
      body: ListenableBuilder(
        listenable: widget.controller,
        builder: (BuildContext context, _) {
          final c = widget.controller;
          if (c.loading) return const Center(child: CircularProgressIndicator());
          if (c.error != null) return Center(child: Text(c.error!.message));
          return ListView(children: c.items.map((e) => ListTile(title: Text(e.title))).toList());
        },
      ),
    );
  }
}`),
  ];
}

module.exports = { clean };
