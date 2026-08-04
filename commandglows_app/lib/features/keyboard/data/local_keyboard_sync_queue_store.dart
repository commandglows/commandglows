import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../domain/keyboard_sync_models.dart';

enum KeyboardSyncQueueEntryState { pending, failed }

class KeyboardSyncThemeAssetUploadRequest {
  const KeyboardSyncThemeAssetUploadRequest({
    required this.localFilePath,
    required this.assetId,
    required this.mimeType,
    this.width,
    this.height,
  });

  final String localFilePath;
  final String assetId;
  final String mimeType;
  final int? width;
  final int? height;

  Map<String, Object?> toMap() {
    return <String, Object?>{
      'localFilePath': localFilePath,
      'assetId': assetId,
      'mimeType': mimeType,
      if (width != null) 'width': width,
      if (height != null) 'height': height,
    };
  }

  static KeyboardSyncThemeAssetUploadRequest? fromMap(Object? raw) {
    if (raw is! Map) {
      return null;
    }
    final localFilePath = raw['localFilePath'];
    final assetId = raw['assetId'];
    final mimeType = raw['mimeType'];
    if (localFilePath is! String ||
        localFilePath.trim().isEmpty ||
        assetId is! String ||
        assetId.trim().isEmpty ||
        mimeType is! String ||
        mimeType.trim().isEmpty) {
      return null;
    }
    return KeyboardSyncThemeAssetUploadRequest(
      localFilePath: localFilePath.trim(),
      assetId: assetId.trim(),
      mimeType: mimeType.trim(),
      width: (raw['width'] as num?)?.toInt(),
      height: (raw['height'] as num?)?.toInt(),
    );
  }
}

class KeyboardSyncQueueEntry {
  const KeyboardSyncQueueEntry({
    required this.operationKey,
    required this.targetFirebaseUid,
    required this.targetGlobalUserId,
    required this.profile,
    required this.baseCloudRevision,
    required this.attempts,
    required this.retryAfterUtc,
    required this.state,
    required this.createdAtUtc,
    required this.updatedAtUtc,
    this.lastErrorCode,
    this.lastErrorMessage,
    this.themeAssetUpload,
  });

  final String operationKey;
  final String targetFirebaseUid;
  final String targetGlobalUserId;
  final KeyboardSyncProfile profile;
  final int baseCloudRevision;
  final int attempts;
  final DateTime retryAfterUtc;
  final KeyboardSyncQueueEntryState state;
  final DateTime createdAtUtc;
  final DateTime updatedAtUtc;
  final String? lastErrorCode;
  final String? lastErrorMessage;
  final KeyboardSyncThemeAssetUploadRequest? themeAssetUpload;

  bool isFlushReady(DateTime now) => !retryAfterUtc.isAfter(now.toUtc());

  KeyboardSyncQueueEntry copyWith({
    String? operationKey,
    String? targetFirebaseUid,
    String? targetGlobalUserId,
    KeyboardSyncProfile? profile,
    int? baseCloudRevision,
    int? attempts,
    DateTime? retryAfterUtc,
    KeyboardSyncQueueEntryState? state,
    DateTime? createdAtUtc,
    DateTime? updatedAtUtc,
    String? lastErrorCode,
    String? lastErrorMessage,
    KeyboardSyncThemeAssetUploadRequest? themeAssetUpload,
  }) {
    return KeyboardSyncQueueEntry(
      operationKey: operationKey ?? this.operationKey,
      targetFirebaseUid: targetFirebaseUid ?? this.targetFirebaseUid,
      targetGlobalUserId: targetGlobalUserId ?? this.targetGlobalUserId,
      profile: profile ?? this.profile,
      baseCloudRevision: baseCloudRevision ?? this.baseCloudRevision,
      attempts: attempts ?? this.attempts,
      retryAfterUtc: retryAfterUtc ?? this.retryAfterUtc,
      state: state ?? this.state,
      createdAtUtc: createdAtUtc ?? this.createdAtUtc,
      updatedAtUtc: updatedAtUtc ?? this.updatedAtUtc,
      lastErrorCode: lastErrorCode,
      lastErrorMessage: lastErrorMessage,
      themeAssetUpload: themeAssetUpload ?? this.themeAssetUpload,
    );
  }

