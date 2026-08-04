import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../domain/clipboard_capture_event.dart';
import '../domain/clipboard_store.dart';
import 'in_memory_clipboard_history_store.dart';

abstract class ClipboardHistoryPersistence {
  Future<String?> read();
  Future<void> write(String value);
  Future<void> clear();
}

class SecureClipboardHistoryPersistence implements ClipboardHistoryPersistence {
  const SecureClipboardHistoryPersistence({
    FlutterSecureStorage storage = const FlutterSecureStorage(),
    String storageKey = _defaultStorageKey,
  }) : _storage = storage,
       _storageKey = storageKey;

  static const _defaultStorageKey = 'clipboard_history_v1';

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

class PersistentClipboardHistoryStore implements ClipboardHistoryStore {
  PersistentClipboardHistoryStore({
    ClipboardHistoryPersistence persistence =
        const SecureClipboardHistoryPersistence(),
    DateTime Function()? clock,
    int maxPersistedItems = 200,
  }) : _persistence = persistence,
       _clock = clock ?? DateTime.now,
       _maxPersistedItems = maxPersistedItems;

  final ClipboardHistoryPersistence _persistence;
  final DateTime Function() _clock;
  final int _maxPersistedItems;

  InMemoryClipboardHistoryStore? _delegate;

  @override
  Future<List<ClipboardItemRecord>> list() async {
    final delegate = await _load();
    return delegate.list();
  }

  Future<List<ClipboardItemRecord>> snapshot({
    bool includeDeleted = false,
  }) async {
    final delegate = await _load();
    return delegate.snapshot(includeDeleted: includeDeleted);
  }

  @override
  Future<void> insert({
    required String content,
    required ClipboardCanonicalSource source,
    String? originDeviceId,
    ClipboardSyncState syncState = ClipboardSyncState.local,
    DateTime? capturedAtUtc,
    Map<String, Object?> sourceMetadata = const <String, Object?>{},
    bool sensitiveConfirmed = false,
  }) async {
    final delegate = await _load();
    await delegate.insert(
      content: content,
      source: source,
      originDeviceId: originDeviceId,
      syncState: syncState,
      capturedAtUtc: capturedAtUtc,
      sourceMetadata: sourceMetadata,
      sensitiveConfirmed: sensitiveConfirmed,
    );
    await _save(delegate);
  }

  @override
  Future<ClipboardItemRecord> upsertAutomaticWithinWindow(
    ClipboardAutomaticUpsertDraft draft,
  ) async {
    final delegate = await _load();
    final item = await delegate.upsertAutomaticWithinWindow(
      ClipboardAutomaticUpsertDraft(
        content: draft.content,
        source: draft.source,
        deviceId: draft.deviceId,
        capturedAtUtc: draft.capturedAtUtc,
        syncState: ClipboardSyncState.local,
        sourceMetadata: draft.sourceMetadata,
        sensitiveConfirmed: draft.sensitiveConfirmed,
      ),
    );
    await _save(delegate);
    return item;
  }

  @override
  Future<ClipboardItemRecord?> getById(String id) async {
    final delegate = await _load();
    return delegate.getById(id);
  }

  @override
  Future<void> updateContent({
    required String id,
    required String content,
    bool sensitiveConfirmed = false,
  }) async {
    final delegate = await _load();
    await delegate.updateContent(
      id: id,
      content: content,
      sensitiveConfirmed: sensitiveConfirmed,
    );
    await delegate.markSyncState(id: id, state: ClipboardSyncState.local);
    await _save(delegate);
  }

  @override
  Future<void> markSyncState({
    required String id,
    required ClipboardSyncState state,
    String? syncError,
  }) async {
    final delegate = await _load();
    await delegate.markSyncState(id: id, state: state, syncError: syncError);
    await _save(delegate);
  }

  @override
  Future<void> togglePin({required String id, required bool pinned}) async {
    final delegate = await _load();
    await delegate.togglePin(id: id, pinned: pinned);
    await _save(delegate);
  }

  @override
  Future<void> softDelete(String id) async {
    final delegate = await _load();
    await delegate.softDelete(id);
    await _save(delegate);
  }

  Future<InMemoryClipboardHistoryStore> _load() async {
    final current = _delegate;
    if (current != null) {
      return current;
    }
    late final String? raw;
    try {
      raw = await _persistence.read();
    } catch (_) {
      return _delegate = InMemoryClipboardHistoryStore(clock: _clock);
    }
    if (raw == null || raw.trim().isEmpty) {
      return _delegate = InMemoryClipboardHistoryStore(clock: _clock);
    }
    try {
      final decoded = jsonDecode(raw);
      if (decoded is! Map<String, Object?>) {
        throw const FormatException('Clipboard history payload is invalid.');
      }
      final items = _itemsFromJson(decoded['items']);
      final nextId = decoded['nextId'];
      return _delegate = InMemoryClipboardHistoryStore(
        clock: _clock,
        initialItems: items,
        initialNextId: nextId is num ? nextId.toInt() : null,
      );
    } catch (_) {
      try {
        await _persistence.clear();
      } catch (_) {
        // Keep the current in-memory session usable when local persistence fails.
      }
      return _delegate = InMemoryClipboardHistoryStore(clock: _clock);
    }
  }

