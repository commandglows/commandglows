import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/widgets/app_components.dart';
import '../../../core/sync/sync_status.dart';
import '../../clipboard/application/clipboard_store_provider.dart';
import '../../clipboard/domain/clipboard_capture_event.dart';
import '../../clipboard/domain/clipboard_store.dart';
import '../../dictionary/application/dictionary_store_provider.dart';
import '../../dictionary/domain/dictionary_store.dart';
import '../../snippets/application/snippet_store_provider.dart';
import '../../snippets/domain/snippet_store.dart';
import '../../voice/application/transcription_store.dart';
import '../../voice/application/transcription_store_provider.dart';

enum HomeFeedSourceType { voice, clipboard, snippet, dictionary }

typedef HomeFeedItemSink = void Function(HomeFeedItem item);

class HomeFeedFailure {
  const HomeFeedFailure({required this.source, required this.message});

  final HomeFeedSourceType source;
  final String message;

  String get sourceLabel => switch (source) {
    HomeFeedSourceType.voice => 'Voix',
    HomeFeedSourceType.clipboard => 'Presse-papiers',
    HomeFeedSourceType.snippet => 'Snippets',
    HomeFeedSourceType.dictionary => 'Dictionnaire',
  };
}

class HomeFeedItem {
  const HomeFeedItem({
    required this.id,
    required this.source,
    required this.title,
    required this.excerpt,
    required this.timestamp,
    required this.status,
    required this.typeLabel,
  });

  final String id;
  final HomeFeedSourceType source;
  final String title;
  final String excerpt;
  final DateTime timestamp;
  final AppSyncStatus status;
  final String typeLabel;
}

class HomeFeedData {
  const HomeFeedData({required this.items, required this.failures});

  final List<HomeFeedItem> items;
  final List<HomeFeedFailure> failures;

  bool get hasPartialFailure => failures.isNotEmpty && items.isNotEmpty;

  bool get hasTotalFailure => failures.isNotEmpty && items.isEmpty;
}

const _kHomeFeedLimit = 60;

final homeFeedProvider = FutureProvider<HomeFeedData>((ref) async {
  final items = <HomeFeedItem>[];
  final failures = <HomeFeedFailure>[];

  final transcriptionStore = ref.watch(transcriptionStoreProvider);
  final clipboardStore = ref.watch(clipboardStoreProvider);
  final snippetStore = ref.watch(snippetStoreProvider);
  final dictionaryStore = ref.watch(dictionaryStoreProvider);

  await _withResult(
    () async =>
        await _loadVoiceItems(store: transcriptionStore, onItem: items.add),
    (error) => failures.add(
      HomeFeedFailure(
        source: HomeFeedSourceType.voice,
        message: 'Voix indisponible ($error)',
      ),
    ),
  );

  await _withResult(
    () async =>
        await _loadClipboardItems(store: clipboardStore, onItem: items.add),
    (error) => failures.add(
      HomeFeedFailure(
        source: HomeFeedSourceType.clipboard,
        message: 'Presse-papiers indisponible ($error)',
      ),
    ),
  );

  await _withResult(
    () async => await _loadSnippetItems(store: snippetStore, onItem: items.add),
    (error) => failures.add(
      HomeFeedFailure(
        source: HomeFeedSourceType.snippet,
        message: 'Snippets indisponible ($error)',
      ),
    ),
  );

  await _withResult(
    () async =>
        await _loadDictionaryItems(store: dictionaryStore, onItem: items.add),
    (error) => failures.add(
      HomeFeedFailure(
        source: HomeFeedSourceType.dictionary,
        message: 'Dictionnaire indisponible ($error)',
      ),
    ),
  );

  items.sort((a, b) => b.timestamp.compareTo(a.timestamp));
  final cappedItems = items.take(_kHomeFeedLimit).toList(growable: false);
  return HomeFeedData(items: cappedItems, failures: failures);
});

Future<void> _withResult(
  Future<void> Function() loader,
  void Function(Object error) onFailure,
) async {
  try {
    await loader();
  } catch (error) {
    onFailure(error);
  }
}

Future<void> _loadVoiceItems({
  required TranscriptionStore store,
  required HomeFeedItemSink onItem,
}) async {
  final rows = await store.list();
  for (final record in rows) {
    final normalizedCleanText = _normalizeFeedText(record.cleanedText);
    final normalizedRawText = _normalizeFeedText(record.rawText);
    final content = normalizedCleanText.isNotEmpty
        ? normalizedCleanText
        : normalizedRawText;
    final title = content.isNotEmpty ? content : 'Transcription ${record.id}';
    onItem(
      HomeFeedItem(
        id: record.id,
        source: HomeFeedSourceType.voice,
        title: title,
        excerpt: _buildVoiceExcerpt(record),
        timestamp: _timestamp(record.updatedAt, record.createdAt),
        typeLabel: 'Voix',
        status: _syncStatusFromSyncHealth(record.syncStatus),
      ),
    );
  }
}

