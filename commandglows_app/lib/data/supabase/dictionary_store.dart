import 'dictionary_repository.dart' as supabase;
import '../../features/dictionary/domain/dictionary_store.dart';

class SupabaseDictionaryStore implements DictionaryStore {
  const SupabaseDictionaryStore(this._repository);

  final supabase.DictionaryRepository _repository;

  @override
  Future<List<DictionaryTermRecord>> list() async {
    final rows = await _repository.list();
    return rows
        .map(
          (row) => DictionaryTermRecord(
            id: row.id,
            term: row.term,
            replacement: row.replacement,
            caseSensitive: row.caseSensitive,
            createdAt: row.createdAt,
          ),
        )
        .toList(growable: false);
  }

  @override
  Future<void> insert({
    required String term,
    required String replacement,
    required bool caseSensitive,
  }) {
    return _repository.insert(
      term: term,
      replacement: replacement,
      caseSensitive: caseSensitive,
    );
  }

  @override
  Future<void> update({
    required String id,
    required String term,
    required String replacement,
    required bool caseSensitive,
  }) {
    return _repository.update(
      id: id,
      term: term,
      replacement: replacement,
      caseSensitive: caseSensitive,
    );
  }

  @override
  Future<void> softDelete(String id) => _repository.softDelete(id);
}
