import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:commandglows_app/core/platform/desktop_control_bridge.dart';
import 'package:commandglows_app/features/settings/presentation/desktop_control_settings_section.dart';

const _channel = MethodChannel('commandglows_app/desktop_control');

class _MemoryPreference implements DesktopControlPreference {
  _MemoryPreference({
    this.enabled = false,
    this.scope = DesktopControlScope.monitor,
  });

  bool enabled;
  DesktopControlScope scope;

  @override
  Future<bool> isEnabled() async => enabled;

  @override
  Future<void> setEnabled(bool enabled) async => this.enabled = enabled;

  @override
  Future<DesktopControlScope> getPreferredScope() async => scope;

  @override
  Future<void> setPreferredScope(DesktopControlScope scope) async =>
      this.scope = scope;
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
  }) async {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(
          _channel,
          (call) async => statusForCall(call),
        );
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SingleChildScrollView(
            child: DesktopControlSettingsSection(preferenceStore: preferences),
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
      expect(find.textContaining('F1 pour cliquer'), findsOneWidget);
      expect(find.text('Autres commandes'), findsOneWidget);
      await tester.ensureVisible(
        find.byKey(const Key('desktop-control-more-keys')),
      );
      await tester.tap(find.byKey(const Key('desktop-control-more-keys')));
      await tester.pumpAndSettle();
      expect(find.textContaining('F2 : clic droit'), findsOneWidget);
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
      expect(methods, ['getStatus', 'setEnabled']);
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

      expect(methods, ['getStatus', 'setEnabled']);
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
}
