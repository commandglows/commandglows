import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:firebase_auth/firebase_auth.dart' as firebase_auth;

import '../../../core/bootstrap/firebase_bootstrap.dart';
import '../../auth/application/auth_session_provider.dart';
import '../../auth/application/suite_identity_provider.dart';
import '../../auth/domain/product_entitlement.dart';
import '../data/firebase_settings_store.dart';
import '../data/local_settings_store.dart';
import '../domain/settings_store.dart';

final localSettingsStoreProvider = Provider<LocalSettingsStore>(
  (ref) => LocalSettingsStore(),
);

final settingsStoreProvider = Provider<SettingsStore>((ref) {
  final session = ref.watch(
    authSessionProvider.select(
      (value) =>
          value.maybeWhen(data: (session) => session, orElse: () => null),
    ),
  );
  final hasRemoteSession =
      session != null && session.isSignedIn && !session.isLocalFallback;
  final hasCommandGlowsAppAccess = ref
      .watch(suiteIdentityProvider)
      .maybeWhen(
        data: (identity) => identity.hasAccessTo(ProductId.commandglowsApp),
        orElse: () => false,
      );
  if (FirebaseBootstrap.isConfigured &&
      hasRemoteSession &&
      hasCommandGlowsAppAccess &&
      firebase_auth.FirebaseAuth.instance.currentUser != null) {
    return FirebaseSettingsStore();
  }
  return ref.watch(localSettingsStoreProvider);
});