  Future<void> _save(InMemoryClipboardHistoryStore delegate) async {
    final items = await delegate.list();
    final persistedItems = items.take(_maxPersistedItems).toList();
    final payload = jsonEncode({
      'version': 1,
      'savedAtUtc': _clock().toUtc().toIso8601String(),
      'nextId': _nextIdFromItems(persistedItems),
      'items': persistedItems.map(_itemToJson).toList(growable: false),
    });
    try {
      await _persistence.write(payload);
    } catch (_) {
      // Saving should not block clipboard use inside the active app session.
    }
  }

  static Map<String, Object?> _itemToJson(ClipboardItemRecord item) {
    return {
      'id': item.id,
      'content': item.content,
      'source': item.source,
      'pinned': item.pinned,
      'createdAt': _dateToJson(item.createdAt),
      'capturedAt': _dateToJson(item.capturedAt),
      'lastSeenAt': _dateToJson(item.lastSeenAt),
      'modifiedAt': _dateToJson(item.modifiedAt),
      'updatedAt': _dateToJson(item.updatedAt),
      'contentHash': item.contentHash,
      'normalizedHash': item.normalizedHash,
      'originSurface': item.originSurface,
      'originDeviceId': item.originDeviceId,
      'captureMethod': item.captureMethod,
      'syncState': item.syncState.databaseValue,
      'captureCount': item.captureCount,
      'sourceMetadata': _jsonSafeValue(item.sourceMetadata),
      'syncError': item.syncError,
      'deletedAt': item.deletedAt == null ? null : _dateToJson(item.deletedAt!),
    };
  }

  static List<ClipboardItemRecord> _itemsFromJson(Object? raw) {
    if (raw is! List<Object?>) {
      return const <ClipboardItemRecord>[];
    }
    return raw
        .whereType<Map<Object?, Object?>>()
        .map(_itemFromJson)
        .whereType<ClipboardItemRecord>()
        .toList(growable: false);
  }

  static ClipboardItemRecord? _itemFromJson(Map<Object?, Object?> row) {
    final id = row['id'];
    final content = row['content'];
    if (id is! String || content is! String || id.trim().isEmpty) {
      return null;
    }
    return ClipboardItemRecord(
      id: id,
      content: content,
      source: (row['source'] as String?) ?? 'manual',
      pinned: row['pinned'] as bool? ?? false,
      createdAt: _dateFromJson(row['createdAt']),
      capturedAt: _dateFromJson(row['capturedAt']),
      lastSeenAt: _dateFromJson(row['lastSeenAt']),
      modifiedAt: _dateFromJson(row['modifiedAt']),
      updatedAt: _dateFromJson(row['updatedAt']),
      contentHash: row['contentHash'] as String?,
      normalizedHash: row['normalizedHash'] as String?,
      originSurface: (row['originSurface'] as String?) ?? 'app',
      originDeviceId: row['originDeviceId'] as String?,
      captureMethod: (row['captureMethod'] as String?) ?? 'manual',
      syncState: ClipboardSyncState.fromDatabase(row['syncState'] as String?),
      captureCount: _positiveInt(row['captureCount']),
      sourceMetadata: _metadataFromJson(row['sourceMetadata']),
      syncError: row['syncError'] as String?,
      deletedAt: _dateFromJsonOrNull(row['deletedAt']),
    );
  }

  static String _dateToJson(DateTime value) {
    return value.toUtc().toIso8601String();
  }

  static DateTime _dateFromJson(Object? raw) {
    return _dateFromJsonOrNull(raw) ?? DateTime.fromMillisecondsSinceEpoch(0);
  }

  static DateTime? _dateFromJsonOrNull(Object? raw) {
    if (raw is! String) {
      return null;
    }
    return DateTime.tryParse(raw)?.toUtc();
  }

  static int _positiveInt(Object? raw) {
    if (raw is num && raw >= 1) {
      return raw.toInt();
    }
    return 1;
  }

  static Map<String, Object?> _metadataFromJson(Object? raw) {
    if (raw is! Map<Object?, Object?>) {
      return const <String, Object?>{};
    }
    return raw.map(
      (key, value) => MapEntry(key.toString(), _jsonSafeValue(value)),
    );
  }

  static Object? _jsonSafeValue(Object? value) {
    if (value == null || value is String || value is num || value is bool) {
      return value;
    }
    if (value is DateTime) {
      return value.toUtc().toIso8601String();
    }
    if (value is Iterable) {
      return value.map(_jsonSafeValue).toList(growable: false);
    }
    if (value is Map) {
      return value.map(
        (key, entryValue) =>
            MapEntry(key.toString(), _jsonSafeValue(entryValue)),
      );
    }
    return value.toString();
  }

  static int _nextIdFromItems(List<ClipboardItemRecord> items) {
    var highest = 0;
    for (final item in items) {
      if (!item.id.startsWith('local-')) {
        continue;
      }
      final parsed = int.tryParse(item.id.substring('local-'.length));
      if (parsed != null && parsed > highest) {
        highest = parsed;
      }
    }
    return highest + 1;
  }
}
