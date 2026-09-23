import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:commandglows_app/core/sync/sync_status.dart';
import 'package:commandglows_app/core/theme/app_theme.dart';
import 'package:commandglows_app/features/auth/application/auth_session_provider.dart';
import 'package:commandglows_app/features/auth/application/suite_identity_provider.dart';
import 'package:commandglows_app/features/auth/domain/auth_session_store.dart';
import 'package:commandglows_app/features/auth/domain/suite_identity.dart';
import 'package:commandglows_app/features/auth/presentation/auth_gate_screen.dart';

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

Widget _screen(SuiteIdentitySnapshot identity, _Store store) => ProviderScope(
  overrides: [
    authSessionStoreProvider.overrideWithValue(store),
    authSessionProvider.overrideWith((ref) => Stream.value(_signedIn)),
    suiteIdentityProvider.overrideWith((ref) => Stream.value(identity)),
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
}
