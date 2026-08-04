import 'package:flutter/services.dart';

import 'platform_capabilities.dart';

enum WindowsOverlayTrigger { hotkey, manual, unknown }

enum WindowsOverlayDeliveryMode { clipboardOnly, pasteAndClipboard }

enum WindowsOverlayDeliveryStatus { delivered, clipboardOnly, failed }

class WindowsOverlayStatus {
  const WindowsOverlayStatus({
    required this.supported,
    required this.enabled,
    required this.visible,
    required this.hotkeyRegistered,
    required this.hotkeyLabel,
    required this.deliveryMode,
    required this.sizeScale,
    required this.opacity,
    this.lastErrorCode,
    this.lastErrorMessage,
    this.eventQueueSize = 0,
  });

  final bool supported;
  final bool enabled;
  final bool visible;
  final bool hotkeyRegistered;
  final String hotkeyLabel;
  final WindowsOverlayDeliveryMode deliveryMode;
  final double sizeScale;
  final double opacity;
  final String? lastErrorCode;
  final String? lastErrorMessage;
  final int eventQueueSize;

  factory WindowsOverlayStatus.unsupported() {
    return const WindowsOverlayStatus(
      supported: false,
      enabled: false,
      visible: false,
      hotkeyRegistered: false,
      hotkeyLabel: 'Ctrl+Alt+Space',
      deliveryMode: WindowsOverlayDeliveryMode.clipboardOnly,
      sizeScale: 1,
      opacity: 0.9,
    );
  }

  factory WindowsOverlayStatus.fromMap(Map<Object?, Object?> map) {
    final deliveryModeRaw =
        map['deliveryMode'] as String? ?? 'paste_and_clipboard';
    return WindowsOverlayStatus(
      supported: map['supported'] as bool? ?? false,
      enabled: map['enabled'] as bool? ?? false,
      visible: map['visible'] as bool? ?? false,
      hotkeyRegistered: map['hotkeyRegistered'] as bool? ?? false,
      hotkeyLabel: map['hotkeyLabel'] as String? ?? 'Ctrl+Alt+Space',
      deliveryMode: deliveryModeRaw == 'clipboard_only'
          ? WindowsOverlayDeliveryMode.clipboardOnly
          : WindowsOverlayDeliveryMode.pasteAndClipboard,
      sizeScale: (map['sizeScale'] as num?)?.toDouble() ?? 1,
      opacity: (map['opacity'] as num?)?.toDouble() ?? 0.9,
      lastErrorCode: map['lastErrorCode'] as String?,
      lastErrorMessage: map['lastErrorMessage'] as String?,
      eventQueueSize: (map['eventQueueSize'] as num?)?.toInt() ?? 0,
    );
  }
}

class WindowsOverlayEvent {
  const WindowsOverlayEvent({
    required this.trigger,
    required this.capturedAtUtc,
  });

  final WindowsOverlayTrigger trigger;
  final DateTime capturedAtUtc;

  static WindowsOverlayEvent? fromMap(Map<Object?, Object?> map) {
    final rawTrigger = map['trigger'];
    final capturedAtEpochMillis = map['capturedAtEpochMillis'];
    if (rawTrigger is! String || capturedAtEpochMillis is! num) {
      return null;
    }
    return WindowsOverlayEvent(
      trigger: switch (rawTrigger) {
        'hotkey' => WindowsOverlayTrigger.hotkey,
        'manual' => WindowsOverlayTrigger.manual,
        _ => WindowsOverlayTrigger.unknown,
      },
      capturedAtUtc: DateTime.fromMillisecondsSinceEpoch(
        capturedAtEpochMillis.toInt(),
        isUtc: true,
      ),
    );
  }
}

class WindowsOverlayDeliveryResult {
  const WindowsOverlayDeliveryResult({
    required this.status,
    required this.clipboardCopied,
    required this.pasteAttempted,
    required this.pasteSucceeded,
    this.errorCode,
    this.errorMessage,
  });

  final WindowsOverlayDeliveryStatus status;
  final bool clipboardCopied;
  final bool pasteAttempted;
  final bool pasteSucceeded;
  final String? errorCode;
  final String? errorMessage;

