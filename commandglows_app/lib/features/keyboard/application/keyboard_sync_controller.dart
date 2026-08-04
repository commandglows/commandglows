import '../domain/keyboard_sync_models.dart';
import '../domain/keyboard_sync_store.dart';
import 'keyboard_sync_queue.dart';
import '../data/local_keyboard_sync_queue_store.dart';
import '../data/firebase_keyboard_theme_asset_store.dart';

enum KeyboardSyncControllerStatus {
  waitingCloud,
  dataReceived,
  decisionNeeded,
  applying,
  ready,
  partial,
  failed,
}

enum KeyboardSyncDecisionKind {
  none,
  seedCloudFromLocal,
  restoreLocalFromCloud,
  conflict,
}

class KeyboardSyncAuthContext {
  const KeyboardSyncAuthContext({
    required this.isSignedIn,
    required this.isLocalFallback,
    required this.hasEntitlement,
    required this.firebaseUid,
    required this.globalUserId,
  });

  final bool isSignedIn;
  final bool isLocalFallback;
  final bool hasEntitlement;
  final String? firebaseUid;
  final String? globalUserId;

  bool get remoteSyncActive =>
      isSignedIn &&
      !isLocalFallback &&
      hasEntitlement &&
      (firebaseUid?.trim().isNotEmpty ?? false) &&
      (globalUserId?.trim().isNotEmpty ?? false);
}

class KeyboardSyncControllerState {
  const KeyboardSyncControllerState({
    required this.status,
    required this.decision,
    required this.hasPendingQueue,
    this.localProfile,
    this.cloudProfile,
    this.issueCode,
    this.issueMessage,
  });

  const KeyboardSyncControllerState.initial()
    : status = KeyboardSyncControllerStatus.waitingCloud,
      decision = KeyboardSyncDecisionKind.none,
      hasPendingQueue = false,
      localProfile = null,
      cloudProfile = null,
      issueCode = null,
      issueMessage = null;

  final KeyboardSyncControllerStatus status;
  final KeyboardSyncDecisionKind decision;
  final bool hasPendingQueue;
  final KeyboardSyncProfile? localProfile;
  final KeyboardSyncProfile? cloudProfile;
  final String? issueCode;
  final String? issueMessage;

  KeyboardSyncControllerState copyWith({
    KeyboardSyncControllerStatus? status,
    KeyboardSyncDecisionKind? decision,
    bool? hasPendingQueue,
    KeyboardSyncProfile? localProfile,
    KeyboardSyncProfile? cloudProfile,
    String? issueCode,
    String? issueMessage,
  }) {
    return KeyboardSyncControllerState(
      status: status ?? this.status,
      decision: decision ?? this.decision,
      hasPendingQueue: hasPendingQueue ?? this.hasPendingQueue,
      localProfile: localProfile ?? this.localProfile,
      cloudProfile: cloudProfile ?? this.cloudProfile,
      issueCode: issueCode,
      issueMessage: issueMessage,
    );
  }
}

typedef KeyboardSyncLocalExport = Future<KeyboardSyncProfile?> Function();
typedef KeyboardSyncLocalApply =
    Future<void> Function(KeyboardSyncProfile profile);
typedef KeyboardSyncLocalThemeAssetExport =
    Future<KeyboardSyncThemeAssetUploadRequest?> Function();
typedef KeyboardSyncLocalApplyWithRestoredThemeImage =
    Future<void> Function(
      KeyboardSyncProfile profile,
      String restoredThemeImagePath,
    );

class KeyboardSyncController {
  KeyboardSyncController({
    required KeyboardSyncStore cloudStore,
    required KeyboardSyncQueue queue,
    required KeyboardThemeAssetStore assetStore,
    required KeyboardSyncLocalExport exportLocalProfile,
    required KeyboardSyncLocalApply applyLocalProfile,
    KeyboardSyncLocalThemeAssetExport? exportLocalThemeAsset,
    KeyboardSyncLocalApplyWithRestoredThemeImage?
    applyLocalProfileWithRestoredThemeImage,
    bool Function(KeyboardSyncProfile? profile)? isLocalProfileClean,
  }) : _cloudStore = cloudStore,
       _queue = queue,
       _assetStore = assetStore,
       _exportLocalProfile = exportLocalProfile,
       _applyLocalProfile = applyLocalProfile,
       _exportLocalThemeAsset = exportLocalThemeAsset,
       _applyLocalProfileWithRestoredThemeImage =
           applyLocalProfileWithRestoredThemeImage,
       _isLocalProfileClean =
           isLocalProfileClean ?? _defaultIsLocalProfileClean;

