import 'dart:convert';

class KeyboardSyncPolicyV1 {
  const KeyboardSyncPolicyV1._();

  static const String id = 'keyboard_sync_v1';
  static const int schemaVersion = 1;
  static const int maxProfileBytes = 96 * 1024;

  static const Set<String> _allowedTopLevelKeys = {
    'preferences',
    'themeConfig',
    'cornerConfig',
    'statusBarConfig',
    'metadata',
  };

  static const Set<String> _blockedTopLevelKeys = {
    'recents',
    'clipboard',
    'clipboardHistory',
    'diagnostics',
    'rawVoiceArtifacts',
    'voiceArtifacts',
    'voiceRaw',
    'imageBytes',
    'imagePath',
    'localImagePath',
    'privatePaths',
    'token',
    'tokens',
    'secret',
    'secrets',
    'jwt',
    'accessToken',
    'refreshToken',
  };

  static const Set<String> _blockedAnyDepthKeyFragments = {
    'token',
    'secret',
    'clipboard',
    'diagnostic',
    'recent',
    'rawvoice',
    'voiceartifact',
    'privatepath',
    'imagebytes',
    'jwt',
  };

  static Map<String, Object?> sanitizePayload(Map<String, Object?> source) {
    final output = <String, Object?>{};
    for (final entry in source.entries) {
      if (!_allowedTopLevelKeys.contains(entry.key) ||
          _blockedTopLevelKeys.contains(entry.key)) {
        continue;
      }
      final sanitized = _sanitizeValue(entry.value, keyHint: entry.key);
      if (sanitized != null) {
        output[entry.key] = sanitized;
      }
    }
    return output;
  }

  static Object? _sanitizeValue(Object? value, {String keyHint = ''}) {
    if (value == null) {
      return null;
    }
    if (value is bool || value is num) {
      return value;
    }
    if (value is String) {
      return _sanitizeString(value, keyHint: keyHint);
    }
    if (value is List) {
      final list = <Object?>[];
      for (final item in value) {
        final sanitized = _sanitizeValue(item, keyHint: keyHint);
        if (sanitized != null) {
          list.add(sanitized);
        }
      }
      return list;
    }
    if (value is Map) {
      final normalized = <String, Object?>{};
      for (final entry in value.entries) {
        final key = entry.key.toString();
        if (_isForbiddenKey(key)) {
          continue;
        }
        final sanitized = _sanitizeValue(entry.value, keyHint: key);
        if (sanitized != null) {
          normalized[key] = sanitized;
        }
      }
      if (keyHint == 'cornerConfig') {
        return _sanitizeCornerConfig(normalized);
      }
      if (keyHint == 'themeConfig') {
        return _sanitizeThemeConfig(normalized);
      }
      return normalized;
    }
    return null;
  }

  static bool _isForbiddenKey(String key) {
    final lowered = key.toLowerCase();
    for (final fragment in _blockedAnyDepthKeyFragments) {
      if (lowered.contains(fragment)) {
        return true;
      }
    }
    return false;
  }

  static String? _sanitizeString(String value, {required String keyHint}) {
    final loweredKey = keyHint.toLowerCase();
    final loweredValue = value.toLowerCase();
    if (loweredKey.contains('path') ||
        loweredValue.startsWith('/storage/') ||
        loweredValue.startsWith('/data/') ||
        loweredValue.startsWith('file://') ||
        loweredValue.startsWith('/sdcard/')) {
      return null;
    }
    return value;
  }

  static Map<String, Object?> _sanitizeThemeConfig(Map<String, Object?> input) {
    final output = Map<String, Object?>.from(input);
    output.remove('imagePath');
    output.remove('localImagePath');
    output.remove('backgroundImagePath');
    output.remove('imageBytes');
    output.remove('backgroundImageBytes');
    output.remove('imageBase64');
    if (output.containsKey('useImage')) {
      output['useImage'] = false;
    }
    if (output.containsKey('themeBackgroundSource')) {
      output['themeBackgroundSource'] = 'solid';
    }
    return output;
  }

  static Map<String, Object?> _sanitizeCornerConfig(
    Map<String, Object?> input,
  ) {
    final output = Map<String, Object?>.from(input);
    final overrides = output['overrides'];
    if (overrides is! List) {
      return output;
    }
    final sanitizedOverrides = <Object?>[];
    for (final entry in overrides) {
      if (entry is! Map) {
        continue;
      }
      final shortcut = <String, Object?>{};
      final keyId = entry['keyId']?.toString();
      final slot = entry['slot']?.toString();
      final disabled = entry['disabled'] == true;
      final sensitive = entry['sensitive'] == true;
      final expression = entry['expression']?.toString() ?? '';
      final hasSensitiveExpression = _looksSensitiveExpression(expression);
      if (keyId != null && keyId.isNotEmpty) {
        shortcut['keyId'] = keyId;
      }
      if (slot != null && slot.isNotEmpty) {
        shortcut['slot'] = slot;
      }
      if (sensitive || hasSensitiveExpression) {
        shortcut['disabled'] = true;
        shortcut['sensitive'] = true;
        shortcut['redacted'] = true;
      } else {
        shortcut['disabled'] = disabled;
        shortcut['sensitive'] = false;
        if (!disabled && expression.isNotEmpty) {
          shortcut['expression'] = expression;
        }
        final label = entry['label']?.toString().trim();
        if (label != null && label.isNotEmpty) {
          shortcut['label'] = label;
        }
      }
      sanitizedOverrides.add(shortcut);
    }
    output['overrides'] = sanitizedOverrides;
    return output;
  }

