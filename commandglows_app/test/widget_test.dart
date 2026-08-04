import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:commandglows_app/core/theme/app_theme.dart';
import 'package:commandglows_app/core/bootstrap/supabase_bootstrap.dart';
import 'package:commandglows_app/core/platform/android_keyboard_bridge.dart';
import 'package:commandglows_app/core/platform/android_overlay_bridge.dart';
import 'package:commandglows_app/core/platform/platform_capabilities.dart';
import 'package:commandglows_app/core/sync/sync_status.dart';
import 'package:commandglows_app/features/clipboard/application/clipboard_store_provider.dart';
import 'package:commandglows_app/features/clipboard/data/in_memory_clipboard_history_store.dart';
import 'package:commandglows_app/features/clipboard/domain/clipboard_store.dart';
import 'package:commandglows_app/features/clipboard/presentation/clipboard_screen.dart';
import 'package:commandglows_app/features/auth/application/auth_session_provider.dart';
import 'package:commandglows_app/features/auth/application/suite_identity_provider.dart';
import 'package:commandglows_app/features/auth/domain/auth_session_store.dart';
import 'package:commandglows_app/features/auth/domain/product_entitlement.dart';
import 'package:commandglows_app/features/auth/domain/suite_identity.dart';
import 'package:commandglows_app/features/keyboard/domain/keyboard_models.dart';
import 'package:commandglows_app/features/keyboard/presentation/keyboard_preview_screen.dart';
import 'package:commandglows_app/features/clipboard/domain/clipboard_normalizer.dart';
import 'package:commandglows_app/features/shell/presentation/app_shell_screen.dart';
import 'package:commandglows_app/features/settings/application/settings_store_provider.dart';
import 'package:commandglows_app/features/settings/domain/settings_store.dart';
import 'package:commandglows_app/features/settings/presentation/settings_screen.dart';
import 'package:commandglows_app/features/voice/domain/transcription_draft.dart';

const _overlayChannel = MethodChannel('commandglows_app/overlay');
const _keyboardChannel = MethodChannel('commandglows_app/keyboard');
const _secureStorageChannel = MethodChannel(
  'plugins.it_nomads.com/flutter_secure_storage',
);

void _installAndroidBridgeMocks({
  bool keyboardEnabled = false,
  bool keyboardActive = false,
  bool clipboardSyncDesired = false,
  bool mediaSessionAccessGranted = false,
  bool systemSettingsWriteGranted = false,
  bool overlayPermissionGranted = false,
  bool overlayEnabled = false,
  bool accessibilityPermissionGranted = false,
  bool recordAudioGranted = false,
}) {
  final messenger =
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;
  messenger.setMockMethodCallHandler(_overlayChannel, (call) async {
    switch (call.method) {
      case 'getOverlayStatus':
        return <String, Object?>{
          'enabled': overlayEnabled,
          'requestedEnabled': overlayEnabled,
          'running': overlayEnabled,
          'overlayPermissionGranted': overlayPermissionGranted,
          'accessibilityPermissionGranted': accessibilityPermissionGranted,
          'recordAudioGranted': recordAudioGranted,
          'deliveryMode': 'clipboard_only',
          'sizeScale': 1.0,
          'opacity': 0.8,
        };
      case 'drainOverlayEvents':
        return <Object?>[];
    }
    return null;
  });
  messenger.setMockMethodCallHandler(_keyboardChannel, (call) async {
    switch (call.method) {
      case 'getKeyboardStatus':
        return <String, Object?>{
          'supported': true,
          'enabled': keyboardEnabled,
          'active': keyboardActive,
          'voiceEnabled': true,
          'clipboardSyncDesired': clipboardSyncDesired,
          'mediaControlsEnabled': true,
          'mediaSessionAccessGranted': mediaSessionAccessGranted,
          'systemSettingsWriteGranted': systemSettingsWriteGranted,
          'privacyMode': 'auto',
          'keyVibrationEnabled': true,
          'keySoundEnabled': false,
          'spellingSuggestionsEnabled': true,
          'specialKeyCornersEnabled': false,
          'autoCloseModesEnabled': true,
          'frenchLanguageEnabled': true,
          'englishLanguageEnabled': true,
        };
      case 'drainKeyboardClipboardEvents':
        return <Object?>[];
      case 'drainKeyboardVoiceEvents':
        return <Object?>[];
      case 'setKeyboardSnippetRules':
      case 'setKeyboardDictionaryRules':
        return true;
    }
    return null;
  });
  messenger.setMockMethodCallHandler(_secureStorageChannel, (call) async {
    switch (call.method) {
      case 'containsKey':
        return false;
      case 'read':
        return null;
      case 'readAll':
        return <String, String>{};
      case 'write':
      case 'delete':
      case 'deleteAll':
        return null;
    }
    return null;
  });
}

void _clearAndroidBridgeMocks() {
  final messenger =
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;
  messenger.setMockMethodCallHandler(_overlayChannel, null);
  messenger.setMockMethodCallHandler(_keyboardChannel, null);
  messenger.setMockMethodCallHandler(_secureStorageChannel, null);
}

Widget _appShellTestWidget() {
  return ProviderScope(
    child: MaterialApp(
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      home: const AppShellScreen(),
    ),
  );
}

Widget _appShellTestWidgetWithInitialOnboardingStep(String onboardingStep) {
  return ProviderScope(
    child: MaterialApp(
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      home: AppShellScreen(initialOnboardingStep: onboardingStep),
    ),
  );
}

Widget _routedSettingsTestWidget({
  String initialLocation = '/settings',
  List<Object> overrides = const [],
}) {
  final router = GoRouter(
    initialLocation: initialLocation,
    routes: [
      GoRoute(
        path: '/home',
        builder: (context, state) => AppShellScreen(
          initialOnboardingStep: state.uri.queryParameters['onboarding'],
        ),
      ),
      GoRoute(
        path: '/settings',
        builder: (context, state) => SettingsScreen(
          initialSectionId: state.uri.queryParameters['section'],
          onResumeOnboarding: () => context.go('/home?onboarding=resume'),
        ),
      ),
    ],
  );
  addTearDown(router.dispose);
  return ProviderScope(
    overrides: overrides.cast(),
    child: MaterialApp.router(
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      routerConfig: router,
    ),
  );
}

class _MemorySettingsStore implements SettingsStore {
  _MemorySettingsStore(this.snapshot);

  UserSettingsSnapshot snapshot;

  @override
  Future<UserSettingsSnapshot> load() async => snapshot;

  @override
  Future<void> save(UserSettingsSnapshot settings) async {
    snapshot = settings;
  }

  @override
  Stream<UserSettingsSnapshot> watch() async* {
    yield snapshot;
  }
}

class _RecordingCloudAuthStore implements AuthSessionStore {
  var emailPasswordCalls = 0;

  @override
  Future<AuthSessionSnapshot> currentSession() async =>
      const AuthSessionSnapshot(
        user: null,
        syncStatus: SyncStatus.unavailable(),
      );

  @override
  Stream<AuthSessionSnapshot> watchSession() => Stream.value(
    const AuthSessionSnapshot(user: null, syncStatus: SyncStatus.unavailable()),
  );

  @override
  Future<void> signInAnonymously() async {}

  @override
  Future<void> signInWithEmailPassword({
    required String email,
    required String password,
  }) async {
    emailPasswordCalls += 1;
  }

  @override
  Future<void> createAccountWithEmailPassword({
    required String email,
    required String password,
  }) async {}

  @override
  Future<void> signInWithGoogle() async {}

  @override
  Future<void> signInWithGoogleIdToken({required String? idToken}) async {}

  @override
  Future<void> signOut() async {}
}

class _PostAuthRemoteAuthStore implements AuthSessionStore {
  _PostAuthRemoteAuthStore(this.signedInSession)
    : _session = const AuthSessionSnapshot.localFallback() {
    _controller.add(_session);
  }

  final AuthSessionSnapshot signedInSession;
  final _controller = StreamController<AuthSessionSnapshot>();
  AuthSessionSnapshot _session;
  int emailPasswordCalls = 0;

  @override
  Future<AuthSessionSnapshot> currentSession() async => _session;

  @override
  Stream<AuthSessionSnapshot> watchSession() {
    return _controller.stream;
  }

  @override
  Future<void> signInAnonymously() async {}

  @override
  Future<void> signInWithEmailPassword({
    required String email,
    required String password,
  }) async {
    emailPasswordCalls += 1;
    _session = signedInSession;
    _controller.add(_session);
  }

  @override
  Future<void> createAccountWithEmailPassword({
    required String email,
    required String password,
  }) async {}

  @override
  Future<void> signInWithGoogle() async {}

  @override
  Future<void> signInWithGoogleIdToken({required String? idToken}) async {}

  @override
  Future<void> signOut() async {}

  void dispose() {
    _controller.close();
  }
}

