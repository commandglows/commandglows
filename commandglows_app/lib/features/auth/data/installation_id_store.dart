import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:uuid/uuid.dart';

/// Stores an app-scoped random installation identifier. It is not a hardware
/// identifier and is sent only to the suite bridge, which persists a keyed
/// hash rather than this value.
class InstallationIdStore {
  InstallationIdStore({FlutterSecureStorage? storage, Uuid? uuid})
    : _storage = storage ?? const FlutterSecureStorage(),
      _uuid = uuid ?? const Uuid();

  static const _storageKey = 'commandglows.trial.installation-id.v1';

  final FlutterSecureStorage _storage;
  final Uuid _uuid;

  Future<String> readOrCreate() async {
    final existing = (await _storage.read(key: _storageKey))?.trim();
    if (existing != null && existing.isNotEmpty) {
      return existing;
    }

    final installationId = _uuid.v4();
    await _storage.write(key: _storageKey, value: installationId);
    return installationId;
  }
}
