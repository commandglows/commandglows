import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:commandglows_app/core/sync/sync_status.dart';
import 'package:commandglows_app/features/auth/application/auth_session_provider.dart';
import 'package:commandglows_app/features/auth/application/suite_identity_provider.dart';
import 'package:commandglows_app/features/auth/domain/auth_session_store.dart';
import 'package:commandglows_app/features/auth/domain/product_entitlement.dart';
import 'package:commandglows_app/features/auth/domain/suite_identity.dart';
import 'package:commandglows_app/features/keyboard/application/keyboard_profile_backup_service.dart';
import 'package:commandglows_app/features/keyboard/application/keyboard_sync_controller.dart';
import 'package:commandglows_app/features/keyboard/application/keyboard_sync_providers.dart';
import 'package:commandglows_app/features/keyboard/application/keyboard_sync_queue.dart';
import 'package:commandglows_app/features/keyboard/data/firebase_keyboard_theme_asset_store.dart';
import 'package:commandglows_app/features/keyboard/data/local_keyboard_sync_queue_store.dart';
import 'package:commandglows_app/features/keyboard/domain/keyboard_sync_models.dart';
import 'package:commandglows_app/features/keyboard/domain/keyboard_sync_store.dart';
import 'package:commandglows_app/features/keyboard/presentation/keyboard_sync_panel.dart';

void main() {
  testWidgets('shows unsupported messaging on non-Android platforms', (
    tester,
  ) async {
    final previous = debugDefaultTargetPlatformOverride;
    try {
      debugDefaultTargetPlatformOverride = TargetPlatform.iOS;

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            keyboardSyncControllerProvider.overrideWithValue(
              _RecordingKeyboardSyncController(
                nextState: const KeyboardSyncControllerState(
                  status: KeyboardSyncControllerStatus.waitingCloud,
                  decision: KeyboardSyncDecisionKind.none,
                  hasPendingQueue: false,
                ),
              ),
            ),
            keyboardProfileBackupServiceProvider.overrideWithValue(
              _noopBackupService(),
            ),
          ],
          child: MaterialApp(home: Scaffold(body: KeyboardSyncPanel())),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Clavier Android indisponible sur iOS'), findsOneWidget);
      expect(
        find.text(
          'Le clavier CommandGlows est une IME native Android et ne peut pas être installé sur iOS.',
        ),
        findsOneWidget,
      );
      final syncButton = tester.widget<FilledButton>(
        find.widgetWithText(FilledButton, 'Synchroniser'),
      );
      expect(syncButton.onPressed, isNull);
    } finally {
      debugDefaultTargetPlatformOverride = previous;
    }
  });

  testWidgets('surfaces conflict choices when controller reports conflict', (
    tester,
  ) async {
    final controller = _RecordingKeyboardSyncController(
      nextState: const KeyboardSyncControllerState(
        status: KeyboardSyncControllerStatus.decisionNeeded,
        decision: KeyboardSyncDecisionKind.conflict,
        hasPendingQueue: true,
      ),
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          keyboardSyncControllerProvider.overrideWithValue(controller),
          keyboardProfileBackupServiceProvider.overrideWithValue(
            _noopBackupService(),
          ),
          authSessionProvider.overrideWith(
            (ref) => Stream.value(_signedInSession()),
          ),
          suiteIdentityProvider.overrideWith(
            (ref) => Stream.value(_identityWithAccess()),
          ),
        ],
        child: const MaterialApp(home: Scaffold(body: KeyboardSyncPanel())),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Conflit détecté'), findsOneWidget);
    final keepLocal = tester.widget<OutlinedButton>(
      find.widgetWithText(OutlinedButton, 'Garder ce téléphone'),
    );
    final useCloud = tester.widget<OutlinedButton>(
      find.widgetWithText(OutlinedButton, 'Utiliser le cloud'),
    );
    expect(keepLocal.onPressed, isNotNull);
    expect(useCloud.onPressed, isNotNull);
    expect(find.text('Exporter avant remplacement'), findsOneWidget);
  });

  testWidgets('conflict actions call controller decisions', (tester) async {
    final controller = _RecordingKeyboardSyncController(
      nextState: const KeyboardSyncControllerState(
        status: KeyboardSyncControllerStatus.decisionNeeded,
        decision: KeyboardSyncDecisionKind.conflict,
        hasPendingQueue: true,
      ),
      keepLocalState: const KeyboardSyncControllerState(
        status: KeyboardSyncControllerStatus.ready,
        decision: KeyboardSyncDecisionKind.none,
        hasPendingQueue: false,
      ),
      useCloudState: const KeyboardSyncControllerState(
        status: KeyboardSyncControllerStatus.ready,
        decision: KeyboardSyncDecisionKind.none,
        hasPendingQueue: false,
      ),
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          keyboardSyncControllerProvider.overrideWithValue(controller),
          keyboardProfileBackupServiceProvider.overrideWithValue(
            _noopBackupService(),
          ),
          authSessionProvider.overrideWith(
            (ref) => Stream.value(_signedInSession()),
          ),
          suiteIdentityProvider.overrideWith(
            (ref) => Stream.value(_identityWithAccess()),
          ),
        ],
        child: const MaterialApp(home: Scaffold(body: KeyboardSyncPanel())),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(
      find.widgetWithText(OutlinedButton, 'Garder ce téléphone'),
    );
    await tester.pumpAndSettle();
    expect(controller.keepLocalCalls, 1);

    controller.nextStateOverride = const KeyboardSyncControllerState(
      status: KeyboardSyncControllerStatus.decisionNeeded,
      decision: KeyboardSyncDecisionKind.conflict,
      hasPendingQueue: true,
    );
    await tester.tap(find.widgetWithText(FilledButton, 'Synchroniser'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(OutlinedButton, 'Utiliser le cloud'));
    await tester.pumpAndSettle();
    expect(controller.useCloudCalls, 1);
  });

  testWidgets('synchronize action uses auth and suite identity context', (
    tester,
  ) async {
    final controller = _RecordingKeyboardSyncController(
      nextState: const KeyboardSyncControllerState(
        status: KeyboardSyncControllerStatus.ready,
        decision: KeyboardSyncDecisionKind.none,
        hasPendingQueue: false,
      ),
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          keyboardSyncControllerProvider.overrideWithValue(controller),
          keyboardProfileBackupServiceProvider.overrideWithValue(
            _noopBackupService(),
          ),
          authSessionProvider.overrideWith(
            (ref) => Stream.value(_signedInSession()),
          ),
          suiteIdentityProvider.overrideWith(
            (ref) => Stream.value(_identityWithAccess()),
          ),
        ],
        child: const MaterialApp(home: Scaffold(body: KeyboardSyncPanel())),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.widgetWithText(FilledButton, 'Synchroniser'));
    await tester.pumpAndSettle();

    expect(controller.contexts, isNotEmpty);
    final lastContext = controller.contexts.last;
    expect(lastContext.isSignedIn, isTrue);
    expect(lastContext.isLocalFallback, isFalse);
    expect(lastContext.hasEntitlement, isTrue);
    expect(lastContext.firebaseUid, 'firebase-uid');
    expect(lastContext.globalUserId, 'global-user');
  });
}