  Map<String, Object?> toMap() {
    return {
      'operationKey': operationKey,
      'targetFirebaseUid': targetFirebaseUid,
      'targetGlobalUserId': targetGlobalUserId,
      'profile': profile.toMap(),
      'baseCloudRevision': baseCloudRevision,
      'attempts': attempts,
      'retryAfterUtc': retryAfterUtc.toUtc().toIso8601String(),
      'state': state.name,
      'createdAtUtc': createdAtUtc.toUtc().toIso8601String(),
      'updatedAtUtc': updatedAtUtc.toUtc().toIso8601String(),
      'lastErrorCode': lastErrorCode,
      'lastErrorMessage': lastErrorMessage,
      if (themeAssetUpload != null) 'themeAssetUpload': themeAssetUpload!.toMap(),
    };
  }

  static KeyboardSyncQueueEntry? fromMap(Map<Object?, Object?> raw) {
    final operationKey = raw['operationKey'];
    final targetFirebaseUid = raw['targetFirebaseUid'];
    final targetGlobalUserId = raw['targetGlobalUserId'];
    final profileRaw = raw['profile'];
    final stateRaw = raw['state'];
    if (operationKey is! String ||
        operationKey.trim().isEmpty ||
        targetFirebaseUid is! String ||
        targetFirebaseUid.trim().isEmpty ||
        targetGlobalUserId is! String ||
        targetGlobalUserId.trim().isEmpty ||
        profileRaw is! Map ||
        stateRaw is! String) {
      return null;
    }

    final profile = KeyboardSyncProfile.fromMap(
      Map<String, Object?>.from(profileRaw),
    );
    if (!profile.validate().isValid) {
      return null;
    }

    final state = KeyboardSyncQueueEntryState.values.firstWhere(
      (value) => value.name == stateRaw,
      orElse: () => KeyboardSyncQueueEntryState.failed,
    );
    final baseCloudRevision = _intOrZero(raw['baseCloudRevision']);
    final attempts = _intOrZero(raw['attempts']);
    final retryAfter = _dateOrEpoch(raw['retryAfterUtc']);
    final createdAt = _dateOrEpoch(raw['createdAtUtc']);
    final updatedAt = _dateOrEpoch(raw['updatedAtUtc']);

    return KeyboardSyncQueueEntry(
      operationKey: operationKey.trim(),
      targetFirebaseUid: targetFirebaseUid.trim(),
      targetGlobalUserId: targetGlobalUserId.trim(),
      profile: profile,
      baseCloudRevision: baseCloudRevision < 0 ? 0 : baseCloudRevision,
      attempts: attempts < 0 ? 0 : attempts,
      retryAfterUtc: retryAfter,
      state: state,
      createdAtUtc: createdAt,
      updatedAtUtc: updatedAt,
      lastErrorCode: _normalizedString(raw['lastErrorCode']),
      lastErrorMessage: _normalizedString(raw['lastErrorMessage']),
      themeAssetUpload: KeyboardSyncThemeAssetUploadRequest.fromMap(
        raw['themeAssetUpload'],
      ),
    );
  }

  static int _intOrZero(Object? value) {
    if (value is int) {
      return value;
    }
    if (value is num) {
      return value.toInt();
    }
    return 0;
  }

  static DateTime _dateOrEpoch(Object? value) {
    if (value is String) {
      final parsed = DateTime.tryParse(value);
      if (parsed != null) {
        return parsed.toUtc();
      }
    }
    return DateTime.fromMillisecondsSinceEpoch(0, isUtc: true);
  }

  static String? _normalizedString(Object? value) {
    if (value is! String) {
      return null;
    }
    final normalized = value.trim();
    return normalized.isEmpty ? null : normalized;
  }
}

abstract class KeyboardSyncQueuePersistence {
  Future<String?> read();
  Future<void> write(String value);
  Future<void> clear();
}