  static bool _looksSensitiveExpression(String expression) {
    final lowered = expression.toLowerCase();
    return lowered.contains('clipboard') ||
        lowered.contains('snippet') ||
        lowered.contains('voice') ||
        lowered.contains('token') ||
        lowered.contains('secret') ||
        lowered.contains('/storage/') ||
        lowered.contains('/data/') ||
        lowered.contains('file://');
  }

  static int estimatePayloadBytes(Map<String, Object?> payload) {
    return utf8.encode(jsonEncode(payload)).length;
  }
}

class KeyboardSyncPolicyV2 {
  const KeyboardSyncPolicyV2._();

  static const String id = 'keyboard_sync_v2';
  static const int schemaVersion = 2;
  static const int maxProfileBytes = KeyboardSyncPolicyV1.maxProfileBytes;

  static Map<String, Object?> sanitizePayload(Map<String, Object?> source) {
    final sanitized = Map<String, Object?>.from(
      KeyboardSyncPolicyV1.sanitizePayload(source),
    );
    final themeAsset = source['themeAsset'];
    if (themeAsset is Map) {
      final normalizedAsset = _sanitizeThemeAsset(themeAsset);
      if (normalizedAsset != null) {
        sanitized['themeAsset'] = normalizedAsset;
        final themeConfig = Map<String, Object?>.from(
          (sanitized['themeConfig'] as Map?)?.cast<String, Object?>() ??
              const <String, Object?>{},
        );
        themeConfig['useImage'] = true;
        themeConfig['themeBackgroundSource'] = 'image';
        sanitized['themeConfig'] = themeConfig;
      }
    }
    return sanitized;
  }

  static Map<String, Object?>? _sanitizeThemeAsset(Map source) {
    final assetId = _boundedString(source['assetId'], maxLength: 96);
    final storagePath = _boundedString(source['storagePath'], maxLength: 256);
    final checksum = _boundedString(source['checksum'], maxLength: 128);
    final mimeType = _boundedString(source['mimeType'], maxLength: 64);
    final createdAt = _boundedString(source['createdAt'], maxLength: 64);
    final updatedAt = _boundedString(source['updatedAt'], maxLength: 64);
    if (assetId == null ||
        storagePath == null ||
        checksum == null ||
        mimeType == null ||
        createdAt == null ||
        updatedAt == null) {
      return null;
    }
    if (storagePath.contains('..') ||
        storagePath.startsWith('/') ||
        storagePath.startsWith('file://') ||
        storagePath.startsWith('http://') ||
        storagePath.startsWith('https://')) {
      return null;
    }
    if (!(mimeType == 'image/png' ||
        mimeType == 'image/jpeg' ||
        mimeType == 'image/webp')) {
      return null;
    }
    final byteSize = _boundedInt(source['byteSize'], min: 1, max: 8 * 1024 * 1024);
    final profileRevision = _boundedInt(
      source['profileRevision'],
      min: 0,
      max: 1000000,
    );
    final width = _nullableBoundedInt(source['width'], min: 1, max: 4096);
    final height = _nullableBoundedInt(source['height'], min: 1, max: 4096);
    if (byteSize == null || profileRevision == null) {
      return null;
    }
    final tombstonedAt = _boundedString(source['tombstonedAt'], maxLength: 64);
    final result = <String, Object?>{
      'assetId': assetId,
      'storagePath': storagePath,
      'checksum': checksum,
      'byteSize': byteSize,
      'mimeType': mimeType,
      'profileRevision': profileRevision,
      'createdAt': createdAt,
      'updatedAt': updatedAt,
    };
    if (width != null) {
      result['width'] = width;
    }
    if (height != null) {
      result['height'] = height;
    }
    if (tombstonedAt != null) {
      result['tombstonedAt'] = tombstonedAt;
    }
    return result;
  }

  static int estimatePayloadBytes(Map<String, Object?> payload) {
    return utf8.encode(jsonEncode(payload)).length;
  }

  static String? _boundedString(Object? value, {required int maxLength}) {
    if (value is! String) {
      return null;
    }
    final normalized = value.trim();
    if (normalized.isEmpty || normalized.length > maxLength) {
      return null;
    }
    return normalized;
  }

  static int? _boundedInt(
    Object? value, {
    required int min,
    required int max,
  }) {
    final intValue = switch (value) {
      int() => value,
      num() => value.toInt(),
      _ => null,
    };
    if (intValue == null || intValue < min || intValue > max) {
      return null;
    }
    return intValue;
  }

  static int? _nullableBoundedInt(
    Object? value, {
    required int min,
    required int max,
  }) {
    if (value == null) {
      return null;
    }
    return _boundedInt(value, min: min, max: max);
  }
}
