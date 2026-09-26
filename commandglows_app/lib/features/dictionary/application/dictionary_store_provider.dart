import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:firebase_auth/firebase_auth.dart' as firebase_auth;
import 'package:flutter/foundation.dart';

import '../../../core/storage/local_json_persistence.dart';
import '../../../core/bootstrap/firebase_bootstrap.dart';
import '../../auth/application/auth_session_provider.dart';
import '../../auth/application/suite_identity_provider.dart';
import '../../auth/domain/product_entitlement.dart';
import '../data/in_memory_dictionary_store.dart';
import '../data/firebase_dictionary_store.dart';
import '../domain/dictionary_store.dart';

final localDictionaryStoreProvider = Provider<InMemoryDictionaryStore>(
  (ref) => InMemoryDictionaryStore(
    persistence: defaultTargetPlatform == TargetPlatform.windows
        ? const LocalJsonPersistence('local_dictionary_v1')
        : null,
  ),
);

final dictionaryStoreProvider = Provider<DictionaryStore>((ref) {
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
    return FirebaseDictionaryStore();
  }

  return ref.watch(localDictionaryStoreProvider);
});
