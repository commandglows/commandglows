import '../domain/clipboard_capture_event.dart';
import '../domain/clipboard_normalizer.dart';
import '../domain/clipboard_store.dart';

class InMemoryClipboardHistoryStore implements ClipboardHistoryStore {
  InMemoryClipboardHistoryStore({
    DateTime Function()? clock,
    Iterable<ClipboardItemRecord> initialItems = const <ClipboardItemRecord>[],
    int? initialNextId,
  }) : _clock = clock ?? DateTime.now,
       _items = initialItems.toList(growable: true),
       _nextId = initialNextId ?? _nextIdFromItems(initialItems);

  final DateTime Function() _clock;
  final List<ClipboardItemRecord> _items;
  int _nextId;

  @override
  Future<List<ClipboardItemRecord>> list() async {
    final visible = _items
        .where((item) => item.deletedAt == null)
        .toList(growable: false);
    visible.sort((a, b) {
      final pinnedCompare = b.pinned.toString().compareTo(a.pinned.toString());
      if (pinnedCompare != 0) {
        return pinnedCompare;
      }
      return b.lastSeenAt.compareTo(a.lastSeenAt);
    });
    return visible;
  }

  List<ClipboardItemRecord> snapshot({bool includeDeleted = false}) {
    return _items
        .where((item) => includeDeleted || item.deletedAt == null)
        .toList(growable: false);
  }

  @override
  Future<void> insert({
    required String content,
    required ClipboardCanonicalSource source,
    String? originDeviceId,
    ClipboardSyncState syncState = ClipboardSyncState.synced,
    DateTime? capturedAtUtc,
    Map<String, Object?> sourceMetadata = const <String, Object?>{},
    bool sensitiveConfirmed = false,
  }) async {
    final item = _newItem(
      content: content,
      source: source,
      originDeviceId: originDeviceId,
      syncState: syncState,
      capturedAtUtc: capturedAtUtc ?? _clock().toUtc(),
      sourceMetadata: sourceMetadata,
      sensitiveConfirmed: sensitiveConfirmed,
    );
    _items.add(item);
  }

  @override
  Future<ClipboardItemRecord> upsertAutomaticWithinWindow(
    ClipboardAutomaticUpsertDraft draft,
  ) async {
    if (!draft.source.automatic) {
      throw const FormatException(
        'Automatic clipboard upsert requires an automatic source.',
      );
    }
    if (draft.deviceId.trim().isEmpty) {
      throw const FormatException(
        'originDeviceId is required for automatic capture.',
      );
    }
    final content = _validatedContent(
      content: draft.content,
      sensitiveConfirmed: draft.sensitiveConfirmed,
    );
    final capturedAtUtc = draft.capturedAtUtc.toUtc();
    final normalizedHash = sha256Hex(normalizeClipboardText(content));
    final existingIndex = _items.indexWhere((item) {
      if (item.deletedAt != null) {
        return false;
      }
      if (item.originDeviceId != draft.deviceId.trim()) {
        return false;
      }
      if (item.source != draft.source.databaseValue) {
        return false;
      }
      if (item.normalizedHash != normalizedHash) {
        return false;
      }
      return isWithinAutomaticDedupeWindow(
        existingCapturedAtUtc: item.capturedAt,
        incomingCapturedAtUtc: capturedAtUtc,
      );
    });

    if (existingIndex >= 0) {
      final existing = _items[existingIndex];
      final captureCount = existing.captureCount + 1;
      final updated = _copy(
        existing,
        lastSeenAt: capturedAtUtc.isAfter(existing.lastSeenAt)
            ? capturedAtUtc
            : existing.lastSeenAt,
        updatedAt: _clock().toUtc(),
        syncState: draft.syncState,
        captureCount: captureCount,
        sourceMetadata: <String, Object?>{
          ...existing.sourceMetadata,
          ...draft.sourceMetadata,
          'capture_count': captureCount,
        },
        clearSyncError: true,
      );
      _items[existingIndex] = updated;
      return updated;
    }

    final item = _newItem(
      content: content,
      source: draft.source,
      originDeviceId: draft.deviceId,
      syncState: draft.syncState,
      capturedAtUtc: capturedAtUtc,
      sourceMetadata: draft.sourceMetadata,
      sensitiveConfirmed: true,
    );
    _items.add(item);
    return item;
  }

  @override
  Future<ClipboardItemRecord?> getById(String id) async {
    return _items.cast<ClipboardItemRecord?>().firstWhere(
      (item) => item?.id == id,
      orElse: () => null,
    );
  }

  @override
  Future<void> updateContent({
    required String id,
    required String content,
    bool sensitiveConfirmed = false,
  }) async {
    final index = _activeIndexById(id);
    final existing = _items[index];
    final normalized = _validatedContent(
      content: content,
      sensitiveConfirmed: sensitiveConfirmed,
    );
    _items[index] = _copy(
      existing,
      content: normalized,
      modifiedAt: _clock().toUtc(),
      updatedAt: _clock().toUtc(),
      contentHash: sha256Hex(normalized),
      normalizedHash: sha256Hex(normalizeClipboardText(normalized)),
      syncState: ClipboardSyncState.pending,
      clearSyncError: true,
    );
  }