KeyboardProfileBackupService _noopBackupService() {
  final profile = KeyboardSyncProfile.sanitized(
    profileRevision: 1,
    baseCloudRevision: 0,
    updatedAt: '2026-05-25T20:00:00Z',
    updatedByDeviceId: 'device-test',
    sourcePlatform: 'android',
    rawPayload: {
      'preferences': {'themeMode': 'dark'},
    },
  );
  return KeyboardProfileBackupService(
    exportLocalProfile: () async => profile,
    applyLocalProfile: (_) async {},
  );
}

AuthSessionSnapshot _signedInSession() {
  return const AuthSessionSnapshot(
    user: AuthUserSnapshot(
      id: 'firebase-uid',
      provider: AuthProviderKind.emailPassword,
      email: 'diane@example.com',
    ),
    syncStatus: SyncStatus(health: SyncHealth.synced),
  );
}

SuiteIdentitySnapshot _identityWithAccess() {
  return const SuiteIdentitySnapshot(
    status: SuiteAccountStatus.accessActive,
    globalUserId: 'global-user',
    entitlements: [
      ProductEntitlement(
        productId: ProductId.commandglowsApp,
        status: ProductEntitlementStatus.active,
      ),
    ],
  );
}

class _RecordingKeyboardSyncController extends KeyboardSyncController {
  _RecordingKeyboardSyncController({
    required KeyboardSyncControllerState nextState,
    KeyboardSyncControllerState? keepLocalState,
    KeyboardSyncControllerState? useCloudState,
  }) : _nextState = nextState,
       _keepLocalState = keepLocalState ?? nextState,
       _useCloudState = useCloudState ?? nextState,
       super(
         cloudStore: _DummyStore(),
         queue: _DummyQueue(),
         assetStore: _DummyAssetStore(),
         exportLocalProfile: () async => null,
         applyLocalProfile: (_) async {},
       );

