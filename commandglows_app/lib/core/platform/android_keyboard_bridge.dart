import 'package:flutter/services.dart';
import 'package:uuid/uuid.dart';

import '../../features/clipboard/domain/clipboard_capture_event.dart';
import '../../features/custom_action_buttons/domain/custom_action_buttons.dart';
import '../../features/keyboard/domain/keyboard_models.dart';
import '../../features/keyboard/domain/keyboard_sync_models.dart';
import '../../features/keyboard/data/local_keyboard_sync_queue_store.dart';
import 'platform_capabilities.dart';

class AndroidKeyboardBridgeException implements Exception {
  const AndroidKeyboardBridgeException({
    required this.code,
    required this.message,
    this.details,
  });

  final String code;
  final String message;
  final Object? details;

  @override
  String toString() => 'AndroidKeyboardBridgeException($code): $message';
}

class AndroidKeyboardBridge {
  AndroidKeyboardBridge._();

  static const MethodChannel _channel = MethodChannel('commandglows_app/keyboard');
  static const Uuid _uuid = Uuid();

  static Future<AndroidKeyboardStatus> getStatus() async {
    if (!PlatformCapabilities.keyboardImeSupported) {
      return AndroidKeyboardStatus.unsupported();
    }
    final raw = await _invoke<Map<Object?, Object?>>('getKeyboardStatus');
    return AndroidKeyboardStatus.fromMap(raw ?? const {});
  }

  static Future<KeyboardStatusBarConfig> getStatusBarConfig() async {
    if (!PlatformCapabilities.keyboardImeSupported) {
      return KeyboardStatusBarConfig.defaults();
    }
    final raw = await _invoke<Map<Object?, Object?>>(
      'getKeyboardStatusBarConfig',
    );
    return KeyboardStatusBarConfig.fromMap(raw ?? const {});
  }

  static Future<KeyboardStatusBarConfig> setStatusBarConfig(
    KeyboardStatusBarConfig config,
  ) async {
    if (!PlatformCapabilities.keyboardImeSupported) {
      throw AndroidKeyboardBridgeException(
        code: 'KEYBOARD_UNSUPPORTED',
        message: PlatformCapabilities.keyboardImeUnavailableReason,
      );
    }
    final raw = await _invoke<Map<Object?, Object?>>(
      'setKeyboardStatusBarConfig',
      config.toMap(),
    );
    return KeyboardStatusBarConfig.fromMap(raw ?? const {});
  }

  static Future<KeyboardStatusBarConfig> resetStatusBarConfig() async {
    if (!PlatformCapabilities.keyboardImeSupported) {
      return KeyboardStatusBarConfig.defaults();
    }
    final raw = await _invoke<Map<Object?, Object?>>(
      'resetKeyboardStatusBarConfig',
    );
    return KeyboardStatusBarConfig.fromMap(raw ?? const {});
  }

  static Future<void> setKeyboardUserContext({
    String? accountLabel,
    String? accountLabelMode,
    int? tipsLastResetAtMs,
  }) async {
    if (!PlatformCapabilities.keyboardImeSupported) {
      return;
    }
    await _invoke<void>('setKeyboardUserContext', {
      'accountLabel': accountLabel,
      'accountLabelMode': accountLabelMode,
      'tipsLastResetAtMs': tipsLastResetAtMs,
    });
  }

  static Future<AndroidKeyboardStatus> clearDiagnostics() async {
    if (!PlatformCapabilities.keyboardImeSupported) {
      return AndroidKeyboardStatus.unsupported();
    }
    final raw = await _invoke<Map<Object?, Object?>>(
      'clearKeyboardDiagnostics',
    );
    return AndroidKeyboardStatus.fromMap(raw ?? const {});
  }

  static Future<List<AndroidKeyboardNavigationDiagnosticEntry>>
  getNavigationDiagnostics() async {
    if (!PlatformCapabilities.keyboardImeSupported) {
      return const <AndroidKeyboardNavigationDiagnosticEntry>[];
    }
    final raw = await _invoke<List<Object?>>(
      'getKeyboardNavigationDiagnostics',
    );
    if (raw == null) {
      return const <AndroidKeyboardNavigationDiagnosticEntry>[];
    }
    return raw
        .whereType<Map<Object?, Object?>>()
        .map(AndroidKeyboardNavigationDiagnosticEntry.fromMap)
        .toList(growable: false);
  }

