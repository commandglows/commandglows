import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/language_pack_state_repository.dart';
import '../domain/language_pack_catalog.dart';

enum LanguagePackCatalogLoadState { loading, success, error, stale }

class LanguagePackCatalogState {
  const LanguagePackCatalogState({
    required this.loadState,
    required this.catalog,
    required this.installedPacks,
    required this.retryCounts,
    required this.allowCloudFallback,
    this.lastErrorCode,
    this.lastErrorMessage,
  });

  final LanguagePackCatalogLoadState loadState;
  final LanguagePackCatalog catalog;
  final Map<String, InstalledLanguagePack> installedPacks;
  final Map<String, int> retryCounts;
  final bool allowCloudFallback;
  final String? lastErrorCode;
  final String? lastErrorMessage;

  bool get hasError => loadState == LanguagePackCatalogLoadState.error;
  bool get isStale => loadState == LanguagePackCatalogLoadState.stale;

  InstalledLanguagePack installedStateFor(LanguagePackCatalogEntry entry) {
    return installedPacks[entry.packId] ??
        InstalledLanguagePack.notInstalled(entry);
  }

  LanguagePackCatalogState copyWith({
    LanguagePackCatalogLoadState? loadState,
    LanguagePackCatalog? catalog,
    Map<String, InstalledLanguagePack>? installedPacks,
    Map<String, int>? retryCounts,
    bool? allowCloudFallback,
    String? lastErrorCode,
    String? lastErrorMessage,
  }) {
    return LanguagePackCatalogState(
      loadState: loadState ?? this.loadState,
      catalog: catalog ?? this.catalog,
      installedPacks: installedPacks ?? this.installedPacks,
      retryCounts: retryCounts ?? this.retryCounts,
      allowCloudFallback: allowCloudFallback ?? this.allowCloudFallback,
      lastErrorCode: lastErrorCode,
      lastErrorMessage: lastErrorMessage,
    );
  }
}

final languagePackCatalogStateRepositoryProvider =
    Provider<LanguagePackCatalogStateRepository>((ref) {
      return SecureStorageLanguagePackCatalogStateRepository();
    });

final languagePackCatalogProvider =
    NotifierProvider<LanguagePackCatalogNotifier, LanguagePackCatalogState>(
      LanguagePackCatalogNotifier.new,
    );

class LanguagePackCatalogNotifier extends Notifier<LanguagePackCatalogState> {
  static const int _maxAutoRetries = 3;
  static const List<int> _installProgressMilestones = <int>[18, 42, 73, 100];
  final Set<String> _activeInstallOperations = <String>{};

  @override
  LanguagePackCatalogState build() {
    unawaited(hydratePersistedState());
    return LanguagePackCatalogState(
      loadState: LanguagePackCatalogLoadState.success,
      catalog: LanguagePackCatalog(entries: _defaultCatalogEntries()),
      installedPacks: const <String, InstalledLanguagePack>{},
      retryCounts: const <String, int>{},
      allowCloudFallback: false,
    );
  }

  Future<void> hydratePersistedState() async {
    final persisted = await ref
        .read(languagePackCatalogStateRepositoryProvider)
        .read();
    if (!ref.mounted) {
      return;
    }
    final hasRuntimeMutations =
        state.installedPacks.isNotEmpty ||
        state.retryCounts.isNotEmpty ||
        state.allowCloudFallback ||
        _activeInstallOperations.isNotEmpty;
    if (hasRuntimeMutations) {
      return;
    }
    state = state.copyWith(
      loadState: LanguagePackCatalogLoadState.success,
      catalog: LanguagePackCatalog(entries: _defaultCatalogEntries()),
      installedPacks: persisted.installedPacks,
      retryCounts: persisted.retryCounts,
      allowCloudFallback: persisted.allowCloudFallback,
    );
  }

  Future<void> refresh() async {
    state = state.copyWith(loadState: LanguagePackCatalogLoadState.loading);
    try {
      state = state.copyWith(
        loadState: LanguagePackCatalogLoadState.success,
        catalog: LanguagePackCatalog(entries: _defaultCatalogEntries()),
      );
    } on CatalogValidationException catch (error) {
      state = state.copyWith(
        loadState: state.catalog.entries.isEmpty
            ? LanguagePackCatalogLoadState.error
            : LanguagePackCatalogLoadState.stale,
        lastErrorCode: error.code,
        lastErrorMessage: error.message,
      );
    }
    _persistState();
  }

