import 'package:flutter/services.dart';

import 'platform_capabilities.dart';

enum OverlayDeliveryMode { clipboardOnly, injectionAndClipboard }

enum AndroidOverlayEventType {
  bubbleTap,
  recordStop,
  recordCancel,
  recordPause,
  recordResume,
  longPress,
  overlayTextDelivery,
  serviceError,
  permissionRevoked,
  unknown,
}

enum AndroidOverlayVisualState {
  collapsed,
  recording,
  paused,
  processing,
  result,
}

class AndroidOverlayStatus {
  const AndroidOverlayStatus({
    required this.enabled,
    required this.requestedEnabled,
    required this.running,
    required this.overlayPermissionGranted,
    required this.accessibilityPermissionGranted,
    required this.recordAudioGranted,
    required this.deliveryMode,
    required this.sizeScale,
    required this.opacity,
    this.eventQueueSize = 0,
    this.serviceState = 'unknown',
    this.lastNativeEvent,
  });

  final bool enabled;
  final bool requestedEnabled;
  final bool running;
  final bool overlayPermissionGranted;
  final bool accessibilityPermissionGranted;
  final bool recordAudioGranted;
  final OverlayDeliveryMode deliveryMode;
  final double sizeScale;
  final double opacity;
  final int eventQueueSize;
  final String serviceState;
  final String? lastNativeEvent;

  factory AndroidOverlayStatus.fromMap(Map<Object?, Object?> map) {
    final modeRaw = map['deliveryMode'] as String? ?? 'clipboard_only';
    return AndroidOverlayStatus(
      enabled: map['enabled'] as bool? ?? false,
      requestedEnabled: map['requestedEnabled'] as bool? ?? false,
      running: map['running'] as bool? ?? false,
      overlayPermissionGranted:
          map['overlayPermissionGranted'] as bool? ?? false,
      accessibilityPermissionGranted:
          map['accessibilityPermissionGranted'] as bool? ?? false,
      recordAudioGranted: map['recordAudioGranted'] as bool? ?? false,
      deliveryMode: modeRaw == 'injection_and_clipboard'
          ? OverlayDeliveryMode.injectionAndClipboard
          : OverlayDeliveryMode.clipboardOnly,
      sizeScale: (map['sizeScale'] as num?)?.toDouble() ?? 1,
      opacity: (map['opacity'] as num?)?.toDouble() ?? 0.9,
      eventQueueSize: (map['eventQueueSize'] as num?)?.toInt() ?? 0,
      serviceState: map['serviceState'] as String? ?? 'unknown',
      lastNativeEvent: map['lastNativeEvent'] as String?,
    );
  }
}

class AndroidOverlayEvent {
  const AndroidOverlayEvent({
    required this.type,
    required this.capturedAtUtc,
    required this.payload,
  });

  final AndroidOverlayEventType type;
  final DateTime capturedAtUtc;
  final Map<String, Object?> payload;

  static AndroidOverlayEvent? fromMap(Map<Object?, Object?> map) {
    final rawType = map['type'];
    final capturedAtEpochMillis = map['capturedAtEpochMillis'];
    if (rawType is! String || capturedAtEpochMillis is! num) {
      return null;
    }
    final payload = <String, Object?>{};
    final rawPayload = map['payload'];
    if (rawPayload is Map<Object?, Object?>) {
      for (final entry in rawPayload.entries) {
        final key = entry.key;
        final value = entry.value;
        if (key is String &&
            (value == null ||
                value is String ||
                value is num ||
                value is bool ||
                value is Map)) {
          payload[key] = value;
        }
      }
    }
    return AndroidOverlayEvent(
      type: _eventTypeFromNative(rawType),
      capturedAtUtc: DateTime.fromMillisecondsSinceEpoch(
        capturedAtEpochMillis.toInt(),
        isUtc: true,
      ),
      payload: payload,
    );
  }

