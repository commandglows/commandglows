import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

import '../../features/pinning/domain/pin_window_contract.dart';

/// Windows implementation of the independent pin-window host contract.
class WindowsPinWindowHost implements PinWindowHost {
  WindowsPinWindowHost._();

  static final WindowsPinWindowHost instance = WindowsPinWindowHost._();

  static const MethodChannel _methodChannel = MethodChannel(
    'commandglows_app/pin_window',
  );
  static const EventChannel _eventChannel = EventChannel(
    'commandglows_app/pin_window_events',
  );

  static bool get isWindowsDesktop =>
      !kIsWeb && defaultTargetPlatform == TargetPlatform.windows;

  @override
  Stream<PinWindowEvent> get events => _eventChannel
      .receiveBroadcastStream()
      .where((event) => event is Map<Object?, Object?>)
      .map((event) => _parseEvent(event as Map<Object?, Object?>))
      .where((event) => event != null)
      .cast<PinWindowEvent>();

  @override
  Future<PinWindowOperationResult> open({
    required String pinId,
    required PinWindowPosition position,
  }) => _invoke('openPinWindow', pinId, position);

  @override
  Future<PinWindowOperationResult> move({
    required String pinId,
    required PinWindowPosition position,
  }) => _invoke('movePinWindow', pinId, position);

  @override
  Future<PinWindowOperationResult> close(String pinId) =>
      _invoke('closePinWindow', pinId);

  Future<PinWindowOperationResult> _invoke(
    String method,
    String pinId, [
    PinWindowPosition? position,
  ]) async {
    if (!isWindowsDesktop) {
      return const PinWindowOperationResult(
        status: PinWindowOperationStatus.unsupported,
      );
    }
    if (pinId.trim().isEmpty ||
        pinId != pinId.trim() ||
        (position != null && (!position.x.isFinite || !position.y.isFinite))) {
      return const PinWindowOperationResult(
        status: PinWindowOperationStatus.failed,
        message: 'invalid_pin_window_request',
      );
    }

    final arguments = <String, Object>{'pinId': pinId};
    if (position != null) {
      arguments['position'] = <String, double>{
        'x': position.x,
        'y': position.y,
      };
    }

    try {
      final result = await _methodChannel.invokeMapMethod<Object?, Object?>(
        method,
        arguments,
      );
      return _parseResult(result);
    } on PlatformException {
      return const PinWindowOperationResult(
        status: PinWindowOperationStatus.failed,
        message: 'pin_window_operation_failed',
      );
    } on MissingPluginException {
      return const PinWindowOperationResult(
        status: PinWindowOperationStatus.unsupported,
      );
    }
  }

  PinWindowOperationResult _parseResult(Map<Object?, Object?>? value) {
    final status = value?['status'];
    return PinWindowOperationResult(
      status: switch (status) {
        'succeeded' => PinWindowOperationStatus.succeeded,
        'unsupported' => PinWindowOperationStatus.unsupported,
        _ => PinWindowOperationStatus.failed,
      },
      message: value?['message'] as String?,
    );
  }

  PinWindowEvent? _parseEvent(Map<Object?, Object?> value) {
    final pinId = value['pinId'];
    final type = switch (value['type']) {
      'moved' => PinWindowEventType.moved,
      'focused' => PinWindowEventType.focused,
      'closed' => PinWindowEventType.closed,
      _ => null,
    };
    if (pinId is! String || pinId.isEmpty || type == null) {
      return null;
    }

    PinWindowPosition? position;
    final rawPosition = value['position'];
    if (rawPosition is Map<Object?, Object?>) {
      final x = rawPosition['x'];
      final y = rawPosition['y'];
      if (x is num && y is num && x.isFinite && y.isFinite) {
        position = PinWindowPosition(x: x.toDouble(), y: y.toDouble());
      }
    }
    if (type == PinWindowEventType.moved && position == null) {
      return null;
    }

    return PinWindowEvent(pinId: pinId, type: type, position: position);
  }
}
