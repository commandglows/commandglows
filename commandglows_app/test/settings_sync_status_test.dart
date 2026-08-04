import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import 'package:commandglows_app/core/theme/app_theme.dart';
import 'package:commandglows_app/features/settings/application/settings_store_provider.dart';
import 'package:commandglows_app/features/settings/data/local_settings_store.dart';
import 'package:commandglows_app/features/settings/presentation/settings_screen.dart';

const _secureStorageChannel = MethodChannel(
  'plugins.it_nomads.com/flutter_secure_storage',
);

Map<String, String> _secureStorage = <String, String>{};
bool _secureStorageWriteShouldFail = false;

void _setSecureStorageDefaults() {
  _secureStorage = <String, String>{};
  _secureStorageWriteShouldFail = false;
}

void _installSecureStorageMocks() {
  final messenger =
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;
  messenger.setMockMethodCallHandler(_secureStorageChannel, (call) async {
    switch (call.method) {
      case 'containsKey':
        final key = call.arguments['key'] as String?;
        return key != null && _secureStorage.containsKey(key);
      case 'read':
        final key = call.arguments['key'] as String?;
        return key == null ? null : _secureStorage[key];
      case 'readAll':
        return <String, String>{..._secureStorage};
      case 'write':
        if (_secureStorageWriteShouldFail) {
          throw PlatformException(
            code: 'mock-write-fail',
            message: 'Secure storage mocked write failure.',
          );
        }
        final key = call.arguments['key'] as String?;
        final value = call.arguments['value'] as String?;
        if (key != null) {
          if (value == null) {
            _secureStorage.remove(key);
          } else {
            _secureStorage[key] = value;
          }
        }
        return null;
      case 'delete':
        final key = call.arguments['key'] as String?;
        if (key != null) {
          _secureStorage.remove(key);
        }
        return null;
      case 'deleteAll':
        _secureStorage.clear();
        return null;
    }
    return null;
  });
}

void _clearSecureStorageMocks() {
  TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
      .setMockMethodCallHandler(_secureStorageChannel, null);
}

void main() {
  setUp(() {
    _setSecureStorageDefaults();
    _installSecureStorageMocks();
  });

  tearDown(() {
    _clearSecureStorageMocks();
  });

  testWidgets(
    'settings appearance updates to local-only after local-only settings save',
    (tester) async {
      await _pumpSettings(
        tester,
        overrides: [
          settingsStoreProvider.overrideWithValue(LocalSettingsStore()),
        ],
      );

      expect(find.text('Synchronisé'), findsNothing);

      final confirmSwitch = find.widgetWithText(
        SwitchListTile,
        'Confirmer avant suppression',
      );
      expect(confirmSwitch, findsOneWidget);
      await tester.tap(confirmSwitch);
      await tester.pumpAndSettle();

      final appearanceStatus = find.byKey(
        const Key('settings-appearance-sync-action'),
      );
      expect(
        find.descendant(
          of: appearanceStatus,
          matching: find.text('Local uniquement'),
        ),
        findsOneWidget,
      );
      expect(find.text('Synchronisé'), findsNothing);
    },
  );

  testWidgets(
    'settings secret save shows error state and retries as local-only',
    (tester) async {
      await _pumpSettings(
        tester,
        initialLocation: '/settings?section=keys',
        overrides: [
          settingsStoreProvider.overrideWithValue(LocalSettingsStore()),
        ],
      );

      await tester.enterText(
        find.widgetWithText(TextField, 'Clé API OpenAI'),
        'sk-open',
      );
      await tester.enterText(
        find.widgetWithText(TextField, 'Clé API Anthropic'),
        'sk-anti',
      );

      _secureStorageWriteShouldFail = true;
      await tester.tap(
        find.widgetWithText(FilledButton, 'Enregistrer les clés locales'),
      );
      await tester.pumpAndSettle();

      expect(
        find.descendant(
          of: find.byKey(const Key('settings-secrets-sync-action')),
          matching: find.text('Échec'),
        ),
        findsOneWidget,
      );

      _secureStorageWriteShouldFail = false;
      await tester.tap(find.byKey(const Key('settings-secrets-sync-action')));
      await tester.pumpAndSettle();

      expect(
        find.descendant(
          of: find.byKey(const Key('settings-secrets-sync-action')),
          matching: find.text('Local uniquement'),
        ),
        findsOneWidget,
      );
    },
  );
}

Future<void> _pumpSettings(
  WidgetTester tester, {
  List<Object> overrides = const [],
  String initialLocation = '/settings',
}) async {
  await tester.binding.setSurfaceSize(const Size(1400, 2200));
  addTearDown(() => tester.binding.setSurfaceSize(null));
  final router = GoRouter(
    initialLocation: initialLocation,
    routes: [
      GoRoute(
        path: '/settings',
        builder: (context, state) => SettingsScreen(
          initialSectionId: state.uri.queryParameters['section'],
        ),
      ),
    ],
  );
  addTearDown(router.dispose);
  await tester.pumpWidget(
    ProviderScope(
      overrides: overrides.cast(),
      child: MaterialApp.router(
        theme: AppTheme.light,
        darkTheme: AppTheme.dark,
        routerConfig: router,
      ),
    ),
  );
  await tester.pumpAndSettle();
}