  static Future<void> clearNavigationDiagnostics() async {
    if (!PlatformCapabilities.keyboardImeSupported) {
      return;
    }
    await _invoke<void>('clearKeyboardNavigationDiagnostics');
  }

  static Future<AndroidKeyboardCornerConfig> getCornerConfig() async {
    if (!PlatformCapabilities.keyboardImeSupported) {
      return AndroidKeyboardCornerConfig.defaults();
    }
    final raw = await _invoke<Map<Object?, Object?>>('getKeyboardCornerConfig');
    return AndroidKeyboardCornerConfig.fromMap(raw ?? const {});
  }

  static Future<AndroidKeyboardCornerConfig> setCornerConfig(
    AndroidKeyboardCornerConfig config,
  ) async {
    if (!PlatformCapabilities.keyboardImeSupported) {
      throw AndroidKeyboardBridgeException(
        code: 'KEYBOARD_UNSUPPORTED',
        message: PlatformCapabilities.keyboardImeUnavailableReason,
      );
    }
    final raw = await _invoke<Map<Object?, Object?>>(
      'setKeyboardCornerConfig',
      config.toMap(),
    );
    return AndroidKeyboardCornerConfig.fromMap(raw ?? const {});
  }

  static Future<AndroidKeyboardCornerConfig> setCornerPreset(
    String presetId,
  ) async {
    if (!PlatformCapabilities.keyboardImeSupported) {
      throw AndroidKeyboardBridgeException(
        code: 'KEYBOARD_UNSUPPORTED',
        message: PlatformCapabilities.keyboardImeUnavailableReason,
      );
    }
    final raw = await _invoke<Map<Object?, Object?>>(
      'setKeyboardCornerPreset',
      {'presetId': presetId},
    );
    return AndroidKeyboardCornerConfig.fromMap(raw ?? const {});
  }

  static Future<AndroidKeyboardCornerConfig> resetCornerConfig() async {
    if (!PlatformCapabilities.keyboardImeSupported) {
      return AndroidKeyboardCornerConfig.defaults();
    }
    final raw = await _invoke<Map<Object?, Object?>>(
      'resetKeyboardCornerConfig',
    );
    return AndroidKeyboardCornerConfig.fromMap(raw ?? const {});
  }

  static Future<void> openInputMethodSettings() async {
    if (!PlatformCapabilities.keyboardImeSupported) {
      throw AndroidKeyboardBridgeException(
        code: 'KEYBOARD_UNSUPPORTED',
        message: PlatformCapabilities.keyboardImeUnavailableReason,
      );
    }
    await _invoke<void>('openInputMethodSettings');
  }

  static Future<void> showInputMethodPicker() async {
    if (!PlatformCapabilities.keyboardImeSupported) {
      throw AndroidKeyboardBridgeException(
        code: 'KEYBOARD_UNSUPPORTED',
        message: PlatformCapabilities.keyboardImeUnavailableReason,
      );
    }
    await _invoke<void>('showInputMethodPicker');
  }

  static Future<void> openNotificationListenerSettings() async {
    if (!PlatformCapabilities.keyboardImeSupported) {
      throw AndroidKeyboardBridgeException(
        code: 'KEYBOARD_UNSUPPORTED',
        message: PlatformCapabilities.keyboardImeUnavailableReason,
      );
    }
    await _invoke<void>('openNotificationListenerSettings');
  }

  static Future<void> openWriteSettingsPermission() async {
    if (!PlatformCapabilities.keyboardImeSupported) {
      throw AndroidKeyboardBridgeException(
        code: 'KEYBOARD_UNSUPPORTED',
        message: PlatformCapabilities.keyboardImeUnavailableReason,
      );
    }
    await _invoke<void>('openWriteSettingsPermission');
  }

