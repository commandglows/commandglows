import '../../../core/sync/sync_status.dart';

enum AuthProviderKind { local, anonymous, emailPassword, google }

class AuthUserSnapshot {
  const AuthUserSnapshot({
    required this.id,
    required this.provider,
    this.email,
    this.isAnonymous = false,
  });

  final String id;
  final AuthProviderKind provider;
  final String? email;
  final bool isAnonymous;
}

class AuthSessionSnapshot {
  const AuthSessionSnapshot({required this.user, required this.syncStatus});

  const AuthSessionSnapshot.localFallback()
    : user = const AuthUserSnapshot(
        id: 'local-user',
        provider: AuthProviderKind.local,
        isAnonymous: true,
      ),
      syncStatus = const SyncStatus.localOnly();

  final AuthUserSnapshot? user;
  final SyncStatus syncStatus;

  bool get isSignedIn => user != null;
  bool get isLocalFallback => syncStatus.health == SyncHealth.localOnly;
}

abstract class AuthSessionStore {
  Future<AuthSessionSnapshot> currentSession();

  Stream<AuthSessionSnapshot> watchSession();

  Future<void> signInAnonymously();

  Future<void> signInWithEmailPassword({
    required String email,
    required String password,
  });

  Future<void> createAccountWithEmailPassword({
    required String email,
    required String password,
  });

  Future<void> signInWithGoogle();

  Future<void> signInWithGoogleIdToken({required String? idToken});

  Future<void> signOut();
}
