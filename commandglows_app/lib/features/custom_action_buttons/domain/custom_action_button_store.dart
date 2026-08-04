import 'custom_action_buttons.dart';

abstract class CustomActionButtonStore {
  Future<List<CustomActionButtonRecord>> list();

  Future<void> insert({
    required String title,
    required CustomActionButtonIcon icon,
    required CustomActionButtonAction action,
    int rowIndex = 0,
    int? orderIndex,
  });

  Future<void> update({
    required String id,
    required String title,
    required CustomActionButtonIcon icon,
    required CustomActionButtonAction action,
    required int rowIndex,
    required int orderIndex,
  });

  Future<void> softDelete(String id);
}