  static AndroidOverlayEventType _eventTypeFromNative(String value) {
    return switch (value) {
      'bubbleTap' => AndroidOverlayEventType.bubbleTap,
      'recordStop' => AndroidOverlayEventType.recordStop,
      'recordCancel' => AndroidOverlayEventType.recordCancel,
      'recordPause' => AndroidOverlayEventType.recordPause,
      'recordResume' => AndroidOverlayEventType.recordResume,
      'longPress' => AndroidOverlayEventType.longPress,
      'overlayTextDelivery' => AndroidOverlayEventType.overlayTextDelivery,
      'serviceError' => AndroidOverlayEventType.serviceError,
      'permissionRevoked' => AndroidOverlayEventType.permissionRevoked,
      _ => AndroidOverlayEventType.unknown,
    };
  }
}

class AndroidOverlayDeliveryResult {
  const AndroidOverlayDeliveryResult({
    required this.injected,
    required this.clipboardCopied,
    required this.sensitiveField,
    required this.deliveryPolicy,
  });

  final bool injected;
  final bool clipboardCopied;
  final bool sensitiveField;
  final String deliveryPolicy;

  factory AndroidOverlayDeliveryResult.fromMap(Map<Object?, Object?> map) {
    return AndroidOverlayDeliveryResult(
      injected: map['injected'] as bool? ?? false,
      clipboardCopied: map['clipboardCopied'] as bool? ?? false,
      sensitiveField: map['sensitiveField'] as bool? ?? false,
      deliveryPolicy: map['deliveryPolicy'] as String? ?? 'clipboard_only',
    );
  }
}

class AndroidOverlayEventTextDelivery {
  const AndroidOverlayEventTextDelivery({
    required this.rawText,
    required this.cleanedText,
    required this.language,
    required this.source,
    required this.durationMs,
    required this.delivery,
  });

  final String rawText;
  final String cleanedText;
  final String language;
  final String source;
  final int durationMs;
  final AndroidOverlayDeliveryResult delivery;

  static AndroidOverlayEventTextDelivery? fromOverlayEvent(
    AndroidOverlayEvent event,
  ) {
    if (event.type != AndroidOverlayEventType.overlayTextDelivery) {
      return null;
    }
    final rawText = event.payload['rawText'];
    final cleanedText = event.payload['cleanedText'];
    final language = event.payload['language'];
    final source = event.payload['source'];
    final durationMs = event.payload['durationMs'];
    final delivery = event.payload['delivery'];
    if (rawText is! String ||
        cleanedText is! String ||
        language is! String ||
        source is! String ||
        durationMs is! num ||
        delivery is! Map<Object?, Object?>) {
      return null;
    }
    final deliveryResult = AndroidOverlayDeliveryResult.fromMap(delivery);
    return AndroidOverlayEventTextDelivery(
      rawText: rawText,
      cleanedText: cleanedText,
      language: language,
      source: source,
      durationMs: durationMs.toInt(),
      delivery: deliveryResult,
    );
  }
}

class AndroidOverlayBridgeException implements Exception {
  const AndroidOverlayBridgeException({
    required this.code,
    required this.message,
    this.details,
  });

  final String code;
  final String message;
  final Object? details;

  @override
  String toString() => 'AndroidOverlayBridgeException($code): $message';
}

class AndroidOverlayBridge {
  AndroidOverlayBridge._();

  static const MethodChannel _channel = MethodChannel('commandglows_app/overlay');

  static Future<bool> isPermissionGranted() async {
    final status = await getStatus();
    return status.overlayPermissionGranted;
  }

  static Future<bool> isAccessibilityPermissionGranted() async {
    final status = await getStatus();
    return status.accessibilityPermissionGranted;
  }

  static Future<void> openPermissionSettings() async {
    if (!PlatformCapabilities.overlaySupported) {
      throw AndroidOverlayBridgeException(
        code: 'OVERLAY_UNSUPPORTED',
        message: PlatformCapabilities.overlayUnavailableReason,
      );
    }
    await _invoke<void>('openOverlayPermissionSettings');
  }

  static Future<void> openAccessibilitySettings() async {
    if (!PlatformCapabilities.overlaySupported) {
      throw AndroidOverlayBridgeException(
        code: 'OVERLAY_UNSUPPORTED',
        message: PlatformCapabilities.overlayUnavailableReason,
      );
    }
    await _invoke<void>('openAccessibilitySettings');
  }

