import 'package:flutter_test/flutter_test.dart';
import 'package:commandglows_app/features/sync/application/local_cloud_sync_controller.dart';
import 'package:commandglows_app/features/sync/data/local_cloud_sync_metadata_store.dart';
import 'package:commandglows_app/features/sync/domain/local_cloud_sync_models.dart';

void main() {
  test('inactive remote context never touches cloud', () async {
    final adapter = _FakeAdapter(
      domain: LocalCloudSyncDomain.snippets,
      localItems: [_item('hello')],
    );
    final controller = _controller([adapter]);

    final state = await controller.synchronize(
      const LocalCloudSyncAuthContext(
        isSignedIn: false,
        isLocalFallback: true,
        hasEntitlement: false,
        firebaseUid: null,
        globalUserId: null,
      ),
    );

    expect(adapter.cloudLoadCalls, 0);
    expect(
      state.domains[LocalCloudSyncDomain.snippets]?.decision,
      LocalCloudSyncDecisionKind.localOnlyNotPromotable,
    );
  });

  test('signup flow seeds empty cloud from local data', () async {
    final adapter = _FakeAdapter(
      domain: LocalCloudSyncDomain.snippets,
      localItems: [_item('hello')],
    );
    final controller = _controller([adapter]);

    final state = await controller.synchronize(_active(signupFlow: true));

    expect(adapter.seedCalls, 1);
    expect(adapter.cloudItems, hasLength(1));
    expect(
      state.domains[LocalCloudSyncDomain.snippets]?.decision,
      LocalCloudSyncDecisionKind.seedCloudFromLocal,
    );
    expect(
      state.domains[LocalCloudSyncDomain.snippets]?.state,
      LocalCloudSyncCategoryState.synced,
    );
  });

  test(
    'existing empty cloud requires confirmation for unassociated local data',
    () async {
      final adapter = _FakeAdapter(
        domain: LocalCloudSyncDomain.snippets,
        localItems: [_item('hello')],
      );
      final controller = _controller([adapter]);

      final state = await controller.synchronize(_active());

      expect(adapter.seedCalls, 0);
      expect(
        state.domains[LocalCloudSyncDomain.snippets]?.decision,
        LocalCloudSyncDecisionKind.confirmationRequired,
      );
      expect(
        state.domains[LocalCloudSyncDomain.snippets]?.state,
        LocalCloudSyncCategoryState.blocked,
      );
    },
  );

  test(
    'same remembered account can seed empty cloud from local data',
    () async {
      final adapter = _FakeAdapter(
        domain: LocalCloudSyncDomain.dictionary,
        localItems: [_item('term')],
      );
      final metadataStore = LocalCloudSyncMetadataStore(
        persistence: _MemoryMetadataPersistence(),
      );
      await metadataStore.write(
        const LocalCloudSyncMetadata(
          rememberedFirebaseUid: 'firebase-a',
          rememberedGlobalUserId: 'global-a',
        ),
      );
      final controller = _controller([adapter], metadataStore: metadataStore);

      final state = await controller.synchronize(_active());

      expect(adapter.seedCalls, 1);
      expect(
        state.domains[LocalCloudSyncDomain.dictionary]?.decision,
        LocalCloudSyncDecisionKind.seedCloudFromLocal,
      );
    },
  );

  test('different remembered account blocks replay into new account', () async {
    final adapter = _FakeAdapter(
      domain: LocalCloudSyncDomain.clipboard,
      localItems: [_item('clip')],
    );
    final metadataStore = LocalCloudSyncMetadataStore(
      persistence: _MemoryMetadataPersistence(),
    );
    await metadataStore.write(
      const LocalCloudSyncMetadata(
        rememberedFirebaseUid: 'firebase-old',
        rememberedGlobalUserId: 'global-old',
      ),
    );
    final controller = _controller([adapter], metadataStore: metadataStore);

    final state = await controller.synchronize(_active());

    expect(adapter.cloudLoadCalls, 0);
    expect(
      state.domains[LocalCloudSyncDomain.clipboard]?.decision,
      LocalCloudSyncDecisionKind.blockedDifferentAccount,
    );
  });

  test('clean local hydrates from existing cloud', () async {
    final adapter = _FakeAdapter(
      domain: LocalCloudSyncDomain.settings,
      cloudItems: [_item('settings')],
    );
    final controller = _controller([adapter]);

    final state = await controller.synchronize(_active());

    expect(adapter.hydrateCalls, 1);
    expect(adapter.localItems, hasLength(1));
    expect(
      state.domains[LocalCloudSyncDomain.settings]?.decision,
      LocalCloudSyncDecisionKind.hydrateLocalFromCloud,
    );
  });

  test('non-conflicting local and cloud snapshots merge', () async {
    final adapter = _FakeAdapter(
      domain: LocalCloudSyncDomain.snippets,
      localItems: [_item('local')],
      cloudItems: [_item('cloud')],
    );
    final controller = _controller([adapter]);

    final state = await controller.synchronize(_active(signupFlow: true));

    expect(adapter.mergeCalls, 1);
    expect(adapter.cloudItems.map((item) => item['syncKey']), {
      'local',
      'cloud',
    });
    expect(
      state.domains[LocalCloudSyncDomain.snippets]?.decision,
      LocalCloudSyncDecisionKind.mergeLocalIntoCloud,
    );
  });

  test('same business key with different payload becomes conflict', () async {
    final adapter = _FakeAdapter(
      domain: LocalCloudSyncDomain.snippets,
      localItems: [_item('trigger', value: 'local content')],
      cloudItems: [_item('trigger', value: 'cloud content')],
    );
    final controller = _controller([adapter]);

    final state = await controller.synchronize(_active(signupFlow: true));
    final status = state.domains[LocalCloudSyncDomain.snippets];

    expect(adapter.mergeCalls, 0);
    expect(status?.state, LocalCloudSyncCategoryState.conflict);
    expect(status?.conflicts, hasLength(1));
  });

  test(
    'latest wins only when both entries have device and updatedAt metadata',
    () async {
      final adapter = _FakeAdapter(
        domain: LocalCloudSyncDomain.clipboard,
        localItems: [
          _item(
            'clip',
            value: 'new',
            updatedAt: DateTime.utc(2026, 5, 30, 12),
            deviceId: 'device-a',
          ),
        ],
        cloudItems: [
          _item(
            'clip',
            value: 'old',
            updatedAt: DateTime.utc(2026, 5, 30, 11),
            deviceId: 'device-b',
          ),
        ],
      );
      final controller = _controller([adapter]);

      final state = await controller.synchronize(_active(signupFlow: true));

      expect(
        state.domains[LocalCloudSyncDomain.clipboard]?.state,
        LocalCloudSyncCategoryState.synced,
      );
      expect(adapter.cloudItems.single['value'], 'new');
    },
  );

  test('non-promotable local domain stays local only', () async {
    final adapter = _FakeAdapter(
      domain: LocalCloudSyncDomain.voice,
      localItems: [_item('voice')],
      supportsPromotion: false,
    );
    final controller = _controller([adapter]);

    final state = await controller.synchronize(_active(signupFlow: true));

    expect(adapter.cloudLoadCalls, 0);
    expect(
      state.domains[LocalCloudSyncDomain.voice]?.decision,
      LocalCloudSyncDecisionKind.localOnlyNotPromotable,
    );
  });

  test('metadata store round-trips wrapped payload', () async {
    final persistence = _MemoryMetadataPersistence();
    final store = LocalCloudSyncMetadataStore(persistence: persistence);

    await store.write(
      const LocalCloudSyncMetadata(
        rememberedFirebaseUid: 'firebase-a',
        rememberedGlobalUserId: 'global-a',
      ),
    );

    final reloaded = await LocalCloudSyncMetadataStore(
      persistence: persistence,
    ).read();

    expect(reloaded.rememberedFirebaseUid, 'firebase-a');
    expect(reloaded.rememberedGlobalUserId, 'global-a');
  });
}

