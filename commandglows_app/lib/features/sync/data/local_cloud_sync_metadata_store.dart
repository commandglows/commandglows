import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../domain/local_cloud_sync_models.dart';

abstract class LocalCloudSyncMetadataPersistence {
  Future<String?> read();
  Future<void> write(String value);
  Future<void> clear();
}

class SecureLocalCloudSyncMetadataPersistence
    implements LocalCloudSyncMetadataPersistence {
  const SecureLocalCloudSyncMetadataPersistence({
    FlutterSecureStorage storage = const FlutterSecureStorage(),
    String storageKey = _defaultStorageKey,
  }) : _storage = storage,
       _storageKey = storageKey;

  static const String _defaultStorageKey = 'local_cloud_sync_metadata_v1';

  final FlutterSecureStorage _storage;
  final String _storageKey;

  @override
  Future<String?> read() => _storage.read(key: _storageKey);

  @override
  Future<void> write(String value) =>
      _storage.write(key: _storageKey, value: value);

  @override
  Future<void> clear() => _storage.delete(key: _storageKey);
}

class LocalCloudSyncMetadataStore {
  LocalCloudSyncMetadataStore({
    LocalCloudSyncMetadataPersistence persistence =
        const SecureLocalCloudSyncMetadataPersistence(),
    DateTime Function()? clock,
  }) : _persistence = persistence,
       _clock = clock ?? DateTime.now;

  final LocalCloudSyncMetadataPersistence _persistence;
  final DateTime Function() _clock;
  LocalCloudSyncMetadata? _cache;

  Future<LocalCloudSyncMetadata> read() async {
    final cached = _cache;
    if (cached != null) {
      return cached;
    }
    late final String? raw;
    try {
      raw = await _persistence.read();
    } catch (_) {
      return _cache = const LocalCloudSyncMetadata();
    }
    if (raw == null || raw.trim().isEmpty) {
      return _cache = const LocalCloudSyncMetadata();
    }
    try {
      final decoded = jsonDecode(raw);
      if (decoded is! Map<Object?, Object?>) {
        return _cache = const LocalCloudSyncMetadata();
      }
      final metadata = decoded['metadata'];
      if (metadata is Map<Object?, Object?>) {
        return _cache = LocalCloudSyncMetadata.fromMap(metadata);
      }
      return _cache = LocalCloudSyncMetadata.fromMap(decoded);
    } catch (_) {
      return _cache = const LocalCloudSyncMetadata();
    }
  }

  Future<void> write(LocalCloudSyncMetadata metadata) async {
    _cache = metadata;
    final payload = jsonEncode({
      'version': 1,
      'savedAtUtc': _clock().toUtc().toIso8601String(),
      'metadata': metadata.toMap(),
    });
    try {
      await _persistence.write(payload);
    } catch (_) {
      // Metadata persistence is best-effort.
    }
  }

  Future<void> clear() async {
    _cache = const LocalCloudSyncMetadata();
    try {
      await _persistence.clear();
    } catch (_) {
      // Metadata persistence is best-effort.
    }
  }
}
