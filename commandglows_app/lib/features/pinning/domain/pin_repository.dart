import 'pinned_resource.dart';
import 'pin_resource_reference.dart';

/// Provider-neutral lifecycle contract for references pinned by this app.
abstract interface class PinRepository {
  /// Creates a distinct pin instance and assigns its identity in the store.
  Future<PinnedResource> create(PinResourceReference reference);

  Future<List<PinnedResource>> list();

  Future<PinnedResource?> getById(String pinId);

  /// Removes the pin record; closing its visual window is not an unpin.
  Future<void> remove(String pinId);
}
