import 'dart:convert';

import 'package:crypto/crypto.dart';

import 'keyboard_sync_policy.dart';

enum KeyboardSyncValidationVerdict {
  valid,
  invalidSchemaVersion,
  invalidPayload,
  invalidChecksum,
  oversizedPayload,
}

class KeyboardSyncValidationResult {
  const KeyboardSyncValidationResult({
    required this.verdict,
    required this.errors,
  });

  final KeyboardSyncValidationVerdict verdict;
  final List<String> errors;

  bool get isValid => verdict == KeyboardSyncValidationVerdict.valid;
}

class KeyboardThemeAssetManifest {
  const KeyboardThemeAssetManifest({
    required this.assetId,
    required this.storagePath,
    required this.checksum,
    required this.byteSize,
    required this.mimeType,
    required this.profileRevision,
    required this.createdAt,
    required this.updatedAt,
    this.width,
    this.height,
    this.tombstonedAt,
  });

  final String assetId;
  final String storagePath;
  final String checksum;
  final int byteSize;
  final String mimeType;
  final int profileRevision;
  final String createdAt;
  final String updatedAt;
  final int? width;
  final int? height;
  final String? tombstonedAt;

  bool get isTombstoned => tombstonedAt?.trim().isNotEmpty ?? false;

  Map<String, Object?> toMap() {
    return <String, Object?>{
      'assetId': assetId,
      'storagePath': storagePath,
      'checksum': checksum,
      'byteSize': byteSize,
      'mimeType': mimeType,
      'profileRevision': profileRevision,
      'createdAt': createdAt,
      'updatedAt': updatedAt,
      if (width != null) 'width': width,
      if (height != null) 'height': height,
      if (tombstonedAt != null) 'tombstonedAt': tombstonedAt,
    };
  }

  KeyboardThemeAssetManifest copyWith({
    String? assetId,
    String? storagePath,
    String? checksum,
    int? byteSize,
    String? mimeType,
    int? profileRevision,
    String? createdAt,
    String? updatedAt,
    int? width,
    int? height,
    String? tombstonedAt,
  }) {
    return KeyboardThemeAssetManifest(
      assetId: assetId ?? this.assetId,
      storagePath: storagePath ?? this.storagePath,
      checksum: checksum ?? this.checksum,
      byteSize: byteSize ?? this.byteSize,
      mimeType: mimeType ?? this.mimeType,
      profileRevision: profileRevision ?? this.profileRevision,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      width: width ?? this.width,
      height: height ?? this.height,
      tombstonedAt: tombstonedAt ?? this.tombstonedAt,
    );
  }

  static KeyboardThemeAssetManifest? fromMap(Object? raw) {
    if (raw is! Map) {
      return null;
    }
    final wrapped = KeyboardSyncPolicyV2.sanitizePayload({
      'themeAsset': Map<String, Object?>.from(raw),
    });
    final normalized = wrapped['themeAsset'];
    if (normalized is! Map) {
      return null;
    }
    return KeyboardThemeAssetManifest(
      assetId: normalized['assetId'] as String,
      storagePath: normalized['storagePath'] as String,
      checksum: normalized['checksum'] as String,
      byteSize: (normalized['byteSize'] as num).toInt(),
      mimeType: normalized['mimeType'] as String,
      profileRevision: (normalized['profileRevision'] as num).toInt(),
      createdAt: normalized['createdAt'] as String,
      updatedAt: normalized['updatedAt'] as String,
      width: (normalized['width'] as num?)?.toInt(),
      height: (normalized['height'] as num?)?.toInt(),
      tombstonedAt: normalized['tombstonedAt'] as String?,
    );
  }
}

class KeyboardSyncProfile {
  const KeyboardSyncProfile({
    required this.schemaVersion,
    required this.profileRevision,
    required this.baseCloudRevision,
    required this.updatedAt,
    required this.updatedByDeviceId,
    required this.sourcePlatform,
    required this.sanitizationPolicy,
    required this.checksum,
    required this.payload,
  });

  final int schemaVersion;
  final int profileRevision;
  final int baseCloudRevision;
  final String updatedAt;
  final String updatedByDeviceId;
  final String sourcePlatform;
  final String sanitizationPolicy;
  final String checksum;
  final Map<String, Object?> payload;

  KeyboardThemeAssetManifest? get themeAsset =>
      KeyboardThemeAssetManifest.fromMap(payload['themeAsset']);

  factory KeyboardSyncProfile.sanitized({
    required int profileRevision,
    required int baseCloudRevision,
    required String updatedAt,
    required String updatedByDeviceId,
    required String sourcePlatform,
    required Map<String, Object?> rawPayload,
  }) {
    final sanitized = KeyboardSyncPolicyV2.sanitizePayload(rawPayload);
    final checksum = computeChecksum(
      schemaVersion: KeyboardSyncPolicyV2.schemaVersion,
      profileRevision: profileRevision,
      baseCloudRevision: baseCloudRevision,
      updatedAt: updatedAt,
      updatedByDeviceId: updatedByDeviceId,
      sourcePlatform: sourcePlatform,
      sanitizationPolicy: KeyboardSyncPolicyV2.id,
      payload: sanitized,
    );
    return KeyboardSyncProfile(
      schemaVersion: KeyboardSyncPolicyV2.schemaVersion,
      profileRevision: profileRevision,
      baseCloudRevision: baseCloudRevision,
      updatedAt: updatedAt,
      updatedByDeviceId: updatedByDeviceId,
      sourcePlatform: sourcePlatform,
      sanitizationPolicy: KeyboardSyncPolicyV2.id,
      checksum: checksum,
      payload: sanitized,
    );
  }

