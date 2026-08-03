import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:winglowz_app/features/voice/application/language_pack_catalog_provider.dart';
import 'package:winglowz_app/features/voice/data/language_pack_state_repository.dart';
import 'package:winglowz_app/features/voice/domain/language_pack_catalog.dart';

void main() {
  test('LanguagePackCatalogEntry round-trips stable data contract fields', () {
    final entry = LanguagePackCatalogEntry.fromMap(_validLocalPack());

    expect(entry.packId, 'sherpa_onnx.fr-fr.whisper.2026_05_15');
    expect(entry.engine, LanguagePackEngine.sherpaOnnx);
    expect(entry.qualityTier, LanguagePackQualityTier.experimental);
    expect(entry.runtimeMode, LanguagePackRuntimeMode.local);
    expect(entry.toMap(), containsPair('fallback_policy', 'prefer_local'));
  });

  test('invalid catalog entry is rejected as catalog_invalid_entry', () {
    final invalid = _validLocalPack()..remove('signature');

    expect(
      () => LanguagePackCatalogEntry.fromMap(invalid),
      throwsA(
        isA<CatalogValidationException>().having(
          (error) => error.code,
          'code',
          'catalog_invalid_entry',
        ),
      ),
    );
  });

  test(
    'recommended pack requires commercial license and benchmark evidence',
    () {
      final invalid = _validLocalPack()
        ..['quality_tier'] = 'recommended'
        ..['benchmark_status'] = 'passed'
        ..['benchmark_evidence'] = 'shipglows_data/workflow/benchmarks/fr.md';

      expect(
        () => LanguagePackCatalogEntry.fromMap(invalid),
        throwsA(isA<CatalogValidationException>()),
      );
    },
  );

  test(
    'storage policy blocks packs above capacity or free-space threshold',
    () {
      final entry = LanguagePackCatalogEntry.fromMap(_validLocalPack());
      final decision = LanguagePackStoragePolicy.evaluate(
        entry: entry,
        totalCapacityMb: 4096,
        freeSpaceMb: 512,
      );

      expect(decision.allowed, isFalse);
      expect(decision.reason, LanguagePackFallbackReason.insufficientStorage);
      expect(decision.requiredMb, 1684);
      expect(decision.availableMb, 512);
    },
  );

  test('install preflight blocks unsupported ABI before queueing', () {
    final entry = LanguagePackCatalogEntry.fromMap(_validLocalPack());
    final decision = LanguagePackInstallPreflight.evaluate(
      entry: entry,
      device: const LanguagePackDeviceProfile(
        androidSdk: 35,
        primaryAbi: 'armeabi-v7a',
        totalCapacityMb: 65536,
        freeSpaceMb: 8192,
        ramMb: 6144,
      ),
    );

    expect(decision.allowed, isFalse);
    expect(
      decision.installState,
      InstalledLanguagePackState.blockedIncompatibleDevice,
    );
    expect(decision.reason, LanguagePackFallbackReason.incompatibleDevice);
    expect(decision.errorCode, 'blocked_unsupported_abi');
  });

  test(
    'install preflight allows compatible device with sufficient storage',
    () {
      final entry = LanguagePackCatalogEntry.fromMap(_validLocalPack());
      final decision = LanguagePackInstallPreflight.evaluate(
        entry: entry,
        device: const LanguagePackDeviceProfile(
          androidSdk: 35,
          primaryAbi: 'arm64-v8a',
          totalCapacityMb: 65536,
          freeSpaceMb: 8192,
          ramMb: 6144,
        ),
      );

      expect(decision.allowed, isTrue);
      expect(decision.installState, InstalledLanguagePackState.queued);
      expect(decision.requiredMb, 1684);
      expect(decision.availableMb, 8192);
    },
  );

  test('catalog provider defaults cloud fallback to explicit opt-in', () {
    final container = _newContainer();
    addTearDown(container.dispose);

    final state = container.read(languagePackCatalogProvider);

    expect(state.loadState, LanguagePackCatalogLoadState.success);
    expect(state.allowCloudFallback, isFalse);
    expect(state.catalog.entries, isNotEmpty);
  });

  test('install state machine does not mark installed before verification', () {
    final container = _newContainer();
    addTearDown(container.dispose);

    final notifier = container.read(languagePackCatalogProvider.notifier);
    final entry = _firstInstallableEntry(container);

    notifier.markInstalled(entry);
    expect(
      container
          .read(languagePackCatalogProvider)
          .installedStateFor(entry)
          .installState,
      InstalledLanguagePackState.notInstalled,
    );

    notifier.queueInstall(entry);
    notifier.startDownload(entry);
    notifier.updateDownloadProgress(entry, 99);
    notifier.markInstalled(entry);
    expect(
      container
          .read(languagePackCatalogProvider)
          .installedStateFor(entry)
          .installState,
      InstalledLanguagePackState.downloading,
    );

    notifier.updateDownloadProgress(entry, 100);
    expect(
      container
          .read(languagePackCatalogProvider)
          .installedStateFor(entry)
          .installState,
      InstalledLanguagePackState.verifying,
    );
    notifier.markInstalled(entry);

    final installed = container
        .read(languagePackCatalogProvider)
        .installedStateFor(entry);
    expect(installed.installState, InstalledLanguagePackState.installed);
    expect(installed.runtimeMode, LanguagePackRuntimeMode.local);
    expect(installed.checksumVerified, isTrue);
  });

  test('queue install is idempotent for in-flight installs', () {
    final container = _newContainer();
    addTearDown(container.dispose);

    final notifier = container.read(languagePackCatalogProvider.notifier);
    final entry = _firstInstallableEntry(container);

    notifier.queueInstall(entry);
    final first = container
        .read(languagePackCatalogProvider)
        .installedStateFor(entry);
    notifier.queueInstall(entry);
    final second = container
        .read(languagePackCatalogProvider)
        .installedStateFor(entry);

    expect(first.installState, InstalledLanguagePackState.queued);
    expect(second.installState, InstalledLanguagePackState.queued);
    expect(second.downloadProgress, first.downloadProgress);
  });

  test('provider preflight blocks incompatible device without downloading', () {
    final container = _newContainer();
    addTearDown(container.dispose);

    final notifier = container.read(languagePackCatalogProvider.notifier);
    final entry = _firstInstallableEntry(container);

    final queued = notifier.queueInstallAfterPreflight(
      entry: entry,
      device: const LanguagePackDeviceProfile(
        androidSdk: 25,
        primaryAbi: 'arm64-v8a',
        totalCapacityMb: 65536,
        freeSpaceMb: 8192,
        ramMb: 6144,
      ),
    );

    final installed = container
        .read(languagePackCatalogProvider)
        .installedStateFor(entry);
    expect(queued, isFalse);
    expect(
      installed.installState,
      InstalledLanguagePackState.blockedIncompatibleDevice,
    );
    expect(
      installed.fallbackReason,
      LanguagePackFallbackReason.incompatibleDevice,
    );
    expect(installed.lastErrorCode, 'blocked_min_android_sdk');
  });

  test('provider preflight queues compatible installs with required space', () {
    final container = _newContainer();
    addTearDown(container.dispose);

    final notifier = container.read(languagePackCatalogProvider.notifier);
    final entry = _firstInstallableEntry(container);

    final queued = notifier.queueInstallAfterPreflight(
      entry: entry,
      device: const LanguagePackDeviceProfile(
        androidSdk: 35,
        primaryAbi: 'arm64-v8a',
        totalCapacityMb: 65536,
        freeSpaceMb: 8192,
        ramMb: 6144,
      ),
    );

    final installed = container
        .read(languagePackCatalogProvider)
        .installedStateFor(entry);
    expect(queued, isTrue);
    expect(installed.installState, InstalledLanguagePackState.queued);
    expect(installed.requiredMb, 1684);
    expect(installed.availableMb, 8192);
  });

  test('retry limit is capped at three attempts', () {
    final container = _newContainer();
    addTearDown(container.dispose);

    final notifier = container.read(languagePackCatalogProvider.notifier);
    final entry = _firstInstallableEntry(container);

    notifier.queueInstall(entry);
    notifier.startDownload(entry);
    notifier.failDownload(entry);

    expect(notifier.retryInstall(entry), isTrue);
    notifier.startDownload(entry);
    notifier.failDownload(entry);
    expect(notifier.retryInstall(entry), isTrue);
    notifier.startDownload(entry);
    notifier.failDownload(entry);
    expect(notifier.retryInstall(entry), isTrue);
    notifier.startDownload(entry);
    notifier.failDownload(entry);
    expect(notifier.retryInstall(entry), isFalse);

    final state = container.read(languagePackCatalogProvider);
    expect(state.retryCounts[entry.packId], 3);
    expect(state.installedStateFor(entry).lastErrorCode, 'retry_limit_reached');
  });

  test('local state serializes installed packs and cloud fallback', () {
    final entry = LanguagePackCatalogEntry.fromMap(_validLocalPack());
    final installed = InstalledLanguagePack.notInstalled(entry).copyWith(
      installState: InstalledLanguagePackState.installed,
      runtimeMode: LanguagePackRuntimeMode.local,
      fallbackReason: LanguagePackFallbackReason.none,
      downloadProgress: 100,
      installedSizeMb: entry.installedSizeMb,
      checksumVerified: true,
      installedAt: DateTime.utc(2026, 5, 17, 12),
      lastVerifiedAt: DateTime.utc(2026, 5, 17, 12),
      lastErrorCode: 'none',
    );
    final localState = LanguagePackCatalogLocalState(
      installedPacks: {entry.packId: installed},
      retryCounts: {entry.packId: 2},
      allowCloudFallback: true,
    );

    final restored = LanguagePackCatalogLocalState.fromMap(localState.toMap());

    expect(restored.allowCloudFallback, isTrue);
    expect(restored.retryCounts[entry.packId], 2);
    expect(
      restored.installedPacks[entry.packId]?.installState,
      InstalledLanguagePackState.installed,
    );
    expect(restored.installedPacks[entry.packId]?.checksumVerified, isTrue);
  });

  test(
    'state repository persists installed packs and cloud fallback',
    () async {
      final repository = InMemoryLanguagePackCatalogStateRepository();

      final firstContainer = ProviderContainer(
        overrides: [
          languagePackCatalogStateRepositoryProvider.overrideWithValue(
            repository,
          ),
        ],
      );
      final entry = _firstInstallableEntry(firstContainer);
      final firstNotifier = firstContainer.read(
        languagePackCatalogProvider.notifier,
      );

      firstNotifier.setAllowCloudFallback(true);
      firstNotifier.queueInstall(entry);
      firstNotifier.startDownload(entry);
      firstNotifier.updateDownloadProgress(entry, 100);
      firstNotifier.markInstalled(entry);
      await Future<void>.delayed(Duration.zero);
      firstContainer.dispose();

      final secondContainer = ProviderContainer(
        overrides: [
          languagePackCatalogStateRepositoryProvider.overrideWithValue(
            repository,
          ),
        ],
      );
      addTearDown(secondContainer.dispose);
      await secondContainer
          .read(languagePackCatalogProvider.notifier)
          .hydratePersistedState();
      final secondState = secondContainer.read(languagePackCatalogProvider);
      final installed = secondState.installedStateFor(entry);

      expect(secondState.allowCloudFallback, isTrue);
      expect(installed.installState, InstalledLanguagePackState.installed);
      expect(installed.checksumVerified, isTrue);
    },
  );

  test(
    'install orchestration reaches installed on compatible device',
    () async {
      final container = _newContainer();
      addTearDown(container.dispose);

      final notifier = container.read(languagePackCatalogProvider.notifier);
      final entry = _firstInstallableEntry(container);
      final installed = await notifier.installPackWithPreflight(
        entry: entry,
        device: const LanguagePackDeviceProfile(
          androidSdk: 35,
          primaryAbi: 'arm64-v8a',
          totalCapacityMb: 65536,
          freeSpaceMb: 8192,
          ramMb: 6144,
        ),
      );

      final state = container
          .read(languagePackCatalogProvider)
          .installedStateFor(entry);
      expect(installed, isTrue);
      expect(state.installState, InstalledLanguagePackState.installed);
      expect(state.downloadProgress, 100);
      expect(state.checksumVerified, isTrue);
      expect(state.modelArtifactPath, startsWith('/data/user/0/'));
    },
  );

  test(
    'explicit fallback selects unavailable when cloud is off and no android path',
    () {
      final container = _newContainer();
      addTearDown(container.dispose);

      final notifier = container.read(languagePackCatalogProvider.notifier);
      final applied = notifier.setExplicitFallbackForLanguage('fr-FR');
      final entry = _firstInstallableEntry(container);
      final state = container
          .read(languagePackCatalogProvider)
          .installedStateFor(entry);

      expect(applied, isTrue);
      expect(state.runtimeMode, LanguagePackRuntimeMode.unavailable);
      expect(
        state.fallbackReason,
        LanguagePackFallbackReason.userDisabledCloud,
      );
    },
  );

  test('explicit fallback selects cloud_fallback when cloud is allowed', () {
    final container = _newContainer();
    addTearDown(container.dispose);

    final notifier = container.read(languagePackCatalogProvider.notifier);
    notifier.setAllowCloudFallback(true);
    final applied = notifier.setExplicitFallbackForLanguage('fr-FR');
    final entry = _firstInstallableEntry(container);
    final state = container
        .read(languagePackCatalogProvider)
        .installedStateFor(entry);

    expect(applied, isTrue);
    expect(state.runtimeMode, LanguagePackRuntimeMode.cloudFallback);
    expect(state.fallbackReason, LanguagePackFallbackReason.cloudAutoPolicy);
  });

  test('mark update then corrupted transitions from installed pack', () async {
    final container = _newContainer();
    addTearDown(container.dispose);

    final notifier = container.read(languagePackCatalogProvider.notifier);
    final entry = _firstInstallableEntry(container);
    await notifier.installPackWithPreflight(
      entry: entry,
      device: const LanguagePackDeviceProfile(
        androidSdk: 35,
        primaryAbi: 'arm64-v8a',
        totalCapacityMb: 65536,
        freeSpaceMb: 8192,
        ramMb: 6144,
      ),
    );

    final updated = notifier.markUpdateAvailable(entry);
    expect(updated, isTrue);
    expect(
      container
          .read(languagePackCatalogProvider)
          .installedStateFor(entry)
          .installState,
      InstalledLanguagePackState.updateAvailable,
    );

    final corrupted = notifier.markCorrupted(entry);
    final state = container
        .read(languagePackCatalogProvider)
        .installedStateFor(entry);
    expect(corrupted, isTrue);
    expect(state.installState, InstalledLanguagePackState.corrupted);
    expect(state.runtimeMode, LanguagePackRuntimeMode.unavailable);
  });

  test('retry can recover from corrupted state', () async {
    final container = _newContainer();
    addTearDown(container.dispose);

    final notifier = container.read(languagePackCatalogProvider.notifier);
    final entry = _firstInstallableEntry(container);
    await notifier.installPackWithPreflight(
      entry: entry,
      device: const LanguagePackDeviceProfile(
        androidSdk: 35,
        primaryAbi: 'arm64-v8a',
        totalCapacityMb: 65536,
        freeSpaceMb: 8192,
        ramMb: 6144,
      ),
    );
    notifier.markCorrupted(entry);

    final retried = await notifier.retryInstallWithPreflight(
      entry: entry,
      device: const LanguagePackDeviceProfile(
        androidSdk: 35,
        primaryAbi: 'arm64-v8a',
        totalCapacityMb: 65536,
        freeSpaceMb: 8192,
        ramMb: 6144,
      ),
    );
    final state = container
        .read(languagePackCatalogProvider)
        .installedStateFor(entry);

    expect(retried, isTrue);
    expect(state.installState, InstalledLanguagePackState.installed);
    expect(
      container.read(languagePackCatalogProvider).retryCounts[entry.packId],
      1,
    );
  });

  test('remove is a no-op for packs already absent or removed', () async {
    final container = _newContainer();
    addTearDown(container.dispose);

    final notifier = container.read(languagePackCatalogProvider.notifier);
    final entry = _firstInstallableEntry(container);

    expect(notifier.remove(entry), isFalse);

    await notifier.installPackWithPreflight(
      entry: entry,
      device: const LanguagePackDeviceProfile(
        androidSdk: 35,
        primaryAbi: 'arm64-v8a',
        totalCapacityMb: 65536,
        freeSpaceMb: 8192,
        ramMb: 6144,
      ),
    );
    expect(notifier.remove(entry), isTrue);
    expect(
      container
          .read(languagePackCatalogProvider)
          .installedStateFor(entry)
          .installState,
      InstalledLanguagePackState.removed,
    );
    expect(notifier.remove(entry), isFalse);
  });

  test('native runtime status event updates installed pack runtime', () async {
    final container = _newContainer();
    addTearDown(container.dispose);

    final notifier = container.read(languagePackCatalogProvider.notifier);
    final entry = _firstInstallableEntry(container);
    await notifier.installPackWithPreflight(
      entry: entry,
      device: const LanguagePackDeviceProfile(
        androidSdk: 35,
        primaryAbi: 'arm64-v8a',
        totalCapacityMb: 65536,
        freeSpaceMb: 8192,
        ramMb: 6144,
      ),
    );

    final applied = notifier.applyNativeRuntimeStatus(
      runtimeState: 'android_fallback',
      fallbackReason: 'runtime_load_failed',
      activePackId: entry.packId,
      lastErrorCode: 'speech_error_7',
      languageTag: entry.languageTag,
      engine: 'android_speech_recognizer',
      observedAtUtc: DateTime.utc(2026, 5, 17, 15, 40),
    );
    final state = container
        .read(languagePackCatalogProvider)
        .installedStateFor(entry);

    expect(applied, isTrue);
    expect(state.installState, InstalledLanguagePackState.installed);
    expect(state.runtimeMode, LanguagePackRuntimeMode.androidFallback);
    expect(state.fallbackReason, LanguagePackFallbackReason.runtimeLoadFailed);
    expect(state.lastErrorCode, 'speech_error_7');
  });

  test(
    'native runtime timeout keeps pack installed and records runtime_timeout fallback',
    () async {
      final container = _newContainer();
      addTearDown(container.dispose);

      final notifier = container.read(languagePackCatalogProvider.notifier);
      final entry = _firstInstallableEntry(container);
      await notifier.installPackWithPreflight(
        entry: entry,
        device: const LanguagePackDeviceProfile(
          androidSdk: 35,
          primaryAbi: 'arm64-v8a',
          totalCapacityMb: 65536,
          freeSpaceMb: 8192,
          ramMb: 6144,
        ),
      );

      final applied = notifier.applyNativeRuntimeStatus(
        runtimeState: 'runtime_timeout',
        fallbackReason: 'runtime_timeout',
        activePackId: entry.packId,
        lastErrorCode: 'speech_error_timeout',
        languageTag: entry.languageTag,
        engine: entry.engine.wireName,
      );
      final state = container
          .read(languagePackCatalogProvider)
          .installedStateFor(entry);

      expect(applied, isTrue);
      expect(state.installState, InstalledLanguagePackState.installed);
      expect(state.runtimeMode, LanguagePackRuntimeMode.unavailable);
      expect(state.fallbackReason, LanguagePackFallbackReason.runtimeTimeout);
      expect(state.lastErrorCode, 'speech_error_timeout');
    },
  );

  test(
    'native local timeout resolves to unavailable runtime via language+engine fallback',
    () {
      final container = _newContainer();
      addTearDown(container.dispose);

      final notifier = container.read(languagePackCatalogProvider.notifier);
      final entry = _firstInstallableEntry(container);

      final applied = notifier.applyNativeRuntimeStatus(
        runtimeState: 'local_timeout',
        fallbackReason: 'runtime_timeout',
        activePackId: 'none',
        lastErrorCode: 'local_runtime_timeout',
        languageTag: entry.languageTag,
        engine: entry.engine.wireName,
      );
      final state = container
          .read(languagePackCatalogProvider)
          .installedStateFor(entry);

      expect(applied, isTrue);
      expect(state.runtimeMode, LanguagePackRuntimeMode.unavailable);
      expect(state.fallbackReason, LanguagePackFallbackReason.runtimeTimeout);
      expect(state.lastErrorCode, 'local_runtime_timeout');
    },
  );

  test(
    'native runtime status event uses language+engine when pack id is none',
    () {
      final container = _newContainer();
      addTearDown(container.dispose);

      final notifier = container.read(languagePackCatalogProvider.notifier);
      final applied = notifier.applyNativeRuntimeStatus(
        runtimeState: 'cloud_fallback',
        fallbackReason: 'cloud_auto_policy',
        activePackId: 'none',
        lastErrorCode: 'none',
        languageTag: 'fr-FR',
        engine: 'sherpa_onnx',
      );
      final entry = _firstInstallableEntry(container);
      final state = container
          .read(languagePackCatalogProvider)
          .installedStateFor(entry);

      expect(applied, isTrue);
      expect(state.runtimeMode, LanguagePackRuntimeMode.cloudFallback);
      expect(state.fallbackReason, LanguagePackFallbackReason.cloudAutoPolicy);
    },
  );

  test('native runtime local phases move from loading to active', () {
    final container = _newContainer();
    addTearDown(container.dispose);

    final notifier = container.read(languagePackCatalogProvider.notifier);
    final entry = _firstInstallableEntry(container);
    final loadingApplied = notifier.applyNativeRuntimeStatus(
      runtimeState: 'local_loading',
      fallbackReason: 'none',
      activePackId: entry.packId,
      lastErrorCode: 'none',
      languageTag: entry.languageTag,
      engine: entry.engine.wireName,
    );
    final loadingState = container
        .read(languagePackCatalogProvider)
        .installedStateFor(entry);

    expect(loadingApplied, isTrue);
    expect(loadingState.installState, InstalledLanguagePackState.verifying);
    expect(loadingState.runtimeMode, LanguagePackRuntimeMode.unavailable);
    expect(loadingState.lastErrorCode, 'local_loading');

    final activeApplied = notifier.applyNativeRuntimeStatus(
      runtimeState: 'local_active',
      fallbackReason: 'none',
      activePackId: entry.packId,
      lastErrorCode: 'none',
      languageTag: entry.languageTag,
      engine: entry.engine.wireName,
    );
    final activeState = container
        .read(languagePackCatalogProvider)
        .installedStateFor(entry);

    expect(activeApplied, isTrue);
    expect(activeState.installState, InstalledLanguagePackState.installed);
    expect(activeState.runtimeMode, LanguagePackRuntimeMode.local);
    expect(activeState.fallbackReason, LanguagePackFallbackReason.none);
  });

  test('native fallback keeps sherpa not linked error code', () {
    final container = _newContainer();
    addTearDown(container.dispose);

    final notifier = container.read(languagePackCatalogProvider.notifier);
    final entry = _firstInstallableEntry(container);

    final applied = notifier.applyNativeRuntimeStatus(
      runtimeState: 'android_fallback',
      fallbackReason: 'runtime_load_failed',
      activePackId: 'none',
      lastErrorCode: 'sherpa_engine_not_linked',
      languageTag: entry.languageTag,
      engine: 'sherpa_onnx',
      observedAtUtc: DateTime.utc(2026, 5, 17, 16, 8),
    );
    final state = container
        .read(languagePackCatalogProvider)
        .installedStateFor(entry);

    expect(applied, isTrue);
    expect(state.runtimeMode, LanguagePackRuntimeMode.androidFallback);
    expect(state.fallbackReason, LanguagePackFallbackReason.runtimeLoadFailed);
    expect(state.lastErrorCode, 'sherpa_engine_not_linked');
  });

  test('native fallback keeps local model path missing error code', () {
    final container = _newContainer();
    addTearDown(container.dispose);

    final notifier = container.read(languagePackCatalogProvider.notifier);
    final entry = _firstInstallableEntry(container);

    final applied = notifier.applyNativeRuntimeStatus(
      runtimeState: 'android_fallback',
      fallbackReason: 'runtime_load_failed',
      activePackId: 'none',
      lastErrorCode: 'local_model_path_missing',
      languageTag: entry.languageTag,
      engine: 'sherpa_onnx',
    );
    final state = container
        .read(languagePackCatalogProvider)
        .installedStateFor(entry);

    expect(applied, isTrue);
    expect(state.runtimeMode, LanguagePackRuntimeMode.androidFallback);
    expect(state.lastErrorCode, 'local_model_path_missing');
  });

  test('provider can persist explicit model artifact path', () {
    final container = _newContainer();
    addTearDown(container.dispose);

    final notifier = container.read(languagePackCatalogProvider.notifier);
    final entry = _firstInstallableEntry(container);
    final applied = notifier.setModelArtifactPath(
      entry,
      modelArtifactPath:
          '/data/user/0/com.winglowz_app.winglowz_app/files/asr/fr_fr/model.bundle',
    );
    final state = container
        .read(languagePackCatalogProvider)
        .installedStateFor(entry);

    expect(applied, isTrue);
    expect(
      state.modelArtifactPath,
      '/data/user/0/com.winglowz_app.winglowz_app/files/asr/fr_fr/model.bundle',
    );
  });
}