  KeyboardSyncControllerState _nextState;
  final KeyboardSyncControllerState _keepLocalState;
  final KeyboardSyncControllerState _useCloudState;
  final List<KeyboardSyncAuthContext> contexts = <KeyboardSyncAuthContext>[];
  int keepLocalCalls = 0;
  int useCloudCalls = 0;

  set nextStateOverride(KeyboardSyncControllerState value) {
    _nextState = value;
  }

  @override
  Future<KeyboardSyncControllerState> synchronize(
    KeyboardSyncAuthContext context,
  ) async {
    contexts.add(context);
    return _nextState;
  }

  @override
  Future<KeyboardSyncControllerState> keepLocalProfile(
    KeyboardSyncAuthContext context,
  ) async {
    keepLocalCalls += 1;
    contexts.add(context);
    return _keepLocalState;
  }

  @override
  Future<KeyboardSyncControllerState> useCloudProfile(
    KeyboardSyncAuthContext context,
  ) async {
    useCloudCalls += 1;
    contexts.add(context);
    return _useCloudState;
  }
}

class _DummyStore implements KeyboardSyncStore {
  @override
  Future<KeyboardSyncProfile?> loadDefault() async => null;

  @override
  Future<KeyboardSyncStoreSaveResult> saveDefault({
    required KeyboardSyncProfile profile,
    required int baseCloudRevision,
  }) async {
    return KeyboardSyncStoreSaveResult(
      profile: profile,
      cloudRevision: profile.profileRevision,
      applied: true,
    );
  }

  @override
  Stream<KeyboardSyncProfile?> watchDefault() {
    return const Stream<KeyboardSyncProfile?>.empty();
  }
}

class _DummyQueue implements KeyboardSyncQueue {
  @override
  Future<void> clear() async {}

  @override
  Future<void> enqueueDefaultProfile({
    required String targetFirebaseUid,
    required String targetGlobalUserId,
    required KeyboardSyncProfile profile,
    required int baseCloudRevision,
    KeyboardSyncThemeAssetUploadRequest? themeAssetUpload,
  }) async {}

  @override
  Future<KeyboardSyncQueueFlushResult> flush({
    required String targetFirebaseUid,
    required String targetGlobalUserId,
  }) async {
    return const KeyboardSyncQueueFlushResult(flushedCount: 0, failedCount: 0);
  }

  @override
  Future<List<KeyboardSyncQueueEntry>> listEntries() async =>
      const <KeyboardSyncQueueEntry>[];

  @override
  Future<List<KeyboardSyncQueueEntry>> listFlushReady({
    required String targetFirebaseUid,
    required String targetGlobalUserId,
  }) async => const <KeyboardSyncQueueEntry>[];

  @override
  Future<void> purgeForAccountChange({
    required String targetFirebaseUid,
    required String targetGlobalUserId,
  }) async {}
}

class _DummyAssetStore implements KeyboardThemeAssetStore {
  @override
  Future<String> downloadThemeAsset({
    required String firebaseUid,
    required String globalUserId,
    required KeyboardThemeAssetManifest manifest,
  }) async {
    return '/tmp/${manifest.assetId}.png';
  }

  @override
  Future<KeyboardThemeAssetManifest> uploadThemeAsset({
    required String firebaseUid,
    required String globalUserId,
    required int profileRevision,
    required KeyboardSyncThemeAssetUploadRequest request,
  }) async {
    return KeyboardThemeAssetManifest(
      assetId: request.assetId,
      storagePath: 'users/$firebaseUid/keyboard_theme_assets/${request.assetId}',
      checksum: 'abc123abc123abc123abc123abc123abc123abc123abc123abc123abc123abcd',
      byteSize: 1024,
      mimeType: request.mimeType,
      profileRevision: profileRevision,
      createdAt: '2026-05-25T18:00:00Z',
      updatedAt: '2026-05-25T18:00:00Z',
    );
  }
}
