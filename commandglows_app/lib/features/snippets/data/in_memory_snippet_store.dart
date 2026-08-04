import '../domain/snippet_store.dart';

class InMemorySnippetStore implements SnippetStore {
  InMemorySnippetStore({DateTime Function()? clock})
    : _clock = clock ?? DateTime.now;

  final DateTime Function() _clock;
  final List<SnippetRecord> _items = <SnippetRecord>[];
  var _nextId = 1;

  @override
  Future<List<SnippetRecord>> list() async {
    final items = List<SnippetRecord>.from(_items);
    items.sort((a, b) => b.createdAt.compareTo(a.createdAt));
    return items;
  }

  @override
  Future<void> insert({
    required String trigger,
    required String content,
    String? label,
  }) async {
    final normalizedTrigger = trigger.trim();
    final normalizedContent = content.trim();
    final normalizedLabel = label?.trim();
    if (normalizedTrigger.isEmpty || normalizedContent.isEmpty) {
      throw const FormatException('Snippet trigger/content cannot be empty.');
    }

    _items.add(
      SnippetRecord(
        id: 'local-${_nextId++}',
        trigger: normalizedTrigger,
        content: normalizedContent,
        label: normalizedLabel == null || normalizedLabel.isEmpty
            ? null
            : normalizedLabel,
        createdAt: _clock().toUtc(),
      ),
    );
  }

  @override
  Future<void> update({
    required String id,
    required String trigger,
    required String content,
    String? label,
  }) async {
    final index = _indexOf(id);
    final existing = _items[index];
    final normalizedTrigger = trigger.trim();
    final normalizedContent = content.trim();
    final normalizedLabel = label?.trim();
    if (normalizedTrigger.isEmpty || normalizedContent.isEmpty) {
      throw const FormatException('Snippet trigger/content cannot be empty.');
    }

    _items[index] = SnippetRecord(
      id: existing.id,
      trigger: normalizedTrigger,
      content: normalizedContent,
      label: normalizedLabel == null || normalizedLabel.isEmpty
          ? null
          : normalizedLabel,
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
      throw StateError('Snippet not found.');
    }
    return index;
  }
}
