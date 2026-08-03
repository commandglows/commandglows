import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:commandglows_app/core/sync/sync_status.dart';
import 'package:commandglows_app/core/widgets/app_components.dart';
import 'package:commandglows_app/features/clipboard/application/clipboard_store_provider.dart';
import 'package:commandglows_app/features/clipboard/domain/clipboard_capture_event.dart';
import 'package:commandglows_app/features/clipboard/domain/clipboard_store.dart';
import 'package:commandglows_app/features/dictionary/application/dictionary_store_provider.dart';
import 'package:commandglows_app/features/dictionary/domain/dictionary_store.dart';
import 'package:commandglows_app/features/home/application/home_feed_provider.dart';
import 'package:commandglows_app/features/snippets/application/snippet_store_provider.dart';
import 'package:commandglows_app/features/snippets/domain/snippet_store.dart';
import 'package:commandglows_app/features/voice/application/transcription_store.dart';
import 'package:commandglows_app/features/voice/application/transcription_store_provider.dart';
import 'package:commandglows_app/features/voice/domain/transcription_draft.dart';

void main() {
  test('home feed aggregates, sorts and maps sync states', () async {
    final now = DateTime.utc(2026, 5, 30, 8);
    final container = ProviderContainer(
      overrides: [
        transcriptionStoreProvider.overrideWithValue(
          _FakeTranscriptionStore([
            TranscriptionRecord(
              id: 'voice-1',
              rawText: 'raw voice',
              cleanedText: 'dictée finale',
              language: 'fr-FR',
              source: 'keyboard',
              durationMs: 1200,
              createdAt: now.subtract(const Duration(minutes: 4)),
              updatedAt: now.subtract(const Duration(minutes: 4)),
              syncStatus: const SyncStatus(health: SyncHealth.synced),
            ),
          ]),
        ),
        clipboardStoreProvider.overrideWithValue(
          _FakeClipboardStore([
            _clipboardItem(
              id: 'clip-1',
              content: 'clipboard alpha',
              createdAt: now.subtract(const Duration(minutes: 2)),
              syncState: ClipboardSyncState.pending,
            ),
          ]),
        ),
        snippetStoreProvider.overrideWithValue(
          _FakeSnippetStore([
            SnippetRecord(
              id: 'snippet-1',
              trigger: 'brb',
              content: 'Je reviens tout de suite',
              label: 'réponse rapide',
              createdAt: now.subtract(const Duration(minutes: 3)),
            ),
          ]),
        ),
        dictionaryStoreProvider.overrideWithValue(
          _FakeDictionaryStore([
            DictionaryTermRecord(
              id: 'dict-1',
              term: 'bjr',
              replacement: 'bonjour',
              caseSensitive: false,
              createdAt: now.subtract(const Duration(minutes: 1)),
            ),
          ]),
        ),
      ],
    );
    addTearDown(container.dispose);

    final data = await container.read(homeFeedProvider.future);

    expect(data.failures, isEmpty);
    expect(data.items.map((item) => item.typeLabel), [
      'Dictionnaire',
      'Presse-papiers',
      'Snippets',
      'Voix',
    ]);
    expect(data.items.first.title, 'bjr');
    expect(
      data.items.singleWhere((item) => item.id == 'clip-1').status.kind,
      AppSyncStatusKind.pending,
    );
    expect(
      data.items.singleWhere((item) => item.id == 'voice-1').status.kind,
      AppSyncStatusKind.synced,
    );
  });

  test('home feed keeps partial data when one source fails', () async {
    final now = DateTime.utc(2026, 5, 30, 8);
    final container = ProviderContainer(
      overrides: [
        transcriptionStoreProvider.overrideWithValue(
          _ThrowingTranscriptionStore(),
        ),
        clipboardStoreProvider.overrideWithValue(
          _FakeClipboardStore([
            _clipboardItem(
              id: 'clip-1',
              content: 'clipboard alpha',
              createdAt: now,
              syncState: ClipboardSyncState.synced,
            ),
          ]),
        ),
        snippetStoreProvider.overrideWithValue(_FakeSnippetStore(const [])),
        dictionaryStoreProvider.overrideWithValue(
          _FakeDictionaryStore(const []),
        ),
      ],
    );
    addTearDown(container.dispose);

    final data = await container.read(homeFeedProvider.future);

    expect(data.items, hasLength(1));
    expect(data.failures, hasLength(1));
    expect(data.failures.single.source, HomeFeedSourceType.voice);
    expect(data.hasPartialFailure, isTrue);
    expect(data.hasTotalFailure, isFalse);
  });
}

