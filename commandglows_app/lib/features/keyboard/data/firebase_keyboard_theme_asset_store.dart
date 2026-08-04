import 'dart:io';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:crypto/crypto.dart';
import 'package:firebase_auth/firebase_auth.dart' as firebase_auth;
import 'package:firebase_storage/firebase_storage.dart';

import '../domain/keyboard_sync_models.dart';
import 'local_keyboard_sync_queue_store.dart';

class KeyboardThemeAssetException implements Exception {
  const KeyboardThemeAssetException({
    required this.code,
    required this.message,
  });

  final String code;
  final String message;
}

abstract class KeyboardThemeAssetStore {
  Future<KeyboardThemeAssetManifest> uploadThemeAsset({
    required String firebaseUid,
    required String globalUserId,
    required int profileRevision,
    required KeyboardSyncThemeAssetUploadRequest request,
  });

  Future<String> downloadThemeAsset({
    required String firebaseUid,
    required String globalUserId,
    required KeyboardThemeAssetManifest manifest,
  });
}

class FirebaseKeyboardThemeAssetStore implements KeyboardThemeAssetStore {
  FirebaseKeyboardThemeAssetStore({
    FirebaseStorage? storage,
    FirebaseFirestore? firestore,
    firebase_auth.FirebaseAuth? auth,
    Directory? tempDirectory,
    String? Function()? currentUidResolver,
  }) : _storage = storage ?? FirebaseStorage.instance,
       _firestore = firestore ?? FirebaseFirestore.instance,
       _auth = auth ?? firebase_auth.FirebaseAuth.instance,
       _tempDirectory = tempDirectory ?? Directory.systemTemp,
       _currentUidResolver = currentUidResolver;

  static const int maxAssetBytes = 8 * 1024 * 1024;

  final FirebaseStorage _storage;
  final FirebaseFirestore _firestore;
  final firebase_auth.FirebaseAuth _auth;
  final Directory _tempDirectory;
  final String? Function()? _currentUidResolver;

  @override
  Future<KeyboardThemeAssetManifest> uploadThemeAsset({
    required String firebaseUid,
    required String globalUserId,
    required int profileRevision,
    required KeyboardSyncThemeAssetUploadRequest request,
  }) async {
    _assertAuthorizedUid(firebaseUid);
    final file = File(request.localFilePath);
    if (!await file.exists()) {
      throw const KeyboardThemeAssetException(
        code: 'local_theme_image_missing',
        message: 'The local keyboard theme image is unavailable.',
      );
    }
    final bytes = await file.readAsBytes();
    if (bytes.isEmpty || bytes.length > maxAssetBytes) {
      throw const KeyboardThemeAssetException(
        code: 'theme_image_oversized',
        message: 'The keyboard theme image exceeds the allowed limit.',
      );
    }
    final checksum = sha256.convert(bytes).toString();
    final createdAt = DateTime.now().toUtc().toIso8601String();
    final storagePath =
        'users/$firebaseUid/keyboard_theme_assets/${request.assetId}';
    final reference = _storage.ref().child(storagePath);
    try {
      await reference.putFile(
        file,
        SettableMetadata(
          contentType: request.mimeType,
          customMetadata: <String, String>{
            'ownerUid': firebaseUid,
            'globalUserId': globalUserId,
            'assetId': request.assetId,
            'checksum': checksum.substring(0, 16),
          },
        ),
      );
      return KeyboardThemeAssetManifest(
        assetId: request.assetId,
        storagePath: storagePath,
        checksum: checksum,
        byteSize: bytes.length,
        mimeType: request.mimeType,
        profileRevision: profileRevision,
        createdAt: createdAt,
        updatedAt: createdAt,
        width: request.width,
        height: request.height,
      );
    } on FirebaseException catch (error) {
      throw KeyboardThemeAssetException(
        code: error.code,
        message: _sanitizeErrorMessage(error.message),
      );
    }
  }

  @override
  Future<String> downloadThemeAsset({
    required String firebaseUid,
    required String globalUserId,
    required KeyboardThemeAssetManifest manifest,
  }) async {
    _assertAuthorizedUid(firebaseUid);
    if (!manifest.storagePath.startsWith('users/$firebaseUid/')) {
      throw const KeyboardThemeAssetException(
        code: 'theme_asset_owner_mismatch',
        message: 'The keyboard theme asset does not belong to this account.',
      );
    }
    final filename = '${manifest.assetId}${_extensionForMimeType(manifest.mimeType)}';
    final output = File('${_tempDirectory.path}/$filename');
    try {
      await output.parent.create(recursive: true);
      await _storage.ref().child(manifest.storagePath).writeToFile(output);
      final bytes = await output.readAsBytes();
      final checksum = sha256.convert(bytes).toString();
      if (checksum != manifest.checksum) {
        throw const KeyboardThemeAssetException(
          code: 'theme_asset_checksum_mismatch',
          message: 'The restored keyboard theme image failed verification.',
        );
      }
      await _writeRestoreEvidence(
        firebaseUid: firebaseUid,
        globalUserId: globalUserId,
        manifest: manifest,
      );
      return output.path;
    } on FirebaseException catch (error) {
      throw KeyboardThemeAssetException(
        code: error.code,
        message: _sanitizeErrorMessage(error.message),
      );
    }
  }

  void _assertAuthorizedUid(String firebaseUid) {
    final currentUid =
        (_currentUidResolver?.call() ?? _auth.currentUser?.uid)?.trim() ?? '';
    if (currentUid.isEmpty || currentUid != firebaseUid.trim()) {
      throw const KeyboardThemeAssetException(
        code: 'auth_required',
        message: 'Keyboard theme assets require the active Firebase account.',
      );
    }
  }

  Future<void> _writeRestoreEvidence({
    required String firebaseUid,
    required String globalUserId,
    required KeyboardThemeAssetManifest manifest,
  }) async {
    try {
      await _firestore
          .collection('users')
          .doc(firebaseUid)
          .collection('keyboardThemeAssets')
          .doc(manifest.assetId)
          .set(<String, Object?>{
            ...manifest.toMap(),
            'globalUserId': globalUserId,
            'lastRestoredAt': FieldValue.serverTimestamp(),
          }, SetOptions(merge: true));
    } catch (_) {
      // Restore evidence is best-effort and must not block local recovery.
    }
  }

  static String _extensionForMimeType(String mimeType) {
    return switch (mimeType) {
      'image/jpeg' => '.jpg',
      'image/webp' => '.webp',
      _ => '.png',
    };
  }

  static String _sanitizeErrorMessage(String? raw) {
    final value = (raw ?? 'Keyboard theme asset operation failed.')
        .replaceAll(RegExp(r'\s+'), ' ')
        .trim();
    if (value.isEmpty) {
      return 'Keyboard theme asset operation failed.';
    }
    if (value.length <= 180) {
      return value;
    }
    return value.substring(0, 180);
  }
}