  static Future<AndroidKeyboardStatus> setPreferences({
    required bool voiceEnabled,
    required bool customActionBarEnabled,
    required bool clipboardSyncDesired,
    required bool clipboardSensitiveFieldHistoryEnabled,
    required bool mediaControlsEnabled,
    required int mediaVolumeStepPercent,
    required int mediaBrightnessStepPercent,
    String? themeMode,
    required KeyboardLayoutProfile layoutProfile,
    required bool cornerModeEnabled,
    required bool debugTouchOverlayEnabled,
    required bool keyVibrationEnabled,
    required int keyVibrationIntensity,
    required bool keySoundEnabled,
    required bool spellingSuggestionsEnabled,
    required bool specialKeyCornersEnabled,
    required bool frenchLanguageEnabled,
    required bool englishLanguageEnabled,
    required bool doubleSpacePeriodEnabled,
    required bool punctuationAutoSpacingEnabled,
    required double keyboardHeightScale,
    required double actionRowHeightScale,
    required bool compactModeEnabled,
    required bool autoCloseModesEnabled,
    required KeyboardPrivacyMode privacyMode,
  }) async {
    if (!PlatformCapabilities.keyboardImeSupported) {
      throw AndroidKeyboardBridgeException(
        code: 'KEYBOARD_UNSUPPORTED',
        message: PlatformCapabilities.keyboardImeUnavailableReason,
      );
    }
    final raw = await _invoke<Map<Object?, Object?>>('setKeyboardPreferences', {
      'voiceEnabled': voiceEnabled,
      'customActionBarEnabled': customActionBarEnabled,
      'clipboardSyncDesired': clipboardSyncDesired,
      'clipboardSensitiveFieldHistoryEnabled':
          clipboardSensitiveFieldHistoryEnabled,
      'mediaControlsEnabled': mediaControlsEnabled,
      'mediaVolumeStepPercent': mediaVolumeStepPercent.clamp(1, 20).toInt(),
      'mediaBrightnessStepPercent': mediaBrightnessStepPercent
          .clamp(1, 20)
          .toInt(),
      'themeMode': themeMode,
      'layoutProfile': layoutProfile.name,
      'cornerModeEnabled': cornerModeEnabled,
      'debugTouchOverlayEnabled': debugTouchOverlayEnabled,
      'keyVibrationEnabled': keyVibrationEnabled,
      'keyVibrationIntensity': keyVibrationIntensity.clamp(0, 3).toInt(),
      'keySoundEnabled': keySoundEnabled,
      'spellingSuggestionsEnabled': spellingSuggestionsEnabled,
      'specialKeyCornersEnabled': specialKeyCornersEnabled,
      'frenchLanguageEnabled': frenchLanguageEnabled,
      'englishLanguageEnabled': englishLanguageEnabled,
      'doubleSpacePeriodEnabled': doubleSpacePeriodEnabled,
      'punctuationAutoSpacingEnabled': punctuationAutoSpacingEnabled,
      'keyboardHeightScale': keyboardHeightScale,
      'actionRowHeightScale': _normalizeActionRowHeightScale(
        actionRowHeightScale,
      ),
      'compactModeEnabled': compactModeEnabled,
      'autoCloseModesEnabled': autoCloseModesEnabled,
      'privacyMode': privacyMode.name,
    });
    return AndroidKeyboardStatus.fromMap(raw ?? const {});
  }

  static Future<AndroidKeyboardStatus> setCustomActionBarConfig(
    CustomActionButtonImeConfig config,
  ) async {
    if (!PlatformCapabilities.keyboardImeSupported) {
      throw AndroidKeyboardBridgeException(
        code: 'KEYBOARD_UNSUPPORTED',
        message: PlatformCapabilities.keyboardImeUnavailableReason,
      );
    }
    final raw = await _invoke<Map<Object?, Object?>>(
      'setKeyboardCustomActionBarConfig',
      config.toMap(),
    );
    return AndroidKeyboardStatus.fromMap(raw ?? const {});
  }

  static double _normalizeActionRowHeightScale(double value) {
    if (value < 0.50) {
      return 1 / 3;
    }
    if (value < 0.84) {
      return 2 / 3;
    }
    return 1;
  }

  static Future<AndroidKeyboardStatus> setThemeMode(String themeMode) async {
    if (!PlatformCapabilities.keyboardImeSupported) {
      throw AndroidKeyboardBridgeException(
        code: 'KEYBOARD_UNSUPPORTED',
        message: PlatformCapabilities.keyboardImeUnavailableReason,
      );
    }
    final raw = await _invoke<Map<Object?, Object?>>('setKeyboardThemeMode', {
      'themeMode': themeMode,
    });
    return AndroidKeyboardStatus.fromMap(raw ?? const {});
  }

