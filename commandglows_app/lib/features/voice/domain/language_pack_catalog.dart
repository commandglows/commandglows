class CatalogValidationException implements Exception {
  const CatalogValidationException(this.code, this.message);

  final String code;
  final String message;

  @override
  String toString() => 'CatalogValidationException($code): $message';
}

enum LanguagePackEngine {
  androidSpeechRecognizer('android_speech_recognizer'),
  sherpaOnnx('sherpa_onnx'),
  whisperCpp('whisper_cpp'),
  vosk('vosk'),
  cloudFallback('cloud_fallback'),
  unavailable('unavailable');

  const LanguagePackEngine(this.wireName);

  final String wireName;

  static LanguagePackEngine fromWire(Object? value) =>
      _enumFromWire(values, value, (item) => item.wireName, 'engine');
}

enum LanguagePackQualityTier {
  recommended('recommended'),
  standard('standard'),
  experimental('experimental'),
  fallbackOnly('fallbackOnly');

  const LanguagePackQualityTier(this.wireName);

  final String wireName;

  static LanguagePackQualityTier fromWire(Object? value) =>
      _enumFromWire(values, value, (item) => item.wireName, 'quality_tier');
}

enum LanguagePackRuntimeMode {
  local('local'),
  androidFallback('android_fallback'),
  cloudFallback('cloud_fallback'),
  unavailable('unavailable');

  const LanguagePackRuntimeMode(this.wireName);

  final String wireName;

  static LanguagePackRuntimeMode fromWire(Object? value) =>
      _enumFromWire(values, value, (item) => item.wireName, 'runtime_mode');
}

enum LanguagePackFallbackPolicy {
  preferLocal('prefer_local'),
  androidThenCloudAuto('android_then_cloud_auto'),
  cloudAutoOnly('cloud_auto_only'),
  unavailable('unavailable');

  const LanguagePackFallbackPolicy(this.wireName);

  final String wireName;

  static LanguagePackFallbackPolicy fromWire(Object? value) =>
      _enumFromWire(values, value, (item) => item.wireName, 'fallback_policy');
}

enum LanguagePackBenchmarkStatus {
  unbenchmarked('unbenchmarked'),
  candidate('candidate'),
  benchmarking('benchmarking'),
  passed('passed'),
  failed('failed');

  const LanguagePackBenchmarkStatus(this.wireName);

  final String wireName;

  static LanguagePackBenchmarkStatus fromWire(Object? value) =>
      _enumFromWire(values, value, (item) => item.wireName, 'benchmark_status');
}

enum InstalledLanguagePackState {
  notInstalled('not_installed'),
  queued('queued'),
  downloading('downloading'),
  pausedInsufficientStorage('paused_insufficient_storage'),
  verifying('verifying'),
  installed('installed'),
  updateAvailable('update_available'),
  failedDownload('failed_download'),
  failedVerification('failed_verification'),
  blockedIncompatibleDevice('blocked_incompatible_device'),
  blockedInsufficientStorage('blocked_insufficient_storage'),
  corrupted('corrupted'),
  removed('removed');

  const InstalledLanguagePackState(this.wireName);

  final String wireName;

  static InstalledLanguagePackState fromWire(Object? value) =>
      _enumFromWire(values, value, (item) => item.wireName, 'install_state');
}

enum LanguagePackFallbackReason {
  none('none'),
  missingPack('missing_pack'),
  incompatibleDevice('incompatible_device'),
  insufficientStorage('insufficient_storage'),
  runtimeLoadFailed('runtime_load_failed'),
  runtimeTimeout('runtime_timeout'),
  verificationFailed('verification_failed'),
  unsupportedLanguage('unsupported_language'),
  cloudAutoPolicy('cloud_auto_policy'),
  userDisabledCloud('user_disabled_cloud');

  const LanguagePackFallbackReason(this.wireName);

  final String wireName;

  static LanguagePackFallbackReason fromWire(Object? value) =>
      _enumFromWire(values, value, (item) => item.wireName, 'fallback_reason');
}

class LanguagePackCatalogEntry {
  const LanguagePackCatalogEntry({
    required this.packId,
    required this.languageTag,
    required this.displayName,
    required this.engine,
    required this.engineVersion,
    required this.modelVersion,
    required this.qualityTier,
    required this.runtimeMode,
    required this.fallbackPolicy,
    required this.downloadUrl,
    required this.downloadSizeMb,
    required this.installedSizeMb,
    required this.sha256,
    required this.signature,
    required this.licenseId,
    required this.commercialDistributionAllowed,
    required this.minAndroidSdk,
    required this.supportedAbis,
    required this.minRamMb,
    required this.requiresStreaming,
    required this.supportsOffline,
    required this.benchmarkStatus,
    required this.benchmarkEvidence,
    required this.updatedAt,
  });

