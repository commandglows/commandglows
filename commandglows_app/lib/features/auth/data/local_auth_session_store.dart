import '../domain/auth_session_store.dart';
import '../domain/auth_failure.dart';

class LocalAuthSessionStore implements AuthSessionStore {
  const LocalAuthSessionStore();

  static const _session = AuthSessionSnapshot.localFallback();

  @override
  Future<AuthSessionSnapshot> currentSession() async => _session;

  @override
  Stream<AuthSessionSnapshot> watchSession() => Stream.value(_session);

  @override
  Future<void> signInAnonymously() async {}

  @override
  Future<void> signInWithEmailPassword({
    required String email,
    required String password,
  }) async {
    throw AuthFailure.unsupported(
      UnsupportedError('Remote auth is not configured.'),
    );
  }

  @override
  Future<void> createAccountWithEmailPassword({
    required String email,
    required String password,
  }) async {
    throw AuthFailure.unsupported(
      UnsupportedError('Remote auth is not configured.'),
    );
  }

  @override
  Future<void> signInWithGoogle() async {
    throw AuthFailure.unsupported(
      UnsupportedError('Google Sign-In is not configured.'),
    );
  }

  @override
  Future<void> signInWithGoogleIdToken({required String? idToken}) async {
    throw AuthFailure.unsupported(
      UnsupportedError('Google Sign-In is not configured.'),
    );
  }

  @override
  Future<void> signOut() async {}
}