  static Future<KeyboardThemeConfig> getKeyboardThemeConfig() async {
    if (!PlatformCapabilities.keyboardImeSupported) {
      return KeyboardThemeConfig.defaults();
    }
    final raw = await _invoke<Map<Object?, Object?>>('getKeyboardThemeConfig');
    return KeyboardThemeConfig.fromMap(raw ?? const {});
  }

  static Future<KeyboardThemeConfig> setKeyboardThemeConfig(
    KeyboardThemeConfig config,
  ) async {
    if (!PlatformCapabilities.keyboardImeSupported) {
      throw AndroidKeyboardBridgeException(
        code: 'KEYBOARD_UNSUPPORTED',
        message: PlatformCapabilities.keyboardImeUnavailableReason,
      );
    }
    final raw = await _invoke<Map<Object?, Object?>>(
      'setKeyboardThemeConfig',
      config.toMap(),
    );
    return KeyboardThemeConfig.fromMap(raw ?? const {});
  }

  static Future<KeyboardThemeConfig> resetKeyboardThemeConfig() async {
    if (!PlatformCapabilities.keyboardImeSupported) {
      return KeyboardThemeConfig.defaults();
    }
    final raw = await _invoke<Map<Object?, Object?>>(
      'resetKeyboardThemeConfig',
    );
    return KeyboardThemeConfig.fromMap(raw ?? const {});
  }

  static Future<Map<String, Object?>> importKeyboardThemeImage() async {
    if (!PlatformCapabilities.keyboardImeSupported) {
      throw AndroidKeyboardBridgeException(
        code: 'KEYBOARD_UNSUPPORTED',
        message: PlatformCapabilities.keyboardImeUnavailableReason,
      );
    }
    final raw = await _invoke<Map<Object?, Object?>>(
      'importKeyboardThemeImage',
    );
    final result = <String, Object?>{};
    for (final entry in (raw ?? const {}).entries) {
      final key = entry.key;
      if (key is String) {
        result[key] = entry.value;
      }
    }
    return result;
  }

  static Future<void> setSnippetRules(
    List<AndroidKeyboardTextRule> rules,
  ) async {
    if (!PlatformCapabilities.keyboardImeSupported) {
      return;
    }
    await _invoke<void>(
      'setKeyboardSnippetRules',
      rules.map((rule) => rule.toMap()).toList(growable: false),
    );
  }

  static Future<void> setDictionaryRules(
    List<AndroidKeyboardTextRule> rules,
  ) async {
    if (!PlatformCapabilities.keyboardImeSupported) {
      return;
    }
    await _invoke<void>(
      'setKeyboardDictionaryRules',
      rules.map((rule) => rule.toMap()).toList(growable: false),
    );
  }

  static Future<List<AndroidKeyboardClipboardEvent>>
  drainKeyboardClipboardEvents() async {
    if (!PlatformCapabilities.keyboardImeSupported) {
      return const <AndroidKeyboardClipboardEvent>[];
    }
    final raw = await _invoke<List<Object?>>('drainKeyboardClipboardEvents');
    return (raw ?? const <Object?>[])
        .whereType<Map<Object?, Object?>>()
        .map(AndroidKeyboardClipboardEvent.fromMap)
        .where((event) => event != null)
        .cast<AndroidKeyboardClipboardEvent>()
        .toList(growable: false);
  }

  static Future<List<AndroidKeyboardVoiceEvent>>
  drainKeyboardVoiceEvents() async {
    if (!PlatformCapabilities.keyboardImeSupported) {
      return const <AndroidKeyboardVoiceEvent>[];
    }
    final raw = await _invoke<List<Object?>>('drainKeyboardVoiceEvents');
    return (raw ?? const <Object?>[])
        .whereType<Map<Object?, Object?>>()
        .map(AndroidKeyboardVoiceEvent.fromMap)
        .where((event) => event != null)
        .cast<AndroidKeyboardVoiceEvent>()
        .toList(growable: false);
  }

