import '../data/local_cloud_sync_metadata_store.dart';
import '../domain/local_cloud_sync_models.dart';

abstract class LocalCloudSyncControllerAdapter {
  LocalCloudSyncDomain get domain;

  Future<LocalCloudDomainSnapshot> loadLocalSnapshot();

  Future<LocalCloudDomainSnapshot> loadCloudSnapshot();

  Future<void> seedCloudFromLocal(LocalCloudDomainSnapshot local);

  Future<void> hydrateLocalFromCloud(LocalCloudDomainSnapshot cloud);

  Future<void> mergeLocalIntoCloud({
    required LocalCloudDomainSnapshot local,
    required LocalCloudDomainSnapshot cloud,
    required List<Map<String, Object?>> mergedItems,
  });
}

class LocalCloudSyncController {
  LocalCloudSyncController({
    required Iterable<LocalCloudSyncControllerAdapter> adapters,
    required LocalCloudSyncMetadataStore metadataStore,
    DateTime Function()? clock,
  }) : _adapters = {for (final adapter in adapters) adapter.domain: adapter},
       _metadataStore = metadataStore,
       _clock = clock ?? DateTime.now,
       state = LocalCloudSyncState.initial();

  final Map<LocalCloudSyncDomain, LocalCloudSyncControllerAdapter> _adapters;
  final LocalCloudSyncMetadataStore _metadataStore;
  final DateTime Function() _clock;

  LocalCloudSyncState state;

  Future<LocalCloudSyncState> synchronize(
    LocalCloudSyncAuthContext authContext,
  ) async {
    final now = _clock().toUtc();
    if (!authContext.remoteSyncActive) {
      state = state.copyWith(
        status: LocalCloudSyncControllerStatus.idle,
        domains: {
          for (final domain in LocalCloudSyncDomain.values)
            domain: LocalCloudDomainStatus(
              domain: domain,
              state: LocalCloudSyncCategoryState.localOnly,
              decision: LocalCloudSyncDecisionKind.localOnlyNotPromotable,
              detail: 'Synchronisation cloud inactive.',
              localCount: 0,
              cloudCount: 0,
              pendingOperations: 0,
            ),
        },
        lastRunAt: now,
      );
      return state;
    }

    state = state.copyWith(
      status: LocalCloudSyncControllerStatus.syncing,
      lastRunAt: now,
    );

    final metadata = await _metadataStore.read();
    final sameRememberedAccount = _sameRememberedAccount(metadata, authContext);
    final hasDifferentRememberedAccount =
        metadata.rememberedFirebaseUid != null &&
        metadata.rememberedGlobalUserId != null &&
        !sameRememberedAccount;

    final statuses = <LocalCloudSyncDomain, LocalCloudDomainStatus>{};
    final nextChecksums = Map<String, String>.from(metadata.domainChecksums);

    for (final domain in LocalCloudSyncDomain.values) {
      final adapter = _adapters[domain];
      if (adapter == null) {
        statuses[domain] = LocalCloudDomainStatus.initial(domain);
        continue;
      }
      try {
        final status = await _synchronizeDomain(
          adapter: adapter,
          authContext: authContext,
          sameRememberedAccount: sameRememberedAccount,
          hasDifferentRememberedAccount: hasDifferentRememberedAccount,
        );
        statuses[domain] = status;
        if (status.state == LocalCloudSyncCategoryState.synced) {
          nextChecksums[domain.name] =
              '${status.localCount}:${status.cloudCount}:${status.decision.name}';
        }
      } catch (error) {
        statuses[domain] = LocalCloudDomainStatus(
          domain: domain,
          state: LocalCloudSyncCategoryState.failed,
          decision: LocalCloudSyncDecisionKind.pendingRetry,
          detail: 'Synchronisation indisponible. Réessaie plus tard.',
          localCount: 0,
          cloudCount: 0,
          pendingOperations: 1,
        );
      }
    }

    final hasBlockingStatus = statuses.values.any(
      (status) =>
          status.state == LocalCloudSyncCategoryState.failed ||
          status.state == LocalCloudSyncCategoryState.conflict ||
          status.state == LocalCloudSyncCategoryState.blocked ||
          status.pendingOperations > 0,
    );

    await _metadataStore.write(
      metadata.copyWith(
        rememberedFirebaseUid: authContext.firebaseUid,
        rememberedGlobalUserId: authContext.globalUserId,
        lastPromotedAtUtc: now,
        domainChecksums: nextChecksums,
      ),
    );

    state = LocalCloudSyncState(
      status: hasBlockingStatus
          ? LocalCloudSyncControllerStatus.failed
          : LocalCloudSyncControllerStatus.ready,
      domains: statuses,
      lastRunAt: now,
    );
    return state;
  }

