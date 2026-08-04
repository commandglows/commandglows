import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:commandglows_app/core/theme/app_theme.dart';
import 'package:commandglows_app/features/custom_action_buttons/application/custom_action_button_store_provider.dart';
import 'package:commandglows_app/features/custom_action_buttons/data/in_memory_custom_action_button_store.dart';
import 'package:commandglows_app/features/custom_action_buttons/domain/custom_action_buttons.dart';
import 'package:commandglows_app/features/keyboard/application/keyboard_sync_providers.dart';
import 'package:commandglows_app/features/keyboard/domain/keyboard_models.dart';
import 'package:commandglows_app/features/keyboard/presentation/keyboard_corner_shortcuts_screen.dart';
import 'package:commandglows_app/features/snippets/application/snippet_store_provider.dart';
import 'package:commandglows_app/features/snippets/data/in_memory_snippet_store.dart';

const _keyboardChannel = MethodChannel('commandglows_app/keyboard');

Widget _testWidget(
  InMemorySnippetStore snippetStore,
  InMemoryCustomActionButtonStore customActionStore,
) {
  return ProviderScope(
    overrides: [
      snippetStoreProvider.overrideWithValue(snippetStore),
      customActionButtonStoreProvider.overrideWithValue(customActionStore),
    ],
    child: MaterialApp(
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      home: const KeyboardCornerShortcutsScreen(),
    ),
  );
}

Future<InMemorySnippetStore> _snippetStore() async {
  final store = InMemorySnippetStore(
    clock: () => DateTime.utc(2026, 5, 14, 12),
  );
  await store.insert(
    trigger: 'JA',
    content: "j'arrive dans cinq minutes",
    label: 'J arrive',
  );
  return store;
}

Future<InMemoryCustomActionButtonStore> _customActionButtonStore() async {
  final store = InMemoryCustomActionButtonStore(
    clock: () => DateTime.utc(2026, 5, 14, 12),
  );
  await store.insert(
    title: 'Presse',
    icon: CustomActionButtonIcon.clipboard,
    action: const CustomActionButtonAction(
      kind: CustomActionKind.clipboardCommand,
      value: 'paste',
    ),
    rowIndex: 0,
    orderIndex: 1,
  );
  await store.insert(
    title: 'Non-supporté',
    icon: CustomActionButtonIcon.terminal,
    action: const CustomActionButtonAction(
      kind: CustomActionKind.keySequence,
      value: 'Ctrl+W, N',
    ),
    rowIndex: 0,
    orderIndex: 2,
  );
  return store;
}

void _installKeyboardMock({required List<MethodCall> calls}) {
  TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
      .setMockMethodCallHandler(_keyboardChannel, (call) async {
        calls.add(call);
        switch (call.method) {
          case 'getKeyboardCornerConfig':
            return AndroidKeyboardCornerConfig.defaults().toMap();
          case 'setKeyboardCornerConfig':
            return call.arguments as Map<Object?, Object?>;
        }
        return null;
      });
}

void _clearKeyboardMock() {
  TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
      .setMockMethodCallHandler(_keyboardChannel, null);
}

void _useLargeViewport(WidgetTester tester) {
  tester.view.physicalSize = const Size(1440, 2200);
  tester.view.devicePixelRatio = 1.0;
}

Future<void> _runAsAndroid(
  WidgetTester tester,
  Future<void> Function() body,
) async {
  final previousPlatform = debugDefaultTargetPlatformOverride;
  debugDefaultTargetPlatformOverride = TargetPlatform.android;
  _useLargeViewport(tester);
  try {
    await body();
  } finally {
    debugDefaultTargetPlatformOverride = previousPlatform;
    tester.view.resetPhysicalSize();
    tester.view.resetDevicePixelRatio();
    _clearKeyboardMock();
  }
}