  static Future<List<AndroidKeyboardVoiceRuntimeEvent>>
  drainKeyboardVoiceRuntimeEvents() async {
    if (!PlatformCapabilities.keyboardImeSupported) {
      return const <AndroidKeyboardVoiceRuntimeEvent>[];
    }
    final raw = await _invoke<List<Object?>>('drainKeyboardVoiceRuntimeEvents');
    return (raw ?? const <Object?>[])
        .whereType<Map<Object?, Object?>>()
        .map(AndroidKeyboardVoiceRuntimeEvent.fromMap)
        .where((event) => event != null)
        .cast<AndroidKeyboardVoiceRuntimeEvent>()
        .toList(growable: false);
  }

  static Future<AndroidKeyboardStatus> setKeyboardVoiceRuntimeConfig({
    required String languageTag,
    required String packId,
    required String engine,
    String? modelArtifactPath,
  }) async {
    if (!PlatformCapabilities.keyboardImeSupported) {
      return AndroidKeyboardStatus.unsupported();
    }
    final raw =
        await _invoke<Map<Object?, Object?>>('setKeyboardVoiceRuntimeConfig', {
          'languageTag': languageTag,
          'packId': packId,
          'engine': engine,
          'modelArtifactPath': modelArtifactPath,
        });
    return AndroidKeyboardStatus.fromMap(raw ?? const {});
  }

  static Future<AndroidKeyboardStatus> setKeyboardVoiceModelArtifact({
    required String modelArtifactPath,
    String? languageTag,
    String? packId,
    String? engine,
  }) async {
    if (!PlatformCapabilities.keyboardImeSupported) {
      return AndroidKeyboardStatus.unsupported();
    }
    final raw =
        await _invoke<Map<Object?, Object?>>('setKeyboardVoiceModelArtifact', {
          'modelArtifactPath': modelArtifactPath,
          'languageTag': languageTag,
          'packId': packId,
          'engine': engine,
        });
    return AndroidKeyboardStatus.fromMap(raw ?? const {});
  }

  static Future<KeyboardSyncProfile?> exportKeyboardSyncProfile() async {
    if (!PlatformCapabilities.keyboardImeSupported) {
      return null;
    }
    final raw = await _invoke<Map<Object?, Object?>>(
      'exportKeyboardSyncProfile',
    );
    if (raw == null) {
      throw const AndroidKeyboardBridgeException(
        code: 'KEYBOARD_SYNC_EXPORT_EMPTY',
        message: 'Native keyboard sync export returned an empty payload.',
      );
    }
    var profile = KeyboardSyncProfile.fromMap(Map<String, Object?>.from(raw));
    if (profile.checksum.isEmpty) {
      profile = KeyboardSyncProfile(
        schemaVersion: profile.schemaVersion,
        profileRevision: profile.profileRevision,
        baseCloudRevision: profile.baseCloudRevision,
        updatedAt: profile.updatedAt,
        updatedByDeviceId: profile.updatedByDeviceId,
        sourcePlatform: profile.sourcePlatform,
        sanitizationPolicy: profile.sanitizationPolicy,
        checksum: KeyboardSyncProfile.computeChecksum(
          schemaVersion: profile.schemaVersion,
          profileRevision: profile.profileRevision,
          baseCloudRevision: profile.baseCloudRevision,
          updatedAt: profile.updatedAt,
          updatedByDeviceId: profile.updatedByDeviceId,
          sourcePlatform: profile.sourcePlatform,
          sanitizationPolicy: profile.sanitizationPolicy,
          payload: profile.payload,
        ),
        payload: profile.payload,
      );
    }
    final validation = profile.validate();
    if (!validation.isValid) {
      throw AndroidKeyboardBridgeException(
        code: 'KEYBOARD_SYNC_EXPORT_INVALID',
        message:
            'Native keyboard sync export is invalid: ${validation.errors.join(", ")}',
        details: validation.verdict.name,
      );
    }
    return profile;
  }

  static Future<void> applyKeyboardSyncProfile(
    KeyboardSyncProfile profile,
  ) async {
    if (!PlatformCapabilities.keyboardImeSupported) {
      throw AndroidKeyboardBridgeException(
        code: 'KEYBOARD_UNSUPPORTED',
        message: PlatformCapabilities.keyboardImeUnavailableReason,
      );
    }
    final validation = profile.validate();
    if (!validation.isValid) {
      throw AndroidKeyboardBridgeException(
        code: 'KEYBOARD_SYNC_PROFILE_INVALID',
        message:
            'Keyboard sync profile is invalid: ${validation.errors.join(", ")}',
        details: validation.verdict.name,
      );
    }
    await _invoke<void>('applyKeyboardSyncProfile', profile.toMap());
  }