  final KeyboardSyncStore _cloudStore;
  final KeyboardSyncQueue _queue;
  final KeyboardThemeAssetStore _assetStore;
  final KeyboardSyncLocalExport _exportLocalProfile;
  final KeyboardSyncLocalApply _applyLocalProfile;
  final KeyboardSyncLocalThemeAssetExport? _exportLocalThemeAsset;
  final KeyboardSyncLocalApplyWithRestoredThemeImage?
      _applyLocalProfileWithRestoredThemeImage;
  final bool Function(KeyboardSyncProfile? profile) _isLocalProfileClean;

  KeyboardSyncControllerState _state =
      const KeyboardSyncControllerState.initial();
  String? _activeFirebaseUid;
  String? _activeGlobalUserId;

  KeyboardSyncControllerState get state => _state;

  Future<KeyboardSyncControllerState> synchronize(
    KeyboardSyncAuthContext context,
  ) async {
    if (!context.remoteSyncActive) {
      _state = const KeyboardSyncControllerState(
        status: KeyboardSyncControllerStatus.waitingCloud,
        decision: KeyboardSyncDecisionKind.none,
        hasPendingQueue: false,
      );
      return _state;
    }

    final firebaseUid = context.firebaseUid!.trim();
    final globalUserId = context.globalUserId!.trim();
    final accountChanged =
        _activeFirebaseUid != null &&
        _activeGlobalUserId != null &&
        (_activeFirebaseUid != firebaseUid ||
            _activeGlobalUserId != globalUserId);
    if (accountChanged) {
      await _queue.purgeForAccountChange(
        targetFirebaseUid: firebaseUid,
        targetGlobalUserId: globalUserId,
      );
    }
    _activeFirebaseUid = firebaseUid;
    _activeGlobalUserId = globalUserId;

    _state = const KeyboardSyncControllerState(
      status: KeyboardSyncControllerStatus.waitingCloud,
      decision: KeyboardSyncDecisionKind.none,
      hasPendingQueue: false,
    );

    KeyboardSyncProfile? localProfile;
    KeyboardSyncThemeAssetUploadRequest? localThemeAsset;
    try {
      localProfile = await _exportLocalProfile();
      final exportLocalThemeAsset = _exportLocalThemeAsset;
      if (exportLocalThemeAsset != null) {
        localThemeAsset = await exportLocalThemeAsset();
      }
    } catch (_) {
      localProfile = null;
      localThemeAsset = null;
    }

    final cloudProfile = await _loadCloudProfile();
    if (_state.status == KeyboardSyncControllerStatus.failed) {
      return _state;
    }

    _state = KeyboardSyncControllerState(
      status: KeyboardSyncControllerStatus.dataReceived,
      decision: KeyboardSyncDecisionKind.none,
      hasPendingQueue: false,
      localProfile: localProfile,
      cloudProfile: cloudProfile,
    );

    if (cloudProfile == null) {
      if (localProfile != null && localProfile.validate().isValid) {
        final queuedProfile = _profileForCloudSave(
          localProfile,
          baseCloudRevision: 0,
        );
        _state = _state.copyWith(
          status: KeyboardSyncControllerStatus.applying,
          decision: KeyboardSyncDecisionKind.seedCloudFromLocal,
        );
        await _queue.enqueueDefaultProfile(
          targetFirebaseUid: firebaseUid,
          targetGlobalUserId: globalUserId,
          profile: queuedProfile,
          baseCloudRevision: 0,
          themeAssetUpload: localThemeAsset,
        );
      }
      return _flushQueue(firebaseUid: firebaseUid, globalUserId: globalUserId);
    }

    if (_isLocalProfileClean(localProfile)) {
      _state = _state.copyWith(
        status: KeyboardSyncControllerStatus.applying,
        decision: KeyboardSyncDecisionKind.restoreLocalFromCloud,
      );
      try {
        await _applyCloudProfile(
          context: context,
          cloudProfile: cloudProfile,
        );
      } catch (_) {
        _state = _state.copyWith(
          status: KeyboardSyncControllerStatus.failed,
          issueCode: 'apply_failed',
          issueMessage: 'Keyboard cloud profile could not be applied locally.',
        );
        return _state;
      }
      return _flushQueue(firebaseUid: firebaseUid, globalUserId: globalUserId);
    }

    if (localProfile != null &&
        localProfile.checksum == cloudProfile.checksum) {
      return _flushQueue(firebaseUid: firebaseUid, globalUserId: globalUserId);
    }

    _state = _state.copyWith(
      status: KeyboardSyncControllerStatus.decisionNeeded,
      decision: KeyboardSyncDecisionKind.conflict,
      issueCode: 'profile_conflict',
      issueMessage: 'Local and cloud keyboard profiles diverged.',
    );
    return _state;
  }