  static KeyboardSyncProfile fromMap(Map<String, Object?> map) {
    return KeyboardSyncProfile(
      schemaVersion: (map['schemaVersion'] as num?)?.toInt() ?? -1,
      profileRevision: (map['profileRevision'] as num?)?.toInt() ?? 0,
      baseCloudRevision: (map['baseCloudRevision'] as num?)?.toInt() ?? 0,
      updatedAt: map['updatedAt'] as String? ?? '',
      updatedByDeviceId: map['updatedByDeviceId'] as String? ?? '',
      sourcePlatform: map['sourcePlatform'] as String? ?? 'unknown',
      sanitizationPolicy:
          map['sanitizationPolicy'] as String? ?? KeyboardSyncPolicyV2.id,
      checksum: map['checksum'] as String? ?? '',
      payload: (map['payload'] is Map)
          ? Map<String, Object?>.from(map['payload'] as Map)
          : const <String, Object?>{},
    );
  }

  Map<String, Object?> toMap() {
    return {
      'schemaVersion': schemaVersion,
      'profileRevision': profileRevision,
      'baseCloudRevision': baseCloudRevision,
      'updatedAt': updatedAt,
      'updatedByDeviceId': updatedByDeviceId,
      'sourcePlatform': sourcePlatform,
      'sanitizationPolicy': sanitizationPolicy,
      'checksum': checksum,
      'payload': payload,
    };
  }

  KeyboardSyncProfile copyWith({
    int? schemaVersion,
    int? profileRevision,
    int? baseCloudRevision,
    String? updatedAt,
    String? updatedByDeviceId,
    String? sourcePlatform,
    String? sanitizationPolicy,
    String? checksum,
    Map<String, Object?>? payload,
    bool recomputeChecksum = false,
  }) {
    final nextSchemaVersion = schemaVersion ?? this.schemaVersion;
    final nextProfileRevision = profileRevision ?? this.profileRevision;
    final nextBaseCloudRevision = baseCloudRevision ?? this.baseCloudRevision;
    final nextUpdatedAt = updatedAt ?? this.updatedAt;
    final nextUpdatedByDeviceId = updatedByDeviceId ?? this.updatedByDeviceId;
    final nextSourcePlatform = sourcePlatform ?? this.sourcePlatform;
    final nextSanitizationPolicy =
        sanitizationPolicy ?? this.sanitizationPolicy;
    final nextPayload = payload ?? this.payload;
    final nextChecksum = recomputeChecksum
        ? computeChecksum(
            schemaVersion: nextSchemaVersion,
            profileRevision: nextProfileRevision,
            baseCloudRevision: nextBaseCloudRevision,
            updatedAt: nextUpdatedAt,
            updatedByDeviceId: nextUpdatedByDeviceId,
            sourcePlatform: nextSourcePlatform,
            sanitizationPolicy: nextSanitizationPolicy,
            payload: nextPayload,
          )
        : checksum ?? this.checksum;
    return KeyboardSyncProfile(
      schemaVersion: nextSchemaVersion,
      profileRevision: nextProfileRevision,
      baseCloudRevision: nextBaseCloudRevision,
      updatedAt: nextUpdatedAt,
      updatedByDeviceId: nextUpdatedByDeviceId,
      sourcePlatform: nextSourcePlatform,
      sanitizationPolicy: nextSanitizationPolicy,
      checksum: nextChecksum,
      payload: nextPayload,
    );
  }

  KeyboardSyncProfile withThemeAsset(KeyboardThemeAssetManifest? asset) {
    final nextPayload = Map<String, Object?>.from(payload);
    final nextThemeConfig = Map<String, Object?>.from(
      (nextPayload['themeConfig'] as Map?)?.cast<String, Object?>() ??
          const <String, Object?>{},
    );
    if (asset == null) {
      nextPayload.remove('themeAsset');
      if (nextThemeConfig.isNotEmpty) {
        nextThemeConfig['useImage'] = false;
        nextThemeConfig['themeBackgroundSource'] = 'solid';
        nextPayload['themeConfig'] = nextThemeConfig;
      }
      return copyWith(payload: nextPayload, recomputeChecksum: true);
    }
    nextPayload['themeAsset'] = asset.toMap();
    nextThemeConfig['useImage'] = true;
    nextThemeConfig['themeBackgroundSource'] = 'image';
    nextPayload['themeConfig'] = nextThemeConfig;
    return copyWith(
      payload: nextPayload,
      profileRevision: asset.profileRevision,
      recomputeChecksum: true,
    );
  }

