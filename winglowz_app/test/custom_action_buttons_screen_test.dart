import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:commandglows_app/core/theme/app_theme.dart';
import 'package:commandglows_app/features/custom_action_buttons/application/custom_action_button_store_provider.dart';
import 'package:commandglows_app/features/custom_action_buttons/domain/custom_action_buttons.dart';
import 'package:commandglows_app/features/custom_action_buttons/data/in_memory_custom_action_button_store.dart';
import 'package:commandglows_app/features/snippets/presentation/custom_action_buttons_panel.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('custom action buttons can be created from the panel', (
    tester,
  ) async {
    final store = InMemoryCustomActionButtonStore();

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          localCustomActionButtonStoreProvider.overrideWithValue(store),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: CustomActionButtonsPanel(
              surfaceSelector: const SizedBox.shrink(),
            ),
          ),
        ),
      ),
    );
    await tester.pump(const Duration(milliseconds: 200));

    expect(
      tester.getTopLeft(find.byKey(const Key('custom-button-title-field'))).dy,
      tester
          .getTopLeft(find.byKey(const Key('custom-button-action-kind-field')))
          .dy,
    );

    await tester.enterText(
      find.byKey(const Key('custom-button-title-field')),
      'Fenêtre suivante',
    );
    await tester.tap(find.text('Texte'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Séquence clavier').last);
    await tester.pump(const Duration(milliseconds: 200));
    await tester.enterText(
      find.byKey(const Key('custom-button-value-field')),
      'Ctrl+W, N',
    );
    await tester.tap(find.byKey(const Key('custom-button-create-button')));
    await tester.pump(const Duration(milliseconds: 200));
    await tester.pump(const Duration(milliseconds: 200));

    expect(find.text('Fenêtre suivante'), findsWidgets);
  });

  testWidgets('custom action panel shows IME compatibility status', (
    tester,
  ) async {
    final store = InMemoryCustomActionButtonStore();
    await store.insert(
      title: 'Texte',
      icon: CustomActionButtonIcon.spark,
      action: const CustomActionButtonAction(
        kind: CustomActionKind.insertText,
        value: 'Bonjour',
      ),
    );
    await store.insert(
      title: 'Next',
      icon: CustomActionButtonIcon.window,
      action: const CustomActionButtonAction(
        kind: CustomActionKind.keySequence,
        value: 'Ctrl+W, N',
      ),
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          localCustomActionButtonStoreProvider.overrideWithValue(store),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: CustomActionButtonsPanel(
              surfaceSelector: const SizedBox.shrink(),
            ),
          ),
        ),
      ),
    );
    await tester.pump(const Duration(milliseconds: 200));

    expect(find.textContaining('IME: compatible'), findsWidgets);
    expect(find.textContaining('IME: incompatible'), findsWidgets);
    expect(find.textContaining('Séquences clavier'), findsAtLeast(1));
    expect(find.text('Barre d’action Android IME'), findsOneWidget);
  });
}
