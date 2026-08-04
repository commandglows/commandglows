import 'package:flutter/material.dart';

import '../../../core/sync/sync_status.dart';
import 'user_retention_policy.dart';

class UserSettingsSnapshot {
  const UserSettingsSnapshot({
    required this.themeMode,
    required this.retentionPolicy,
    required this.clipboardAutoSync,
    required this.transcriptionSync,
    this.customActionBarEnabled = false,
    this.confirmDestructiveActions = true,
    required this.syncStatus,
    this.onboardingCompleted = false,
    this.onboardingCurrentStep = 0,
    this.onboardingLastSeenAt,
    this.onboardingClipboardSkipped = false,
    this.onboardingAccessibilitySkipped = false,
    this.onboardingMicrophoneSkipped = false,
    this.onboardingMediaAccessSkipped = false,
    this.onboardingBrightnessSkipped = false,
    this.onboardingOverlaySkipped = false,
    this.localSpeechNoticeDismissedForever = false,
    this.overlayNoticeDismissedForever = false,
    this.onboardingNoticeDismissedForever = false,
    this.updatedAt,
  });

  const UserSettingsSnapshot.defaults()
    : themeMode = ThemeMode.system,
      retentionPolicy = UserRetentionPolicy.sevenDays,
      clipboardAutoSync = true,
      transcriptionSync = true,
      customActionBarEnabled = false,
      confirmDestructiveActions = true,
      syncStatus = const SyncStatus.localOnly(),
      onboardingCompleted = false,
      onboardingCurrentStep = 0,
      onboardingLastSeenAt = null,
      onboardingClipboardSkipped = false,
      onboardingAccessibilitySkipped = false,
      onboardingMicrophoneSkipped = false,
      onboardingMediaAccessSkipped = false,
      onboardingBrightnessSkipped = false,
      onboardingOverlaySkipped = false,
      localSpeechNoticeDismissedForever = false,
      overlayNoticeDismissedForever = false,
      onboardingNoticeDismissedForever = false,
      updatedAt = null;

  final ThemeMode themeMode;
  final UserRetentionPolicy retentionPolicy;
  final bool clipboardAutoSync;
  final bool transcriptionSync;
  final bool customActionBarEnabled;
  final bool confirmDestructiveActions;
  final SyncStatus syncStatus;
  final bool onboardingCompleted;
  final int onboardingCurrentStep;
  final DateTime? onboardingLastSeenAt;
  final bool onboardingClipboardSkipped;
  final bool onboardingAccessibilitySkipped;
  final bool onboardingMicrophoneSkipped;
  final bool onboardingMediaAccessSkipped;
  final bool onboardingBrightnessSkipped;
  final bool onboardingOverlaySkipped;
  final bool localSpeechNoticeDismissedForever;
  final bool overlayNoticeDismissedForever;
  final bool onboardingNoticeDismissedForever;
  final DateTime? updatedAt;

  UserSettingsSnapshot copyWith({
    ThemeMode? themeMode,
    UserRetentionPolicy? retentionPolicy,
    bool? clipboardAutoSync,
    bool? transcriptionSync,
    bool? customActionBarEnabled,
    bool? confirmDestructiveActions,
    SyncStatus? syncStatus,
    bool? onboardingCompleted,
    int? onboardingCurrentStep,
    DateTime? onboardingLastSeenAt,
    bool? onboardingClipboardSkipped,
    bool? onboardingAccessibilitySkipped,
    bool? onboardingMicrophoneSkipped,
    bool? onboardingMediaAccessSkipped,
    bool? onboardingBrightnessSkipped,
    bool? onboardingOverlaySkipped,
    bool? localSpeechNoticeDismissedForever,
    bool? overlayNoticeDismissedForever,
    bool? onboardingNoticeDismissedForever,
    DateTime? updatedAt,
  }) {
    return UserSettingsSnapshot(
      themeMode: themeMode ?? this.themeMode,
      retentionPolicy: retentionPolicy ?? this.retentionPolicy,
      clipboardAutoSync: clipboardAutoSync ?? this.clipboardAutoSync,
      transcriptionSync: transcriptionSync ?? this.transcriptionSync,
      customActionBarEnabled:
          customActionBarEnabled ?? this.customActionBarEnabled,
      confirmDestructiveActions:
          confirmDestructiveActions ?? this.confirmDestructiveActions,
      syncStatus: syncStatus ?? this.syncStatus,
      onboardingCompleted: onboardingCompleted ?? this.onboardingCompleted,
      onboardingCurrentStep:
          onboardingCurrentStep ?? this.onboardingCurrentStep,
      onboardingLastSeenAt: onboardingLastSeenAt ?? this.onboardingLastSeenAt,
      onboardingClipboardSkipped:
          onboardingClipboardSkipped ?? this.onboardingClipboardSkipped,
      onboardingAccessibilitySkipped:
          onboardingAccessibilitySkipped ?? this.onboardingAccessibilitySkipped,
      onboardingMicrophoneSkipped:
          onboardingMicrophoneSkipped ?? this.onboardingMicrophoneSkipped,
      onboardingMediaAccessSkipped:
          onboardingMediaAccessSkipped ?? this.onboardingMediaAccessSkipped,
      onboardingBrightnessSkipped:
          onboardingBrightnessSkipped ?? this.onboardingBrightnessSkipped,
      onboardingOverlaySkipped:
          onboardingOverlaySkipped ?? this.onboardingOverlaySkipped,
      localSpeechNoticeDismissedForever:
          localSpeechNoticeDismissedForever ??
          this.localSpeechNoticeDismissedForever,
      overlayNoticeDismissedForever:
          overlayNoticeDismissedForever ?? this.overlayNoticeDismissedForever,
      onboardingNoticeDismissedForever:
          onboardingNoticeDismissedForever ??
          this.onboardingNoticeDismissedForever,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}

abstract class SettingsStore {
  Future<UserSettingsSnapshot> load();

  Future<void> save(UserSettingsSnapshot settings);

  Stream<UserSettingsSnapshot> watch();
}
