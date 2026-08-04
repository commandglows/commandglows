import '../../../core/sync/sync_status.dart';
import '../application/transcription_store.dart';
import '../domain/transcription_draft.dart';

class InMemoryTranscriptionStore implements TranscriptionStore {
  InMemoryTranscriptionStore({DateTime Function()? clock})
    : _clock = clock ?? DateTime.now;

  final DateTime Function() _clock;
  final List<TranscriptionRecord> _items = <TranscriptionRecord>[];
  var _nextId = 1;

  @override
  Future<List<TranscriptionRecord>> list() async {
    final visible = _items
        .where((item) => item.deletedAt == null)
        .toList(growable: false);
    visible.sort((a, b) => b.createdAt.compareTo(a.createdAt));
    return visible;
  }

  @override
  Future<TranscriptionRecord> insert(TranscriptionDraft draft) async {
    if (!draft.isValid) {
      throw const FormatException('Invalid transcription payload.');
    }
    final now = _clock().toUtc();
    final item = TranscriptionRecord(
      id: 'local-${_nextId++}',
      rawText: draft.rawText.trim(),
      cleanedText: draft.cleanedText.trim(),
      language: draft.language.trim().isEmpty
          ? 'unknown'
          : draft.language.trim(),
      source: draft.source,
      durationMs: draft.durationMs,
      createdAt: now,
      updatedAt: now,
      syncStatus: const SyncStatus.localOnly(),
    );
    _items.add(item);
    return item;
  }

  @override
  Future<void> updateCleanedText({
    required String id,
    required String cleanedText,
  }) async {
    final value = cleanedText.trim();
    if (value.isEmpty) {
      throw const FormatException('cleaned_text cannot be empty.');
    }
    final index = _activeIndexById(id);
    final existing = _items[index];
    _items[index] = TranscriptionRecord(
      id: existing.id,
      rawText: existing.rawText,
      cleanedText: value,
      language: existing.language,
      source: existing.source,
      durationMs: existing.durationMs,
      createdAt: existing.createdAt,
      updatedAt: _clock().toUtc(),
      syncStatus: const SyncStatus.localOnly(),
      deletedAt: existing.deletedAt,
    );
  }

  @override
  Future<void> softDelete(String id) async {
    final index = _activeIndexById(id);
    final existing = _items[index];
    _items[index] = TranscriptionRecord(
      id: existing.id,
      rawText: existing.rawText,
      cleanedText: existing.cleanedText,
      language: existing.language,
      source: existing.source,
      durationMs: existing.durationMs,
      createdAt: existing.createdAt,
      updatedAt: _clock().toUtc(),
      syncStatus: const SyncStatus.localOnly(),
      deletedAt: _clock().toUtc(),
    );
  }

  int _activeIndexById(String id) {
    final index = _items.indexWhere(
      (item) => item.id == id && item.deletedAt == null,
    );
    if (index < 0) {
      throw StateError('Transcription not found.');
    }
    return index;
  }
}
