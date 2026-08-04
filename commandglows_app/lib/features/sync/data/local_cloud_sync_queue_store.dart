import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../domain/local_cloud_sync_models.dart';

abstract class LocalCloudSyncQueuePersistence {
  Future<String?> read();
  Future<void> write(String value);
  Future<void> clear();
}

class SecureLocalCloudSyncQueuePersistence
    implements LocalCloudSyncQueuePersistence {
  const SecureLocalCloudSyncQueuePersistence({
    FlutterSecureStorage storage = const FlutterSecureStorage(),
    String storageKey = _defaultStorageKey,
  }) : _storage = storage,
       _storageKey = storageKey;

  static const String _defaultStorageKey = 'local_cloud_sync_queue_v1';

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

class LocalCloudSyncQueueStore {
  LocalCloudSyncQueueStore({
    LocalCloudSyncQueuePersistence persistence =
        const SecureLocalCloudSyncQueuePersistence(),
    DateTime Function()? clock,
  }) : _persistence = persistence,
       _clock = clock ?? DateTime.now;

  final LocalCloudSyncQueuePersistence _persistence;
  final DateTime Function() _clock;
  List<LocalCloudSyncQueueEntry>? _cache;

  Future<List<LocalCloudSyncQueueEntry>> listAll() async {
    final entries = await _load();
    return List<LocalCloudSyncQueueEntry>.unmodifiable(entries);
  }

  Future<List<LocalCloudSyncQueueEntry>> listFlushReady({
    required String targetFirebaseUid,
    required String targetGlobalUserId,
  }) async {
    final now = _clock().toUtc();
    final entries = await _load();
    return entries
        .where(
          (entry) =>
              entry.targetFirebaseUid == targetFirebaseUid &&
              entry.targetGlobalUserId == targetGlobalUserId &&
              entry.isFlushReady(now),
        )
        .toList(growable: false);
  }

  Future<void> upsert(LocalCloudSyncQueueEntry entry) async {
    final entries = await _load();
    final index = entries.indexWhere(
      (row) => row.operationKey == entry.operationKey,
    );
    if (index >= 0) {
      entries[index] = entry.copyWith(updatedAtUtc: _clock().toUtc());
    } else {
      entries.add(entry);
    }
    await _persist(entries);
  }

  Future<void> removeByOperationKey(String operationKey) async {
    final entries = await _load();
    entries.removeWhere((entry) => entry.operationKey == operationKey);
    await _persist(entries);
  }

  Future<void> replaceAll(List<LocalCloudSyncQueueEntry> entries) async {
    await _persist(entries);
  }

  Future<void> purgeForAccount({
    required String firebaseUid,
    required String globalUserId,
  }) async {
    final entries = await _load();
    entries.removeWhere(
      (entry) =>
          entry.targetFirebaseUid != firebaseUid ||
          entry.targetGlobalUserId != globalUserId,
    );
    await _persist(entries);
  }

  Future<void> clear() async {
    _cache = <LocalCloudSyncQueueEntry>[];
    try {
      await _persistence.clear();
    } catch (_) {
      // Queue persistence is best-effort.
    }
  }

  Future<List<LocalCloudSyncQueueEntry>> _load() async {
    final cached = _cache;
    if (cached != null) {
      return cached;
    }
    late final String? raw;
    try {
      raw = await _persistence.read();
    } catch (_) {
      return _cache = <LocalCloudSyncQueueEntry>[];
    }
    if (raw == null || raw.trim().isEmpty) {
      return _cache = <LocalCloudSyncQueueEntry>[];
    }
    try {
      final decoded = jsonDecode(raw);
      if (decoded is! Map<String, Object?>) {
        return _cache = <LocalCloudSyncQueueEntry>[];
      }
      final rawEntries = decoded['entries'];
      if (rawEntries is! List) {
        return _cache = <LocalCloudSyncQueueEntry>[];
      }
      final entries = rawEntries
          .whereType<Map<Object?, Object?>>()
          .map(LocalCloudSyncQueueEntry.fromMap)
          .whereType<LocalCloudSyncQueueEntry>()
          .toList(growable: true);
      return _cache = entries;
    } catch (_) {
      await clear();
      return _cache = <LocalCloudSyncQueueEntry>[];
    }
  }

  Future<void> _persist(List<LocalCloudSyncQueueEntry> entries) async {
    final payload = jsonEncode({
      'version': 1,
      'savedAtUtc': _clock().toUtc().toIso8601String(),
      'entries': entries.map((entry) => entry.toMap()).toList(growable: false),
    });
    _cache = List<LocalCloudSyncQueueEntry>.from(entries);
    try {
      await _persistence.write(payload);
    } catch (_) {
      // Queue persistence is best-effort.
    }
  }
}
