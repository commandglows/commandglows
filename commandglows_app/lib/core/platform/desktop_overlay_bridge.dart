import 'package:flutter/services.dart';

import 'platform_capabilities.dart';

enum DesktopOverlayPlatform { windows, macOS, linux, unsupported }

enum DesktopOverlayTrigger { hotkey, manual, unknown }

enum DesktopOverlayDeliveryMode { clipboardOnly, pasteAndClipboard }

enum DesktopOverlayDeliveryStatus { delivered, clipboardOnly, failed }

enum DesktopOverlayCommandStatus { delivered, unsupported, failed }

class DesktopOverlayStatus {
  const DesktopOverlayStatus({
    required this.platform,
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

  final DesktopOverlayPlatform platform;
  final bool supported;
  final bool enabled;
  final bool visible;
  final bool hotkeyRegistered;
  final String hotkeyLabel;
  final DesktopOverlayDeliveryMode deliveryMode;
  final double sizeScale;
  final double opacity;
  final String? lastErrorCode;
  final String? lastErrorMessage;
  final int eventQueueSize;

  factory DesktopOverlayStatus.unsupported() {
    return const DesktopOverlayStatus(
      platform: DesktopOverlayPlatform.unsupported,
      supported: false,
      enabled: false,
      visible: false,
      hotkeyRegistered: false,
      hotkeyLabel: '',
      deliveryMode: DesktopOverlayDeliveryMode.clipboardOnly,
      sizeScale: 1,
      opacity: 0.9,
    );
  }

  factory DesktopOverlayStatus.fromMap(
    Map<Object?, Object?> map, {
    required DesktopOverlayPlatform fallbackPlatform,
  }) {
    final platformRaw = map['platform'] as String?;
    final deliveryModeRaw =
        map['deliveryMode'] as String? ?? 'paste_and_clipboard';
    return DesktopOverlayStatus(
      platform: switch (platformRaw) {
        'windows' => DesktopOverlayPlatform.windows,
        'macos' => DesktopOverlayPlatform.macOS,
        'linux' => DesktopOverlayPlatform.linux,
        _ => fallbackPlatform,
      },
      supported: map['supported'] as bool? ?? false,
      enabled: map['enabled'] as bool? ?? false,
      visible: map['visible'] as bool? ?? false,
      hotkeyRegistered: map['hotkeyRegistered'] as bool? ?? false,
      hotkeyLabel: map['hotkeyLabel'] as String? ?? '',
      deliveryMode: deliveryModeRaw == 'clipboard_only'
          ? DesktopOverlayDeliveryMode.clipboardOnly
          : DesktopOverlayDeliveryMode.pasteAndClipboard,
      sizeScale: (map['sizeScale'] as num?)?.toDouble() ?? 1,
      opacity: (map['opacity'] as num?)?.toDouble() ?? 0.9,
      lastErrorCode: map['lastErrorCode'] as String?,
      lastErrorMessage: map['lastErrorMessage'] as String?,
      eventQueueSize: (map['eventQueueSize'] as num?)?.toInt() ?? 0,
    );
  }
}

class DesktopOverlayEvent {
  const DesktopOverlayEvent({
    required this.trigger,
    required this.capturedAtUtc,
  });

  final DesktopOverlayTrigger trigger;
  final DateTime capturedAtUtc;

  static DesktopOverlayEvent? fromMap(Map<Object?, Object?> map) {
    final rawTrigger = map['trigger'];
    final capturedAtEpochMillis = map['capturedAtEpochMillis'];
    if (rawTrigger is! String || capturedAtEpochMillis is! num) {
      return null;
    }
    return DesktopOverlayEvent(
      trigger: switch (rawTrigger) {
        'hotkey' => DesktopOverlayTrigger.hotkey,
        'manual' => DesktopOverlayTrigger.manual,
        _ => DesktopOverlayTrigger.unknown,
      },
      capturedAtUtc: DateTime.fromMillisecondsSinceEpoch(
        capturedAtEpochMillis.toInt(),
        isUtc: true,
      ),
    );
  }
}

class DesktopOverlayDeliveryResult {
  const DesktopOverlayDeliveryResult({
    required this.status,
    required this.clipboardCopied,
    required this.pasteAttempted,
    required this.pasteSucceeded,
    this.errorCode,
    this.errorMessage,
  });

  final DesktopOverlayDeliveryStatus status;
  final bool clipboardCopied;
  final bool pasteAttempted;
  final bool pasteSucceeded;
  final String? errorCode;
  final String? errorMessage;

  factory DesktopOverlayDeliveryResult.fromMap(Map<Object?, Object?> map) {
    final statusRaw = map['status'] as String? ?? 'failed';
    return DesktopOverlayDeliveryResult(
      status: switch (statusRaw) {
        'delivered' => DesktopOverlayDeliveryStatus.delivered,
        'clipboard_only' => DesktopOverlayDeliveryStatus.clipboardOnly,
        _ => DesktopOverlayDeliveryStatus.failed,
      },
      clipboardCopied: map['clipboardCopied'] as bool? ?? false,
      pasteAttempted: map['pasteAttempted'] as bool? ?? false,
      pasteSucceeded: map['pasteSucceeded'] as bool? ?? false,
      errorCode: map['errorCode'] as String?,
      errorMessage: map['errorMessage'] as String?,
    );
  }
}

enum DesktopOverlayKeyModifier { ctrl, alt, shift, meta }

extension DesktopOverlayKeyModifierFromDomain on DesktopOverlayKeyModifier {
  static DesktopOverlayKeyModifier fromDomain(dynamic modifier) {
    final name = modifier.toString().split('.').last;
    return DesktopOverlayKeyModifier.values.firstWhere(
      (item) => item.name == name,
      orElse: () => DesktopOverlayKeyModifier.ctrl,
    );
  }
}

class DesktopOverlayKeyStroke {
  const DesktopOverlayKeyStroke({required this.key, required this.modifiers});

  final String key;
  final List<DesktopOverlayKeyModifier> modifiers;

  Map<String, Object?> toMap() {
    return {
      'key': key,
      'modifiers': modifiers.map((item) => item.name).toList(growable: false),
    };
  }
}

class DesktopOverlayCommandResult {
  const DesktopOverlayCommandResult({
    required this.status,
    required this.sentSteps,
    this.errorCode,
    this.errorMessage,
  });

  final DesktopOverlayCommandStatus status;
  final int sentSteps;
  final String? errorCode;
  final String? errorMessage;

  factory DesktopOverlayCommandResult.fromMap(Map<Object?, Object?> map) {
    final statusRaw = map['status'] as String? ?? 'failed';
    return DesktopOverlayCommandResult(
      status: switch (statusRaw) {
        'delivered' => DesktopOverlayCommandStatus.delivered,
        'unsupported' => DesktopOverlayCommandStatus.unsupported,
        _ => DesktopOverlayCommandStatus.failed,
      },
      sentSteps: (map['sentSteps'] as num?)?.toInt() ?? 0,
      errorCode: map['errorCode'] as String?,
      errorMessage: map['errorMessage'] as String?,
    );
  }
}

class DesktopOverlayBridgeException implements Exception {
  const DesktopOverlayBridgeException({
    required this.code,
    required this.message,
    this.details,
  });

  final String code;
  final String message;
  final Object? details;

  @override
  String toString() => 'DesktopOverlayBridgeException($code): $message';
}

class DesktopOverlayBridge {
  DesktopOverlayBridge._();

  static const MethodChannel _windowsChannel = MethodChannel(
    'commandglows_app/windows_overlay',
  );
  static const MethodChannel _macOSChannel = MethodChannel(
    'commandglows_app/macos_overlay',
  );
  static const MethodChannel _linuxChannel = MethodChannel(
    'commandglows_app/linux_overlay',
  );

  static Future<DesktopOverlayStatus> getStatus() async {
    final channel = _channel;
    if (channel == null) {
      return DesktopOverlayStatus.unsupported();
    }
    final raw = await _invoke<Map<Object?, Object?>>(
      channel,
      _methodName('get', 'Status'),
    );
    return DesktopOverlayStatus.fromMap(
      raw ?? const {},
      fallbackPlatform: _platform,
    );
  }

  static Future<DesktopOverlayStatus> setEnabled(bool enabled) async {
    final channel = _ensureSupported();
    final raw = await _invoke<Map<Object?, Object?>>(
      channel,
      _methodName('set', 'Enabled'),
      {'enabled': enabled},
    );
    return DesktopOverlayStatus.fromMap(
      raw ?? const {},
      fallbackPlatform: _platform,
    );
  }

  static Future<DesktopOverlayStatus> show() async {
    final channel = _ensureSupported();
    final raw = await _invoke<Map<Object?, Object?>>(
      channel,
      _methodName('show'),
    );
    return DesktopOverlayStatus.fromMap(
      raw ?? const {},
      fallbackPlatform: _platform,
    );
  }

  static Future<DesktopOverlayStatus> hide() async {
    final channel = _ensureSupported();
    final raw = await _invoke<Map<Object?, Object?>>(
      channel,
      _methodName('hide'),
    );
    return DesktopOverlayStatus.fromMap(
      raw ?? const {},
      fallbackPlatform: _platform,
    );
  }

  static Future<DesktopOverlayStatus> setAppearance({
    required double sizeScale,
    required double opacity,
  }) async {
    final channel = _ensureSupported();
    final raw = await _invoke<Map<Object?, Object?>>(
      channel,
      _methodName('set', 'Appearance'),
      {
        'sizeScale': sizeScale.clamp(0.8, 1.4),
        'opacity': opacity.clamp(0.5, 1),
      },
    );
    return DesktopOverlayStatus.fromMap(
      raw ?? const {},
      fallbackPlatform: _platform,
    );
  }

  static Future<DesktopOverlayDeliveryResult> deliverText(String text) async {
    final channel = _ensureSupported();
    final raw = await _invoke<Map<Object?, Object?>>(
      channel,
      _methodName('deliver', 'Text'),
      {'text': text},
    );
    return DesktopOverlayDeliveryResult.fromMap(raw ?? const {});
  }

  static Future<DesktopOverlayCommandResult> deliverKeySequence(
    List<DesktopOverlayKeyStroke> steps,
  ) async {
    final channel = _ensureSupported();
    final raw = await _invoke<Map<Object?, Object?>>(
      channel,
      _methodName('deliver', 'KeySequence'),
      {'steps': steps.map((item) => item.toMap()).toList(growable: false)},
    );
    return DesktopOverlayCommandResult.fromMap(raw ?? const {});
  }

  static Future<List<DesktopOverlayEvent>> drainEvents() async {
    final channel = _channel;
    if (channel == null) {
      return const <DesktopOverlayEvent>[];
    }
    final raw = await _invoke<List<Object?>>(
      channel,
      _methodName('drain', 'Events'),
    );
    return (raw ?? const <Object?>[])
        .whereType<Map<Object?, Object?>>()
        .map(DesktopOverlayEvent.fromMap)
        .where((event) => event != null)
        .cast<DesktopOverlayEvent>()
        .toList(growable: false);
  }

  static MethodChannel? get _channel {
    if (PlatformCapabilities.windowsDesktopOverlaySupported) {
      return _windowsChannel;
    }
    if (PlatformCapabilities.macOSDesktopOverlaySupported) {
      return _macOSChannel;
    }
    if (PlatformCapabilities.linuxDesktopOverlaySupported) {
      return _linuxChannel;
    }
    return null;
  }

  static DesktopOverlayPlatform get _platform {
    if (PlatformCapabilities.isWindows) {
      return DesktopOverlayPlatform.windows;
    }
    if (PlatformCapabilities.isMacOS) {
      return DesktopOverlayPlatform.macOS;
    }
    if (PlatformCapabilities.isLinux) {
      return DesktopOverlayPlatform.linux;
    }
    return DesktopOverlayPlatform.unsupported;
  }

  static String _methodName(String action, [String? suffix]) {
    final prefix = switch (_platform) {
      DesktopOverlayPlatform.windows => 'WindowsOverlay',
      DesktopOverlayPlatform.macOS => 'MacOSOverlay',
      DesktopOverlayPlatform.linux => 'LinuxOverlay',
      DesktopOverlayPlatform.unsupported => 'DesktopOverlay',
    };
    return suffix == null ? '$action$prefix' : '$action$prefix$suffix';
  }

  static MethodChannel _ensureSupported() {
    final channel = _channel;
    if (channel == null) {
      throw DesktopOverlayBridgeException(
        code: 'DESKTOP_OVERLAY_UNSUPPORTED',
        message:
            'L’overlay desktop nécessite une application native Windows, macOS ou Linux.',
      );
    }
    return channel;
  }

  static Future<T?> _invoke<T>(
    MethodChannel channel,
    String method, [
    Object? arguments,
  ]) async {
    try {
      return await channel.invokeMethod<T>(method, arguments);
    } on PlatformException catch (error) {
      throw DesktopOverlayBridgeException(
        code: error.code,
        message: error.message ?? 'Native desktop overlay operation failed.',
        details: error.details,
      );
    }
  }
}
