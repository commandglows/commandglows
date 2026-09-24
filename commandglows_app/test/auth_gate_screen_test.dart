import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:commandglows_app/core/bootstrap/suite_identity_bridge_bootstrap.dart';
import 'package:commandglows_app/core/sync/sync_status.dart';
import 'package:commandglows_app/core/theme/app_theme.dart';
import 'package:commandglows_app/features/auth/application/auth_session_provider.dart';
import 'package:commandglows_app/features/auth/application/suite_identity_provider.dart';
import 'package:commandglows_app/features/auth/data/installation_id_store.dart';
import 'package:commandglows_app/features/auth/data/suite_identity_bridge_client.dart';
import 'package:commandglows_app/features/auth/domain/auth_session_store.dart';
import 'package:commandglows_app/features/auth/domain/product_entitlement.dart';
import 'package:commandglows_app/features/auth/domain/suite_identity.dart';
import 'package:commandglows_app/features/auth/presentation/auth_gate_screen.dart';
import 'package:commandglows_app/features/shell/presentation/app_shell_screen.dart';

const _signedIn = AuthSessionSnapshot(
  user: AuthUserSnapshot(
    id: 'user-1',
    provider: AuthProviderKind.emailPassword,
    email: 'test@example.com',
  ),
  syncStatus: SyncStatus(health: SyncHealth.synced),
);

class _Store implements AuthSessionStore {
  var signOutCalls = 0;

  @override
  Future<AuthSessionSnapshot> currentSession() async => _signedIn;

  @override
  Stream<AuthSessionSnapshot> watchSession() => Stream.value(_signedIn);

  @override
  Future<void> signOut() async => signOutCalls += 1;

  @override
  Future<void> createAccountWithEmailPassword({
    required String email,
    required String password,
  }) async {}

  @override
  Future<void> sendPasswordResetEmail({required String email}) async {}

  @override
  Future<void> signInAnonymously() async {}

  @override
  Future<void> signInWithEmailPassword({
    required String email,
    required String password,
  }) async {}

  @override
  Future<void> signInWithGoogle() async {}

  @override
  Future<void> signInWithGoogleIdToken({required String? idToken}) async {}
}

class _InstallationStore extends InstallationIdStore {
  @override
  Future<String> readOrCreate() async => 'test-installation';
}

class _TrialBridgeClient extends SuiteIdentityBridgeClient {
  _TrialBridgeClient(this.response, this.onRequest);

  final SuiteIdentitySnapshot response;
  final void Function({required bool requestTrialStart}) onRequest;
  var startCalls = 0;
  bool? lastRequestTrialStart;

  @override
  Future<SuiteIdentitySnapshot> resolveFromFirebaseSession({
    required SuiteIdentityBridgeRuntimeConfig bridgeConfig,
    required SuiteIdentityAccount firebaseAccount,
    required FirebaseIdTokenResolver resolveIdToken,
    String installationId = 'test-installation-id',
    bool requestTrialStart = false,
    bool requestTrialRestart = false,
  }) async {
    startCalls += 1;
    lastRequestTrialStart = requestTrialStart;
    onRequest(requestTrialStart: requestTrialStart);
    return response;
  }
}

Widget _screen(
  SuiteIdentitySnapshot identity,
  _Store store, {
  SuiteIdentityBridgeClient? bridgeClient,
  SuiteIdentitySnapshot Function()? identityAfterRefresh,
}) => ProviderScope(
  overrides: [
    authSessionStoreProvider.overrideWithValue(store),
    authSessionProvider.overrideWith((ref) => Stream.value(_signedIn)),
    suiteIdentityProvider.overrideWith(
      (ref) => Stream.value(identityAfterRefresh?.call() ?? identity),
    ),
    if (bridgeClient != null)
      suiteIdentityBridgeClientProvider.overrideWithValue(bridgeClient),
    installationIdStoreProvider.overrideWithValue(_InstallationStore()),
  ],
  child: MaterialApp(theme: AppTheme.light, home: const AuthGateScreen()),
);