String _buildVoiceExcerpt(TranscriptionRecord record) {
  final source = record.source.trim().isEmpty
      ? 'unknown'
      : record.source.trim();
  final language = record.language.trim().isEmpty
      ? 'fr'
      : record.language.trim();
  return '${_stripLineBreaks(record.cleanedText.isEmpty ? record.rawText : record.cleanedText)} · $source · $language';
}

Future<void> _loadClipboardItems({
  required ClipboardHistoryStore store,
  required HomeFeedItemSink onItem,
}) async {
  final rows = await store.list();
  for (final record in rows) {
    final normalizedContent = _normalizeFeedText(record.content);
    onItem(
      HomeFeedItem(
        id: record.id,
        source: HomeFeedSourceType.clipboard,
        title: _titleFromText(normalizedContent),
        excerpt: '${record.sourceLabel} · ${record.syncState.name}',
        timestamp: _timestamp(record.updatedAt, record.createdAt),
        typeLabel: 'Presse-papiers',
        status: _syncStatusFromClipboard(record.syncState),
      ),
    );
  }
}

Future<void> _loadSnippetItems({
  required SnippetStore store,
  required HomeFeedItemSink onItem,
}) async {
  final rows = await store.list();
  for (final record in rows) {
    onItem(
      HomeFeedItem(
        id: record.id,
        source: HomeFeedSourceType.snippet,
        title: record.trigger.trim().isEmpty
            ? 'Snippet ${record.id}'
            : record.trigger.trim(),
        excerpt:
            '${record.label?.trim().isNotEmpty == true ? '${record.label!.trim()} · ' : ''}'
            '${record.content}',
        timestamp: _timestamp(record.createdAt, record.createdAt),
        typeLabel: 'Snippets',
        status: const AppSyncStatus(kind: AppSyncStatusKind.localOnly),
      ),
    );
  }
}

Future<void> _loadDictionaryItems({
  required DictionaryStore store,
  required HomeFeedItemSink onItem,
}) async {
  final rows = await store.list();
  for (final record in rows) {
    onItem(
      HomeFeedItem(
        id: record.id,
        source: HomeFeedSourceType.dictionary,
        title: record.term.trim().isEmpty
            ? 'Terme ${record.id}'
            : record.term.trim(),
        excerpt:
            '${record.replacement} ${record.caseSensitive ? '(casse sensible)' : ''}',
        timestamp: _timestamp(record.createdAt, record.createdAt),
        typeLabel: 'Dictionnaire',
        status: const AppSyncStatus(kind: AppSyncStatusKind.localOnly),
      ),
    );
  }
}

DateTime _timestamp(DateTime first, DateTime second) =>
    first.isAfter(second) ? first : second;

String _titleFromText(String value) {
  final normalized = _normalizeFeedText(value);
  if (normalized.isEmpty) {
    return 'Élément presse-papiers';
  }
  return normalized;
}

String _normalizeFeedText(String value) {
  final normalized = value.trim().replaceAll('\n', ' ');
  if (normalized.isEmpty) {
    return '';
  }
  return normalized;
}

String _stripLineBreaks(String value) => value.replaceAll('\n', ' ');

AppSyncStatus _syncStatusFromSyncHealth(SyncStatus status) {
  final kind = switch (status.health) {
    SyncHealth.localOnly => AppSyncStatusKind.localOnly,
    SyncHealth.unavailable => AppSyncStatusKind.localOnly,
    SyncHealth.pending => AppSyncStatusKind.pending,
    SyncHealth.syncing => AppSyncStatusKind.syncing,
    SyncHealth.synced => AppSyncStatusKind.synced,
    SyncHealth.failed => AppSyncStatusKind.error,
  };
  return AppSyncStatus(kind: kind, message: _syncStatusMessage(kind));
}

AppSyncStatus _syncStatusFromClipboard(ClipboardSyncState state) {
  final kind = switch (state) {
    ClipboardSyncState.local => AppSyncStatusKind.localOnly,
    ClipboardSyncState.pending => AppSyncStatusKind.pending,
    ClipboardSyncState.synced => AppSyncStatusKind.synced,
    ClipboardSyncState.error => AppSyncStatusKind.error,
    ClipboardSyncState.deleted => AppSyncStatusKind.localOnly,
  };
  return AppSyncStatus(kind: kind, message: _syncStatusMessage(kind));
}

String _syncStatusMessage(AppSyncStatusKind kind) => switch (kind) {
  AppSyncStatusKind.synced =>
    'Synchronisation confirmée lors du dernier import.',
  AppSyncStatusKind.saved => 'Enregistré.',
  AppSyncStatusKind.localOnly => 'Conservé localement pour cette source.',
  AppSyncStatusKind.pending => 'Action en attente.',
  AppSyncStatusKind.syncing => 'Synchronisation en cours.',
  AppSyncStatusKind.loading => 'Actualisation en cours.',
  AppSyncStatusKind.saving => 'Enregistrement en cours.',
  AppSyncStatusKind.error => 'Mise à jour en erreur.',
  AppSyncStatusKind.conflict => 'Conflit en attente de résolution.',
  AppSyncStatusKind.idle => 'Mis à jour.',
};
