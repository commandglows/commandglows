import 'package:flutter/material.dart';

import '../../clipboard/data/firebase_clipboard_history_store.dart';
import '../../clipboard/data/persistent_clipboard_history_store.dart';
import '../../clipboard/domain/clipboard_capture_event.dart';
import '../../clipboard/domain/clipboard_normalizer.dart';
import '../../dictionary/data/firebase_dictionary_store.dart';
import '../../dictionary/data/in_memory_dictionary_store.dart';
import '../../settings/data/firebase_settings_store.dart';
import '../../settings/data/local_settings_store.dart';
import '../../settings/domain/settings_store.dart';
import '../../settings/domain/user_retention_policy.dart';
import '../../snippets/data/firebase_snippet_store.dart';
import '../../snippets/data/in_memory_snippet_store.dart';
import '../../voice/data/firebase_transcription_store.dart';
import '../../voice/data/in_memory_transcription_store.dart';
import 'local_cloud_sync_controller.dart';
import '../domain/local_cloud_sync_models.dart';

abstract class LocalCloudSyncDomainAdapter {
  LocalCloudSyncDomain get domain;

  bool get supportsPromotion;

  Future<LocalCloudDomainSnapshot> readLocalSnapshot();

  Future<LocalCloudDomainSnapshot> readCloudSnapshot();

  Future<void> upsertLocalRecords(List<Map<String, Object?>> records);

  Future<void> upsertCloudRecords(List<Map<String, Object?>> records);

  Future<void> deleteCloudByKeys(Set<String> keys);

  bool recordsEquivalent(
    Map<String, Object?> local,
    Map<String, Object?> cloud,
  );
}

class LocalCloudSyncControllerAdapterBridge
    implements LocalCloudSyncControllerAdapter {
  const LocalCloudSyncControllerAdapterBridge(this.adapter);

  final LocalCloudSyncDomainAdapter adapter;

  @override
  LocalCloudSyncDomain get domain => adapter.domain;

  @override
  Future<LocalCloudDomainSnapshot> loadLocalSnapshot() {
    return adapter.readLocalSnapshot();
  }

  @override
  Future<LocalCloudDomainSnapshot> loadCloudSnapshot() {
    return adapter.readCloudSnapshot();
  }

  @override
  Future<void> seedCloudFromLocal(LocalCloudDomainSnapshot local) async {
    await adapter.upsertCloudRecords(local.items);
    await adapter.deleteCloudByKeys(local.deletedKeys);
  }

  @override
  Future<void> hydrateLocalFromCloud(LocalCloudDomainSnapshot cloud) {
    return adapter.upsertLocalRecords(cloud.items);
  }

  @override
  Future<void> mergeLocalIntoCloud({
    required LocalCloudDomainSnapshot local,
    required LocalCloudDomainSnapshot cloud,
    required List<Map<String, Object?>> mergedItems,
  }) async {
    await adapter.upsertCloudRecords(mergedItems);
    await adapter.upsertLocalRecords(mergedItems);
    await adapter.deleteCloudByKeys(local.deletedKeys);
  }
}

class ClipboardSyncAdapter implements LocalCloudSyncDomainAdapter {
  ClipboardSyncAdapter({
    required PersistentClipboardHistoryStore localStore,
    required FirebaseClipboardHistoryStore cloudStore,
  }) : _localStore = localStore,
       _cloudStore = cloudStore;

  final PersistentClipboardHistoryStore _localStore;
  final FirebaseClipboardHistoryStore _cloudStore;

  @override
  LocalCloudSyncDomain get domain => LocalCloudSyncDomain.clipboard;

  @override
  bool get supportsPromotion => true;