  @override
  Future<void> markSyncState({
    required String id,
    required ClipboardSyncState state,
    String? syncError,
  }) async {
    final index = _activeIndexById(id);
    _items[index] = _copy(
      _items[index],
      syncState: state,
      syncError: _sanitizeSyncError(syncError),
      updatedAt: _clock().toUtc(),
    );
  }

  @override
  Future<void> togglePin({required String id, required bool pinned}) async {
    final index = _activeIndexById(id);
    _items[index] = _copy(
      _items[index],
      pinned: pinned,
      updatedAt: _clock().toUtc(),
    );
  }

  @override
  Future<void> softDelete(String id) async {
    final index = _activeIndexById(id);
    final now = _clock().toUtc();
    _items[index] = _copy(
      _items[index],
      deletedAt: now,
      syncState: ClipboardSyncState.deleted,
      updatedAt: now,
    );
  }

  ClipboardItemRecord _newItem({
    required String content,
    required ClipboardCanonicalSource source,
    required ClipboardSyncState syncState,
    required DateTime capturedAtUtc,
    required bool sensitiveConfirmed,
    String? originDeviceId,
    Map<String, Object?> sourceMetadata = const <String, Object?>{},
  }) {
    final normalized = _validatedContent(
      content: content,
      sensitiveConfirmed: sensitiveConfirmed,
    );
    final capturedAt = capturedAtUtc.toUtc();
    final captureCount = _captureCountFromMetadata(sourceMetadata);
    return ClipboardItemRecord(
      id: 'local-${_nextId++}',
      content: normalized,
      source: source.databaseValue,
      pinned: false,
      createdAt: _clock().toUtc(),
      capturedAt: capturedAt,
      lastSeenAt: capturedAt,
      modifiedAt: capturedAt,
      updatedAt: _clock().toUtc(),
      contentHash: sha256Hex(normalized),
      normalizedHash: sha256Hex(normalizeClipboardText(normalized)),
      originSurface: source.originSurface,
      originDeviceId: originDeviceId?.trim().isEmpty == false
          ? originDeviceId!.trim()
          : null,
      captureMethod: source.captureMethod,
      syncState: syncState,
      captureCount: captureCount,
      sourceMetadata: <String, Object?>{
        ...sourceMetadata,
        'capture_count': captureCount,
      },
    );
  }

  int _activeIndexById(String id) {
    final index = _items.indexWhere(
      (item) => item.id == id && item.deletedAt == null,
    );
    if (index < 0) {
      throw StateError('Clipboard item not found.');
    }
    return index;
  }

  static ClipboardItemRecord _copy(
    ClipboardItemRecord item, {
    String? content,
    bool? pinned,
    DateTime? lastSeenAt,
    DateTime? modifiedAt,
    DateTime? updatedAt,
    String? contentHash,
    String? normalizedHash,
    ClipboardSyncState? syncState,
    int? captureCount,
    Map<String, Object?>? sourceMetadata,
    String? syncError,
    bool clearSyncError = false,
    DateTime? deletedAt,
  }) {
    return ClipboardItemRecord(
      id: item.id,
      content: content ?? item.content,
      source: item.source,
      pinned: pinned ?? item.pinned,
      createdAt: item.createdAt,
      capturedAt: item.capturedAt,
      lastSeenAt: lastSeenAt ?? item.lastSeenAt,
      modifiedAt: modifiedAt ?? item.modifiedAt,
      updatedAt: updatedAt ?? item.updatedAt,
      contentHash: contentHash ?? item.contentHash,
      normalizedHash: normalizedHash ?? item.normalizedHash,
      originSurface: item.originSurface,
      originDeviceId: item.originDeviceId,
      captureMethod: item.captureMethod,
      syncState: syncState ?? item.syncState,
      captureCount: captureCount ?? item.captureCount,
      sourceMetadata: sourceMetadata ?? item.sourceMetadata,
      syncError: clearSyncError ? null : (syncError ?? item.syncError),
      deletedAt: deletedAt ?? item.deletedAt,
    );
  }

  static String _validatedContent({
    required String content,
    required bool sensitiveConfirmed,
  }) {
    final normalized = content.trim();
    if (normalized.isEmpty) {
      throw const FormatException('Clipboard content cannot be empty.');
    }
    if (normalized.length > kClipboardMaxContentLength) {
      throw const FormatException(
        'Clipboard content exceeds 50000 characters.',
      );
    }
    requireSensitiveClipboardConfirmation(
      content: normalized,
      confirmed: sensitiveConfirmed,
    );
    return normalized;
  }

  static int _captureCountFromMetadata(Map<String, Object?> metadata) {
    final raw = metadata['capture_count'];
    if (raw is num && raw >= 1) {
      return raw.toInt();
    }
    return 1;
  }

  static String? _sanitizeSyncError(String? raw) {
    if (raw == null) {
      return null;
    }
    final value = raw.replaceAll(RegExp(r'\s+'), ' ').trim();
    if (value.isEmpty) {
      return null;
    }
    if (value.length <= 180) {
      return value;
    }
    return value.substring(0, 180);
  }

  static int _nextIdFromItems(Iterable<ClipboardItemRecord> items) {
    var highest = 0;
    for (final item in items) {
      final id = item.id;
      if (!id.startsWith('local-')) {
        continue;
      }
      final parsed = int.tryParse(id.substring('local-'.length));
      if (parsed != null && parsed > highest) {
        highest = parsed;
      }
    }
    return highest + 1;
  }
}
