import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/sync/sync_status.dart';
import '../../features/auth/domain/auth_session_store.dart';

class SupabaseAuthSessionStore implements AuthSessionStore {
  const SupabaseAuthSessionStore(this._client);

  final SupabaseClient _client;

  @override
  Future<AuthSessionSnapshot> currentSession() async {
    return _fromSession(_client.auth.currentSession);
  }

  @override
  Stream<AuthSessionSnapshot> watchSession() {
    return _client.auth.onAuthStateChange.map((event) {
      return _fromSession(event.session);
    });
  }

  @override
  Future<void> signInAnonymously() async {
    throw UnsupportedError(
      'Anonymous auth is not available on legacy Supabase.',
    );
  }

  @override
  Future<void> signInWithEmailPassword({
    required String email,
    required String password,
  }) async {
    await _client.auth.signInWithPassword(email: email, password: password);
  }

  @override
  Future<void> createAccountWithEmailPassword({
    required String email,
    required String password,
  }) async {
    await _client.auth.signUp(email: email, password: password);
  }

  @override
  Future<void> signInWithGoogle() async {
    throw UnsupportedError('Google Sign-In waits for the Firebase adapter.');
  }

  @override
  Future<void> signInWithGoogleIdToken({required String? idToken}) async {
    throw UnsupportedError('Google Sign-In waits for the Firebase adapter.');
  }

  @override
  Future<void> signOut() => _client.auth.signOut();

  static AuthSessionSnapshot _fromSession(Session? session) {
    final user = session?.user;
    if (user == null) {
      return const AuthSessionSnapshot(
        user: null,
        syncStatus: SyncStatus.unavailable(),
      );
    }
    return AuthSessionSnapshot(
      user: AuthUserSnapshot(
        id: user.id,
        provider: AuthProviderKind.emailPassword,
        email: user.email,
      ),
      syncStatus: SyncStatus(
        health: SyncHealth.synced,
        lastSyncedAt: DateTime.now().toUtc(),
      ),
    );
  }
}