  final String packId;
  final String languageTag;
  final String displayName;
  final LanguagePackEngine engine;
  final String engineVersion;
  final String modelVersion;
  final LanguagePackQualityTier qualityTier;
  final LanguagePackRuntimeMode runtimeMode;
  final LanguagePackFallbackPolicy fallbackPolicy;
  final String downloadUrl;
  final int downloadSizeMb;
  final int installedSizeMb;
  final String sha256;
  final String signature;
  final String licenseId;
  final bool commercialDistributionAllowed;
  final int minAndroidSdk;
  final List<String> supportedAbis;
  final int minRamMb;
  final bool requiresStreaming;
  final bool supportsOffline;
  final LanguagePackBenchmarkStatus benchmarkStatus;
  final String benchmarkEvidence;
  final DateTime updatedAt;

  bool get hasLocalArtifact => runtimeMode == LanguagePackRuntimeMode.local;
  bool get isInstallable =>
      hasLocalArtifact && qualityTier != LanguagePackQualityTier.fallbackOnly;
  bool get isRecommended => qualityTier == LanguagePackQualityTier.recommended;

  int get priorityScore {
    final qualityScore = switch (qualityTier) {
      LanguagePackQualityTier.recommended => 400,
      LanguagePackQualityTier.standard => 300,
      LanguagePackQualityTier.experimental => 200,
      LanguagePackQualityTier.fallbackOnly => 100,
    };
    final runtimeScore = switch (runtimeMode) {
      LanguagePackRuntimeMode.local => 40,
      LanguagePackRuntimeMode.androidFallback => 30,
      LanguagePackRuntimeMode.cloudFallback => 20,
      LanguagePackRuntimeMode.unavailable => 0,
    };
    return qualityScore + runtimeScore - installedSizeMb.clamp(0, 99);
  }

  factory LanguagePackCatalogEntry.fromMap(Map<Object?, Object?> map) {
    final localArtifact =
        LanguagePackRuntimeMode.fromWire(_required(map, 'runtime_mode')) ==
        LanguagePackRuntimeMode.local;
    final entry = LanguagePackCatalogEntry(
      packId: _requiredString(map, 'pack_id'),
      languageTag: _requiredString(map, 'language_tag'),
      displayName: _requiredString(map, 'display_name'),
      engine: LanguagePackEngine.fromWire(_required(map, 'engine')),
      engineVersion: _requiredString(map, 'engine_version'),
      modelVersion: _requiredString(map, 'model_version'),
      qualityTier: LanguagePackQualityTier.fromWire(
        _required(map, 'quality_tier'),
      ),
      runtimeMode: LanguagePackRuntimeMode.fromWire(
        _required(map, 'runtime_mode'),
      ),
      fallbackPolicy: LanguagePackFallbackPolicy.fromWire(
        _required(map, 'fallback_policy'),
      ),
      downloadUrl: _requiredString(map, 'download_url'),
      downloadSizeMb: _requiredPositiveOrZeroInt(map, 'download_size_mb'),
      installedSizeMb: _requiredPositiveOrZeroInt(map, 'installed_size_mb'),
      sha256: _requiredString(map, 'sha256'),
      signature: _requiredString(map, 'signature'),
      licenseId: _requiredString(map, 'license_id'),
      commercialDistributionAllowed: _requiredBool(
        map,
        'commercial_distribution_allowed',
      ),
      minAndroidSdk: _requiredPositiveOrZeroInt(map, 'min_android_sdk'),
      supportedAbis: _requiredStringList(map, 'supported_abis'),
      minRamMb: _requiredPositiveOrZeroInt(map, 'min_ram_mb'),
      requiresStreaming: _requiredBool(map, 'requires_streaming'),
      supportsOffline: _requiredBool(map, 'supports_offline'),
      benchmarkStatus: LanguagePackBenchmarkStatus.fromWire(
        _required(map, 'benchmark_status'),
      ),
      benchmarkEvidence: _requiredString(map, 'benchmark_evidence'),
      updatedAt: _requiredDateTime(map, 'updated_at'),
    );
    entry._validate(localArtifact: localArtifact);
    return entry;
  }

