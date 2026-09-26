import 'pin_resource_reference.dart';

/// One pin instance; multiple instances may reference the same source record.
class PinnedResource {
  const PinnedResource({
    required this.pinId,
    required this.reference,
    required this.pinnedAt,
  });

  /// Assigned by the selected repository, not supplied by the caller.
  final String pinId;
  final PinResourceReference reference;
  final DateTime pinnedAt;
}