  @override
  Future<LocalCloudDomainSnapshot> readLocalSnapshot() async {
    final items = await _localStore.snapshot(includeDeleted: true);
    final records = <Map<String, Object?>>[];
    final deleted = <String>{};
    for (final item in items.take(200)) {
      final metadata = item.sourceMetadata;
      final cloudId = (metadata['cloudId'] as String?)?.trim();
      final key = cloudId?.isNotEmpty == true
          ? 'cloud:$cloudId'
          : 'hash:${item.normalizedHash ?? sha256Hex(normalizeClipboardText(item.content))}:${item.source}';
      if (item.deletedAt != null) {
        deleted.add(key);
      }
      if (item.deletedAt != null ||
          isLikelySensitiveClipboardContent(item.content)) {
        continue;
      }
      records.add({
        'key': key,
        'content': item.content,
        'source': item.source,
        'originDeviceId': item.originDeviceId,
        'capturedAt': item.capturedAt.toUtc().toIso8601String(),
        'cloudId': cloudId,
      });
    }
    return LocalCloudDomainSnapshot(
      domain: domain,
      supportsPromotion: true,
      items: records,
      checksum: LocalCloudDomainSnapshot.checksumFor(records),
      deletedKeys: deleted,
    );
  }

  @override
  Future<LocalCloudDomainSnapshot> readCloudSnapshot() async {
    final items = await _cloudStore.list();
    final records = items
        .map(
          (item) => <String, Object?>{
            'key': 'cloud:${item.id}',
            'cloudId': item.id,
            'content': item.content,
            'source': item.source,
            'originDeviceId': item.originDeviceId,
            'capturedAt': item.capturedAt.toUtc().toIso8601String(),
          },
        )
        .toList(growable: false);
    return LocalCloudDomainSnapshot(
      domain: domain,
      supportsPromotion: true,
      items: records,
      checksum: LocalCloudDomainSnapshot.checksumFor(records),
    );
  }

  @override
  Future<void> upsertLocalRecords(List<Map<String, Object?>> records) async {
    if (records.isEmpty) {
      return;
    }
    final existing = await _localStore.list();
    final existingKeys = existing
        .map(
          (item) =>
              'hash:${item.normalizedHash ?? sha256Hex(normalizeClipboardText(item.content))}:${item.source}',
        )
        .toSet();
    for (final record in records) {
      final content = (record['content'] ?? '').toString().trim();
      if (content.isEmpty) {
        continue;
      }
      final source = ClipboardCanonicalSource.fromDatabase(
        record['source'] as String?,
      );
      final key = (record['key'] ?? '').toString().trim().isNotEmpty
          ? (record['key'] ?? '').toString().trim()
          : 'hash:${sha256Hex(normalizeClipboardText(content))}:${source.databaseValue}';
      if (existingKeys.contains(key)) {
        continue;
      }
      final capturedAt = DateTime.tryParse(
        (record['capturedAt'] ?? '').toString(),
      );
      await _localStore.insert(
        content: content,
        source: source,
        originDeviceId: (record['originDeviceId'] as String?)?.trim(),
        syncState: ClipboardSyncState.synced,
        capturedAtUtc: capturedAt?.toUtc(),
        sourceMetadata: {
          if (record['cloudId'] != null) 'cloudId': record['cloudId'],
        },
        sensitiveConfirmed: true,
      );
    }
  }

  @override
  Future<void> upsertCloudRecords(List<Map<String, Object?>> records) async {
    for (final record in records) {
      final content = (record['content'] ?? '').toString().trim();
      if (content.isEmpty) {
        continue;
      }
      final cloudId = (record['cloudId'] as String?)?.trim();
      if (cloudId != null && cloudId.isNotEmpty) {
        continue;
      }
      await _cloudStore.insert(
        content: content,
        source: ClipboardCanonicalSource.fromDatabase(
          record['source'] as String?,
        ),
        originDeviceId: (record['originDeviceId'] as String?)?.trim(),
        syncState: ClipboardSyncState.synced,
        capturedAtUtc: DateTime.tryParse(
          (record['capturedAt'] ?? '').toString(),
        )?.toUtc(),
        sensitiveConfirmed: true,
      );
    }
  }

  @override
  Future<void> deleteCloudByKeys(Set<String> keys) async {
    for (final key in keys) {
      if (!key.startsWith('cloud:')) {
        continue;
      }
      final cloudId = key.substring('cloud:'.length);
      if (cloudId.isEmpty) {
        continue;
      }
      await _cloudStore.softDelete(cloudId);
    }
  }

