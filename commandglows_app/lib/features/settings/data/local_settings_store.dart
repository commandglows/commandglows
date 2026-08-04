import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../domain/settings_store.dart';
import '../domain/user_retention_policy.dart';

class LocalSettingsStore implements SettingsStore {
  LocalSettingsStore({FlutterSecureStorage? storage})
    : _storage = storage ?? const FlutterSecureStorage();

  static const _themeModeKey = 'settings_theme_mode';
  static const _retentionPolicyKey = 'settings_retention_policy';
  static const _clipboardAutoSyncKey = 'settings_clipboard_auto_sync';
  static const _transcriptionSyncKey = 'settings_transcription_sync';
  static const _customActionBarEnabledKey =
      'settings_custom_action_bar_enabled';
  static const _confirmDestructiveActionsKey =
      'settings_confirm_destructive_actions';
  static const _onboardingCompletedKey = 'settings_onboarding_completed';
  static const _onboardingCurrentStepKey = 'settings_onboarding_current_step';
  static const _onboardingLastSeenAtKey = 'settings_onboarding_last_seen_at';
  static const _onboardingClipboardSkippedKey =
      'settings_onboarding_clipboard_skipped';
  static const _onboardingAccessibilitySkippedKey =
      'settings_onboarding_accessibility_skipped';
  static const _onboardingMicrophoneSkippedKey =
      'settings_onboarding_microphone_skipped';
  static const _onboardingMediaAccessSkippedKey =
      'settings_onboarding_media_access_skipped';
  static const _onboardingBrightnessSkippedKey =
      'settings_onboarding_brightness_skipped';
  static const _onboardingOverlaySkippedKey =
      'settings_onboarding_overlay_skipped';
  static const _localSpeechNoticeDismissedForeverKey =
      'settings_local_speech_notice_dismissed_forever';
  static const _overlayNoticeDismissedForeverKey =
      'settings_overlay_notice_dismissed_forever';
  static const _onboardingNoticeDismissedForeverKey =
      'settings_onboarding_notice_dismissed_forever';

  final FlutterSecureStorage _storage;
  final _controller = StreamController<UserSettingsSnapshot>.broadcast();

  @override
  Future<UserSettingsSnapshot> load() async {
    final themeMode = _themeModeFromValue(await _read(_themeModeKey));
    final retentionPolicy = UserRetentionPolicy.fromValue(
      await _read(_retentionPolicyKey) ?? UserRetentionPolicy.sevenDays.value,
    );
    final clipboardAutoSync = _boolFromValue(
      await _read(_clipboardAutoSyncKey),
      fallback: true,
    );
    final transcriptionSync = _boolFromValue(
      await _read(_transcriptionSyncKey),
      fallback: true,
    );
    final customActionBarEnabled = _boolFromValue(
      await _read(_customActionBarEnabledKey),
      fallback: false,
    );
    final confirmDestructiveActions = _boolFromValue(
      await _read(_confirmDestructiveActionsKey),
      fallback: true,
    );
    final onboardingCompleted = _boolFromValue(
      await _read(_onboardingCompletedKey),
      fallback: false,
    );
    final onboardingCurrentStep = _intFromValue(
      await _read(_onboardingCurrentStepKey),
      fallback: 0,
    );
    final onboardingLastSeenAt = _dateFromValue(
      await _read(_onboardingLastSeenAtKey),
    );
    final onboardingClipboardSkipped = _boolFromValue(
      await _read(_onboardingClipboardSkippedKey),
      fallback: false,
    );
    final onboardingAccessibilitySkipped = _boolFromValue(
      await _read(_onboardingAccessibilitySkippedKey),
      fallback: false,
    );
    final onboardingMicrophoneSkipped = _boolFromValue(
      await _read(_onboardingMicrophoneSkippedKey),
      fallback: false,
    );
    final onboardingMediaAccessSkipped = _boolFromValue(
      await _read(_onboardingMediaAccessSkippedKey),
      fallback: false,
    );
    final onboardingBrightnessSkipped = _boolFromValue(
      await _read(_onboardingBrightnessSkippedKey),
      fallback: false,
    );
    final onboardingOverlaySkipped = _boolFromValue(
      await _read(_onboardingOverlaySkippedKey),
      fallback: false,
    );
    final localSpeechNoticeDismissedForever = _boolFromValue(
      await _read(_localSpeechNoticeDismissedForeverKey),
      fallback: false,
    );
    final overlayNoticeDismissedForever = _boolFromValue(
      await _read(_overlayNoticeDismissedForeverKey),
      fallback: false,
    );
    final onboardingNoticeDismissedForever = _boolFromValue(
      await _read(_onboardingNoticeDismissedForeverKey),
      fallback: false,
    );

    return UserSettingsSnapshot.defaults().copyWith(
      themeMode: themeMode,
      retentionPolicy: retentionPolicy,
      clipboardAutoSync: clipboardAutoSync,
      transcriptionSync: transcriptionSync,
      customActionBarEnabled: customActionBarEnabled,
      confirmDestructiveActions: confirmDestructiveActions,
      onboardingCompleted: onboardingCompleted,
      onboardingCurrentStep: onboardingCurrentStep,
      onboardingLastSeenAt: onboardingLastSeenAt,
      onboardingClipboardSkipped: onboardingClipboardSkipped,
      onboardingAccessibilitySkipped: onboardingAccessibilitySkipped,
      onboardingMicrophoneSkipped: onboardingMicrophoneSkipped,
      onboardingMediaAccessSkipped: onboardingMediaAccessSkipped,
      onboardingBrightnessSkipped: onboardingBrightnessSkipped,
      onboardingOverlaySkipped: onboardingOverlaySkipped,
      localSpeechNoticeDismissedForever: localSpeechNoticeDismissedForever,
      overlayNoticeDismissedForever: overlayNoticeDismissedForever,
      onboardingNoticeDismissedForever: onboardingNoticeDismissedForever,
    );
  }

