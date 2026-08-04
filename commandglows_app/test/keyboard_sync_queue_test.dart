import 'package:flutter_test/flutter_test.dart';
import 'package:commandglows_app/features/keyboard/application/keyboard_sync_queue.dart';
import 'package:commandglows_app/features/keyboard/data/firebase_keyboard_theme_asset_store.dart';
import 'package:commandglows_app/features/keyboard/data/local_keyboard_sync_queue_store.dart';
import 'package:commandglows_app/features/keyboard/domain/keyboard_sync_models.dart';
import 'package:commandglows_app/features/keyboard/domain/keyboard_sync_store.dart';

void main() {
  test('deduplicates by keyboardProfile:default operation key', () async {
    final store = LocalKeyboardSyncQueueStore(
      persistence: _MemoryQueuePersistence(),
      clock: _fixedClock,
    );
    final cloud = _FakeKeyboardSyncStore();
    final queue = DurableKeyboardSyncQueue(
      cloudStore: cloud,
      assetStore: _FakeAssetStore(),
      queueStore: store,
      clock: _fixedClock,
    );

    await queue.enqueueDefaultProfile(
      targetFirebaseUid: 'firebase-a',
      targetGlobalUserId: 'global-a',
      profile: _profile(revision: 1, base: 0),
      baseCloudRevision: 0,
    );
    await queue.enqueueDefaultProfile(
      targetFirebaseUid: 'firebase-a',
      targetGlobalUserId: 'global-a',
      profile: _profile(revision: 2, base: 1),
      baseCloudRevision: 1,
    );

    final entries = await queue.listEntries();
    expect(entries, hasLength(1));
    expect(
      entries.single.operationKey,
      DurableKeyboardSyncQueue.defaultOperationKey,
    );
    expect(entries.single.profile.profileRevision, 2);
    expect(entries.single.baseCloudRevision, 1);
  });

  test('purges stale account queue entries on account change', () async {
    final store = LocalKeyboardSyncQueueStore(
      persistence: _MemoryQueuePersistence(),
      clock: _fixedClock,
    );
    final queue = DurableKeyboardSyncQueue(
      cloudStore: _FakeKeyboardSyncStore(),
      assetStore: _FakeAssetStore(),
      queueStore: store,
      clock: _fixedClock,
    );

    await queue.enqueueDefaultProfile(
      targetFirebaseUid: 'firebase-a',
      targetGlobalUserId: 'global-a',
      profile: _profile(revision: 1, base: 0),
      baseCloudRevision: 0,
    );
    await queue.purgeForAccountChange(
      targetFirebaseUid: 'firebase-b',
      targetGlobalUserId: 'global-b',
    );

    final entries = await queue.listEntries();
    expect(entries, isEmpty);
  });

  test('flush persists to cloud and clears queue on success', () async {
    final store = LocalKeyboardSyncQueueStore(
      persistence: _MemoryQueuePersistence(),
      clock: _fixedClock,
    );
    final cloud = _FakeKeyboardSyncStore(initialCloudRevision: 0);
    final queue = DurableKeyboardSyncQueue(
      cloudStore: cloud,
      assetStore: _FakeAssetStore(),
      queueStore: store,
      clock: _fixedClock,
    );

    await queue.enqueueDefaultProfile(
      targetFirebaseUid: 'firebase-a',
      targetGlobalUserId: 'global-a',
      profile: _profile(revision: 1, base: 0),
      baseCloudRevision: 0,
    );
    final result = await queue.flush(
      targetFirebaseUid: 'firebase-a',
      targetGlobalUserId: 'global-a',
    );

    expect(result.flushedCount, 1);
    expect(result.failedCount, 0);
    expect(await queue.listEntries(), isEmpty);
    expect(cloud.savedProfiles, hasLength(1));
  });

  test('flush marks entry failed when base cloud revision changed', () async {
    final store = LocalKeyboardSyncQueueStore(
      persistence: _MemoryQueuePersistence(),
      clock: _fixedClock,
    );
    final cloud = _FakeKeyboardSyncStore(initialCloudRevision: 5);
    final queue = DurableKeyboardSyncQueue(
      cloudStore: cloud,
      assetStore: _FakeAssetStore(),
      queueStore: store,
      clock: _fixedClock,
    );

    await queue.enqueueDefaultProfile(
      targetFirebaseUid: 'firebase-a',
      targetGlobalUserId: 'global-a',
      profile: _profile(revision: 6, base: 4),
      baseCloudRevision: 4,
    );

    final result = await queue.flush(
      targetFirebaseUid: 'firebase-a',
      targetGlobalUserId: 'global-a',
    );

    expect(result.hasConflict, isTrue);
    expect(result.failedCount, 1);
    final entries = await queue.listEntries();
    expect(entries, hasLength(1));
    expect(entries.single.state, KeyboardSyncQueueEntryState.failed);
    expect(entries.single.attempts, 1);
  });
}

DateTime _fixedClock() => DateTime.utc(2026, 5, 25, 17, 0);

KeyboardSyncProfile _profile({required int revision, required int base}) {
  return KeyboardSyncProfile.sanitized(
    profileRevision: revision,
    baseCloudRevision: base,
    updatedAt: '2026-05-25T17:00:00Z',
    updatedByDeviceId: 'device-test',
    sourcePlatform: 'android',
    rawPayload: {
      'preferences': {'themeMode': 'dark'},
      'metadata': {'source': 'test'},
    },
  );
}

class _MemoryQueuePersistence implements KeyboardSyncQueuePersistence {
  String? _value;

  @override
  Future<void> clear() async {
    _value = null;
  }

  @override
  Future<String?> read() async {
    return _value;
  }

  @override
  Future<void> write(String value) async {
    _value = value;
  }
}

class _FakeKeyboardSyncStore implements KeyboardSyncStore {
  _FakeKeyboardSyncStore({int initialCloudRevision = 0})
    : _cloudRevision = initialCloudRevision;

  int _cloudRevision;
  KeyboardSyncProfile? _cloudProfile;
  final List<KeyboardSyncProfile> savedProfiles = <KeyboardSyncProfile>[];

  @override
  Future<KeyboardSyncProfile?> loadDefault() async {
    return _cloudProfile;
  }

  @override
  Future<KeyboardSyncStoreSaveResult> saveDefault({
    required KeyboardSyncProfile profile,
    required int baseCloudRevision,
  }) async {
    if (_cloudProfile != null &&
        _cloudProfile!.profileRevision == profile.profileRevision &&
        _cloudProfile!.checksum == profile.checksum) {
      return KeyboardSyncStoreSaveResult(
        profile: _cloudProfile!,
        cloudRevision: _cloudRevision,
        applied: false,
      );
    }
    if (baseCloudRevision != _cloudRevision) {
      throw KeyboardSyncStoreConflictException(
        expectedBaseRevision: baseCloudRevision,
        actualCloudRevision: _cloudRevision,
        currentProfile: _cloudProfile,
        incomingProfile: profile,
      );
    }
    _cloudProfile = profile;
    _cloudRevision = profile.profileRevision;
    savedProfiles.add(profile);
    return KeyboardSyncStoreSaveResult(
      profile: profile,
      cloudRevision: _cloudRevision,
      applied: true,
    );
  }

  @override
  Stream<KeyboardSyncProfile?> watchDefault() {
    return const Stream<KeyboardSyncProfile?>.empty();
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
      createdAt: '2026-05-25T17:00:00Z',
      updatedAt: '2026-05-25T17:00:00Z',
    );
  }
}