  @override
  bool recordsEquivalent(
    Map<String, Object?> local,
    Map<String, Object?> cloud,
  ) {
    return (local['content'] ?? '').toString().trim() ==
            (cloud['content'] ?? '').toString().trim() &&
        (local['source'] ?? '').toString().trim() ==
            (cloud['source'] ?? '').toString().trim();
  }
}

class SnippetSyncAdapter implements LocalCloudSyncDomainAdapter {
  SnippetSyncAdapter({
    required InMemorySnippetStore localStore,
    required FirebaseSnippetStore cloudStore,
  }) : _localStore = localStore,
       _cloudStore = cloudStore;

  final InMemorySnippetStore _localStore;
  final FirebaseSnippetStore _cloudStore;

  @override
  LocalCloudSyncDomain get domain => LocalCloudSyncDomain.snippets;

  @override
  bool get supportsPromotion => true;

  @override
  Future<LocalCloudDomainSnapshot> readLocalSnapshot() async {
    final records = (await _localStore.list())
        .map(
          (item) => <String, Object?>{
            'key': item.trigger.trim().toLowerCase(),
            'trigger': item.trigger.trim(),
            'content': item.content.trim(),
            'label': item.label?.trim(),
          },
        )
        .toList(growable: false);
    return LocalCloudDomainSnapshot(
      domain: domain,
      supportsPromotion: true,
      items: records,
      checksum: LocalCloudDomainSnapshot.checksumFor(records),
    );
  }

  @override
  Future<LocalCloudDomainSnapshot> readCloudSnapshot() async {
    final records = (await _cloudStore.list())
        .map(
          (item) => <String, Object?>{
            'key': item.trigger.trim().toLowerCase(),
            'trigger': item.trigger.trim(),
            'content': item.content.trim(),
            'label': item.label?.trim(),
          },
        )
        .toList(growable: false);
    return LocalCloudDomainSnapshot(
      domain: domain,
      supportsPromotion: true,
      items: records,
      checksum: LocalCloudDomainSnapshot.checksumFor(records),
    );
  }

  @override
  Future<void> upsertLocalRecords(List<Map<String, Object?>> records) async {
    for (final record in records) {
      final trigger = (record['trigger'] ?? '').toString().trim();
      final content = (record['content'] ?? '').toString().trim();
      if (trigger.isEmpty || content.isEmpty) {
        continue;
      }
      await _localStore.insert(
        trigger: trigger,
        content: content,
        label: (record['label'] as String?)?.trim(),
      );
    }
  }

  @override
  Future<void> upsertCloudRecords(List<Map<String, Object?>> records) async {
    for (final record in records) {
      final trigger = (record['trigger'] ?? '').toString().trim();
      final content = (record['content'] ?? '').toString().trim();
      if (trigger.isEmpty || content.isEmpty) {
        continue;
      }
      await _cloudStore.insert(
        trigger: trigger,
        content: content,
        label: (record['label'] as String?)?.trim(),
      );
    }
  }

  @override
  Future<void> deleteCloudByKeys(Set<String> keys) async {}

  @override
  bool recordsEquivalent(
    Map<String, Object?> local,
    Map<String, Object?> cloud,
  ) {
    return (local['trigger'] ?? '').toString().trim().toLowerCase() ==
            (cloud['trigger'] ?? '').toString().trim().toLowerCase() &&
        (local['content'] ?? '').toString().trim() ==
            (cloud['content'] ?? '').toString().trim() &&
        (local['label'] ?? '').toString().trim() ==
            (cloud['label'] ?? '').toString().trim();
  }
}

class DictionarySyncAdapter implements LocalCloudSyncDomainAdapter {
  DictionarySyncAdapter({
    required InMemoryDictionaryStore localStore,
    required FirebaseDictionaryStore cloudStore,
  }) : _localStore = localStore,
       _cloudStore = cloudStore;

  final InMemoryDictionaryStore _localStore;
  final FirebaseDictionaryStore _cloudStore;

  @override
  LocalCloudSyncDomain get domain => LocalCloudSyncDomain.dictionary;

  @override
  bool get supportsPromotion => true;

