import '../data/local_keyboard_sync_queue_store.dart';
import '../data/firebase_keyboard_theme_asset_store.dart';
import '../domain/keyboard_sync_models.dart';
import '../domain/keyboard_sync_store.dart';

class KeyboardSyncQueueFlushResult {
  const KeyboardSyncQueueFlushResult({
    required this.flushedCount,
    required this.failedCount,
    this.conflict,
  });

  final int flushedCount;
  final int failedCount;
  final KeyboardSyncStoreConflictException? conflict;

  bool get hasConflict => conflict != null;
}

abstract class KeyboardSyncQueue {
  Future<void> enqueueDefaultProfile({
    required String targetFirebaseUid,
    required String targetGlobalUserId,
    required KeyboardSyncProfile profile,
    required int baseCloudRevision,
    KeyboardSyncThemeAssetUploadRequest? themeAssetUpload,
  });

  Future<List<KeyboardSyncQueueEntry>> listEntries();

  Future<List<KeyboardSyncQueueEntry>> listFlushReady({
    required String targetFirebaseUid,
    required String targetGlobalUserId,
  });

  Future<void> purgeForAccountChange({
    required String targetFirebaseUid,
    required String targetGlobalUserId,
  });

  Future<void> clear();

  Future<KeyboardSyncQueueFlushResult> flush({
    required String targetFirebaseUid,
    required String targetGlobalUserId,
  });
}

class DurableKeyboardSyncQueue implements KeyboardSyncQueue {
  DurableKeyboardSyncQueue({
    required KeyboardSyncStore cloudStore,
    required KeyboardThemeAssetStore assetStore,
    required LocalKeyboardSyncQueueStore queueStore,
    DateTime Function()? clock,
    Duration Function(int attempts)? retryDelayForAttempt,
  }) : _cloudStore = cloudStore,
       _assetStore = assetStore,
       _queueStore = queueStore,
       _clock = clock ?? DateTime.now,
       _retryDelayForAttempt = retryDelayForAttempt ?? _defaultRetryDelay;

  static const String defaultOperationKey = 'keyboardProfile:default';

  final KeyboardSyncStore _cloudStore;
  final KeyboardThemeAssetStore _assetStore;
  final LocalKeyboardSyncQueueStore _queueStore;
  final DateTime Function() _clock;
  final Duration Function(int attempts) _retryDelayForAttempt;

  @override
  Future<void> enqueueDefaultProfile({
    required String targetFirebaseUid,
    required String targetGlobalUserId,
    required KeyboardSyncProfile profile,
    required int baseCloudRevision,
    KeyboardSyncThemeAssetUploadRequest? themeAssetUpload,
  }) async {
    final now = _clock().toUtc();
    await _queueStore.upsert(
      KeyboardSyncQueueEntry(
        operationKey: defaultOperationKey,
        targetFirebaseUid: targetFirebaseUid,
        targetGlobalUserId: targetGlobalUserId,
        profile: profile,
        baseCloudRevision: baseCloudRevision,
        attempts: 0,
        retryAfterUtc: now,
        state: KeyboardSyncQueueEntryState.pending,
        createdAtUtc: now,
        updatedAtUtc: now,
        themeAssetUpload: themeAssetUpload,
      ),
    );
  }

  @override
  Future<List<KeyboardSyncQueueEntry>> listEntries() {
    return _queueStore.listAll();
  }

  @override
  Future<List<KeyboardSyncQueueEntry>> listFlushReady({
    required String targetFirebaseUid,
    required String targetGlobalUserId,
  }) async {
    final now = _clock().toUtc();
    final entries = await _queueStore.listAll();
    return entries
        .where(
          (entry) =>
              entry.targetFirebaseUid == targetFirebaseUid &&
              entry.targetGlobalUserId == targetGlobalUserId &&
              entry.isFlushReady(now),
        )
        .toList(growable: false);
  }

  @override
  Future<void> purgeForAccountChange({
    required String targetFirebaseUid,
    required String targetGlobalUserId,
  }) {
    return _queueStore.purgeForAccount(
      firebaseUid: targetFirebaseUid,
      globalUserId: targetGlobalUserId,
    );
  }

  @override
  Future<void> clear() {
    return _queueStore.clear();
  }

  @override
  Future<KeyboardSyncQueueFlushResult> flush({
    required String targetFirebaseUid,
    required String targetGlobalUserId,
  }) async {
    final ready = await listFlushReady(
      targetFirebaseUid: targetFirebaseUid,
      targetGlobalUserId: targetGlobalUserId,
    );
    if (ready.isEmpty) {
      return const KeyboardSyncQueueFlushResult(
        flushedCount: 0,
        failedCount: 0,
      );
    }

    var flushedCount = 0;
    var failedCount = 0;
    final all = List<KeyboardSyncQueueEntry>.from(await _queueStore.listAll());

    for (final entry in ready) {
      final index = all.indexWhere(
        (row) => row.operationKey == entry.operationKey,
      );
      if (index < 0) {
        continue;
      }

      try {
        var profile = entry.profile;
        if (entry.themeAssetUpload != null) {
          final assetManifest = await _assetStore.uploadThemeAsset(
            firebaseUid: targetFirebaseUid,
            globalUserId: targetGlobalUserId,
            profileRevision: entry.profile.profileRevision,
            request: entry.themeAssetUpload!,
          );
          profile = profile.withThemeAsset(assetManifest);
        }
        await _cloudStore.saveDefault(
          profile: profile,
          baseCloudRevision: entry.baseCloudRevision,
        );
        all.removeAt(index);
        flushedCount += 1;
      } on KeyboardSyncStoreConflictException catch (conflict) {
        final now = _clock().toUtc();
        all[index] = entry.copyWith(
          attempts: entry.attempts + 1,
          retryAfterUtc: now.add(_retryDelayForAttempt(entry.attempts + 1)),
          state: KeyboardSyncQueueEntryState.failed,
          updatedAtUtc: now,
          lastErrorCode: KeyboardSyncStoreErrorCode.conflict.name,
          lastErrorMessage: 'Cloud revision changed.',
        );
        failedCount += 1;
        await _queueStore.replaceAll(all);
        return KeyboardSyncQueueFlushResult(
          flushedCount: flushedCount,
          failedCount: failedCount,
          conflict: conflict,
        );
      } on KeyboardSyncStoreException catch (error) {
        final now = _clock().toUtc();
        all[index] = entry.copyWith(
          attempts: entry.attempts + 1,
          retryAfterUtc: now.add(_retryDelayForAttempt(entry.attempts + 1)),
          state: KeyboardSyncQueueEntryState.failed,
          updatedAtUtc: now,
          lastErrorCode: error.code.name,
          lastErrorMessage: error.message,
        );
        failedCount += 1;
      } catch (_) {
        final now = _clock().toUtc();
        all[index] = entry.copyWith(
          attempts: entry.attempts + 1,
          retryAfterUtc: now.add(_retryDelayForAttempt(entry.attempts + 1)),
          state: KeyboardSyncQueueEntryState.failed,
          updatedAtUtc: now,
          lastErrorCode: KeyboardSyncStoreErrorCode.unavailable.name,
          lastErrorMessage: 'Keyboard sync queue flush failed.',
        );
        failedCount += 1;
      }
    }

    await _queueStore.replaceAll(all);
    return KeyboardSyncQueueFlushResult(
      flushedCount: flushedCount,
      failedCount: failedCount,
    );
  }

  static Duration _defaultRetryDelay(int attempts) {
    final clampedAttempts = attempts.clamp(1, 6);
    return Duration(seconds: 15 * (1 << (clampedAttempts - 1)));
  }
}