void main() {
  test('keyboard corner draft applies and resets targeted shortcuts', () {
    final draft = KeyboardCornerDraft.fromConfig(
      AndroidKeyboardCornerConfig.defaults(),
    );
    final shortcut = const AndroidKeyboardCornerShortcut(
      keyId: 'letter-a',
      slot: KeyboardCornerSlot.topLeft,
      expression: "'é'",
      label: 'é',
    );

    final changed = draft.applyShortcut(shortcut);
    final resetCorner = changed.resetCorner(
      'letter-a',
      KeyboardCornerSlot.topLeft,
    );
    final resetKey = changed
        .applyShortcut(shortcut.copyWith(slot: KeyboardCornerSlot.topRight))
        .resetKey('letter-a');

    expect(KeyboardConfigurableKeyCatalog.contains('letter-a'), isTrue);
    expect(KeyboardConfigurableKeyCatalog.contains('space'), isTrue);
    expect(changed.dirty, isTrue);
    expect(resetCorner.draftConfig.overrides, hasLength(1));
    expect(resetCorner.draftConfig.overrides.single.disabled, isTrue);
    expect(
      KeyboardCornerPresetCatalog.resolvedForKey(
        config: resetCorner.draftConfig,
        keyId: 'letter-a',
        cornersEnabled: true,
        specialKeyCornersEnabled: true,
        privateMode: false,
      )[KeyboardCornerSlot.topLeft],
      isNull,
    );
    expect(resetKey.draftConfig.overrides, hasLength(8));
    expect(
      resetKey.draftConfig.overrides.every((item) => item.disabled),
      isTrue,
    );
    expect(
      KeyboardCornerPresetCatalog.resolvedForKey(
        config: resetKey.draftConfig,
        keyId: 'letter-a',
        cornersEnabled: true,
        specialKeyCornersEnabled: true,
        privateMode: false,
      ),
      isEmpty,
    );
  });

  test('guided actions generate native expressions and labels', () {
    final accent = KeyboardGuidedActionCatalog.defaultActions().firstWhere(
      (action) => action.title == 'é',
    );
    final undo = KeyboardGuidedActionCatalog.defaultActions().firstWhere(
      (action) => action.title == 'Undo',
    );

    expect(accent.expression, "'é'");
    expect(
      KeyboardGuidedAction.quotedTextExpression("j'arrive"),
      r"'j\'arrive'",
    );
    expect(undo.expression, 'action:Undo');
    expect(undo.nativeOnly, isTrue);
  });

  testWidgets('visual editor selects preview key, stages accent, saves once', (
    tester,
  ) async {
    await _runAsAndroid(tester, () async {
      final calls = <MethodCall>[];
      _installKeyboardMock(calls: calls);

      await tester.pumpWidget(
        _testWidget(await _snippetStore(), await _customActionButtonStore()),
      );
      await tester.pumpAndSettle();
      final container = ProviderScope.containerOf(
        tester.element(find.byType(KeyboardCornerShortcutsScreen)),
      );
      final before = container.read(keyboardSyncChangeNotifierProvider);

      await tester.tap(find.byKey(const Key('corner-preview-key-letter-e')));
      await tester.pumpAndSettle();
      expect(find.textContaining('E gestures'), findsOneWidget);

      await tester.tap(find.byKey(const Key('corner-action-é')));
      await tester.pumpAndSettle();
      expect(
        calls.where((call) => call.method == 'setKeyboardCornerConfig'),
        isEmpty,
      );
      expect(find.textContaining('Draft has unsaved changes'), findsOneWidget);

      await tester.tap(find.widgetWithText(FilledButton, 'Save').first);
      await tester.pumpAndSettle();

      final saveCalls = calls.where(
        (call) => call.method == 'setKeyboardCornerConfig',
      );
      final after = container.read(keyboardSyncChangeNotifierProvider);
      expect(saveCalls, hasLength(1));
      expect(find.textContaining('Saved'), findsWidgets);
      expect(after, greaterThan(before));
    });
  });

  testWidgets('visual editor reset corner hides staged override shortcut', (
    tester,
  ) async {
    await _runAsAndroid(tester, () async {
      _installKeyboardMock(calls: <MethodCall>[]);

      await tester.pumpWidget(
        _testWidget(await _snippetStore(), await _customActionButtonStore()),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('corner-preview-key-letter-e')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('corner-action-é')));
      await tester.pumpAndSettle();

      final topLeftE = find.byKey(const Key('corner-preview-slot-topLeft-E'));
      expect(
        find.descendant(of: topLeftE, matching: find.text('é')),
        findsOneWidget,
      );

      await tester.tap(find.widgetWithText(OutlinedButton, 'Reset slot'));
      await tester.pumpAndSettle();

      expect(
        find.descendant(of: topLeftE, matching: find.text('é')),
        findsNothing,
      );
      expect(find.text('Top left: tap'), findsOneWidget);
      expect(find.textContaining('Draft has unsaved changes'), findsOneWidget);
    });
  });

  testWidgets('visual editor filters snippets and warns in private preview', (
    tester,
  ) async {
    await _runAsAndroid(tester, () async {
      _installKeyboardMock(calls: <MethodCall>[]);

      await tester.pumpWidget(
        _testWidget(await _snippetStore(), await _customActionButtonStore()),
      );
      await tester.pumpAndSettle();

      await tester.enterText(
        find.byKey(const Key('corner-action-search')),
        'JA',
      );
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('corner-snippet-JA')), findsOneWidget);

      await tester.tap(find.byKey(const Key('corner-snippet-JA')));
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(FilterChip, 'Private preview'));
      await tester.pumpAndSettle();

      expect(find.textContaining('Blocked in private fields'), findsOneWidget);
    });
  });

  testWidgets('visual editor applies supported custom action button shortcuts', (
    tester,
  ) async {
    await _runAsAndroid(tester, () async {
      _installKeyboardMock(calls: <MethodCall>[]);

      await tester.pumpWidget(
        _testWidget(await _snippetStore(), await _customActionButtonStore()),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('corner-preview-key-letter-e')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('corner-action-search')));
      await tester.enterText(
        find.byKey(const Key('corner-action-search')),
        'Presse',
      );
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('corner-custom-action-button-Presse')));
      await tester.pumpAndSettle();

      expect(find.descendant(
        of: find.byKey(const Key('corner-preview-slot-topLeft-E')),
        matching: find.text('Presse'),
      ), findsOneWidget);
    });
  });

  testWidgets('visual editor blocks unsupported custom action types', (
    tester,
  ) async {
    await _runAsAndroid(tester, () async {
      _installKeyboardMock(calls: <MethodCall>[]);

      await tester.pumpWidget(
        _testWidget(await _snippetStore(), await _customActionButtonStore()),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('corner-preview-key-letter-e')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('corner-action-search')));
      await tester.enterText(
        find.byKey(const Key('corner-action-search')),
        'Non-support',
      );
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('corner-custom-action-button-Non-supporté')));
      await tester.pumpAndSettle();

      expect(find.textContaining('séquences clavier'), findsOneWidget);
    });
  });

  testWidgets('corner preview exposes semantic gesture targets', (
    tester,
  ) async {
    final semantics = tester.ensureSemantics();
    try {
      await _runAsAndroid(tester, () async {
        _installKeyboardMock(calls: <MethodCall>[]);

        await tester.pumpWidget(
          _testWidget(await _snippetStore(), await _customActionButtonStore()),
        );
        await tester.pumpAndSettle();

        expect(_semanticWidget('Keyboard key Q'), findsOneWidget);
        expect(_semanticWidget('Up gesture on Q'), findsOneWidget);
        expect(_semanticWidget('Right gesture on Q'), findsOneWidget);
        expect(_semanticWidget('Down gesture on Q'), findsOneWidget);
        expect(_semanticWidget('Left gesture on Q'), findsOneWidget);
        expect(_semanticWidget('Top left gesture on Q'), findsOneWidget);
        expect(_semanticWidget('Top right gesture on Q'), findsOneWidget);
        expect(_semanticWidget('Bottom left gesture on Q'), findsOneWidget);
        expect(_semanticWidget('Bottom right gesture on Q'), findsOneWidget);
      });
    } finally {
      semantics.dispose();
    }
  });

  testWidgets('visual editor rejects invalid import JSON without saving', (
    tester,
  ) async {
    await _runAsAndroid(tester, () async {
      final calls = <MethodCall>[];
      _installKeyboardMock(calls: calls);

      await tester.pumpWidget(
        _testWidget(await _snippetStore(), await _customActionButtonStore()),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.widgetWithText(OutlinedButton, 'Import JSON'));
      await tester.pumpAndSettle();
      await tester.enterText(
        find.byKey(const Key('corner-import-json-field')),
        '{bad json',
      );
      await tester.tap(find.widgetWithText(FilledButton, 'Preview import'));
      await tester.pumpAndSettle();

      expect(
        find.textContaining('Import rejected: invalid JSON'),
        findsOneWidget,
      );
      expect(
        calls.where((call) => call.method == 'setKeyboardCornerConfig'),
        isEmpty,
      );
    });
  });
}

Finder _semanticWidget(String label) {
  return find.byWidgetPredicate(
    (widget) => widget is Semantics && widget.properties.label == label,
  );
}