  void setAllowCloudFallback(bool value) {
    state = state.copyWith(allowCloudFallback: value);
    _persistState();
  }

  void markInstallBlockedByStorage({
    required LanguagePackCatalogEntry entry,
    required int requiredMb,
    required int availableMb,
  }) {
    final current = _stateFor(entry);
    if (current.installState == InstalledLanguagePackState.installed) {
      return;
    }
    _setPackState(
      entry,
      current.copyWith(
        installState: InstalledLanguagePackState.blockedInsufficientStorage,
        runtimeMode: LanguagePackRuntimeMode.unavailable,
        fallbackReason: LanguagePackFallbackReason.insufficientStorage,
        requiredMb: requiredMb,
        availableMb: availableMb,
        lastErrorAt: DateTime.now().toUtc(),
        lastErrorCode: 'blocked_insufficient_storage',
      ),
    );
  }

  void queueInstall(LanguagePackCatalogEntry entry) {
    if (!entry.isInstallable) {
      return;
    }
    final current = _stateFor(entry);
    if (_isInstallInFlight(current.installState) ||
        current.installState == InstalledLanguagePackState.installed) {
      return;
    }
    _setPackState(
      entry,
      current.copyWith(
        installState: InstalledLanguagePackState.queued,
        runtimeMode: LanguagePackRuntimeMode.unavailable,
        fallbackReason: LanguagePackFallbackReason.missingPack,
        downloadProgress: 0,
        requiredMb: entry.installedSizeMb,
        lastErrorCode: 'none',
      ),
    );
  }

  bool queueInstallAfterPreflight({
    required LanguagePackCatalogEntry entry,
    required LanguagePackDeviceProfile device,
  }) {
    final current = _stateFor(entry);
    if (_isInstallInFlight(current.installState) ||
        current.installState == InstalledLanguagePackState.installed) {
      return current.installState == InstalledLanguagePackState.queued;
    }
    final decision = LanguagePackInstallPreflight.evaluate(
      entry: entry,
      device: device,
    );
    if (!decision.allowed) {
      _setPackState(
        entry,
        current.copyWith(
          installState: decision.installState,
          runtimeMode: LanguagePackRuntimeMode.unavailable,
          fallbackReason: decision.reason,
          requiredMb: decision.requiredMb,
          availableMb: decision.availableMb,
          lastErrorAt: DateTime.now().toUtc(),
          lastErrorCode: decision.errorCode,
        ),
      );
      return false;
    }
    _setPackState(
      entry,
      current.copyWith(
        installState: InstalledLanguagePackState.queued,
        runtimeMode: LanguagePackRuntimeMode.unavailable,
        fallbackReason: LanguagePackFallbackReason.missingPack,
        downloadProgress: 0,
        requiredMb: decision.requiredMb,
        availableMb: decision.availableMb,
        lastErrorCode: 'none',
      ),
    );
    return true;
  }

  void startDownload(LanguagePackCatalogEntry entry) {
    final current = _stateFor(entry);
    if (current.installState == InstalledLanguagePackState.installed) {
      return;
    }
    if (current.installState != InstalledLanguagePackState.queued &&
        current.installState != InstalledLanguagePackState.failedDownload &&
        current.installState !=
            InstalledLanguagePackState.pausedInsufficientStorage &&
        current.installState != InstalledLanguagePackState.failedVerification) {
      return;
    }
    _setPackState(
      entry,
      current.copyWith(
        installState: InstalledLanguagePackState.downloading,
        runtimeMode: LanguagePackRuntimeMode.unavailable,
        fallbackReason: LanguagePackFallbackReason.missingPack,
        lastErrorCode: 'none',
      ),
    );
  }

  void updateDownloadProgress(LanguagePackCatalogEntry entry, int progress) {
    final current = _stateFor(entry);
    final clamped = progress.clamp(0, 100);
    if (current.installState != InstalledLanguagePackState.downloading &&
        current.installState != InstalledLanguagePackState.queued) {
      return;
    }
    final nextState = clamped >= 100
        ? InstalledLanguagePackState.verifying
        : InstalledLanguagePackState.downloading;
    _setPackState(
      entry,
      current.copyWith(
        installState: nextState,
        runtimeMode: LanguagePackRuntimeMode.unavailable,
        fallbackReason: LanguagePackFallbackReason.missingPack,
        downloadProgress: clamped,
        checksumVerified: false,
      ),
    );
  }