  Map<String, Object?> toMap() => {
    'pack_id': packId,
    'language_tag': languageTag,
    'display_name': displayName,
    'engine': engine.wireName,
    'engine_version': engineVersion,
    'model_version': modelVersion,
    'quality_tier': qualityTier.wireName,
    'runtime_mode': runtimeMode.wireName,
    'fallback_policy': fallbackPolicy.wireName,
    'download_url': downloadUrl,
    'download_size_mb': downloadSizeMb,
    'installed_size_mb': installedSizeMb,
    'sha256': sha256,
    'signature': signature,
    'license_id': licenseId,
    'commercial_distribution_allowed': commercialDistributionAllowed,
    'min_android_sdk': minAndroidSdk,
    'supported_abis': supportedAbis,
    'min_ram_mb': minRamMb,
    'requires_streaming': requiresStreaming,
    'supports_offline': supportsOffline,
    'benchmark_status': benchmarkStatus.wireName,
    'benchmark_evidence': benchmarkEvidence,
    'updated_at': updatedAt.toUtc().toIso8601String(),
  };

  void _validate({required bool localArtifact}) {
    if (!RegExp(r'^[a-z0-9_.-]+$').hasMatch(packId) || packId.contains(' ')) {
      throw const CatalogValidationException(
        'catalog_invalid_entry',
        'pack_id must be stable lowercase without spaces.',
      );
    }
    if (!RegExp(r'^[a-z]{2,3}(-[A-Z]{2})?$').hasMatch(languageTag)) {
      throw const CatalogValidationException(
        'catalog_invalid_entry',
        'language_tag must be a normalized BCP-47 tag.',
      );
    }
    if (localArtifact) {
      if (!downloadUrl.startsWith('https://')) {
        throw const CatalogValidationException(
          'catalog_invalid_entry',
          'Local artifacts require an HTTPS download_url.',
        );
      }
      if (downloadSizeMb <= 0 || installedSizeMb <= 0) {
        throw const CatalogValidationException(
          'catalog_invalid_entry',
          'Local artifacts require positive size fields.',
        );
      }
      if (!RegExp(r'^[a-f0-9]{64}$').hasMatch(sha256)) {
        throw const CatalogValidationException(
          'catalog_invalid_entry',
          'Local artifacts require a lowercase sha256 checksum.',
        );
      }
      if (signature == 'none') {
        throw const CatalogValidationException(
          'catalog_invalid_entry',
          'Local artifacts require a signature reference.',
        );
      }
    }
    if (isRecommended) {
      if (!commercialDistributionAllowed || licenseId == 'unknown') {
        throw const CatalogValidationException(
          'catalog_invalid_entry',
          'Recommended packs require verified commercial distribution.',
        );
      }
      if (benchmarkStatus != LanguagePackBenchmarkStatus.passed ||
          benchmarkEvidence == 'none') {
        throw const CatalogValidationException(
          'catalog_invalid_entry',
          'Recommended packs require benchmark evidence.',
        );
      }
    }
  }
}

class InstalledLanguagePack {
  const InstalledLanguagePack({
    required this.packId,
    required this.languageTag,
    required this.engine,
    required this.modelVersion,
    required this.installState,
    required this.runtimeMode,
    required this.fallbackReason,
    required this.downloadProgress,
    required this.installedSizeMb,
    required this.requiredMb,
    required this.availableMb,
    required this.checksumVerified,
    required this.installedAt,
    required this.lastVerifiedAt,
    required this.lastErrorAt,
    required this.lastErrorCode,
    required this.modelArtifactPath,
  });

  final String packId;
  final String languageTag;
  final LanguagePackEngine engine;
  final String modelVersion;
  final InstalledLanguagePackState installState;
  final LanguagePackRuntimeMode runtimeMode;
  final LanguagePackFallbackReason fallbackReason;
  final int downloadProgress;
  final int installedSizeMb;
  final int requiredMb;
  final int availableMb;
  final bool checksumVerified;
  final DateTime? installedAt;
  final DateTime? lastVerifiedAt;
  final DateTime? lastErrorAt;
  final String lastErrorCode;
  final String modelArtifactPath;

