import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/bootstrap/firebase_bootstrap.dart';
import '../data/firebase_auth_session_store.dart';
import '../data/local_auth_session_store.dart';
import '../domain/auth_session_store.dart';

final localAuthSessionStoreProvider = Provider<LocalAuthSessionStore>(
  (ref) => const LocalAuthSessionStore(),
);

final remoteAuthConfiguredProvider = Provider<bool>(
  (ref) => FirebaseBootstrap.isConfigured,
);

final remoteAuthSessionStoreProvider = Provider<AuthSessionStore>((ref) {
  if (!ref.watch(remoteAuthConfiguredProvider)) {
    throw UnsupportedError('Remote auth is not configured.');
  }
  return FirebaseAuthSessionStore();
});

class LocalAuthModeController extends Notifier<bool> {
  @override
  bool build() => false;

  void enable() {
    state = true;
  }

  void disable() {
    state = false;
  }
}

final localAuthModeProvider = NotifierProvider<LocalAuthModeController, bool>(
  LocalAuthModeController.new,
);

class SignupWelcomeController extends Notifier<bool> {
  @override
  bool build() => false;

  void markPending() {
    state = true;
  }

  bool consume() {
    final pending = state;
    state = false;
    return pending;
  }
}

final signupWelcomePendingProvider =
    NotifierProvider<SignupWelcomeController, bool>(
      SignupWelcomeController.new,
    );

final authSessionStoreProvider = Provider<AuthSessionStore>((ref) {
  if (ref.watch(localAuthModeProvider)) {
    return ref.watch(localAuthSessionStoreProvider);
  }
  if (ref.watch(remoteAuthConfiguredProvider)) {
    return ref.watch(remoteAuthSessionStoreProvider);
  }
  return ref.watch(localAuthSessionStoreProvider);
});

final authSessionProvider = StreamProvider<AuthSessionSnapshot>((ref) {
  final store = ref.watch(authSessionStoreProvider);
  return store.watchSession();
});
