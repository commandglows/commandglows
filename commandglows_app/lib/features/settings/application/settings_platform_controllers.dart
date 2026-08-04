import '../../../core/diagnostics/sensitive_redactor.dart';
import '../../../core/platform/android_keyboard_bridge.dart';
import '../../../core/platform/android_overlay_bridge.dart';
import '../../keyboard/domain/keyboard_models.dart';

class SettingsKeyboardController {
  const SettingsKeyboardController();

  Future<AndroidKeyboardStatus> loadStatus() {
    return AndroidKeyboardBridge.getStatus();
  }

  Future<void> openInputMethodSettings() {
    return AndroidKeyboardBridge.openInputMethodSettings();
  }

  Future<void> showInputMethodPicker() {
    return AndroidKeyboardBridge.showInputMethodPicker();
  }

  Future<AndroidKeyboardStatus> clearDiagnostics() {
    return AndroidKeyboardBridge.clearDiagnostics();
  }

  String statusSummary(AndroidKeyboardStatus status) {
    return [
      'enabled=${status.enabled}',
      'active=${status.active}',
      'layout=${status.layoutProfile.name}',
      'theme=${status.themeMode}',
      'theme_preset=${status.themePresetId}',
      'theme_fallback=${status.themeFallbackStatus}',
      'compact=${status.compactModeEnabled}',
      'auto_close_modes=${status.autoCloseModesEnabled}',
      'height=${status.keyboardHeightScale}',
      'action_height=${status.actionRowHeightScale}',
      'status_bar_mode=${status.statusBarConfig.mode.name}',
      'status_bar_modules=${status.statusBarConfig.modules.map((module) => module.name).join(',')}',
      'status_bar_tips=${status.statusBarConfig.tipLevel.name}',
      'recoveries=${status.keyboardRecoveryCount}',
      'voice_runtime=${status.voiceRuntimeMode}',
      'voice_language=${status.voiceLanguageTag}',
      'voice_pack=${status.voicePackId}',
      'voice_engine=${status.voiceEngine}',
      'voice_fallback=${status.voiceFallbackReason}',
      'voice_last_error=${status.voiceLastErrorCode}',
      'clipboard_sensitive_field_history=${status.clipboardSensitiveFieldHistoryEnabled}',
      'last_error_at=${status.lastKeyboardErrorAt ?? 'none'}',
      'last_error=${SensitiveRedactor.redact(status.lastKeyboardError ?? 'none')}',
    ].join('; ');
  }

  Future<KeyboardStatusBarConfig> loadStatusBarConfig() {
    return AndroidKeyboardBridge.getStatusBarConfig();
  }

  Future<KeyboardStatusBarConfig> setStatusBarConfig(
    KeyboardStatusBarConfig config,
  ) {
    return AndroidKeyboardBridge.setStatusBarConfig(config);
  }

  Future<KeyboardStatusBarConfig> resetStatusBarConfig() {
    return AndroidKeyboardBridge.resetStatusBarConfig();
  }

  Future<void> setKeyboardUserContext({
    String? accountLabel,
    KeyboardStatusBarAccountLabelMode? accountLabelMode,
    int? tipsLastResetAtMs,
  }) {
    return AndroidKeyboardBridge.setKeyboardUserContext(
      accountLabel: accountLabel,
      accountLabelMode: accountLabelMode?.name,
      tipsLastResetAtMs: tipsLastResetAtMs,
    );
  }

