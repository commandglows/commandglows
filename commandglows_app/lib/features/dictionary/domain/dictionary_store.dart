class DictionaryTermRecord {
  const DictionaryTermRecord({
    required this.id,
    required this.term,
    required this.replacement,
    required this.caseSensitive,
    required this.createdAt,
  });

  final String id;
  final String term;
  final String replacement;
  final bool caseSensitive;
  final DateTime createdAt;
}

abstract class DictionaryStore {
  Future<List<DictionaryTermRecord>> list();

  Future<void> insert({
    required String term,
    required String replacement,
    required bool caseSensitive,
  });

  Future<void> update({
    required String id,
    required String term,
    required String replacement,
    required bool caseSensitive,
  });

  Future<void> softDelete(String id);
}
