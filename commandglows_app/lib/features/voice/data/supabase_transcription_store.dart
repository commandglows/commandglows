import '../../../data/supabase/transcription_repository.dart';
import '../../../core/sync/sync_status.dart';
import '../application/transcription_store.dart';
import '../domain/transcription_draft.dart';

class SupabaseTranscriptionStore implements TranscriptionStore {
  const SupabaseTranscriptionStore(this._repository);

  final TranscriptionRepository _repository;

  @override
  Future<List<TranscriptionRecord>> list() async {
    final rows = await _repository.list();
    return rows
        .map(
          (row) => TranscriptionRecord(
            id: row.id,
            rawText: row.rawText,
            cleanedText: row.cleanedText,
            language: row.language,
            source: row.source,
            durationMs: row.durationMs,
            createdAt: row.createdAt,
            updatedAt: row.createdAt,
            syncStatus: const SyncStatus(health: SyncHealth.synced),
          ),
        )
        .toList(growable: false);
  }

  @override
  Future<TranscriptionRecord> insert(TranscriptionDraft draft) async {
    await _repository.insert(draft);
    final rows = await list();
    return rows.first;
  }

  @override
  Future<void> updateCleanedText({
    required String id,
    required String cleanedText,
  }) {
    return _repository.updateCleanedText(id: id, cleanedText: cleanedText);
  }

  @override
  Future<void> softDelete(String id) => _repository.delete(id);
}