class _PendingSignupWelcomeController extends SignupWelcomeController {
  @override
  bool build() => true;
}

const _postAuthSignedInSession = AuthSessionSnapshot(
  user: AuthUserSnapshot(
    id: 'test-user-id',
    provider: AuthProviderKind.emailPassword,
    email: 'alice@example.test',
  ),
  syncStatus: SyncStatus(health: SyncHealth.synced),
);

const _postAuthSuiteActiveIdentity = SuiteIdentitySnapshot(
  status: SuiteAccountStatus.accessActive,
  globalUserId: 'global-user-id',
  entitlements: [
    ProductEntitlement(
      productId: ProductId.commandglowsApp,
      status: ProductEntitlementStatus.active,
      plan: 'pro',
    ),
  ],
);

const _postAuthSuiteInactiveIdentity = SuiteIdentitySnapshot(
  status: SuiteAccountStatus.accessInactive,
  globalUserId: 'global-user-id',
  entitlements: [],
);

Widget _keyboardPreviewTestWidget() {
  return ProviderScope(
    child: MaterialApp(
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      home: const Scaffold(body: KeyboardPreviewScreen()),
    ),
  );
}

Widget _clipboardScreenTestWidget(ClipboardHistoryStore store) {
  return ProviderScope(
    overrides: [clipboardStoreProvider.overrideWithValue(store)],
    child: MaterialApp(
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      home: const Scaffold(body: ClipboardScreen()),
    ),
  );
}

String _simulatedBufferText(WidgetTester tester) {
  final selectable = tester.widget<SelectableText>(
    find.byKey(const Key('keyboard-preview-simulated-buffer')),
  );
  return selectable.data ?? selectable.textSpan?.toPlainText() ?? '';
}

String _simulatedStatusText(WidgetTester tester) {
  final status = tester.widget<Text>(
    find.byKey(const Key('keyboard-preview-simulated-status')),
  );
  return status.data ?? '';
}

Finder _selectableTextContaining(String pattern) {
  return find.byWidgetPredicate((widget) {
    if (widget is! SelectableText) {
      return false;
    }
    final text = widget.data ?? widget.textSpan?.toPlainText() ?? '';
    return text.contains(pattern);
  });
}

Future<void> _pumpNavigationFrame(WidgetTester tester) async {
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 300));
}

Future<void> _selectDropdownOption(
  WidgetTester tester,
  Key dropdownKey,
  String optionText,
) async {
  await tester.ensureVisible(find.byKey(dropdownKey));
  await tester.tap(find.byKey(dropdownKey));
  await tester.pumpAndSettle();
  await tester.tap(find.text(optionText).last);
  await tester.pumpAndSettle();
}

Future<void> _tapVisible(WidgetTester tester, Finder finder) async {
  await tester.ensureVisible(finder);
  await tester.tap(finder);
  await tester.pumpAndSettle();
}

void _useLargeViewport(WidgetTester tester) {
  tester.view.physicalSize = const Size(1440, 2200);
  tester.view.devicePixelRatio = 1.0;
}

