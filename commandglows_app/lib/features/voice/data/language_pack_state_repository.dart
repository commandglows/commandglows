import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../domain/language_pack_catalog.dart';

class LanguagePackCatalogLocalState {
  const LanguagePackCatalogLocalState({
    this.installedPacks = const <String, InstalledLanguagePack>{},
    this.retryCounts = const <String, int>{},
    this.allowCloudFallback = false,
  });

  final Map<String, InstalledLanguagePack> installedPacks;
  final Map<String, int> retryCounts;
  final bool allowCloudFallback;

  factory LanguagePackCatalogLocalState.fromMap(Map<Object?, Object?> map) {
    final installedRaw = map['installed_packs'];
    final retryRaw = map['retry_counts'];
    final allowCloudFallback = map['allow_cloud_fallback'];

    return LanguagePackCatalogLocalState(
      installedPacks: installedRaw is Map
          ? installedRaw.map((key, value) {
              if (key is! String || value is! Map) {
                throw const CatalogValidationException(
                  'language_pack_state_invalid',
                  'Persisted installed pack state is malformed.',
                );
              }
              return MapEntry(
                key,
                InstalledLanguagePack.fromMap(value.cast<Object?, Object?>()),
              );
            })
          : const <String, InstalledLanguagePack>{},
      retryCounts: retryRaw is Map
          ? retryRaw.map((key, value) {
              if (key is! String || value is! num || value < 0) {
                throw const CatalogValidationException(
                  'language_pack_state_invalid',
                  'Persisted retry counts are malformed.',
                );
              }
              return MapEntry(key, value.toInt());
            })
          : const <String, int>{},
      allowCloudFallback: allowCloudFallback is bool
          ? allowCloudFallback
          : false,
    );
  }

  Map<String, Object?> toMap() => {
    'schema_version': 1,
    'installed_packs': installedPacks.map(
      (key, value) => MapEntry(key, value.toMap()),
    ),
    'retry_counts': retryCounts,
    'allow_cloud_fallback': allowCloudFallback,
  };
}

abstract class LanguagePackCatalogStateRepository {
  Future<LanguagePackCatalogLocalState> read();

  Future<void> write(LanguagePackCatalogLocalState state);
}

class InMemoryLanguagePackCatalogStateRepository
    implements LanguagePackCatalogStateRepository {
  LanguagePackCatalogLocalState _state = const LanguagePackCatalogLocalState();

  @override
  Future<LanguagePackCatalogLocalState> read() async {
    return LanguagePackCatalogLocalState(
      installedPacks: Map<String, InstalledLanguagePack>.of(
        _state.installedPacks,
      ),
      retryCounts: Map<String, int>.of(_state.retryCounts),
      allowCloudFallback: _state.allowCloudFallback,
    );
  }

  @override
  Future<void> write(LanguagePackCatalogLocalState state) async {
    _state = LanguagePackCatalogLocalState(
      installedPacks: Map<String, InstalledLanguagePack>.of(
        state.installedPacks,
      ),
      retryCounts: Map<String, int>.of(state.retryCounts),
      allowCloudFallback: state.allowCloudFallback,
    );
  }
}

class SecureStorageLanguagePackCatalogStateRepository
    implements LanguagePackCatalogStateRepository {
  SecureStorageLanguagePackCatalogStateRepository({
    FlutterSecureStorage? storage,
  }) : _storage = storage ?? const FlutterSecureStorage();

  static const _stateKey = 'voice_language_pack_catalog_state_v1';

  final FlutterSecureStorage _storage;

  @override
  Future<LanguagePackCatalogLocalState> read() async {
    try {
      final raw = await _storage.read(key: _stateKey);
      if (raw == null || raw.trim().isEmpty) {
        return const LanguagePackCatalogLocalState();
      }
      final decoded = jsonDecode(raw);
      if (decoded is! Map) {
        return const LanguagePackCatalogLocalState();
      }
      return LanguagePackCatalogLocalState.fromMap(
        decoded.cast<Object?, Object?>(),
      );
    } catch (_) {
      return const LanguagePackCatalogLocalState();
    }
  }

  @override
  Future<void> write(LanguagePackCatalogLocalState state) async {
    try {
      await _storage.write(key: _stateKey, value: jsonEncode(state.toMap()));
    } catch (_) {
      // Pack state persistence must never make Settings or the keyboard crash.
      // The in-memory provider state remains the current session source.
    }
  }
}
