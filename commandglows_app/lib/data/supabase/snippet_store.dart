import 'snippet_repository.dart' as supabase;
import '../../features/snippets/domain/snippet_store.dart';

class SupabaseSnippetStore implements SnippetStore {
  const SupabaseSnippetStore(this._repository);

  final supabase.SnippetRepository _repository;

  @override
  Future<List<SnippetRecord>> list() async {
    final rows = await _repository.list();
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
    return _repository.insert(trigger: trigger, content: content, label: label);
  }

  @override
  Future<void> update({
    required String id,
    required String trigger,
    required String content,
    String? label,
  }) {
    return _repository.update(
      id: id,
      trigger: trigger,
      content: content,
      label: label,
    );
  }

  @override
  Future<void> softDelete(String id) => _repository.softDelete(id);
}
