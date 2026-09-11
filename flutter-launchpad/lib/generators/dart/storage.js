'use strict';

// utils/local_storage.dart — key/value store (GetX sync vs Riverpod async).
function localStorageGetx() {
  return `import 'package:get_storage/get_storage.dart';

// Synchronous key/value store (GetStorage). Keys are ALWAYS AppKeys constants.
class LocalStorage {
  LocalStorage._();

  static final GetStorage _box = GetStorage();

  static Future<void> init() => GetStorage.init();

  static String? read(String key) => _box.read<String>(key);

  static Future<void> write(String key, String value) => _box.write(key, value);

  static Future<void> remove(String key) => _box.remove(key);
}
`;
}

function localStorageRiverpod() {
  return `import 'package:shared_preferences/shared_preferences.dart';

// Async key/value store (shared_preferences). Keys are ALWAYS AppKeys constants.
class LocalStorage {
  LocalStorage._();

  static Future<String?> read(String key) async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    return prefs.getString(key);
  }

  static Future<void> write(String key, String value) async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    await prefs.setString(key, value);
  }

  static Future<void> remove(String key) async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    await prefs.remove(key);
  }
}
`;
}

module.exports = { localStorageGetx, localStorageRiverpod };
