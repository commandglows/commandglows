import 'package:firebase_auth/firebase_auth.dart' as firebase_auth;
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/bootstrap/suite_identity_bridge_bootstrap.dart';
import '../data/suite_identity_bridge_client.dart';
import '../domain/suite_identity.dart';
import '../domain/auth_session_store.dart';
import 'auth_session_provider.dart';

final suiteIdentityBridgeClientProvider = Provider<SuiteIdentityBridgeClient>(
  (ref) => SuiteIdentityBridgeClient(),
);

final firebaseIdTokenResolverProvider = Provider<FirebaseIdTokenResolver>(
  (ref) => () async {
    final user = firebase_auth.FirebaseAuth.instance.currentUser;
    if (user == null) {
      return null;
    }
    return user.getIdToken();
  },
);

final suiteIdentityProvider = StreamProvider<SuiteIdentitySnapshot>((ref) {
  final authSessionAsync = ref.watch(authSessionProvider);
  return authSessionAsync.when(
    data: (session) =>
        Stream.fromFuture(_identityFromAuthSession(ref, session)),
    loading: () => const Stream.empty(),
    error: (error, _) =>
        Stream.value(SuiteIdentitySnapshot.unavailable(error.toString())),
  );
});

Future<SuiteIdentitySnapshot> _identityFromAuthSession(
  Ref ref,
  AuthSessionSnapshot session,
) async {
  if (!session.isSignedIn) {
    return const SuiteIdentitySnapshot(status: SuiteAccountStatus.unknown);
  }

  if (session.isLocalFallback) {
    return SuiteIdentitySnapshot(
      status: SuiteAccountStatus.recognized,
      accounts: const [
        SuiteIdentityAccount(
          provider: SuiteIdentityProvider.local,
          providerUserId: 'local',
        ),
      ],
      entitlements: const [],
    );
  }

  final user = session.user!;
  final firebaseAccount = SuiteIdentityAccount(
    provider: SuiteIdentityProvider.firebase,
    providerUserId: user.id,
    email: user.email,
  );

  final bridgeClient = ref.read(suiteIdentityBridgeClientProvider);
  final resolveIdToken = ref.read(firebaseIdTokenResolverProvider);
  try {
    return await bridgeClient.resolveFromFirebaseSession(
      bridgeConfig: SuiteIdentityBridgeBootstrap.config,
      firebaseAccount: firebaseAccount,
      resolveIdToken: resolveIdToken,
    );
  } catch (error) {
    return SuiteIdentitySnapshot(
      status: SuiteAccountStatus.unavailable,
      accounts: [firebaseAccount],
      issue: 'suite_identity_bridge_unexpected_error: $error',
    );
  }
}
