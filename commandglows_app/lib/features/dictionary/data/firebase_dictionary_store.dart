import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart' as firebase_auth;

import '../domain/dictionary_store.dart';

class FirebaseDictionaryStore implements DictionaryStore {
  FirebaseDictionaryStore({
    FirebaseFirestore? firestore,
    firebase_auth.FirebaseAuth? auth,
  }) : _firestore = firestore ?? FirebaseFirestore.instance,
       _auth = auth ?? firebase_auth.FirebaseAuth.instance;

  final FirebaseFirestore _firestore;
  final firebase_auth.FirebaseAuth _auth;

  @override
  Future<List<DictionaryTermRecord>> list() async {
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
    required String term,
    required String replacement,
    required bool caseSensitive,
  }) {
    final now = DateTime.now().toUtc();
    final normalizedTerm = term.trim();
    final normalizedReplacement = replacement.trim();
    if (normalizedTerm.isEmpty || normalizedReplacement.isEmpty) {
      throw const FormatException(
        'Dictionary term/replacement cannot be empty.',
      );
    }

    return _collection.add({
      'term': normalizedTerm,
      'replacement': normalizedReplacement,
      'caseSensitive': caseSensitive,
      'createdAt': Timestamp.fromDate(now),
      'updatedAt': Timestamp.fromDate(now),
      'deletedAt': null,
    });
  }

  @override
  Future<void> update({
    required String id,
    required String term,
    required String replacement,
    required bool caseSensitive,
  }) {
    final now = DateTime.now().toUtc();
    final normalizedTerm = term.trim();
    final normalizedReplacement = replacement.trim();
    if (normalizedTerm.isEmpty || normalizedReplacement.isEmpty) {
      throw const FormatException(
        'Dictionary term/replacement cannot be empty.',
      );
    }

    return _collection.doc(id).update({
      'term': normalizedTerm,
      'replacement': normalizedReplacement,
      'caseSensitive': caseSensitive,
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
    return _firestore
        .collection('users')
        .doc(uid)
        .collection('dictionaryTerms');
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

  static DictionaryTermRecord _recordFromMap(
    String id,
    Map<String, dynamic> row,
  ) {
    return DictionaryTermRecord(
      id: id,
      term: (row['term'] as String?) ?? '',
      replacement: (row['replacement'] as String?) ?? '',
      caseSensitive: (row['caseSensitive'] as bool?) ?? false,
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
