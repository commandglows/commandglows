import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:commandglows_app/core/theme/app_theme.dart';
import 'package:commandglows_app/features/keyboard/presentation/keyboard_navigation_diagnostics_screen.dart';

const _keyboardChannel = MethodChannel('commandglows_app/keyboard');

void _installKeyboardMock({required List<MethodCall> calls}) {
  TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
      .setMockMethodCallHandler(_keyboardChannel, (call) async {
        calls.add(call);
        switch (call.method) {
          case 'getKeyboardNavigationDiagnostics':
            return <Object?>[
              <String, Object?>{
                'timestamp': DateTime.utc(
                  2026,
                  6,
                  11,
                  10,
                  0,
                ).millisecondsSinceEpoch,
                'actionId': 'delete_word_before',
                'success': true,
                'strategy': 'delete_word_before:Applied',
                'packageName': 'com.example.notes',
                'fieldContext': 'Text',
                'inputActionLabel': 'Enter',
                'selectionModeAllowed': true,
                'selectionStart': 12,
                'selectionEnd': 12,
                'hasSelection': false,
                'privateMode': false,
                'inputAllowed': true,
                'clipboardAllowed': true,
                'voiceAllowed': true,
                'selectedTextBefore': null,
                'selectedTextAfter': null,
                'textBeforeCursor': 'Bonjour le ',
                'textAfterCursor': 'monde',
              },
            ];
          case 'clearKeyboardNavigationDiagnostics':
            return true;
        }
        return null;
      });
}

void _clearKeyboardMock() {
  TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
      .setMockMethodCallHandler(_keyboardChannel, null);
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('renders entries and clears navigation diagnostics', (
    tester,
  ) async {
    final previousPlatform = debugDefaultTargetPlatformOverride;
    debugDefaultTargetPlatformOverride = TargetPlatform.android;
    final calls = <MethodCall>[];
    _installKeyboardMock(calls: calls);

    try {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          darkTheme: AppTheme.dark,
          home: const KeyboardNavigationDiagnosticsScreen(),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Playground navigation'), findsNothing);
      expect(find.text('DelW← · com.example.notes'), findsOneWidget);

      await tester.tap(find.byKey(const Key('keyboard-nav-diagnostics-clear')));
      await tester.pumpAndSettle();

      expect(find.text('Journal natif efface.'), findsOneWidget);
      expect(
        calls.where(
          (call) => call.method == 'clearKeyboardNavigationDiagnostics',
        ),
        hasLength(1),
      );
    } finally {
      debugDefaultTargetPlatformOverride = previousPlatform;
      _clearKeyboardMock();
    }
  });
}
