import 'package:flutter_test/flutter_test.dart';
import 'package:commandglows_app/core/storage/local_json_persistence.dart';
import 'package:commandglows_app/features/custom_action_buttons/data/in_memory_custom_action_button_store.dart';
import 'package:commandglows_app/features/custom_action_buttons/domain/custom_action_buttons.dart';
import 'package:commandglows_app/features/dictionary/data/in_memory_dictionary_store.dart';
import 'package:commandglows_app/features/snippets/data/in_memory_snippet_store.dart';
import 'package:commandglows_app/features/voice/data/in_memory_transcription_store.dart';
import 'package:commandglows_app/features/voice/domain/transcription_draft.dart';

class _MemoryPersistence extends LocalJsonPersistence {
  _MemoryPersistence() : super('test');

  List<Map<String, Object?>> rows = [];

  @override
  Future<List<Map<String, dynamic>>> read() async => [
    for (final row in rows) Map<String, dynamic>.from(row),
  ];

  @override
  Future<void> write(List<Map<String, Object?>> items) async {
    rows = [for (final item in items) Map<String, Object?>.from(item)];
  }
}

void main() {
  test('local product records survive store recreation', () async {
    final snippets = _MemoryPersistence();
    final dictionary = _MemoryPersistence();
    final voice = _MemoryPersistence();
    final actions = _MemoryPersistence();

    await InMemorySnippetStore(
      persistence: snippets,
    ).insert(trigger: ';hi', content: 'Bonjour');
    await InMemoryDictionaryStore(
      persistence: dictionary,
    ).insert(term: 'bjr', replacement: 'bonjour', caseSensitive: false);
    await InMemoryTranscriptionStore(persistence: voice).insert(
      const TranscriptionDraft(
        rawText: 'bonjour',
        cleanedText: 'Bonjour.',
        language: 'fr',
        source: 'free',
        durationMs: 1000,
      ),
    );
    await InMemoryCustomActionButtonStore(persistence: actions).insert(
      title: 'Salut',
      icon: CustomActionButtonIcon.spark,
      action: const CustomActionButtonAction(
        kind: CustomActionKind.insertText,
        value: 'Bonjour',
      ),
    );

    expect(
      (await InMemorySnippetStore(persistence: snippets).list()).single.content,
      'Bonjour',
    );
    expect(
      (await InMemoryDictionaryStore(
        persistence: dictionary,
      ).list()).single.replacement,
      'bonjour',
    );
    expect(
      (await InMemoryTranscriptionStore(
        persistence: voice,
      ).list()).single.cleanedText,
      'Bonjour.',
    );
    expect(
      (await InMemoryCustomActionButtonStore(
        persistence: actions,
      ).list()).single.action.value,
      'Bonjour',
    );
  });
}
