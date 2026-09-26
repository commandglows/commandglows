/// Identifies source content without copying or authorizing access to it.
class PinResourceReference {
  factory PinResourceReference({
    required String resourceType,
    required String resourceId,
  }) {
    final normalizedType = resourceType.trim();
    final normalizedId = resourceId.trim();
    if (normalizedType.isEmpty) {
      throw ArgumentError.value(
        resourceType,
        'resourceType',
        'Must not be empty.',
      );
    }
    if (normalizedId.isEmpty) {
      throw ArgumentError.value(resourceId, 'resourceId', 'Must not be empty.');
    }
    return PinResourceReference._(normalizedType, normalizedId);
  }

  const PinResourceReference._(this.resourceType, this.resourceId);

  final String resourceType;
  final String resourceId;
}
