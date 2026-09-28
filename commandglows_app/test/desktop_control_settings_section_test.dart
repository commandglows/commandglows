import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:commandglows_app/core/platform/desktop_control_bridge.dart';
import 'package:commandglows_app/core/platform/desktop_control_bindings.dart';
import 'package:commandglows_app/core/storage/local_json_persistence.dart';
import 'package:commandglows_app/features/settings/presentation/desktop_control_settings_section.dart';
import 'package:commandglows_app/features/shortcut_learning/application/shortcut_repository_provider.dart';
import 'package:commandglows_app/features/shortcut_learning/data/local_shortcut_repository.dart';

const _channel = MethodChannel('commandglows_app/desktop_control');

class _MemoryShortcutPersistence extends LocalJsonPersistence {
  _MemoryShortcutPersistence() : super('grid_test_shortcuts');
  List<Map<String, dynamic>> rows = [];
  bool failWrites = false;

  @override
  Future<List<Map<String, dynamic>>> read() async =>
      rows.map((row) => Map<String, dynamic>.from(row)).toList();

  @override
  Future<void> write(List<Map<String, Object?>> items) async {
    if (failWrites) throw StateError('Fiche inaccessible');
    rows = items.map((item) => Map<String, dynamic>.from(item)).toList();
  }
}

class _MemoryPreference implements DesktopControlPreference {
  _MemoryPreference({
    this.enabled = false,
    this.scope = DesktopControlScope.monitor,
  });

  bool enabled;
  DesktopControlScope scope;
  DesktopControlBindings bindings = DesktopControlBindings.defaults();
  int bindingWrites = 0;

  @override
  Future<bool> isEnabled() async => enabled;

  @override
  Future<void> setEnabled(bool enabled) async => this.enabled = enabled;

  @override
  Future<DesktopControlScope> getPreferredScope() async => scope;

  @override
  Future<void> setPreferredScope(DesktopControlScope scope) async =>
      this.scope = scope;

  @override
  Future<DesktopControlBindings> getBindings() async => bindings;

  @override
  Future<void> setBindings(DesktopControlBindings bindings) async => {
    bindingWrites++,
    this.bindings = bindings,
  };
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  tearDown(() {
    debugDefaultTargetPlatformOverride = null;
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(_channel, null);
  });

  Future<void> mount(
    WidgetTester tester, {
    required _MemoryPreference preferences,
    required Map<Object?, Object?> Function(MethodCall call) statusForCall,
    LocalShortcutRepository? shortcutRepository,
  }) async {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(
          _channel,
          (call) async => statusForCall(call),
        );
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          shortcutRepositoryProvider.overrideWithValue(
            shortcutRepository ??
                LocalShortcutRepository(
                  persistence: _MemoryShortcutPersistence(),
                ),
          ),
        ],
        child: MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              child: DesktopControlSettingsSection(
                preferenceStore: preferences,
              ),
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  Future<void> onWindows(Future<void> Function() body) async {
    debugDefaultTargetPlatformOverride = TargetPlatform.windows;
    try {
      await body();
    } finally {
      debugDefaultTargetPlatformOverride = null;
    }
  }

  testWidgets(
    'starts disabled and shows the global shortcut contract',
    (tester) => onWindows(() async {
      final preferences = _MemoryPreference();
      await mount(
        tester,
        preferences: preferences,
        statusForCall: (_) => {
          'supported': true,
          'enabled': false,
          'active': false,
          'hotkeyRegistered': false,
        },
      );

      expect(
        find.text('Ctrl+Alt+G sera enregistré à l’activation.'),
        findsOneWidget,
      );
      expect(
        tester
            .widget<SwitchListTile>(
              find.byKey(const Key('desktop-control-enabled')),
            )
            .value,
        isFalse,
      );
      expect(
        find.textContaining('grille récursive au clavier'),
        findsOneWidget,
      );
      expect(find.text('Premiers pas'), findsOneWidget);
      expect(
        find.textContaining('Dans n’importe quelle application'),
        findsOneWidget,
      );
      expect(find.textContaining('Espace / F1 pour cliquer'), findsOneWidget);
      expect(find.text('Autres commandes'), findsOneWidget);
      await tester.ensureVisible(
        find.byKey(const Key('desktop-control-more-keys')),
      );
      await tester.tap(find.byKey(const Key('desktop-control-more-keys')));
      await tester.pumpAndSettle();
      expect(
        find.descendant(
          of: find.byKey(const Key('desktop-control-command-rightClick')),
          matching: find.text('F2'),
        ),
        findsOneWidget,
      );
      expect(
        find.descendant(
          of: find.byKey(const Key('desktop-control-command-reset')),
          matching: find.text('F9'),
        ),
        findsOneWidget,
      );
    }),
  );

