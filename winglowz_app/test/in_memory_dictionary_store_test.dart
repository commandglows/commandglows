import 'package:flutter_test/flutter_test.dart';
import 'package:commandglows_app/features/dictionary/data/in_memory_dictionary_store.dart';

void main() {
  group('InMemoryDictionaryStore', () {
    late DateTime now;
    late InMemoryDictionaryStore store;

    setUp(() {
      now = DateTime.utc(2026, 5, 8, 12, 0);
      store = InMemoryDictionaryStore(clock: () => now);
    });

    test('stores and lists terms', () async {
      await store.insert(
        term: ' hello ',
        replacement: ' world ',
        caseSensitive: true,
      );
      now = now.add(const Duration(milliseconds: 1));
      await store.insert(term: 'foo', replacement: 'bar', caseSensitive: false);

      final rows = await store.list();
      expect(rows, hasLength(2));
      expect(rows.first.createdAt, now.toUtc());
      expect(rows.first.term, 'foo');
      expect(rows.last.caseSensitive, isTrue);
    });

    test('updates and removes terms', () async {
      await store.insert(term: 'foo', replacement: 'bar', caseSensitive: false);
      final row = (await store.list()).single;

      await store.update(
        id: row.id,
        term: '  fooUpdated ',
        replacement: 'bar2',
        caseSensitive: true,
      );
      await store.softDelete(row.id);

      expect(await store.list(), isEmpty);
    });

    test('validates non-empty content', () async {
      expect(
        () => store.insert(term: '', replacement: 'x', caseSensitive: false),
        throwsA(isA<FormatException>()),
      );
      expect(
        () => store.insert(term: 'x', replacement: '', caseSensitive: false),
        throwsA(isA<FormatException>()),
      );
    });
  });
}