  Future<LocalCloudDomainStatus> _synchronizeDomain({
    required LocalCloudSyncControllerAdapter adapter,
    required LocalCloudSyncAuthContext authContext,
    required bool sameRememberedAccount,
    required bool hasDifferentRememberedAccount,
  }) async {
    final local = await adapter.loadLocalSnapshot();
    if (!local.supportsPromotion) {
      return LocalCloudDomainStatus(
        domain: adapter.domain,
        state: LocalCloudSyncCategoryState.localOnly,
        decision: LocalCloudSyncDecisionKind.localOnlyNotPromotable,
        detail: 'Données locales non promouvables en V1.',
        localCount: local.count,
        cloudCount: 0,
        pendingOperations: 0,
      );
    }

    if (hasDifferentRememberedAccount && !authContext.signupFlow) {
      return LocalCloudDomainStatus(
        domain: adapter.domain,
        state: LocalCloudSyncCategoryState.blocked,
        decision: LocalCloudSyncDecisionKind.blockedDifferentAccount,
        detail:
            'Données locales associées à un autre compte. Confirmation requise.',
        localCount: local.count,
        cloudCount: 0,
        pendingOperations: 0,
      );
    }

    final cloud = await adapter.loadCloudSnapshot();
    if (local.isEmpty && cloud.isEmpty) {
      return _syncedStatus(
        adapter.domain,
        decision: LocalCloudSyncDecisionKind.none,
        localCount: 0,
        cloudCount: 0,
        detail: 'Aucune donnée à synchroniser.',
      );
    }

    if (!local.isEmpty && cloud.isEmpty) {
      final canSeed = authContext.signupFlow || sameRememberedAccount;
      if (!canSeed) {
        return LocalCloudDomainStatus(
          domain: adapter.domain,
          state: LocalCloudSyncCategoryState.blocked,
          decision: LocalCloudSyncDecisionKind.confirmationRequired,
          detail:
              'Compte cloud vide existant. Confirmation requise avant envoi local.',
          localCount: local.count,
          cloudCount: 0,
          pendingOperations: 0,
        );
      }
      await adapter.seedCloudFromLocal(local);
      return _syncedStatus(
        adapter.domain,
        decision: LocalCloudSyncDecisionKind.seedCloudFromLocal,
        localCount: local.count,
        cloudCount: local.count,
        detail: 'Données locales promues vers le cloud.',
      );
    }

    if (local.isEmpty && !cloud.isEmpty) {
      await adapter.hydrateLocalFromCloud(cloud);
      return _syncedStatus(
        adapter.domain,
        decision: LocalCloudSyncDecisionKind.hydrateLocalFromCloud,
        localCount: cloud.count,
        cloudCount: cloud.count,
        detail: 'Données cloud restaurées localement.',
      );
    }

    if (local.checksum == cloud.checksum) {
      return _syncedStatus(
        adapter.domain,
        decision: LocalCloudSyncDecisionKind.none,
        localCount: local.count,
        cloudCount: cloud.count,
        detail: 'Local et cloud déjà alignés.',
      );
    }

    final merge = _mergeSnapshots(local: local, cloud: cloud);
    if (merge.conflicts.isNotEmpty) {
      return LocalCloudDomainStatus(
        domain: adapter.domain,
        state: LocalCloudSyncCategoryState.conflict,
        decision: LocalCloudSyncDecisionKind.confirmationRequired,
        detail: 'Conflit local/cloud à résoudre dans Compte & cloud.',
        localCount: local.count,
        cloudCount: cloud.count,
        pendingOperations: 0,
        conflicts: merge.conflicts,
      );
    }

    await adapter.mergeLocalIntoCloud(
      local: local,
      cloud: cloud,
      mergedItems: merge.items,
    );
    return _syncedStatus(
      adapter.domain,
      decision: LocalCloudSyncDecisionKind.mergeLocalIntoCloud,
      localCount: merge.items.length,
      cloudCount: merge.items.length,
      detail: 'Données locales et cloud fusionnées.',
    );
  }