  KeyboardSyncValidationResult validate() {
    if (!_matchesDeclaredPolicy()) {
      return const KeyboardSyncValidationResult(
        verdict: KeyboardSyncValidationVerdict.invalidSchemaVersion,
        errors: ['Unsupported keyboard sync schemaVersion'],
      );
    }

    final sanitizedPayload = _sanitizeByPolicy(payload);
    if (!_deepEquals(payload, sanitizedPayload)) {
      return const KeyboardSyncValidationResult(
        verdict: KeyboardSyncValidationVerdict.invalidPayload,
        errors: ['Payload contains unsafe or forbidden fields'],
      );
    }

    final payloadBytes = _estimatePayloadBytes(payload);
    if (payloadBytes > _maxProfileBytes) {
      return KeyboardSyncValidationResult(
        verdict: KeyboardSyncValidationVerdict.oversizedPayload,
        errors: ['Payload exceeds size budget $_maxProfileBytes'],
      );
    }

    final expectedChecksum = computeChecksum(
      schemaVersion: schemaVersion,
      profileRevision: profileRevision,
      baseCloudRevision: baseCloudRevision,
      updatedAt: updatedAt,
      updatedByDeviceId: updatedByDeviceId,
      sourcePlatform: sourcePlatform,
      sanitizationPolicy: sanitizationPolicy,
      payload: payload,
    );
    if (expectedChecksum != checksum) {
      return const KeyboardSyncValidationResult(
        verdict: KeyboardSyncValidationVerdict.invalidChecksum,
        errors: ['Checksum mismatch'],
      );
    }

    return const KeyboardSyncValidationResult(
      verdict: KeyboardSyncValidationVerdict.valid,
      errors: <String>[],
    );
  }

  static String computeChecksum({
    required int schemaVersion,
    required int profileRevision,
    required int baseCloudRevision,
    required String updatedAt,
    required String updatedByDeviceId,
    required String sourcePlatform,
    required String sanitizationPolicy,
    required Map<String, Object?> payload,
  }) {
    final canonical = _canonicalJsonString({
      'schemaVersion': schemaVersion,
      'profileRevision': profileRevision,
      'baseCloudRevision': baseCloudRevision,
      'updatedAt': updatedAt,
      'updatedByDeviceId': updatedByDeviceId,
      'sourcePlatform': sourcePlatform,
      'sanitizationPolicy': sanitizationPolicy,
      'payload': payload,
    });
    return sha256.convert(utf8.encode(canonical)).toString();
  }

  static String _canonicalJsonString(Object? value) {
    return jsonEncode(_canonicalize(value));
  }

  static Object? _canonicalize(Object? value) {
    if (value is Map) {
      final entries = value.entries.toList()
        ..sort((a, b) => a.key.toString().compareTo(b.key.toString()));
      final map = <String, Object?>{};
      for (final entry in entries) {
        map[entry.key.toString()] = _canonicalize(entry.value);
      }
      return map;
    }
    if (value is List) {
      return value.map(_canonicalize).toList(growable: false);
    }
    return value;
  }

  static bool _deepEquals(Object? a, Object? b) {
    if (a == b) {
      return true;
    }
    if (a is Map && b is Map) {
      if (a.length != b.length) {
        return false;
      }
      for (final key in a.keys) {
        if (!b.containsKey(key) || !_deepEquals(a[key], b[key])) {
          return false;
        }
      }
      return true;
    }
    if (a is List && b is List) {
      if (a.length != b.length) {
        return false;
      }
      for (var i = 0; i < a.length; i++) {
        if (!_deepEquals(a[i], b[i])) {
          return false;
        }
      }
      return true;
    }
    return false;
  }

  bool _matchesDeclaredPolicy() {
    return switch ((schemaVersion, sanitizationPolicy)) {
      (KeyboardSyncPolicyV1.schemaVersion, KeyboardSyncPolicyV1.id) => true,
      (KeyboardSyncPolicyV2.schemaVersion, KeyboardSyncPolicyV2.id) => true,
      _ => false,
    };
  }

  Map<String, Object?> _sanitizeByPolicy(Map<String, Object?> source) {
    if (sanitizationPolicy == KeyboardSyncPolicyV1.id) {
      return KeyboardSyncPolicyV1.sanitizePayload(source);
    }
    return KeyboardSyncPolicyV2.sanitizePayload(source);
  }

  int _estimatePayloadBytes(Map<String, Object?> source) {
    if (sanitizationPolicy == KeyboardSyncPolicyV1.id) {
      return KeyboardSyncPolicyV1.estimatePayloadBytes(source);
    }
    return KeyboardSyncPolicyV2.estimatePayloadBytes(source);
  }

  int get _maxProfileBytes {
    return sanitizationPolicy == KeyboardSyncPolicyV1.id
        ? KeyboardSyncPolicyV1.maxProfileBytes
        : KeyboardSyncPolicyV2.maxProfileBytes;
  }
}
