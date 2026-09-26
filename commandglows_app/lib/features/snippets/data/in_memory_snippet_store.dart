import '../../../core/storage/local_json_persistence.dart';
import '../domain/snippet_store.dart';

class InMemorySnippetStore implements SnippetStore {
  InMemorySnippetStore({
    DateTime Function()? clock,
    LocalJsonPersistence? persistence,
  }) : _clock = clock ?? DateTime.now,
       _persistence = persistence;

  final DateTime Function() _clock;
  final LocalJsonPersistence? _persistence;
  final List<SnippetRecord> _items = <SnippetRecord>[];
  var _nextId = 1;
  Future<void>? _loading;

  Future<void> _load() => _loading ??= _hydrate();

  Future<void> _hydrate() async {
    final rows = await _persistence?.read() ?? [];
    for (final row in rows) {
      _items.add(
        SnippetRecord(
          id: row['id'] as String,
          trigger: row['trigger'] as String,
          content: row['content'] as String,
          label: row['label'] as String?,
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
          'trigger': item.trigger,
          'content': item.content,
          'label': item.label,
          'createdAt': item.createdAt.toIso8601String(),
        },
    ]);
  }

  @override
  Future<List<SnippetRecord>> list() async {
    await _load();
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
    await _load();
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
    await _save();
  }

  @override
  Future<void> update({
    required String id,
    required String trigger,
    required String content,
    String? label,
  }) async {
    await _load();
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
      throw StateError('Snippet not found.');
    }
    return index;
  }
}