  factory InstalledLanguagePack.fromMap(Map<Object?, Object?> map) {
    return InstalledLanguagePack(
      packId: _requiredString(map, 'pack_id'),
      languageTag: _requiredString(map, 'language_tag'),
      engine: LanguagePackEngine.fromWire(_required(map, 'engine')),
      modelVersion: _requiredString(map, 'model_version'),
      installState: InstalledLanguagePackState.fromWire(
        _required(map, 'install_state'),
      ),
      runtimeMode: LanguagePackRuntimeMode.fromWire(
        _required(map, 'runtime_mode'),
      ),
      fallbackReason: LanguagePackFallbackReason.fromWire(
        _required(map, 'fallback_reason'),
      ),
      downloadProgress: _requiredPositiveOrZeroInt(
        map,
        'download_progress',
      ).clamp(0, 100),
      installedSizeMb: _requiredPositiveOrZeroInt(map, 'installed_size_mb'),
      requiredMb: _requiredPositiveOrZeroInt(map, 'required_mb'),
      availableMb: _requiredPositiveOrZeroInt(map, 'available_mb'),
      checksumVerified: _requiredBool(map, 'checksum_verified'),
      installedAt: _optionalDateTime(map, 'installed_at'),
      lastVerifiedAt: _optionalDateTime(map, 'last_verified_at'),
      lastErrorAt: _optionalDateTime(map, 'last_error_at'),
      lastErrorCode: _requiredString(map, 'last_error_code'),
      modelArtifactPath: _optionalArtifactPath(map['model_artifact_path']),
    );
  }

  factory InstalledLanguagePack.notInstalled(LanguagePackCatalogEntry entry) {
    return InstalledLanguagePack(
      packId: entry.packId,
      languageTag: entry.languageTag,
      engine: entry.engine,
      modelVersion: entry.modelVersion,
      installState: InstalledLanguagePackState.notInstalled,
      runtimeMode: entry.runtimeMode == LanguagePackRuntimeMode.local
          ? LanguagePackRuntimeMode.unavailable
          : entry.runtimeMode,
      fallbackReason: entry.runtimeMode == LanguagePackRuntimeMode.local
          ? LanguagePackFallbackReason.missingPack
          : LanguagePackFallbackReason.none,
      downloadProgress: 0,
      installedSizeMb: 0,
      requiredMb: entry.installedSizeMb,
      availableMb: 0,
      checksumVerified: false,
      installedAt: null,
      lastVerifiedAt: null,
      lastErrorAt: null,
      lastErrorCode: 'none',
      modelArtifactPath: 'none',
    );
  }

  Map<String, Object?> toMap() => {
    'pack_id': packId,
    'language_tag': languageTag,
    'engine': engine.wireName,
    'model_version': modelVersion,
    'install_state': installState.wireName,
    'runtime_mode': runtimeMode.wireName,
    'fallback_reason': fallbackReason.wireName,
    'download_progress': downloadProgress,
    'installed_size_mb': installedSizeMb,
    'required_mb': requiredMb,
    'available_mb': availableMb,
    'checksum_verified': checksumVerified,
    'installed_at': installedAt?.toUtc().toIso8601String() ?? 'none',
    'last_verified_at': lastVerifiedAt?.toUtc().toIso8601String() ?? 'none',
    'last_error_at': lastErrorAt?.toUtc().toIso8601String() ?? 'none',
    'last_error_code': lastErrorCode,
    'model_artifact_path': modelArtifactPath,
  };

  InstalledLanguagePack copyWith({
    InstalledLanguagePackState? installState,
    LanguagePackRuntimeMode? runtimeMode,
    LanguagePackFallbackReason? fallbackReason,
    int? downloadProgress,
    int? installedSizeMb,
    int? requiredMb,
    int? availableMb,
    bool? checksumVerified,
    DateTime? installedAt,
    DateTime? lastVerifiedAt,
    DateTime? lastErrorAt,
    String? lastErrorCode,
    String? modelArtifactPath,
  }) {
    return InstalledLanguagePack(
      packId: packId,
      languageTag: languageTag,
      engine: engine,
      modelVersion: modelVersion,
      installState: installState ?? this.installState,
      runtimeMode: runtimeMode ?? this.runtimeMode,
      fallbackReason: fallbackReason ?? this.fallbackReason,
      downloadProgress: downloadProgress ?? this.downloadProgress,
      installedSizeMb: installedSizeMb ?? this.installedSizeMb,
      requiredMb: requiredMb ?? this.requiredMb,
      availableMb: availableMb ?? this.availableMb,
      checksumVerified: checksumVerified ?? this.checksumVerified,
      installedAt: installedAt ?? this.installedAt,
      lastVerifiedAt: lastVerifiedAt ?? this.lastVerifiedAt,
      lastErrorAt: lastErrorAt ?? this.lastErrorAt,
      lastErrorCode: lastErrorCode ?? this.lastErrorCode,
      modelArtifactPath:
          modelArtifactPath == null
          ? this.modelArtifactPath
          : _optionalArtifactPath(modelArtifactPath),
    );
  }

