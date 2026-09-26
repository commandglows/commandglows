import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:commandglows_app/core/platform/desktop_control_bridge.dart';
import 'package:commandglows_app/features/settings/presentation/desktop_control_settings_section.dart';

const _channel = MethodChannel('commandglows_app/desktop_control');

class _MemoryPreference implements DesktopControlPreference {
  _MemoryPreference({this.enabled = false});

  bool enabled;

  @override
  Future<bool> isEnabled() async => enabled;

  @override
  Future<void> setEnabled(bool enabled) async => this.enabled = enabled;
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
          body: DesktopControlSettingsSection(preferenceStore: preferences),
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
}
