import '../domain/dictionary_store.dart';

class InMemoryDictionaryStore implements DictionaryStore {
  InMemoryDictionaryStore({DateTime Function()? clock})
    : _clock = clock ?? DateTime.now;

  final DateTime Function() _clock;
  final List<DictionaryTermRecord> _items = <DictionaryTermRecord>[];
  var _nextId = 1;

  @override
  Future<List<DictionaryTermRecord>> list() async {
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
  }

  @override
  Future<void> update({
    required String id,
    required String term,
    required String replacement,
    required bool caseSensitive,
  }) async {
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
  }

  @override
  Future<void> softDelete(String id) async {
    final index = _indexOf(id);
    _items.removeAt(index);
  }

  int _indexOf(String id) {
    final index = _items.indexWhere((item) => item.id == id);
    if (index < 0) {
      throw StateError('Dictionary term not found.');
    }
    return index;
  }
}
