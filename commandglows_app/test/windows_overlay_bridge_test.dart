import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:commandglows_app/core/platform/windows_overlay_bridge.dart';

const _channel = MethodChannel('commandglows_app/windows_overlay');

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  tearDown(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(_channel, null);
  });

  test('parses Windows overlay status from native map', () {
    final status = WindowsOverlayStatus.fromMap({
      'supported': true,
      'enabled': true,
      'visible': true,
      'hotkeyRegistered': true,
      'hotkeyLabel': 'Ctrl+Alt+Space',
      'deliveryMode': 'paste_and_clipboard',
      'sizeScale': 1.2,
      'opacity': 0.72,
      'eventQueueSize': 2,
    });

    expect(status.supported, isTrue);
    expect(status.hotkeyRegistered, isTrue);
    expect(status.deliveryMode, WindowsOverlayDeliveryMode.pasteAndClipboard);
    expect(status.sizeScale, 1.2);
    expect(status.opacity, 0.72);
    expect(status.eventQueueSize, 2);
  });

  test('parses Windows overlay events from native queue', () {
    final event = WindowsOverlayEvent.fromMap({
      'trigger': 'hotkey',
      'capturedAtEpochMillis': 1780171200000,
    });

    expect(event?.trigger, WindowsOverlayTrigger.hotkey);
    expect(event?.capturedAtUtc, DateTime.utc(2026, 5, 30, 20));
  });

  test('parses Windows delivery result', () {
    final result = WindowsOverlayDeliveryResult.fromMap({
      'status': 'delivered',
      'clipboardCopied': true,
      'pasteAttempted': true,
      'pasteSucceeded': true,
    });

    expect(result.status, WindowsOverlayDeliveryStatus.delivered);
    expect(result.clipboardCopied, isTrue);
    expect(result.pasteAttempted, isTrue);
    expect(result.pasteSucceeded, isTrue);
  });
}