  static Future<void> applyKeyboardSyncProfileWithRestoredThemeImage({
    required KeyboardSyncProfile profile,
    required String restoredThemeImagePath,
  }) async {
    if (!PlatformCapabilities.keyboardImeSupported) {
      throw AndroidKeyboardBridgeException(
        code: 'KEYBOARD_UNSUPPORTED',
        message: PlatformCapabilities.keyboardImeUnavailableReason,
      );
    }
    final validation = profile.validate();
    if (!validation.isValid) {
      throw AndroidKeyboardBridgeException(
        code: 'KEYBOARD_SYNC_PROFILE_INVALID',
        message:
            'Keyboard sync profile is invalid: ${validation.errors.join(", ")}',
        details: validation.verdict.name,
      );
    }
    await _invoke<void>('applyKeyboardSyncProfile', {
      ...profile.toMap(),
      'restoredThemeImagePath': restoredThemeImagePath,
    });
  }

  static Future<KeyboardSyncThemeAssetUploadRequest?>
  exportThemeAssetUploadRequest() async {
    if (!PlatformCapabilities.keyboardImeSupported) {
      return null;
    }
    final themeConfig = await getKeyboardThemeConfig();
    final localPath = themeConfig.backgroundImagePath?.trim();
    if (!themeConfig.useImage || localPath == null || localPath.isEmpty) {
      return null;
    }
    return KeyboardSyncThemeAssetUploadRequest(
      localFilePath: localPath,
      assetId: _uuid.v4(),
      mimeType: _mimeTypeForPath(localPath),
    );
  }

  static Future<String> installRestoredThemeImage(String sourcePath) async {
    if (!PlatformCapabilities.keyboardImeSupported) {
      throw AndroidKeyboardBridgeException(
        code: 'KEYBOARD_UNSUPPORTED',
        message: PlatformCapabilities.keyboardImeUnavailableReason,
      );
    }
    final raw = await _invoke<Map<Object?, Object?>>(
      'installRestoredKeyboardThemeImage',
      {'sourcePath': sourcePath},
    );
    final installedPath = raw?['path'];
    if (installedPath is! String || installedPath.trim().isEmpty) {
      throw const AndroidKeyboardBridgeException(
        code: 'KEYBOARD_THEME_IMAGE_INSTALL_FAILED',
        message: 'Native keyboard theme image install returned no path.',
      );
    }
    return installedPath.trim();
  }

  static Future<AndroidKeyboardStatus> probeKeyboardLocalRuntimePath({
    required String languageTag,
    required String packId,
    required String engine,
    String? modelArtifactPath,
  }) async {
    if (!PlatformCapabilities.keyboardImeSupported) {
      return AndroidKeyboardStatus.unsupported();
    }
    final raw =
        await _invoke<Map<Object?, Object?>>('probeKeyboardLocalRuntimePath', {
          'languageTag': languageTag,
          'packId': packId,
          'engine': engine,
          'modelArtifactPath': modelArtifactPath,
        });
    return AndroidKeyboardStatus.fromMap(raw ?? const {});
  }

  static Future<T?> _invoke<T>(String method, [Object? arguments]) async {
    try {
      return await _channel.invokeMethod<T>(method, arguments);
    } on PlatformException catch (error) {
      throw AndroidKeyboardBridgeException(
        code: error.code,
        message: error.message ?? 'Native keyboard operation failed.',
        details: error.details,
      );
    }
  }

  static String _mimeTypeForPath(String path) {
    final lower = path.toLowerCase();
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
      return 'image/jpeg';
    }
    if (lower.endsWith('.webp')) {
      return 'image/webp';
    }
    return 'image/png';
  }
}

class AndroidKeyboardTextRule {
  const AndroidKeyboardTextRule({
    required this.trigger,
    required this.replacement,
    required this.caseSensitive,
  });

  final String trigger;
  final String replacement;
  final bool caseSensitive;

  Map<String, Object?> toMap() {
    return {
      'trigger': trigger,
      'replacement': replacement,
      'caseSensitive': caseSensitive,
    };
  }
}

