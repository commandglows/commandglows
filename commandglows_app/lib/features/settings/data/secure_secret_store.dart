import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../../core/platform/platform_capabilities.dart';

enum SecretStorageStatus { available, degraded }

class SecureSecretStore {
  static const _openAiKey = 'openai_api_key';
  static const _anthropicKey = 'anthropic_api_key';
  static const _storage = FlutterSecureStorage();

  Future<SecretStorageStatus> status() async {
    if (PlatformCapabilities.secureStorageDegraded) {
      return SecretStorageStatus.degraded;
    }
    try {
      await _storage.containsKey(key: _openAiKey);
      return SecretStorageStatus.available;
    } catch (_) {
      return SecretStorageStatus.degraded;
    }
  }

  Future<String?> readOpenAiKey() => _read(_openAiKey);
  Future<String?> readAnthropicKey() => _read(_anthropicKey);

  Future<void> writeOpenAiKey(String value) => _write(_openAiKey, value);
  Future<void> writeAnthropicKey(String value) => _write(_anthropicKey, value);

  Future<void> clearOpenAiKey() => _storage.delete(key: _openAiKey);
  Future<void> clearAnthropicKey() => _storage.delete(key: _anthropicKey);

  Future<String?> _read(String key) async {
    try {
      return await _storage.read(key: key);
    } catch (_) {
      return null;
    }
  }

  Future<void> _write(String key, String value) async {
    final trimmed = value.trim();
    if (trimmed.isEmpty) {
      await _storage.delete(key: key);
      return;
    }
    await _storage.write(key: key, value: trimmed);
  }
}