  LocalCloudDomainStatus _syncedStatus(
    LocalCloudSyncDomain domain, {
    required LocalCloudSyncDecisionKind decision,
    required int localCount,
    required int cloudCount,
    required String detail,
  }) {
    return LocalCloudDomainStatus(
      domain: domain,
      state: LocalCloudSyncCategoryState.synced,
      decision: decision,
      detail: detail,
      localCount: localCount,
      cloudCount: cloudCount,
      pendingOperations: 0,
      lastSyncedAt: _clock().toUtc(),
    );
  }

  static bool _sameRememberedAccount(
    LocalCloudSyncMetadata metadata,
    LocalCloudSyncAuthContext authContext,
  ) {
    return metadata.rememberedFirebaseUid == authContext.firebaseUid &&
        metadata.rememberedGlobalUserId == authContext.globalUserId;
  }
}

class _MergeResult {
  const _MergeResult({required this.items, required this.conflicts});

  final List<Map<String, Object?>> items;
  final List<LocalCloudDomainConflict> conflicts;
}

_MergeResult _mergeSnapshots({
  required LocalCloudDomainSnapshot local,
  required LocalCloudDomainSnapshot cloud,
}) {
  final byKey = <String, Map<String, Object?>>{};
  final conflicts = <LocalCloudDomainConflict>[];

  for (final item in cloud.items) {
    byKey[_syncKey(item)] = item;
  }

  for (final localItem in local.items) {
    final key = _syncKey(localItem);
    final cloudItem = byKey[key];
    if (cloudItem == null) {
      byKey[key] = localItem;
      continue;
    }
    if (LocalCloudDomainSnapshot.checksumFor([localItem]) ==
        LocalCloudDomainSnapshot.checksumFor([cloudItem])) {
      continue;
    }
    final resolved = _resolveByUpdatedAt(
      localItem: localItem,
      cloudItem: cloudItem,
    );
    if (resolved == null) {
      conflicts.add(
        LocalCloudDomainConflict(
          domain: local.domain,
          key: key,
          reason: 'Collision sur une clé métier avec contenu différent.',
        ),
      );
    } else {
      byKey[key] = resolved;
    }
  }

  return _MergeResult(
    items: byKey.values.toList(growable: false),
    conflicts: conflicts,
  );
}

String _syncKey(Map<String, Object?> item) {
  final raw = item['syncKey'] ?? item['key'] ?? item['id'];
  final value = raw?.toString().trim();
  if (value == null || value.isEmpty) {
    return LocalCloudDomainSnapshot.checksumFor([item]);
  }
  return value;
}

Map<String, Object?>? _resolveByUpdatedAt({
  required Map<String, Object?> localItem,
  required Map<String, Object?> cloudItem,
}) {
  final localUpdatedAt = _dateFromAny(localItem['updatedAt']);
  final cloudUpdatedAt = _dateFromAny(cloudItem['updatedAt']);
  final localDevice = localItem['deviceId']?.toString().trim();
  final cloudDevice = cloudItem['deviceId']?.toString().trim();
  if (localUpdatedAt == null ||
      cloudUpdatedAt == null ||
      localDevice == null ||
      localDevice.isEmpty ||
      cloudDevice == null ||
      cloudDevice.isEmpty) {
    return null;
  }
  return localUpdatedAt.isAfter(cloudUpdatedAt) ? localItem : cloudItem;
}

DateTime? _dateFromAny(Object? value) {
  if (value is DateTime) {
    return value.toUtc();
  }
  if (value is String) {
    return DateTime.tryParse(value)?.toUtc();
  }
  return null;
}
