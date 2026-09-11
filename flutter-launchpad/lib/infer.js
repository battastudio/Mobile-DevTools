'use strict';
// inferModels — turn a pasted API JSON response into typed ModelSpec[] the models
// editor / Dart generator can consume. Best-effort: nested objects become their own
// models, arrays become List<T>, scalars are typed by value. Field names keep the
// original JSON key so fromJson mapping stays correct.
// ponytail: snake_case keys are kept verbatim as Dart field names — upgrade to
// camelCase + an explicit json-key later if the generator grows a key mapping.

const pascal = (s) => {
  const p = s.replace(/(^|[_\-\s])(\w)/g, (_m, _sep, c) => c.toUpperCase()).replace(/[^A-Za-z0-9]/g, '');
  return p ? p[0].toUpperCase() + p.slice(1) : 'Model';
};

const isIsoDate = (s) => /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2})/.test(s);

const scalarType = (v) => {
  if (typeof v === 'number') return Number.isInteger(v) ? 'int' : 'double';
  if (typeof v === 'boolean') return 'bool';
  if (typeof v === 'string') return isIsoDate(v) ? 'DateTime' : 'String';
  return 'dynamic';
};

const isObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);

function inferModels(json, rootName = 'Data') {
  const models = new Map();

  // Type of a single (non-list) value, registering a nested model when it's an object.
  const typeOf = (key, value) => {
    if (isObject(value)) {
      const name = pascal(key);
      register(name, value);
      return name;
    }
    return scalarType(value);
  };

  const fieldFor = (key, value) => {
    if (value === null || value === undefined) {
      return { name: key, type: 'String', optional: true, list: false };
    }
    if (Array.isArray(value)) {
      const first = value.find((v) => v !== null && v !== undefined);
      const type = first === undefined ? 'dynamic' : typeOf(key, first);
      return { name: key, type, optional: false, list: true };
    }
    return { name: key, type: typeOf(key, value), optional: false, list: false };
  };

  function register(name, obj) {
    const existing = models.get(name);
    if (existing) {
      // Merge: add fields seen in this occurrence that weren't seen before.
      const seen = new Set(existing.fields.map((f) => f.name));
      for (const [k, v] of Object.entries(obj)) {
        if (!seen.has(k)) existing.fields.push(fieldFor(k, v));
      }
      return;
    }
    // Reserve insertion order (root/parent before children), then fill fields.
    const spec = { name, fields: [] };
    models.set(name, spec);
    spec.fields = Object.entries(obj).map(([k, v]) => fieldFor(k, v));
  }

  // Unwrap a common envelope: { data: <the thing we care about> }.
  let root = json;
  if (isObject(root) && 'data' in root) root = root.data;

  if (Array.isArray(root)) {
    const first = root.find((v) => isObject(v));
    if (isObject(first)) register(pascal(rootName), first);
  } else if (isObject(root)) {
    register(pascal(rootName), root);
  }

  return [...models.values()];
}

module.exports = { inferModels };