  static Future<void> openAppSettings() async {
    if (!PlatformCapabilities.overlaySupported) {
      throw AndroidOverlayBridgeException(
        code: 'OVERLAY_UNSUPPORTED',
        message: PlatformCapabilities.overlayUnavailableReason,
      );
    }
    await _invoke<void>('openAppSettings');
  }

  static Future<AndroidOverlayStatus> getStatus() async {
    if (!PlatformCapabilities.overlaySupported) {
      return const AndroidOverlayStatus(
        enabled: false,
        requestedEnabled: false,
        running: false,
        overlayPermissionGranted: false,
        accessibilityPermissionGranted: false,
        recordAudioGranted: false,
        deliveryMode: OverlayDeliveryMode.clipboardOnly,
        sizeScale: 1,
        opacity: 0.9,
        eventQueueSize: 0,
        serviceState: 'unsupported',
      );
    }
    final raw = await _invoke<Map<Object?, Object?>>('getOverlayStatus');
    return AndroidOverlayStatus.fromMap(raw ?? const {});
  }

  static Future<AndroidOverlayStatus> setAppearance({
    required double sizeScale,
    required double opacity,
  }) async {
    if (!PlatformCapabilities.overlaySupported) {
      throw AndroidOverlayBridgeException(
        code: 'OVERLAY_UNSUPPORTED',
        message: PlatformCapabilities.overlayUnavailableReason,
      );
    }
    final raw = await _invoke<Map<Object?, Object?>>('setOverlayAppearance', {
      'sizeScale': sizeScale.clamp(0.8, 1.4),
      'opacity': opacity.clamp(0.5, 1),
    });
    return AndroidOverlayStatus.fromMap(raw ?? const {});
  }

  static Future<AndroidOverlayStatus> setOverlayEnabled(bool enabled) async {
    if (!PlatformCapabilities.overlaySupported) {
      throw AndroidOverlayBridgeException(
        code: 'OVERLAY_UNSUPPORTED',
        message: PlatformCapabilities.overlayUnavailableReason,
      );
    }
    final raw = await _invoke<Map<Object?, Object?>>('setOverlayEnabled', {
      'enabled': enabled,
    });
    return AndroidOverlayStatus.fromMap(raw ?? const {});
  }

  static Future<AndroidOverlayStatus> startRecording() async {
    final raw = await _invoke<Map<Object?, Object?>>('startOverlayRecording');
    return AndroidOverlayStatus.fromMap(raw ?? const {});
  }

  static Future<AndroidOverlayStatus> stopRecording() async {
    final raw = await _invoke<Map<Object?, Object?>>('stopOverlayRecording');
    return AndroidOverlayStatus.fromMap(raw ?? const {});
  }

  static Future<AndroidOverlayStatus> cancelRecording() async {
    final raw = await _invoke<Map<Object?, Object?>>('cancelOverlayRecording');
    return AndroidOverlayStatus.fromMap(raw ?? const {});
  }

  static Future<AndroidOverlayStatus> pauseRecording() async {
    final raw = await _invoke<Map<Object?, Object?>>('pauseOverlayRecording');
    return AndroidOverlayStatus.fromMap(raw ?? const {});
  }

  static Future<AndroidOverlayStatus> resumeRecording() async {
    final raw = await _invoke<Map<Object?, Object?>>('resumeOverlayRecording');
    return AndroidOverlayStatus.fromMap(raw ?? const {});
  }

  static Future<List<AndroidOverlayEvent>> drainEvents() async {
    if (!PlatformCapabilities.overlaySupported) {
      return const <AndroidOverlayEvent>[];
    }
    final raw = await _invoke<List<Object?>>('drainOverlayEvents');
    return (raw ?? const <Object?>[])
        .whereType<Map<Object?, Object?>>()
        .map(AndroidOverlayEvent.fromMap)
        .where((event) => event != null)
        .cast<AndroidOverlayEvent>()
        .toList(growable: false);
  }

  static Future<T?> _invoke<T>(String method, [Object? arguments]) async {
    try {
      return await _channel.invokeMethod<T>(method, arguments);
    } on PlatformException catch (error) {
      throw AndroidOverlayBridgeException(
        code: error.code,
        message: error.message ?? 'Native overlay operation failed.',
        details: error.details,
      );
    }
  }
}
