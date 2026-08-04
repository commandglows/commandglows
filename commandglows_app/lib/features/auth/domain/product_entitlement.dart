enum ProductId {
  commandglowsFormation('commandglows_formation'),
  commandglowsApp('commandglows_app');

  const ProductId(this.value);

  final String value;

  static ProductId? parse(String value) {
    for (final productId in ProductId.values) {
      if (productId.value == value) {
        return productId;
      }
    }
    return null;
  }
}

enum ProductEntitlementStatus {
  active,
  trialing,
  inactive,
  expired,
  refunded,
  revoked,
  pendingReview,
}

extension ProductEntitlementStatusAccess on ProductEntitlementStatus {
  bool get grantsAccess =>
      this == ProductEntitlementStatus.active ||
      this == ProductEntitlementStatus.trialing;
}

class ProductEntitlement {
  const ProductEntitlement({
    required this.productId,
    required this.status,
    this.plan,
    this.source,
    this.sourceRef,
    this.environment,
    this.updatedAt,
  });

  final ProductId productId;
  final ProductEntitlementStatus status;
  final String? plan;
  final String? source;
  final String? sourceRef;
  final String? environment;
  final DateTime? updatedAt;

  bool get grantsAccess => status.grantsAccess;
}
