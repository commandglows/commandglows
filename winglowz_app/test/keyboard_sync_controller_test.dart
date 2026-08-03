import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:commandglows_app/features/keyboard/application/keyboard_sync_controller.dart';
import 'package:commandglows_app/features/keyboard/application/keyboard_sync_queue.dart';
import 'package:commandglows_app/features/keyboard/data/firebase_keyboard_theme_asset_store.dart';
import 'package:commandglows_app/features/keyboard/data/local_keyboard_sync_queue_store.dart';
import 'package:commandglows_app/features/keyboard/domain/keyboard_sync_models.dart';
import 'package:commandglows_app/features/keyboard/domain/keyboard_sync_store.dart';

void main() {
  test('does not touch cloud while entitlement/session is inactive', () async {
    final cloud = _FakeCloudStore();
    final queue = _FakeQueue();
    final controller = KeyboardSyncController(
      cloudStore: cloud,
      queue: queue,
      assetStore: _FakeAssetStore(),
      exportLocalProfile: () async => _profile(revision: 1, base: 0),
      applyLocalProfile: (_) async {},
    );

    final state = await controller.synchronize(
      const KeyboardSyncAuthContext(
        isSignedIn: false,
        isLocalFallback: false,
        hasEntitlement: false,
        firebaseUid: null,
        globalUserId: null,
      ),
    );

    expect(state.status, KeyboardSyncControllerStatus.waitingCloud);
    expect(cloud.loadCalls, 0);
    expect(queue.flushCalls, 0);
  });

  test('cloud empty + local profile seeds queue and reaches ready', () async {
    final cloud = _FakeCloudStore(initialProfile: null);
    final queue = _FakeQueue();
    final controller = KeyboardSyncController(
      cloudStore: cloud,
      queue: queue,
      assetStore: _FakeAssetStore(),
      exportLocalProfile: () async => _profile(revision: 1, base: 0),
      applyLocalProfile: (_) async {},
    );

    final state = await controller.synchronize(_activeContext());

    expect(queue.enqueuedProfiles, hasLength(1));
    expect(queue.enqueuedProfiles.single.profileRevision, 1);
    expect(queue.enqueuedProfiles.single.baseCloudRevision, 0);
    expect(state.status, KeyboardSyncControllerStatus.ready);
  });

  test('cloud existing + clean local restores from cloud', () async {
    final cloudProfile = _profile(revision: 6, base: 5);
    final cloud = _FakeCloudStore(initialProfile: cloudProfile);
    final queue = _FakeQueue();
    KeyboardSyncProfile? applied;
    final controller = KeyboardSyncController(
      cloudStore: cloud,
      queue: queue,
      assetStore: _FakeAssetStore(),
      exportLocalProfile: () async => _profile(revision: 0, base: 0),
      applyLocalProfile: (profile) async => applied = profile,
      isLocalProfileClean: (_) => true,
    );

    final state = await controller.synchronize(_activeContext());

    expect(state.status, KeyboardSyncControllerStatus.ready);
    expect(applied?.checksum, cloudProfile.checksum);
  });

  test('divergent local/cloud enters conflict without overwrite', () async {
    final cloud = _FakeCloudStore(
      initialProfile: _profile(revision: 3, base: 2),
    );
    final queue = _FakeQueue();
    var applyCalls = 0;
    final controller = KeyboardSyncController(
      cloudStore: cloud,
      queue: queue,
      assetStore: _FakeAssetStore(),
      exportLocalProfile: () async =>
          _profile(revision: 3, base: 2, themeMode: 'light'),
      applyLocalProfile: (_) async => applyCalls += 1,
      isLocalProfileClean: (_) => false,
    );

    final state = await controller.synchronize(_activeContext());

    expect(state.status, KeyboardSyncControllerStatus.decisionNeeded);
    expect(state.decision, KeyboardSyncDecisionKind.conflict);
    expect(applyCalls, 0);
  });

  test('native customization metadata prevents silent cloud restore', () async {
    final cloud = _FakeCloudStore(
      initialProfile: _profile(revision: 2, base: 1),
    );
    final queue = _FakeQueue();
    var applyCalls = 0;
    final controller = KeyboardSyncController(
      cloudStore: cloud,
      queue: queue,
      assetStore: _FakeAssetStore(),
      exportLocalProfile: () async => _profile(
        revision: 0,
        base: 0,
        themeMode: 'light',
        hasNativeCustomizations: true,
      ),
      applyLocalProfile: (_) async => applyCalls += 1,
    );

    final state = await controller.synchronize(_activeContext());

    expect(state.status, KeyboardSyncControllerStatus.decisionNeeded);
    expect(state.decision, KeyboardSyncDecisionKind.conflict);
    expect(applyCalls, 0);
  });

  test('queue conflict during flush surfaces conflict decision', () async {
    final cloud = _FakeCloudStore(initialProfile: null);
    final queue = _FakeQueue(
      flushResult: KeyboardSyncQueueFlushResult(
        flushedCount: 0,
        failedCount: 1,
        conflict: const KeyboardSyncStoreConflictException(
          expectedBaseRevision: 0,
          actualCloudRevision: 4,
        ),
      ),
    );
    final controller = KeyboardSyncController(
      cloudStore: cloud,
      queue: queue,
      assetStore: _FakeAssetStore(),
      exportLocalProfile: () async => _profile(revision: 1, base: 0),
      applyLocalProfile: (_) async {},
    );

    final state = await controller.synchronize(_activeContext());

    expect(state.status, KeyboardSyncControllerStatus.decisionNeeded);
    expect(state.decision, KeyboardSyncDecisionKind.conflict);
    expect(state.issueCode, KeyboardSyncStoreErrorCode.conflict.name);
  });

  test('account switch purges old queue before syncing new account', () async {
    final cloud = _FakeCloudStore(initialProfile: null);
    final queue = _FakeQueue();
    final controller = KeyboardSyncController(
      cloudStore: cloud,
      queue: queue,
      assetStore: _FakeAssetStore(),
      exportLocalProfile: () async => _profile(revision: 1, base: 0),
      applyLocalProfile: (_) async {},
    );

    await controller.synchronize(
      const KeyboardSyncAuthContext(
        isSignedIn: true,
        isLocalFallback: false,
        hasEntitlement: true,
        firebaseUid: 'firebase-a',
        globalUserId: 'global-a',
      ),
    );
    await controller.synchronize(
      const KeyboardSyncAuthContext(
        isSignedIn: true,
        isLocalFallback: false,
        hasEntitlement: true,
        firebaseUid: 'firebase-b',
        globalUserId: 'global-b',
      ),
    );

    expect(queue.purgeCalls, hasLength(1));
    expect(queue.purgeCalls.single.$1, 'firebase-b');
    expect(queue.purgeCalls.single.$2, 'global-b');
  });

  test(
    'keepLocalProfile queues local profile against current cloud revision',
    () async {
      final cloud = _FakeCloudStore(
        initialProfile: _profile(revision: 4, base: 3),
      );
      final queue = _FakeQueue();
      final controller = KeyboardSyncController(
        cloudStore: cloud,
        queue: queue,
        assetStore: _FakeAssetStore(),
        exportLocalProfile: () async =>
            _profile(revision: 0, base: 0, hasNativeCustomizations: true),
        applyLocalProfile: (_) async {},
      );

      await controller.synchronize(_activeContext());
      final state = await controller.keepLocalProfile(_activeContext());

      expect(state.status, KeyboardSyncControllerStatus.ready);
      expect(queue.enqueuedProfiles.last.profileRevision, 5);
      expect(queue.baseCloudRevisions.last, 4);
    },
  );

  test('useCloudProfile applies cloud profile and clears queue', () async {
    final cloudProfile = _profile(revision: 4, base: 3);
    final cloud = _FakeCloudStore(initialProfile: cloudProfile);
    final queue = _FakeQueue();
    KeyboardSyncProfile? applied;
    final controller = KeyboardSyncController(
      cloudStore: cloud,
      queue: queue,
      assetStore: _FakeAssetStore(),
      exportLocalProfile: () async =>
          _profile(revision: 0, base: 0, hasNativeCustomizations: true),
      applyLocalProfile: (profile) async => applied = profile,
    );

    await controller.synchronize(_activeContext());
    final state = await controller.useCloudProfile(_activeContext());

    expect(state.status, KeyboardSyncControllerStatus.ready);
    expect(applied?.checksum, cloudProfile.checksum);
    expect(queue.clearCalls, 1);
  });
}

