import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart' as firebase_auth;

import '../domain/clipboard_capture_event.dart';
import '../domain/clipboard_normalizer.dart';
import '../domain/clipboard_store.dart';

class FirebaseClipboardHistoryStore implements ClipboardHistoryStore {
  FirebaseClipboardHistoryStore({
    FirebaseFirestore? firestore,
    firebase_auth.FirebaseAuth? auth,
  }) : _firestore = firestore ?? FirebaseFirestore.instance,
       _auth = auth ?? firebase_auth.FirebaseAuth.instance;

  final FirebaseFirestore _firestore;
  final firebase_auth.FirebaseAuth _auth;

  @override
  Future<List<ClipboardItemRecord>> list() async {
    final snapshot = await _collection
        .where('deletedAt', isNull: true)
        .orderBy('pinned', descending: true)
        .orderBy('lastSeenAt', descending: true)
        .orderBy('capturedAt', descending: true)
        .orderBy('createdAt', descending: true)
        .limit(200)
        .get();

    return snapshot.docs
        .map((doc) => _recordFromMap(doc.id, doc.data()))
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
    final payload = buildInsertPayload(
      content: content,
      source: source,
      originDeviceId: originDeviceId,
      syncState: syncState,
      capturedAtUtc: capturedAtUtc,
      sourceMetadata: sourceMetadata,
      sensitiveConfirmed: sensitiveConfirmed,
    );
    await _collection.add(payload);
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

    final normalized = _validatedContent(
      content: draft.content,
      sensitiveConfirmed: draft.sensitiveConfirmed,
    );
    final normalizedHash = sha256Hex(normalizeClipboardText(normalized));
    final source = draft.source;
    final capturedAtUtc = draft.capturedAtUtc.toUtc();
    final capturedAtDateTime = capturedAtUtc.toIso8601String();
    final notBeforeDateTime = capturedAtUtc
        .subtract(kClipboardAutomaticDedupeWindow)
        .toIso8601String();

    final existingRows = await _collection
        .where('source', isEqualTo: source.databaseValue)
        .where('originDeviceId', isEqualTo: draft.deviceId.trim())
        .where('normalizedHash', isEqualTo: normalizedHash)
        .where('deletedAt', isNull: true)
        .where(
          'capturedAt',
          isGreaterThanOrEqualTo: Timestamp.fromDate(
            DateTime.parse(notBeforeDateTime),
          ),
        )
        .where(
          'capturedAt',
          isLessThanOrEqualTo: Timestamp.fromDate(
            DateTime.parse(capturedAtDateTime),
          ),
        )
        .orderBy('capturedAt', descending: true)
        .limit(1)
        .get();

    if (existingRows.docs.isNotEmpty) {
      final existing = _recordFromMap(
        existingRows.docs.first.id,
        existingRows.docs.first.data(),
      );
      final captureCount = existing.captureCount + 1;
      final mergedMetadata = <String, Object?>{
        ...existing.sourceMetadata,
        ...draft.sourceMetadata,
        'captureCount': captureCount,
      };

      await _collection.doc(existing.id).update({
        'lastSeenAt': Timestamp.fromDate(capturedAtUtc),
        'syncState': draft.syncState.databaseValue,
        'syncError': null,
        'captureCount': captureCount,
        'sourceMetadata': mergedMetadata,
        'updatedAt': Timestamp.fromDate(DateTime.now().toUtc()),
      });

      return await getById(existing.id) ?? existing;
    }

    final inserted = await _collection.add(
      buildInsertPayload(
        content: normalized,
        source: source,
        originDeviceId: draft.deviceId,
        syncState: draft.syncState,
        capturedAtUtc: capturedAtUtc,
        sourceMetadata: draft.sourceMetadata,
        sensitiveConfirmed: true,
      ),
    );

    final insertedRow = await inserted.get();
    final payload = insertedRow.data();
    if (payload == null) {
      throw StateError('Clipboard item creation did not return a document.');
    }
    return _recordFromMap(inserted.id, payload);
  }

  @override
  Future<ClipboardItemRecord?> getById(String id) async {
    final snapshot = await _collection.doc(id).get();
    if (!snapshot.exists || snapshot.data() == null) {
      return null;
    }
    return _recordFromMap(snapshot.id, snapshot.data()!);
  }

  @override
  Future<void> updateContent({
    required String id,
    required String content,
    bool sensitiveConfirmed = false,
  }) async {
    final normalized = _validatedContent(
      content: content,
      sensitiveConfirmed: sensitiveConfirmed,
    );
    final now = DateTime.now().toUtc();
    await _collection.doc(id).update({
      'content': normalized,
      'modifiedAt': Timestamp.fromDate(now),
      'updatedAt': Timestamp.fromDate(now),
      'contentHash': sha256Hex(normalized),
      'normalizedHash': sha256Hex(normalizeClipboardText(normalized)),
      'syncState': ClipboardSyncState.pending.databaseValue,
      'syncError': null,
    });
  }

  @override
  Future<void> markSyncState({
    required String id,
    required ClipboardSyncState state,
    String? syncError,
  }) async {
    await _collection.doc(id).update({
      'syncState': state.databaseValue,
      'syncError': _sanitizeSyncError(syncError),
      'updatedAt': Timestamp.fromDate(DateTime.now().toUtc()),
    });
  }

  @override
  Future<void> togglePin({required String id, required bool pinned}) async {
    await _collection.doc(id).update({
      'pinned': pinned,
      'updatedAt': Timestamp.fromDate(DateTime.now().toUtc()),
    });
  }

