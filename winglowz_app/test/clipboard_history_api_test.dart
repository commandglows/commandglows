import 'package:flutter_test/flutter_test.dart';
import 'package:commandglows_app/core/platform/android_keyboard_bridge.dart';
import 'package:commandglows_app/features/clipboard/application/clipboard_history_api.dart';
import 'package:commandglows_app/features/clipboard/application/keyboard_clipboard_event_importer.dart';
import 'package:commandglows_app/features/clipboard/domain/clipboard_capture_event.dart';
import 'package:commandglows_app/features/clipboard/domain/clipboard_store.dart';

void main() {
  group('ClipboardHistoryApi', () {
    test('adds manual items through backend-agnostic store contract', () async {
      final store = FakeClipboardHistoryStore();
      final api = ClipboardHistoryApi(store);

      await api.addManualItem(
        content: 'hello',
        source: ClipboardCanonicalSource.manual,
        sensitiveConfirmed: true,
      );

      expect(store.insertCalls, 1);
      expect(store.lastInsertedContent, 'hello');
      expect(store.lastInsertedSource, ClipboardCanonicalSource.manual);
      expect(store.lastInsertedSyncState, ClipboardSyncState.synced);
      expect(store.lastSensitiveConfirmed, isTrue);
    });

    test('captures automatic items as store-neutral upsert drafts', () async {
      final store = FakeClipboardHistoryStore();
      final api = ClipboardHistoryApi(store);
      final capturedAt = DateTime.utc(2026, 5, 8, 12, 0);

      await api.captureAutomaticItem(
        content: 'automatic',
        source: ClipboardCanonicalSource.keyboardClipboard,
        deviceId: 'android:test',
        capturedAtUtc: capturedAt,
      );

      expect(store.upsertCalls, 1);
      expect(store.lastDraft?.content, 'automatic');
      expect(
        store.lastDraft?.source,
        ClipboardCanonicalSource.keyboardClipboard,
      );
      expect(store.lastDraft?.deviceId, 'android:test');
      expect(store.lastDraft?.capturedAtUtc, capturedAt);
      expect(store.lastDraft?.syncState, ClipboardSyncState.pending);
    });

    test(
      'imports Android keyboard clipboard events through product API',
      () async {
        final store = FakeClipboardHistoryStore();
        final api = ClipboardHistoryApi(store);
        final importer = KeyboardClipboardEventImporter(
          api,
          drainEvents: () async => [
            AndroidKeyboardClipboardEvent(
              content: 'from keyboard',
              source: ClipboardCanonicalSource.keyboardClipboard,
              deviceId: 'android:test-device',
              capturedAtUtc: DateTime.utc(2026, 5, 8, 18),
              sourceMetadata: const {'action': 'paste_primary_clip'},
            ),
          ],
        );

        final result = await importer.drainFromAndroidKeyboard();

        expect(result.imported, 1);
        expect(result.rejectedSensitive, 0);
        expect(result.failed, 0);
        expect(store.upsertCalls, 1);
        expect(store.lastDraft?.content, 'from keyboard');
        expect(
          store.lastDraft?.source,
          ClipboardCanonicalSource.keyboardClipboard,
        );
        expect(store.lastDraft?.deviceId, 'android:test-device');
        expect(
          store.lastDraft?.sourceMetadata,
          containsPair('action', 'paste_primary_clip'),
        );
      },
    );

    test(
      'does not import sensitive Android keyboard events without confirmation',
      () async {
        final store = FakeClipboardHistoryStore(
          failSensitiveWithoutConfirmation: true,
        );
        final api = ClipboardHistoryApi(store);
        final importer = KeyboardClipboardEventImporter(
          api,
          drainEvents: () async => [
            AndroidKeyboardClipboardEvent(
              content: 'sk-test-secret',
              source: ClipboardCanonicalSource.keyboardClipboard,
              deviceId: 'android:test-device',
              capturedAtUtc: DateTime.utc(2026, 5, 8, 18),
              sourceMetadata: const {'action': 'copy_selection'},
            ),
          ],
        );

        final result = await importer.drainFromAndroidKeyboard();

        expect(result.imported, 0);
        expect(result.rejectedSensitive, 1);
        expect(result.failed, 0);
        expect(store.upsertCalls, 1);
      },
    );
  });
}

class FakeClipboardHistoryStore implements ClipboardHistoryStore {
  FakeClipboardHistoryStore({this.failSensitiveWithoutConfirmation = false});

  final bool failSensitiveWithoutConfirmation;
  int insertCalls = 0;
  int upsertCalls = 0;
  String? lastInsertedContent;
  ClipboardCanonicalSource? lastInsertedSource;
  ClipboardSyncState? lastInsertedSyncState;
  bool? lastSensitiveConfirmed;
  ClipboardAutomaticUpsertDraft? lastDraft;

  @override
  Future<List<ClipboardItemRecord>> list() async {
    return const <ClipboardItemRecord>[];
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
  }) async {
    insertCalls += 1;
    lastInsertedContent = content;
    lastInsertedSource = source;
    lastInsertedSyncState = syncState;
    lastSensitiveConfirmed = sensitiveConfirmed;
  }

  @override
  Future<ClipboardItemRecord> upsertAutomaticWithinWindow(
    ClipboardAutomaticUpsertDraft draft,
  ) async {
    upsertCalls += 1;
    lastDraft = draft;
    if (failSensitiveWithoutConfirmation && !draft.sensitiveConfirmed) {
      throw const ClipboardSensitiveConfirmationRequiredException(
        ClipboardSensitiveClassification.apiKey,
      );
    }
    return _item(
      content: draft.content,
      source: draft.source,
      capturedAtUtc: draft.capturedAtUtc,
      syncState: draft.syncState,
    );
  }

  @override
  Future<ClipboardItemRecord?> getById(String id) async {
    return null;
  }

  @override
  Future<void> updateContent({
    required String id,
    required String content,
    bool sensitiveConfirmed = false,
  }) async {}

  @override
  Future<void> markSyncState({
    required String id,
    required ClipboardSyncState state,
    String? syncError,
  }) async {}

  @override
  Future<void> togglePin({required String id, required bool pinned}) async {}

  @override
  Future<void> softDelete(String id) async {}
}

ClipboardItemRecord _item({
  required String content,
  required ClipboardCanonicalSource source,
  required DateTime capturedAtUtc,
  required ClipboardSyncState syncState,
}) {
  return ClipboardItemRecord(
    id: 'item-1',
    content: content,
    source: source.databaseValue,
    pinned: false,
    createdAt: capturedAtUtc,
    capturedAt: capturedAtUtc,
    lastSeenAt: capturedAtUtc,
    modifiedAt: capturedAtUtc,
    updatedAt: capturedAtUtc,
    contentHash: null,
    normalizedHash: null,
    originSurface: source.originSurface,
    originDeviceId: null,
    captureMethod: source.captureMethod,
    syncState: syncState,
    captureCount: 1,
    sourceMetadata: const <String, Object?>{},
  );
}