LocalCloudSyncController _controller(
  List<LocalCloudSyncControllerAdapter> adapters, {
  LocalCloudSyncMetadataStore? metadataStore,
}) {
  return LocalCloudSyncController(
    adapters: adapters,
    metadataStore:
        metadataStore ??
        LocalCloudSyncMetadataStore(persistence: _MemoryMetadataPersistence()),
    clock: () => DateTime.utc(2026, 5, 30, 12),
  );
}

LocalCloudSyncAuthContext _active({bool signupFlow = false}) {
  return LocalCloudSyncAuthContext(
    isSignedIn: true,
    isLocalFallback: false,
    hasEntitlement: true,
    firebaseUid: 'firebase-a',
    globalUserId: 'global-a',
    signupFlow: signupFlow,
  );
}

Map<String, Object?> _item(
  String key, {
  String value = 'value',
  DateTime? updatedAt,
  String? deviceId,
}) {
  return {
    'syncKey': key,
    'value': value,
    if (updatedAt != null) 'updatedAt': updatedAt.toIso8601String(),
    ...deviceId == null ? const <String, Object?>{} : {'deviceId': deviceId},
  };
}

class _FakeAdapter implements LocalCloudSyncControllerAdapter {
  _FakeAdapter({
    required this.domain,
    List<Map<String, Object?>> localItems = const <Map<String, Object?>>[],
    List<Map<String, Object?>> cloudItems = const <Map<String, Object?>>[],
    this.supportsPromotion = true,
  }) : localItems = List<Map<String, Object?>>.from(localItems),
       cloudItems = List<Map<String, Object?>>.from(cloudItems);

