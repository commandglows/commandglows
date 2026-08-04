import 'keyboard_sync_models.dart';

enum KeyboardSyncStoreErrorCode {
  authRequired,
  invalidCloudDocument,
  conflict,
  unavailable,
}

class KeyboardSyncStoreException implements Exception {
  const KeyboardSyncStoreException({required this.code, required this.message});

  final KeyboardSyncStoreErrorCode code;
  final String message;

  @override
  String toString() => 'KeyboardSyncStoreException(${code.name}): $message';
}

class KeyboardSyncStoreConflictException extends KeyboardSyncStoreException {
  const KeyboardSyncStoreConflictException({
    required this.expectedBaseRevision,
    required this.actualCloudRevision,
    this.currentProfile,
    this.incomingProfile,
  }) : super(
         code: KeyboardSyncStoreErrorCode.conflict,
         message: 'Cloud keyboard profile revision changed.',
       );

  final int expectedBaseRevision;
  final int actualCloudRevision;
  final KeyboardSyncProfile? currentProfile;
  final KeyboardSyncProfile? incomingProfile;
}

class KeyboardSyncStoreSaveResult {
  const KeyboardSyncStoreSaveResult({
    required this.profile,
    required this.cloudRevision,
    required this.applied,
  });

  final KeyboardSyncProfile profile;
  final int cloudRevision;
  final bool applied;
}

abstract class KeyboardSyncStore {
  Future<KeyboardSyncProfile?> loadDefault();

  Stream<KeyboardSyncProfile?> watchDefault();

  Future<KeyboardSyncStoreSaveResult> saveDefault({
    required KeyboardSyncProfile profile,
    required int baseCloudRevision,
  });
}