void main() {
  testWidgets('access verification failure never offers purchase', (
    tester,
  ) async {
    final store = _Store();
    await tester.pumpWidget(
      _screen(const SuiteIdentitySnapshot.unavailable('bridge timeout'), store),
    );
    await tester.pumpAndSettle();

    expect(find.text('Impossible de vérifier ton accès'), findsOneWidget);
    expect(find.text('Réessayer'), findsOneWidget);
    expect(find.text('Changer de compte'), findsOneWidget);
    expect(find.text('Acheter CommandGlows'), findsNothing);
  });

  testWidgets('changing account signs out from unavailable access state', (
    tester,
  ) async {
    final store = _Store();
    await tester.pumpWidget(
      _screen(const SuiteIdentitySnapshot.unavailable(), store),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Changer de compte'));
    await tester.pump();

    expect(store.signOutCalls, 1);
  });

  testWidgets('start trial click requests the grant and opens granted access', (
    tester,
  ) async {
    const initialIdentity = SuiteIdentitySnapshot(
      status: SuiteAccountStatus.recognized,
      globalUserId: 'gu_test',
    );
    final grantedIdentity = SuiteIdentitySnapshot(
      status: SuiteAccountStatus.recognized,
      globalUserId: 'gu_test',
      entitlements: [
        ProductEntitlement(
          productId: ProductId.commandglowsApp,
          status: ProductEntitlementStatus.trialing,
          trialExpiresAt: DateTime.utc(2030),
          trialAttempt: 1,
        ),
      ],
      trialRequest: const TrialRequestResult(
        state: TrialRequestState.granted,
        requestId: 'grant-request-id',
      ),
    );
    var currentIdentity = initialIdentity;
    final bridgeClient = _TrialBridgeClient(grantedIdentity, ({
      required requestTrialStart,
    }) {
      currentIdentity = grantedIdentity;
    });
    await tester.pumpWidget(
      _screen(
        initialIdentity,
        _Store(),
        bridgeClient: bridgeClient,
        identityAfterRefresh: () => currentIdentity,
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Démarrer mon essai gratuit'));
    await tester.pump();
    await tester.pump(const Duration(seconds: 1));

    expect(bridgeClient.startCalls, 1);
    expect(bridgeClient.lastRequestTrialStart, isTrue);
    expect(find.byType(AppShellScreen), findsOneWidget);
    expect(find.byType(AuthGateScreen), findsOneWidget);
    expect(find.text('Démarrer mon essai gratuit'), findsNothing);
  });

  testWidgets('start trial denial shows server reason and correlation id', (
    tester,
  ) async {
    const initialIdentity = SuiteIdentitySnapshot(
      status: SuiteAccountStatus.recognized,
      globalUserId: 'gu_test',
    );
    const responseIdentity = SuiteIdentitySnapshot(
      status: SuiteAccountStatus.recognized,
      globalUserId: 'gu_test',
      trialRequest: TrialRequestResult(
        state: TrialRequestState.denied,
        reasonCode: 'previous_trial_exists',
        requestId: 'denial-request-id',
      ),
    );
    final bridgeClient = _TrialBridgeClient(
      responseIdentity,
      ({required requestTrialStart}) {},
    );
    await tester.pumpWidget(
      _screen(initialIdentity, _Store(), bridgeClient: bridgeClient),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Démarrer mon essai gratuit'));
    await tester.pumpAndSettle();

    expect(bridgeClient.startCalls, 1);
    expect(bridgeClient.lastRequestTrialStart, isTrue);
    expect(
      find.textContaining('Un essai gratuit a déjà été utilisé pour ce compte'),
      findsOneWidget,
    );
    expect(find.textContaining('denial-request-id'), findsOneWidget);
  });

  testWidgets('network trial limit does not imply prior use by this email', (
    tester,
  ) async {
    const initialIdentity = SuiteIdentitySnapshot(
      status: SuiteAccountStatus.recognized,
      globalUserId: 'gu_test',
    );
    const responseIdentity = SuiteIdentitySnapshot(
      status: SuiteAccountStatus.recognized,
      globalUserId: 'gu_test',
      trialRequest: TrialRequestResult(
        state: TrialRequestState.denied,
        reasonCode: 'temporary_rate_limit',
        requestId: 'network-limit-request-id',
      ),
    );
    final bridgeClient = _TrialBridgeClient(
      responseIdentity,
      ({required requestTrialStart}) {},
    );
    await tester.pumpWidget(
      _screen(initialIdentity, _Store(), bridgeClient: bridgeClient),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Démarrer mon essai gratuit'));
    await tester.pumpAndSettle();

    expect(
      find.textContaining('La limite d’essais depuis ce réseau a été atteinte'),
      findsOneWidget,
    );
    expect(
      find.textContaining('Elle est partagée entre les comptes'),
      findsOneWidget,
    );
    expect(
      find.textContaining('cela ne signifie pas que cette adresse e-mail'),
      findsOneWidget,
    );
    expect(find.textContaining('network-limit-request-id'), findsOneWidget);
  });

  testWidgets(
    'start trial lost response stays indeterminate without reference',
    (tester) async {
      const initialIdentity = SuiteIdentitySnapshot(
        status: SuiteAccountStatus.recognized,
        globalUserId: 'gu_test',
      );
      const responseIdentity = SuiteIdentitySnapshot(
        status: SuiteAccountStatus.recognized,
        globalUserId: 'gu_test',
        trialRequest: TrialRequestResult(
          state: TrialRequestState.noResponse,
          requestId: 'unconfirmed-request-id',
        ),
      );
      final bridgeClient = _TrialBridgeClient(
        responseIdentity,
        ({required requestTrialStart}) {},
      );
      var identityRefreshCount = 0;
      await tester.pumpWidget(
        _screen(
          initialIdentity,
          _Store(),
          bridgeClient: bridgeClient,
          identityAfterRefresh: () {
            identityRefreshCount += 1;
            return initialIdentity;
          },
        ),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.text('Démarrer mon essai gratuit'));
      await tester.pumpAndSettle();

      expect(bridgeClient.startCalls, 1);
      expect(bridgeClient.lastRequestTrialStart, isTrue);
      expect(
        find.textContaining('Nous n’avons pas reçu de confirmation'),
        findsOneWidget,
      );
      expect(
        find.textContaining('La demande a peut-être été enregistrée'),
        findsOneWidget,
      );
      expect(find.text('Vérifier mon accès'), findsOneWidget);
      expect(find.textContaining('unconfirmed-request-id'), findsNothing);
      final refreshesBeforeTap = identityRefreshCount;
      await tester.tap(find.text('Vérifier mon accès'));
      await tester.pumpAndSettle();
      expect(identityRefreshCount, greaterThan(refreshesBeforeTap));
    },
  );

  testWidgets(
    'start trial service error uses clear copy and support reference',
    (tester) async {
      const initialIdentity = SuiteIdentitySnapshot(
        status: SuiteAccountStatus.recognized,
        globalUserId: 'gu_test',
      );
      const responseIdentity = SuiteIdentitySnapshot(
        status: SuiteAccountStatus.recognized,
        globalUserId: 'gu_test',
        trialRequest: TrialRequestResult(
          state: TrialRequestState.httpError,
          httpStatus: 503,
          machineErrorCode: 'bridge_write_failed',
          requestId: 'service-request-id',
        ),
      );
      final bridgeClient = _TrialBridgeClient(
        responseIdentity,
        ({required requestTrialStart}) {},
      );
      await tester.pumpWidget(
        _screen(initialIdentity, _Store(), bridgeClient: bridgeClient),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.text('Démarrer mon essai gratuit'));
      await tester.pumpAndSettle();

      expect(
        find.textContaining(
          'Le service d’essai n’a pas pu terminer la demande',
        ),
        findsOneWidget,
      );
      expect(find.textContaining('service-request-id'), findsOneWidget);
      expect(find.text('Vérifier mon accès'), findsOneWidget);
      expect(find.textContaining('503'), findsNothing);
      expect(find.textContaining('bridge_write_failed'), findsNothing);
    },
  );
}