  @override
  Future<LocalCloudDomainSnapshot> readLocalSnapshot() async {
    final records = (await _localStore.list())
        .map(
          (item) => <String, Object?>{
            'key': '${item.term.trim().toLowerCase()}|${item.caseSensitive}',
            'term': item.term.trim(),
            'replacement': item.replacement.trim(),
            'caseSensitive': item.caseSensitive,
          },
        )
        .toList(growable: false);
    return LocalCloudDomainSnapshot(
      domain: domain,
      supportsPromotion: true,
      items: records,
      checksum: LocalCloudDomainSnapshot.checksumFor(records),
    );
  }

  @override
  Future<LocalCloudDomainSnapshot> readCloudSnapshot() async {
    final records = (await _cloudStore.list())
        .map(
          (item) => <String, Object?>{
            'key': '${item.term.trim().toLowerCase()}|${item.caseSensitive}',
            'term': item.term.trim(),
            'replacement': item.replacement.trim(),
            'caseSensitive': item.caseSensitive,
          },
        )
        .toList(growable: false);
    return LocalCloudDomainSnapshot(
      domain: domain,
      supportsPromotion: true,
      items: records,
      checksum: LocalCloudDomainSnapshot.checksumFor(records),
    );
  }

  @override
  Future<void> upsertLocalRecords(List<Map<String, Object?>> records) async {
    for (final record in records) {
      final term = (record['term'] ?? '').toString().trim();
      final replacement = (record['replacement'] ?? '').toString().trim();
      if (term.isEmpty || replacement.isEmpty) {
        continue;
      }
      await _localStore.insert(
        term: term,
        replacement: replacement,
        caseSensitive: record['caseSensitive'] == true,
      );
    }
  }

  @override
  Future<void> upsertCloudRecords(List<Map<String, Object?>> records) async {
    for (final record in records) {
      final term = (record['term'] ?? '').toString().trim();
      final replacement = (record['replacement'] ?? '').toString().trim();
      if (term.isEmpty || replacement.isEmpty) {
        continue;
      }
      await _cloudStore.insert(
        term: term,
        replacement: replacement,
        caseSensitive: record['caseSensitive'] == true,
      );
    }
  }

  @override
  Future<void> deleteCloudByKeys(Set<String> keys) async {}

  @override
  bool recordsEquivalent(
    Map<String, Object?> local,
    Map<String, Object?> cloud,
  ) {
    return (local['term'] ?? '').toString().trim().toLowerCase() ==
            (cloud['term'] ?? '').toString().trim().toLowerCase() &&
        (local['replacement'] ?? '').toString().trim() ==
            (cloud['replacement'] ?? '').toString().trim() &&
        (local['caseSensitive'] == true) == (cloud['caseSensitive'] == true);
  }
}

class SettingsSyncAdapter implements LocalCloudSyncDomainAdapter {
  SettingsSyncAdapter({
    required LocalSettingsStore localStore,
    required FirebaseSettingsStore cloudStore,
  }) : _localStore = localStore,
       _cloudStore = cloudStore;

  final LocalSettingsStore _localStore;
  final FirebaseSettingsStore _cloudStore;

  @override
  LocalCloudSyncDomain get domain => LocalCloudSyncDomain.settings;

  @override
  bool get supportsPromotion => true;

  @override
  Future<LocalCloudDomainSnapshot> readLocalSnapshot() async {
    final settings = await _localStore.load();
    final record = _recordFromSettings(settings);
    return LocalCloudDomainSnapshot(
      domain: domain,
      supportsPromotion: true,
      items: [record],
      checksum: LocalCloudDomainSnapshot.checksumFor([record]),
    );
  }

  @override
  Future<LocalCloudDomainSnapshot> readCloudSnapshot() async {
    final settings = await _cloudStore.load();
    final record = _recordFromSettings(settings);
    return LocalCloudDomainSnapshot(
      domain: domain,
      supportsPromotion: true,
      items: [record],
      checksum: LocalCloudDomainSnapshot.checksumFor([record]),
    );
  }