ClipboardItemRecord _clipboardItem({
  required String id,
  required String content,
  required DateTime createdAt,
  required ClipboardSyncState syncState,
}) {
  return ClipboardItemRecord(
    id: id,
    content: content,
    source: ClipboardCanonicalSource.manual.databaseValue,
    pinned: false,
    createdAt: createdAt,
    capturedAt: createdAt,
    lastSeenAt: createdAt,
    modifiedAt: createdAt,
    updatedAt: createdAt,
    contentHash: null,
    normalizedHash: null,
    originSurface: 'test',
    originDeviceId: null,
    captureMethod: 'manual',
    syncState: syncState,
    captureCount: 1,
    sourceMetadata: const {},
  );
}

class _FakeTranscriptionStore implements TranscriptionStore {
  const _FakeTranscriptionStore(this.records);

  final List<TranscriptionRecord> records;

  @override
  Future<List<TranscriptionRecord>> list() async => records;

  @override
  Future<TranscriptionRecord> insert(TranscriptionDraft draft) {
    throw UnimplementedError();
  }

  @override
  Future<void> softDelete(String id) {
    throw UnimplementedError();
  }

  @override
  Future<void> updateCleanedText({
    required String id,
    required String cleanedText,
  }) {
    throw UnimplementedError();
  }
}

class _ThrowingTranscriptionStore extends _FakeTranscriptionStore {
  _ThrowingTranscriptionStore() : super(const []);

  @override
  Future<List<TranscriptionRecord>> list() async {
    throw StateError('voice failed');
  }
}

class _FakeClipboardStore implements ClipboardHistoryStore {
  const _FakeClipboardStore(this.records);

  final List<ClipboardItemRecord> records;

  @override
  Future<List<ClipboardItemRecord>> list() async => records;

  @override
  Future<ClipboardItemRecord?> getById(String id) {
    throw UnimplementedError();
  }

  @override
  Future<void> insert({
    required String content,
    required ClipboardCanonicalSource source,
    String? originDeviceId,
    ClipboardSyncState syncState = ClipboardSyncState.synced,
    DateTime? capturedAtUtc,
    Map<String, Object?> sourceMetadata = const <String, Object?>{},
    bool sensitiveConfirmed = false,
  }) {
    throw UnimplementedError();
  }

  @override
  Future<void> markSyncState({
    required String id,
    required ClipboardSyncState state,
    String? syncError,
  }) {
    throw UnimplementedError();
  }

  @override
  Future<void> softDelete(String id) {
    throw UnimplementedError();
  }

  @override
  Future<void> togglePin({required String id, required bool pinned}) {
    throw UnimplementedError();
  }

  @override
  Future<void> updateContent({
    required String id,
    required String content,
    bool sensitiveConfirmed = false,
  }) {
    throw UnimplementedError();
  }

  @override
  Future<ClipboardItemRecord> upsertAutomaticWithinWindow(
    ClipboardAutomaticUpsertDraft draft,
  ) {
    throw UnimplementedError();
  }
}

class _FakeSnippetStore implements SnippetStore {
  const _FakeSnippetStore(this.records);

  final List<SnippetRecord> records;

  @override
  Future<List<SnippetRecord>> list() async => records;

  @override
  Future<void> insert({
    required String trigger,
    required String content,
    String? label,
  }) {
    throw UnimplementedError();
  }

  @override
  Future<void> softDelete(String id) {
    throw UnimplementedError();
  }

  @override
  Future<void> update({
    required String id,
    required String trigger,
    required String content,
    String? label,
  }) {
    throw UnimplementedError();
  }
}

class _FakeDictionaryStore implements DictionaryStore {
  const _FakeDictionaryStore(this.records);

  final List<DictionaryTermRecord> records;

  @override
  Future<List<DictionaryTermRecord>> list() async => records;

  @override
  Future<void> insert({
    required String term,
    required String replacement,
    required bool caseSensitive,
  }) {
    throw UnimplementedError();
  }

  @override
  Future<void> softDelete(String id) {
    throw UnimplementedError();
  }

  @override
  Future<void> update({
    required String id,
    required String term,
    required String replacement,
    required bool caseSensitive,
  }) {
    throw UnimplementedError();
  }
}