  void failDownload(
    LanguagePackCatalogEntry entry, {
    String code = 'download_failed',
  }) {
    final current = _stateFor(entry);
    if (current.installState != InstalledLanguagePackState.downloading &&
        current.installState != InstalledLanguagePackState.queued) {
      return;
    }
    _setPackState(
      entry,
      current.copyWith(
        installState: InstalledLanguagePackState.failedDownload,
        runtimeMode: LanguagePackRuntimeMode.unavailable,
        fallbackReason: LanguagePackFallbackReason.missingPack,
        lastErrorAt: DateTime.now().toUtc(),
        lastErrorCode: code,
      ),
    );
  }

  void failVerification(
    LanguagePackCatalogEntry entry, {
    String code = 'failed_verification',
  }) {
    final current = _stateFor(entry);
    if (current.installState != InstalledLanguagePackState.verifying) {
      return;
    }
    _setPackState(
      entry,
      current.copyWith(
        installState: InstalledLanguagePackState.failedVerification,
        runtimeMode: LanguagePackRuntimeMode.unavailable,
        fallbackReason: LanguagePackFallbackReason.verificationFailed,
        checksumVerified: false,
        lastErrorAt: DateTime.now().toUtc(),
        lastErrorCode: code,
      ),
    );
  }

  bool retryInstall(LanguagePackCatalogEntry entry) {
    final current = _stateFor(entry);
    if (current.installState != InstalledLanguagePackState.failedDownload &&
        current.installState != InstalledLanguagePackState.failedVerification &&
        current.installState !=
            InstalledLanguagePackState.pausedInsufficientStorage &&
        current.installState !=
            InstalledLanguagePackState.blockedInsufficientStorage &&
        current.installState != InstalledLanguagePackState.corrupted) {
      return false;
    }
    final usedRetries = state.retryCounts[entry.packId] ?? 0;
    if (usedRetries >= _maxAutoRetries) {
      _setPackState(
        entry,
        current.copyWith(
          lastErrorAt: DateTime.now().toUtc(),
          lastErrorCode: 'retry_limit_reached',
        ),
      );
      return false;
    }
    final retries = Map<String, int>.of(state.retryCounts);
    retries[entry.packId] = usedRetries + 1;
    state = state.copyWith(
      retryCounts: retries,
      installedPacks: {
        ...state.installedPacks,
        entry.packId: current.copyWith(
          installState: InstalledLanguagePackState.queued,
          runtimeMode: LanguagePackRuntimeMode.unavailable,
          fallbackReason: LanguagePackFallbackReason.missingPack,
          lastErrorCode: 'none',
        ),
      },
    );
    _persistState();
    return true;
  }

  Future<bool> installPackWithPreflight({
    required LanguagePackCatalogEntry entry,
    required LanguagePackDeviceProfile device,
  }) async {
    if (_activeInstallOperations.contains(entry.packId)) {
      return false;
    }
    final current = _stateFor(entry);
    if (current.installState == InstalledLanguagePackState.installed) {
      return true;
    }
    final queued = queueInstallAfterPreflight(entry: entry, device: device);
    if (!queued) {
      return false;
    }
    _activeInstallOperations.add(entry.packId);
    try {
      startDownload(entry);
      for (final progress in _installProgressMilestones) {
        if (_stateFor(entry).installState ==
            InstalledLanguagePackState.removed) {
          return false;
        }
        await Future<void>.delayed(Duration.zero);
        updateDownloadProgress(entry, progress);
      }
      if (!_hasValidIntegrityMetadata(entry)) {
        failVerification(entry, code: 'failed_verification_checksum');
        return false;
      }
      markInstalled(entry);
      return _stateFor(entry).installState ==
          InstalledLanguagePackState.installed;
    } finally {
      _activeInstallOperations.remove(entry.packId);
    }
  }

  Future<bool> retryInstallWithPreflight({
    required LanguagePackCatalogEntry entry,
    required LanguagePackDeviceProfile device,
  }) async {
    if (!retryInstall(entry)) {
      return false;
    }
    return installPackWithPreflight(entry: entry, device: device);
  }

  bool markUpdateAvailable(LanguagePackCatalogEntry entry) {
    final current = _stateFor(entry);
    if (current.installState != InstalledLanguagePackState.installed) {
      return false;
    }
    _setPackState(
      entry,
      current.copyWith(
        installState: InstalledLanguagePackState.updateAvailable,
        runtimeMode: LanguagePackRuntimeMode.local,
        fallbackReason: LanguagePackFallbackReason.none,
        lastErrorCode: 'none',
      ),
    );
    return true;
  }