  @override
  Future<void> softDelete(String id) async {
    await _collection.doc(id).update({
      'deletedAt': Timestamp.fromDate(DateTime.now().toUtc()),
      'syncState': ClipboardSyncState.deleted.databaseValue,
      'updatedAt': Timestamp.fromDate(DateTime.now().toUtc()),
    });
  }

  CollectionReference<Map<String, dynamic>> get _collection {
    final uid = _requireAuthenticatedUserId();
    return _firestore.collection('users').doc(uid).collection('clipboardItems');
  }

  String _requireAuthenticatedUserId() {
    final uid = _auth.currentUser?.uid;
    if (uid == null || uid.trim().isEmpty) {
      throw StateError(
        'Firebase user id is unavailable; sign in to Firebase before using remote sync.',
      );
    }
    return uid;
  }

  static Map<String, Object?> buildInsertPayload({
    required String content,
    required ClipboardCanonicalSource source,
    String? originDeviceId,
    ClipboardSyncState syncState = ClipboardSyncState.synced,
    DateTime? capturedAtUtc,
    Map<String, Object?> sourceMetadata = const <String, Object?>{},
    bool sensitiveConfirmed = false,
  }) {
    final normalized = _validatedContent(
      content: content,
      sensitiveConfirmed: sensitiveConfirmed,
    );
    final normalizedText = normalizeClipboardText(normalized);
    final capturedAt = (capturedAtUtc ?? DateTime.now()).toUtc();
    final captureCount = _captureCountFromMetadata(sourceMetadata);
    return {
      'content': normalized,
      'source': source.databaseValue,
      'contentHash': sha256Hex(normalized),
      'normalizedHash': sha256Hex(normalizedText),
      'originSurface': source.originSurface,
      'captureMethod': source.captureMethod,
      'pinned': false,
      if (originDeviceId != null && originDeviceId.trim().isNotEmpty)
        'originDeviceId': originDeviceId.trim(),
      'capturedAt': Timestamp.fromDate(capturedAt),
      'lastSeenAt': Timestamp.fromDate(capturedAt),
      'modifiedAt': Timestamp.fromDate(capturedAt),
      'updatedAt': Timestamp.fromDate(capturedAt),
      'createdAt': Timestamp.fromDate(capturedAt),
      'syncState': syncState.databaseValue,
      'captureCount': captureCount,
      'sourceMetadata': {
        ...sourceMetadata,
        'captureCount': captureCount,
        'capture_count': captureCount,
      },
      'syncError': null,
      'deletedAt': null,
    };
  }

  static ClipboardItemRecord _recordFromMap(
    String id,
    Map<String, dynamic> row,
  ) {
    final metadata = _sourceMetadataFromRow(row['sourceMetadata']);
    final captureCountRaw = row['captureCount'];
    final metadataCaptureCount =
        metadata['captureCount'] ?? metadata['capture_count'];
    final captureCount = captureCountRaw is num
        ? captureCountRaw.toInt()
        : metadataCaptureCount is num
        ? metadataCaptureCount.toInt()
        : 1;

    return ClipboardItemRecord(
      id: id,
      content: (row['content'] as String?) ?? '',
      source: (row['source'] as String?) ?? 'manual',
      pinned: (row['pinned'] as bool?) ?? false,
      createdAt: _parseDateTime(row['createdAt']),
      capturedAt: _parseDateTime(row['capturedAt']),
      lastSeenAt: _parseDateTime(row['lastSeenAt']),
      modifiedAt: _parseDateTime(row['modifiedAt']),
      updatedAt: _parseDateTime(row['updatedAt']),
      contentHash: row['contentHash'] as String?,
      normalizedHash: row['normalizedHash'] as String?,
      originSurface: (row['originSurface'] as String?) ?? 'app',
      originDeviceId: row['originDeviceId'] as String?,
      captureMethod: (row['captureMethod'] as String?) ?? 'manual',
      syncState: ClipboardSyncState.fromDatabase(row['syncState'] as String?),
      captureCount: captureCount < 1 ? 1 : captureCount,
      sourceMetadata: metadata,
      syncError: row['syncError'] as String?,
      deletedAt: _parseDateTimeOrNull(row['deletedAt']),
    );
  }

  static DateTime _parseDateTime(Object? raw) {
    final parsed = _parseDateTimeOrNull(raw);
    return parsed ?? DateTime.fromMillisecondsSinceEpoch(0);
  }

  static DateTime? _parseDateTimeOrNull(Object? raw) {
    if (raw == null) {
      return null;
    }
    if (raw is Timestamp) {
      return raw.toDate().toLocal();
    }
    if (raw is String) {
      return DateTime.tryParse(raw)?.toLocal();
    }
    if (raw is int) {
      return DateTime.fromMillisecondsSinceEpoch(raw).toLocal();
    }
    if (raw is num) {
      return DateTime.fromMillisecondsSinceEpoch(raw.toInt()).toLocal();
    }
    return null;
  }

  static Map<String, Object?> _sourceMetadataFromRow(Object? raw) {
    if (raw is Map<String, dynamic>) {
      return Map<String, Object?>.from(raw);
    }
    if (raw is Map) {
      return raw.map((key, value) => MapEntry(key.toString(), value));
    }
    return const <String, Object?>{};
  }

  static int _captureCountFromMetadata(Map<String, Object?> metadata) {
    final raw = metadata['captureCount'] ?? metadata['capture_count'];
    if (raw is num && raw >= 1) {
      return raw.toInt();
    }
    return 1;
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
}
