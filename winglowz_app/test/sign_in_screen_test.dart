import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:commandglows_app/core/theme/app_theme.dart';
import 'package:commandglows_app/core/sync/sync_status.dart';
import 'package:commandglows_app/features/auth/application/auth_session_provider.dart';
import 'package:commandglows_app/features/auth/domain/auth_failure.dart';
import 'package:commandglows_app/features/auth/domain/auth_session_store.dart';
import 'package:commandglows_app/features/auth/presentation/sign_in_screen.dart';

class _ThrowingAuthSessionStore implements AuthSessionStore {
  var emailPasswordCalls = 0;
  var createAccountCalls = 0;
  var anonymousCalls = 0;
  AuthFailure? googleFailure;

  @override
  Future<AuthSessionSnapshot> currentSession() async => _signedOut;

  @override
  Stream<AuthSessionSnapshot> watchSession() => Stream.value(_signedOut);

  @override
  Future<void> signInAnonymously() async {
    anonymousCalls += 1;
    throw AuthFailure.firebase(
      code: 'invalid-api-key',
      message: 'API key not valid. Please pass a valid API key.',
      signup: false,
    );
  }

  @override
  Future<void> signInWithEmailPassword({
    required String email,
    required String password,
  }) async {
    emailPasswordCalls += 1;
    throw AuthFailure.firebase(
      code: 'invalid-api-key',
      message: 'API key not valid. Please pass a valid API key.',
      signup: false,
    );
  }

  @override
  Future<void> createAccountWithEmailPassword({
    required String email,
    required String password,
  }) async {
    createAccountCalls += 1;
    throw AuthFailure.firebase(
      code: 'invalid-api-key',
      message: 'API key not valid. Please pass a valid API key.',
      signup: true,
    );
  }

  @override
  Future<void> signInWithGoogle() async {
    final failure = googleFailure;
    if (failure != null) {
      throw failure;
    }
  }

  @override
  Future<void> signInWithGoogleIdToken({required String? idToken}) async {
    final failure = googleFailure;
    if (failure != null) {
      throw failure;
    }
  }

  @override
  Future<void> signOut() async {}
}

class _SuccessfulAuthSessionStore implements AuthSessionStore {
  var createAccountCalls = 0;

  @override
  Future<AuthSessionSnapshot> currentSession() async => _signedOut;

  @override
  Stream<AuthSessionSnapshot> watchSession() => Stream.value(_signedOut);

  @override
  Future<void> signInAnonymously() async {}

  @override
  Future<void> signInWithEmailPassword({
    required String email,
    required String password,
  }) async {}

  @override
  Future<void> createAccountWithEmailPassword({
    required String email,
    required String password,
  }) async {
    createAccountCalls += 1;
  }

  @override
  Future<void> signInWithGoogle() async {}

  @override
  Future<void> signInWithGoogleIdToken({required String? idToken}) async {}

  @override
  Future<void> signOut() async {}
}

const _signedOut = AuthSessionSnapshot(
  user: null,
  syncStatus: SyncStatus.unavailable(),
);

Widget _testWidget(AuthSessionStore store) {
  return ProviderScope(
    overrides: [authSessionStoreProvider.overrideWithValue(store)],
    child: MaterialApp(theme: AppTheme.light, home: const SignInScreen()),
  );
}

