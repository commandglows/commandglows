import 'package:flutter_test/flutter_test.dart';
import 'package:commandglows_app/features/voice/data/in_memory_transcription_store.dart';
import 'package:commandglows_app/features/voice/domain/transcription_draft.dart';

void main() {
  group('InMemoryTranscriptionStore', () {
    late DateTime now;
    late InMemoryTranscriptionStore store;

    setUp(() {
      now = DateTime.utc(2026, 5, 8, 12, 0);
      store = InMemoryTranscriptionStore(clock: () => now);
    });

    test('stores and lists transcriptions locally', () async {
      await store.insert(
        const TranscriptionDraft(
          rawText: ' raw ',
          cleanedText: ' cleaned ',
          language: 'en',
          source: 'keyboard',
          durationMs: 10,
        ),
      );
      now = now.add(const Duration(milliseconds: 1));
      await store.insert(
        const TranscriptionDraft(
          rawText: 'second',
          cleanedText: 'second cleaned',
          language: 'fr',
          source: 'overlay',
          durationMs: 20,
        ),
      );

      final rows = await store.list();
      expect(rows, hasLength(2));
      expect(rows.first.createdAt, now.toUtc());
      expect(rows.first.cleanedText, 'second cleaned');
      expect(rows.last.rawText, 'raw');
    });

    test('updates cleaned text and soft deletes records', () async {
      final row = await store.insert(
        const TranscriptionDraft(
          rawText: 'raw',
          cleanedText: 'cleaned',
          language: 'en',
          source: 'free',
          durationMs: 0,
        ),
      );

      await store.updateCleanedText(id: row.id, cleanedText: ' updated ');
      expect((await store.list()).single.cleanedText, 'updated');

      await store.softDelete(row.id);
      expect(await store.list(), isEmpty);
    });

    test('validates transcription payloads', () async {
      expect(
        () => store.insert(
          const TranscriptionDraft(
            rawText: '',
            cleanedText: 'cleaned',
            language: 'en',
            source: 'free',
            durationMs: 0,
          ),
        ),
        throwsA(isA<FormatException>()),
      );
      expect(
        () => store.updateCleanedText(id: 'missing', cleanedText: ''),
        throwsA(isA<FormatException>()),
      );
    });
  });
}
