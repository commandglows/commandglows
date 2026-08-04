import 'clipboard_capture_event.dart';

class ClipboardItemRecord {
  const ClipboardItemRecord({
    required this.id,
    required this.content,
    required this.source,
    required this.pinned,
    required this.createdAt,
    required this.capturedAt,
    required this.lastSeenAt,
    required this.modifiedAt,
    required this.updatedAt,
    required this.contentHash,
    required this.normalizedHash,
    required this.originSurface,
    required this.originDeviceId,
    required this.captureMethod,
    required this.syncState,
    required this.captureCount,
    required this.sourceMetadata,
    this.syncError,
    this.deletedAt,
  });

  final String id;
  final String content;
  final String source;
  final bool pinned;
  final DateTime createdAt;
  final DateTime capturedAt;
  final DateTime lastSeenAt;
  final DateTime modifiedAt;
  final DateTime updatedAt;
  final String? contentHash;
  final String? normalizedHash;
  final String originSurface;
  final String? originDeviceId;
  final String captureMethod;
  final ClipboardSyncState syncState;
  final int captureCount;
  final Map<String, Object?> sourceMetadata;
  final String? syncError;
  final DateTime? deletedAt;

  String get sourceLabel => ClipboardCanonicalSource.fromDatabase(source).label;
}

class ClipboardAutomaticUpsertDraft {
  const ClipboardAutomaticUpsertDraft({
    required this.content,
    required this.source,
    required this.deviceId,
    required this.capturedAtUtc,
    this.syncState = ClipboardSyncState.pending,
    this.sourceMetadata = const <String, Object?>{},
    this.sensitiveConfirmed = false,
  });

  final String content;
  final ClipboardCanonicalSource source;
  final String deviceId;
  final DateTime capturedAtUtc;
  final ClipboardSyncState syncState;
  final Map<String, Object?> sourceMetadata;
  final bool sensitiveConfirmed;
}

abstract class ClipboardHistoryStore {
  Future<List<ClipboardItemRecord>> list();

  Future<void> insert({
    required String content,
    required ClipboardCanonicalSource source,
    String? originDeviceId,
    ClipboardSyncState syncState = ClipboardSyncState.synced,
    DateTime? capturedAtUtc,
    Map<String, Object?> sourceMetadata = const <String, Object?>{},
    bool sensitiveConfirmed = false,
  });

  Future<ClipboardItemRecord> upsertAutomaticWithinWindow(
    ClipboardAutomaticUpsertDraft draft,
  );

  Future<ClipboardItemRecord?> getById(String id);

  Future<void> updateContent({
    required String id,
    required String content,
    bool sensitiveConfirmed = false,
  });

  Future<void> markSyncState({
    required String id,
    required ClipboardSyncState state,
    String? syncError,
  });

  Future<void> togglePin({required String id, required bool pinned});

  Future<void> softDelete(String id);
}
