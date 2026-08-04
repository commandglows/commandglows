import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart' as firebase_auth;

import '../domain/custom_action_button_store.dart';
import '../domain/custom_action_buttons.dart';

class FirebaseCustomActionButtonStore implements CustomActionButtonStore {
  FirebaseCustomActionButtonStore({
    FirebaseFirestore? firestore,
    firebase_auth.FirebaseAuth? auth,
  }) : _firestore = firestore ?? FirebaseFirestore.instance,
       _auth = auth ?? firebase_auth.FirebaseAuth.instance;

  final FirebaseFirestore _firestore;
  final firebase_auth.FirebaseAuth _auth;

  @override
  Future<List<CustomActionButtonRecord>> list() async {
    final snapshot = await _collection
        .where('deletedAt', isNull: true)
        .orderBy('createdAt', descending: true)
        .limit(100)
        .get();
    return snapshot.docs
        .map((doc) => _recordFromMap(doc.id, doc.data()))
        .toList(growable: false)
      ..sort(_compareButtons);
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
    final now = DateTime.now().toUtc();
    await _collection.add({
      'title': normalized.$1,
      'icon': icon.name,
      'action': normalized.$2.toMap(),
      'rowIndex': rowIndex,
      'orderIndex': orderIndex ?? now.millisecondsSinceEpoch,
      'createdAt': Timestamp.fromDate(now),
      'updatedAt': Timestamp.fromDate(now),
      'deletedAt': null,
    });
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
    final normalized = _normalize(title: title, action: action);
    await _collection.doc(id).update({
      'title': normalized.$1,
      'icon': icon.name,
      'action': normalized.$2.toMap(),
      'rowIndex': rowIndex,
      'orderIndex': orderIndex,
      'updatedAt': Timestamp.fromDate(DateTime.now().toUtc()),
    });
  }

  @override
  Future<void> softDelete(String id) async {
    await _collection.doc(id).update({
      'deletedAt': Timestamp.fromDate(DateTime.now().toUtc()),
      'updatedAt': Timestamp.fromDate(DateTime.now().toUtc()),
    });
  }

  CollectionReference<Map<String, dynamic>> get _collection {
    final uid = _requireAuthenticatedUserId();
    return _firestore
        .collection('users')
        .doc(uid)
        .collection('customActionButtons');
  }

  String _requireAuthenticatedUserId() {
    final uid = _auth.currentUser?.uid;
    if (uid == null || uid.trim().isEmpty) {
      throw StateError(
        'Firebase user id is unavailable; sign in to Firebase before using remote sync.',
      );
    }
    return uid;
  }

  static CustomActionButtonRecord _recordFromMap(
    String id,
    Map<String, dynamic> row,
  ) {
    final actionMap =
        (row['action'] as Map<Object?, Object?>?) ?? const <Object?, Object?>{};
    final iconName = row['icon'] as String? ?? '';
    return CustomActionButtonRecord(
      id: id,
      title: (row['title'] as String?) ?? '',
      icon: CustomActionButtonIcon.values.firstWhere(
        (item) => item.name == iconName,
        orElse: () => CustomActionButtonIcon.spark,
      ),
      action: CustomActionButtonAction.fromMap(actionMap),
      createdAt: _parseDateTime(row['createdAt']),
      rowIndex: (row['rowIndex'] as num?)?.toInt() ?? 0,
      orderIndex: (row['orderIndex'] as num?)?.toInt() ?? 0,
    );
  }

  static DateTime _parseDateTime(Object? raw) {
    if (raw is Timestamp) {
      return raw.toDate().toLocal();
    }
    if (raw is String) {
      return DateTime.tryParse(raw)?.toLocal() ??
          DateTime.fromMillisecondsSinceEpoch(0);
    }
    if (raw is num) {
      return DateTime.fromMillisecondsSinceEpoch(raw.toInt()).toLocal();
    }
    return DateTime.fromMillisecondsSinceEpoch(0);
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

  static int _compareButtons(
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
