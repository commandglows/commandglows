import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:commandglows_app/app/commandglows_app.dart';
import 'package:commandglows_app/core/theme/app_theme.dart';
import 'package:commandglows_app/features/settings/application/settings_store_provider.dart';
import 'package:commandglows_app/features/settings/data/local_settings_store.dart';
import 'package:commandglows_app/features/settings/domain/settings_store.dart';
import 'package:commandglows_app/features/settings/domain/user_retention_policy.dart';

const _keyboardChannel = MethodChannel('commandglows_app/keyboard');

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  tearDown(() {
    debugDefaultTargetPlatformOverride = null;
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(_keyboardChannel, null);
  });

  test('setMode preserves existing local and remote settings fields', () async {
    final localInitial = UserSettingsSnapshot.defaults().copyWith(
      themeMode: ThemeMode.dark,
      clipboardAutoSync: false,
      onboardingCompleted: true,
      onboardingCurrentStep: 3,
      onboardingLastSeenAt: DateTime.utc(2026, 5, 1),
      onboardingAccessibilitySkipped: true,
    );
    final remoteInitial = UserSettingsSnapshot.defaults().copyWith(
      retentionPolicy: UserRetentionPolicy.oneDay,
      transcriptionSync: false,
      onboardingCompleted: true,
      onboardingCurrentStep: 2,
      onboardingMicrophoneSkipped: true,
    );
    final localStore = _MemoryLocalSettingsStore(localInitial);
    final remoteStore = _MemorySettingsStore(remoteInitial);
    final container = ProviderContainer(
      overrides: [
        initialAppThemeModeProvider.overrideWithValue(AppThemeMode.system),
        localSettingsStoreProvider.overrideWithValue(localStore),
        settingsStoreProvider.overrideWithValue(remoteStore),
      ],
    );
    addTearDown(container.dispose);

    container.read(appThemeModeProvider.notifier).setMode(AppThemeMode.light);
    await _waitUntil(
      () => localStore.saveCount == 1 && remoteStore.saveCount == 1,
    );

    expect(localStore.snapshot.themeMode, ThemeMode.light);
    expect(localStore.snapshot.clipboardAutoSync, isFalse);
    expect(localStore.snapshot.onboardingCompleted, isTrue);
    expect(localStore.snapshot.onboardingCurrentStep, 3);
    expect(localStore.snapshot.onboardingLastSeenAt, DateTime.utc(2026, 5, 1));
    expect(localStore.snapshot.onboardingAccessibilitySkipped, isTrue);

    expect(remoteStore.snapshot.themeMode, ThemeMode.light);
    expect(remoteStore.snapshot.retentionPolicy, UserRetentionPolicy.oneDay);
    expect(remoteStore.snapshot.transcriptionSync, isFalse);
    expect(remoteStore.snapshot.onboardingCompleted, isTrue);
    expect(remoteStore.snapshot.onboardingCurrentStep, 2);
    expect(remoteStore.snapshot.onboardingMicrophoneSkipped, isTrue);
  });

  test('loads theme from keyboard status to stay in sync with IME', () async {
    debugDefaultTargetPlatformOverride = TargetPlatform.android;
    final initial = UserSettingsSnapshot.defaults().copyWith(
      themeMode: ThemeMode.light,
      clipboardAutoSync: true,
    );
    final localStore = _MemoryLocalSettingsStore(initial);
    final remoteStore = _MemorySettingsStore(initial);
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(_keyboardChannel, (call) async {
          if (call.method == 'getKeyboardStatus') {
            return <String, Object?>{'supported': true, 'themeMode': 'dark'};
          }
          if (call.method == 'setKeyboardThemeMode') {
            return const <String, Object?>{};
          }
          return null;
        });

    final container = ProviderContainer(
      overrides: [
        initialAppThemeModeProvider.overrideWithValue(AppThemeMode.light),
        localSettingsStoreProvider.overrideWithValue(localStore),
        settingsStoreProvider.overrideWithValue(remoteStore),
      ],
    );
    addTearDown(container.dispose);
    container.read(appThemeModeProvider);

    await _waitUntil(
      () =>
          localStore.snapshot.themeMode == ThemeMode.dark &&
          remoteStore.snapshot.themeMode == ThemeMode.dark,
    );

    expect(container.read(appThemeModeProvider), AppThemeMode.dark);
  });

  test('syncFromKeyboardThemeModeValue updates providers and persists', () async {
    final localStore = _MemoryLocalSettingsStore(
      const UserSettingsSnapshot.defaults(),
    );
    final remoteStore = _MemorySettingsStore(
      const UserSettingsSnapshot.defaults(),
    );

    final container = ProviderContainer(
      overrides: [
        initialAppThemeModeProvider.overrideWithValue(AppThemeMode.light),
        localSettingsStoreProvider.overrideWithValue(localStore),
        settingsStoreProvider.overrideWithValue(remoteStore),
      ],
    );
    addTearDown(container.dispose);

    await container
        .read(appThemeModeProvider.notifier)
        .syncFromKeyboardThemeModeValue('dark');
    await _waitUntil(
      () =>
          localStore.snapshot.themeMode == ThemeMode.dark &&
          remoteStore.snapshot.themeMode == ThemeMode.dark,
    );

    expect(container.read(appThemeModeProvider), AppThemeMode.dark);
  });
}

Future<void> _waitUntil(bool Function() predicate) async {
  for (var attempt = 0; attempt < 20; attempt += 1) {
    if (predicate()) {
      return;
    }
    await Future<void>.delayed(Duration.zero);
  }
  fail('Timed out waiting for async provider persistence.');
}

class _MemoryLocalSettingsStore extends LocalSettingsStore {
  _MemoryLocalSettingsStore(this.snapshot);

  UserSettingsSnapshot snapshot;
  int saveCount = 0;

  @override
  Future<UserSettingsSnapshot> load() async => snapshot;

  @override
  Future<void> save(UserSettingsSnapshot settings) async {
    snapshot = settings;
    saveCount += 1;
  }

  @override
  Stream<UserSettingsSnapshot> watch() async* {
    yield snapshot;
  }
}

class _MemorySettingsStore implements SettingsStore {
  _MemorySettingsStore(this.snapshot);

  UserSettingsSnapshot snapshot;
  int saveCount = 0;

  @override
  Future<UserSettingsSnapshot> load() async => snapshot;

  @override
  Future<void> save(UserSettingsSnapshot settings) async {
    snapshot = settings;
    saveCount += 1;
  }

  @override
  Stream<UserSettingsSnapshot> watch() async* {
    yield snapshot;
  }
}
