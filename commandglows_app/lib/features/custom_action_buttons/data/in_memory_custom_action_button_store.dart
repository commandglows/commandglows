import '../domain/custom_action_button_store.dart';
import '../domain/custom_action_buttons.dart';

class InMemoryCustomActionButtonStore implements CustomActionButtonStore {
  InMemoryCustomActionButtonStore({DateTime Function()? clock})
    : _clock = clock ?? DateTime.now;

  final DateTime Function() _clock;
  final List<CustomActionButtonRecord> _items = <CustomActionButtonRecord>[];
  var _nextId = 1;

  @override
  Future<List<CustomActionButtonRecord>> list() async {
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
  }

  @override
  Future<void> softDelete(String id) async {
    _items.removeAt(_indexOf(id));
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