class AndroidKeyboardNavigationDiagnosticEntry {
  const AndroidKeyboardNavigationDiagnosticEntry({
    required this.timestamp,
    required this.actionId,
    required this.success,
    required this.strategy,
    required this.packageName,
    required this.fieldContext,
    required this.inputActionLabel,
    required this.selectionModeAllowed,
    required this.selectionStart,
    required this.selectionEnd,
    required this.hasSelection,
    required this.privateMode,
    required this.inputAllowed,
    required this.clipboardAllowed,
    required this.voiceAllowed,
    required this.selectedTextBefore,
    required this.selectedTextAfter,
    required this.textBeforeCursor,
    required this.textAfterCursor,
  });

  final DateTime timestamp;
  final String actionId;
  final bool success;
  final String strategy;
  final String packageName;
  final String fieldContext;
  final String inputActionLabel;
  final bool selectionModeAllowed;
  final int selectionStart;
  final int selectionEnd;
  final bool hasSelection;
  final bool privateMode;
  final bool inputAllowed;
  final bool clipboardAllowed;
  final bool voiceAllowed;
  final String? selectedTextBefore;
  final String? selectedTextAfter;
  final String? textBeforeCursor;
  final String? textAfterCursor;

  factory AndroidKeyboardNavigationDiagnosticEntry.fromMap(
    Map<Object?, Object?> map,
  ) {
    return AndroidKeyboardNavigationDiagnosticEntry(
      timestamp: DateTime.fromMillisecondsSinceEpoch(
        (map['timestamp'] as num?)?.toInt() ?? 0,
      ),
      actionId: (map['actionId'] as String? ?? 'unknown').trim(),
      success: map['success'] as bool? ?? false,
      strategy: (map['strategy'] as String? ?? 'unknown').trim(),
      packageName: (map['packageName'] as String? ?? 'unknown').trim(),
      fieldContext: (map['fieldContext'] as String? ?? 'unknown').trim(),
      inputActionLabel: (map['inputActionLabel'] as String? ?? '').trim(),
      selectionModeAllowed: map['selectionModeAllowed'] as bool? ?? false,
      selectionStart: (map['selectionStart'] as num?)?.toInt() ?? -1,
      selectionEnd: (map['selectionEnd'] as num?)?.toInt() ?? -1,
      hasSelection: map['hasSelection'] as bool? ?? false,
      privateMode: map['privateMode'] as bool? ?? false,
      inputAllowed: map['inputAllowed'] as bool? ?? false,
      clipboardAllowed: map['clipboardAllowed'] as bool? ?? false,
      voiceAllowed: map['voiceAllowed'] as bool? ?? false,
      selectedTextBefore: _trimmedNullableString(map['selectedTextBefore']),
      selectedTextAfter: _trimmedNullableString(map['selectedTextAfter']),
      textBeforeCursor: _trimmedNullableString(map['textBeforeCursor']),
      textAfterCursor: _trimmedNullableString(map['textAfterCursor']),
    );
  }
}

String? _trimmedNullableString(Object? value) {
  final raw = value as String?;
  if (raw == null) {
    return null;
  }
  final trimmed = raw.trim();
  return trimmed.isEmpty ? null : trimmed;
}

class AndroidKeyboardClipboardEvent {
  const AndroidKeyboardClipboardEvent({
    required this.content,
    required this.source,
    required this.deviceId,
    required this.capturedAtUtc,
    required this.sourceMetadata,
  });

  final String content;
  final ClipboardCanonicalSource source;
  final String deviceId;
  final DateTime capturedAtUtc;
  final Map<String, Object?> sourceMetadata;

  static AndroidKeyboardClipboardEvent? fromMap(Map<Object?, Object?> map) {
    final content = map['content'];
    final deviceId = map['deviceId'];
    final capturedAtEpochMillis = map['capturedAtEpochMillis'];
    if (content is! String ||
        content.trim().isEmpty ||
        deviceId is! String ||
        deviceId.trim().isEmpty ||
        capturedAtEpochMillis is! num) {
      return null;
    }
    final metadata = <String, Object?>{};
    final rawMetadata = map['sourceMetadata'];
    if (rawMetadata is Map<Object?, Object?>) {
      for (final entry in rawMetadata.entries) {
        final key = entry.key;
        final value = entry.value;
        if (key is String &&
            (value == null ||
                value is String ||
                value is num ||
                value is bool)) {
          metadata[key] = value;
        }
      }
    }
    return AndroidKeyboardClipboardEvent(
      content: content,
      source: ClipboardCanonicalSource.fromDatabase(map['source'] as String?),
      deviceId: deviceId,
      capturedAtUtc: DateTime.fromMillisecondsSinceEpoch(
        capturedAtEpochMillis.toInt(),
        isUtc: true,
      ),
      sourceMetadata: metadata,
    );
  }
}

