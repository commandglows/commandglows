import 'package:flutter_test/flutter_test.dart';
import 'package:commandglows_app/features/clipboard/data/in_memory_clipboard_history_store.dart';
import 'package:commandglows_app/features/clipboard/domain/clipboard_capture_event.dart';
import 'package:commandglows_app/features/clipboard/domain/clipboard_store.dart';

void main() {
  group('InMemoryClipboardHistoryStore', () {
    late DateTime now;
    late InMemoryClipboardHistoryStore store;

    setUp(() {
      now = DateTime.utc(2026, 5, 8, 12, 0);
      store = InMemoryClipboardHistoryStore(clock: () => now);
    });

    test('stores manual items without a remote backend', () async {
      await store.insert(
        content: ' hello ',
        source: ClipboardCanonicalSource.manual,
      );

      final rows = await store.list();
      expect(rows, hasLength(1));
      expect(rows.first.content, 'hello');
      expect(rows.first.syncState, ClipboardSyncState.synced);
      expect(rows.first.contentHash, hasLength(64));
      expect(rows.first.normalizedHash, hasLength(64));
    });

    test('dedupes automatic captures inside the window', () async {
      final first = await store.upsertAutomaticWithinWindow(
        ClipboardAutomaticUpsertDraft(
          content: 'Hello world',
          source: ClipboardCanonicalSource.keyboardClipboard,
          deviceId: 'android:test',
          capturedAtUtc: now,
        ),
      );
      now = now.add(const Duration(minutes: 3));
      final second = await store.upsertAutomaticWithinWindow(
        ClipboardAutomaticUpsertDraft(
          content: 'Hello   world',
          source: ClipboardCanonicalSource.keyboardClipboard,
          deviceId: 'android:test',
          capturedAtUtc: now,
        ),
      );

      expect(first.id, second.id);
      expect(second.captureCount, 2);
      expect(await store.list(), hasLength(1));
    });

    test('does not dedupe outside the automatic window', () async {
      await store.upsertAutomaticWithinWindow(
        ClipboardAutomaticUpsertDraft(
          content: 'Hello world',
          source: ClipboardCanonicalSource.keyboardClipboard,
          deviceId: 'android:test',
          capturedAtUtc: now,
        ),
      );
      now = now.add(const Duration(minutes: 11));
      await store.upsertAutomaticWithinWindow(
        ClipboardAutomaticUpsertDraft(
          content: 'Hello world',
          source: ClipboardCanonicalSource.keyboardClipboard,
          deviceId: 'android:test',
          capturedAtUtc: now,
        ),
      );

      expect(await store.list(), hasLength(2));
    });

    test('requires confirmation before storing sensitive content', () async {
      expect(
        () => store.insert(
          content: 'password: super-secret',
          source: ClipboardCanonicalSource.manual,
        ),
        throwsA(isA<ClipboardSensitiveConfirmationRequiredException>()),
      );

      await store.insert(
        content: 'password: super-secret',
        source: ClipboardCanonicalSource.manual,
        sensitiveConfirmed: true,
      );
      expect(await store.list(), hasLength(1));
    });

    test('pin and delete remain local-store operations', () async {
      await store.insert(
        content: 'keep',
        source: ClipboardCanonicalSource.manual,
      );
      final item = (await store.list()).single;

      await store.togglePin(id: item.id, pinned: true);
      expect((await store.list()).single.pinned, isTrue);

      await store.softDelete(item.id);
      expect(await store.list(), isEmpty);
    });
  });
}
