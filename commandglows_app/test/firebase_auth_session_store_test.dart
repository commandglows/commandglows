import 'package:flutter_test/flutter_test.dart';
import 'package:commandglows_app/features/auth/data/firebase_auth_session_store.dart';
import 'package:commandglows_app/features/auth/data/google_auth_client.dart';
import 'package:commandglows_app/features/auth/domain/auth_failure.dart';

class _FakeGoogleAuthClient implements GoogleAuthClient {
  _FakeGoogleAuthClient({
    this.supported = true,
    this.result = const GoogleAuthResult(idToken: 'token'),
  });

  final bool supported;
  final GoogleAuthResult result;
  var initialized = false;

  @override
  Future<void> initialize() async {
    initialized = true;
  }

  @override
  bool supportsAuthenticate() => supported;

  @override
  bool requiresRenderedButton() => false;

  @override
  Stream<GoogleAuthResult> authenticationResults() => Stream.value(result);

  @override
  Future<GoogleAuthResult> authenticate() async {
    return result;
  }
}

void main() {
  test('google sign in refuses unsupported interactive auth', () async {
    final google = _FakeGoogleAuthClient(supported: false);
    final store = FirebaseAuthSessionStore(googleAuthClient: google);

    await expectLater(
      store.signInWithGoogle(),
      throwsA(
        isA<AuthFailure>().having(
          (failure) => failure.kind,
          'kind',
          AuthFailureKind.googleUnavailable,
        ),
      ),
    );
    expect(google.initialized, isTrue);
  });

  test(
    'google sign in refuses missing id token before firebase credential',
    () async {
      final store = FirebaseAuthSessionStore(
        googleAuthClient: _FakeGoogleAuthClient(
          result: const GoogleAuthResult(idToken: null),
        ),
      );

      await expectLater(
        store.signInWithGoogle(),
        throwsA(
          isA<AuthFailure>().having(
            (failure) => failure.kind,
            'kind',
            AuthFailureKind.googleConfiguration,
          ),
        ),
      );
    },
  );
}
