import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:commandglows_app/core/bootstrap/suite_identity_bridge_bootstrap.dart';
import 'package:commandglows_app/features/auth/data/suite_identity_bridge_client.dart';
import 'package:commandglows_app/features/auth/domain/product_entitlement.dart';
import 'package:commandglows_app/features/auth/domain/suite_identity.dart';

void main() {
  const firebaseAccount = SuiteIdentityAccount(
    provider: SuiteIdentityProvider.firebase,
    providerUserId: 'firebase-user-123456',
    email: 'alice@example.test',
  );

  test(
    'bridge success returns global identity and allowlisted entitlements',
    () async {
      final client = SuiteIdentityBridgeClient(
        httpClient: MockClient((request) async {
          expect(request.method, 'POST');
          expect(request.headers['authorization'], 'Bearer firebase-id-token');
          expect(
            request.headers['x-commandglows-installation-id'],
            'test-installation-id',
          );
          return http.Response(
            '''
          {
            "status": "recognized",
            "globalUserId": "global_123",
            "accounts": [
              {
                "provider": "firebase",
                "providerUserId": "firebase-user-123456",
                "email": "alice@example.test"
              }
            ],
            "entitlements": [
              {"productId": "commandglows_app", "status": "active"},
              {"productId": "legacy_video_app", "status": "trialing"},
              {"productId": "unknown_product", "status": "active"}
            ]
          }
          ''',
            200,
            headers: const {'content-type': 'application/json'},
          );
        }),
      );

      final identity = await client.resolveFromFirebaseSession(
        bridgeConfig: SuiteIdentityBridgeBootstrap.resolveConfig(
          bridgeUrl: 'https://suite.commandglows.test/api/bridge/firebase',
        ),
        firebaseAccount: firebaseAccount,
        resolveIdToken: () async => 'firebase-id-token',
      );

      expect(identity.status, SuiteAccountStatus.recognized);
      expect(identity.globalUserId, 'global_123');
      expect(identity.entitlements, hasLength(1));
      expect(
        identity.entitlements.map((item) => item.productId),
        containsAll([ProductId.commandglowsApp]),
      );
      expect(
        identity.statusFor(ProductId.commandglowsApp),
        SuiteAccountStatus.accessActive,
      );
      expect(identity.issue, isNull);
    },
  );

  test('parses the production bridge payload shape', () async {
    final client = SuiteIdentityBridgeClient(
      httpClient: MockClient((request) async {
        return http.Response(
          '''
          {
            "status": "ok",
            "globalUserId": "gu_123",
            "checkoutIdentityToken": "signed-checkout-token",
            "accounts": [
              {
                "provider": "firebase",
                "providerAccountIdMasked": "fir***456"
              }
            ],
            "entitlements": [
              {"productId": "commandglows_app", "status": "active", "plan": "pro"}
            ]
          }
          ''',
          200,
          headers: const {'content-type': 'application/json'},
        );
      }),
    );

    final identity = await client.resolveFromFirebaseSession(
      bridgeConfig: SuiteIdentityBridgeBootstrap.resolveConfig(
        bridgeUrl: 'https://suite.commandglows.test/api/bridge/firebase',
      ),
      firebaseAccount: firebaseAccount,
      resolveIdToken: () async => 'firebase-id-token',
    );

    expect(identity.status, SuiteAccountStatus.recognized);
    expect(identity.globalUserId, 'gu_123');
    expect(identity.checkoutIdentityToken, 'signed-checkout-token');
    expect(
      identity.accounts.single.providerUserId,
      firebaseAccount.providerUserId,
    );
    expect(identity.entitlements.single.productId, ProductId.commandglowsApp);
    expect(identity.entitlements.single.plan, 'pro');
  });

  test('parses trial expiry and sends a customer restart request', () async {
    final client = SuiteIdentityBridgeClient(
      httpClient: MockClient((request) async {
        expect(request.body, '{"trialAction":"restart"}');
        expect(request.headers['x-commandglows-installation-id'], 'device-123');
        return http.Response(
          '''
          {
            "status": "ok",
            "globalUserId": "gu_123",
            "accounts": [],
            "entitlements": [
              {"productId": "commandglows_app", "status": "trialing", "trialExpiresAt": 1, "trialAttempt": 2, "trialRestartsRemaining": 1, "trialRestartEligible": true}
            ]
          }
          ''',
          200,
          headers: const {'content-type': 'application/json'},
        );
      }),
    );

    final identity = await client.resolveFromFirebaseSession(
      bridgeConfig: SuiteIdentityBridgeBootstrap.resolveConfig(
        bridgeUrl: 'https://suite.commandglows.test/api/bridge/firebase',
      ),
      firebaseAccount: firebaseAccount,
      resolveIdToken: () async => 'firebase-id-token',
      installationId: 'device-123',
      requestTrialRestart: true,
    );

    final entitlement = identity.entitlements.single;
    expect(entitlement.trialExpiresAt, isNotNull);
    expect(entitlement.grantsAccess, isFalse);
    expect(entitlement.trialAttempt, 2);
    expect(entitlement.trialRestartsRemaining, 1);
    expect(entitlement.canRestartTrial, isTrue);
  });

  test('starts checkout with the handoff in a POST body, never in the URL', () async {
    const handoff = 'signed-sensitive-handoff';
    final client = SuiteIdentityBridgeClient(
      httpClient: MockClient((request) async {
        expect(request.method, 'POST');
        expect(request.url.path, '/api/commerce/checkout');
        expect(request.url.toString(), isNot(contains(handoff)));
        expect(request.body, contains(handoff));
        return http.Response(
          '{"checkoutUrl":"https://checkout.stripe.test/session"}',
          200,
          headers: const {'content-type': 'application/json'},
        );
      }),
    );

    final checkout = await client.startStripeCheckout(
      bridgeConfig: SuiteIdentityBridgeBootstrap.resolveConfig(
        bridgeUrl: 'https://suite.commandglows.test/api/bridge/firebase',
      ),
      checkoutIdentityToken: handoff,
    );

    expect(checkout, Uri.parse('https://checkout.stripe.test/session'));
  });

  test('missing bridge url fails closed without network call', () async {
    var tokenResolverCalled = false;
    final client = SuiteIdentityBridgeClient(
      httpClient: MockClient((request) async {
        fail('Network should not be called when bridge URL is missing.');
      }),
    );

    final identity = await client.resolveFromFirebaseSession(
      bridgeConfig: SuiteIdentityBridgeBootstrap.resolveConfig(bridgeUrl: ''),
      firebaseAccount: firebaseAccount,
      resolveIdToken: () async {
        tokenResolverCalled = true;
        return 'firebase-id-token';
      },
    );

    expect(tokenResolverCalled, isFalse);
    expect(identity.status, SuiteAccountStatus.recognized);
    expect(identity.globalUserId, isNull);
    expect(identity.entitlements, isEmpty);
    expect(identity.issue, contains('suite_identity_bridge_missing_env'));
  });

  test('missing token and token resolver errors fail closed', () async {
    var networkCalls = 0;
    final client = SuiteIdentityBridgeClient(
      httpClient: MockClient((request) async {
        networkCalls += 1;
        return http.Response('{}', 200);
      }),
    );
    final config = SuiteIdentityBridgeBootstrap.resolveConfig(
      bridgeUrl: 'https://suite.commandglows.test/api/bridge/firebase',
    );

    final missingTokenIdentity = await client.resolveFromFirebaseSession(
      bridgeConfig: config,
      firebaseAccount: firebaseAccount,
      resolveIdToken: () async => null,
    );
    final errorTokenIdentity = await client.resolveFromFirebaseSession(
      bridgeConfig: config,
      firebaseAccount: firebaseAccount,
      resolveIdToken: () async => throw StateError('token failure'),
    );

    expect(networkCalls, 0);
    expect(
      missingTokenIdentity.issue,
      'suite_identity_bridge_missing_firebase_token',
    );
    expect(
      errorTokenIdentity.issue,
      'suite_identity_bridge_missing_firebase_token',
    );
    expect(missingTokenIdentity.entitlements, isEmpty);
    expect(errorTokenIdentity.entitlements, isEmpty);
  });

  test('invalid bridge payload fails closed', () async {
    final client = SuiteIdentityBridgeClient(
      httpClient: MockClient((request) async {
        return http.Response('{"globalUserId":"global_123"}', 200);
      }),
    );

    final identity = await client.resolveFromFirebaseSession(
      bridgeConfig: SuiteIdentityBridgeBootstrap.resolveConfig(
        bridgeUrl: 'https://suite.commandglows.test/api/bridge/firebase',
      ),
      firebaseAccount: firebaseAccount,
      resolveIdToken: () async => 'firebase-id-token',
    );

    expect(identity.status, SuiteAccountStatus.recognized);
    expect(identity.globalUserId, isNull);
    expect(identity.entitlements, isEmpty);
    expect(identity.issue, 'suite_identity_bridge_invalid_schema');
  });

  test('invalid json bridge payload fails closed', () async {
    final client = SuiteIdentityBridgeClient(
      httpClient: MockClient((request) async {
        return http.Response('not-json', 200);
      }),
    );

    final identity = await client.resolveFromFirebaseSession(
      bridgeConfig: SuiteIdentityBridgeBootstrap.resolveConfig(
        bridgeUrl: 'https://suite.commandglows.test/api/bridge/firebase',
      ),
      firebaseAccount: firebaseAccount,
      resolveIdToken: () async => 'firebase-id-token',
    );

    expect(identity.status, SuiteAccountStatus.recognized);
    expect(identity.globalUserId, isNull);
    expect(identity.entitlements, isEmpty);
    expect(identity.issue, 'suite_identity_bridge_invalid_json');
  });

  test('non-200 bridge response fails closed', () async {
    final client = SuiteIdentityBridgeClient(
      httpClient: MockClient((request) async {
        return http.Response('{"error":"forbidden"}', 403);
      }),
    );

    final identity = await client.resolveFromFirebaseSession(
      bridgeConfig: SuiteIdentityBridgeBootstrap.resolveConfig(
        bridgeUrl: 'https://suite.commandglows.test/api/bridge/firebase',
      ),
      firebaseAccount: firebaseAccount,
      resolveIdToken: () async => 'firebase-id-token',
    );

    expect(identity.status, SuiteAccountStatus.recognized);
    expect(identity.globalUserId, isNull);
    expect(identity.entitlements, isEmpty);
    expect(identity.issue, contains('suite_identity_bridge_http_403'));
    expect(identity.issue, isNot(contains('/api/bridge/firebase')));
  });
}