class AndroidKeyboardVoiceEvent {
  const AndroidKeyboardVoiceEvent({
    required this.rawText,
    required this.cleanedText,
    required this.language,
    required this.source,
    required this.durationMs,
    required this.capturedAtUtc,
  });

  final String rawText;
  final String cleanedText;
  final String language;
  final String source;
  final int durationMs;
  final DateTime capturedAtUtc;

  static AndroidKeyboardVoiceEvent? fromMap(Map<Object?, Object?> map) {
    final rawText = map['rawText'];
    final cleanedText = map['cleanedText'];
    final language = map['language'];
    final source = map['source'];
    final durationMs = map['durationMs'];
    final capturedAtEpochMillis = map['capturedAtEpochMillis'];
    if (rawText is! String ||
        rawText.trim().isEmpty ||
        cleanedText is! String ||
        cleanedText.trim().isEmpty ||
        capturedAtEpochMillis is! num) {
      return null;
    }
    return AndroidKeyboardVoiceEvent(
      rawText: rawText.trim(),
      cleanedText: cleanedText.trim(),
      language: language is String && language.trim().isNotEmpty
          ? language.trim()
          : 'und',
      source: source is String && source.trim().isNotEmpty
          ? source.trim()
          : 'keyboard',
      durationMs: durationMs is num ? durationMs.toInt().clamp(0, 1 << 31) : 0,
      capturedAtUtc: DateTime.fromMillisecondsSinceEpoch(
        capturedAtEpochMillis.toInt(),
        isUtc: true,
      ),
    );
  }
}

class AndroidKeyboardVoiceRuntimeEvent {
  const AndroidKeyboardVoiceRuntimeEvent({
    required this.runtimeState,
    required this.fallbackReason,
    required this.activePackId,
    required this.lastErrorCode,
    required this.languageTag,
    required this.engine,
    required this.source,
    required this.capturedAtUtc,
  });

  final String runtimeState;
  final String fallbackReason;
  final String activePackId;
  final String lastErrorCode;
  final String languageTag;
  final String engine;
  final String source;
  final DateTime capturedAtUtc;

  static AndroidKeyboardVoiceRuntimeEvent? fromMap(Map<Object?, Object?> map) {
    final runtimeState = map['runtime_state'];
    final fallbackReason = map['fallback_reason'];
    final activePackId = map['active_pack_id'];
    final lastErrorCode = map['last_error_code'];
    final languageTag = map['language_tag'];
    final engine = map['engine'];
    final source = map['source'];
    final capturedAtEpochMillis = map['captured_at_epoch_millis'];
    if (runtimeState is! String ||
        fallbackReason is! String ||
        activePackId is! String ||
        lastErrorCode is! String ||
        languageTag is! String ||
        engine is! String ||
        source is! String ||
        capturedAtEpochMillis is! num) {
      return null;
    }
    return AndroidKeyboardVoiceRuntimeEvent(
      runtimeState: runtimeState.trim().isEmpty ? 'unavailable' : runtimeState,
      fallbackReason: fallbackReason.trim().isEmpty
          ? 'unsupported_language'
          : fallbackReason,
      activePackId: activePackId.trim().isEmpty ? 'none' : activePackId,
      lastErrorCode: lastErrorCode.trim().isEmpty ? 'none' : lastErrorCode,
      languageTag: languageTag.trim().isEmpty ? 'und' : languageTag,
      engine: engine.trim().isEmpty ? 'unavailable' : engine,
      source: source.trim().isEmpty ? 'ime_voice_controller' : source,
      capturedAtUtc: DateTime.fromMillisecondsSinceEpoch(
        capturedAtEpochMillis.toInt(),
        isUtc: true,
      ),
    );
  }
}
