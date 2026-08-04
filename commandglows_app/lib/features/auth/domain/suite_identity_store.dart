import 'product_entitlement.dart';
import 'suite_identity.dart';

abstract class SuiteIdentityStore {
  Future<SuiteIdentitySnapshot> currentIdentity();

  Stream<SuiteIdentitySnapshot> watchIdentity();

  Future<ProductEntitlement?> entitlementFor(ProductId productId);
}
