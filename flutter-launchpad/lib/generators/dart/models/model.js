'use strict';

// Per-model Dart class bodies: hand-written JSON codec, or a freezed declaration.

const { snake, pascal, dartType, fromJsonExpr, toJsonExpr } = require('./field');

function manualModel(m) {
  const cls = pascal(m.name);
  const ctorArgs = m.fields.map((fl) => `${fl.optional ? '' : 'required '}this.${fl.name}`).join(', ');
  const decls = m.fields.map((fl) => `  final ${dartType(fl)} ${fl.name};`).join('\n');
  const from = m.fields.map((fl) => `      ${fl.name}: ${fromJsonExpr(fl)},`).join('\n');
  const to = m.fields.map((fl) => `        '${fl.name}': ${toJsonExpr(fl)},`).join('\n');
  const copyArgs = m.fields.map((fl) => `${dartType(fl).replace(/\?$/, '')}? ${fl.name}`).join(', ');
  const copyBody = m.fields.map((fl) => `      ${fl.name}: ${fl.name} ?? this.${fl.name},`).join('\n');
  return `// ${cls} — typed model with hand-written JSON (no codegen).
class ${cls} {
  const ${cls}(${ctorArgs ? `{${ctorArgs}}` : ''});

${decls}

  factory ${cls}.fromJson(Map<String, dynamic> json) {
    return ${cls}(
${from}
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
${to}
    };
  }

  ${cls} copyWith(${copyArgs ? `{${copyArgs}}` : ''}) {
    return ${cls}(
${copyBody}
    );
  }
}`;
}

function freezedModel(m) {
  const cls = pascal(m.name);
  const file = snake(m.name);
  const args = m.fields.map((fl) => `    ${fl.optional ? '' : 'required '}${dartType(fl)} ${fl.name},`).join('\n');
  return `import 'package:freezed_annotation/freezed_annotation.dart';

part '${file}.freezed.dart';
part '${file}.g.dart';

// ${cls} — immutable freezed model. Run: dart run build_runner build --delete-conflicting-outputs
@freezed
class ${cls} with _\$${cls} {
  const factory ${cls}({
${args}
  }) = _${cls};

  factory ${cls}.fromJson(Map<String, dynamic> json) => _\$${cls}FromJson(json);
}`;
}

module.exports = { manualModel, freezedModel };