  static String _optionalArtifactPath(Object? raw) {
    final value = raw is String ? raw.trim() : '';
    return value.isEmpty ? 'none' : value;
  }
}

class LanguagePackStorageDecision {
  const LanguagePackStorageDecision({
    required this.allowed,
    required this.requiredMb,
    required this.availableMb,
    required this.reason,
  });

  final bool allowed;
  final int requiredMb;
  final int availableMb;
  final LanguagePackFallbackReason reason;
}

class LanguagePackDeviceProfile {
  const LanguagePackDeviceProfile({
    required this.androidSdk,
    required this.primaryAbi,
    required this.totalCapacityMb,
    required this.freeSpaceMb,
    required this.ramMb,
  });

  final int androidSdk;
  final String primaryAbi;
  final int totalCapacityMb;
  final int freeSpaceMb;
  final int ramMb;
}

class LanguagePackInstallPreflightDecision {
  const LanguagePackInstallPreflightDecision({
    required this.allowed,
    required this.installState,
    required this.reason,
    required this.requiredMb,
    required this.availableMb,
    required this.errorCode,
  });

  final bool allowed;
  final InstalledLanguagePackState installState;
  final LanguagePackFallbackReason reason;
  final int requiredMb;
  final int availableMb;
  final String errorCode;
}

class LanguagePackStoragePolicy {
  const LanguagePackStoragePolicy._();

  static LanguagePackStorageDecision evaluate({
    required LanguagePackCatalogEntry entry,
    required int totalCapacityMb,
    required int freeSpaceMb,
  }) {
    final maxPackByCapacity = (totalCapacityMb * 0.05).floor();
    final requiredMb =
        (entry.downloadSizeMb * 3) > (entry.installedSizeMb + 1536)
        ? entry.downloadSizeMb * 3
        : entry.installedSizeMb + 1536;
    final allowed =
        entry.installedSizeMb <= maxPackByCapacity && freeSpaceMb >= requiredMb;
    return LanguagePackStorageDecision(
      allowed: allowed,
      requiredMb: requiredMb,
      availableMb: freeSpaceMb,
      reason: allowed
          ? LanguagePackFallbackReason.none
          : LanguagePackFallbackReason.insufficientStorage,
    );
  }
}

class LanguagePackInstallPreflight {
  const LanguagePackInstallPreflight._();

  static LanguagePackInstallPreflightDecision evaluate({
    required LanguagePackCatalogEntry entry,
    required LanguagePackDeviceProfile device,
  }) {
    if (!entry.isInstallable) {
      return const LanguagePackInstallPreflightDecision(
        allowed: false,
        installState: InstalledLanguagePackState.blockedIncompatibleDevice,
        reason: LanguagePackFallbackReason.unsupportedLanguage,
        requiredMb: 0,
        availableMb: 0,
        errorCode: 'pack_not_installable',
      );
    }
    if (device.androidSdk < entry.minAndroidSdk) {
      return LanguagePackInstallPreflightDecision(
        allowed: false,
        installState: InstalledLanguagePackState.blockedIncompatibleDevice,
        reason: LanguagePackFallbackReason.incompatibleDevice,
        requiredMb: entry.installedSizeMb,
        availableMb: device.freeSpaceMb,
        errorCode: 'blocked_min_android_sdk',
      );
    }
    if (!entry.supportedAbis.contains(device.primaryAbi)) {
      return LanguagePackInstallPreflightDecision(
        allowed: false,
        installState: InstalledLanguagePackState.blockedIncompatibleDevice,
        reason: LanguagePackFallbackReason.incompatibleDevice,
        requiredMb: entry.installedSizeMb,
        availableMb: device.freeSpaceMb,
        errorCode: 'blocked_unsupported_abi',
      );
    }
    if (device.ramMb < entry.minRamMb) {
      return LanguagePackInstallPreflightDecision(
        allowed: false,
        installState: InstalledLanguagePackState.blockedIncompatibleDevice,
        reason: LanguagePackFallbackReason.incompatibleDevice,
        requiredMb: entry.installedSizeMb,
        availableMb: device.freeSpaceMb,
        errorCode: 'blocked_min_ram',
      );
    }
    final storage = LanguagePackStoragePolicy.evaluate(
      entry: entry,
      totalCapacityMb: device.totalCapacityMb,
      freeSpaceMb: device.freeSpaceMb,
    );
    if (!storage.allowed) {
      return LanguagePackInstallPreflightDecision(
        allowed: false,
        installState: InstalledLanguagePackState.blockedInsufficientStorage,
        reason: storage.reason,
        requiredMb: storage.requiredMb,
        availableMb: storage.availableMb,
        errorCode: 'blocked_insufficient_storage',
      );
    }
    return LanguagePackInstallPreflightDecision(
      allowed: true,
      installState: InstalledLanguagePackState.queued,
      reason: LanguagePackFallbackReason.none,
      requiredMb: storage.requiredMb,
      availableMb: storage.availableMb,
      errorCode: 'none',
    );
  }
}