  Future<KeyboardSyncControllerState> keepLocalProfile(
    KeyboardSyncAuthContext context,
  ) async {
    if (!context.remoteSyncActive) {
      return synchronize(context);
    }
    final firebaseUid = context.firebaseUid!.trim();
    final globalUserId = context.globalUserId!.trim();
    final localProfile = _state.localProfile ?? await _exportLocalProfile();
    KeyboardSyncThemeAssetUploadRequest? themeAssetUpload;
    final exportLocalThemeAsset = _exportLocalThemeAsset;
    if (exportLocalThemeAsset != null) {
      themeAssetUpload = await exportLocalThemeAsset();
    }
    final cloudProfile = _state.cloudProfile ?? await _loadCloudProfile();
    if (localProfile == null || !localProfile.validate().isValid) {
      _state = _state.copyWith(
        status: KeyboardSyncControllerStatus.failed,
        issueCode: 'local_profile_unavailable',
        issueMessage: 'Keyboard local profile is unavailable.',
      );
      return _state;
    }
    final baseRevision = cloudProfile?.profileRevision ?? 0;
    await _queue.enqueueDefaultProfile(
      targetFirebaseUid: firebaseUid,
      targetGlobalUserId: globalUserId,
      profile: _profileForCloudSave(
        localProfile,
        baseCloudRevision: baseRevision,
      ),
      baseCloudRevision: baseRevision,
      themeAssetUpload: themeAssetUpload,
    );
    _state = _state.copyWith(
      status: KeyboardSyncControllerStatus.applying,
      decision: KeyboardSyncDecisionKind.seedCloudFromLocal,
      issueCode: null,
      issueMessage: null,
    );
    return _flushQueue(firebaseUid: firebaseUid, globalUserId: globalUserId);
  }

  Future<KeyboardSyncControllerState> useCloudProfile(
    KeyboardSyncAuthContext context,
  ) async {
    if (!context.remoteSyncActive) {
      return synchronize(context);
    }
    final firebaseUid = context.firebaseUid!.trim();
    final globalUserId = context.globalUserId!.trim();
    final cloudProfile = _state.cloudProfile ?? await _loadCloudProfile();
    if (cloudProfile == null) {
      _state = _state.copyWith(
        status: KeyboardSyncControllerStatus.failed,
        issueCode: 'cloud_profile_unavailable',
        issueMessage: 'Keyboard cloud profile is unavailable.',
      );
      return _state;
    }
    _state = _state.copyWith(
      status: KeyboardSyncControllerStatus.applying,
      decision: KeyboardSyncDecisionKind.restoreLocalFromCloud,
      issueCode: null,
      issueMessage: null,
    );
    try {
      await _applyCloudProfile(context: context, cloudProfile: cloudProfile);
      await _queue.clear();
    } catch (_) {
      _state = _state.copyWith(
        status: KeyboardSyncControllerStatus.failed,
        issueCode: 'apply_failed',
        issueMessage: 'Keyboard cloud profile could not be applied locally.',
      );
      return _state;
    }
    return _flushQueue(firebaseUid: firebaseUid, globalUserId: globalUserId);
  }

