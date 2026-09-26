import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// One private, versioned collection per local product domain.
class LocalJsonPersistence {
  const LocalJsonPersistence(
    this.key, {
    FlutterSecureStorage storage = const FlutterSecureStorage(),
  }) : _storage = storage;

  final String key;
  final FlutterSecureStorage _storage;

  Future<List<Map<String, dynamic>>> read() async {
    final raw = await _storage.read(key: key);
    if (raw == null) return [];
    final decoded = jsonDecode(raw) as List<dynamic>;
    return decoded
        .map((item) => Map<String, dynamic>.from(item as Map))
        .toList(growable: false);
  }

  Future<void> write(List<Map<String, Object?>> items) =>
      _storage.write(key: key, value: jsonEncode(items));
}