class SecureKeyboardSyncQueuePersistence
    implements KeyboardSyncQueuePersistence {
  const SecureKeyboardSyncQueuePersistence({
    FlutterSecureStorage storage = const FlutterSecureStorage(),
    String storageKey = _defaultStorageKey,
  }) : _storage = storage,
       _storageKey = storageKey;

  static const _defaultStorageKey = 'keyboard_sync_queue_v1';

  final FlutterSecureStorage _storage;
  final String _storageKey;

  @override
  Future<String?> read() => _storage.read(key: _storageKey);

  @override
  Future<void> write(String value) =>
      _storage.write(key: _storageKey, value: value);

  @override
  Future<void> clear() => _storage.delete(key: _storageKey);
}

class LocalKeyboardSyncQueueStore {
  LocalKeyboardSyncQueueStore({
    KeyboardSyncQueuePersistence persistence =
        const SecureKeyboardSyncQueuePersistence(),
    DateTime Function()? clock,
  }) : _persistence = persistence,
       _clock = clock ?? DateTime.now;

  final KeyboardSyncQueuePersistence _persistence;
  final DateTime Function() _clock;
  List<KeyboardSyncQueueEntry>? _cache;

  Future<List<KeyboardSyncQueueEntry>> listAll() async {
    final values = await _load();
    return List<KeyboardSyncQueueEntry>.unmodifiable(values);
  }

  Future<void> upsert(KeyboardSyncQueueEntry entry) async {
    final values = await _load();
    final index = values.indexWhere(
      (row) => row.operationKey == entry.operationKey,
    );
    if (index >= 0) {
      values[index] = entry.copyWith(updatedAtUtc: _clock().toUtc());
    } else {
      values.add(entry);
    }
    await _persist(values);
  }

  Future<void> removeByOperationKey(String operationKey) async {
    final values = await _load();
    values.removeWhere((entry) => entry.operationKey == operationKey);
    await _persist(values);
  }

  Future<void> replaceAll(List<KeyboardSyncQueueEntry> entries) async {
    await _persist(entries);
  }

  Future<void> purgeForAccount({
    required String firebaseUid,
    required String globalUserId,
  }) async {
    final values = await _load();
    values.removeWhere(
      (entry) =>
          entry.targetFirebaseUid != firebaseUid ||
          entry.targetGlobalUserId != globalUserId,
    );
    await _persist(values);
  }

  Future<void> clear() async {
    _cache = <KeyboardSyncQueueEntry>[];
    try {
      await _persistence.clear();
    } catch (_) {
      // Queue persistence is best-effort; in-memory behavior remains valid.
    }
  }

  Future<List<KeyboardSyncQueueEntry>> _load() async {
    final cached = _cache;
    if (cached != null) {
      return cached;
    }
    late final String? raw;
    try {
      raw = await _persistence.read();
    } catch (_) {
      return _cache = <KeyboardSyncQueueEntry>[];
    }
    if (raw == null || raw.trim().isEmpty) {
      return _cache = <KeyboardSyncQueueEntry>[];
    }
    try {
      final decoded = jsonDecode(raw);
      if (decoded is! Map<String, Object?>) {
        throw const FormatException('Invalid keyboard sync queue payload.');
      }
      final entriesRaw = decoded['entries'];
      if (entriesRaw is! List) {
        return _cache = <KeyboardSyncQueueEntry>[];
      }
      final entries = entriesRaw
          .whereType<Map<Object?, Object?>>()
          .map(KeyboardSyncQueueEntry.fromMap)
          .whereType<KeyboardSyncQueueEntry>()
          .toList(growable: true);
      return _cache = entries;
    } catch (_) {
      await clear();
      return _cache = <KeyboardSyncQueueEntry>[];
    }
  }

  Future<void> _persist(List<KeyboardSyncQueueEntry> values) async {
    final payload = jsonEncode({
      'version': 1,
      'savedAtUtc': _clock().toUtc().toIso8601String(),
      'entries': values.map((entry) => entry.toMap()).toList(growable: false),
    });
    _cache = List<KeyboardSyncQueueEntry>.from(values);
    try {
      await _persistence.write(payload);
    } catch (_) {
      // Queue persistence is best-effort; runtime queue can still operate.
    }
  }
}
