import '../../../core/sync/sync_status.dart';
import '../../../core/storage/local_json_persistence.dart';
import '../application/transcription_store.dart';
import '../domain/transcription_draft.dart';

class InMemoryTranscriptionStore implements TranscriptionStore {
  InMemoryTranscriptionStore({
    DateTime Function()? clock,
    LocalJsonPersistence? persistence,
  }) : _clock = clock ?? DateTime.now,
       _persistence = persistence;

  final DateTime Function() _clock;
  final LocalJsonPersistence? _persistence;
  final List<TranscriptionRecord> _items = <TranscriptionRecord>[];
  var _nextId = 1;
  Future<void>? _loading;

  Future<void> _load() => _loading ??= _hydrate();

  Future<void> _hydrate() async {
    final rows = await _persistence?.read() ?? [];
    for (final row in rows) {
      _items.add(
        TranscriptionRecord(
          id: row['id'] as String,
          rawText: row['rawText'] as String,
          cleanedText: row['cleanedText'] as String,
          language: row['language'] as String,
          source: row['source'] as String,
          durationMs: row['durationMs'] as int,
          createdAt: DateTime.parse(row['createdAt'] as String),
          updatedAt: DateTime.parse(row['updatedAt'] as String),
          deletedAt: row['deletedAt'] == null
              ? null
              : DateTime.parse(row['deletedAt'] as String),
          syncStatus: const SyncStatus.localOnly(),
        ),
      );
    }
    _nextId = _items.length + 1;
    while (_items.any((item) => item.id == 'local-$_nextId')) {
      _nextId++;
    }
  }

  Future<void> _save() async {
    await _persistence?.write([
      for (final item in _items)
        {
          'id': item.id,
          'rawText': item.rawText,
          'cleanedText': item.cleanedText,
          'language': item.language,
          'source': item.source,
          'durationMs': item.durationMs,
          'createdAt': item.createdAt.toIso8601String(),
          'updatedAt': item.updatedAt.toIso8601String(),
          'deletedAt': item.deletedAt?.toIso8601String(),
        },
    ]);
  }

  @override
  Future<List<TranscriptionRecord>> list() async {
    await _load();
    final visible = _items
        .where((item) => item.deletedAt == null)
        .toList(growable: false);
    visible.sort((a, b) => b.createdAt.compareTo(a.createdAt));
    return visible;
  }

  @override
  Future<TranscriptionRecord> insert(TranscriptionDraft draft) async {
    await _load();
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
    await _save();
    return item;
  }

  @override
  Future<void> updateCleanedText({
    required String id,
    required String cleanedText,
  }) async {
    await _load();
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
    await _save();
  }

  @override
  Future<void> softDelete(String id) async {
    await _load();
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
    await _save();
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