  factory WindowsOverlayDeliveryResult.fromMap(Map<Object?, Object?> map) {
    final statusRaw = map['status'] as String? ?? 'failed';
    return WindowsOverlayDeliveryResult(
      status: switch (statusRaw) {
        'delivered' => WindowsOverlayDeliveryStatus.delivered,
        'clipboard_only' => WindowsOverlayDeliveryStatus.clipboardOnly,
        _ => WindowsOverlayDeliveryStatus.failed,
      },
      clipboardCopied: map['clipboardCopied'] as bool? ?? false,
      pasteAttempted: map['pasteAttempted'] as bool? ?? false,
      pasteSucceeded: map['pasteSucceeded'] as bool? ?? false,
      errorCode: map['errorCode'] as String?,
      errorMessage: map['errorMessage'] as String?,
    );
  }
}

class WindowsOverlayBridgeException implements Exception {
  const WindowsOverlayBridgeException({
    required this.code,
    required this.message,
    this.details,
  });

  final String code;
  final String message;
  final Object? details;

  @override
  String toString() => 'WindowsOverlayBridgeException($code): $message';
}

class WindowsOverlayBridge {
  WindowsOverlayBridge._();

  static const MethodChannel _channel = MethodChannel(
    'commandglows_app/windows_overlay',
  );

  static Future<WindowsOverlayStatus> getStatus() async {
    if (!PlatformCapabilities.windowsDesktopOverlaySupported) {
      return WindowsOverlayStatus.unsupported();
    }
    final raw = await _invoke<Map<Object?, Object?>>('getWindowsOverlayStatus');
    return WindowsOverlayStatus.fromMap(raw ?? const {});
  }

  static Future<WindowsOverlayStatus> setEnabled(bool enabled) async {
    _ensureSupported();
    final raw = await _invoke<Map<Object?, Object?>>(
      'setWindowsOverlayEnabled',
      {'enabled': enabled},
    );
    return WindowsOverlayStatus.fromMap(raw ?? const {});
  }

  static Future<WindowsOverlayStatus> show() async {
    _ensureSupported();
    final raw = await _invoke<Map<Object?, Object?>>('showWindowsOverlay');
    return WindowsOverlayStatus.fromMap(raw ?? const {});
  }

  static Future<WindowsOverlayStatus> hide() async {
    _ensureSupported();
    final raw = await _invoke<Map<Object?, Object?>>('hideWindowsOverlay');
    return WindowsOverlayStatus.fromMap(raw ?? const {});
  }

  static Future<WindowsOverlayStatus> setAppearance({
    required double sizeScale,
    required double opacity,
  }) async {
    _ensureSupported();
    final raw = await _invoke<Map<Object?, Object?>>(
      'setWindowsOverlayAppearance',
      {
        'sizeScale': sizeScale.clamp(0.8, 1.4),
        'opacity': opacity.clamp(0.5, 1),
      },
    );
    return WindowsOverlayStatus.fromMap(raw ?? const {});
  }

  static Future<WindowsOverlayDeliveryResult> deliverText(String text) async {
    _ensureSupported();
    final raw = await _invoke<Map<Object?, Object?>>(
      'deliverWindowsOverlayText',
      {'text': text},
    );
    return WindowsOverlayDeliveryResult.fromMap(raw ?? const {});
  }

  static Future<List<WindowsOverlayEvent>> drainEvents() async {
    if (!PlatformCapabilities.windowsDesktopOverlaySupported) {
      return const <WindowsOverlayEvent>[];
    }
    final raw = await _invoke<List<Object?>>('drainWindowsOverlayEvents');
    return (raw ?? const <Object?>[])
        .whereType<Map<Object?, Object?>>()
        .map(WindowsOverlayEvent.fromMap)
        .where((event) => event != null)
        .cast<WindowsOverlayEvent>()
        .toList(growable: false);
  }

  static void _ensureSupported() {
    if (!PlatformCapabilities.windowsDesktopOverlaySupported) {
      throw WindowsOverlayBridgeException(
        code: 'WINDOWS_OVERLAY_UNSUPPORTED',
        message:
            'L’overlay Windows nécessite l’application desktop Windows native.',
      );
    }
  }

  static Future<T?> _invoke<T>(String method, [Object? arguments]) async {
    try {
      return await _channel.invokeMethod<T>(method, arguments);
    } on PlatformException catch (error) {
      throw WindowsOverlayBridgeException(
        code: error.code,
        message: error.message ?? 'Native Windows overlay operation failed.',
        details: error.details,
      );
    }
  }
}
