import 'package:flutter_test/flutter_test.dart';
import 'package:commandglows_app/features/clipboard/data/persistent_clipboard_history_store.dart';
import 'package:commandglows_app/features/clipboard/domain/clipboard_capture_event.dart';
import 'package:commandglows_app/features/clipboard/domain/clipboard_store.dart';

void main() {
  group('PersistentClipboardHistoryStore', () {
    late DateTime now;
    late FakeClipboardHistoryPersistence persistence;

    setUp(() {
      now = DateTime.utc(2026, 5, 24, 12);
      persistence = FakeClipboardHistoryPersistence();
    });

    PersistentClipboardHistoryStore store() {
      return PersistentClipboardHistoryStore(
        persistence: persistence,
        clock: () => now,
      );
    }

    test('restores local clipboard history across store instances', () async {
      await store().insert(
        content: ' remember this ',
        source: ClipboardCanonicalSource.manual,
      );

      final restored = await store().list();

      expect(restored, hasLength(1));
      expect(restored.single.content, 'remember this');
      expect(restored.single.syncState, ClipboardSyncState.local);
    });

    test('persists pin, edit and delete operations', () async {
      final firstStore = store();
      await firstStore.insert(
        content: 'draft',
        source: ClipboardCanonicalSource.manual,
      );
      final item = (await firstStore.list()).single;

      await firstStore.togglePin(id: item.id, pinned: true);
      await firstStore.updateContent(
        id: item.id,
        content: 'final',
        sensitiveConfirmed: true,
      );

      final edited = (await store().list()).single;
      expect(edited.content, 'final');
      expect(edited.pinned, isTrue);
      expect(edited.syncState, ClipboardSyncState.local);

      await store().softDelete(edited.id);
      expect(await store().list(), isEmpty);
    });

    test('keeps automatic dedupe durable after reload', () async {
      final firstStore = store();
      await firstStore.upsertAutomaticWithinWindow(
        ClipboardAutomaticUpsertDraft(
          content: 'Hello world',
          source: ClipboardCanonicalSource.keyboardClipboard,
          deviceId: 'android:test',
          capturedAtUtc: now,
        ),
      );

      now = now.add(const Duration(minutes: 4));
      final second = await store().upsertAutomaticWithinWindow(
        ClipboardAutomaticUpsertDraft(
          content: 'Hello   world',
          source: ClipboardCanonicalSource.keyboardClipboard,
          deviceId: 'android:test',
          capturedAtUtc: now,
        ),
      );

      expect(second.captureCount, 2);
      expect(await store().list(), hasLength(1));
    });

    test('recovers from corrupted persisted payload', () async {
      persistence.value = '{not-json';

      expect(await store().list(), isEmpty);
      expect(persistence.value, isNull);
    });

    test('keeps the active session usable when persistence fails', () async {
      final failingPersistence = FakeClipboardHistoryPersistence(
        failRead: true,
        failWrite: true,
      );
      final localStore = PersistentClipboardHistoryStore(
        persistence: failingPersistence,
        clock: () => now,
      );

      await localStore.insert(
        content: 'session item',
        source: ClipboardCanonicalSource.manual,
      );

      final rows = await localStore.list();
      expect(rows, hasLength(1));
      expect(rows.single.content, 'session item');
    });
  });
}

class FakeClipboardHistoryPersistence implements ClipboardHistoryPersistence {
  FakeClipboardHistoryPersistence({
    this.failRead = false,
    this.failWrite = false,
  });

  final bool failRead;
  final bool failWrite;
  String? value;

  @override
  Future<String?> read() async {
    if (failRead) {
      throw StateError('read unavailable');
    }
    return value;
  }

  @override
  Future<void> write(String value) async {
    if (failWrite) {
      throw StateError('write unavailable');
    }
    this.value = value;
  }

  @override
  Future<void> clear() async {
    value = null;
  }
}