  @override
  Future<void> save(UserSettingsSnapshot settings) async {
    await _write(_themeModeKey, settings.themeMode.name);
    await _write(_retentionPolicyKey, settings.retentionPolicy.value);
    await _write(_clipboardAutoSyncKey, settings.clipboardAutoSync.toString());
    await _write(_transcriptionSyncKey, settings.transcriptionSync.toString());
    await _write(
      _customActionBarEnabledKey,
      settings.customActionBarEnabled.toString(),
    );
    await _write(
      _confirmDestructiveActionsKey,
      settings.confirmDestructiveActions.toString(),
    );
    await _write(
      _onboardingCompletedKey,
      settings.onboardingCompleted.toString(),
    );
    await _write(
      _onboardingCurrentStepKey,
      settings.onboardingCurrentStep.toString(),
    );
    await _write(
      _onboardingLastSeenAtKey,
      settings.onboardingLastSeenAt?.toUtc().toIso8601String(),
    );
    await _write(
      _onboardingClipboardSkippedKey,
      settings.onboardingClipboardSkipped.toString(),
    );
    await _write(
      _onboardingAccessibilitySkippedKey,
      settings.onboardingAccessibilitySkipped.toString(),
    );
    await _write(
      _onboardingMicrophoneSkippedKey,
      settings.onboardingMicrophoneSkipped.toString(),
    );
    await _write(
      _onboardingMediaAccessSkippedKey,
      settings.onboardingMediaAccessSkipped.toString(),
    );
    await _write(
      _onboardingBrightnessSkippedKey,
      settings.onboardingBrightnessSkipped.toString(),
    );
    await _write(
      _onboardingOverlaySkippedKey,
      settings.onboardingOverlaySkipped.toString(),
    );
    await _write(
      _localSpeechNoticeDismissedForeverKey,
      settings.localSpeechNoticeDismissedForever.toString(),
    );
    await _write(
      _overlayNoticeDismissedForeverKey,
      settings.overlayNoticeDismissedForever.toString(),
    );
    await _write(
      _onboardingNoticeDismissedForeverKey,
      settings.onboardingNoticeDismissedForever.toString(),
    );
    _controller.add(settings);
  }

  @override
  Stream<UserSettingsSnapshot> watch() async* {
    yield await load();
    yield* _controller.stream;
  }

  Future<String?> _read(String key) async {
    try {
      return _storage.read(key: key);
    } catch (_) {
      return null;
    }
  }

  Future<void> _write(String key, String? value) async {
    try {
      if (value == null) {
        return;
      }
      await _storage.write(key: key, value: value);
    } catch (_) {
      // Local settings are best-effort so UI development never crashes when
      // platform secure storage is unavailable.
    }
  }

  static ThemeMode _themeModeFromValue(String? value) {
    return ThemeMode.values.firstWhere(
      (mode) => mode.name == value,
      orElse: () => ThemeMode.system,
    );
  }

  static bool _boolFromValue(String? value, {required bool fallback}) {
    if (value == null) {
      return fallback;
    }
    return value == 'true';
  }

  static int _intFromValue(String? value, {required int fallback}) {
    final parsed = int.tryParse(value ?? '');
    if (parsed == null) {
      return fallback;
    }
    return parsed < 0 ? 0 : parsed;
  }

  static DateTime? _dateFromValue(String? value) {
    if (value == null || value.isEmpty) {
      return null;
    }
    return DateTime.tryParse(value)?.toUtc();
  }
}