  testWidgets(
    'command pill opens the matching editor and reflects the saved replacement',
    (tester) => onWindows(() async {
      tester.view.physicalSize = const Size(400, 800);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final preferences = _MemoryPreference();
      preferences.bindings = preferences.bindings.copyWith(
        actions: {
          ...preferences.bindings.actions,
          'rightClick': [const DesktopPhysicalKey(0x39, false, 'Espace', 2)],
        },
      );
      await mount(
        tester,
        preferences: preferences,
        statusForCall: (call) => {
          'supported': true,
          'enabled': false,
          'active': false,
          'hotkeyRegistered': false,
          if (call.method == 'setBindings') 'bindings': call.arguments,
        },
      );
      final overview = find.byKey(const Key('desktop-control-more-keys'));
      await tester.ensureVisible(overview);
      await tester.tap(overview);
      await tester.pumpAndSettle();
      final pill = find.byKey(
        const Key('desktop-control-command-key-rightClick-0'),
      );
      expect(
        find.descendant(of: pill, matching: find.text('Ctrl+Espace')),
        findsOneWidget,
      );
      await tester.ensureVisible(pill);
      await tester.tap(pill);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 250));
      await tester.pump();
      await tester.pumpAndSettle();
      final editorKey = find.byKey(
        const Key('desktop-control-capture-rightClick-0'),
      );
      expect(
        find.descendant(of: editorKey, matching: find.text('Appuyez…')),
        findsOneWidget,
      );
      expect(editorKey.hitTestable(), findsOneWidget);
      await tester.sendKeyEvent(LogicalKeyboardKey.f10);
      await tester.pumpAndSettle();
      expect(
        preferences.bindings.actions['rightClick']!.single.displayLabel,
        'F10',
      );
      expect(
        find.descendant(of: pill, matching: find.text('F10')),
        findsOneWidget,
      );
      expect(tester.takeException(), isNull);
    }),
  );

  testWidgets(
    'persists a migrated v1 binding map as v2 on load',
    (tester) => onWindows(() async {
      final preferences = _MemoryPreference();
      final legacy = DesktopControlBindings.defaults()
          .copyWith(
            activationVirtualKey: 0x48,
            actions: {
              ...DesktopControlBindings.defaults().actions,
              'rightClick': [const DesktopPhysicalKey(0x02, false, '&')],
            },
          )
          .toWire();
      legacy['version'] = 1;
      preferences.bindings = DesktopControlBindings.fromWire(legacy);
      await mount(
        tester,
        preferences: preferences,
        statusForCall: (call) => {
          'supported': true,
          'enabled': false,
          'active': false,
          'hotkeyRegistered': false,
          if (call.method == 'setBindings') 'bindings': call.arguments,
        },
      );
      expect(preferences.bindingWrites, 1);
      expect(preferences.bindings.toWire()['version'], 3);
      expect(preferences.bindings.activationVirtualKey, 0x48);
      expect(preferences.bindings.actions['rightClick']!.single.scanCode, 0x02);
    }),
  );

  testWidgets(
    'captures and persists a global chord, then rolls back a native key conflict',
    (tester) => onWindows(() async {
      final preferences = _MemoryPreference();
      final nativeCalls = <MethodCall>[];
      var rejectNext = false;
      await mount(
        tester,
        preferences: preferences,
        statusForCall: (call) {
          nativeCalls.add(call);
          if (call.method == 'setBindings' && rejectNext) {
            rejectNext = false;
            return {
              'supported': true,
              'enabled': false,
              'active': false,
              'hotkeyRegistered': false,
              'errorCode': 'INVALID_BINDINGS',
              'validationError': 'Cette touche est réservée.',
            };
          }
          return {
            'supported': true,
            'enabled': false,
            'active': false,
            'hotkeyRegistered': false,
            if (call.method == 'setBindings') 'bindings': call.arguments,
          };
        },
      );

      await tester.ensureVisible(
        find.byKey(const Key('desktop-control-bindings-editor')),
      );
      await tester.tap(
        find.byKey(const Key('desktop-control-bindings-editor')),
      );
      await tester.pumpAndSettle();
      await tester.ensureVisible(
        find.byKey(const Key('desktop-control-capture-activation')),
      );
      await tester.tap(
        find.byKey(const Key('desktop-control-capture-activation')),
      );
      await tester.sendKeyDownEvent(LogicalKeyboardKey.controlLeft);
      await tester.sendKeyDownEvent(LogicalKeyboardKey.altLeft);
      await tester.sendKeyDownEvent(LogicalKeyboardKey.keyG);
      await tester.sendKeyUpEvent(LogicalKeyboardKey.keyG);
      await tester.sendKeyUpEvent(LogicalKeyboardKey.altLeft);
      await tester.sendKeyUpEvent(LogicalKeyboardKey.controlLeft);
      await tester.pumpAndSettle();
      expect(preferences.bindings.activationVirtualKey, 0x47);
      expect(preferences.bindings.activationModifiers, 3);
      expect(nativeCalls.last.method, 'setBindings');

      rejectNext = true;
      await tester.ensureVisible(
        find.byKey(const Key('desktop-control-capture-rightClick-0')),
      );
      await tester.tap(
        find.byKey(const Key('desktop-control-capture-rightClick-0')),
      );
      await tester.sendKeyDownEvent(LogicalKeyboardKey.f2);
      await tester.pumpAndSettle();
      expect(
        preferences.bindings.actions['rightClick']!.single.displayLabel,
        'F2',
      );
      expect(find.text('Cette touche est réservée.'), findsOneWidget);
      expect(nativeCalls.last.method, 'setBindings');
    }),
  );

  testWidgets(
    'captures AZERTY Shift+1 as Maj+1 and saves the physical chord',
    (tester) => onWindows(() async {
      final preferences = _MemoryPreference();
      await mount(
        tester,
        preferences: preferences,
        statusForCall: (call) => {
          'supported': true,
          'enabled': false,
          'active': false,
          'hotkeyRegistered': false,
          if (call.method == 'setBindings') 'bindings': call.arguments,
        },
      );
      await tester.tap(
        find.byKey(const Key('desktop-control-bindings-editor')),
      );
      await tester.pumpAndSettle();
      await tester.ensureVisible(
        find.byKey(const Key('desktop-control-capture-rightClick-0')),
      );
      await tester.tap(
        find.byKey(const Key('desktop-control-capture-rightClick-0')),
      );
      await tester.sendKeyDownEvent(LogicalKeyboardKey.shiftLeft);
      await tester.sendKeyDownEvent(LogicalKeyboardKey.digit1);
      await tester.sendKeyUpEvent(LogicalKeyboardKey.digit1);
      await tester.sendKeyUpEvent(LogicalKeyboardKey.shiftLeft);
      await tester.pumpAndSettle();

      final saved = preferences.bindings.actions['rightClick']!.single;
      expect(saved.scanCode, 0x02);
      expect(saved.modifiers, 4);
      expect(saved.displayLabel, 'Maj+1');
      expect(find.text('Maj+1'), findsOneWidget);
    }),
  );

  testWidgets(
    'shows reserved grid-key rejection beside the edited action',
    (tester) => onWindows(() async {
      final preferences = _MemoryPreference();
      await mount(
        tester,
        preferences: preferences,
        statusForCall: (call) => {
          'supported': true,
          'enabled': false,
          'active': false,
          'hotkeyRegistered': false,
          if (call.method == 'setBindings') ...{
            'errorCode': 'INVALID_BINDINGS',
            'validationError':
                'Une touche de sélection de case ne peut pas piloter une action.',
          },
        },
      );
      await tester.tap(
        find.byKey(const Key('desktop-control-bindings-editor')),
      );
      await tester.pumpAndSettle();
      await tester.ensureVisible(
        find.byKey(const Key('desktop-control-capture-rightClick-0')),
      );
      await tester.tap(
        find.byKey(const Key('desktop-control-capture-rightClick-0')),
      );
      await tester.sendKeyDownEvent(LogicalKeyboardKey.keyQ);
      await tester.pumpAndSettle();

      expect(
        preferences.bindings.actions['rightClick']!.single.displayLabel,
        'F2',
      );
      expect(
        find.byKey(const Key('desktop-control-capture-feedback-rightClick')),
        findsOneWidget,
      );
      expect(find.textContaining('sélection de case'), findsOneWidget);
    }),
  );

  testWidgets(
    'persists explicit opt-in locally and calls native host',
    (tester) => onWindows(() async {
      final preferences = _MemoryPreference();
      final methods = <String>[];
      await mount(
        tester,
        preferences: preferences,
        statusForCall: (call) {
          methods.add(call.method);
          return {
            'supported': true,
            'enabled': call.method == 'setEnabled',
            'active': false,
            'hotkeyRegistered': call.method == 'setEnabled',
          };
        },
      );

      await tester.tap(find.byKey(const Key('desktop-control-enabled')));
      await tester.pumpAndSettle();

      expect(preferences.enabled, isTrue);
      expect(methods, ['getStatus', 'setBindings', 'setEnabled']);
      expect(find.text('Ctrl+Alt+G est enregistré.'), findsOneWidget);
      expect(find.byKey(const Key('desktop-control-activate')), findsOneWidget);
    }),
  );

  testWidgets(
    'restores local opt-in and surfaces a native hotkey collision',
    (tester) => onWindows(() async {
      final preferences = _MemoryPreference(enabled: true);
      final methods = <String>[];
      await mount(
        tester,
        preferences: preferences,
        statusForCall: (call) {
          methods.add(call.method);
          return {
            'supported': true,
            'enabled': false,
            'active': false,
            'hotkeyRegistered': false,
            if (call.method == 'setEnabled') 'errorCode': 'HOTKEY_UNAVAILABLE',
          };
        },
      );

      expect(methods, ['getStatus', 'setBindings', 'setEnabled']);
      expect(find.textContaining('déjà utilisé'), findsOneWidget);
      expect(
        tester
            .widget<SwitchListTile>(
              find.byKey(const Key('desktop-control-enabled')),
            )
            .value,
        isFalse,
      );
    }),
  );

  testWidgets(
    'saves the window scope and sends it to Windows',
    (tester) => onWindows(() async {
      final preferences = _MemoryPreference();
      final calls = <MethodCall>[];
      await mount(
        tester,
        preferences: preferences,
        statusForCall: (call) {
          calls.add(call);
          return {
            'supported': true,
            'enabled': false,
            'active': false,
            'hotkeyRegistered': false,
            'preferredScope': call.method == 'setPreferredScope'
                ? 'window'
                : 'monitor',
          };
        },
      );

      await tester.tap(find.byKey(const Key('desktop-control-scope')));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Fenêtre active').last);
      await tester.pumpAndSettle();

      expect(preferences.scope, DesktopControlScope.window);
      expect(calls.last.method, 'setPreferredScope');
      expect(calls.last.arguments, {'scope': 'window'});
    }),
  );

  testWidgets(
    'restores a saved window scope when the settings page opens',
    (tester) => onWindows(() async {
      final preferences = _MemoryPreference(scope: DesktopControlScope.window);
      final calls = <MethodCall>[];
      await mount(
        tester,
        preferences: preferences,
        statusForCall: (call) {
          calls.add(call);
          return {
            'supported': true,
            'enabled': false,
            'active': false,
            'hotkeyRegistered': false,
            'preferredScope': call.method == 'setPreferredScope'
                ? 'window'
                : 'monitor',
          };
        },
      );

      expect(calls.map((call) => call.method), [
        'getStatus',
        'setBindings',
        'setPreferredScope',
      ]);
      expect(
        tester
            .widget<DropdownButton<DesktopControlScope>>(
              find.byKey(const Key('desktop-control-scope')),
            )
            .value,
        DesktopControlScope.window,
      );
    }),
  );

  testWidgets(
    'keeps saved keys when native reports a temporary shortcut conflict',
    (tester) => onWindows(() async {
      final preferences = _MemoryPreference();
      final custom = preferences.bindings.copyWith(
        activationVirtualKey: 0x48, // H
      );
      preferences.bindings = custom;
      await mount(
        tester,
        preferences: preferences,
        statusForCall: (call) => {
          'supported': true,
          'enabled': false,
          'active': false,
          'hotkeyRegistered': false,
          if (call.method == 'setBindings') ...{
            'errorCode': 'HOTKEY_UNAVAILABLE',
            'validationError': 'Ce raccourci est déjà utilisé.',
          },
        },
      );

      expect(preferences.bindings.activationVirtualKey, 0x48);
      expect(find.textContaining('déjà utilisé'), findsOneWidget);
    }),
  );

  testWidgets(
    'adds the saved grid hotkey and updates it after rebinding',
    (tester) => onWindows(() async {
      final preferences = _MemoryPreference();
      final repository = LocalShortcutRepository(
        persistence: _MemoryShortcutPersistence(),
      );
      await mount(
        tester,
        preferences: preferences,
        shortcutRepository: repository,
        statusForCall: (call) => {
          'supported': true,
          'enabled': false,
          'active': false,
          'hotkeyRegistered': false,
          if (call.method == 'setBindings') 'bindings': call.arguments,
        },
      );
      await tester.ensureVisible(
        find.byKey(const Key('desktop-control-bindings-editor')),
      );
      await tester.tap(
        find.byKey(const Key('desktop-control-bindings-editor')),
      );
      await tester.pumpAndSettle();
      final add = find.byKey(
        const Key('desktop-control-add-to-sheet-desktop-grid:activation'),
      );
      await tester.ensureVisible(add);
      await tester.tap(add);
      await tester.pumpAndSettle();
      expect((await repository.list()).single.chord.label, 'Ctrl + Alt + G');
      expect((await repository.list()).single.requiresSelfAssessment, isTrue);

      await tester.tap(
        find.byKey(const Key('desktop-control-capture-activation')),
      );
      await tester.sendKeyDownEvent(LogicalKeyboardKey.controlLeft);
      await tester.sendKeyDownEvent(LogicalKeyboardKey.altLeft);
      await tester.sendKeyDownEvent(LogicalKeyboardKey.keyH);
      await tester.sendKeyUpEvent(LogicalKeyboardKey.keyH);
      await tester.sendKeyUpEvent(LogicalKeyboardKey.altLeft);
      await tester.sendKeyUpEvent(LogicalKeyboardKey.controlLeft);
      await tester.pumpAndSettle();
      expect((await repository.list()).single.chord.label, 'Ctrl + Alt + H');
      await tester.tap(add);
      await tester.pumpAndSettle();
      final rows = await repository.list();
      expect(rows, hasLength(1));
      expect(rows.single.chord.label, 'Ctrl + Alt + H');
    }),
  );

  testWidgets(
    'keeps saved grid binding when sheet synchronization fails',
    (tester) => onWindows(() async {
      final preferences = _MemoryPreference();
      final persistence = _MemoryShortcutPersistence();
      final repository = LocalShortcutRepository(persistence: persistence);
      await mount(
        tester,
        preferences: preferences,
        shortcutRepository: repository,
        statusForCall: (call) => {
          'supported': true,
          'enabled': false,
          'active': false,
          'hotkeyRegistered': false,
          if (call.method == 'setBindings') 'bindings': call.arguments,
        },
      );
      await tester.ensureVisible(
        find.byKey(const Key('desktop-control-bindings-editor')),
      );
      await tester.tap(
        find.byKey(const Key('desktop-control-bindings-editor')),
      );
      await tester.pumpAndSettle();
      final add = find.byKey(
        const Key('desktop-control-add-to-sheet-desktop-grid:activation'),
      );
      await tester.ensureVisible(add);
      await tester.tap(add);
      await tester.pumpAndSettle();
      persistence.failWrites = true;
      await tester.tap(
        find.byKey(const Key('desktop-control-capture-activation')),
      );
      await tester.sendKeyDownEvent(LogicalKeyboardKey.controlLeft);
      await tester.sendKeyDownEvent(LogicalKeyboardKey.altLeft);
      await tester.sendKeyDownEvent(LogicalKeyboardKey.keyH);
      await tester.sendKeyUpEvent(LogicalKeyboardKey.keyH);
      await tester.sendKeyUpEvent(LogicalKeyboardKey.altLeft);
      await tester.sendKeyUpEvent(LogicalKeyboardKey.controlLeft);
      await tester.pumpAndSettle();
      expect(preferences.bindings.activationVirtualKey, 0x48);
      expect((await repository.list()).single.chord.label, 'Ctrl + Alt + G');
      expect(
        find.textContaining('fiche de raccourcis n’a pas pu être synchronisée'),
        findsOneWidget,
      );
    }),
  );
}