  @override
  final LocalCloudSyncDomain domain;
  final bool supportsPromotion;
  List<Map<String, Object?>> localItems;
  List<Map<String, Object?>> cloudItems;
  int cloudLoadCalls = 0;
  int seedCalls = 0;
  int hydrateCalls = 0;
  int mergeCalls = 0;

  @override
  Future<LocalCloudDomainSnapshot> loadLocalSnapshot() async {
    return _snapshot(localItems);
  }

  @override
  Future<LocalCloudDomainSnapshot> loadCloudSnapshot() async {
    cloudLoadCalls += 1;
    return _snapshot(cloudItems);
  }

  @override
  Future<void> seedCloudFromLocal(LocalCloudDomainSnapshot local) async {
    seedCalls += 1;
    cloudItems = List<Map<String, Object?>>.from(local.items);
  }

  @override
  Future<void> hydrateLocalFromCloud(LocalCloudDomainSnapshot cloud) async {
    hydrateCalls += 1;
    localItems = List<Map<String, Object?>>.from(cloud.items);
  }

  @override
  Future<void> mergeLocalIntoCloud({
    required LocalCloudDomainSnapshot local,
    required LocalCloudDomainSnapshot cloud,
    required List<Map<String, Object?>> mergedItems,
  }) async {
    mergeCalls += 1;
    cloudItems = List<Map<String, Object?>>.from(mergedItems);
    localItems = List<Map<String, Object?>>.from(mergedItems);
  }

  LocalCloudDomainSnapshot _snapshot(List<Map<String, Object?>> items) {
    return LocalCloudDomainSnapshot(
      domain: domain,
      supportsPromotion: supportsPromotion,
      items: items,
      checksum: LocalCloudDomainSnapshot.checksumFor(items),
    );
  }
}

class _MemoryMetadataPersistence implements LocalCloudSyncMetadataPersistence {
  String? value;

  @override
  Future<void> clear() async {
    value = null;
  }

  @override
  Future<String?> read() async => value;

  @override
  Future<void> write(String value) async {
    this.value = value;
  }
}
