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

class ProductEntitlement {
  const ProductEntitlement({
    required this.productId,
    required this.status,
    this.plan,
    this.source,
    this.sourceRef,
    this.environment,
    this.trialStartedAt,
    this.trialExpiresAt,
    this.updatedAt,
  });

  final ProductId productId;
  final ProductEntitlementStatus status;
  final String? plan;
  final String? source;
  final String? sourceRef;
  final String? environment;
  final DateTime? trialStartedAt;
  final DateTime? trialExpiresAt;
  final DateTime? updatedAt;

  bool get grantsAccess {
    if (status == ProductEntitlementStatus.active) {
      return true;
    }
    if (status == ProductEntitlementStatus.trialing) {
      final expiresAt = trialExpiresAt;
      if (expiresAt == null) {
        return false;
      }
      return expiresAt.isAfter(DateTime.now().toUtc());
    }
    return false;
  }
}