  bool markCorrupted(
    LanguagePackCatalogEntry entry, {
    String code = 'pack_corrupted',
  }) {
    final current = _stateFor(entry);
    if (current.installState != InstalledLanguagePackState.installed &&
        current.installState != InstalledLanguagePackState.updateAvailable) {
      return false;
    }
    _setPackState(
      entry,
      current.copyWith(
        installState: InstalledLanguagePackState.corrupted,
        runtimeMode: LanguagePackRuntimeMode.unavailable,
        fallbackReason: LanguagePackFallbackReason.verificationFailed,
        checksumVerified: false,
        lastErrorAt: DateTime.now().toUtc(),
        lastErrorCode: code,
      ),
    );
    return true;
  }

  bool setExplicitFallbackForLanguage(String languageTag) {
    final entries = state.catalog.entriesForLanguage(languageTag);
    if (entries.isEmpty) {
      return false;
    }
    final target =
        state.catalog.recommendedForLanguage(languageTag) ??
        entries.firstWhere(
          (entry) => entry.runtimeMode == LanguagePackRuntimeMode.local,
          orElse: () => entries.first,
        );
    final hasAndroidFallback = entries.any(
      (entry) => entry.runtimeMode == LanguagePackRuntimeMode.androidFallback,
    );
    final runtimeMode = state.allowCloudFallback
        ? LanguagePackRuntimeMode.cloudFallback
        : hasAndroidFallback
        ? LanguagePackRuntimeMode.androidFallback
        : LanguagePackRuntimeMode.unavailable;
    final fallbackReason = state.allowCloudFallback
        ? LanguagePackFallbackReason.cloudAutoPolicy
        : hasAndroidFallback
        ? LanguagePackFallbackReason.missingPack
        : LanguagePackFallbackReason.userDisabledCloud;
    final current = _stateFor(target);
    _setPackState(
      target,
      current.copyWith(
        installState: InstalledLanguagePackState.notInstalled,
        runtimeMode: runtimeMode,
        fallbackReason: fallbackReason,
        downloadProgress: 0,
        checksumVerified: false,
        lastErrorAt: DateTime.now().toUtc(),
        lastErrorCode: 'fallback_explicit',
      ),
    );
    return true;
  }

  bool applyNativeRuntimeStatus({
    required String runtimeState,
    required String fallbackReason,
    required String activePackId,
    required String lastErrorCode,
    required String languageTag,
    required String engine,
    DateTime? observedAtUtc,
  }) {
    final target = _entryForNativeStatus(
      activePackId: activePackId,
      languageTag: languageTag,
      engine: engine,
    );
    if (target == null) {
      return false;
    }
    final runtimePhase = runtimeState.trim();
    final runtimeMode = _runtimeModeFromWire(runtimePhase);
    final fallback = _fallbackReasonFromWire(fallbackReason);
    final current = _stateFor(target);
    final timestamp = observedAtUtc ?? DateTime.now().toUtc();
    final nextState = runtimePhase == 'local_loading'
        ? InstalledLanguagePackState.verifying
        : runtimeMode == LanguagePackRuntimeMode.local
        ? InstalledLanguagePackState.installed
        : (current.installState == InstalledLanguagePackState.installed ||
                  current.installState ==
                      InstalledLanguagePackState.updateAvailable
              ? current.installState
              : InstalledLanguagePackState.notInstalled);
    _setPackState(
      target,
      current.copyWith(
        installState: nextState,
        runtimeMode: runtimeMode,
        fallbackReason: runtimePhase == 'local_loading'
            ? LanguagePackFallbackReason.none
            : fallback,
        lastErrorAt: timestamp,
        lastErrorCode: runtimePhase == 'local_loading'
            ? 'local_loading'
            : (lastErrorCode.trim().isEmpty ? 'none' : lastErrorCode),
        installedSizeMb: runtimeMode == LanguagePackRuntimeMode.local
            ? target.installedSizeMb
            : current.installedSizeMb,
        checksumVerified: runtimeMode == LanguagePackRuntimeMode.local
            ? true
            : current.checksumVerified,
        installedAt: runtimeMode == LanguagePackRuntimeMode.local
            ? (current.installedAt ?? timestamp)
            : current.installedAt,
        modelArtifactPath: runtimeMode == LanguagePackRuntimeMode.local
            ? (current.modelArtifactPath == 'none'
                  ? _defaultModelArtifactPathFor(target)
                  : current.modelArtifactPath)
            : current.modelArtifactPath,
      ),
    );
    return true;
  }