KeyboardSyncAuthContext _activeContext() {
  return const KeyboardSyncAuthContext(
    isSignedIn: true,
    isLocalFallback: false,
    hasEntitlement: true,
    firebaseUid: 'firebase-a',
    globalUserId: 'global-a',
  );
}

KeyboardSyncProfile _profile({
  required int revision,
  required int base,
  String themeMode = 'dark',
  bool hasNativeCustomizations = false,
}) {
  return KeyboardSyncProfile.sanitized(
    profileRevision: revision,
    baseCloudRevision: base,
    updatedAt: '2026-05-25T18:00:00Z',
    updatedByDeviceId: 'device-test',
    sourcePlatform: 'android',
    rawPayload: {
      'preferences': {'themeMode': themeMode},
      'metadata': {'hasNativeCustomizations': hasNativeCustomizations},
    },
  );
}

class _FakeCloudStore implements KeyboardSyncStore {
  _FakeCloudStore({this.initialProfile});

  final KeyboardSyncProfile? initialProfile;
  int loadCalls = 0;

  @override
  Future<KeyboardSyncProfile?> loadDefault() async {
    loadCalls += 1;
    return initialProfile;
  }

  @override
  Future<KeyboardSyncStoreSaveResult> saveDefault({
    required KeyboardSyncProfile profile,
    required int baseCloudRevision,
  }) async {
    return KeyboardSyncStoreSaveResult(
      profile: profile,
      cloudRevision: profile.profileRevision,
      applied: true,
    );
  }