  @override
  Future<void> upsertLocalRecords(List<Map<String, Object?>> records) async {
    if (records.isEmpty) {
      return;
    }
    final current = await _localStore.load();
    await _localStore.save(
      _settingsFromRecord(records.first, fallback: current),
    );
  }

  @override
  Future<void> upsertCloudRecords(List<Map<String, Object?>> records) async {
    if (records.isEmpty) {
      return;
    }
    final current = await _cloudStore.load();
    await _cloudStore.save(
      _settingsFromRecord(records.first, fallback: current),
    );
  }

  @override
  Future<void> deleteCloudByKeys(Set<String> keys) async {}

  @override
  bool recordsEquivalent(
    Map<String, Object?> local,
    Map<String, Object?> cloud,
  ) {
    return local.toString() == cloud.toString();
  }

  static Map<String, Object?> _recordFromSettings(
    UserSettingsSnapshot settings,
  ) {
    return {
      'key': 'settings:profile',
      'themeMode': settings.themeMode.name,
      'retentionPolicy': settings.retentionPolicy.value,
      'clipboardAutoSync': settings.clipboardAutoSync,
      'transcriptionSync': settings.transcriptionSync,
      'customActionBarEnabled': settings.customActionBarEnabled,
      'confirmDestructiveActions': settings.confirmDestructiveActions,
      'onboardingCompleted': settings.onboardingCompleted,
      'onboardingCurrentStep': settings.onboardingCurrentStep,
      'onboardingClipboardSkipped': settings.onboardingClipboardSkipped,
      'onboardingAccessibilitySkipped': settings.onboardingAccessibilitySkipped,
      'onboardingMicrophoneSkipped': settings.onboardingMicrophoneSkipped,
      'onboardingMediaAccessSkipped': settings.onboardingMediaAccessSkipped,
      'onboardingBrightnessSkipped': settings.onboardingBrightnessSkipped,
      'onboardingOverlaySkipped': settings.onboardingOverlaySkipped,
      'localSpeechNoticeDismissedForever':
          settings.localSpeechNoticeDismissedForever,
      'overlayNoticeDismissedForever': settings.overlayNoticeDismissedForever,
      'onboardingNoticeDismissedForever':
          settings.onboardingNoticeDismissedForever,
      'onboardingLastSeenAt': settings.onboardingLastSeenAt
          ?.toUtc()
          .toIso8601String(),
    };
  }

  static UserSettingsSnapshot _settingsFromRecord(
    Map<String, Object?> record, {
    required UserSettingsSnapshot fallback,
  }) {
    return fallback.copyWith(
      themeMode: ThemeMode.values.firstWhere(
        (value) => value.name == (record['themeMode'] ?? '').toString(),
        orElse: () => fallback.themeMode,
      ),
      retentionPolicy: UserRetentionPolicy.fromValue(
        (record['retentionPolicy'] ?? '').toString().trim().isEmpty
            ? fallback.retentionPolicy.value
            : (record['retentionPolicy'] ?? '').toString(),
      ),
      clipboardAutoSync: record['clipboardAutoSync'] is bool
          ? record['clipboardAutoSync'] as bool
          : fallback.clipboardAutoSync,
      transcriptionSync: record['transcriptionSync'] is bool
          ? record['transcriptionSync'] as bool
          : fallback.transcriptionSync,
      customActionBarEnabled: record['customActionBarEnabled'] is bool
          ? record['customActionBarEnabled'] as bool
          : fallback.customActionBarEnabled,
      confirmDestructiveActions: record['confirmDestructiveActions'] is bool
          ? record['confirmDestructiveActions'] as bool
          : fallback.confirmDestructiveActions,
      onboardingCompleted: record['onboardingCompleted'] is bool
          ? record['onboardingCompleted'] as bool
          : fallback.onboardingCompleted,
      onboardingCurrentStep: _asInt(
        record['onboardingCurrentStep'],
        fallback: fallback.onboardingCurrentStep,
      ),
      onboardingClipboardSkipped: record['onboardingClipboardSkipped'] is bool
          ? record['onboardingClipboardSkipped'] as bool
          : fallback.onboardingClipboardSkipped,
      onboardingAccessibilitySkipped:
          record['onboardingAccessibilitySkipped'] is bool
          ? record['onboardingAccessibilitySkipped'] as bool
          : fallback.onboardingAccessibilitySkipped,
      onboardingMicrophoneSkipped: record['onboardingMicrophoneSkipped'] is bool
          ? record['onboardingMicrophoneSkipped'] as bool
          : fallback.onboardingMicrophoneSkipped,
      onboardingMediaAccessSkipped:
          record['onboardingMediaAccessSkipped'] is bool
          ? record['onboardingMediaAccessSkipped'] as bool
          : fallback.onboardingMediaAccessSkipped,
      onboardingBrightnessSkipped: record['onboardingBrightnessSkipped'] is bool
          ? record['onboardingBrightnessSkipped'] as bool
          : fallback.onboardingBrightnessSkipped,
      onboardingOverlaySkipped: record['onboardingOverlaySkipped'] is bool
          ? record['onboardingOverlaySkipped'] as bool
          : fallback.onboardingOverlaySkipped,
      localSpeechNoticeDismissedForever:
          record['localSpeechNoticeDismissedForever'] is bool
          ? record['localSpeechNoticeDismissedForever'] as bool
          : fallback.localSpeechNoticeDismissedForever,
      overlayNoticeDismissedForever:
          record['overlayNoticeDismissedForever'] is bool
          ? record['overlayNoticeDismissedForever'] as bool
          : fallback.overlayNoticeDismissedForever,
      onboardingNoticeDismissedForever:
          record['onboardingNoticeDismissedForever'] is bool
          ? record['onboardingNoticeDismissedForever'] as bool
          : fallback.onboardingNoticeDismissedForever,
      onboardingLastSeenAt: DateTime.tryParse(
        (record['onboardingLastSeenAt'] ?? '').toString(),
      )?.toUtc(),
    );
  }