void main() {
  test('app theme mode maps Material theme modes with system fallback', () {
    expect(AppThemeMode.fromThemeMode(ThemeMode.system), AppThemeMode.system);
    expect(AppThemeMode.fromThemeMode(ThemeMode.light), AppThemeMode.light);
    expect(AppThemeMode.fromThemeMode(ThemeMode.dark), AppThemeMode.dark);
  });

  test('transcription draft validates non-empty payload and known source', () {
    const valid = TranscriptionDraft(
      rawText: 'hello',
      cleanedText: 'Hello.',
      language: 'en',
      source: 'advanced',
      durationMs: 1200,
    );
    const invalid = TranscriptionDraft(
      rawText: ' ',
      cleanedText: '',
      language: 'en',
      source: 'unknown',
      durationMs: -1,
    );

    expect(valid.isValid, isTrue);
    expect(invalid.isValid, isFalse);
  });

  test('keyboard transcription source is valid', () {
    const draft = TranscriptionDraft(
      rawText: 'keyboard text',
      cleanedText: 'Keyboard text.',
      language: 'en',
      source: 'keyboard',
      durationMs: 400,
    );

    expect(draft.isValid, isTrue);
  });

  test('android keyboard status parses native bridge maps', () {
    final status = AndroidKeyboardStatus.fromMap({
      'supported': true,
      'enabled': true,
      'active': false,
      'voiceEnabled': false,
      'customActionBarEnabled': true,
      'clipboardSyncDesired': true,
      'mediaControlsEnabled': true,
      'mediaVolumeStepPercent': 25,
      'mediaBrightnessStepPercent': 15,
      'actionRowHeightScale': 0.3,
      'privacyMode': 'strict',
      'cornerPresetId': 'developer_symbols',
    });

    expect(status.supported, isTrue);
    expect(status.enabled, isTrue);
    expect(status.active, isFalse);
    expect(status.voiceEnabled, isFalse);
    expect(status.customActionBarEnabled, isTrue);
    expect(status.clipboardSyncDesired, isTrue);
    expect(status.mediaVolumeStepPercent, 20);
    expect(status.mediaBrightnessStepPercent, 15);
    expect(status.actionRowHeightScale, closeTo(0.56, 0.0001));
    expect(status.privacyMode, KeyboardPrivacyMode.strict);
    expect(status.cornerPresetId, 'developer_symbols');
    expect(status.layoutProfile, KeyboardLayoutProfile.azerty);
    expect(status.cornerModeEnabled, isTrue);
    expect(
      status.toPreferencesMap(mediaControlsEnabled: false),
      containsPair('mediaControlsEnabled', false),
    );
  });

  test('android keyboard corner config parses presets and overrides', () {
    final config = AndroidKeyboardCornerConfig.fromMap({
      'presetId': 'punctuation_corners',
      'overrides': [
        {
          'keyId': 'letter-a',
          'slot': 'topLeft',
          'expression': "JA:'j\\'arrive'",
          'label': 'JA',
          'sensitive': true,
        },
      ],
      'availablePresets': [
        {'id': 'punctuation_corners', 'name': 'Punctuation corners'},
      ],
    });

    final resolved = KeyboardCornerPresetCatalog.resolvedForKey(
      config: config,
      keyId: 'letter-a',
      cornersEnabled: true,
      specialKeyCornersEnabled: false,
      privateMode: false,
    );
    final privateResolved = KeyboardCornerPresetCatalog.resolvedForKey(
      config: config,
      keyId: 'letter-a',
      cornersEnabled: true,
      specialKeyCornersEnabled: false,
      privateMode: true,
    );

    expect(config.presetId, 'punctuation_corners');
    expect(config.availablePresets.single.name, 'Punctuation corners');
    expect(resolved[KeyboardCornerSlot.topLeft]?.displayLabel, 'JA');
    expect(privateResolved[KeyboardCornerSlot.topLeft], isNull);
  });

  test('dart corner presets do not resolve native defaults', () {
    final config = AndroidKeyboardCornerConfig.defaults();
    final aKey = KeyboardCornerPresetCatalog.resolvedForKey(
      config: config,
      keyId: 'letter-a',
      cornersEnabled: true,
      specialKeyCornersEnabled: false,
      privateMode: false,
    );
    final rKey = KeyboardCornerPresetCatalog.resolvedForKey(
      config: config,
      keyId: 'letter-r',
      cornersEnabled: true,
      specialKeyCornersEnabled: false,
      privateMode: false,
    );
    expect(config.presetId, KeyboardCornerPresetCatalog.frenchAccents);
    expect(aKey, isEmpty);
    expect(rKey, isEmpty);
  });

  test('explicit corner override still resolves without preset defaults', () {
    const shortcut = AndroidKeyboardCornerShortcut(
      keyId: 'letter-w',
      slot: KeyboardCornerSlot.up,
      expression: 'action:NavigateLineUp',
      label: '↑',
    );
    final config = AndroidKeyboardCornerConfig.defaults().copyWith(
      overrides: const [shortcut],
    );

    final resolved = KeyboardCornerPresetCatalog.resolvedForKey(
      config: config,
      keyId: 'letter-w',
      cornersEnabled: true,
      specialKeyCornersEnabled: false,
      privateMode: false,
    );

    expect(resolved, hasLength(1));
    expect(resolved[KeyboardCornerSlot.up], shortcut);
  });

  test('android keyboard clipboard event parses native bridge maps', () {
    final event = AndroidKeyboardClipboardEvent.fromMap({
      'content': ' copied text ',
      'source': 'keyboard_clipboard',
      'deviceId': 'android:abc',
      'capturedAtEpochMillis': 1778263200000,
      'sourceMetadata': {'action': 'copy_selection', 'ignored': <String>[]},
    });

    expect(event, isNotNull);
    expect(event?.content, ' copied text ');
    expect(event?.source.databaseValue, 'keyboard_clipboard');
    expect(event?.deviceId, 'android:abc');
    expect(event?.capturedAtUtc.isUtc, isTrue);
    expect(event?.sourceMetadata, containsPair('action', 'copy_selection'));
    expect(event?.sourceMetadata, isNot(contains('ignored')));
  });

  test('android keyboard voice event parses native bridge maps', () {
    final event = AndroidKeyboardVoiceEvent.fromMap({
      'rawText': ' hello voice ',
      'cleanedText': 'hello voice',
      'language': 'en-US',
      'source': 'keyboard',
      'durationMs': 1200,
      'capturedAtEpochMillis': 1778263200000,
    });

    expect(event, isNotNull);
    expect(event?.rawText, 'hello voice');
    expect(event?.cleanedText, 'hello voice');
    expect(event?.language, 'en-US');
    expect(event?.source, 'keyboard');
    expect(event?.durationMs, 1200);
    expect(event?.capturedAtUtc.isUtc, isTrue);
  });

  test('android overlay event parses native bridge maps', () {
    final event = AndroidOverlayEvent.fromMap({
      'type': 'serviceError',
      'capturedAtEpochMillis': 1778263200000,
      'payload': {'code': 'OVERLAY_PERMISSION_REVOKED', 'ignored': <String>[]},
    });

    expect(event, isNotNull);
    expect(event?.type, AndroidOverlayEventType.serviceError);
    expect(event?.capturedAtUtc.isUtc, isTrue);
    expect(event?.payload, containsPair('code', 'OVERLAY_PERMISSION_REVOKED'));
    expect(event?.payload, isNot(contains('ignored')));
  });

  test('android overlay pause and resume events parse native bridge maps', () {
    final pauseEvent = AndroidOverlayEvent.fromMap({
      'type': 'recordPause',
      'capturedAtEpochMillis': 1778263200000,
      'payload': <String, Object?>{},
    });
    final resumeEvent = AndroidOverlayEvent.fromMap({
      'type': 'recordResume',
      'capturedAtEpochMillis': 1778263200001,
      'payload': <String, Object?>{},
    });

    expect(pauseEvent?.type, AndroidOverlayEventType.recordPause);
    expect(resumeEvent?.type, AndroidOverlayEventType.recordResume);
  });

  test('android overlay text delivery event parses native bridge map', () {
    final event = AndroidOverlayEvent.fromMap({
      'type': 'overlayTextDelivery',
      'capturedAtEpochMillis': 1778263200002,
      'payload': {
        'rawText': ' hello ',
        'cleanedText': 'hello',
        'language': 'fr-FR',
        'source': 'overlay',
        'durationMs': 1200,
        'delivery': {
          'injected': true,
          'clipboardCopied': false,
          'sensitiveField': false,
          'deliveryPolicy': 'injection_and_clipboard',
        },
      },
    });

    expect(event, isNotNull);
    expect(event?.type, AndroidOverlayEventType.overlayTextDelivery);

    final delivery = AndroidOverlayEventTextDelivery.fromOverlayEvent(event!);
    expect(delivery, isNotNull);
    expect(delivery?.cleanedText, 'hello');
    expect(delivery?.source, 'overlay');
    expect(delivery?.durationMs, 1200);
    expect(delivery?.delivery.deliveryPolicy, 'injection_and_clipboard');
    expect(delivery?.delivery.injected, true);
    expect(delivery?.delivery.clipboardCopied, false);
  });

  test('android overlay delivery result parses native bridge maps', () {
    final result = AndroidOverlayDeliveryResult.fromMap({
      'injected': true,
      'clipboardCopied': true,
      'sensitiveField': false,
      'deliveryPolicy': 'clipboard_only',
    });

    expect(result.injected, isTrue);
    expect(result.clipboardCopied, isTrue);
    expect(result.sensitiveField, isFalse);
    expect(result.deliveryPolicy, 'clipboard_only');
  });

  test('clipboard normalized hash is stable across whitespace', () {
    final first = sha256Hex(normalizeClipboardText(' hello   world '));
    final second = sha256Hex(normalizeClipboardText('hello world'));

    expect(first, second);
    expect(first, hasLength(64));
  });

  test('keyboard bridge returns unsupported status off Android', () async {
    final previousPlatform = debugDefaultTargetPlatformOverride;
    debugDefaultTargetPlatformOverride = TargetPlatform.linux;
    addTearDown(() => debugDefaultTargetPlatformOverride = previousPlatform);

    final status = await AndroidKeyboardBridge.getStatus();

    expect(status.supported, isFalse);
    expect(status.enabled, isFalse);
  });

  test(
    'platform capability limits keep Linux speech and Android-only surfaces unavailable',
    () {
      final previousPlatform = debugDefaultTargetPlatformOverride;
      debugDefaultTargetPlatformOverride = TargetPlatform.linux;
      addTearDown(() => debugDefaultTargetPlatformOverride = previousPlatform);

      expect(PlatformCapabilities.localSpeechSupported, isFalse);
      expect(PlatformCapabilities.overlaySupported, isFalse);
      expect(PlatformCapabilities.keyboardImeSupported, isFalse);
      expect(PlatformCapabilities.secureStorageDegraded, isTrue);
    },
  );

  test('supabase config prefers publishable key', () {
    final config = SupabaseBootstrap.resolveConfig(
      url: ' https://example.supabase.co ',
      publishableKey: ' sb_publishable_current ',
      legacyAnonKey: 'legacy-anon-key',
    );

    expect(config.isComplete, isTrue);
    expect(config.url, 'https://example.supabase.co');
    expect(config.publishableKey, 'sb_publishable_current');
    expect(config.missingEnvironmentNames, isEmpty);
  });

  test('supabase config accepts legacy anon key as compatibility fallback', () {
    final config = SupabaseBootstrap.resolveConfig(
      url: 'https://example.supabase.co',
      publishableKey: '',
      legacyAnonKey: 'legacy-anon-key',
    );

    expect(config.isComplete, isTrue);
    expect(config.publishableKey, 'legacy-anon-key');
  });

  test('supabase config reports current missing variable names', () {
    final config = SupabaseBootstrap.resolveConfig(
      url: '',
      publishableKey: '',
      legacyAnonKey: '',
    );

    expect(config.isComplete, isFalse);
    expect(config.missingEnvironmentNames, [
      SupabaseBootstrap.urlEnvironmentName,
      SupabaseBootstrap.publishableKeyEnvironmentName,
    ]);
  });

  testWidgets('app shell shows onboarding and back returns to previous tab', (
    tester,
  ) async {
    await tester.pumpWidget(_appShellTestWidget());
    await _pumpNavigationFrame(tester);

    expect(find.text('Start here'), findsNothing);
    expect(find.textContaining('Missing Supabase config'), findsNothing);
    expect(find.textContaining('Cloud sync is disabled'), findsNothing);
    expect(find.text('Accueil'), findsWidgets);

    await tester.tap(find.byIcon(Icons.text_snippet_outlined).last);
    await _pumpNavigationFrame(tester);
    expect(find.text('Nouveau snippet'), findsOneWidget);
    expect(find.text('Déclencheur'), findsOneWidget);
    expect(find.text('Snippets'), findsWidgets);

    final handled = await tester.binding.handlePopRoute();
    await _pumpNavigationFrame(tester);

    expect(handled, isTrue);
    expect(find.text('Accueil'), findsWidgets);
  });

  testWidgets('new account welcome guide is shown once in app shell', (
    tester,
  ) async {
    _useLargeViewport(tester);
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          signupWelcomePendingProvider.overrideWith(
            _PendingSignupWelcomeController.new,
          ),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          darkTheme: AppTheme.dark,
          home: const AppShellScreen(),
        ),
      ),
    );
    await tester.pump();

    final welcomeHeading = find.textContaining('Bienvenue dans ');
    expect(welcomeHeading, findsOneWidget);
    expect(find.text('Ouvrir le guide'), findsOneWidget);
    expect(find.textContaining('Ton compte est prêt.'), findsOneWidget);

    await tester.tap(find.widgetWithText(OutlinedButton, 'Commencer'));
    await _pumpNavigationFrame(tester);

    expect(welcomeHeading, findsNothing);
  });

  testWidgets('settings can resume onboarding overlay', (tester) async {
    final previousPlatform = debugDefaultTargetPlatformOverride;
    debugDefaultTargetPlatformOverride = TargetPlatform.android;
    tester.view.physicalSize = const Size(900, 5000);
    tester.view.devicePixelRatio = 1.0;
    _installAndroidBridgeMocks();

    try {
      await tester.pumpWidget(
        _routedSettingsTestWidget(initialLocation: '/home'),
      );
      await _pumpNavigationFrame(tester);

      expect(find.text('Accueil'), findsWidgets);
      expect(find.text('Configuration CMDglows'), findsOneWidget);
      final refreshAccessButton = find.widgetWithText(
        OutlinedButton,
        'Re-vérifier les accès',
      );
      final deferButton = find.widgetWithText(OutlinedButton, 'Plus tard');
      expect(refreshAccessButton, findsOneWidget);
      expect(deferButton, findsOneWidget);
      expect(
        tester.getTopLeft(refreshAccessButton).dx,
        lessThan(tester.getTopLeft(deferButton).dx),
      );
      expect(find.widgetWithText(OutlinedButton, 'Paramètres'), findsNothing);
      await tester.tap(find.widgetWithText(OutlinedButton, 'Plus tard').last);
      await tester.pumpAndSettle(const Duration(milliseconds: 300));
      expect(find.text('Configuration CMDglows'), findsOneWidget);
      expect(find.text('Onboarding mis en pause'), findsOneWidget);
      expect(find.widgetWithText(TextButton, 'Plus tard'), findsNothing);
      expect(
        find.text(
          'Tu peux reprendre la configuration quand tu veux à partir des paramètres.',
        ),
        findsOneWidget,
      );
      await tester.tap(find.widgetWithText(FilledButton, 'OK'));
      await tester.pumpAndSettle(const Duration(milliseconds: 300));
      expect(find.text('Configuration CMDglows'), findsNothing);
      expect(find.text('Paramètres'), findsWidgets);
      expect(find.text('Onboarding mis en pause'), findsNothing);

      final resumeButton = find.descendant(
        of: find.byKey(const Key('settings-onboarding-persistent-entry')),
        matching: find.widgetWithText(TextButton, 'Reprendre'),
      );
      await tester.scrollUntilVisible(
        resumeButton,
        500,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.ensureVisible(resumeButton);
      await tester.tap(resumeButton, warnIfMissed: false);
      await tester.pumpAndSettle(const Duration(milliseconds: 300));

      expect(find.text('Configuration CMDglows'), findsOneWidget);
      expect(
        find.text('Choisis les usages que tu veux activer'),
        findsOneWidget,
      );
      final microphoneProgressDot = find.byKey(
        const ValueKey('onboarding-progress-dot-microphoneForDictation'),
      );
      await tester.ensureVisible(microphoneProgressDot);
      await tester.tap(microphoneProgressDot);
      await tester.pumpAndSettle(const Duration(milliseconds: 300));
      expect(find.text('Micro et voix'), findsOneWidget);
      expect(find.text('Clavier'), findsNothing);

      final nextButton = find.text('Suivant');
      await tester.ensureVisible(nextButton);
      await tester.tap(nextButton);
      await tester.pumpAndSettle(const Duration(milliseconds: 300));
      expect(find.text('Clavier'), findsOneWidget);
      expect(find.text('Service Accessibilité'), findsNothing);

      await tester.ensureVisible(nextButton);
      await tester.tap(nextButton);
      await tester.pumpAndSettle(const Duration(milliseconds: 300));
      expect(find.text('Accès notifications et média'), findsOneWidget);
      expect(
        find.textContaining(
          'Historique et synchronisation du presse-papiers clavier.',
        ),
        findsNothing,
      );

      final clipboardProgressDot = find.byKey(
        const ValueKey('onboarding-progress-dot-keyboardClipboard'),
      );
      await tester.ensureVisible(clipboardProgressDot);
      await tester.tap(clipboardProgressDot);
      await tester.pumpAndSettle(const Duration(milliseconds: 300));
      expect(
        find.textContaining(
          'Historique et synchronisation du presse-papiers clavier.',
        ),
        findsOneWidget,
      );
      expect(find.text('Clavier'), findsNothing);

      final accessibilityProgressDot = find.byKey(
        const ValueKey('onboarding-progress-dot-accessibility'),
      );
      await tester.ensureVisible(accessibilityProgressDot);
      await tester.tap(accessibilityProgressDot);
      await tester.pumpAndSettle(const Duration(milliseconds: 300));
      expect(find.text('Service Accessibilité'), findsOneWidget);
      expect(
        find.textContaining('Injection directe et assistance'),
        findsOneWidget,
      );
      expect(find.widgetWithText(OutlinedButton, 'Paramètres'), findsNothing);
    } finally {
      debugDefaultTargetPlatformOverride = previousPlatform;
      _clearAndroidBridgeMocks();
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    }
  });

  testWidgets('settings local mode exposes cloud account connection', (
    tester,
  ) async {
    final previousPlatform = debugDefaultTargetPlatformOverride;
    debugDefaultTargetPlatformOverride = TargetPlatform.android;
    _useLargeViewport(tester);
    _installAndroidBridgeMocks();
    final cloudAuthStore = _RecordingCloudAuthStore();

    try {
      await tester.pumpWidget(
        _routedSettingsTestWidget(
          initialLocation: '/settings?section=account_cloud',
          overrides: [
            authSessionProvider.overrideWith(
              (ref) => Stream.value(const AuthSessionSnapshot.localFallback()),
            ),
            remoteAuthConfiguredProvider.overrideWithValue(true),
            remoteAuthSessionStoreProvider.overrideWithValue(cloudAuthStore),
            settingsStoreProvider.overrideWithValue(
              _MemorySettingsStore(const UserSettingsSnapshot.defaults()),
            ),
          ],
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('Mon compte'), findsOneWidget);
      expect(find.textContaining('Connecte ton compte'), findsOneWidget);
      expect(find.text('Compte CommandGlows'), findsNothing);
      expect(find.text('Accès CommandGlows'), findsNothing);
      await _tapVisible(
        tester,
        find.byKey(const Key('settings-connect-cloud-account')),
      );

      expect(find.text('Connexion'), findsOneWidget);
      await tester.enterText(
        find.byKey(const ValueKey('auth-email-field')),
        'test@example.com',
      );
      await tester.enterText(
        find.byKey(const ValueKey('auth-password-field')),
        'password',
      );
      await tester.tap(find.widgetWithText(FilledButton, 'Se connecter'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));
      await tester.pump(const Duration(milliseconds: 300));

      expect(cloudAuthStore.emailPasswordCalls, 1);
      expect(find.text('Mon compte'), findsOneWidget);
    } finally {
      debugDefaultTargetPlatformOverride = previousPlatform;
      _clearAndroidBridgeMocks();
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    }
  });

  testWidgets('settings shows post-auth feedback banner after cloud sign-in', (
    tester,
  ) async {
    final previousPlatform = debugDefaultTargetPlatformOverride;
    debugDefaultTargetPlatformOverride = TargetPlatform.android;
    _useLargeViewport(tester);
    _installAndroidBridgeMocks();
    final remoteStore = _PostAuthRemoteAuthStore(_postAuthSignedInSession);

    try {
      await tester.pumpWidget(
        _routedSettingsTestWidget(
          initialLocation: '/settings?section=account_cloud',
          overrides: [
            remoteAuthSessionStoreProvider.overrideWithValue(remoteStore),
            remoteAuthConfiguredProvider.overrideWithValue(true),
            suiteIdentityProvider.overrideWith(
              (ref) => Stream.value(_postAuthSuiteActiveIdentity),
            ),
            settingsStoreProvider.overrideWithValue(
              _MemorySettingsStore(const UserSettingsSnapshot.defaults()),
            ),
          ],
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));
      await tester.pump(const Duration(milliseconds: 300));

      await _tapVisible(
        tester,
        find.byKey(const Key('settings-connect-cloud-account')),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('Connexion'), findsOneWidget);
      await tester.enterText(
        find.byKey(const ValueKey('auth-email-field')),
        'alice@example.test',
      );
      await tester.enterText(
        find.byKey(const ValueKey('auth-password-field')),
        'password',
      );
      await tester.tap(find.widgetWithText(FilledButton, 'Se connecter'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));
      await tester.pump(const Duration(milliseconds: 300));

      expect(
        find.text(
          'Compte cloud vérifié. Accès CommandGlows actif; les catégories '
          'synchronisables sont évaluées.',
        ),
        findsOneWidget,
      );
    } finally {
      remoteStore.dispose();
      debugDefaultTargetPlatformOverride = previousPlatform;
      _clearAndroidBridgeMocks();
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    }
  });

  testWidgets('settings without suite access keeps data categories local', (
    tester,
  ) async {
    final previousPlatform = debugDefaultTargetPlatformOverride;
    debugDefaultTargetPlatformOverride = TargetPlatform.android;
    _useLargeViewport(tester);
    _installAndroidBridgeMocks();

    try {
      await tester.pumpWidget(
        _routedSettingsTestWidget(
          initialLocation: '/settings?section=account_cloud',
          overrides: [
            authSessionProvider.overrideWith(
              (ref) => Stream.value(
                const AuthSessionSnapshot(
                  user: AuthUserSnapshot(
                    id: 'remote-user-id',
                    provider: AuthProviderKind.emailPassword,
                    email: 'remote@example.test',
                  ),
                  syncStatus: SyncStatus(health: SyncHealth.synced),
                ),
              ),
            ),
            remoteAuthConfiguredProvider.overrideWithValue(true),
            suiteIdentityProvider.overrideWith(
              (ref) => Stream.value(_postAuthSuiteInactiveIdentity),
            ),
            settingsStoreProvider.overrideWithValue(
              _MemorySettingsStore(const UserSettingsSnapshot.defaults()),
            ),
          ],
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('Ce qui est synchronisé'), findsOneWidget);
      expect(find.text('Aucune synchronisation active.'), findsOneWidget);
      expect(
        find.text('Aucune donnée synchronisée pour le moment.'),
        findsNothing,
      );
      expect(
        find.text('Apparence · Accès CommandGlows inactif'),
        findsOneWidget,
      );
      expect(find.text('Papiers · Accès CommandGlows inactif'), findsOneWidget);
      expect(find.text('Dico · Accès CommandGlows inactif'), findsOneWidget);
      expect(find.text('Voix · Accès CommandGlows inactif'), findsOneWidget);
      expect(find.text('Clés IA · Local uniquement'), findsOneWidget);
      expect(
        find.textContaining('Compte connecté · Accès inactif'),
        findsOneWidget,
      );
      expect(find.text('Mon compte'), findsOneWidget);
      expect(find.text('Compte CommandGlows'), findsNothing);
      expect(find.text('Accès CommandGlows'), findsNothing);
    } finally {
      debugDefaultTargetPlatformOverride = previousPlatform;
      _clearAndroidBridgeMocks();
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    }
  });

  testWidgets('settings on non-Android shows keyboard sync unavailable', (
    tester,
  ) async {
    final previousPlatform = debugDefaultTargetPlatformOverride;
    debugDefaultTargetPlatformOverride = TargetPlatform.iOS;
    _useLargeViewport(tester);
    _installAndroidBridgeMocks();

    try {
      await tester.pumpWidget(
        _routedSettingsTestWidget(
          initialLocation: '/settings?section=maintenance',
          overrides: [
            remoteAuthConfiguredProvider.overrideWithValue(true),
            authSessionProvider.overrideWith(
              (ref) => Stream.value(const AuthSessionSnapshot.localFallback()),
            ),
            settingsStoreProvider.overrideWithValue(
              _MemorySettingsStore(const UserSettingsSnapshot.defaults()),
            ),
          ],
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('Maintenance'), findsOneWidget);
      expect(find.byType(SettingsScreen), findsOneWidget);
      expect(
        find.textContaining('Clavier Android indisponible sur'),
        findsOneWidget,
      );
    } finally {
      debugDefaultTargetPlatformOverride = previousPlatform;
      _clearAndroidBridgeMocks();
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    }
  });

  testWidgets('settings hides keyboard raw diagnostics until expanded', (
    tester,
  ) async {
    final previousPlatform = debugDefaultTargetPlatformOverride;
    debugDefaultTargetPlatformOverride = TargetPlatform.android;
    _useLargeViewport(tester);
    _installAndroidBridgeMocks(keyboardEnabled: true, keyboardActive: true);

    try {
      await tester.pumpWidget(
        _routedSettingsTestWidget(
          initialLocation: '/settings?section=keyboard',
          overrides: [
            remoteAuthConfiguredProvider.overrideWithValue(true),
            authSessionProvider.overrideWith(
              (ref) => Stream.value(const AuthSessionSnapshot.localFallback()),
            ),
            settingsStoreProvider.overrideWithValue(
              _MemorySettingsStore(const UserSettingsSnapshot.defaults()),
            ),
          ],
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('Clavier'), findsAtLeastNWidgets(1));
      expect(find.text('État du clavier'), findsOneWidget);
      expect(find.textContaining('enabled='), findsNothing);
      expect(find.textContaining('active='), findsNothing);
      expect(find.textContaining('recoveries='), findsNothing);
      expect(find.textContaining('sentry='), findsNothing);
      expect(find.text('Diagnostic tactile'), findsNothing);

      await tester.tap(find.text('Diagnostics avancés').first);
      await tester.pumpAndSettle(const Duration(milliseconds: 300));

      expect(_selectableTextContaining('enabled='), findsOneWidget);
      expect(_selectableTextContaining('recoveries='), findsOneWidget);
      expect(find.text('Diagnostic tactile'), findsOneWidget);
    } finally {
      debugDefaultTargetPlatformOverride = previousPlatform;
      _clearAndroidBridgeMocks();
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    }
  });

  testWidgets('settings keeps voice debug actions under support disclosure', (
    tester,
  ) async {
    final previousPlatform = debugDefaultTargetPlatformOverride;
    debugDefaultTargetPlatformOverride = TargetPlatform.android;
    _useLargeViewport(tester);
    _installAndroidBridgeMocks(keyboardEnabled: true, keyboardActive: true);

    try {
      await tester.pumpWidget(
        _routedSettingsTestWidget(
          initialLocation: '/settings?section=voice_packs',
          overrides: [
            remoteAuthConfiguredProvider.overrideWithValue(true),
            authSessionProvider.overrideWith(
              (ref) => Stream.value(const AuthSessionSnapshot.localFallback()),
            ),
            settingsStoreProvider.overrideWithValue(
              _MemorySettingsStore(const UserSettingsSnapshot.defaults()),
            ),
          ],
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('État vocal'), findsOneWidget);
      expect(find.textContaining('runtime='), findsNothing);
      expect(find.text('Marquer mise à jour'), findsNothing);
      expect(find.text('Marquer corrompu'), findsNothing);
      expect(find.text('Simuler mise à jour'), findsNothing);
      expect(find.text('Simuler corruption'), findsNothing);

      await tester.tap(find.text('Support avancé').first);
      await tester.pumpAndSettle(const Duration(milliseconds: 300));

      expect(find.text('Simuler mise à jour'), findsWidgets);
      expect(find.text('Simuler corruption'), findsWidgets);
      expect(_selectableTextContaining('runtime='), findsOneWidget);
    } finally {
      debugDefaultTargetPlatformOverride = previousPlatform;
      _clearAndroidBridgeMocks();
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    }
  });

  testWidgets('settings hides overlay raw service fields until diagnostics', (
    tester,
  ) async {
    final previousPlatform = debugDefaultTargetPlatformOverride;
    debugDefaultTargetPlatformOverride = TargetPlatform.android;
    _useLargeViewport(tester);
    _installAndroidBridgeMocks(
      overlayPermissionGranted: true,
      overlayEnabled: true,
      accessibilityPermissionGranted: true,
    );

    try {
      await tester.pumpWidget(
        _routedSettingsTestWidget(
          initialLocation: '/settings?section=overlay',
          overrides: [
            remoteAuthConfiguredProvider.overrideWithValue(true),
            authSessionProvider.overrideWith(
              (ref) => Stream.value(const AuthSessionSnapshot.localFallback()),
            ),
            settingsStoreProvider.overrideWithValue(
              _MemorySettingsStore(const UserSettingsSnapshot.defaults()),
            ),
          ],
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('État de la bulle'), findsOneWidget);
      expect(find.text('Bulle active, service en cours.'), findsOneWidget);
      expect(find.textContaining('enabled='), findsNothing);
      expect(find.textContaining('service='), findsNothing);

      await tester.tap(find.text('Diagnostics avancés').first);
      await tester.pumpAndSettle(const Duration(milliseconds: 300));

      expect(_selectableTextContaining('enabled='), findsOneWidget);
      expect(_selectableTextContaining('service='), findsOneWidget);
    } finally {
      debugDefaultTargetPlatformOverride = previousPlatform;
      _clearAndroidBridgeMocks();
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    }
  });

  testWidgets('validated onboarding steps stay green when selected', (
    tester,
  ) async {
    final previousPlatform = debugDefaultTargetPlatformOverride;
    debugDefaultTargetPlatformOverride = TargetPlatform.android;
    _useLargeViewport(tester);
    _installAndroidBridgeMocks(keyboardEnabled: true, keyboardActive: true);

    try {
      await tester.pumpWidget(_appShellTestWidget());
      await _pumpNavigationFrame(tester);

      final keyboardProgressDot = find.byKey(
        const ValueKey('onboarding-progress-dot-keyboardIme'),
      );
      await tester.ensureVisible(keyboardProgressDot);
      await tester.tap(keyboardProgressDot);
      await tester.pumpAndSettle(const Duration(milliseconds: 300));

      final activeKeyboardDot = tester.widget<IconButton>(keyboardProgressDot);
      expect(
        activeKeyboardDot.style?.backgroundColor?.resolve(<WidgetState>{}),
        AppColors.success,
      );
      expect(
        activeKeyboardDot.style?.side?.resolve(<WidgetState>{})?.color,
        AppColors.success,
      );
      expect(find.text('Clavier'), findsOneWidget);
      expect(find.text('Clavier CommandGlows keyboard'), findsNothing);
      expect(find.widgetWithText(TextButton, 'Activé'), findsNothing);
      expect(find.widgetWithText(TextButton, 'Plus tard'), findsNothing);
      expect(find.widgetWithText(FilledButton, 'Modifier'), findsOneWidget);
      expect(find.text('Activé'), findsWidgets);
    } finally {
      debugDefaultTargetPlatformOverride = previousPlatform;
      _clearAndroidBridgeMocks();
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    }
  });

  testWidgets('brightness onboarding deep link opens the brightness page', (
    tester,
  ) async {
    final previousPlatform = debugDefaultTargetPlatformOverride;
    debugDefaultTargetPlatformOverride = TargetPlatform.android;
    _useLargeViewport(tester);
    _installAndroidBridgeMocks();

    try {
      await tester.pumpWidget(
        _appShellTestWidgetWithInitialOnboardingStep('brightness'),
      );
      await _pumpNavigationFrame(tester);

      expect(find.text('Configuration CMDglows'), findsOneWidget);
      expect(find.text('Luminosité système'), findsOneWidget);
      expect(find.text('Micro et voix'), findsNothing);
      expect(
        find.textContaining('Contrôle Bri- et Bri+ depuis le clavier.'),
        findsOneWidget,
      );
    } finally {
      debugDefaultTargetPlatformOverride = previousPlatform;
      _clearAndroidBridgeMocks();
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    }
  });

  testWidgets('skipped onboarding progress dot is red', (tester) async {
    final previousPlatform = debugDefaultTargetPlatformOverride;
    debugDefaultTargetPlatformOverride = TargetPlatform.android;
    _useLargeViewport(tester);
    _installAndroidBridgeMocks();
    final settingsStore = _MemorySettingsStore(
      UserSettingsSnapshot.defaults().copyWith(
        onboardingMicrophoneSkipped: true,
      ),
    );

    try {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [settingsStoreProvider.overrideWithValue(settingsStore)],
          child: MaterialApp(
            theme: AppTheme.light,
            darkTheme: AppTheme.dark,
            home: const AppShellScreen(),
          ),
        ),
      );
      await _pumpNavigationFrame(tester);

      final microphoneProgressDot = find.byKey(
        const ValueKey('onboarding-progress-dot-microphoneForDictation'),
      );
      final skippedMicrophoneDot = tester.widget<IconButton>(
        microphoneProgressDot,
      );
      expect(
        skippedMicrophoneDot.style?.backgroundColor?.resolve(<WidgetState>{}),
        AppColors.danger,
      );
      expect(
        skippedMicrophoneDot.style?.side?.resolve(<WidgetState>{})?.color,
        AppColors.danger,
      );
    } finally {
      debugDefaultTargetPlatformOverride = previousPlatform;
      _clearAndroidBridgeMocks();
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    }
  });

  testWidgets('completion groups granted permissions under feature cards', (
    tester,
  ) async {
    final previousPlatform = debugDefaultTargetPlatformOverride;
    debugDefaultTargetPlatformOverride = TargetPlatform.android;
    _useLargeViewport(tester);
    _installAndroidBridgeMocks(
      keyboardEnabled: true,
      keyboardActive: true,
      clipboardSyncDesired: true,
      mediaSessionAccessGranted: true,
      systemSettingsWriteGranted: true,
      overlayPermissionGranted: true,
      overlayEnabled: true,
      accessibilityPermissionGranted: true,
      recordAudioGranted: true,
    );

    try {
      await tester.pumpWidget(_appShellTestWidget());
      await _pumpNavigationFrame(tester);

      expect(find.text('CMDglows est prêt'), findsOneWidget);
      expect(find.text('Dictée depuis le clavier'), findsOneWidget);
      expect(find.text('Microphone'), findsOneWidget);
      expect(find.text('Service Accessibilité'), findsOneWidget);
      expect(find.text('Contrôler ton téléphone plus vite'), findsOneWidget);
      expect(find.text('Luminosité système'), findsOneWidget);
      expect(find.text('Overlay flottant'), findsOneWidget);
      expect(
        find.byKey(const Key('onboarding-completion-loose-list')),
        findsNothing,
      );
    } finally {
      debugDefaultTargetPlatformOverride = previousPlatform;
      _clearAndroidBridgeMocks();
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    }
  });

  testWidgets('completed onboarding card moves to bottom of settings', (
    tester,
  ) async {
    final previousPlatform = debugDefaultTargetPlatformOverride;
    debugDefaultTargetPlatformOverride = TargetPlatform.android;
    _useLargeViewport(tester);
    _installAndroidBridgeMocks(
      keyboardEnabled: true,
      keyboardActive: true,
      clipboardSyncDesired: true,
      mediaSessionAccessGranted: true,
      systemSettingsWriteGranted: true,
      overlayPermissionGranted: true,
      overlayEnabled: true,
      accessibilityPermissionGranted: true,
      recordAudioGranted: true,
    );
    final settingsStore = _MemorySettingsStore(
      UserSettingsSnapshot.defaults().copyWith(onboardingCompleted: true),
    );

    try {
      await tester.pumpWidget(
        _routedSettingsTestWidget(
          overrides: [settingsStoreProvider.overrideWithValue(settingsStore)],
        ),
      );
      await _pumpNavigationFrame(tester);

      expect(find.text('Tout est configuré'), findsOneWidget);
      expect(find.widgetWithText(TextButton, 'Revisiter'), findsOneWidget);

      final visibleTexts = tester
          .widgetList<Text>(find.byType(Text))
          .map((widget) => widget.data ?? widget.textSpan?.toPlainText() ?? '')
          .toList(growable: false);
      expect(
        visibleTexts.indexOf('Onboarding permissions'),
        greaterThan(visibleTexts.indexOf('Maintenance')),
      );
    } finally {
      debugDefaultTargetPlatformOverride = previousPlatform;
      _clearAndroidBridgeMocks();
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    }
  });

  testWidgets('dismissed incomplete onboarding remains resumable in settings', (
    tester,
  ) async {
    final previousPlatform = debugDefaultTargetPlatformOverride;
    debugDefaultTargetPlatformOverride = TargetPlatform.android;
    _useLargeViewport(tester);
    _installAndroidBridgeMocks();
    var resumeCalls = 0;
    final settingsStore = _MemorySettingsStore(
      UserSettingsSnapshot.defaults().copyWith(
        onboardingCompleted: false,
        onboardingNoticeDismissedForever: true,
      ),
    );

    try {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [settingsStoreProvider.overrideWithValue(settingsStore)],
          child: MaterialApp(
            theme: AppTheme.light,
            darkTheme: AppTheme.dark,
            home: SettingsScreen(onResumeOnboarding: () => resumeCalls += 1),
          ),
        ),
      );
      await _pumpNavigationFrame(tester);

      expect(find.text('Onboarding permissions'), findsOneWidget);
      expect(
        find.descendant(
          of: find.byKey(const Key('settings-onboarding-persistent-entry')),
          matching: find.widgetWithText(TextButton, 'Reprendre'),
        ),
        findsOneWidget,
      );
      expect(find.widgetWithText(TextButton, 'Plus tard'), findsNothing);

      final visibleTexts = tester
          .widgetList<Text>(find.byType(Text))
          .map((widget) => widget.data ?? widget.textSpan?.toPlainText() ?? '')
          .toList(growable: false);
      expect(
        visibleTexts.indexOf('Onboarding permissions'),
        greaterThan(visibleTexts.indexOf('Overlay')),
      );

      await tester.tap(find.widgetWithText(TextButton, 'Reprendre'));
      await tester.pump();

      expect(resumeCalls, 1);
    } finally {
      debugDefaultTargetPlatformOverride = previousPlatform;
      _clearAndroidBridgeMocks();
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    }
  });

  testWidgets('incomplete onboarding keeps persistent settings entry', (
    tester,
  ) async {
    final previousPlatform = debugDefaultTargetPlatformOverride;
    debugDefaultTargetPlatformOverride = TargetPlatform.android;
    _useLargeViewport(tester);
    _installAndroidBridgeMocks();
    final settingsStore = _MemorySettingsStore(
      const UserSettingsSnapshot.defaults(),
    );

    try {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [settingsStoreProvider.overrideWithValue(settingsStore)],
          child: MaterialApp(
            theme: AppTheme.light,
            darkTheme: AppTheme.dark,
            home: SettingsScreen(onResumeOnboarding: () {}),
          ),
        ),
      );
      await _pumpNavigationFrame(tester);

      expect(find.text('Onboarding permissions'), findsNWidgets(2));
      expect(find.widgetWithText(TextButton, 'Reprendre'), findsNWidgets(2));
      expect(
        find.byKey(const Key('settings-onboarding-top-reminder')),
        findsOneWidget,
      );
      expect(
        find.byKey(const Key('settings-onboarding-persistent-entry')),
        findsOneWidget,
      );
      expect(find.widgetWithText(TextButton, 'Plus tard'), findsOneWidget);

      final visibleTexts = tester
          .widgetList<Text>(find.byType(Text))
          .map((widget) => widget.data ?? widget.textSpan?.toPlainText() ?? '')
          .toList(growable: false);
      expect(
        visibleTexts.lastIndexOf('Onboarding permissions'),
        greaterThan(visibleTexts.indexOf('Overlay')),
      );
    } finally {
      debugDefaultTargetPlatformOverride = previousPlatform;
      _clearAndroidBridgeMocks();
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    }
  });

  testWidgets('tapping outside onboarding overlay closes it', (tester) async {
    final previousPlatform = debugDefaultTargetPlatformOverride;
    debugDefaultTargetPlatformOverride = TargetPlatform.android;
    _useLargeViewport(tester);
    _installAndroidBridgeMocks();

    try {
      await tester.pumpWidget(_appShellTestWidget());
      await _pumpNavigationFrame(tester);

      expect(find.text('Configuration CMDglows'), findsOneWidget);
      final overlayCardTopLeft = tester.getTopLeft(
        find.byKey(const Key('onboarding-overlay-card-frame')),
      );
      final overlayCardCenter = tester.getCenter(
        find.byKey(const Key('onboarding-overlay-card-frame')),
      );
      await tester.tapAt(
        Offset(overlayCardTopLeft.dx - 8, overlayCardCenter.dy),
      );
      await tester.pumpAndSettle(const Duration(milliseconds: 300));

      expect(find.text('Configuration CMDglows'), findsNothing);
      expect(find.text('Accueil'), findsWidgets);
    } finally {
      debugDefaultTargetPlatformOverride = previousPlatform;
      _clearAndroidBridgeMocks();
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    }
  });

  testWidgets('android shell renders every main tab body', (tester) async {
    final previousPlatform = debugDefaultTargetPlatformOverride;
    debugDefaultTargetPlatformOverride = TargetPlatform.android;
    _useLargeViewport(tester);
    _installAndroidBridgeMocks();
    addTearDown(() {
      debugDefaultTargetPlatformOverride = previousPlatform;
      _clearAndroidBridgeMocks();
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    await tester.pumpWidget(_appShellTestWidget());
    await _pumpNavigationFrame(tester);

    final closeOnboarding = find.byTooltip('Fermer (reprendre plus tard)');
    if (closeOnboarding.evaluate().isNotEmpty) {
      await tester.tap(closeOnboarding);
      await tester.pumpAndSettle(const Duration(milliseconds: 300));
    }

    expect(find.text('Accueil'), findsWidgets);
    expect(find.text('Fil d’accueil'), findsOneWidget);

    await tester.tap(find.byIcon(Icons.content_paste_outlined).last);
    await _pumpNavigationFrame(tester);
    expect(find.text('Nouvel élément'), findsOneWidget);
    expect(find.text('Contenu'), findsOneWidget);
    expect(find.text('Ajouter'), findsOneWidget);

    await tester.tap(find.byIcon(Icons.text_snippet_outlined).last);
    await _pumpNavigationFrame(tester);
    expect(find.text('Nouveau snippet'), findsOneWidget);
    expect(find.text('Déclencheur'), findsOneWidget);
    expect(find.text('Ajouter le snippet'), findsOneWidget);

    await tester.tap(find.byIcon(Icons.auto_fix_high_outlined).last);
    await _pumpNavigationFrame(tester);
    expect(find.text('Nouveau terme'), findsOneWidget);
    expect(find.text('Terme'), findsOneWidget);
    expect(find.text('Ajouter un terme'), findsOneWidget);

    await tester.tap(find.byIcon(Icons.keyboard_voice_outlined).last);
    await _pumpNavigationFrame(tester);
    expect(find.text('Capture automatique'), findsOneWidget);

    await tester.tap(find.byIcon(Icons.smart_button_outlined).last);
    await _pumpNavigationFrame(tester);
    expect(find.text('Actions'), findsAtLeastNWidgets(1));

    debugDefaultTargetPlatformOverride = previousPlatform;
    _clearAndroidBridgeMocks();
  });

  testWidgets('clipboard edit dialog closes safely on cancel and noop save', (
    tester,
  ) async {
    final previousPlatform = debugDefaultTargetPlatformOverride;
    debugDefaultTargetPlatformOverride = TargetPlatform.android;
    _useLargeViewport(tester);
    _installAndroidBridgeMocks();
    try {
      final store = InMemoryClipboardHistoryStore(
        clock: () => DateTime.utc(2026, 5, 24, 12),
      );

      await tester.pumpWidget(_clipboardScreenTestWidget(store));
      await tester.pumpAndSettle();

      await tester.enterText(
        find.widgetWithText(TextField, 'Contenu').first,
        'clipboard item to edit',
      );
      await tester.pump();
      await tester.ensureVisible(find.widgetWithText(FilledButton, 'Ajouter'));
      await tester.tap(find.widgetWithText(FilledButton, 'Ajouter'));
      await tester.pumpAndSettle();

      expect(store.snapshot(), hasLength(1));
      expect(find.text('clipboard item to edit'), findsOneWidget);

      await tester.ensureVisible(find.byIcon(Icons.edit_outlined));
      await tester.tap(find.byIcon(Icons.edit_outlined));
      await tester.pumpAndSettle();
      expect(find.text('Modifier le contenu'), findsOneWidget);

      await tester.tap(find.widgetWithText(TextButton, 'Annuler'));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      expect(find.text('Modifier le contenu'), findsNothing);

      await tester.ensureVisible(find.byIcon(Icons.edit_outlined));
      await tester.tap(find.byIcon(Icons.edit_outlined));
      await tester.pumpAndSettle();
      expect(find.text('Modifier le contenu'), findsOneWidget);

      await tester.tap(find.widgetWithText(FilledButton, 'Sauvegarder'));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      expect(find.text('Modifier le contenu'), findsNothing);
      expect(store.snapshot(), hasLength(1));
      expect(store.snapshot().single.content, 'clipboard item to edit');
    } finally {
      debugDefaultTargetPlatformOverride = previousPlatform;
      _clearAndroidBridgeMocks();
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    }
  });

  testWidgets('settings backend diagnostics panel opens without layout error', (
    tester,
  ) async {
    final previousPlatform = debugDefaultTargetPlatformOverride;
    debugDefaultTargetPlatformOverride = TargetPlatform.android;
    _useLargeViewport(tester);
    _installAndroidBridgeMocks();

    try {
      await tester.pumpWidget(
        _routedSettingsTestWidget(
          initialLocation: '/settings?section=maintenance',
        ),
      );
      await tester.pumpAndSettle(const Duration(milliseconds: 300));
      expect(find.byType(SettingsScreen), findsOneWidget);
      await tester.scrollUntilVisible(
        find.text('Journaux de support'),
        500,
        scrollable: find.byType(Scrollable).first,
      );

      expect(
        find.byKey(const Key('backend-diagnostic-log-text')),
        findsOneWidget,
      );
      expect(find.text('Journaux de support'), findsOneWidget);
      expect(tester.takeException(), isNull);
    } finally {
      debugDefaultTargetPlatformOverride = previousPlatform;
      _clearAndroidBridgeMocks();
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    }
  });

  testWidgets(
    'keyboard preview sandbox types letters and handles Space Back Enter Shift suggestion',
    (tester) async {
      _useLargeViewport(tester);
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });
      await tester.pumpWidget(_keyboardPreviewTestWidget());
      await tester.pumpAndSettle();

      expect(_simulatedBufferText(tester), '|');

      await _tapVisible(tester, find.text('h'));
      expect(_simulatedBufferText(tester), 'h|');

      await _tapVisible(tester, find.text('Space'));
      expect(_simulatedBufferText(tester), 'h |');

      await _tapVisible(tester, find.text('Back'));
      expect(_simulatedBufferText(tester), 'h|');

      await _tapVisible(tester, find.text('Enter'));
      expect(_simulatedBufferText(tester), 'h\n|');

      await _tapVisible(tester, find.text('Shift'));
      expect(_simulatedStatusText(tester), contains('Shift enabled'));

      await _tapVisible(tester, find.text('a'));
      expect(_simulatedBufferText(tester), 'h\nA|');

      await _tapVisible(tester, find.text('bonjour'));
      expect(_simulatedBufferText(tester), 'h\nA bonjour|');
      expect(_simulatedStatusText(tester), contains('Suggestion'));
    },
  );

  testWidgets(
    'keyboard preview sandbox updates email context and reports disabled/non simulated actions',
    (tester) async {
      _useLargeViewport(tester);
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });
      await tester.pumpWidget(_keyboardPreviewTestWidget());
      await tester.pumpAndSettle();

      await _selectDropdownOption(
        tester,
        const Key('keyboard-preview-field-dropdown'),
        'Email',
      );
      expect(_simulatedStatusText(tester), contains('Field context: Email'));

      await _tapVisible(tester, find.text('@'));
      expect(_simulatedBufferText(tester), '@|');

      await _tapVisible(tester, find.widgetWithText(FilterChip, 'Private'));
      expect(_simulatedStatusText(tester), contains('Private mode on'));

      await _tapVisible(tester, find.text('Clip'));
      expect(_simulatedBufferText(tester), '@|');
      expect(_simulatedStatusText(tester), contains('disabled'));

      await _tapVisible(tester, find.text('Mic'));
      expect(_simulatedBufferText(tester), '@|');
      expect(_simulatedStatusText(tester), contains('non simulated'));
    },
  );

  testWidgets(
    'keyboard preview navigation panel adds controls while typing keys remain available',
    (tester) async {
      _useLargeViewport(tester);
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });
      await tester.pumpWidget(_keyboardPreviewTestWidget());
      await tester.pumpAndSettle();

      await _selectDropdownOption(
        tester,
        const Key('keyboard-preview-panel-dropdown'),
        'Navigation',
      );

      expect(find.text('All'), findsOneWidget);
      expect(find.text('Copy'), findsOneWidget);
      expect(find.text('Cut'), findsOneWidget);
      expect(find.text('Paste'), findsOneWidget);
      expect(find.text('Undo'), findsOneWidget);
      expect(find.text('Redo'), findsOneWidget);
      expect(find.text('⏫'), findsOneWidget);
      expect(find.text('↑'), findsWidgets);
      expect(find.text('Word←'), findsOneWidget);
      expect(find.text('⬅'), findsOneWidget);
      expect(find.text('➡'), findsOneWidget);
      expect(find.text('Word→'), findsOneWidget);
      expect(find.text('↓'), findsWidgets);
      expect(find.text('⏬'), findsOneWidget);
      expect(find.text('Del←'), findsOneWidget);
      expect(find.text('DelW←'), findsOneWidget);
      expect(find.text('Del→'), findsOneWidget);
      expect(find.text('DelW→'), findsOneWidget);
      expect(find.text('Clip'), findsOneWidget);
      expect(find.text('q'), findsOneWidget);
      expect(find.text('Space'), findsOneWidget);
      expect(find.text('Ctrl'), findsOneWidget);
      expect(find.text('Shift'), findsOneWidget);
    },
  );

  testWidgets(
    'keyboard preview accent panel adds french accents without replacing letters',
    (tester) async {
      _useLargeViewport(tester);
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });
      await tester.pumpWidget(_keyboardPreviewTestWidget());
      await tester.pumpAndSettle();

      await _tapVisible(tester, find.text('Acc'));

      expect(find.text('œ'), findsWidgets);
      expect(find.text('Shift'), findsOneWidget);
      expect(find.text('Ctrl'), findsOneWidget);
      expect(find.text('q'), findsOneWidget);

      await _tapVisible(tester, find.text('œ').first);
      expect(_simulatedBufferText(tester), 'œ|');
    },
  );

  testWidgets('keyboard preview does not simulate native corner presets', (
    tester,
  ) async {
    _useLargeViewport(tester);
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });
    await tester.pumpWidget(_keyboardPreviewTestWidget());
    await tester.pumpAndSettle();

    expect(find.text('à'), findsNothing);

    await tester.longPress(find.text('a').first);
    await tester.pumpAndSettle();
    expect(_simulatedBufferText(tester), 'a|');
    expect(_simulatedStatusText(tester), contains('Inserted'));

    await _selectDropdownOption(
      tester,
      const Key('keyboard-preview-corner-preset-dropdown'),
      'Punctuation + navigation',
    );

    expect(find.text('?'), findsNothing);
    expect(find.text('à'), findsNothing);
  });

  testWidgets('keyboard preview media panel can show now playing line', (
    tester,
  ) async {
    _useLargeViewport(tester);
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });
    await tester.pumpWidget(_keyboardPreviewTestWidget());
    await tester.pumpAndSettle();

    await _tapVisible(tester, find.text('Media'));

    expect(find.text('Now'), findsOneWidget);
    expect(find.text('Now playing: tap Now'), findsNothing);

    await _tapVisible(tester, find.text('Now'));
    expect(find.text('Daft Punk - Digital Love'), findsWidgets);
    final nowPlayingKey = find.ancestor(
      of: find.text('Daft Punk - Digital Love'),
      matching: find.byType(InkWell),
    );
    expect(tester.getRect(nowPlayingKey).width, greaterThan(700));

    await _tapVisible(tester, find.text('Now'));
    expect(find.text('Daft Punk - Digital Love'), findsNothing);
  });

  testWidgets('keyboard preview snippets panel scrolls current snippets', (
    tester,
  ) async {
    _useLargeViewport(tester);
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });
    await tester.pumpWidget(_keyboardPreviewTestWidget());
    await tester.pumpAndSettle();

    await _tapVisible(tester, find.text('Snip'));

    expect(find.text('j\'arrive'), findsWidgets);
    expect(find.text('D\'accord'), findsOneWidget);
    expect(find.text('Signature'), findsOneWidget);

    await _tapVisible(tester, find.text('D\'accord'));

    expect(_simulatedBufferText(tester), contains('D\'accord'));
    expect(_simulatedStatusText(tester), 'Snippet inserted.');
  });

  testWidgets('keyboard preview clipboard shows entries and full history', (
    tester,
  ) async {
    _useLargeViewport(tester);
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });
    await tester.pumpWidget(_keyboardPreviewTestWidget());
    await tester.pumpAndSettle();

    await _tapVisible(tester, find.text('Clip'));

    expect(find.text('All'), findsOneWidget);
    expect(find.text('Cut'), findsOneWidget);
    expect(find.text('Copy'), findsOneWidget);
    expect(find.text('Paste'), findsOneWidget);
    expect(find.text('Latest copied text'), findsOneWidget);

    await _tapVisible(tester, find.text('Latest copied text'));
    expect(_simulatedBufferText(tester), contains('Latest copied text'));

    await _tapVisible(tester, find.text('Clip'));
    await tester.longPress(find.text('Clip'));
    await tester.pumpAndSettle();

    expect(find.text('Pin Pinned account id'), findsOneWidget);
    expect(find.text('q'), findsNothing);
    expect(find.text('Space'), findsNothing);
  });

  testWidgets('keyboard preview settings panel exposes important shortcuts', (
    tester,
  ) async {
    _useLargeViewport(tester);
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });
    await tester.pumpWidget(_keyboardPreviewTestWidget());
    await tester.pumpAndSettle();

    await _tapVisible(tester, find.text('Prefs'));

    expect(find.text('Keyboard'), findsOneWidget);
    expect(find.text('App'), findsOneWidget);
    expect(find.text('Theme'), findsOneWidget);
    expect(find.text('AZERTY'), findsWidgets);
    expect(find.text('Vibe on'), findsOneWidget);
    expect(find.text('Sound off'), findsOneWidget);
    expect(find.text('Muted'), findsOneWidget);
    expect(find.text('Suggest on'), findsOneWidget);
    expect(find.text('FR on'), findsOneWidget);
    expect(find.text('EN on'), findsOneWidget);
    expect(find.text('Compact'), findsOneWidget);
    expect(find.text('Auto close on'), findsOneWidget);
    expect(find.text('Special G off'), findsOneWidget);
    expect(find.text('Gestures on'), findsOneWidget);
    expect(find.text('2sp on'), findsOneWidget);
    expect(find.text('Punc on'), findsOneWidget);
    expect(find.text('Debug off'), findsOneWidget);
    expect(find.text('q'), findsNothing);
    expect(find.text('Space'), findsNothing);
  });

  testWidgets('keyboard preview number mode uses three by three keypad rows', (
    tester,
  ) async {
    _useLargeViewport(tester);
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });
    await tester.pumpWidget(_keyboardPreviewTestWidget());
    await tester.pumpAndSettle();

    await _tapVisible(tester, find.text('123'));

    expect(find.text('+'), findsOneWidget);
    expect(find.text('-'), findsOneWidget);
    expect(find.text('*'), findsOneWidget);
    expect(find.text('/'), findsOneWidget);
    expect(find.text('.'), findsOneWidget);
    expect(find.text('@'), findsOneWidget);
    expect(find.text('#'), findsOneWidget);
    expect(find.text('?'), findsOneWidget);
    expect(find.text('!'), findsOneWidget);
    expect(find.text('Fn'), findsOneWidget);
    expect(find.text(';'), findsOneWidget);
    for (final digit in ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']) {
      expect(find.text(digit), findsOneWidget);
    }
    expect(find.text(','), findsOneWidget);
  });
}
