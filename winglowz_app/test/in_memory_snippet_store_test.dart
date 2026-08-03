import 'package:flutter_test/flutter_test.dart';
import 'package:commandglows_app/features/snippets/data/in_memory_snippet_store.dart';

void main() {
  group('InMemorySnippetStore', () {
    late DateTime now;
    late InMemorySnippetStore store;

    setUp(() {
      now = DateTime.utc(2026, 5, 8, 12, 0);
      store = InMemorySnippetStore(clock: () => now);
    });

    test('stores and lists snippets', () async {
      await store.insert(
        trigger: ' hello ',
        content: ' world ',
        label: '  first ',
      );
      now = now.add(const Duration(milliseconds: 1));
      await store.insert(trigger: 'trigger2', content: 'content2', label: null);

      final rows = await store.list();
      expect(rows, hasLength(2));
      expect(rows.first.createdAt, now.toUtc());
      expect(rows.first.trigger, 'trigger2');
      expect(rows.last.label, 'first');
    });

    test('updates and removes snippets', () async {
      await store.insert(trigger: 'hello', content: 'world', label: null);
      final row = (await store.list()).single;

      await store.update(
        id: row.id,
        trigger: '  hello2 ',
        content: ' content2 ',
        label: '',
      );
      await store.softDelete(row.id);

      expect(await store.list(), isEmpty);
    });

    test('validates non-empty content', () async {
      expect(
        () => store.insert(trigger: '', content: 'x', label: null),
        throwsA(isA<FormatException>()),
      );
      expect(
        () => store.insert(trigger: 'x', content: '', label: null),
        throwsA(isA<FormatException>()),
      );
    });
  });
}
