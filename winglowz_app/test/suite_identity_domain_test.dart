import 'package:flutter_test/flutter_test.dart';
import 'package:commandglows_app/features/auth/domain/product_entitlement.dart';
import 'package:commandglows_app/features/auth/domain/suite_identity.dart';

void main() {
  test('product ids are parsed from the allowlist only', () {
    expect(ProductId.parse('commandglows_app'), ProductId.commandglowsApp);
    expect(ProductId.parse('commandglows_formation'), ProductId.commandglowsFormation);
    expect(ProductId.parse('voiceflowz'), isNull);
    expect(ProductId.parse('admin'), isNull);
  });

  test('only active and trialing entitlements grant access', () {
    expect(
      const ProductEntitlement(
        productId: ProductId.commandglowsApp,
        status: ProductEntitlementStatus.active,
      ).grantsAccess,
      isTrue,
    );
    expect(
      const ProductEntitlement(
        productId: ProductId.commandglowsApp,
        status: ProductEntitlementStatus.trialing,
      ).grantsAccess,
      isTrue,
    );
    expect(
      const ProductEntitlement(
        productId: ProductId.commandglowsApp,
        status: ProductEntitlementStatus.refunded,
      ).grantsAccess,
      isFalse,
    );
  });

  test('recognized account without product entitlement is inactive', () {
    const identity = SuiteIdentitySnapshot(
      status: SuiteAccountStatus.recognized,
      globalUserId: 'global_123',
      accounts: [
        SuiteIdentityAccount(
          provider: SuiteIdentityProvider.firebase,
          providerUserId: 'firebase_uid',
          email: 'diane@example.test',
        ),
      ],
      entitlements: [
        ProductEntitlement(
          productId: ProductId.commandglowsFormation,
          status: ProductEntitlementStatus.active,
        ),
      ],
    );

    expect(
      identity.statusFor(ProductId.commandglowsFormation),
      SuiteAccountStatus.accessActive,
    );
    expect(
      identity.statusFor(ProductId.commandglowsApp),
      SuiteAccountStatus.accessInactive,
    );
  });

  test('support summary includes redacted issue without full user id', () {
    const identity = SuiteIdentitySnapshot(
      status: SuiteAccountStatus.recognized,
      accounts: [
        SuiteIdentityAccount(
          provider: SuiteIdentityProvider.firebase,
          providerUserId: 'firebase-user-123456',
        ),
      ],
      issue: 'suite_identity_bridge_http_401',
    );

    final summary = identity.supportSummary;
    expect(summary, contains('issue=suite_identity_bridge_http_401'));
    expect(summary, contains('fir...456'));
    expect(summary, isNot(contains('firebase-user-123456')));
  });
}
