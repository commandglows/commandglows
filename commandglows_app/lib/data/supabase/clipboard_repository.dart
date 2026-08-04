import 'package:supabase_flutter/supabase_flutter.dart';

import '../../features/clipboard/domain/clipboard_capture_event.dart';
import '../../features/clipboard/domain/clipboard_normalizer.dart';
import '../../features/clipboard/domain/clipboard_store.dart';

class SupabaseClipboardStore implements ClipboardHistoryStore {
  const SupabaseClipboardStore(this._client);

  final SupabaseClient _client;

  @override
  Future<List<ClipboardItemRecord>> list() async {
    final rows = await _client
        .from('clipboard_items')
        .select()
        .isFilter('deleted_at', null)
        .order('pinned', ascending: false)
        .order('last_seen_at', ascending: false)
        .order('captured_at', ascending: false)
        .order('created_at', ascending: false)
        .limit(200);

    return rows
        .map<ClipboardItemRecord>(
          (row) => _recordFromMap(Map<String, dynamic>.from(row)),
        )
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
    await _client.from('clipboard_items').insert(payload);
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
        'origin_device_id is required for automatic capture.',
      );
    }

    final normalized = _validatedContent(
      content: draft.content,
      sensitiveConfirmed: draft.sensitiveConfirmed,
    );
    final source = draft.source;
    final normalizedContent = normalizeClipboardText(normalized);
    final normalizedHash = sha256Hex(normalizedContent);
    final capturedAtUtc = draft.capturedAtUtc.toUtc();
    final capturedAtIso = capturedAtUtc.toIso8601String();
    final notBeforeIso = capturedAtUtc
        .subtract(kClipboardAutomaticDedupeWindow)
        .toIso8601String();

    final existingRows = await _client
        .from('clipboard_items')
        .select()
        .eq('source', source.databaseValue)
        .eq('origin_device_id', draft.deviceId.trim())
        .eq('normalized_hash', normalizedHash)
        .isFilter('deleted_at', null)
        .gte('captured_at', notBeforeIso)
        .lte('captured_at', capturedAtIso)
        .order('captured_at', ascending: false)
        .limit(1);

    if (existingRows.isNotEmpty) {
      final existing = _recordFromMap(
        Map<String, dynamic>.from(existingRows.first),
      );
      final nextCaptureCount = existing.captureCount + 1;
      final mergedMetadata = <String, Object?>{
        ...existing.sourceMetadata,
        ...draft.sourceMetadata,
        'capture_count': nextCaptureCount,
      };
      await _client
          .from('clipboard_items')
          .update({
            'last_seen_at': capturedAtIso,
            'sync_state': draft.syncState.databaseValue,
            'sync_error': null,
            'capture_count': nextCaptureCount,
            'source_metadata': mergedMetadata,
          })
          .eq('id', existing.id)
          .isFilter('deleted_at', null);

      return await getById(existing.id) ?? existing;
    }

    final inserted = await _client
        .from('clipboard_items')
        .insert(
          buildInsertPayload(
            content: normalized,
            source: source,
            originDeviceId: draft.deviceId,
            syncState: draft.syncState,
            capturedAtUtc: capturedAtUtc,
            sourceMetadata: draft.sourceMetadata,
            sensitiveConfirmed: true,
          ),
        )
        .select()
        .single();

    return _recordFromMap(Map<String, dynamic>.from(inserted));
  }

  @override
  Future<ClipboardItemRecord?> getById(String id) async {
    final rows = await _client
        .from('clipboard_items')
        .select()
        .eq('id', id)
        .limit(1);
    if (rows.isEmpty) {
      return null;
    }
    return _recordFromMap(Map<String, dynamic>.from(rows.first));
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
    final nowIso = DateTime.now().toUtc().toIso8601String();
    final normalizedText = normalizeClipboardText(normalized);
    await _client
        .from('clipboard_items')
        .update({
          'content': normalized,
          'modified_at': nowIso,
          'content_hash': sha256Hex(normalized),
          'normalized_hash': sha256Hex(normalizedText),
          'sync_state': ClipboardSyncState.pending.databaseValue,
          'sync_error': null,
        })
        .eq('id', id)
        .isFilter('deleted_at', null);
  }

  @override
  Future<void> markSyncState({
    required String id,
    required ClipboardSyncState state,
    String? syncError,
  }) async {
    await _client
        .from('clipboard_items')
        .update({
          'sync_state': state.databaseValue,
          'sync_error': _sanitizeSyncError(syncError),
        })
        .eq('id', id)
        .isFilter('deleted_at', null);
  }

  @override
  Future<void> togglePin({required String id, required bool pinned}) async {
    await _client
        .from('clipboard_items')
        .update({'pinned': pinned})
        .eq('id', id)
        .isFilter('deleted_at', null);
  }

  @override
  Future<void> softDelete(String id) async {
    await _client
        .from('clipboard_items')
        .update({'deleted_at': DateTime.now().toUtc().toIso8601String()})
        .eq('id', id)
        .isFilter('deleted_at', null);
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
    final normalizedContent = normalizeClipboardText(normalized);
    final capturedAtIso = (capturedAtUtc ?? DateTime.now())
        .toUtc()
        .toIso8601String();
    final captureCount = _captureCountFromMetadata(sourceMetadata);
    return {
      'content': normalized,
      'source': source.databaseValue,
      'content_hash': sha256Hex(normalized),
      'normalized_hash': sha256Hex(normalizedContent),
      'origin_surface': source.originSurface,
      'capture_method': source.captureMethod,
      if (originDeviceId != null && originDeviceId.trim().isNotEmpty)
        'origin_device_id': originDeviceId.trim(),
      'captured_at': capturedAtIso,
      'last_seen_at': capturedAtIso,
      'modified_at': capturedAtIso,
      'sync_state': syncState.databaseValue,
      'capture_count': captureCount,
      'source_metadata': {...sourceMetadata, 'capture_count': captureCount},
    };
  }

  static String normalizedClipboardHash(String content) {
    return sha256Hex(normalizeClipboardText(content));
  }

  static ClipboardItemRecord _recordFromMap(Map<String, dynamic> row) {
    DateTime parseUtc(String key) {
      final raw = row[key] as String?;
      if (raw == null) {
        return DateTime.fromMillisecondsSinceEpoch(0).toLocal();
      }
      return DateTime.tryParse(raw)?.toLocal() ??
          DateTime.fromMillisecondsSinceEpoch(0).toLocal();
    }

    DateTime? parseNullableUtc(String key) {
      final raw = row[key] as String?;
      if (raw == null) {
        return null;
      }
      return DateTime.tryParse(raw)?.toLocal();
    }

    final metadata = _sourceMetadataFromRow(row['source_metadata']);
    final captureCountRaw = row['capture_count'];
    final metadataCaptureCount = metadata['capture_count'];
    final captureCount = captureCountRaw is num
        ? captureCountRaw.toInt()
        : metadataCaptureCount is num
        ? metadataCaptureCount.toInt()
        : 1;

    return ClipboardItemRecord(
      id: row['id'] as String,
      content: (row['content'] as String?) ?? '',
      source: (row['source'] as String?) ?? 'manual',
      pinned: (row['pinned'] as bool?) ?? false,
      createdAt: parseUtc('created_at'),
      capturedAt: parseUtc('captured_at'),
      lastSeenAt: parseUtc('last_seen_at'),
      modifiedAt: parseUtc('modified_at'),
      updatedAt: parseUtc('updated_at'),
      contentHash: row['content_hash'] as String?,
      normalizedHash: row['normalized_hash'] as String?,
      originSurface: (row['origin_surface'] as String?) ?? 'app',
      originDeviceId: row['origin_device_id'] as String?,
      captureMethod: (row['capture_method'] as String?) ?? 'manual',
      syncState: ClipboardSyncState.fromDatabase(row['sync_state'] as String?),
      captureCount: captureCount < 1 ? 1 : captureCount,
      sourceMetadata: metadata,
      syncError: row['sync_error'] as String?,
      deletedAt: parseNullableUtc('deleted_at'),
    );
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
}