void main() {
  testWidgets('auth fields keep harmonized tokenized geometry', (tester) async {
    tester.view.physicalSize = const Size(360, 800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final store = _ThrowingAuthSessionStore();
    await tester.pumpWidget(_testWidget(store));

    final emailField = find.byKey(const ValueKey('auth-email-field'));
    final passwordField = find.byKey(const ValueKey('auth-password-field'));

    expect(
      tester.getSize(emailField).height,
      tester.getSize(passwordField).height,
    );

    await tester.enterText(emailField, 'email-invalide');
    await tester.enterText(passwordField, '123');
    await tester.tap(find.text('Se connecter'));
    await tester.pumpAndSettle();

    expect(
      tester.getSize(emailField).height,
      tester.getSize(passwordField).height,
    );
  });

  testWidgets('auth fields expose password-manager autofill metadata', (
    tester,
  ) async {
    final store = _ThrowingAuthSessionStore();
    await tester.pumpWidget(_testWidget(store));

    expect(find.byType(AutofillGroup), findsOneWidget);

    final emailField = tester.widget<EditableText>(
      find.descendant(
        of: find.byKey(const ValueKey('auth-email-field')),
        matching: find.byType(EditableText),
      ),
    );
    expect(emailField.keyboardType, TextInputType.emailAddress);
    expect(emailField.textInputAction, TextInputAction.next);
    expect(emailField.autofillHints, [
      AutofillHints.username,
      AutofillHints.email,
    ]);
    expect(emailField.autocorrect, isFalse);
    expect(emailField.enableSuggestions, isFalse);
    expect(emailField.textCapitalization, TextCapitalization.none);

    final passwordField = tester.widget<EditableText>(
      find.descendant(
        of: find.byKey(const ValueKey('auth-password-field')),
        matching: find.byType(EditableText),
      ),
    );
    expect(passwordField.obscureText, isTrue);
    expect(passwordField.textInputAction, TextInputAction.done);
    expect(passwordField.autofillHints, [AutofillHints.password]);
    expect(passwordField.enableSuggestions, isFalse);
  });

  testWidgets('sign in validates fields before calling auth', (tester) async {
    final store = _ThrowingAuthSessionStore();
    await tester.pumpWidget(_testWidget(store));

    await tester.tap(find.text('Se connecter'));
    await tester.pumpAndSettle();

    expect(find.text('Renseigne ton email.'), findsOneWidget);
    expect(find.text('Renseigne ton mot de passe.'), findsOneWidget);
    expect(
      find.text('Corrige les champs indiqués avant de continuer.'),
      findsOneWidget,
    );
    expect(store.emailPasswordCalls, 0);
  });

  testWidgets('firebase config errors show friendly copyable detail', (
    tester,
  ) async {
    final store = _ThrowingAuthSessionStore();
    await tester.pumpWidget(_testWidget(store));

    await tester.enterText(
      find.byType(TextFormField).first,
      'test@example.com',
    );
    await tester.enterText(find.byType(TextFormField).last, 'password');
    await tester.tap(find.text('Créer un compte'));
    await tester.pumpAndSettle();

    expect(find.text('Création de compte impossible'), findsOneWidget);
    expect(
      find.text(
        'La configuration Firebase de cette version est invalide. Le détail technique peut être copié pour correction.',
      ),
      findsOneWidget,
    );
    expect(find.text('Copier le détail'), findsOneWidget);
    expect(store.createAccountCalls, 1);
  });

  testWidgets('successful account creation schedules welcome guide', (
    tester,
  ) async {
    final store = _SuccessfulAuthSessionStore();
    await tester.pumpWidget(_testWidget(store));

    await tester.enterText(
      find.byType(TextFormField).first,
      'test@example.com',
    );
    await tester.enterText(find.byType(TextFormField).last, 'password');
    await tester.tap(find.text('Créer un compte'));
    await tester.pumpAndSettle();

    final container = ProviderScope.containerOf(
      tester.element(find.byType(SignInScreen)),
    );
    expect(store.createAccountCalls, 1);
    expect(container.read(signupWelcomePendingProvider), isTrue);
  });

  testWidgets('continue locally bypasses the active remote auth store', (
    tester,
  ) async {
    final store = _ThrowingAuthSessionStore();
    await tester.pumpWidget(_testWidget(store));

    await tester.tap(find.text('Continuer en local'));
    await tester.pumpAndSettle();

    expect(find.textContaining('API key'), findsNothing);
    expect(
      find.text(
        'La configuration Firebase de cette version est invalide. Le détail technique peut être copié pour correction.',
      ),
      findsNothing,
    );
    expect(store.anonymousCalls, 0);
  });

  testWidgets('google cancellation stays non-technical', (tester) async {
    final store = _ThrowingAuthSessionStore()
      ..googleFailure = AuthFailure.googleCanceled(detail: 'user canceled');
    await tester.pumpWidget(_testWidget(store));

    await tester.tap(find.text('Continuer avec Google'));
    await tester.pumpAndSettle();

    expect(find.text('Connexion Google annulée.'), findsOneWidget);
    expect(find.text('Copier le détail'), findsNothing);
  });

  testWidgets('google config errors show redacted copyable detail', (
    tester,
  ) async {
    final store = _ThrowingAuthSessionStore()
      ..googleFailure = AuthFailure.googleConfiguration(
        code: 'clientConfigurationError',
        detail:
            'serverClientId must be provided apiKey=AIza12345678901234567890',
      );
    await tester.pumpWidget(_testWidget(store));

    await tester.tap(find.text('Continuer avec Google'));
    await tester.pumpAndSettle();

    expect(
      find.text(
        'Connexion Google indisponible sur cette version. Le détail technique peut être copié pour correction.',
      ),
      findsOneWidget,
    );
    expect(find.text('Copier le détail'), findsOneWidget);
    expect(find.textContaining('AIza123'), findsNothing);
  });
}