  static int _asInt(Object? value, {required int fallback}) {
    if (value is int) {
      return value < 0 ? 0 : value;
    }
    if (value is num) {
      final normalized = value.toInt();
      return normalized < 0 ? 0 : normalized;
    }
    return fallback;
  }
}

class VoiceSyncAdapter implements LocalCloudSyncDomainAdapter {
  VoiceSyncAdapter({
    required InMemoryTranscriptionStore localStore,
    required FirebaseTranscriptionStore cloudStore,
  }) : _localStore = localStore,
       _cloudStore = cloudStore;

  final InMemoryTranscriptionStore _localStore;
  final FirebaseTranscriptionStore _cloudStore;

  @override
  LocalCloudSyncDomain get domain => LocalCloudSyncDomain.voice;

  @override
  bool get supportsPromotion => false;

  @override
  Future<LocalCloudDomainSnapshot> readLocalSnapshot() async {
    final records = (await _localStore.list())
        .map(
          (item) => <String, Object?>{
            'key': item.id,
            'createdAt': item.createdAt.toUtc().toIso8601String(),
          },
        )
        .toList(growable: false);
    return LocalCloudDomainSnapshot(
      domain: domain,
      supportsPromotion: false,
      items: records,
      checksum: LocalCloudDomainSnapshot.checksumFor(records),
    );
  }

  @override
  Future<LocalCloudDomainSnapshot> readCloudSnapshot() async {
    final records = (await _cloudStore.list())
        .map(
          (item) => <String, Object?>{
            'key': item.id,
            'createdAt': item.createdAt.toUtc().toIso8601String(),
          },
        )
        .toList(growable: false);
    return LocalCloudDomainSnapshot(
      domain: domain,
      supportsPromotion: false,
      items: records,
      checksum: LocalCloudDomainSnapshot.checksumFor(records),
    );
  }

  @override
  Future<void> upsertCloudRecords(List<Map<String, Object?>> records) async {}

  @override
  Future<void> upsertLocalRecords(List<Map<String, Object?>> records) async {}

  @override
  Future<void> deleteCloudByKeys(Set<String> keys) async {}

  @override
  bool recordsEquivalent(
    Map<String, Object?> local,
    Map<String, Object?> cloud,
  ) {
    return local['key'] == cloud['key'];
  }
}
