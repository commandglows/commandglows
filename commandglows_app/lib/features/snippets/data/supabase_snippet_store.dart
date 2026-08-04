import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../data/supabase/snippet_repository.dart' as supabase;
import '../domain/snippet_store.dart';

class SupabaseSnippetStore implements SnippetStore {
  const SupabaseSnippetStore(this._client);

  final SupabaseClient _client;

  @override
  Future<List<SnippetRecord>> list() async {
    final rows = await supabase.SnippetRepository(_client).list();
    return rows
        .map(
          (row) => SnippetRecord(
            id: row.id,
            trigger: row.trigger,
            content: row.content,
            label: row.label,
            createdAt: row.createdAt,
          ),
        )
        .toList(growable: false);
  }

  @override
  Future<void> insert({
    required String trigger,
    required String content,
    String? label,
  }) {
    return supabase.SnippetRepository(
      _client,
    ).insert(trigger: trigger, content: content, label: label);
  }

  @override
  Future<void> update({
    required String id,
    required String trigger,
    required String content,
    String? label,
  }) {
    return supabase.SnippetRepository(
      _client,
    ).update(id: id, trigger: trigger, content: content, label: label);
  }

  @override
  Future<void> softDelete(String id) {
    return supabase.SnippetRepository(_client).softDelete(id);
  }
}
