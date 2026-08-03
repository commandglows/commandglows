import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:commandglows_app/core/sync/sync_status.dart';
import 'package:commandglows_app/features/auth/application/auth_session_provider.dart';
import 'package:commandglows_app/features/auth/application/suite_identity_provider.dart';
import 'package:commandglows_app/features/auth/domain/auth_session_store.dart';
import 'package:commandglows_app/features/auth/domain/product_entitlement.dart';
import 'package:commandglows_app/features/auth/domain/suite_identity.dart';

void main() {
  const signedOutSession = AuthSessionSnapshot(
    user: null,
    syncStatus: SyncStatus.unavailable(),
  );

  const localFallbackSession = AuthSessionSnapshot.localFallback();

  const firebaseSession = AuthSessionSnapshot(
    user: AuthUserSnapshot(
      id: 'firebase-user-123456',
      provider: AuthProviderKind.emailPassword,
      email: 'alice@example.test',
    ),
    syncStatus: SyncStatus(health: SyncHealth.synced),
  );

  Future<SuiteIdentitySnapshot> readIdentity(
    ProviderContainer container,
  ) async {
    final completer = Completer<SuiteIdentitySnapshot>();
    final sub = container.listen<AsyncValue<SuiteIdentitySnapshot>>(
      suiteIdentityProvider,
      (previous, next) {
        next.when(
          data: (identity) {
            if (!completer.isCompleted) {
              completer.complete(identity);
            }
          },
          loading: () {},
          error: (error, stackTrace) {
            if (!completer.isCompleted) {
              completer.completeError(error);
            }
          },
        );
      },
      fireImmediately: true,
    );

    try {
      return await completer.future;
    } finally {
      sub.close();
    }
  }

  test('signed out auth yields conservative unknown suite state', () async {
    final container = ProviderContainer(
      overrides: [
        authSessionProvider.overrideWith(
          (ref) => Stream.value(signedOutSession),
        ),
      ],
    );
    addTearDown(container.dispose);

    final identity = await readIdentity(container);

    expect(identity.status, SuiteAccountStatus.unknown);
    expect(identity.globalUserId, isNull);
    expect(identity.accounts, isEmpty);
  });

  test(
    'local fallback auth maps to local suite account without access',
    () async {
      final container = ProviderContainer(
        overrides: [
          authSessionProvider.overrideWith(
            (ref) => Stream.value(localFallbackSession),
          ),
        ],
      );
      addTearDown(container.dispose);

      final identity = await readIdentity(container);

      expect(identity.status, SuiteAccountStatus.recognized);
      expect(identity.globalUserId, isNull);
      expect(identity.accounts, hasLength(1));
      expect(identity.accounts.first.provider, SuiteIdentityProvider.local);
      expect(
        identity.statusFor(ProductId.commandglowsApp),
        SuiteAccountStatus.accessInactive,
      );
    },
  );

  test(
    'firebase auth maps to conservative recognized state without global id',
    () async {
      final container = ProviderContainer(
        overrides: [
          authSessionProvider.overrideWith(
            (ref) => Stream.value(firebaseSession),
          ),
        ],
      );
      addTearDown(container.dispose);

      final identity = await readIdentity(container);

      expect(identity.status, SuiteAccountStatus.recognized);
      expect(identity.globalUserId, isNull);
      expect(identity.accounts, hasLength(1));
      expect(identity.accounts.first.provider, SuiteIdentityProvider.firebase);
      expect(identity.accounts.first.maskedProviderUserId, 'fir...456');
      expect(identity.issue, contains('suite_identity_bridge_missing_env'));
      expect(
        identity.statusFor(ProductId.commandglowsFormation),
        SuiteAccountStatus.accessInactive,
      );
    },
  );

  test('diagnostic helpers never expose full provider user id', () async {
    const account = SuiteIdentityAccount(
      provider: SuiteIdentityProvider.firebase,
      providerUserId: 'firebase-user-123456',
    );

    expect(account.maskedProviderUserId, 'fir...456');
    expect(account.supportLabel, contains('fir...456'));
    expect(account.supportLabel, isNot(contains('firebase-user-123456')));
  });
}
