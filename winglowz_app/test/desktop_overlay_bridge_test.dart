import 'package:flutter_test/flutter_test.dart';
import 'package:commandglows_app/core/platform/desktop_overlay_bridge.dart';

void main() {
  test('parses desktop overlay status for macOS', () {
    final status = DesktopOverlayStatus.fromMap({
      'platform': 'macos',
      'supported': true,
      'enabled': true,
      'visible': false,
      'hotkeyRegistered': true,
      'hotkeyLabel': 'Control+Option+Space',
      'deliveryMode': 'paste_and_clipboard',
      'sizeScale': 1.1,
      'opacity': 0.82,
      'eventQueueSize': 2,
    }, fallbackPlatform: DesktopOverlayPlatform.unsupported);

    expect(status.platform, DesktopOverlayPlatform.macOS);
    expect(status.supported, isTrue);
    expect(status.hotkeyRegistered, isTrue);
    expect(status.hotkeyLabel, 'Control+Option+Space');
    expect(status.deliveryMode, DesktopOverlayDeliveryMode.pasteAndClipboard);
    expect(status.opacity, 0.82);
    expect(status.eventQueueSize, 2);
  });

  test('parses desktop overlay status for Linux clipboard-only fallback', () {
    final status = DesktopOverlayStatus.fromMap({
      'platform': 'linux',
      'supported': true,
      'enabled': false,
      'visible': false,
      'hotkeyRegistered': false,
      'hotkeyLabel': 'Ctrl+Alt+Space',
      'deliveryMode': 'clipboard_only',
    }, fallbackPlatform: DesktopOverlayPlatform.unsupported);

    expect(status.platform, DesktopOverlayPlatform.linux);
    expect(status.enabled, isFalse);
    expect(status.deliveryMode, DesktopOverlayDeliveryMode.clipboardOnly);
  });

  test('parses desktop overlay events and delivery results', () {
    final event = DesktopOverlayEvent.fromMap({
      'trigger': 'hotkey',
      'capturedAtEpochMillis': 1760000000000,
    });
    final result = DesktopOverlayDeliveryResult.fromMap({
      'status': 'clipboard_only',
      'clipboardCopied': true,
      'pasteAttempted': true,
      'pasteSucceeded': false,
      'errorCode': 'PASTE_DELIVERY_FAILED',
    });

    expect(event?.trigger, DesktopOverlayTrigger.hotkey);
    expect(event?.capturedAtUtc.isUtc, isTrue);
    expect(result.status, DesktopOverlayDeliveryStatus.clipboardOnly);
    expect(result.clipboardCopied, isTrue);
    expect(result.pasteAttempted, isTrue);
    expect(result.pasteSucceeded, isFalse);
    expect(result.errorCode, 'PASTE_DELIVERY_FAILED');
  });

  test('parses desktop overlay command result', () {
    final result = DesktopOverlayCommandResult.fromMap({
      'status': 'delivered',
      'sentSteps': 2,
    });

    expect(result.status, DesktopOverlayCommandStatus.delivered);
    expect(result.sentSteps, 2);
  });
}