  Future<void> _applyCloudProfile({
    required KeyboardSyncAuthContext context,
    required KeyboardSyncProfile cloudProfile,
  }) async {
    final themeAsset = cloudProfile.themeAsset;
    if (themeAsset == null) {
      await _applyLocalProfile(cloudProfile.withThemeAsset(null));
      return;
    }
    final restoredThemeImagePath = await _assetStore.downloadThemeAsset(
      firebaseUid: context.firebaseUid!.trim(),
      globalUserId: context.globalUserId!.trim(),
      manifest: themeAsset,
    );
    final applyWithRestoredThemeImage =
        _applyLocalProfileWithRestoredThemeImage;
    if (applyWithRestoredThemeImage != null) {
      await applyWithRestoredThemeImage(
        cloudProfile,
        restoredThemeImagePath,
      );
      return;
    }
    await _applyLocalProfile(cloudProfile.withThemeAsset(null));
    _state = _state.copyWith(
      status: KeyboardSyncControllerStatus.partial,
      issueCode: 'theme_asset_downloaded_not_applied',
      issueMessage: 'Image du thème récupérée sans application native dédiée.',
    );
  }

  Future<KeyboardSyncProfile?> _loadCloudProfile() async {
    try {
      return await _cloudStore.loadDefault();
    } on KeyboardSyncStoreException catch (error) {
      _state = _state.copyWith(
        status: KeyboardSyncControllerStatus.failed,
        issueCode: error.code.name,
        issueMessage: error.message,
      );
      return null;
    } catch (_) {
      _state = _state.copyWith(
        status: KeyboardSyncControllerStatus.failed,
        issueCode: KeyboardSyncStoreErrorCode.unavailable.name,
        issueMessage: 'Keyboard cloud profile could not be loaded.',
      );
      return null;
    }
  }

  Future<KeyboardSyncControllerState> _flushQueue({
    required String firebaseUid,
    required String globalUserId,
  }) async {
    final result = await _queue.flush(
      targetFirebaseUid: firebaseUid,
      targetGlobalUserId: globalUserId,
    );
    if (result.hasConflict) {
      _state = _state.copyWith(
        status: KeyboardSyncControllerStatus.decisionNeeded,
        decision: KeyboardSyncDecisionKind.conflict,
        hasPendingQueue: true,
        issueCode: KeyboardSyncStoreErrorCode.conflict.name,
        issueMessage: 'Cloud keyboard revision changed while flushing queue.',
      );
      return _state;
    }
    final pending = await _queue.listFlushReady(
      targetFirebaseUid: firebaseUid,
      targetGlobalUserId: globalUserId,
    );
    _state = _state.copyWith(
      status: result.failedCount > 0
          ? KeyboardSyncControllerStatus.partial
          : KeyboardSyncControllerStatus.ready,
      decision: KeyboardSyncDecisionKind.none,
      hasPendingQueue: pending.isNotEmpty || result.failedCount > 0,
      issueCode: null,
      issueMessage: null,
    );
    return _state;
  }

  static bool _defaultIsLocalProfileClean(KeyboardSyncProfile? profile) {
    if (profile == null) {
      return true;
    }
    final metadata = profile.payload['metadata'];
    if (metadata is Map && metadata['hasNativeCustomizations'] == true) {
      return false;
    }
    return profile.profileRevision <= 0 || profile.payload.isEmpty;
  }

  static KeyboardSyncProfile _profileForCloudSave(
    KeyboardSyncProfile profile, {
    required int baseCloudRevision,
  }) {
    final nextRevision = profile.profileRevision <= baseCloudRevision
        ? baseCloudRevision + 1
        : profile.profileRevision;
    return profile.copyWith(
      profileRevision: nextRevision,
      baseCloudRevision: baseCloudRevision,
      recomputeChecksum: true,
    );
  }
}
