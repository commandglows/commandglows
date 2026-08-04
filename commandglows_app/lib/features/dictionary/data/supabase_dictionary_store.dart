import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../data/supabase/dictionary_repository.dart' as supabase;
import '../domain/dictionary_store.dart';

class SupabaseDictionaryStore implements DictionaryStore {
  const SupabaseDictionaryStore(this._client);

  final SupabaseClient _client;

  @override
  Future<List<DictionaryTermRecord>> list() async {
    final rows = await supabase.DictionaryRepository(_client).list();
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
    return supabase.DictionaryRepository(_client).insert(
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
    return supabase.DictionaryRepository(_client).update(
      id: id,
      term: term,
      replacement: replacement,
      caseSensitive: caseSensitive,
    );
  }

  @override
  Future<void> softDelete(String id) {
    return supabase.DictionaryRepository(_client).softDelete(id);
  }
}