class LanguagePackCatalog {
  const LanguagePackCatalog({required this.entries});

  final List<LanguagePackCatalogEntry> entries;

  List<LanguagePackCatalogEntry> entriesForLanguage(String languageTag) {
    final normalized = languageTag.trim().toLowerCase();
    final language = normalized.split('-').first;
    return entries
        .where(
          (entry) =>
              entry.languageTag.toLowerCase() == normalized ||
              entry.languageTag.toLowerCase().split('-').first == language,
        )
        .toList(growable: false)
      ..sort((a, b) => b.priorityScore.compareTo(a.priorityScore));
  }

  LanguagePackCatalogEntry? recommendedForLanguage(String languageTag) {
    final candidates = entriesForLanguage(
      languageTag,
    ).where((entry) => entry.isInstallable).toList(growable: false);
    return candidates.isEmpty ? null : candidates.first;
  }
}

T _enumFromWire<T>(
  List<T> values,
  Object? value,
  String Function(T item) wireName,
  String field,
) {
  if (value is! String) {
    throw CatalogValidationException(
      'catalog_invalid_entry',
      '$field must be a string enum.',
    );
  }
  for (final item in values) {
    if (wireName(item) == value) {
      return item;
    }
  }
  throw CatalogValidationException(
    'catalog_invalid_entry',
    '$field has an unsupported value: $value.',
  );
}

Object? _required(Map<Object?, Object?> map, String field) {
  if (!map.containsKey(field)) {
    throw CatalogValidationException(
      'catalog_invalid_entry',
      'Missing required field: $field.',
    );
  }
  return map[field];
}

String _requiredString(Map<Object?, Object?> map, String field) {
  final value = _required(map, field);
  if (value is! String || value.trim().isEmpty) {
    throw CatalogValidationException(
      'catalog_invalid_entry',
      '$field must be a non-empty string.',
    );
  }
  return value.trim();
}

bool _requiredBool(Map<Object?, Object?> map, String field) {
  final value = _required(map, field);
  if (value is! bool) {
    throw CatalogValidationException(
      'catalog_invalid_entry',
      '$field must be a boolean.',
    );
  }
  return value;
}

int _requiredPositiveOrZeroInt(Map<Object?, Object?> map, String field) {
  final value = _required(map, field);
  if (value is! num || value < 0) {
    throw CatalogValidationException(
      'catalog_invalid_entry',
      '$field must be a positive integer or zero.',
    );
  }
  return value.toInt();
}

List<String> _requiredStringList(Map<Object?, Object?> map, String field) {
  final value = _required(map, field);
  if (value is! List) {
    throw CatalogValidationException(
      'catalog_invalid_entry',
      '$field must be a string list.',
    );
  }
  final result = value
      .whereType<String>()
      .map((item) => item.trim())
      .where((item) => item.isNotEmpty);
  final list = result.toList(growable: false);
  if (list.length != value.length) {
    throw CatalogValidationException(
      'catalog_invalid_entry',
      '$field must contain strings only.',
    );
  }
  return list;
}

DateTime _requiredDateTime(Map<Object?, Object?> map, String field) {
  final value = _requiredString(map, field);
  final parsed = DateTime.tryParse(value);
  if (parsed == null) {
    throw CatalogValidationException(
      'catalog_invalid_entry',
      '$field must be an ISO-8601 timestamp.',
    );
  }
  return parsed.toUtc();
}

DateTime? _optionalDateTime(Map<Object?, Object?> map, String field) {
  final value = _requiredString(map, field);
  if (value == 'none') {
    return null;
  }
  final parsed = DateTime.tryParse(value);
  if (parsed == null) {
    throw CatalogValidationException(
      'catalog_invalid_entry',
      '$field must be an ISO-8601 timestamp or none.',
    );
  }
  return parsed.toUtc();
}
