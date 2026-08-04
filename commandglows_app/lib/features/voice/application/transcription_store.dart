import '../../../core/sync/sync_status.dart';
import '../domain/transcription_draft.dart';

class TranscriptionRecord {
  const TranscriptionRecord({
    required this.id,
    required this.rawText,
    required this.cleanedText,
    required this.language,
    required this.source,
    required this.durationMs,
    required this.createdAt,
    required this.updatedAt,
    required this.syncStatus,
    this.deletedAt,
  });

  final String id;
  final String rawText;
  final String cleanedText;
  final String language;
  final String source;
  final int durationMs;
  final DateTime createdAt;
  final DateTime updatedAt;
  final SyncStatus syncStatus;
  final DateTime? deletedAt;
}

abstract class TranscriptionStore {
  Future<List<TranscriptionRecord>> list();

  Future<TranscriptionRecord> insert(TranscriptionDraft draft);

  Future<void> updateCleanedText({
    required String id,
    required String cleanedText,
  });

  Future<void> softDelete(String id);
}
