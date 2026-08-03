import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:commandglows_app/features/keyboard/domain/keyboard_models.dart';
import 'package:commandglows_app/features/keyboard/application/keyboard_sync_providers.dart';
import 'package:commandglows_app/features/keyboard/presentation/keyboard_theme_studio_screen.dart';

void main() {
  const channel = MethodChannel('commandglows_app/keyboard');

  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() async {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, (call) async {
          if (call.method == 'getKeyboardThemeConfig' ||
              call.method == 'setKeyboardThemeConfig' ||
              call.method == 'resetKeyboardThemeConfig') {
            return <String, Object?>{
              'version': 1,
              'presetId': 'system',
              'backgroundStartColor': 0xFFEEF1EE,
              'backgroundEndColor': 0xFFEEF1EE,
              'useGradient': false,
              'gradientStyle': 'linear',
              'keyboardOpacity': 1.0,
              'keyColor': 0xFFFFFFFF,
              'specialKeyColor': 0xFFE0E6E3,
              'activeKeyColor': 0xFF17795D,
              'pressedKeyColor': 0xFFCADAD3,
              'pressHighlightDurationMs': 170,
              'textColor': 0xFF1D2320,
              'cornerTextColor': 0xFF5C6762,
              'cornerTextOpacity': 0.85,
              'statusTextColor': 0xFF333D38,
              'borderColor': 0x00000000,
              'borderWidth': 0.0,
              'keyRadius': 8.0,
              'keyHorizontalGap': 5.0,
              'rowVerticalGap': 5.0,
              'keyWidthScale': 1.0,
              'shadowColor': 0x33000000,
              'shadowBlur': 4.0,
              'shadowOffsetY': 1.0,
              'pressEffect': 'none',
              'effectIntensity': 0.35,
              'effectDurationMs': 170,
              'effectEasing': 'easeOut',
            };
          }
          return null;
        });
  });

  tearDown(() async {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, null);
  });

  Future<void> openStudioSection(WidgetTester tester, String title) async {
    final section = find.text(title);
    await tester.scrollUntilVisible(
      section,
      220,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.pumpAndSettle();

    for (var i = 0; i < 6; i++) {
      final centerY = tester.getCenter(section).dy;
      if (centerY < 440) {
        await tester.drag(find.byType(CustomScrollView), const Offset(0, 120));
      } else if (centerY > 560) {
        await tester.drag(find.byType(CustomScrollView), const Offset(0, -120));
      } else {
        break;
      }
      await tester.pumpAndSettle();
    }

    await tester.tap(section);
    await tester.pumpAndSettle();
  }

  testWidgets('shows preview and updates draft background color', (
    tester,
  ) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(home: KeyboardThemeStudioScreen()),
      ),
    );
    await tester.pump(const Duration(milliseconds: 200));

    expect(
      find.byKey(const Key('keyboard-theme-studio-preview')),
      findsOneWidget,
    );

    await openStudioSection(tester, 'Fond');

    final firstField = find.byType(TextFormField).first;
    await tester.enterText(firstField, 'FF0000FF');
    await tester.testTextInput.receiveAction(TextInputAction.done);
    await tester.pump(const Duration(milliseconds: 200));

    final preview = tester.widget<DecoratedBox>(
      find.byKey(const Key('keyboard-theme-studio-preview')),
    );
    final decoration = preview.decoration as BoxDecoration;
    expect(decoration.color, const Color(0xFF0000FF));
  });

  testWidgets('preview keyboard border hugs the visual key rows', (
    tester,
  ) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(home: KeyboardThemeStudioScreen()),
      ),
    );
    await tester.pump(const Duration(milliseconds: 200));

    final previewBox = tester.renderObject<RenderBox>(
      find.byKey(const Key('keyboard-theme-studio-preview')),
    );

    expect(previewBox.size.height, lessThanOrEqualTo(200));
  });

  testWidgets('blocks save when theme contrast is unreadable', (tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(home: KeyboardThemeStudioScreen()),
      ),
    );
    await tester.pump(const Duration(milliseconds: 200));

    final keyColorField = find.byKey(
      const ValueKey('keyboard-theme-color-Couleur des touches'),
    );
    final textColorField = find.byKey(
      const ValueKey('keyboard-theme-color-Texte'),
    );

    await openStudioSection(tester, 'Touches');

    await tester.scrollUntilVisible(
      keyColorField,
      300,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.enterText(keyColorField, 'FF111111');
    await tester.testTextInput.receiveAction(TextInputAction.done);
    await tester.scrollUntilVisible(
      textColorField,
      300,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.enterText(textColorField, 'FF111111');
    await tester.testTextInput.receiveAction(TextInputAction.done);
    await tester.pump(const Duration(milliseconds: 200));

    final saveFinder = find.widgetWithText(FilledButton, 'Enregistrer');
    await tester.scrollUntilVisible(
      saveFinder,
      400,
      scrollable: find.byType(Scrollable).first,
    );
    final save = tester.widget<FilledButton>(saveFinder);
    expect(save.onPressed, isNull);
  });

  testWidgets('selecting a preset applies its draft colors', (tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(home: KeyboardThemeStudioScreen()),
      ),
    );
    await tester.pump(const Duration(milliseconds: 200));

    await tester.tap(find.text('System').first);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Neon Terminal').last);
    await tester.pump(const Duration(milliseconds: 200));

    final preview = tester.widget<DecoratedBox>(
      find.byKey(const Key('keyboard-theme-studio-preview')),
    );
    final decoration = preview.decoration as BoxDecoration;
    expect(decoration.gradient, isA<LinearGradient>());
    expect(
      (decoration.gradient! as LinearGradient).colors.first,
      Color(
        KeyboardThemePresetCatalog.configFor(
          KeyboardThemePresetCatalog.neonTerminal,
        ).backgroundStartColor,
      ),
    );
  });

  testWidgets('shows a separate pressed color hold control', (tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(home: KeyboardThemeStudioScreen()),
      ),
    );
    await tester.pump(const Duration(milliseconds: 200));

    await openStudioSection(tester, 'Effets');

    expect(find.text('Maintien couleur'), findsOneWidget);
    expect(find.text('Durée de l’effet'), findsOneWidget);
  });

  testWidgets('shows capped swipe glyph opacity control', (tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(home: KeyboardThemeStudioScreen()),
      ),
    );
    await tester.pump(const Duration(milliseconds: 200));

    await openStudioSection(tester, 'Touches');

    expect(find.text('Opacité du texte d’angle'), findsOneWidget);
    expect(find.text('85%'), findsOneWidget);
  });

  testWidgets('drags the corner text opacity slider smoothly', (tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(home: KeyboardThemeStudioScreen()),
      ),
    );
    await tester.pump(const Duration(milliseconds: 200));

    await openStudioSection(tester, 'Touches');

    final slider = find.byType(Slider).first;
    await tester.scrollUntilVisible(
      slider,
      220,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.pumpAndSettle();
    expect(tester.widget<Slider>(slider).value, 0.85);
    await tester.drag(slider, const Offset(-240, 0));
    await tester.pumpAndSettle();

    expect(tester.widget<Slider>(slider).value, isNot(0.85));
  });

  testWidgets('opens one studio section at a time', (tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(home: KeyboardThemeStudioScreen()),
      ),
    );
    await tester.pump(const Duration(milliseconds: 200));

    await openStudioSection(tester, 'Fond');
    expect(find.text('Fond en dégradé'), findsOneWidget);

    await openStudioSection(tester, 'Espacement');

    expect(find.text('Écart des touches'), findsOneWidget);
    expect(find.text('Fond en dégradé'), findsNothing);
  });

  testWidgets('shows keyboard opacity control near image background', (
    tester,
  ) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(home: KeyboardThemeStudioScreen()),
      ),
    );
    await tester.pump(const Duration(milliseconds: 200));

    await openStudioSection(tester, 'Fond');

    expect(find.text('Image de fond'), findsOneWidget);
    expect(find.text('Opacité des touches'), findsOneWidget);
    expect(find.text('100%'), findsOneWidget);
  });

  testWidgets('keeps spacing controls focused on gaps only', (tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(home: KeyboardThemeStudioScreen()),
      ),
    );
    await tester.pump(const Duration(milliseconds: 200));

    await openStudioSection(tester, 'Espacement');

    expect(find.text('Écart des touches'), findsOneWidget);
    expect(find.text('Écart des rangées'), findsOneWidget);
    expect(find.text('Largeur des touches'), findsNothing);
  });

  testWidgets('imports JSON into draft without saving natively', (
    tester,
  ) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(home: KeyboardThemeStudioScreen()),
      ),
    );
    await tester.pump(const Duration(milliseconds: 200));

    await openStudioSection(tester, 'Import / export');
    final importButton = find.byKey(const Key('theme-import-json'));
    await tester.tap(importButton);
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byKey(const Key('theme-import-json-field')),
      '{"version":1,"presetId":"paper_ink","backgroundStartColor":4294303458,"backgroundEndColor":4294303458,"keyColor":4294966260,"specialKeyColor":4293512649,"activeKeyColor":4281154086,"pressedKeyColor":4292993723,"textColor":4279917078,"cornerTextColor":4285160778,"statusTextColor":4282394669,"borderColor":4281960847,"borderWidth":1,"keyRadius":10,"shadowColor":855638016,"shadowBlur":3,"shadowOffsetY":1,"useGradient":false,"gradientStyle":"linear","useImage":false,"pressEffect":"none","effectIntensity":0.35,"effectDurationMs":170,"effectEasing":"easeOut"}',
    );
    await tester.tap(find.text('Prévisualiser l’import'));
    await tester.pump(const Duration(milliseconds: 200));

    final importedMessage = find.text(
      'Thème JSON importé dans le brouillon. Appuie sur Enregistrer pour appliquer.',
    );
    await tester.scrollUntilVisible(
      importedMessage,
      200,
      scrollable: find.byType(Scrollable).first,
    );
    expect(importedMessage, findsOneWidget);
  });

  testWidgets('save emits keyboard sync change notification', (tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(home: KeyboardThemeStudioScreen()),
      ),
    );
    await tester.pump(const Duration(milliseconds: 200));

    final container = ProviderScope.containerOf(
      tester.element(find.byType(KeyboardThemeStudioScreen)),
    );
    final before = container.read(keyboardSyncChangeNotifierProvider);

    await tester.tap(find.text('System').first);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Neon Terminal').last);
    await tester.pump(const Duration(milliseconds: 200));
    await tester.tap(find.widgetWithText(FilledButton, 'Enregistrer'));
    await tester.pumpAndSettle();

    final after = container.read(keyboardSyncChangeNotifierProvider);
    expect(after, greaterThan(before));
  });

  testWidgets('save button shows animated success checkbox after saving', (
    tester,
  ) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(home: KeyboardThemeStudioScreen()),
      ),
    );
    await tester.pump(const Duration(milliseconds: 200));

    await tester.tap(find.text('System').first);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Neon Terminal').last);
    await tester.pump(const Duration(milliseconds: 200));
    await tester.tap(find.widgetWithText(FilledButton, 'Enregistrer'));
    await tester.pumpAndSettle();

    expect(
      find.byKey(const Key('keyboard-theme-save-success-icon')),
      findsOneWidget,
    );
    expect(find.text('Enregistré'), findsOneWidget);
  });

  testWidgets('save button shows animated failure checkbox when save fails', (
    tester,
  ) async {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, (call) async {
          if (call.method == 'setKeyboardThemeConfig') {
            throw PlatformException(
              code: 'save_failed',
              message: 'Native save failed',
            );
          }
          if (call.method == 'getKeyboardThemeConfig' ||
              call.method == 'resetKeyboardThemeConfig') {
            return <String, Object?>{
              'version': 1,
              'presetId': 'system',
              'backgroundStartColor': 0xFFEEF1EE,
              'backgroundEndColor': 0xFFEEF1EE,
              'useGradient': false,
              'gradientStyle': 'linear',
              'keyboardOpacity': 1.0,
              'keyColor': 0xFFFFFFFF,
              'specialKeyColor': 0xFFE0E6E3,
              'activeKeyColor': 0xFF17795D,
              'pressedKeyColor': 0xFFCADAD3,
              'pressHighlightDurationMs': 170,
              'textColor': 0xFF1D2320,
              'cornerTextColor': 0xFF5C6762,
              'cornerTextOpacity': 0.85,
              'statusTextColor': 0xFF333D38,
              'borderColor': 0x00000000,
              'borderWidth': 0.0,
              'keyRadius': 8.0,
              'keyHorizontalGap': 5.0,
              'rowVerticalGap': 5.0,
              'keyWidthScale': 1.0,
              'shadowColor': 0x33000000,
              'shadowBlur': 4.0,
              'shadowOffsetY': 1.0,
              'pressEffect': 'none',
              'effectIntensity': 0.35,
              'effectDurationMs': 170,
              'effectEasing': 'easeOut',
            };
          }
          return null;
        });

    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(home: KeyboardThemeStudioScreen()),
      ),
    );
    await tester.pump(const Duration(milliseconds: 200));

    await tester.tap(find.text('System').first);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Neon Terminal').last);
    await tester.pump(const Duration(milliseconds: 200));
    await tester.tap(find.widgetWithText(FilledButton, 'Enregistrer'));
    await tester.pumpAndSettle();

    expect(
      find.byKey(const Key('keyboard-theme-save-failure-icon')),
      findsOneWidget,
    );
    expect(find.text('Échec'), findsOneWidget);
  });
}