Map<Object?, Object?> _validLocalPack() => {
  'pack_id': 'sherpa_onnx.fr-fr.whisper.2026_05_15',
  'language_tag': 'fr-FR',
  'display_name': 'French (France)',
  'engine': 'sherpa_onnx',
  'engine_version': 'candidate',
  'model_version': 'whisper-candidate',
  'quality_tier': 'experimental',
  'runtime_mode': 'local',
  'fallback_policy': 'prefer_local',
  'download_url': 'https://downloads.winglowz.local/fr.zip',
  'download_size_mb': 82,
  'installed_size_mb': 148,
  'sha256': 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  'signature': 'winglowz-dev-signature',
  'license_id': 'MIT-review-required',
  'commercial_distribution_allowed': false,
  'min_android_sdk': 26,
  'supported_abis': ['arm64-v8a'],
  'min_ram_mb': 4096,
  'requires_streaming': true,
  'supports_offline': true,
  'benchmark_status': 'candidate',
  'benchmark_evidence':
      'shipglows_data/workflow/specs/on-device-asr-free-options-research.md',
  'updated_at': '2026-05-15T19:19:39Z',
};

LanguagePackCatalogEntry _firstInstallableEntry(ProviderContainer container) {
  return container
      .read(languagePackCatalogProvider)
      .catalog
      .entries
      .firstWhere((entry) => entry.isInstallable);
}

ProviderContainer _newContainer() {
  return ProviderContainer(
    overrides: [
      languagePackCatalogStateRepositoryProvider.overrideWithValue(
        InMemoryLanguagePackCatalogStateRepository(),
      ),
    ],
  );
}
