import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart' as firebase_auth;

import '../domain/keyboard_sync_models.dart';
import '../domain/keyboard_sync_store.dart';

class FirebaseKeyboardConfigStore implements KeyboardSyncStore {
  FirebaseKeyboardConfigStore({
    FirebaseFirestore? firestore,
    firebase_auth.FirebaseAuth? auth,
    String? Function()? currentUidResolver,
  }) : _firestore = firestore ?? FirebaseFirestore.instance,
       _auth = auth ?? firebase_auth.FirebaseAuth.instance,
       _currentUidResolver = currentUidResolver;

  final FirebaseFirestore _firestore;
  final firebase_auth.FirebaseAuth _auth;
  final String? Function()? _currentUidResolver;

  @override
  Future<KeyboardSyncProfile?> loadDefault() async {
    try {
      final snapshot = await _document().get();
      if (!snapshot.exists) {
        return null;
      }
      return _profileFromData(snapshot.data() ?? const <String, dynamic>{});
    } on KeyboardSyncStoreException {
      rethrow;
    } on FirebaseException catch (error) {
      throw KeyboardSyncStoreException(
        code: KeyboardSyncStoreErrorCode.unavailable,
        message: _sanitizeErrorMessage(error.message),
      );
    } catch (_) {
      throw const KeyboardSyncStoreException(
        code: KeyboardSyncStoreErrorCode.unavailable,
        message: 'Keyboard sync cloud store is unavailable.',
      );
    }
  }

  @override
  Stream<KeyboardSyncProfile?> watchDefault() {
    return _document().snapshots().map((snapshot) {
      if (!snapshot.exists) {
        return null;
      }
      return _profileFromData(snapshot.data() ?? const <String, dynamic>{});
    });
  }

  @override
  Future<KeyboardSyncStoreSaveResult> saveDefault({
    required KeyboardSyncProfile profile,
    required int baseCloudRevision,
  }) async {
    if (!profile.validate().isValid) {
      throw const KeyboardSyncStoreException(
        code: KeyboardSyncStoreErrorCode.invalidCloudDocument,
        message: 'Keyboard sync profile is invalid.',
      );
    }

    try {
      return await _firestore.runTransaction((transaction) async {
        final document = _document();
        final snapshot = await transaction.get(document);
        final current = snapshot.exists
            ? _profileFromData(snapshot.data() ?? const <String, dynamic>{})
            : null;
        final currentRevision = current?.profileRevision ?? 0;

        final sameRevision =
            current != null &&
            current.profileRevision == profile.profileRevision;
        final sameChecksum =
            sameRevision && current.checksum == profile.checksum;
        if (sameChecksum) {
          return KeyboardSyncStoreSaveResult(
            profile: current,
            cloudRevision: currentRevision,
            applied: false,
          );
        }

        if (sameRevision && !sameChecksum) {
          throw KeyboardSyncStoreConflictException(
            expectedBaseRevision: baseCloudRevision,
            actualCloudRevision: currentRevision,
            currentProfile: current,
            incomingProfile: profile,
          );
        }

        if (currentRevision != baseCloudRevision) {
          throw KeyboardSyncStoreConflictException(
            expectedBaseRevision: baseCloudRevision,
            actualCloudRevision: currentRevision,
            currentProfile: current,
            incomingProfile: profile,
          );
        }

        if (currentRevision > profile.profileRevision) {
          throw KeyboardSyncStoreConflictException(
            expectedBaseRevision: baseCloudRevision,
            actualCloudRevision: currentRevision,
            currentProfile: current,
            incomingProfile: profile,
          );
        }

        transaction.set(document, <String, Object?>{
          ...profile.toMap(),
          'lastSyncedAt': FieldValue.serverTimestamp(),
        }, SetOptions(merge: true));

        return KeyboardSyncStoreSaveResult(
          profile: profile,
          cloudRevision: profile.profileRevision,
          applied: true,
        );
      });
    } on KeyboardSyncStoreConflictException {
      rethrow;
    } on KeyboardSyncStoreException {
      rethrow;
    } on FirebaseException catch (error) {
      throw KeyboardSyncStoreException(
        code: KeyboardSyncStoreErrorCode.unavailable,
        message: _sanitizeErrorMessage(error.message),
      );
    } catch (_) {
      throw const KeyboardSyncStoreException(
        code: KeyboardSyncStoreErrorCode.unavailable,
        message: 'Keyboard sync cloud save failed.',
      );
    }
  }

  DocumentReference<Map<String, dynamic>> _document() {
    final uid =
        (_currentUidResolver?.call() ?? _auth.currentUser?.uid)?.trim() ?? '';
    if (uid.isEmpty) {
      throw const KeyboardSyncStoreException(
        code: KeyboardSyncStoreErrorCode.authRequired,
        message: 'Keyboard sync requires an authenticated Firebase user.',
      );
    }
    return _firestore
        .collection('users')
        .doc(uid)
        .collection('keyboardConfigs')
        .doc('default');
  }

  static KeyboardSyncProfile _profileFromData(Map<String, dynamic> data) {
    final raw = <String, Object?>{};
    for (final entry in data.entries) {
      raw[entry.key] = entry.value;
    }
    if (raw['payload'] is Map) {
      raw['payload'] = Map<String, Object?>.from(raw['payload'] as Map);
    }
    final profile = KeyboardSyncProfile.fromMap(raw);
    final validation = profile.validate();
    if (!validation.isValid) {
      throw KeyboardSyncStoreException(
        code: KeyboardSyncStoreErrorCode.invalidCloudDocument,
        message:
            'Cloud keyboard profile failed validation (${validation.verdict.name}).',
      );
    }
    return profile;
  }

  static String _sanitizeErrorMessage(String? raw) {
    final value = (raw ?? 'Keyboard sync cloud operation failed.')
        .replaceAll(
          RegExp(r'Bearer\s+[0-9A-Za-z_.-]{12,}', caseSensitive: false),
          '<redacted>',
        )
        .replaceAll(RegExp(r'eyJ[0-9A-Za-z_.-]{20,}'), '<redacted>')
        .replaceAll(RegExp(r'\s+'), ' ')
        .trim();
    if (value.isEmpty) {
      return 'Keyboard sync cloud operation failed.';
    }
    if (value.length <= 180) {
      return value;
    }
    return value.substring(0, 180);
  }
}