  @override
  Stream<KeyboardSyncProfile?> watchDefault() {
    return const Stream<KeyboardSyncProfile?>.empty();
  }
}

class _FakeQueue implements KeyboardSyncQueue {
  _FakeQueue({KeyboardSyncQueueFlushResult? flushResult})
    : _flushResult =
          flushResult ??
          const KeyboardSyncQueueFlushResult(flushedCount: 0, failedCount: 0);

  final KeyboardSyncQueueFlushResult _flushResult;
  int flushCalls = 0;
  int clearCalls = 0;
  final List<KeyboardSyncProfile> enqueuedProfiles = <KeyboardSyncProfile>[];
  final List<int> baseCloudRevisions = <int>[];
  final List<(String, String)> purgeCalls = <(String, String)>[];

  @override
  Future<void> clear() async {
    clearCalls += 1;
  }

  @override
  Future<void> enqueueDefaultProfile({
    required String targetFirebaseUid,
    required String targetGlobalUserId,
    required KeyboardSyncProfile profile,
    required int baseCloudRevision,
    KeyboardSyncThemeAssetUploadRequest? themeAssetUpload,
  }) async {
    enqueuedProfiles.add(profile);
    baseCloudRevisions.add(baseCloudRevision);
  }

  @override
  Future<KeyboardSyncQueueFlushResult> flush({
    required String targetFirebaseUid,
    required String targetGlobalUserId,
  }) async {
    flushCalls += 1;
    return _flushResult;
  }

  @override
  Future<List<KeyboardSyncQueueEntry>> listEntries() async {
    return const <KeyboardSyncQueueEntry>[];
  }

  @override
  Future<List<KeyboardSyncQueueEntry>> listFlushReady({
    required String targetFirebaseUid,
    required String targetGlobalUserId,
  }) async {
    return const <KeyboardSyncQueueEntry>[];
  }

  @override
  Future<void> purgeForAccountChange({
    required String targetFirebaseUid,
    required String targetGlobalUserId,
  }) async {
    purgeCalls.add((targetFirebaseUid, targetGlobalUserId));
  }
}

class _FakeAssetStore implements KeyboardThemeAssetStore {
  @override
  Future<String> downloadThemeAsset({
    required String firebaseUid,
    required String globalUserId,
    required KeyboardThemeAssetManifest manifest,
  }) async {
    return '/tmp/${manifest.assetId}.png';
  }

  @override
  Future<KeyboardThemeAssetManifest> uploadThemeAsset({
    required String firebaseUid,
    required String globalUserId,
    required int profileRevision,
    required KeyboardSyncThemeAssetUploadRequest request,
  }) async {
    return KeyboardThemeAssetManifest(
      assetId: request.assetId,
      storagePath: 'users/$firebaseUid/keyboard_theme_assets/${request.assetId}',
      checksum: 'abc123abc123abc123abc123abc123abc123abc123abc123abc123abc123abcd',
      byteSize: 1024,
      mimeType: request.mimeType,
      profileRevision: profileRevision,
      createdAt: '2026-05-25T18:00:00Z',
      updatedAt: '2026-05-25T18:00:00Z',
    );
  }
}