  void markInstalled(LanguagePackCatalogEntry entry) {
    final current = _stateFor(entry);
    if (current.installState != InstalledLanguagePackState.verifying ||
        current.downloadProgress < 100) {
      return;
    }
    _setPackState(
      entry,
      current.copyWith(
        installState: InstalledLanguagePackState.installed,
        runtimeMode: LanguagePackRuntimeMode.local,
        fallbackReason: LanguagePackFallbackReason.none,
        installedSizeMb: entry.installedSizeMb,
        checksumVerified: true,
        installedAt: DateTime.now().toUtc(),
        lastVerifiedAt: DateTime.now().toUtc(),
        lastErrorCode: 'none',
        modelArtifactPath: _defaultModelArtifactPathFor(entry),
      ),
    );
  }

  bool remove(LanguagePackCatalogEntry entry) {
    final current = _stateFor(entry);
    if (current.installState == InstalledLanguagePackState.notInstalled ||
        current.installState == InstalledLanguagePackState.removed) {
      return false;
    }
    final retries = Map<String, int>.of(state.retryCounts)
      ..remove(entry.packId);
    state = state.copyWith(
      retryCounts: retries,
      installedPacks: {
        ...state.installedPacks,
        entry.packId: InstalledLanguagePack.notInstalled(entry).copyWith(
          installState: InstalledLanguagePackState.removed,
          runtimeMode: LanguagePackRuntimeMode.unavailable,
          fallbackReason: LanguagePackFallbackReason.missingPack,
          lastErrorCode: 'none',
          modelArtifactPath: 'none',
        ),
      },
    );
    _persistState();
    return true;
  }

  bool setModelArtifactPath(
    LanguagePackCatalogEntry entry, {
    required String modelArtifactPath,
  }) {
    final current = _stateFor(entry);
    final normalized = modelArtifactPath.trim();
    _setPackState(
      entry,
      current.copyWith(
        modelArtifactPath: normalized.isEmpty ? 'none' : normalized,
      ),
    );
    return true;
  }

  InstalledLanguagePack _stateFor(LanguagePackCatalogEntry entry) {
    return state.installedPacks[entry.packId] ??
        InstalledLanguagePack.notInstalled(entry);
  }

  LanguagePackCatalogEntry? _entryForNativeStatus({
    required String activePackId,
    required String languageTag,
    required String engine,
  }) {
    final normalizedPackId = activePackId.trim();
    if (normalizedPackId.isNotEmpty && normalizedPackId != 'none') {
      for (final entry in state.catalog.entries) {
        if (entry.packId == normalizedPackId) {
          return entry;
        }
      }
    }
    final candidates = state.catalog.entriesForLanguage(languageTag);
    if (candidates.isEmpty) {
      return null;
    }
    final normalizedEngine = engine.trim();
    for (final candidate in candidates) {
      if (candidate.engine.wireName == normalizedEngine) {
        return candidate;
      }
    }
    return state.catalog.recommendedForLanguage(languageTag) ??
        candidates.first;
  }

  static bool _isInstallInFlight(InstalledLanguagePackState value) {
    return value == InstalledLanguagePackState.queued ||
        value == InstalledLanguagePackState.downloading ||
        value == InstalledLanguagePackState.verifying;
  }

  void _setPackState(
    LanguagePackCatalogEntry entry,
    InstalledLanguagePack nextPack,
  ) {
    state = state.copyWith(
      installedPacks: {...state.installedPacks, entry.packId: nextPack},
    );
    _persistState();
  }

  void _persistState() {
    unawaited(
      ref
          .read(languagePackCatalogStateRepositoryProvider)
          .write(
            LanguagePackCatalogLocalState(
              installedPacks: state.installedPacks,
              retryCounts: state.retryCounts,
              allowCloudFallback: state.allowCloudFallback,
            ),
          ),
    );
  }

  static bool _hasValidIntegrityMetadata(LanguagePackCatalogEntry entry) {
    if (entry.runtimeMode != LanguagePackRuntimeMode.local) {
      return false;
    }
    final hasSha256 = RegExp(r'^[a-f0-9]{64}$').hasMatch(entry.sha256);
    final hasSignature =
        entry.signature.trim().isNotEmpty && entry.signature != 'none';
    return hasSha256 && hasSignature;
  }

