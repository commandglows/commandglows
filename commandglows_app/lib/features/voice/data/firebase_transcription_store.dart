import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart' as firebase_auth;

import '../../../core/sync/sync_status.dart';
import '../application/transcription_store.dart';
import '../domain/transcription_draft.dart';

class FirebaseTranscriptionStore implements TranscriptionStore {
  FirebaseTranscriptionStore({
    FirebaseFirestore? firestore,
    firebase_auth.FirebaseAuth? auth,
  }) : _firestore = firestore ?? FirebaseFirestore.instance,
       _auth = auth ?? firebase_auth.FirebaseAuth.instance;

  final FirebaseFirestore _firestore;
  final firebase_auth.FirebaseAuth _auth;

  @override
  Future<List<TranscriptionRecord>> list() async {
    final snapshot = await _collection
        .where('deletedAt', isNull: true)
        .orderBy('createdAt', descending: true)
        .limit(100)
        .get();

    return snapshot.docs
        .map((doc) => _recordFromMap(id: doc.id, row: doc.data()))
        .toList(growable: false);
  }

  @override
  Future<TranscriptionRecord> insert(TranscriptionDraft draft) async {
    if (!draft.isValid) {
      throw const FormatException('Invalid transcription payload.');
    }

    final now = DateTime.now().toUtc();
    final payload = {
      'rawText': draft.rawText.trim(),
      'cleanedText': draft.cleanedText.trim(),
      'language': (draft.language.trim().isEmpty)
          ? 'unknown'
          : draft.language.trim(),
      'source': draft.source,
      'durationMs': draft.durationMs,
      'createdAt': Timestamp.fromDate(now),
      'updatedAt': Timestamp.fromDate(now),
      'deletedAt': null,
    };
    final doc = await _collection.add(payload);
    final created = await doc.get();
    final data = created.data();
    if (data == null) {
      throw StateError('Transcription creation did not return a document.');
    }
    return _recordFromMap(id: created.id, row: data);
  }

  @override
  Future<void> updateCleanedText({
    required String id,
    required String cleanedText,
  }) async {
    final value = cleanedText.trim();
    if (value.isEmpty) {
      throw const FormatException('cleanedText cannot be empty.');
    }
    await _collection.doc(id).update({
      'cleanedText': value,
      'updatedAt': Timestamp.fromDate(DateTime.now().toUtc()),
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
    return _firestore.collection('users').doc(uid).collection('transcriptions');
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

  static TranscriptionRecord _recordFromMap({
    required String id,
    required Map<String, dynamic> row,
  }) {
    return TranscriptionRecord(
      id: id,
      rawText: (row['rawText'] as String?) ?? '',
      cleanedText: (row['cleanedText'] as String?) ?? '',
      language: (row['language'] as String?) ?? 'unknown',
      source: (row['source'] as String?) ?? 'free',
      durationMs: (row['durationMs'] as num?)?.toInt() ?? 0,
      createdAt: _parseDateTime(row['createdAt']),
      updatedAt: _parseDateTime(
        row['updatedAt'],
        fallback: _parseDateTimeOrNull(row['createdAt']),
      ),
      syncStatus: const SyncStatus(health: SyncHealth.synced),
      deletedAt: _parseDateTimeOrNull(row['deletedAt']),
    );
  }

  static DateTime _parseDateTime(Object? raw, {DateTime? fallback}) {
    return _parseDateTimeOrNull(raw) ??
        fallback ??
        DateTime.fromMillisecondsSinceEpoch(0);
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
