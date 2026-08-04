import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart' as firebase_auth;
import 'package:flutter/material.dart';

import '../../../core/sync/sync_status.dart';
import '../domain/settings_store.dart';
import '../domain/user_retention_policy.dart';

class FirebaseSettingsStore implements SettingsStore {
  FirebaseSettingsStore({
    FirebaseFirestore? firestore,
    firebase_auth.FirebaseAuth? auth,
  }) : _firestore = firestore ?? FirebaseFirestore.instance,
       _auth = auth ?? firebase_auth.FirebaseAuth.instance;

  final FirebaseFirestore _firestore;
  final firebase_auth.FirebaseAuth _auth;

  @override
  Future<UserSettingsSnapshot> load() async {
    final snapshot = await _document().get();
    if (!snapshot.exists) {
      return const UserSettingsSnapshot.defaults();
    }
    return _fromData(snapshot.data() ?? const <String, dynamic>{});
  }

  @override
  Future<void> save(UserSettingsSnapshot settings) async {
    await _document().set(_toData(settings), SetOptions(merge: true));
  }

  @override
  Stream<UserSettingsSnapshot> watch() {
    return _document().snapshots().map((snapshot) {
      if (!snapshot.exists) {
        return const UserSettingsSnapshot.defaults();
      }
      return _fromData(snapshot.data() ?? const <String, dynamic>{});
    });
  }

  DocumentReference<Map<String, dynamic>> _document() {
    final uid = _auth.currentUser?.uid;
    if (uid == null) {
      throw StateError('Firebase settings require an authenticated user.');
    }
    return _firestore
        .collection('users')
        .doc(uid)
        .collection('settings')
        .doc('profile');
  }

  static Map<String, Object?> _toData(UserSettingsSnapshot settings) {
    return <String, Object?>{
      'themeMode': settings.themeMode.name,
      'retentionPolicy': settings.retentionPolicy.value,
      'retentionHours': _retentionHours(settings.retentionPolicy),
      'clipboardAutoSync': settings.clipboardAutoSync,
      'transcriptionSync': settings.transcriptionSync,
      'customActionBarEnabled': settings.customActionBarEnabled,
      'confirmDestructiveActions': settings.confirmDestructiveActions,
      'onboardingCompleted': settings.onboardingCompleted,
      'onboardingCurrentStep': settings.onboardingCurrentStep,
      'onboardingLastSeenAt': settings.onboardingLastSeenAt,
      'onboardingClipboardSkipped': settings.onboardingClipboardSkipped,
      'onboardingAccessibilitySkipped': settings.onboardingAccessibilitySkipped,
      'onboardingMicrophoneSkipped': settings.onboardingMicrophoneSkipped,
      'onboardingMediaAccessSkipped': settings.onboardingMediaAccessSkipped,
      'onboardingBrightnessSkipped': settings.onboardingBrightnessSkipped,
      'onboardingOverlaySkipped': settings.onboardingOverlaySkipped,
      'localSpeechNoticeDismissedForever':
          settings.localSpeechNoticeDismissedForever,
      'overlayNoticeDismissedForever': settings.overlayNoticeDismissedForever,
      'onboardingNoticeDismissedForever':
          settings.onboardingNoticeDismissedForever,
      'updatedAt': FieldValue.serverTimestamp(),
    };
  }

  static UserSettingsSnapshot _fromData(Map<String, dynamic> data) {
    return UserSettingsSnapshot.defaults().copyWith(
      themeMode: ThemeMode.values.firstWhere(
        (mode) => mode.name == data['themeMode'],
        orElse: () => ThemeMode.system,
      ),
      retentionPolicy: UserRetentionPolicy.fromValue(
        data['retentionPolicy'] as String? ??
            UserRetentionPolicy.sevenDays.value,
      ),
      clipboardAutoSync: data['clipboardAutoSync'] as bool? ?? true,
      transcriptionSync: data['transcriptionSync'] as bool? ?? true,
      customActionBarEnabled: data['customActionBarEnabled'] as bool? ?? false,
      confirmDestructiveActions:
          data['confirmDestructiveActions'] as bool? ?? true,
      onboardingCompleted: data['onboardingCompleted'] as bool? ?? false,
      onboardingCurrentStep: _coerceStep(data['onboardingCurrentStep']),
      onboardingLastSeenAt: _timestampToDate(data['onboardingLastSeenAt']),
      onboardingClipboardSkipped:
          data['onboardingClipboardSkipped'] as bool? ?? false,
      onboardingAccessibilitySkipped:
          data['onboardingAccessibilitySkipped'] as bool? ?? false,
      onboardingMicrophoneSkipped:
          data['onboardingMicrophoneSkipped'] as bool? ?? false,
      onboardingMediaAccessSkipped:
          data['onboardingMediaAccessSkipped'] as bool? ?? false,
      onboardingBrightnessSkipped:
          data['onboardingBrightnessSkipped'] as bool? ?? false,
      onboardingOverlaySkipped:
          data['onboardingOverlaySkipped'] as bool? ?? false,
      localSpeechNoticeDismissedForever:
          data['localSpeechNoticeDismissedForever'] as bool? ?? false,
      overlayNoticeDismissedForever:
          data['overlayNoticeDismissedForever'] as bool? ?? false,
      onboardingNoticeDismissedForever:
          data['onboardingNoticeDismissedForever'] as bool? ?? false,
      syncStatus: const SyncStatus(health: SyncHealth.synced),
      updatedAt: _timestampToDate(data['updatedAt']),
    );
  }

  static int _coerceStep(Object? value) {
    if (value is int) {
      return value < 0 ? 0 : value;
    }
    if (value is num) {
      final intValue = value.toInt();
      return intValue < 0 ? 0 : intValue;
    }
    return 0;
  }

  static int _retentionHours(UserRetentionPolicy policy) {
    return switch (policy) {
      UserRetentionPolicy.oneHour => 1,
      UserRetentionPolicy.twelveHours => 12,
      UserRetentionPolicy.oneDay => 24,
      UserRetentionPolicy.threeDays => 72,
      UserRetentionPolicy.sevenDays => 168,
    };
  }

  static DateTime? _timestampToDate(Object? value) {
    if (value is Timestamp) {
      return value.toDate();
    }
    if (value is String) {
      return DateTime.tryParse(value);
    }
    return null;
  }
}