  static LanguagePackRuntimeMode _runtimeModeFromWire(String value) {
    if (value == 'local_loading') {
      return LanguagePackRuntimeMode.unavailable;
    }
    if (value == 'runtime_timeout' || value == 'local_timeout') {
      return LanguagePackRuntimeMode.unavailable;
    }
    if (value == 'local_active') {
      return LanguagePackRuntimeMode.local;
    }
    try {
      return LanguagePackRuntimeMode.fromWire(value);
    } on CatalogValidationException {
      return LanguagePackRuntimeMode.unavailable;
    }
  }

  static LanguagePackFallbackReason _fallbackReasonFromWire(String value) {
    try {
      return LanguagePackFallbackReason.fromWire(value);
    } on CatalogValidationException {
      return LanguagePackFallbackReason.unsupportedLanguage;
    }
  }

  static String _defaultModelArtifactPathFor(LanguagePackCatalogEntry entry) {
    final language = entry.languageTag.toLowerCase().replaceAll('-', '_');
    return '/data/user/0/com.commandglows.app/files/asr/$language/${entry.packId}/model.bundle';
  }
}

List<LanguagePackCatalogEntry> _defaultCatalogEntries() {
  final updatedAt = DateTime.utc(2026, 5, 15, 19, 19, 39);
  return [
    LanguagePackCatalogEntry.fromMap({
      'pack_id': 'sherpa_onnx.fr-fr.whisper_candidate.2026_05_15',
      'language_tag': 'fr-FR',
      'display_name': 'French (France)',
      'engine': 'sherpa_onnx',
      'engine_version': 'candidate',
      'model_version': 'whisper-multilingual-candidate',
      'quality_tier': 'experimental',
      'runtime_mode': 'local',
      'fallback_policy': 'android_then_cloud_auto',
      'download_url':
          'https://downloads.commandglows.local/asr/fr-fr-placeholder.zip',
      'download_size_mb': 82,
      'installed_size_mb': 148,
      'sha256':
          'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      'signature': 'commandglows-catalog-dev-signature',
      'license_id': 'MIT-model-license-review-required',
      'commercial_distribution_allowed': false,
      'min_android_sdk': 26,
      'supported_abis': ['arm64-v8a'],
      'min_ram_mb': 4096,
      'requires_streaming': true,
      'supports_offline': true,
      'benchmark_status': 'candidate',
      'benchmark_evidence':
          'shipglows_data/workflow/specs/on-device-asr-free-options-research.md',
      'updated_at': updatedAt.toIso8601String(),
    }),
    LanguagePackCatalogEntry.fromMap({
      'pack_id': 'android_speech_recognizer.en-us.system.2026_05_15',
      'language_tag': 'en-US',
      'display_name': 'English (United States)',
      'engine': 'android_speech_recognizer',
      'engine_version': 'unknown',
      'model_version': 'none',
      'quality_tier': 'fallbackOnly',
      'runtime_mode': 'android_fallback',
      'fallback_policy': 'android_then_cloud_auto',
      'download_url': 'none',
      'download_size_mb': 0,
      'installed_size_mb': 0,
      'sha256': 'none',
      'signature': 'none',
      'license_id': 'android-system-service',
      'commercial_distribution_allowed': false,
      'min_android_sdk': 23,
      'supported_abis': ['arm64-v8a', 'armeabi-v7a', 'x86_64'],
      'min_ram_mb': 0,
      'requires_streaming': false,
      'supports_offline': false,
      'benchmark_status': 'unbenchmarked',
      'benchmark_evidence': 'none',
      'updated_at': updatedAt.toIso8601String(),
    }),
    LanguagePackCatalogEntry.fromMap({
      'pack_id': 'unavailable.hi-in.local.none.2026_05_15',
      'language_tag': 'hi-IN',
      'display_name': 'Hindi (India)',
      'engine': 'unavailable',
      'engine_version': 'none',
      'model_version': 'none',
      'quality_tier': 'fallbackOnly',
      'runtime_mode': 'unavailable',
      'fallback_policy': 'unavailable',
      'download_url': 'none',
      'download_size_mb': 0,
      'installed_size_mb': 0,
      'sha256': 'none',
      'signature': 'none',
      'license_id': 'none',
      'commercial_distribution_allowed': false,
      'min_android_sdk': 23,
      'supported_abis': ['arm64-v8a', 'armeabi-v7a', 'x86_64'],
      'min_ram_mb': 0,
      'requires_streaming': false,
      'supports_offline': false,
      'benchmark_status': 'unbenchmarked',
      'benchmark_evidence': 'none',
      'updated_at': updatedAt.toIso8601String(),
    }),
  ];
}
