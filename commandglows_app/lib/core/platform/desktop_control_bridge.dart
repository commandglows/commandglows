import 'package:flutter/services.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'platform_capabilities.dart';

/// Snapshot returned by the native Windows desktop-control host.
class DesktopControlStatus {
  const DesktopControlStatus({
    required this.supported,
    required this.enabled,
    required this.active,
    required this.hotkeyRegistered,
    this.errorCode,
  });

  final bool supported;
  final bool enabled;
  final bool active;
  final bool hotkeyRegistered;
  final String? errorCode;

  factory DesktopControlStatus.unsupported() => const DesktopControlStatus(
    supported: false,
    enabled: false,
    active: false,
    hotkeyRegistered: false,
  );

  factory DesktopControlStatus.fromMap(Map<Object?, Object?> map) {
    final rawErrorCode = (map['errorCode'] as String?)?.trim();
    return DesktopControlStatus(
      supported: map['supported'] as bool? ?? false,
      enabled: map['enabled'] as bool? ?? false,
      active: map['active'] as bool? ?? false,
      hotkeyRegistered: map['hotkeyRegistered'] as bool? ?? false,
      errorCode: rawErrorCode == null || rawErrorCode.isEmpty
          ? null
          : rawErrorCode,
    );
  }
}

class DesktopControlException implements Exception {
  const DesktopControlException(this.code, this.recoveryMessage);

  final String code;
  final String recoveryMessage;

  @override
  String toString() => 'DesktopControlException($code)';
}

class DesktopControlBridge {
  DesktopControlBridge._();

  static const MethodChannel _channel = MethodChannel(
    'commandglows_app/desktop_control',
  );

  static Future<DesktopControlStatus> getStatus() async {
    if (!PlatformCapabilities.isWindows) {
      return DesktopControlStatus.unsupported();
    }
    return _invoke('getStatus');
  }

  static Future<DesktopControlStatus> setEnabled(bool enabled) =>
      _invoke('setEnabled', {'enabled': enabled});

  static Future<DesktopControlStatus> activate() => _invoke('activate');

  static Future<DesktopControlStatus> cancel() => _invoke('cancel');

  static Future<DesktopControlStatus> _invoke(
    String method, [
    Object? arguments,
  ]) async {
    if (!PlatformCapabilities.isWindows) {
      throw const DesktopControlException(
        'UNSUPPORTED_PLATFORM',
        'Le contrôle du bureau est disponible uniquement dans CommandGlows pour Windows.',
      );
    }
    try {
      final result = await _channel.invokeMapMethod<Object?, Object?>(
        method,
        arguments,
      );
      return DesktopControlStatus.fromMap(result ?? const {});
    } on PlatformException catch (error) {
      throw DesktopControlException(error.code, recoveryMessageFor(error.code));
    } on MissingPluginException {
      throw const DesktopControlException(
        'NATIVE_CHANNEL_UNAVAILABLE',
        'Le contrôle du bureau n’est pas disponible dans cette version Windows. Redémarrez CommandGlows après sa mise à jour.',
      );
    }
  }

  static String recoveryMessageFor(String code) => switch (code) {
    'HOTKEY_UNAVAILABLE' =>
      'Le raccourci Ctrl+Alt+G est déjà utilisé. Fermez l’application qui le réserve, puis réessayez.',
    'HOOK_UNAVAILABLE' =>
      'Windows n’a pas pu écouter les touches. Désactivez puis réactivez le contrôle du bureau.',
    'OVERLAY_UNAVAILABLE' =>
      'La grille ne peut pas s’afficher sur cet écran. Vérifiez la session Windows et la configuration des écrans, puis réessayez.',
    'INPUT_UNAVAILABLE' =>
      'Windows n’a pas pu envoyer cette action. Les applications élevées, l’écran verrouillé et les fenêtres de sécurité restent hors du périmètre pris en charge.',
    'UNSUPPORTED_PLATFORM' =>
      'Le contrôle du bureau est disponible uniquement dans CommandGlows pour Windows.',
    _ =>
      'Le contrôle du bureau n’a pas pu démarrer. Fermez puis relancez CommandGlows et réessayez.',
  };
}

/// A deliberately local opt-in, separate from syncable account preferences.
abstract interface class DesktopControlPreference {
  Future<bool> isEnabled();
  Future<void> setEnabled(bool enabled);
}

class DesktopControlPreferenceStore implements DesktopControlPreference {
  DesktopControlPreferenceStore({FlutterSecureStorage? storage})
    : _storage = storage ?? const FlutterSecureStorage();

  static const _enabledKey = 'desktop_control_enabled';
  final FlutterSecureStorage _storage;

  @override
  Future<bool> isEnabled() async =>
      await _storage.read(key: _enabledKey) == 'true';

  @override
  Future<void> setEnabled(bool enabled) =>
      _storage.write(key: _enabledKey, value: enabled ? 'true' : 'false');
}
