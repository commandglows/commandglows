/// Signed logical desktop coordinates for a pin window's independent position.
class PinWindowPosition {
  const PinWindowPosition({required this.x, required this.y});

  final double x;
  final double y;
}

enum PinWindowOperationStatus { succeeded, unsupported, failed }

class PinWindowOperationResult {
  const PinWindowOperationResult({required this.status, this.message});

  final PinWindowOperationStatus status;
  final String? message;
}

enum PinWindowEventType { moved, focused, closed }

/// Events are scoped to one pin and never represent primary-window changes.
class PinWindowEvent {
  const PinWindowEvent({
    required this.pinId,
    required this.type,
    this.position,
  });

  final String pinId;
  final PinWindowEventType type;
  final PinWindowPosition? position;
}

/// Future platform hosts implement detached windows behind this boundary.
abstract interface class PinWindowHost {
  Future<PinWindowOperationResult> open({
    required String pinId,
    required PinWindowPosition position,
  });

  Future<PinWindowOperationResult> move({
    required String pinId,
    required PinWindowPosition position,
  });

  /// Closes only the visual window; the repository pin remains intact.
  Future<PinWindowOperationResult> close(String pinId);

  Stream<PinWindowEvent> get events;
}