  Future<AndroidKeyboardStatus> setPreferences({
    required AndroidKeyboardStatus current,
    bool? voiceEnabled,
    bool? customActionBarEnabled,
    bool? clipboardSyncDesired,
    bool? clipboardSensitiveFieldHistoryEnabled,
    bool? mediaControlsEnabled,
    int? mediaVolumeStepPercent,
    int? mediaBrightnessStepPercent,
    String? themeMode,
    KeyboardLayoutProfile? layoutProfile,
    bool? cornerModeEnabled,
    bool? debugTouchOverlayEnabled,
    bool? keyVibrationEnabled,
    bool? keySoundEnabled,
    bool? spellingSuggestionsEnabled,
    bool? specialKeyCornersEnabled,
    bool? frenchLanguageEnabled,
    bool? englishLanguageEnabled,
    bool? doubleSpacePeriodEnabled,
    bool? punctuationAutoSpacingEnabled,
    double? keyboardHeightScale,
    double? actionRowHeightScale,
    bool? compactModeEnabled,
    bool? autoCloseModesEnabled,
    KeyboardPrivacyMode? privacyMode,
  }) {
    return AndroidKeyboardBridge.setPreferences(
      voiceEnabled: voiceEnabled ?? current.voiceEnabled,
      customActionBarEnabled:
          customActionBarEnabled ?? current.customActionBarEnabled,
      clipboardSyncDesired:
          clipboardSyncDesired ?? current.clipboardSyncDesired,
      clipboardSensitiveFieldHistoryEnabled:
          clipboardSensitiveFieldHistoryEnabled ??
          current.clipboardSensitiveFieldHistoryEnabled,
      mediaControlsEnabled:
          mediaControlsEnabled ?? current.mediaControlsEnabled,
      mediaVolumeStepPercent:
          mediaVolumeStepPercent ?? current.mediaVolumeStepPercent,
      mediaBrightnessStepPercent:
          mediaBrightnessStepPercent ?? current.mediaBrightnessStepPercent,
      themeMode: themeMode ?? current.themeMode,
      layoutProfile: layoutProfile ?? current.layoutProfile,
      cornerModeEnabled: cornerModeEnabled ?? current.cornerModeEnabled,
      debugTouchOverlayEnabled:
          debugTouchOverlayEnabled ?? current.debugTouchOverlayEnabled,
      keyVibrationEnabled: keyVibrationEnabled ?? current.keyVibrationEnabled,
      keyVibrationIntensity: current.keyVibrationIntensity,
      keySoundEnabled: keySoundEnabled ?? current.keySoundEnabled,
      spellingSuggestionsEnabled:
          spellingSuggestionsEnabled ?? current.spellingSuggestionsEnabled,
      specialKeyCornersEnabled:
          specialKeyCornersEnabled ?? current.specialKeyCornersEnabled,
      frenchLanguageEnabled:
          frenchLanguageEnabled ?? current.frenchLanguageEnabled,
      englishLanguageEnabled:
          englishLanguageEnabled ?? current.englishLanguageEnabled,
      doubleSpacePeriodEnabled:
          doubleSpacePeriodEnabled ?? current.doubleSpacePeriodEnabled,
      punctuationAutoSpacingEnabled:
          punctuationAutoSpacingEnabled ??
          current.punctuationAutoSpacingEnabled,
      keyboardHeightScale: keyboardHeightScale ?? current.keyboardHeightScale,
      actionRowHeightScale:
          actionRowHeightScale ?? current.actionRowHeightScale,
      compactModeEnabled: compactModeEnabled ?? current.compactModeEnabled,
      autoCloseModesEnabled:
          autoCloseModesEnabled ?? current.autoCloseModesEnabled,
      privacyMode: privacyMode ?? current.privacyMode,
    );
  }
}

class SettingsOverlayController {
  const SettingsOverlayController();

  Future<AndroidOverlayStatus> loadStatus() {
    return AndroidOverlayBridge.getStatus();
  }

  Future<void> openPermissionSettings() {
    return AndroidOverlayBridge.openPermissionSettings();
  }

  Future<void> openAccessibilitySettings() {
    return AndroidOverlayBridge.openAccessibilitySettings();
  }

  Future<AndroidOverlayStatus> setEnabled(bool enabled) {
    return AndroidOverlayBridge.setOverlayEnabled(enabled);
  }

  Future<AndroidOverlayStatus> setAppearance({
    required double sizeScale,
    required double opacity,
  }) {
    return AndroidOverlayBridge.setAppearance(
      sizeScale: sizeScale,
      opacity: opacity,
    );
  }

  Future<AndroidOverlayStatus> startRecording() {
    return AndroidOverlayBridge.startRecording();
  }

  Future<AndroidOverlayStatus> stopRecording() {
    return AndroidOverlayBridge.stopRecording();
  }

  Future<AndroidOverlayStatus> cancelRecording() {
    return AndroidOverlayBridge.cancelRecording();
  }

  String statusSummary(AndroidOverlayStatus status) {
    return [
      'enabled=${status.enabled}',
      'requested=${status.requestedEnabled}',
      'running=${status.running}',
      'overlay_permission=${status.overlayPermissionGranted}',
      'accessibility_permission=${status.accessibilityPermissionGranted}',
      'service_state=${status.serviceState}',
      'event_queue_size=${status.eventQueueSize}',
      'last_native_event=${SensitiveRedactor.redact(status.lastNativeEvent ?? 'none')}',
    ].join('; ');
  }
}
