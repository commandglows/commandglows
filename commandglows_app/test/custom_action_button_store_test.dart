import 'package:flutter_test/flutter_test.dart';
import 'package:commandglows_app/features/custom_action_buttons/data/in_memory_custom_action_button_store.dart';
import 'package:commandglows_app/features/custom_action_buttons/domain/custom_action_buttons.dart';

void main() {
  test('parses desktop key sequence into typed steps', () {
    final sequence = DesktopKeySequence.parse('Ctrl+W, N');

    expect(sequence.steps, hasLength(2));
    expect(sequence.steps.first.key, 'W');
    expect(sequence.steps.first.modifiers, contains(DesktopKeyModifier.ctrl));
    expect(sequence.steps.last.key, 'N');
    expect(sequence.steps.last.modifiers, isEmpty);
  });

  test('in-memory store persists normalized custom action buttons', () async {
    final store = InMemoryCustomActionButtonStore(
      clock: () => DateTime.utc(2026, 6, 11, 11),
    );

    await store.insert(
      title: '  Fenêtre suivante  ',
      icon: CustomActionButtonIcon.window,
      action: const CustomActionButtonAction(
        kind: CustomActionKind.keySequence,
        value: ' Ctrl+W, N ',
      ),
      rowIndex: 1,
    );

    final items = await store.list();
    expect(items, hasLength(1));
    expect(items.single.title, 'Fenêtre suivante');
    expect(items.single.icon, CustomActionButtonIcon.window);
    expect(items.single.action.value, 'Ctrl+W, N');
    expect(items.single.rowIndex, 1);
  });

  test(
    'in-memory store accepts built-in actions without free-text payload',
    () async {
      final store = InMemoryCustomActionButtonStore(
        clock: () => DateTime.utc(2026, 6, 11, 11),
      );

      await store.insert(
        title: 'Coller',
        icon: CustomActionButtonIcon.clipboard,
        action: const CustomActionButtonAction(
          kind: CustomActionKind.clipboardCommand,
          value: '',
        ),
      );

      final items = await store.list();
      expect(items.single.action.kind, CustomActionKind.clipboardCommand);
    },
  );

  test(
    'keyboard corner bindings map supported custom actions to expressions',
    () {
      const insertText = CustomActionButtonAction(
        kind: CustomActionKind.insertText,
        value: 'Bonjour',
      );
      const shortcut = CustomActionButtonAction(
        kind: CustomActionKind.keyboardExpression,
        value: 'action:Undo',
      );
      const copy = CustomActionButtonAction(
        kind: CustomActionKind.clipboardCommand,
        value: 'copy',
      );

      expect(insertText.supportsKeyboardCornerExecution, isTrue);
      expect(shortcut.supportsKeyboardCornerExecution, isTrue);
      expect(copy.supportsKeyboardCornerExecution, isTrue);
      expect(copy.keyboardCornerExpression, 'action:CopySelection');
      expect(insertText.keyboardCornerExpression, "'Bonjour'");
    },
  );

  test('keyboard corner bindings reject desktop-only action types', () {
    const unsupported = CustomActionButtonAction(
      kind: CustomActionKind.keySequence,
      value: 'Ctrl+W, N',
    );

    expect(unsupported.supportsKeyboardCornerExecution, isFalse);
    expect(
      unsupported.keyboardCornerUnsupportedReason,
      contains('séquences clavier'),
    );
  });

  test('IME compatibility reports supported and unsupported action types', () {
    const text = CustomActionButtonAction(
      kind: CustomActionKind.insertText,
      value: 'Bonjour',
    );
    const shortcut = CustomActionButtonAction(
      kind: CustomActionKind.keyboardExpression,
      value: 'action:Undo',
    );
    const keySequence = CustomActionButtonAction(
      kind: CustomActionKind.keySequence,
      value: 'Ctrl+W, N',
    );
    const macro = CustomActionButtonAction(
      kind: CustomActionKind.macro,
      value: 'a',
    );
    const unknownClipboard = CustomActionButtonAction(
      kind: CustomActionKind.clipboardCommand,
      value: 'archiveClipboard',
    );
    const playPause = CustomActionButtonAction(
      kind: CustomActionKind.mediaCommand,
      value: 'playPause',
    );

    expect(text.isImeCompatible, isTrue);
    expect(text.imeCompatibilityLabel, 'IME: compatible');
    expect(keySequence.isImeCompatible, isFalse);
    expect(keySequence.imeCompatibilityLabel, 'IME: incompatible');
    expect(keySequence.imeCompatibilityReason, contains('Séquences clavier'));
    expect(macro.isImeCompatible, isFalse);
    expect(macro.imeCompatibilityReason, contains('Macro'));

    expect(shortcut.imeCompatibilityReason, isNot(contains('incompatible')));
    expect(shortcut.isImeCompatible, isTrue);
    expect(shortcut.imeCompatibilityLabel, 'IME: compatible');
    expect(playPause.isImeCompatible, isTrue);
    expect(unknownClipboard.isImeCompatible, isFalse);
    expect(unknownClipboard.imeCompatibilityReason, contains('non reconnue'));
  });
}
