'use strict';

// Field-level Dart type + JSON-codec expressions for hand-written models.
// Split from models.ts so the model/envelope bodies stay under the line cap.

const snake = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/[-\s]+/g, '_').toLowerCase();
const pascal = (s) => s.replace(/(^|[_\-\s])(\w)/g, (_m, _p, c) => c.toUpperCase());

const PRIMITIVES = new Set(['String', 'int', 'double', 'bool', 'num', 'dynamic', 'Object']);

function dartType(field) {
  const base = field.list ? `List<${field.type}>` : field.type;
  return field.optional ? `${base}?` : base;
}

// fromJson expression for a single value `expr` of the given base type.
function parseItem(base, expr) {
  if (base === 'DateTime') return `DateTime.parse(${expr} as String)`;
  if (PRIMITIVES.has(base)) return `${expr} as ${base}`;
  return `${base}.fromJson(${expr} as Map<String, dynamic>)`;
}

function fromJsonExpr(field) {
  const key = `json['${field.name}']`;
  const base = field.type;
  if (field.list) {
    const listExpr = `(${key} as List<dynamic>? ?? const <dynamic>[]).map((e) => ${parseItem(base, 'e')}).toList()`;
    return field.optional ? `${key} == null ? null : ${listExpr}` : listExpr;
  }
  if (!field.optional) return parseItem(base, key);
  if (base === 'DateTime') return `${key} == null ? null : DateTime.parse(${key} as String)`;
  if (PRIMITIVES.has(base)) return `${key} as ${base}?`;
  return `${key} == null ? null : ${base}.fromJson(${key} as Map<String, dynamic>)`;
}

function toJsonExpr(field) {
  const n = field.name;
  const q = field.optional ? '?' : '';
  const base = field.type;
  if (field.list) {
    if (base === 'DateTime') return `${n}${q}.map((e) => e.toIso8601String()).toList()`;
    if (PRIMITIVES.has(base)) return n;
    return `${n}${q}.map((e) => e.toJson()).toList()`;
  }
  if (base === 'DateTime') return `${n}${q}.toIso8601String()`;
  if (PRIMITIVES.has(base)) return n;
  return `${n}${q}.toJson()`;
}

module.exports = { snake, pascal, dartType, fromJsonExpr, toJsonExpr };
