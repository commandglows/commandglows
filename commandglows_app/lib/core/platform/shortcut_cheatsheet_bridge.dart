import 'package:flutter/services.dart';

import 'platform_capabilities.dart';

class ShortcutCheatsheetBridge {
  ShortcutCheatsheetBridge._();

  static const MethodChannel _channel = MethodChannel(
    'commandglows_app/shortcut_cheatsheet',
  );

  static Future<Map<Object?, Object?>> getStatus() async {
    if (!PlatformCapabilities.isWindows) return const {};
    try {
      return await _channel.invokeMapMethod<Object?, Object?>('getStatus') ??
          const {};
    } on MissingPluginException {
      return const {};
    }
  }

  static Future<List<Map<Object?, Object?>>> drainEvents() async {
    if (!PlatformCapabilities.isWindows) return const [];
    try {
      final raw = await _channel.invokeListMethod<Object?>('drainEvents');
      return (raw ?? const [])
          .whereType<Map>()
          .map((event) => Map<Object?, Object?>.from(event))
          .toList(growable: false);
    } on MissingPluginException {
      return const [];
    }
  }

  static Future<bool> show() async {
    if (!PlatformCapabilities.isWindows) return false;
    try {
      await _channel.invokeMethod<Object?>('showCheatsheet');
      return true;
    } on MissingPluginException {
      return false;
    }
  }
}
