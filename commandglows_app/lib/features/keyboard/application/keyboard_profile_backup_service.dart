import 'dart:convert';

import '../domain/keyboard_sync_models.dart';

class KeyboardProfileBackupException implements Exception {
  const KeyboardProfileBackupException(this.message);

  final String message;

  @override
  String toString() => 'KeyboardProfileBackupException: $message';
}

class KeyboardProfileBackupExport {
  const KeyboardProfileBackupExport({
    required this.profile,
    required this.payload,
  });

  final KeyboardSyncProfile profile;
  final Map<String, Object?> payload;

  String toJson({bool pretty = true}) {
    if (pretty) {
      return const JsonEncoder.withIndent('  ').convert(payload);
    }
    return jsonEncode(payload);
  }
}

class KeyboardProfileImportPreview {
  const KeyboardProfileImportPreview({
    required this.profile,
    required this.payloadBytes,
    required this.changedSections,
  });

  final KeyboardSyncProfile profile;
  final int payloadBytes;
  final List<String> changedSections;
}

typedef KeyboardProfileLocalExport = Future<KeyboardSyncProfile?> Function();
typedef KeyboardProfileLocalApply =
    Future<void> Function(KeyboardSyncProfile profile);

class KeyboardProfileBackupService {
  KeyboardProfileBackupService({
    required KeyboardProfileLocalExport exportLocalProfile,
    required KeyboardProfileLocalApply applyLocalProfile,
    DateTime Function()? clock,
  }) : _exportLocalProfile = exportLocalProfile,
       _applyLocalProfile = applyLocalProfile,
       _clock = clock ?? DateTime.now;

  static const int backupVersion = 1;

  final KeyboardProfileLocalExport _exportLocalProfile;
  final KeyboardProfileLocalApply _applyLocalProfile;
  final DateTime Function() _clock;

  Future<KeyboardProfileBackupExport> exportBackup() async {
    final profile = await _exportLocalProfile();
    if (profile == null) {
      throw const KeyboardProfileBackupException(
        'Le profil clavier local est indisponible.',
      );
    }
    final validation = profile.validate();
    if (!validation.isValid) {
      throw KeyboardProfileBackupException(
        'Le profil clavier local est invalide (${validation.verdict.name}).',
      );
    }
    final payload = <String, Object?>{
      'backupVersion': backupVersion,
      'createdAtUtc': _clock().toUtc().toIso8601String(),
      'manifest': {
        'schemaVersion': profile.schemaVersion,
        'profileRevision': profile.profileRevision,
        'baseCloudRevision': profile.baseCloudRevision,
        'sanitizationPolicy': profile.sanitizationPolicy,
        'sourcePlatform': profile.sourcePlatform,
      },
      'profile': profile.toMap(),
    };
    return KeyboardProfileBackupExport(profile: profile, payload: payload);
  }

  Future<KeyboardProfileImportPreview> previewImport(String rawJson) async {
    if (rawJson.trim().isEmpty) {
      throw const KeyboardProfileBackupException('Le JSON importé est vide.');
    }
    final decoded = _decodeJsonMap(rawJson);
    final profile = _extractProfile(decoded);
    final validation = profile.validate();
    if (!validation.isValid) {
      throw KeyboardProfileBackupException(
        'Le profil importé est invalide (${validation.verdict.name}).',
      );
    }

    final localProfile = await _exportLocalProfile();
    final changedSections = _changedSections(
      localPayload: localProfile?.payload,
      incomingPayload: profile.payload,
    );
    return KeyboardProfileImportPreview(
      profile: profile,
      payloadBytes: utf8.encode(jsonEncode(profile.toMap())).length,
      changedSections: changedSections,
    );
  }

  Future<void> applyImport(KeyboardProfileImportPreview preview) {
    return _applyLocalProfile(preview.profile);
  }

  Map<String, Object?> _decodeJsonMap(String rawJson) {
    try {
      final decoded = jsonDecode(rawJson);
      if (decoded is! Map) {
        throw const KeyboardProfileBackupException(
          'Le JSON importé doit être un objet.',
        );
      }
      return Map<String, Object?>.from(decoded);
    } on KeyboardProfileBackupException {
      rethrow;
    } catch (_) {
      throw const KeyboardProfileBackupException('JSON invalide.');
    }
  }

  KeyboardSyncProfile _extractProfile(Map<String, Object?> decoded) {
    final version = decoded['backupVersion'];
    if (version != null && version != backupVersion) {
      throw const KeyboardProfileBackupException(
        'Version de sauvegarde non prise en charge.',
      );
    }
    final profileRaw = decoded['profile'];
    if (profileRaw is Map) {
      return KeyboardSyncProfile.fromMap(Map<String, Object?>.from(profileRaw));
    }
    return KeyboardSyncProfile.fromMap(decoded);
  }

  static List<String> _changedSections({
    required Map<String, Object?>? localPayload,
    required Map<String, Object?> incomingPayload,
  }) {
    final local = localPayload ?? const <String, Object?>{};
    final keys = <String>{...local.keys, ...incomingPayload.keys};
    final changed = <String>[];
    for (final key in keys) {
      if (!_deepEquals(local[key], incomingPayload[key])) {
        changed.add(key);
      }
    }
    changed.sort();
    return changed;
  }

  static bool _deepEquals(Object? a, Object? b) {
    if (a == b) {
      return true;
    }
    if (a is Map && b is Map) {
      if (a.length != b.length) {
        return false;
      }
      for (final key in a.keys) {
        if (!b.containsKey(key) || !_deepEquals(a[key], b[key])) {
          return false;
        }
      }
      return true;
    }
    if (a is List && b is List) {
      if (a.length != b.length) {
        return false;
      }
      for (var i = 0; i < a.length; i++) {
        if (!_deepEquals(a[i], b[i])) {
          return false;
        }
      }
      return true;
    }
    return false;
  }
}
