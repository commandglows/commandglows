import '../../../core/storage/local_json_persistence.dart';
import '../domain/dictionary_store.dart';

class InMemoryDictionaryStore implements DictionaryStore {
  InMemoryDictionaryStore({
    DateTime Function()? clock,
    LocalJsonPersistence? persistence,
  }) : _clock = clock ?? DateTime.now,
       _persistence = persistence;

  final DateTime Function() _clock;
  final LocalJsonPersistence? _persistence;
  final List<DictionaryTermRecord> _items = <DictionaryTermRecord>[];
  var _nextId = 1;
  Future<void>? _loading;

  Future<void> _load() => _loading ??= _hydrate();

  Future<void> _hydrate() async {
    final rows = await _persistence?.read() ?? [];
    for (final row in rows) {
      _items.add(
        DictionaryTermRecord(
          id: row['id'] as String,
          term: row['term'] as String,
          replacement: row['replacement'] as String,
          caseSensitive: row['caseSensitive'] as bool,
          createdAt: DateTime.parse(row['createdAt'] as String),
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
          'term': item.term,
          'replacement': item.replacement,
          'caseSensitive': item.caseSensitive,
          'createdAt': item.createdAt.toIso8601String(),
        },
    ]);
  }

  @override
  Future<List<DictionaryTermRecord>> list() async {
    await _load();
    final items = List<DictionaryTermRecord>.from(_items);
    items.sort((a, b) => b.createdAt.compareTo(a.createdAt));
    return items;
  }

  @override
  Future<void> insert({
    required String term,
    required String replacement,
    required bool caseSensitive,
  }) async {
    await _load();
    final normalizedTerm = term.trim();
    final normalizedReplacement = replacement.trim();
    if (normalizedTerm.isEmpty || normalizedReplacement.isEmpty) {
      throw const FormatException(
        'Dictionary term/replacement cannot be empty.',
      );
    }

    _items.add(
      DictionaryTermRecord(
        id: 'local-${_nextId++}',
        term: normalizedTerm,
        replacement: normalizedReplacement,
        caseSensitive: caseSensitive,
        createdAt: _clock().toUtc(),
      ),
    );
    await _save();
  }

  @override
  Future<void> update({
    required String id,
    required String term,
    required String replacement,
    required bool caseSensitive,
  }) async {
    await _load();
    final index = _indexOf(id);
    final existing = _items[index];
    final normalizedTerm = term.trim();
    final normalizedReplacement = replacement.trim();
    if (normalizedTerm.isEmpty || normalizedReplacement.isEmpty) {
      throw const FormatException(
        'Dictionary term/replacement cannot be empty.',
      );
    }

    _items[index] = DictionaryTermRecord(
      id: existing.id,
      term: normalizedTerm,
      replacement: normalizedReplacement,
      caseSensitive: caseSensitive,
      createdAt: existing.createdAt,
    );
    await _save();
  }

  @override
  Future<void> softDelete(String id) async {
    await _load();
    final index = _indexOf(id);
    _items.removeAt(index);
    await _save();
  }

  int _indexOf(String id) {
    final index = _items.indexWhere((item) => item.id == id);
    if (index < 0) {
      throw StateError('Dictionary term not found.');
    }
    return index;
  }
}
