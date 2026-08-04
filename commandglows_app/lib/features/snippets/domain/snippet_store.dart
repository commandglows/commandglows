class SnippetRecord {
  const SnippetRecord({
    required this.id,
    required this.trigger,
    required this.content,
    required this.label,
    required this.createdAt,
  });

  final String id;
  final String trigger;
  final String content;
  final String? label;
  final DateTime createdAt;
}

abstract class SnippetStore {
  Future<List<SnippetRecord>> list();

  Future<void> insert({
    required String trigger,
    required String content,
    String? label,
  });

  Future<void> update({
    required String id,
    required String trigger,
    required String content,
    String? label,
  });

  Future<void> softDelete(String id);
}
