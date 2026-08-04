import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart' as firebase_auth;

import '../domain/snippet_store.dart';

class FirebaseSnippetStore implements SnippetStore {
  FirebaseSnippetStore({
    FirebaseFirestore? firestore,
    firebase_auth.FirebaseAuth? auth,
  }) : _firestore = firestore ?? FirebaseFirestore.instance,
       _auth = auth ?? firebase_auth.FirebaseAuth.instance;

  final FirebaseFirestore _firestore;
  final firebase_auth.FirebaseAuth _auth;

  @override
  Future<List<SnippetRecord>> list() async {
    final snapshot = await _collection
        .where('deletedAt', isNull: true)
        .orderBy('createdAt', descending: true)
        .limit(100)
        .get();
    return snapshot.docs
        .map((doc) => _recordFromMap(doc.id, doc.data()))
        .toList(growable: false);
  }

  @override
  Future<void> insert({
    required String trigger,
    required String content,
    String? label,
  }) {
    final now = DateTime.now().toUtc();
    final normalizedTrigger = trigger.trim();
    final normalizedContent = content.trim();
    final normalizedLabel = label?.trim();

    if (normalizedTrigger.isEmpty || normalizedContent.isEmpty) {
      throw const FormatException('Snippet trigger/content cannot be empty.');
    }

    return _collection.add({
      'trigger': normalizedTrigger,
      'content': normalizedContent,
      'label': normalizedLabel?.isNotEmpty == true ? normalizedLabel : null,
      'createdAt': Timestamp.fromDate(now),
      'updatedAt': Timestamp.fromDate(now),
      'deletedAt': null,
    });
  }

  @override
  Future<void> update({
    required String id,
    required String trigger,
    required String content,
    String? label,
  }) {
    final now = DateTime.now().toUtc();
    final normalizedTrigger = trigger.trim();
    final normalizedContent = content.trim();
    final normalizedLabel = label?.trim();
    if (normalizedTrigger.isEmpty || normalizedContent.isEmpty) {
      throw const FormatException('Snippet trigger/content cannot be empty.');
    }

    return _collection.doc(id).update({
      'trigger': normalizedTrigger,
      'content': normalizedContent,
      'label': normalizedLabel?.isNotEmpty == true ? normalizedLabel : null,
      'updatedAt': Timestamp.fromDate(now),
    });
  }

  @override
  Future<void> softDelete(String id) {
    return _collection.doc(id).update({
      'deletedAt': Timestamp.fromDate(DateTime.now().toUtc()),
      'updatedAt': Timestamp.fromDate(DateTime.now().toUtc()),
    });
  }

  CollectionReference<Map<String, dynamic>> get _collection {
    final uid = _requireAuthenticatedUserId();
    return _firestore.collection('users').doc(uid).collection('snippets');
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

  static SnippetRecord _recordFromMap(String id, Map<String, dynamic> row) {
    return SnippetRecord(
      id: id,
      trigger: (row['trigger'] as String?) ?? '',
      content: (row['content'] as String?) ?? '',
      label: row['label'] as String?,
      createdAt: _parseDateTime(row['createdAt']),
    );
  }

  static DateTime _parseDateTime(Object? raw) {
    return _parseDateTimeOrNull(raw) ?? DateTime.fromMillisecondsSinceEpoch(0);
  }

  static DateTime? _parseDateTimeOrNull(Object? raw) {
    if (raw == null) {
      return null;
    }
    if (raw is Timestamp) {
      return raw.toDate().toLocal();
    }
    if (raw is String) {
      return DateTime.tryParse(raw)?.toLocal();
    }
    if (raw is num) {
      return DateTime.fromMillisecondsSinceEpoch(raw.toInt()).toLocal();
    }
    return null;
  }
}
