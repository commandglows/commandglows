import '../../../core/storage/local_json_persistence.dart';
import '../domain/custom_action_button_store.dart';
import '../domain/custom_action_buttons.dart';

class InMemoryCustomActionButtonStore implements CustomActionButtonStore {
  InMemoryCustomActionButtonStore({
    DateTime Function()? clock,
    LocalJsonPersistence? persistence,
  }) : _clock = clock ?? DateTime.now,
       _persistence = persistence;

  final DateTime Function() _clock;
  final LocalJsonPersistence? _persistence;
  final List<CustomActionButtonRecord> _items = <CustomActionButtonRecord>[];
  var _nextId = 1;
  Future<void>? _loading;

  Future<void> _load() => _loading ??= _hydrate();

  Future<void> _hydrate() async {
    final rows = await _persistence?.read() ?? [];
    for (final row in rows) {
      _items.add(
        CustomActionButtonRecord(
          id: row['id'] as String,
          title: row['title'] as String,
          icon: CustomActionButtonIcon.values.byName(row['icon'] as String),
          action: CustomActionButtonAction.fromMap(
            Map<Object?, Object?>.from(row['action'] as Map),
          ),
          createdAt: DateTime.parse(row['createdAt'] as String),
          rowIndex: row['rowIndex'] as int,
          orderIndex: row['orderIndex'] as int,
        ),
      );
    }
    _nextId = _items.length + 1;
    while (_items.any((item) => item.id == 'button-$_nextId')) {
      _nextId++;
    }
  }

  Future<void> _save() async {
    await _persistence?.write([
      for (final item in _items)
        {
          'id': item.id,
          'title': item.title,
          'icon': item.icon.name,
          'action': item.action.toMap(),
          'createdAt': item.createdAt.toIso8601String(),
          'rowIndex': item.rowIndex,
          'orderIndex': item.orderIndex,
        },
    ]);
  }

  @override
  Future<List<CustomActionButtonRecord>> list() async {
    await _load();
    final items = List<CustomActionButtonRecord>.from(_items);
    items.sort(_compareButtons);
    return items;
  }

  @override
  Future<void> insert({
    required String title,
    required CustomActionButtonIcon icon,
    required CustomActionButtonAction action,
    int rowIndex = 0,
    int? orderIndex,
  }) async {
    await _load();
    final normalized = _normalize(title: title, action: action);
    _items.add(
      CustomActionButtonRecord(
        id: 'button-${_nextId++}',
        title: normalized.$1,
        icon: icon,
        action: normalized.$2,
        createdAt: _clock().toUtc(),
        rowIndex: rowIndex,
        orderIndex: orderIndex ?? _items.length,
      ),
    );
    await _save();
  }

  @override
  Future<void> update({
    required String id,
    required String title,
    required CustomActionButtonIcon icon,
    required CustomActionButtonAction action,
    required int rowIndex,
    required int orderIndex,
  }) async {
    await _load();
    final index = _indexOf(id);
    final existing = _items[index];
    final normalized = _normalize(title: title, action: action);
    _items[index] = CustomActionButtonRecord(
      id: existing.id,
      title: normalized.$1,
      icon: icon,
      action: normalized.$2,
      createdAt: existing.createdAt,
      rowIndex: rowIndex,
      orderIndex: orderIndex,
    );
    await _save();
  }

  @override
  Future<void> softDelete(String id) async {
    await _load();
    _items.removeAt(_indexOf(id));
    await _save();
  }

  int _indexOf(String id) {
    final index = _items.indexWhere((item) => item.id == id);
    if (index < 0) {
      throw StateError('Custom action button not found.');
    }
    return index;
  }

  (String, CustomActionButtonAction) _normalize({
    required String title,
    required CustomActionButtonAction action,
  }) {
    final normalizedTitle = title.trim();
    final normalizedAction = CustomActionButtonAction(
      kind: action.kind,
      value: action.trimmedValue,
    );
    if (normalizedTitle.isEmpty ||
        (normalizedAction.kind.requiresFreeText &&
            normalizedAction.value.isEmpty)) {
      throw const FormatException(
        'Le nom du bouton et son action sont obligatoires.',
      );
    }
    if (normalizedAction.kind == CustomActionKind.keySequence) {
      DesktopKeySequence.parse(normalizedAction.value);
    }
    return (normalizedTitle, normalizedAction);
  }

  int _compareButtons(
    CustomActionButtonRecord current,
    CustomActionButtonRecord next,
  ) {
    final row = current.rowIndex.compareTo(next.rowIndex);
    if (row != 0) {
      return row;
    }
    final order = current.orderIndex.compareTo(next.orderIndex);
    if (order != 0) {
      return order;
    }
    return current.createdAt.compareTo(next.createdAt);
  }
}
